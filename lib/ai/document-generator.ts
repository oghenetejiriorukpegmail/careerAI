import { queryAI } from './config';
import { ParsedResume, ParsedJobDescription } from '../documents/document-parser';
import { ResumeData, CoverLetterData, generateResumePDF, generateCoverLetterPDF, generateFileName } from '../documents/pdf-generator';
import { generateResumeDocx } from '../documents/docx-generator';

// Helper function to fix common JSON errors
function fixCommonJsonErrors(content: string): string {
  let fixed = content;
  
  // Fix incomplete URLs (like "https:   })
  fixed = fixed.replace(/"(https?:)\s*\}/g, '"$1//example.com"}');
  fixed = fixed.replace(/"(https?:)\s*,/g, '"$1//example.com",');
  
  // Fix incomplete key-value pairs that end abruptly
  fixed = fixed.replace(/"([^"]+)":\s*,/g, (match, key) => {
    // If the value is missing, add an empty string
    return `"${key}": "",`;
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
    codeBlockRegex = /```\s*json\s*([\s\S]*?)\s*```/g;
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
  
  // Fix unescaped newlines within strings more comprehensively
  // This is a more careful approach that tracks string boundaries
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
      contactLocation: resume.contactInfo?.location,
      hasSummary: !!resume.summary,
      experienceCount: resume.experience?.length || 0,
      educationCount: resume.education?.length || 0,
      skillsCount: resume.skills?.length || 0,
      hasWorkAuth: !!resume.workAuthorization,
      workAuthValue: resume.workAuthorization,
      resumeKeys: Object.keys(resume),
      // Log first experience item if exists
      firstExperience: resume.experience?.[0] ? {
        title: resume.experience[0].title,
        company: resume.experience[0].company
      } : 'No experience'
    });
    // Pre-process experience to add explicit ordering and analyze career consistency
    const numberedResume = { ...resume };
    let careerConsistencyNote = '';
    
    if (numberedResume.experience && Array.isArray(numberedResume.experience)) {
      numberedResume.experience = numberedResume.experience.map((exp, index) => ({
        ...exp,
        __ORDER_INDEX__: index + 1,
        __PRESERVE_ORDER__: `This is position #${index + 1} in the original resume - maintain this exact position`
      }));
      
      // Analyze career consistency for strategic positioning
      const targetRole = jobDescription.jobTitle || '';
      const recentRoles = numberedResume.experience.slice(0, 3);
      
      if (targetRole && recentRoles.length >= 2) {
        const isConsistentCareer = recentRoles.every(role => {
          const roleTitle = role.title || '';
          const targetWords = targetRole.toLowerCase().split(/\s+/);
          const roleWords = roleTitle.toLowerCase().split(/\s+/);
          return targetWords.some(word => roleWords.includes(word)) || 
                 roleWords.some(word => targetWords.includes(word));
        });
        
        if (isConsistentCareer) {
          careerConsistencyNote = `
          
          STRATEGIC POSITIONING NOTE: The candidate's last ${recentRoles.length} roles align with the target position "${targetRole}".
          This demonstrates SUBJECT MATTER EXPERTISE and STRATEGIC CAREER FOCUS.
          Emphasize this as a competitive advantage:
          - Position as proven specialist rather than generalist
          - Highlight sustained expertise building and domain authority
          - Frame as lower-risk hire with immediate impact potential
          - Use expert-level language and positioning throughout`;
        }
      }
    }

    // Create a prompt for the AI to tailor the resume
    const prompt = `
      I need to create an ATS-optimized resume for a job application.

      Here is the candidate's information:
      ${JSON.stringify(numberedResume, null, 2)}

      Here is the job description:
      ${JSON.stringify(jobDescription, null, 2)}

      Please tailor the resume to highlight relevant skills and experience that match the job requirements.
      
      CRITICAL ORDER PRESERVATION:
      The experience array contains __ORDER_INDEX__ fields that show the EXACT position each job should appear.
      You MUST preserve this exact order. Experience #1 must be first, Experience #2 must be second, etc.
      DO NOT sort by dates, relevance, or any other criteria - maintain the numbered sequence exactly.
      ${careerConsistencyNote}
      
      STRICT RULES:
      - Use ONLY the information provided in the candidate's resume above
      - DO NOT add any new experiences, skills, or qualifications
      - DO NOT change job titles, company names, dates, or locations
      - PRESERVE the exact location from contactInfo.location - DO NOT modify it
      - PRESERVE the workAuthorization field exactly as provided - DO NOT remove or modify it
      - MAINTAIN the EXACT ORDER of work experience as provided - DO NOT reorder or rearrange experiences
      - If dates are missing or incomplete, leave them as provided - DO NOT guess or fill in dates
      - PRESERVE the chronological order exactly as it appears in the input data
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
        "fullName": "[First Middle Last format - e.g., 'John Michael Smith' NOT 'Smith, John Michael']",
        "jobTitle": "",
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
        ],
        "workAuthorization": ""
      }

      Include certifications, training, and projects ONLY if they are available in the candidate's resume data.
      If these sections are not present in the original data, omit them from the output or leave them as empty arrays.
      
      BULLET POINT TRANSFORMATION EXAMPLES:
      Transform weak descriptions into powerful achievement statements:
      
      WEAK: "Responsible for network infrastructure management"
      STRONG: "Led enterprise network infrastructure optimization serving 10,000+ users, achieving 99.9% uptime and reducing maintenance costs by $500K annually"
      
      WEAK: "Worked on security implementations"  
      STRONG: "Architected and deployed zero-trust security framework across 50+ global sites, eliminating security breaches and ensuring 100% compliance with SOX requirements"
      
      WEAK: "Managed team of engineers"
      STRONG: "Built and mentored high-performing engineering team of 15 professionals, improving project delivery by 40% while reducing staff turnover to 5%"
      
      WEAK: "Implemented network solutions"
      STRONG: "Spearheaded cloud-native network transformation initiative, migrating 200+ applications to AWS/Azure, resulting in 35% cost reduction and 50% faster deployment cycles"
      
      PROFESSIONAL SUMMARY ENHANCEMENT:
      - Lead with years of experience and key technical expertise
      - Highlight major accomplishments and quantifiable impacts
      - Include industry recognition, certifications, or awards if available
      - Focus on value proposition and unique strengths
      - Use compelling language that positions the candidate as a top performer
      - Align summary with target role requirements while showcasing differentiation
      
      CAREER PROGRESSION STRATEGY:
      When the candidate's last 3 roles align with the target position:
      - Emphasize SUBJECT MATTER EXPERT positioning over generalist approach
      - Highlight INTENTIONAL CAREER TRAJECTORY and sustained expertise building
      - Position as LOWER RISK, HIGHER VALUE hire due to proven track record
      - Showcase DEEPER TECHNICAL EXPERTISE across the domain
      - Emphasize FASTER TIME TO PRODUCTIVITY and immediate impact potential
      - Demonstrate INDUSTRY CREDIBILITY and established professional network
      - Frame progression as STRATEGIC CAREER FOCUS rather than job hopping
      - Use phrases like "specialized expertise," "domain authority," "proven specialist"
      
      For work authorization:
      - Include ONLY if provided in the candidate's data (look for workAuthorization field)
      - Common values: 'US Citizen', 'Green Card', 'H1B', 'H4 EAD', 'F1 OPT', 'TN', 'L1', 'L2 EAD'
      - If not provided, leave as empty string
      - DO NOT invent or assume work authorization status
      
      For location in contactInfo:
      - Use ONLY the exact location provided in contactInfo.location
      - If contactInfo.location is empty, missing, or null, leave it as empty string ""
      - DO NOT add location based on job description
      - DO NOT add "Remote", "Hybrid", or any work arrangement to location
      - DO NOT make up cities or states - use only what's provided
      
      For references:
      - If the candidate has provided specific references in their data, include them
      - If no specific references are provided, include a standard "References available upon request" entry:
        [{"name": "References available upon request", "title": "", "company": "", "phone": "", "email": "", "relationship": ""}]
      - Always include the references section unless specifically inappropriate for the role
      
      For the jobTitle field:
      - For senior roles (10+ years experience), leave it empty ("") to avoid limiting the candidate
      - For mid-level roles, you may include a relevant title that matches their experience level
      - NEVER just copy the job posting title - the candidate's actual title should reflect their experience
      - If including a title, make it broad and senior (e.g., "Senior Technology Executive", "Engineering Leader")
      
      IMPORTANT for experience section:
      - Each job should include BOTH a "summary" field AND a "description" array
      - The "summary" field should be a 1-2 sentence overview of the role, responsibilities, and scope
      - The "summary" should naturally incorporate relevant keywords from the job description
      - The "description" field MUST be an array of individual bullet points for achievements
      - Each array element should be a single achievement or responsibility
      - Start each bullet with an action verb (e.g., "Managed", "Developed", "Led", "Implemented")
      - Make descriptions achievement-oriented and quantifiable where possible
      - Include metrics and results when available (e.g., "Increased sales by 25%", "Managed team of 10")
      - For senior roles (400K-1M positions), include 8-12 detailed bullet points per role
      - Each bullet should demonstrate leadership, strategic thinking, and significant business impact
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
      
      Ensure all the experience descriptions are achievement-oriented and quantifiable where possible.
      Include the most relevant skills from the candidate's profile that match the job requirements.
      Keep the content truthful and based on the provided information.
    `;

    const systemPrompt = `
      You are an expert executive resume writer who specializes in creating powerful, comprehensive resumes for senior-level positions ($400K-$1M+ roles).
      Your goal is to create a detailed, impressive resume that showcases the full depth of the candidate's experience and achievements.
      
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
      5. NAME FORMAT: Always use First Middle Last format
         - Correct: "John Michael Smith" or "Jane Doe"
         - WRONG: "Smith, John Michael" or "Doe, Jane"
         - If the source has Last, First format, convert it to First Last
      6. WORK EXPERIENCE ORDER: NEVER reorder or rearrange work experience
         - Maintain the EXACT order as provided in the input
         - Do NOT sort by date, relevance, or any other criteria
         - The first experience in input must be first in output
         - Preserve the exact chronological sequence
      
      CRITICAL for senior/executive resumes:
      - Experience descriptions MUST be comprehensive and detailed
      - Include 8-12 bullet points per role for recent positions (last 10 years)
      - Each bullet should demonstrate significant business impact, leadership, and strategic thinking
      - Quantify achievements with metrics, budgets, team sizes, and business outcomes
      - Highlight P&L responsibility, cost savings, revenue generation, and transformation initiatives
      - Show progression of responsibility and expanding scope across roles
      - For $400K-$1M positions, the resume should be detailed enough to "win the role before the interview"
      
      ACCOMPLISHMENT-FOCUSED NARRATIVE REQUIREMENTS:
      1. IMPACT-DRIVEN CONTENT:
         - Balance responsibilities with measurable achievements
         - Focus not only on what was done but HOW impact was made
         - Transform task descriptions into achievement statements
         - Show quantifiable business value and outcomes
      
      2. DYNAMIC AND ASSERTIVE LANGUAGE:
         - Use active voice and strong action verbs from these categories:
           * Leadership: Led, Directed, Orchestrated, Spearheaded, Championed, Pioneered
           * Achievement: Delivered, Achieved, Exceeded, Surpassed, Accomplished, Attained
           * Innovation: Transformed, Revolutionized, Modernized, Streamlined, Optimized, Enhanced
           * Growth: Expanded, Scaled, Accelerated, Increased, Boosted, Amplified
           * Problem-Solving: Resolved, Eliminated, Mitigated, Overcame, Addressed, Corrected
         - Avoid passive phrases like "was responsible for", "assisted with", "helped with", "involved in"
         - Make language engaging, assertive, and compelling
         - Use present tense for current role, past tense for previous roles
         - Choose power words that convey executive-level impact and strategic thinking
      
      3. MEASURABLE ACHIEVEMENTS:
         - Include specific metrics: percentages, dollar amounts, timelines, team sizes
         - Show before/after improvements (e.g., "Reduced downtime by 40%", "Increased efficiency by 25%")
         - Quantify scope and scale of projects and responsibilities
         - Highlight cost savings, revenue generation, and process improvements
      
      4. COMPETITIVE DIFFERENTIATION:
         - Craft content that stands out in a competitive job market
         - Highlight unique contributions and strategic thinking
         - Show progression and expanding impact across roles
         - Demonstrate thought leadership and innovation
         - LEVERAGE CAREER CONSISTENCY: If last 2-3 roles match target position, position as subject matter expert with:
           * "Specialized expertise in [domain] with progressive responsibility"
           * "Proven domain authority demonstrated across industry-leading organizations"
           * "Strategic career focus delivering consistent results in [field]"
           * "Deep technical expertise refined through [X] years of dedicated practice"
      
      5. PROFESSIONAL POLISH:
         - Ensure clear, concise, and impactful bullet points
         - Maintain consistent formatting and professional presentation
         - Create a visually appealing and easy-to-scan document
         - Use strategic emphasis to highlight key achievements
      - Length is NOT a concern for executive roles - thoroughness and impact are what matter
      
      REMEMBER: The candidate must be able to defend every single item in an interview.
      If it's not in their original resume, it CANNOT be in the tailored version.
      
      CRITICAL: You must return a valid JSON object exactly matching the requested structure.
      - Do not include any markdown formatting or code blocks
      - Ensure all strings are properly quoted
      - Make sure all URLs are complete (e.g., "https://linkedin.com/in/username" not just "https:")
      - Close all braces and brackets properly
      - Do not include comments or explanations outside the JSON
      - ALWAYS include workAuthorization field in your response - copy it exactly from input or use empty string ""
      - NEVER modify the location in contactInfo - use exactly what was provided or empty string ""
      - If location is not provided in the input data, use empty string "" - DO NOT make up a location
      - PRESERVE the exact order of experience array - DO NOT sort, reorder, or rearrange work experience
      - The experience array must appear in the SAME ORDER as the input data
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
      
      // Clean up ordering fields and verify order preservation
      if (tailoredResumeData.experience && Array.isArray(tailoredResumeData.experience)) {
        // Check if order was preserved before cleaning
        const hasOrderFields = tailoredResumeData.experience.some(exp => (exp as any).__ORDER_INDEX__);
        if (hasOrderFields) {
          // Verify the order is correct
          const isOrderCorrect = tailoredResumeData.experience.every((exp, index) => 
            (exp as any).__ORDER_INDEX__ === index + 1
          );
          
          if (!isOrderCorrect) {
            console.warn('[ORDER VIOLATION] AI changed the work experience order - attempting to restore original order');
            // Sort by the original order index to restore correct sequence
            tailoredResumeData.experience.sort((a, b) => ((a as any).__ORDER_INDEX__ || 0) - ((b as any).__ORDER_INDEX__ || 0));
          }
        }
        
        // Remove the ordering fields from the final output
        tailoredResumeData.experience = tailoredResumeData.experience.map(exp => {
          const { __ORDER_INDEX__, __PRESERVE_ORDER__, ...cleanExp } = exp as any;
          return cleanExp;
        });
      }
      
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
        
        // Apply the same order cleanup to repaired data
        if (tailoredResumeData.experience && Array.isArray(tailoredResumeData.experience)) {
          const hasOrderFields = tailoredResumeData.experience.some(exp => (exp as any).__ORDER_INDEX__);
          if (hasOrderFields) {
            const isOrderCorrect = tailoredResumeData.experience.every((exp, index) => 
              (exp as any).__ORDER_INDEX__ === index + 1
            );
            
            if (!isOrderCorrect) {
              console.warn('[ORDER VIOLATION - REPAIR] AI changed the work experience order - restoring original order');
              tailoredResumeData.experience.sort((a, b) => ((a as any).__ORDER_INDEX__ || 0) - ((b as any).__ORDER_INDEX__ || 0));
            }
          }
          
          // Remove ordering fields
          tailoredResumeData.experience = tailoredResumeData.experience.map(exp => {
            const { __ORDER_INDEX__, __PRESERVE_ORDER__, ...cleanExp } = exp as any;
            return cleanExp;
          });
        }
        
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
        referencesCount: tailoredResumeData.references?.length || 0,
        hasWorkAuth: !!tailoredResumeData.workAuthorization,
        workAuthValue: tailoredResumeData.workAuthorization
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
          jobTitle: '', // Leave empty for senior roles
          contactInfo: {
            email: resume.contactInfo?.email || '',
            phone: resume.contactInfo?.phone || '',
            location: resume.contactInfo?.location || '',
            linkedin: resume.contactInfo?.linkedin || ''
          },
          summary: resume.summary || 'Experienced professional seeking new opportunities.',
          experience: Array.isArray(resume.experience) ? resume.experience.map(exp => ({
            title: exp.title || 'Position',
            company: exp.company || 'Company',
            location: exp.location,
            startDate: exp.startDate || '',
            endDate: exp.endDate,
            description: Array.isArray(exp.description) ? exp.description : (typeof exp.description === 'string' ? [exp.description] : [])
          })) : [],
          education: Array.isArray(resume.education) ? resume.education.map(edu => ({
            institution: edu.institution || 'Institution',
            degree: edu.degree || 'Degree',
            field: edu.field,
            graduationDate: edu.graduationDate
          })) : [],
          skills: Array.isArray(resume.skills) ? resume.skills : [],
          workAuthorization: resume.workAuthorization || '',
          certifications: resume.certifications ? resume.certifications.map(cert => ({
            name: cert.name || cert.title || 'Certification',
            issuer: cert.issuer || cert.organization || 'Issuer',
            date: cert.date || cert.issueDate,
            expiryDate: cert.validUntil,
            credentialId: undefined
          })) : [],
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
    
    // Generate the filename with job title
    const fileName = generateFileName(companyName, userName, 'Resume', jobDescription.jobTitle);
    
    return { pdf, fileName };
  } catch (error) {
    console.error('Error generating ATS resume:', error);
    throw new Error('Failed to generate ATS-optimized resume');
  }
}

/**
 * Generate a resume in the specified format (PDF or DOCX)
 * @param resume User's parsed resume data
 * @param jobDescription Parsed job description
 * @param userName User's full name
 * @param companyName Company name
 * @param format Output format ('pdf' or 'docx')
 * @param userId User ID for loading user-specific settings
 * @param bypassTokenLimits Whether to bypass AI token limits
 * @returns Generated document as Uint8Array, filename, and content type
 */

/**
 * Transform PDF generator ResumeData to DOCX generator format
 */
function transformToDocxFormat(pdfData: ResumeData): any {
  return {
    contactInfo: {
      fullName: pdfData.fullName,
      email: pdfData.contactInfo?.email || '',
      phone: pdfData.contactInfo?.phone || '',
      location: pdfData.contactInfo?.location || '',
      linkedin: pdfData.contactInfo?.linkedin || '',
      website: ''
    },
    summary: pdfData.summary || '',
    experience: pdfData.experience?.map(exp => ({
      title: exp.title || '',
      company: exp.company || '',
      location: exp.location || '',
      duration: exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : 
                exp.startDate ? `${exp.startDate} - Present` : '',
      description: exp.description || [],
      technologies: []
    })) || [],
    education: pdfData.education?.map(edu => ({
      degree: edu.degree || '',
      school: edu.institution || '',
      location: '',
      year: edu.graduationDate || '',
      gpa: ''
    })) || [],
    skills: pdfData.skills || [],
    certifications: pdfData.certifications?.map(cert => ({
      name: cert.name || '',
      issuer: cert.issuer || '',
      date: cert.date || '',
      expiry: cert.expiryDate || ''
    })) || [],
    projects: pdfData.projects?.map(proj => ({
      name: proj.name || '',
      description: proj.description || '',
      technologies: [],
      date: '',
      url: ''
    })) || [],
    languages: []
  };
}

export async function generateAtsResumeWithFormat(
  resume: ParsedResume,
  jobDescription: ParsedJobDescription,
  userName: string,
  companyName: string,
  format: 'pdf' | 'docx' = 'pdf',
  userId?: string,
  bypassTokenLimits: boolean = false
): Promise<{ document: Uint8Array; fileName: string; contentType: string }> {
  try {
    // First generate the tailored resume data using the existing logic
    const { pdf } = await generateAtsResume(resume, jobDescription, userName, companyName, userId, bypassTokenLimits);
    
    // For PDF format, we can return the existing result
    if (format === 'pdf') {
      const fileName = generateFileName(companyName, userName, 'Resume', jobDescription.jobTitle);
      return {
        document: pdf,
        fileName,
        contentType: 'application/pdf'
      };
    }
    
    // For DOCX format, we need to regenerate using the DOCX generator
    // We'll need to extract the tailored resume data first
    // This is a simplified approach - ideally we'd refactor to separate data generation from format generation
    
    // Generate the tailored resume data again (this is inefficient but works for now)
    const tailoredData = await generateTailoredResumeData(resume, jobDescription, userName, companyName, userId, bypassTokenLimits);
    
    // Transform the data to match DOCX generator interface
    const docxData = transformToDocxFormat(tailoredData);
    
    // Generate DOCX
    const docx = await generateResumeDocx(docxData);
    const fileName = generateFileName(companyName, userName, 'Resume', jobDescription.jobTitle, 'docx');
    
    return {
      document: docx,
      fileName,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
  } catch (error) {
    console.error('Error generating resume with format:', error);
    throw new Error(`Failed to generate ${format.toUpperCase()} resume`);
  }
}

/**
 * Helper function to generate tailored resume data without format-specific output
 */
async function generateTailoredResumeData(
  resume: ParsedResume,
  jobDescription: ParsedJobDescription,
  userName: string,
  companyName: string,
  userId?: string,
  bypassTokenLimits: boolean = false
): Promise<ResumeData> {
  // This essentially duplicates the logic from generateAtsResume but returns the data instead of PDF
  // We'll use a simplified approach for now
  
  console.log('[generateTailoredResumeData] Generating tailored resume data');
  
  // Load user settings for AI provider preferences
  let userSettings;
  try {
    if (userId) {
      const { createServiceRoleClient } = await import('@/lib/supabase/server-client');
      const supabase = createServiceRoleClient();
      const { data: settingsRow } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();
        
      if (settingsRow?.settings) {
        userSettings = settingsRow.settings;
        console.log(`[RESUME] Loaded user-specific settings from database:`, userSettings);
      }
    }
  } catch (error) {
    console.error('[RESUME] Error loading user settings:', error);
  }

  // Create a comprehensive prompt for the AI to tailor the resume
  const prompt = `
    I need to tailor this resume for a specific job application.

    Original Resume:
    ${JSON.stringify(resume, null, 2)}

    Job Description:
    ${JSON.stringify(jobDescription, null, 2)}

    Company: ${companyName}

    Please create a tailored, ATS-optimized resume that:
    1. Emphasizes the most relevant experiences and skills for this role
    2. Uses keywords from the job description naturally
    3. Reorders and highlights experiences that best match the requirements
    4. Maintains truthfulness - use ONLY information from the original resume
    5. Optimizes formatting for ATS scanning

    CRITICAL RULES:
    - Use ONLY experiences, skills, and achievements from the original resume
    - DO NOT invent any new qualifications, experiences, or skills
    - DO NOT add metrics or details not in the original resume
    - You may reword content professionally and reorder sections for relevance
    - Focus on transferable skills if the candidate lacks specific requirements

    Return the result as JSON matching this structure:
    {
      "fullName": "",
      "jobTitle": "", // Leave empty for senior positions to avoid boxing in
      "contactInfo": {
        "email": "",
        "phone": "",
        "location": "",
        "linkedin": "",
        "website": ""
      },
      "summary": "",
      "experience": [
        {
          "title": "",
          "company": "",
          "location": "",
          "startDate": "",
          "endDate": "",
          "description": ["", ""]
        }
      ],
      "education": [
        {
          "institution": "",
          "degree": "",
          "location": "",
          "graduationDate": "",
          "gpa": ""
        }
      ],
      "skills": [""],
      "certifications": [
        {
          "name": "",
          "issuer": "",
          "date": "",
          "expiry": ""
        }
      ],
      "projects": [
        {
          "name": "",
          "description": "",
          "technologies": [""],
          "date": "",
          "url": ""
        }
      ],
      "languages": [
        {
          "language": "",
          "proficiency": ""
        }
      ]
    }
  `;

  const systemPrompt = `
    You are an expert resume writer and ATS optimization specialist. Your goal is to create compelling, 
    truthful resumes that pass ATS systems and impress hiring managers.
    
    STRICT INTEGRITY RULES - NEVER VIOLATE:
    1. Use ONLY information from the candidate's provided resume
    2. NEVER invent, embellish, or add anything not explicitly stated
    3. When referencing experience, use the EXACT job titles, company names, and dates
    4. You may rephrase content professionally but must maintain factual accuracy
    5. If they lack specific requirements, focus on transferable skills they actually have
    
    OPTIMIZATION STRATEGIES:
    - Use action verbs and quantifiable achievements when available in original
    - Include relevant keywords from job description naturally
    - Prioritize most relevant experiences at the top
    - Ensure consistent formatting and professional language
    - Optimize for both ATS parsing and human readability
  `;

  // Call the AI service
  const response = await queryAI(prompt, systemPrompt, userSettings, 'resume_generation', bypassTokenLimits);
  
  // Extract and parse the response
  let parsedContent: string;
  if (response && typeof response === 'object' && response.choices && response.choices.length > 0) {
    parsedContent = response.choices[0].message.content;
  } else if (typeof response === 'string') {
    parsedContent = response;
  } else {
    throw new Error('Invalid AI response format');
  }

  // Parse the JSON response
  let tailoredResumeData: ResumeData;
  try {
    const cleanedContent = cleanAIJsonResponse(parsedContent);
    tailoredResumeData = JSON.parse(cleanedContent);
    
    // Ensure required fields are present
    if (!tailoredResumeData.contactInfo) {
      tailoredResumeData.contactInfo = {
        email: resume.contactInfo?.email || '',
        phone: resume.contactInfo?.phone || '',
        location: resume.contactInfo?.location || ''
      };
    }
    
    if (!tailoredResumeData.fullName) {
      tailoredResumeData.fullName = userName;
    }
    
  } catch (parseError) {
    console.error('Failed to parse tailored resume data:', parseError);
    
    // Fallback to original resume structure
    tailoredResumeData = {
      fullName: userName || 'Applicant',
      jobTitle: '',
      contactInfo: {
        email: resume.contactInfo?.email || '',
        phone: resume.contactInfo?.phone || '',
        location: resume.contactInfo?.location || '',
        linkedin: resume.contactInfo?.linkedin || ''
      },
      summary: resume.summary || 'Experienced professional seeking new opportunities.',
      experience: Array.isArray(resume.experience) ? resume.experience.map(exp => ({
        title: exp.title || 'Position',
        company: exp.company || 'Company',
        location: exp.location,
        startDate: exp.startDate || '',
        endDate: exp.endDate,
        description: Array.isArray(exp.description) ? exp.description : 
                    (typeof exp.description === 'string' ? [exp.description] : [])
      })) : [],
      education: Array.isArray(resume.education) ? resume.education.map(edu => ({
        institution: edu.institution || 'Institution',
        degree: edu.degree || 'Degree',
        graduationDate: edu.graduationDate || ''
      })) : [],
      skills: Array.isArray(resume.skills) ? resume.skills : []
    };
  }

  return tailoredResumeData;
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
          "name": "",  // Leave empty unless a specific person is mentioned in the job description
          "title": "",  // Job title of the person if mentioned
          "company": "",
          "address": ""
        },
        "jobTitle": "",
        "paragraphs": ["", "", ""],
        "closing": "Sincerely,"
      }

      The paragraphs should typically include:
      1. Introduction and statement of interest (DO NOT include "Dear..." - this will be added automatically)
      2. Body paragraph(s) highlighting relevant experiences and skills 
      3. Closing paragraph with call to action

      IMPORTANT: 
      - DO NOT include "Dear Hiring Manager" or any salutation in the paragraphs
      - The greeting will be generated automatically from the recipient information
      - Start the first paragraph directly with your opening statement (e.g., "I am writing to express...")

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
            name: '',  // Leave empty to use default greeting
            title: '',
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
    
    // Generate the filename with job title
    const fileName = generateFileName(companyName, userName, 'CoverLetter', jobDescription.jobTitle);
    
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