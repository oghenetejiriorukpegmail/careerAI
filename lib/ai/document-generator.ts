import { queryAI } from './config';
import { ParsedResume, ParsedJobDescription } from '../documents/document-parser';
import { ResumeData, CoverLetterData, generateResumePDF, generateCoverLetterPDF, generateFileName } from '../documents/pdf-generator';

// Helper function to fix common JSON errors
function fixCommonJsonErrors(content: string): string {
  let fixed = content;
  
  // Fix incomplete URLs (like "https:   })
  fixed = fixed.replace(/"(https?:)\s*\}/g, '"$1//example.com"}');
  fixed = fixed.replace(/"(https?:)\s*,/g, '"$1//example.com",');
  
  // Fix incomplete strings before closing braces/brackets
  fixed = fixed.replace(/"([^"]*?)\s*\}/g, (match, p1) => {
    if (!p1.includes('"')) {
      return `"${p1}"}`;  
    }
    return match;
  });
  
  // Fix double quotes within string values
  fixed = fixed.replace(/"([^":\{\}\[\],]+)"([^":\{\}\[\],]+)"/g, '"$1\'$2\'"');
  
  return fixed;
}

// Helper function to clean AI JSON responses
function cleanAIJsonResponse(content: string): string {
  let cleanedContent = content;
  
  // Remove markdown code blocks (handle various formats)
  // First try standard code block format
  let codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let codeBlockMatch = codeBlockRegex.exec(cleanedContent);
  if (codeBlockMatch) {
    cleanedContent = codeBlockMatch[1].trim();
  } else {
    // Try format with language on separate line
    codeBlockRegex = /```\s*\n\s*(?:json)?\s*\n([\s\S]*?)\s*```/g;
    codeBlockMatch = codeBlockRegex.exec(cleanedContent);
    if (codeBlockMatch) {
      cleanedContent = codeBlockMatch[1].trim();
    } else {
      // Try format where 'json' is on a separate line after backticks
      const jsonBlockMatch = cleanedContent.match(/json\s*\n\s*(\{[\s\S]*\})/);
      if (jsonBlockMatch) {
        cleanedContent = jsonBlockMatch[1].trim();
      }
    }
  }
  
  // If the response starts with explanatory text, try to extract JSON from it
  const jsonStart = cleanedContent.indexOf('{');
  const jsonEnd = cleanedContent.lastIndexOf('}');
  if (jsonStart > 0 && jsonEnd > jsonStart) {
    cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
  }
  
  // CRITICAL FIX: Only handle actual newlines in the JSON structure
  // The OpenRouter response appears to have actual newline characters in the JSON
  // which need to be handled carefully to avoid breaking valid escaped newlines in strings
  
  // First check if the content already appears to be valid JSON
  try {
    JSON.parse(cleanedContent);
    // If it parses successfully, don't modify it
    return cleanedContent;
  } catch (e) {
    // Only proceed with cleaning if JSON is actually invalid
  }
  
  // Remove JavaScript-style comments from JSON (common issue with some AI models)
  // This regex removes both single-line (//) and multi-line (/* */) comments
  cleanedContent = cleanedContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
    .replace(/\/\/.*$/gm, '');        // Remove // comments from end of lines
  
  // Fix common JSON formatting issues
  // Replace literal newlines within string values with escaped newlines
  cleanedContent = cleanedContent.replace(
    /"([^"]*)\n([^"]*?)"/g,
    (match, before, after) => `"${before}\\n${after}"`
  );
  
  // Handle URLs that might be split across lines
  cleanedContent = cleanedContent.replace(
    /"(https?:\/\/[^"\s]*)\s*\n\s*([^"\s]*?)"/g,
    (match, urlPart1, urlPart2) => `"${urlPart1}${urlPart2}"`
  );
  
  // Remove any remaining unescaped newlines within quoted strings
  let inString = false;
  let result = '';
  let escapeNext = false;
  
  for (let i = 0; i < cleanedContent.length; i++) {
    const char = cleanedContent[i];
    const prevChar = i > 0 ? cleanedContent[i - 1] : '';
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      result += char;
    } else if (char === '\\' && inString) {
      escapeNext = true;
      result += char;
    } else if (char === '\n' && inString && !escapeNext) {
      // Replace unescaped newline within string with space
      result += ' ';
    } else {
      result += char;
      escapeNext = false;
    }
  }
  
  return result;
}

// Helper function to attempt JSON repair
function attemptJsonRepair(content: string): any {
  let repaired = content;
  
  // First apply common fixes
  repaired = fixCommonJsonErrors(repaired);
  
  // Try to parse
  try {
    return JSON.parse(repaired);
  } catch (e) {
    // If still failing, try more aggressive fixes
    
    // Remove trailing commas
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');
    
    // Add missing commas between properties
    repaired = repaired.replace(/}\s*"/g, '},"');
    repaired = repaired.replace(/"\s*"/g, '","');
    
    // Fix unclosed strings
    let quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      repaired += '"';
    }
    
    // Ensure JSON ends properly
    repaired = repaired.trim();
    if (!repaired.endsWith('}') && !repaired.endsWith(']')) {
      if (repaired.includes('[') && !repaired.includes(']')) {
        repaired += ']';
      } else {
        repaired += '}';
      }
    }
    
    try {
      return JSON.parse(repaired);
    } catch (finalError) {
      // If all else fails, try to extract just the essential fields
      const essentialFields: any = {
        fullName: '',
        contactInfo: { email: '', phone: '', location: '', linkedin: '' },
        summary: '',
        experience: [],
        education: [],
        skills: []
      };
      
      // Try to extract individual fields
      const nameMatch = repaired.match(/"fullName"\s*:\s*"([^"]*)"/);
      if (nameMatch) essentialFields.fullName = nameMatch[1];
      
      const emailMatch = repaired.match(/"email"\s*:\s*"([^"]*)"/);
      if (emailMatch) essentialFields.contactInfo.email = emailMatch[1];
      
      const phoneMatch = repaired.match(/"phone"\s*:\s*"([^"]*)"/);
      if (phoneMatch) essentialFields.contactInfo.phone = phoneMatch[1];
      
      const summaryMatch = repaired.match(/"summary"\s*:\s*"([^"]*)"/);
      if (summaryMatch) essentialFields.summary = summaryMatch[1];
      
      return essentialFields;
    }
  }
}

/**
 * Generate an ATS-optimized resume based on user profile and job description
 * @param resume User's parsed resume data
 * @param jobDescription Parsed job description
 * @param userName User's full name
 * @param companyName Company name
 * @returns Generated PDF as Uint8Array and filename
 */
export async function generateAtsResume(
  resume: ParsedResume,
  jobDescription: ParsedJobDescription,
  userName: string,
  companyName: string,
  userId?: string,
  bypassTokenLimits: boolean = false
): Promise<{ pdf: Uint8Array; fileName: string }> {
  try {
    // Debug log the input resume data
    console.log('[generateAtsResume] Input resume data:', {
      hasContactInfo: !!resume.contactInfo,
      hasSummary: !!resume.summary,
      experienceCount: resume.experience?.length || 0,
      educationCount: resume.education?.length || 0,
      skillsCount: resume.skills?.length || 0,
      resumeKeys: Object.keys(resume),
      // Log first experience item if exists
      firstExperience: resume.experience?.[0] ? {
        title: resume.experience[0].title,
        company: resume.experience[0].company
      } : 'No experience'
    });
    // Create a prompt for the AI to tailor the resume
    const prompt = `
      I need to create an ATS-optimized resume for a job application.

      Here is the candidate's information:
      ${JSON.stringify(resume, null, 2)}

      Here is the job description:
      ${JSON.stringify(jobDescription, null, 2)}

      Please tailor the resume to highlight relevant skills and experience that match the job requirements.
      
      STRICT RULES:
      - Use ONLY the information provided in the candidate's resume above
      - DO NOT add any new experiences, skills, or qualifications
      - DO NOT change job titles, company names, dates, or locations
      - DO NOT add metrics or achievements not in the original
      - You can reword for clarity but the facts must remain the same
      - If the candidate lacks a required skill, work with what they have
      
      DATE FORMATTING REQUIREMENTS:
      - Preserve EXACT dates as they appear in the source resume
      - Use the same format (e.g., "April 2023", "Apr 2023", "04/2023", "2023-04")
      - For current positions, use "Present" for endDate
      - DO NOT convert date formats or change date representations
      - Example: If resume says "April 2023 - Present", use exactly that
      
      Focus on incorporating the keywords from the job description naturally while maintaining truthfulness.
      Return the result as a JSON object with this structure:
      {
        "fullName": "",
        "contactInfo": {
          "email": "",
          "phone": "",
          "location": "",
          "linkedin": ""
        },
        "summary": "",
        "experience": [
          {
            "title": "",
            "company": "",
            "location": "",
            "startDate": "",
            "endDate": "",
            "summary": "",
            "description": ["", ""]
          }
        ],
        "education": [
          {
            "institution": "",
            "degree": "",
            "field": "",
            "graduationDate": ""
          }
        ],
        "skills": ["", ""],
        "certifications": [
          {
            "name": "",
            "issuer": "",
            "date": "",
            "expiryDate": "",
            "credentialId": ""
          }
        ],
        "trainings": [
          {
            "name": "",
            "provider": "",
            "date": "",
            "duration": "",
            "description": ""
          }
        ],
        "projects": [
          {
            "name": "",
            "description": ""
          }
        ],
        "references": [
          {
            "name": "",
            "title": "",
            "company": "",
            "phone": "",
            "email": "",
            "relationship": ""
          }
        ]
      }

      Include certifications, training, and projects ONLY if they are available in the candidate's resume data.
      If these sections are not present in the original data, omit them from the output or leave them as empty arrays.
      
      For references:
      - If the candidate has provided specific references in their data, include them
      - If no specific references are provided, include a standard "References available upon request" entry:
        [{"name": "References available upon request", "title": "", "company": "", "phone": "", "email": "", "relationship": ""}]
      - Always include the references section unless specifically inappropriate for the role
      
      IMPORTANT for experience section:
      - Each job should include BOTH a "summary" field AND a "description" array
      - The "summary" field should be a 1-2 sentence overview of the role, responsibilities, and scope
      - The "summary" should naturally incorporate relevant keywords from the job description
      - The "description" field MUST be an array of individual bullet points for achievements
      - Each array element should be a single achievement or responsibility
      - Start each bullet with an action verb (e.g., "Managed", "Developed", "Led", "Implemented")
      - Make descriptions achievement-oriented and quantifiable where possible
      - Include metrics and results when available (e.g., "Increased sales by 25%", "Managed team of 10")
      - Each bullet point should be 1-2 lines long for optimal ATS scanning
      - DO NOT combine multiple achievements into a single array element
      - Example format:
        {
          "title": "Senior Software Engineer",
          "company": "Tech Corp",
          "summary": "Led development of cloud-native applications serving 5M+ users, managing a team of 8 engineers and collaborating with product and design teams to deliver customer-facing features.",
          "description": [
            "Led cross-functional team of 12 engineers to deliver project 2 weeks ahead of schedule",
            "Implemented automated testing framework that reduced bug reports by 40%",
            "Developed RESTful APIs serving 1M+ daily requests with 99.9% uptime"
          ]
        }
      
      Include the most relevant skills from the candidate's profile that match the job requirements.
      Keep the content truthful and based on the provided information.
    `;

    const systemPrompt = `
      You are an expert resume writer who specializes in creating ATS-optimized resumes.
      Your goal is to tailor the candidate's resume to match the job description WITHOUT fabricating ANY information.
      
      ABSOLUTE REQUIREMENTS - NEVER VIOLATE THESE RULES:
      1. USE ONLY information that exists in the candidate's uploaded resume
      2. DO NOT invent, create, or embellish ANY:
         - Job titles, companies, or dates
         - Skills the candidate doesn't have
         - Achievements or metrics not in the original
         - Certifications or education not listed
         - Technologies or tools not mentioned
      3. You may ONLY:
         - Reword existing content for clarity and ATS optimization
         - Reorganize existing information for better impact
         - Highlight relevant existing experience for the specific job
         - Use synonyms or industry-standard terms for existing skills
         - Format existing achievements with better action verbs
      4. If the candidate lacks certain qualifications mentioned in the job:
         - DO NOT add them
         - Instead, emphasize their related/transferable skills
         - Focus on what they DO have that's relevant
      
      CRITICAL for ATS optimization:
      - Experience descriptions MUST be formatted as arrays of individual bullet points
      - Each bullet point should be a separate string in the description array
      - This allows ATS systems to properly parse and score individual achievements
      - Bullet points are MORE ATS-friendly than paragraph format because:
        * ATS can identify and score individual achievements
        * Keywords are easier to extract from structured bullet points
        * Action verbs at the start of bullets are weighted higher by ATS algorithms
      
      REMEMBER: The candidate must be able to defend every single item in an interview.
      If it's not in their original resume, it CANNOT be in the tailored version.
      
      CRITICAL: You must return a valid JSON object exactly matching the requested structure.
      - Do not include any markdown formatting or code blocks
      - Ensure all strings are properly quoted
      - Make sure all URLs are complete (e.g., "https://linkedin.com/in/username" not just "https:")
      - Close all braces and brackets properly
      - Do not include comments or explanations outside the JSON
    `;

    // Load user settings if userId provided
    let userSettings;
    if (userId) {
      try {
        // Use service role client for background jobs to avoid cookie context issues
        const { createServiceRoleClient } = await import('../supabase/server-client');
        const supabase = createServiceRoleClient();
        
        const { data: settingsRow } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', userId)
          .single();
          
        if (settingsRow?.settings) {
          userSettings = settingsRow.settings;
          console.log('[RESUME] Loaded user-specific settings from database:', userSettings);
        }
      } catch (error) {
        console.error('[RESUME] Error loading user settings:', error);
        // Continue without user settings - use defaults
      }
    }

    // Call the AI service with user settings
    const response = await queryAI(prompt, systemPrompt, userSettings, 'resume_parsing', bypassTokenLimits);
    
    // Extract content from the AI response object
    let parsedContent: string;
    if (response && typeof response === 'object' && response.choices && response.choices.length > 0) {
      parsedContent = response.choices[0].message.content;
    } else if (typeof response === 'string') {
      parsedContent = response;
    } else {
      console.error('Invalid AI response format. Response type:', typeof response);
      console.error('Response structure:', JSON.stringify(response).substring(0, 200));
      throw new Error('Invalid AI response format');
    }

    // Clean up the response using our helper function
    const cleanedContent = cleanAIJsonResponse(parsedContent);
    
    // Parse the response to get the tailored resume data
    let tailoredResumeData: ResumeData;
    try {
      tailoredResumeData = JSON.parse(cleanedContent);
      console.log('[generateAtsResume] Successfully parsed AI response:', {
        fullName: tailoredResumeData.fullName,
        hasContactInfo: !!tailoredResumeData.contactInfo,
        hasSummary: !!tailoredResumeData.summary,
        experienceCount: tailoredResumeData.experience?.length || 0,
        educationCount: tailoredResumeData.education?.length || 0,
        skillsCount: tailoredResumeData.skills?.length || 0,
        certificationsCount: tailoredResumeData.certifications?.length || 0,
        firstExperience: tailoredResumeData.experience?.[0]?.title || 'None',
        firstEducation: tailoredResumeData.education?.[0]?.degree || 'None'
      });
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message);
      console.error('Cleaned content length:', cleanedContent.length);
      console.error('First 200 chars of cleaned content:', cleanedContent.substring(0, 200));
      console.error('Last 200 chars of cleaned content:', cleanedContent.substring(cleanedContent.length - 200));
      
      // Try to find the specific character causing the issue
      if (parseError.message.includes('position')) {
        const match = parseError.message.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          console.error(`Character at position ${position}: ${JSON.stringify(cleanedContent[position])}`);
          console.error(`Context around position ${position}:`, cleanedContent.substring(Math.max(0, position - 50), Math.min(cleanedContent.length, position + 50)));
        }
      }
      
      // Try JSON repair before giving up
      console.log('Attempting to repair malformed JSON...');
      try {
        tailoredResumeData = attemptJsonRepair(cleanedContent);
        console.log('Successfully repaired and parsed JSON');
      console.log('[PDF Generator] Parsed resume data after repair:', {
        fullName: tailoredResumeData.fullName,
        hasContactInfo: !!tailoredResumeData.contactInfo,
        hasSummary: !!tailoredResumeData.summary,
        experienceCount: tailoredResumeData.experience?.length || 0,
        educationCount: tailoredResumeData.education?.length || 0,
        skillsCount: tailoredResumeData.skills?.length || 0,
        certificationsCount: tailoredResumeData.certifications?.length || 0,
        trainingsCount: tailoredResumeData.trainings?.length || 0,
        projectsCount: tailoredResumeData.projects?.length || 0,
        referencesCount: tailoredResumeData.references?.length || 0
      });
      } catch (repairError) {
        console.error('JSON repair failed:', repairError);
        
        // Save the problematic response for debugging
        if (typeof window === 'undefined') {
          const fs = require('fs');
          const path = require('path');
          const logsDir = path.join(process.cwd(), 'logs');
          try {
            if (!fs.existsSync(logsDir)) {
              fs.mkdirSync(logsDir, { recursive: true });
            }
            const debugFile = path.join(logsDir, `failed_json_${Date.now()}.txt`);
            fs.writeFileSync(debugFile, cleanedContent);
            console.error(`Saved problematic JSON to: ${debugFile}`);
          } catch (saveError) {
            console.error('Failed to save debug file:', saveError);
          }
        }
        
        // Use a fallback minimal resume structure if all else fails
        console.warn('Using fallback resume structure due to parsing errors');
        tailoredResumeData = {
          fullName: userName || 'Applicant',
          contactInfo: {
            email: resume.contactInfo?.email || '',
            phone: resume.contactInfo?.phone || '',
            location: resume.contactInfo?.location || '',
            linkedin: resume.contactInfo?.linkedin || ''
          },
          summary: resume.summary || 'Experienced professional seeking new opportunities.',
          experience: Array.isArray(resume.experience) ? resume.experience : [],
          education: Array.isArray(resume.education) ? resume.education : [],
          skills: Array.isArray(resume.skills) ? resume.skills : [],
          certifications: resume.certifications || [],
          trainings: [],
          projects: [],
          references: [{
            name: 'References available upon request',
            title: '',
            company: '',
            phone: '',
            email: '',
            relationship: ''
          }]
        };
      }
    }
    
    // Generate the PDF
    const pdf = await generateResumePDF(tailoredResumeData);
    
    // Generate the filename
    const fileName = generateFileName(companyName, userName, 'Resume');
    
    return { pdf, fileName };
  } catch (error) {
    console.error('Error generating ATS resume:', error);
    throw new Error('Failed to generate ATS-optimized resume');
  }
}

/**
 * Generate a personalized cover letter based on user profile and job description
 * @param resume User's parsed resume data
 * @param jobDescription Parsed job description
 * @param userName User's full name
 * @param companyName Company name
 * @returns Generated PDF as Uint8Array and filename
 */
export async function generateCoverLetter(
  resume: ParsedResume,
  jobDescription: ParsedJobDescription,
  userName: string,
  companyName: string,
  userId?: string,
  bypassTokenLimits: boolean = false
): Promise<{ pdf: Uint8Array; fileName: string }> {
  try {
    // Create a prompt for the AI to generate a cover letter
    const prompt = `
      I need to create a personalized cover letter for a job application.

      Here is the candidate's information:
      ${JSON.stringify(resume, null, 2)}

      Here is the job description:
      ${JSON.stringify(jobDescription, null, 2)}

      Please generate a professional, compelling cover letter that:
      1. Expresses interest in the specific role
      2. Highlights 2-3 most relevant qualifications/experiences FROM THE RESUME
      3. Demonstrates understanding of the company
      4. Explains why the candidate is a good fit BASED ON THEIR ACTUAL EXPERIENCE
      5. Includes a call to action

      ABSOLUTE REQUIREMENTS:
      - Use ONLY experiences, skills, and achievements that exist in the candidate's resume
      - DO NOT invent any new qualifications, experiences, or skills
      - DO NOT add metrics, achievements, or details not in the original resume
      - If the candidate lacks certain requirements, focus on transferable skills they DO have
      - Every claim must be traceable back to something in their resume
      - The candidate must be able to back up every statement in an interview

      Return the result as a JSON object with this structure:
      {
        "fullName": "",
        "contactInfo": {
          "email": "",
          "phone": "",
          "location": ""
        },
        "date": "Current date (Month DD, YYYY)",
        "recipient": {
          "name": "Hiring Manager", 
          "title": "Hiring Manager",
          "company": "",
          "address": ""
        },
        "jobTitle": "",
        "paragraphs": ["", "", ""],
        "closing": "Sincerely,"
      }

      The paragraphs should typically include:
      1. Introduction and statement of interest
      2. Body paragraph(s) highlighting relevant experiences and skills 
      3. Closing paragraph with call to action

      Keep the cover letter concise, professional, and tailored to the specific job opportunity.
    `;

    const systemPrompt = `
      You are an expert cover letter writer who specializes in creating personalized, compelling cover letters.
      Your goal is to create a cover letter that highlights the candidate's most relevant qualifications
      and demonstrates their fit for the specific role and company.
      
      STRICT INTEGRITY RULES - NEVER VIOLATE:
      1. Use ONLY information from the candidate's provided resume
      2. NEVER invent, embellish, or add:
         - Job experiences not in the resume
         - Skills or technologies not mentioned
         - Metrics or achievements not listed
         - Certifications or education not present
      3. When referencing experience, use the EXACT:
         - Job titles from the resume
         - Company names from the resume
         - Dates from the resume (preserve exact format, don't convert "April 2023" to "04/2023")
      4. You may:
         - Rephrase existing content professionally
         - Connect existing experience to job requirements
         - Highlight transferable skills they actually have
         - Use professional language to describe their real experience
      5. If they lack specific requirements:
         - Focus on related experience they DO have
         - Emphasize transferable skills
         - Show enthusiasm and ability to learn
         - NEVER claim to have the missing requirement
      
      REMEMBER: The cover letter is a legal document. False claims can lead to:
      - Immediate termination if discovered
      - Damage to professional reputation
      - Legal consequences in some cases
      
      The candidate must be able to provide examples and elaborate on EVERY claim in an interview.
      
      CRITICAL: You must return a valid JSON object exactly matching the requested structure.
      - Do not include any markdown formatting or code blocks
      - Ensure all strings are properly quoted
      - Close all braces and brackets properly
      - Do not include comments or explanations outside the JSON
    `;

    // Load user settings if userId provided
    let userSettings;
    if (userId) {
      try {
        // Use service role client for background jobs to avoid cookie context issues
        const { createServiceRoleClient } = await import('../supabase/server-client');
        const supabase = createServiceRoleClient();
        
        const { data: settingsRow } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', userId)
          .single();
          
        if (settingsRow?.settings) {
          userSettings = settingsRow.settings;
          console.log('[COVER LETTER] Loaded user-specific settings from database:', userSettings);
        }
      } catch (error) {
        console.error('[COVER LETTER] Error loading user settings:', error);
      }
    }

    // Call the AI service with user settings
    const response = await queryAI(prompt, systemPrompt, userSettings, 'cover_letter', bypassTokenLimits);
    
    // Extract content from the AI response object
    let parsedContent: string;
    if (response && typeof response === 'object' && response.choices && response.choices.length > 0) {
      parsedContent = response.choices[0].message.content;
    } else if (typeof response === 'string') {
      parsedContent = response;
    } else {
      console.error('Invalid AI response format. Response type:', typeof response);
      console.error('Response structure:', JSON.stringify(response).substring(0, 200));
      throw new Error('Invalid AI response format');
    }

    // Clean up the response using our helper function
    const cleanedContent = cleanAIJsonResponse(parsedContent);
    
    // Parse the response to get the cover letter data
    let coverLetterData: CoverLetterData;
    try {
      coverLetterData = JSON.parse(cleanedContent);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message);
      console.error('Cleaned content length:', cleanedContent.length);
      console.error('First 200 chars of cleaned content:', cleanedContent.substring(0, 200));
      console.error('Last 200 chars of cleaned content:', cleanedContent.substring(cleanedContent.length - 200));
      
      // Try to find the specific character causing the issue
      if (parseError.message.includes('position')) {
        const match = parseError.message.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          console.error(`Character at position ${position}: ${JSON.stringify(cleanedContent[position])}`);
          console.error(`Context around position ${position}:`, cleanedContent.substring(Math.max(0, position - 50), Math.min(cleanedContent.length, position + 50)));
        }
      }
      
      // Try JSON repair before giving up
      console.log('Attempting to repair malformed JSON for cover letter...');
      try {
        coverLetterData = attemptJsonRepair(cleanedContent);
        console.log('Successfully repaired and parsed cover letter JSON');
      } catch (repairError) {
        console.error('Cover letter JSON repair failed:', repairError);
        
        // Use a fallback minimal cover letter structure
        console.warn('Using fallback cover letter structure due to parsing errors');
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        coverLetterData = {
          fullName: userName || 'Applicant',
          contactInfo: {
            email: resume.contactInfo?.email || '',
            phone: resume.contactInfo?.phone || '',
            location: resume.contactInfo?.location || ''
          },
          date: today,
          recipient: {
            name: 'Hiring Manager',
            title: 'Hiring Manager',
            company: companyName || 'Company',
            address: ''
          },
          jobTitle: jobDescription.jobTitle || 'Position',
          paragraphs: [
            `I am writing to express my strong interest in the ${jobDescription.jobTitle || 'position'} role at ${companyName || 'your company'}.`,
            `With my background and experience, I am confident I would be a valuable addition to your team.`,
            `I look forward to the opportunity to discuss how my skills and experience align with your needs. Thank you for considering my application.`
          ],
          closing: 'Sincerely,'
        };
      }
    }
    
    // Generate the PDF
    const pdf = await generateCoverLetterPDF(coverLetterData);
    
    // Generate the filename
    const fileName = generateFileName(companyName, userName, 'CoverLetter');
    
    return { pdf, fileName };
  } catch (error) {
    console.error('Error generating cover letter:', error);
    throw new Error('Failed to generate cover letter');
  }
}

/**
 * Generate LinkedIn profile optimization suggestions
 * @param linkedInData LinkedIn profile data
 * @returns Array of optimization suggestions
 */
export async function generateLinkedInOptimizationTips(linkedInData: any): Promise<string[]> {
  try {
    // Create a prompt for the AI to analyze the LinkedIn profile
    const prompt = `
      I need recommendations to optimize a LinkedIn profile.

      Here is the current LinkedIn profile data:
      ${JSON.stringify(linkedInData, null, 2)}

      Please provide 5-8 specific, actionable recommendations to improve this LinkedIn profile's:
      1. Headline (for visibility in searches)
      2. Summary/About section
      3. Experience descriptions (achievement-oriented)
      4. Skills section
      5. Overall profile completeness and professionalism

      Return the results as an array of strings, with each string being a specific recommendation.
      Make the recommendations detailed and actionable, not generic advice.
    `;

    const systemPrompt = `
      You are an expert LinkedIn profile optimizer who helps professionals improve their visibility
      and attractiveness to hiring managers and recruiters. You provide specific, actionable
      recommendations that will have a meaningful impact on profile effectiveness.
    `;

    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Parse the response to get the optimization tips
    const optimizationTips: string[] = JSON.parse(response.choices[0].message.content);
    
    return optimizationTips;
  } catch (error) {
    console.error('Error generating LinkedIn optimization tips:', error);
    throw new Error('Failed to generate LinkedIn profile optimization tips');
  }
}