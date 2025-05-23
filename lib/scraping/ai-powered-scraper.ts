import { createAIProvider } from '@/lib/ai/providers/index';
import { loadServerSettings } from '@/lib/ai/settings-loader';

interface JobExtractionResult {
  jobTitle: string;
  company: string;
  location: string;
  salary?: string;
  employmentType?: string;
  experienceLevel?: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  qualifications: string[];
  benefits: string[];
  skills: string[];
  aboutCompany?: string;
  applicationDeadline?: string;
  postedDate?: string;
  error?: string;
}

/**
 * Use AI to extract job information from raw webpage content
 */
export async function extractJobWithAI(htmlContent: string, url: string, userId?: string): Promise<JobExtractionResult> {
  console.log('[AI SCRAPER] Starting AI-powered job extraction...');
  
  try {
    // Load AI settings - if userId provided, load user-specific settings
    let settings;
    if (userId) {
      // Load user-specific settings from database
      const { createServerClient } = await import('@/lib/supabase/server-client');
      const supabase = createServerClient();
      
      const { data: userSettingsRow } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();
        
      if (userSettingsRow?.settings) {
        settings = userSettingsRow.settings;
        console.log('[AI SCRAPER] Loaded user-specific settings from database:', settings);
      } else {
        settings = await loadServerSettings();
        console.log('[AI SCRAPER] No user settings found, using defaults');
      }
    } else {
      settings = await loadServerSettings();
    }
    // Get API key from environment based on provider
    const apiKey = 
      settings.aiProvider === 'openai' ? process.env.OPENAI_API_KEY :
      settings.aiProvider === 'gemini' ? process.env.GEMINI_API_KEY :
      settings.aiProvider === 'openrouter' ? process.env.OPENROUTER_API_KEY :
      settings.aiProvider === 'requesty' ? process.env.ROUTER_API_KEY : '';
    
    const provider = createAIProvider(settings.aiProvider as any, {
      apiKey: apiKey || '',
      model: settings.aiModel,
    });
    
    // Clean the HTML to reduce tokens
    const cleanedContent = preprocessHTML(htmlContent);
    
    // Create a structured prompt for the AI
    const prompt = `You are a job description parser. Extract structured information from the following webpage content.

URL: ${url}

WEBPAGE CONTENT:
${cleanedContent}

Extract the following information in JSON format:
{
  "jobTitle": "exact job title",
  "company": "company name",
  "location": "job location",
  "salary": "salary range if mentioned",
  "employmentType": "full-time/part-time/contract/etc",
  "experienceLevel": "entry/mid/senior/etc if mentioned",
  "description": "main job description paragraph",
  "responsibilities": ["list of job responsibilities/duties"],
  "requirements": ["list of required qualifications"],
  "qualifications": ["list of preferred qualifications"],
  "benefits": ["list of benefits/perks"],
  "skills": ["required and preferred skills"],
  "aboutCompany": "company description if present",
  "applicationDeadline": "deadline if mentioned",
  "postedDate": "posting date if mentioned"
}

Rules:
1. Extract ONLY information that is explicitly stated in the content
2. For lists (responsibilities, requirements, etc), extract as arrays of strings
3. If a field is not found, omit it from the response
4. Ensure the job description captures the main overview/summary
5. Separate required vs preferred qualifications if distinguished
6. Extract both technical and soft skills
7. Be precise - do not infer or make up information

Return ONLY valid JSON, no additional text.`;

    // Call the AI model
    const aiResponse = await provider.query(prompt);
    const response = aiResponse.content;

    // Parse the AI response
    let extractedData: JobExtractionResult;
    try {
      // Extract JSON from the response (in case AI added extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      extractedData = JSON.parse(jsonMatch[0]);
      console.log('[AI SCRAPER] Successfully extracted job data with AI');
    } catch (parseError) {
      console.error('[AI SCRAPER] Failed to parse AI response:', parseError);
      console.log('[AI SCRAPER] AI Response:', response);
      
      // Fallback: try to extract basic information using a simpler approach
      extractedData = await extractBasicInfoWithAI(cleanedContent, url, provider);
    }

    // Validate and clean the extracted data
    return validateAndCleanExtraction(extractedData);
    
  } catch (error) {
    console.error('[AI SCRAPER] Error in AI extraction:', error);
    throw new Error(`AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fallback extraction with simpler prompts
 */
async function extractBasicInfoWithAI(
  content: string, 
  url: string, 
  provider: any
): Promise<JobExtractionResult> {
  console.log('[AI SCRAPER] Using fallback extraction method...');
  
  const result: Partial<JobExtractionResult> = {};
  
  // Extract job title
  const titlePrompt = `From this job posting, what is the exact job title? Reply with ONLY the job title, nothing else:\n\n${content.substring(0, 1000)}`;
  result.jobTitle = (await provider.query(titlePrompt)).content.trim();
  
  // Extract company
  const companyPrompt = `From this job posting, what is the company name? Reply with ONLY the company name, nothing else:\n\n${content.substring(0, 1000)}`;
  result.company = (await provider.query(companyPrompt)).content.trim();
  
  // Extract location
  const locationPrompt = `From this job posting, what is the job location? Reply with ONLY the location, nothing else:\n\n${content.substring(0, 1000)}`;
  result.location = (await provider.query(locationPrompt)).content.trim();
  
  // Extract description
  const descPrompt = `From this job posting, extract the main job description or overview. Reply with ONLY the description text:\n\n${content}`;
  result.description = (await provider.query(descPrompt)).content.trim();
  
  // Extract responsibilities
  const respPrompt = `List all job responsibilities/duties from this posting. Reply with a comma-separated list:\n\n${content}`;
  const respText = (await provider.query(respPrompt)).content;
  result.responsibilities = respText.split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0);
  
  return result as JobExtractionResult;
}

/**
 * Preprocess HTML to reduce token usage
 */
function preprocessHTML(html: string): string {
  // Remove script and style tags
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
  
  // Remove all remaining HTML tags but keep the content
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  
  // Remove HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Clean up whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Limit content length to avoid token limits (keep ~15k chars)
  if (cleaned.length > 15000) {
    // Try to keep the most relevant parts
    const start = cleaned.substring(0, 7500);
    const middle = cleaned.substring(cleaned.length / 2 - 2500, cleaned.length / 2 + 2500);
    const end = cleaned.substring(cleaned.length - 2500);
    cleaned = `${start}\n\n[... content trimmed ...]\n\n${middle}\n\n[... content trimmed ...]\n\n${end}`;
  }
  
  return cleaned;
}

/**
 * Validate and clean the extracted data
 */
function validateAndCleanExtraction(data: any): JobExtractionResult {
  const cleaned: JobExtractionResult = {
    jobTitle: '',
    company: '',
    location: '',
    description: '',
    responsibilities: [],
    requirements: [],
    qualifications: [],
    benefits: [],
    skills: []
  };
  
  // Validate and copy string fields
  const stringFields = ['jobTitle', 'company', 'location', 'description', 'salary', 
                       'employmentType', 'experienceLevel', 'aboutCompany', 
                       'applicationDeadline', 'postedDate'];
  
  for (const field of stringFields) {
    if (data[field] && typeof data[field] === 'string' && data[field].trim()) {
      cleaned[field as keyof JobExtractionResult] = data[field].trim() as any;
    }
  }
  
  // Validate and copy array fields
  const arrayFields = ['responsibilities', 'requirements', 'qualifications', 'benefits', 'skills'];
  
  for (const field of arrayFields) {
    if (Array.isArray(data[field])) {
      cleaned[field as keyof JobExtractionResult] = data[field]
        .filter((item: any) => typeof item === 'string' && item.trim())
        .map((item: string) => item.trim()) as any;
    }
  }
  
  // Ensure required fields have values
  if (!cleaned.jobTitle) cleaned.jobTitle = 'Unknown Position';
  if (!cleaned.company) cleaned.company = 'Unknown Company';
  if (!cleaned.location) cleaned.location = 'Location Not Specified';
  if (!cleaned.description) cleaned.description = 'No description available';
  
  return cleaned;
}

/**
 * Format extracted data into a readable job description
 */
export function formatExtractedJob(data: JobExtractionResult): string {
  let formatted = '';
  
  // Header information
  formatted += `Job Title: ${data.jobTitle}\n`;
  formatted += `Company: ${data.company}\n`;
  formatted += `Location: ${data.location}\n`;
  
  if (data.employmentType) {
    formatted += `Employment Type: ${data.employmentType}\n`;
  }
  if (data.salary) {
    formatted += `Salary: ${data.salary}\n`;
  }
  if (data.experienceLevel) {
    formatted += `Experience Level: ${data.experienceLevel}\n`;
  }
  if (data.postedDate) {
    formatted += `Posted: ${data.postedDate}\n`;
  }
  if (data.applicationDeadline) {
    formatted += `Application Deadline: ${data.applicationDeadline}\n`;
  }
  
  // Description
  formatted += `\nDescription:\n${data.description}\n`;
  
  // Responsibilities
  if (data.responsibilities.length > 0) {
    formatted += `\nResponsibilities:\n`;
    data.responsibilities.forEach(resp => {
      formatted += `- ${resp}\n`;
    });
  }
  
  // Requirements
  if (data.requirements.length > 0) {
    formatted += `\nRequirements:\n`;
    data.requirements.forEach(req => {
      formatted += `- ${req}\n`;
    });
  }
  
  // Qualifications
  if (data.qualifications.length > 0) {
    formatted += `\nPreferred Qualifications:\n`;
    data.qualifications.forEach(qual => {
      formatted += `- ${qual}\n`;
    });
  }
  
  // Skills
  if (data.skills.length > 0) {
    formatted += `\nSkills:\n`;
    data.skills.forEach(skill => {
      formatted += `- ${skill}\n`;
    });
  }
  
  // Benefits
  if (data.benefits.length > 0) {
    formatted += `\nBenefits:\n`;
    data.benefits.forEach(benefit => {
      formatted += `- ${benefit}\n`;
    });
  }
  
  // About Company
  if (data.aboutCompany) {
    formatted += `\nAbout Company:\n${data.aboutCompany}\n`;
  }
  
  return formatted;
}