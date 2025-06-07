import { queryAI } from '../ai/config';

// Types for structured data
export interface ParsedResume {
  contactInfo: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
  summary?: string;
  experience: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description: string[] | string;
  }>;
  education: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    graduationDate?: string;
  }>;
  skills: string[];
  projects?: Array<{
    name?: string;
    description?: string;
  }>;
  certifications?: Array<{
    name?: string;
    title?: string;
    issuer?: string;
    organization?: string;
    date?: string;
    issueDate?: string;
    validUntil?: string;
    description?: string;
  }>;
  training?: Array<{
    name?: string;
    title?: string;
    provider?: string;
    institution?: string;
    date?: string;
    completionDate?: string;
    duration?: string;
    description?: string;
  }>;
  references?: Array<{
    name?: string;
    title?: string;
    position?: string;
    company?: string;
    email?: string;
    phone?: string;
    relationship?: string;
  }>;
}

export interface ParsedJobDescription {
  jobTitle?: string;
  company?: string;
  location?: string;
  requirements: string[];
  responsibilities: string[];
  qualifications: string[];
  keywords: string[];
  company_culture?: string[];
}

// Note: Document parsing functions have been moved to the API route
// to avoid Node.js module import issues in the browser
// See /app/api/documents/parse/route.ts for implementation

/**
 * Extract structured data from resume text using AI
 * @param resumeText Raw text from resume
 * @param debug Whether to enable debug mode
 * @returns Structured resume data
 */
export async function extractStructuredResumeData(resumeText: string, debug: boolean = false): Promise<ParsedResume> {
  try {
    console.log(`Processing resume text (${resumeText.length} chars) in a single request`);
    
    // Output debug info if requested
    if (debug) {
      console.log('\n[RESUME_PARSER_DEBUG] Input text sample:');
      console.log('-'.repeat(80));
      console.log(resumeText.substring(0, 1000) + (resumeText.length > 1000 ? '...' : ''));
      console.log('-'.repeat(80));
      
      // Optionally write to a debug file
      if (typeof process !== 'undefined') {
        try {
          // Use dynamic import for ESM compatibility
          import('fs').then(fs => {
            fs.writeFileSync('./resume_input.debug.md', resumeText);
            console.log('[RESUME_PARSER_DEBUG] Full input written to resume_input.debug.md');
          }).catch(err => {
            console.error('[RESUME_PARSER_DEBUG] Failed to import fs module:', err);
          });
        } catch (err) {
          console.error('[RESUME_PARSER_DEBUG] Error writing debug file:', err);
        }
      }
    }
    
    // With Gemini 2.5 Flash, we can process even very large resumes in a single call
    // No need to split into sections anymore
    return await extractResumeSection(resumeText, "full", debug);
  } catch (error) {
    console.error('Error extracting structured data from resume:', error);
    
    // Create a minimal fallback structure with basic info extracted via regex
    console.log('Falling back to basic data extraction...');
    
    // Extract email using regex
    const emailMatch = resumeText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    const email = emailMatch ? emailMatch[1] : '';
    
    // Extract phone using regex
    const phoneMatch = resumeText.match(/(\+?1?\s*\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4})/);
    const phone = phoneMatch ? phoneMatch[1] : '';
    
    // Try to extract name - look for the first line or something that looks like a name
    const lines = resumeText.split('\n').map(line => line.trim()).filter(Boolean);
    let name = lines[0] || 'Unknown';
    
    // If the first line is too long, it's probably not a name
    if (name.length > 40) {
      name = 'Unknown';
    }
    
    // Extract skills - look for common technical or professional terms
    const skillKeywords = [
      'Network', 'Cisco', 'CCNA', 'CCNP', 'Routing', 'Switching', 'Firewall',
      'JavaScript', 'Python', 'Java', 'C++', 'Ruby', 'PHP', 'HTML', 'CSS', 'SQL',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
      'Leadership', 'Project Management', 'Agile', 'Scrum', 'Communication',
      'Microsoft Office', 'Excel', 'Word', 'PowerPoint', 'Outlook',
      'Analytics', 'Data Analysis', 'Marketing', 'Sales', 'Customer Service',
      'Security', 'VPN', 'LAN', 'WAN', 'Wireless', 'TCP/IP'
    ];
    
    const skills = skillKeywords
      .filter(skill => resumeText.includes(skill))
      .slice(0, 15); // Limit to 15 skills
    
    return {
      contactInfo: {
        fullName: name,
        email: email,
        phone: phone,
        location: '',
        linkedin: ''
      },
      summary: `Resume extracted with basic parsing from ${resumeText.length} character document.`,
      experience: [],
      education: [],
      skills: skills,
      projects: []
    };
  }
}

/**
 * Process a specific section of a resume
 * @param sectionText The text of the resume section to process
 * @param sectionType The type of section: "full", "basic", or "experience"
 * @returns Partial or complete resume data
 */
async function extractResumeSection(
  sectionText: string, 
  sectionType: "full" | "basic" | "experience",
  debug: boolean = false
): Promise<ParsedResume> {
  try {    
    // Create a focused prompt based on the section we're analyzing
    let focusInstructions = "";
    
    if (sectionType === "basic") {
      focusInstructions = "Focus on extracting contact information, summary, education details, and skills.";
    } else if (sectionType === "experience") {
      focusInstructions = "Focus on extracting detailed work experience entries and projects.";
    }
    
    if (debug) {
      console.log(`[RESUME_PARSER_DEBUG] Extracting ${sectionType} section (${sectionText.length} chars)`);
    }
    
    const prompt = `
      You are parsing ${sectionType === "full" ? "a complete resume" : "a section of a resume"} that has been extracted from a PDF using Google Document AI. 
      Extract structured information and return ONLY a JSON object with the following structure - no explanations, no preamble, no markdown formatting:
      {
        "contactInfo": {
          "fullName": "Full name of the person",
          "email": "Email address",
          "phone": "Phone number",
          "location": "City, State/Country",
          "linkedin": "LinkedIn URL if present"
        },
        "summary": "Professional summary or objective",
        "experience": [
          {
            "title": "Job title",
            "company": "Company name",
            "location": "Job location",
            "startDate": "Start date (MM/YYYY)",
            "endDate": "End date (MM/YYYY) or 'Present'",
            "description": ["Bullet point 1", "Bullet point 2", ...]
          }
        ],
        "education": [
          {
            "institution": "University or school name",
            "degree": "Degree type (e.g., Bachelor's, Master's)",
            "field": "Field of study",
            "graduationDate": "Graduation date (YYYY)"
          }
        ],
        "skills": ["Skill 1", "Skill 2", ...],
        "projects": [
          {
            "name": "Project name",
            "description": "Project description"
          }
        ],
        "certifications": [
          {
            "name": "Certification name",
            "issuer": "Issuing organization",
            "date": "Date obtained (MM/YYYY)",
            "validUntil": "Expiration date if applicable",
            "description": "Additional details about the certification"
          }
        ],
        "training": [
          {
            "name": "Course or training name",
            "provider": "Training provider or institution",
            "date": "Completion date",
            "duration": "Duration of the training",
            "description": "Description of the training"
          }
        ],
        "references": [
          {
            "name": "Reference name",
            "title": "Reference's job title",
            "company": "Reference's company",
            "email": "Reference's email",
            "phone": "Reference's phone",
            "relationship": "Relationship to reference"
          }
        ]
      }
      
      ${focusInstructions}
      
      IMPORTANT - This document was extracted directly from a PDF using Google Document AI, which has already preserved the document structure. Look for:
      1. Common resume section headers like EDUCATION, EXPERIENCE, SKILLS, CERTIFICATIONS, etc.
      2. Date patterns that indicate employment periods or graduation dates
      3. Contact information typically found at the top of a resume
      4. Lists of skills, responsibilities, or accomplishments
      
      Be especially thorough in extracting certifications, training/courses, and references sections if they exist. These are often overlooked but provide valuable information.
      
      Resume text:
      ${sectionText}
      
      CRITICAL FORMATTING INSTRUCTIONS:
      1. Return ONLY a raw, valid JSON object with NO explanations before or after
      2. DO NOT use any markdown code formatting (no \`\`\` markers)
      3. DO NOT use the text "json" anywhere in your response
      4. DO NOT wrap your response in code blocks
      5. DO NOT include any special markers in your response
      6. Only provide the bare JSON object starting with { and ending with }
      7. Make sure all strings are properly escaped with double quotes
      8. If you can't find certain information, omit the field rather than leaving it empty
      9. Be VERY thorough in extracting all information from the resume
      
      EXPERIENCE DESCRIPTION FORMATTING - CRITICAL:
      - ALWAYS return experience descriptions as an array of strings, NEVER as a single string
      - If the description is a paragraph, YOU MUST break it down into multiple bullet points
      - Analyze the text and identify distinct responsibilities, tasks, and achievements
      - Each array element should be one complete bullet point
      - Include ALL responsibilities and achievements - do not limit the number of bullets
      - Each bullet should start with a strong action verb (e.g., Developed, Managed, Led, Implemented, Designed, Collaborated, Coordinated, Analyzed, Created, Established)
      - Focus on achievements, responsibilities, and quantifiable results
      - Remove any bullet markers (•, -, *) from the text itself
      - Extract every distinct responsibility, achievement, or task as a separate bullet point
      - Even if the original text is one long sentence, break it into logical bullet points
      - Example: If text says "Responsible for managing team and developing software and conducting meetings", 
        return: ["Managed cross-functional team of developers", "Developed software solutions for client needs", "Conducted regular team meetings and status updates"]
      
      Your entire response must be a valid JSON object that can be directly processed by JSON.parse().
      
      AGAIN: NEVER USE MARKDOWN CODE FORMATTING ANYWHERE IN YOUR RESPONSE.
      YOUR RESPONSE MUST START WITH { AND END WITH } WITH NO OTHER TEXT BEFORE OR AFTER.
    `;
    
    const systemPrompt = "You are an expert resume parser API that processes text extracted from PDFs by Google Document AI and returns pure JSON data with no formatting. CRITICAL: Your entire response must be a valid JSON object starting with { and ending with }, containing no markdown formatting, no code blocks, and no other text. Your response must be directly parseable by JSON.parse() with no preprocessing. NEVER FORMAT YOUR RESPONSE AS A CODE BLOCK. NEVER USE ``` MARKERS ANYWHERE. DO NOT WRAP YOUR RESPONSE WITH ```json or ``` TAGS.";
    
    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Validate the response before processing
    if (!response || !response.choices || !response.choices.length || 
        !response.choices[0] || !response.choices[0].message || 
        !response.choices[0].message.content) {
      console.error('Invalid AI response format:', response);
      throw new Error('AI returned an invalid response format');
    }
    
    // Log the raw response for debugging
    const logPrefix = debug ? '[RESUME_PARSER_DEBUG]' : '';
    console.log(`${logPrefix} Raw ${sectionType} section response (first 100 chars):`, 
      response.choices[0].message.content.substring(0, 100) + '...');
      
    // Log additional details about the response for debugging JSON extraction issues
    const rawContent = response.choices[0].message.content;
    console.log(`${logPrefix} [DETAILS] Response length: ${rawContent.length} characters`);
    
    // Debug: Write full response to file if debug mode is enabled
    if (debug && typeof process !== 'undefined') {
      try {
        // Use dynamic import for ESM compatibility
        import('fs').then(fs => {
          fs.writeFileSync(`./${sectionType}_response.debug.json`, rawContent);
          console.log(`${logPrefix} Full AI response written to ${sectionType}_response.debug.json`);
        }).catch(err => {
          console.error(`${logPrefix} Failed to import fs module:`, err);
        });
      } catch (err) {
        console.error(`${logPrefix} Error writing debug file:`, err);
      }
    }
    
    if (rawContent.includes('```')) {
      console.log(`${logPrefix} [DETAILS] Response contains code blocks`);
      
      // Count code block markers and log their positions
      let codeBlockCount = (rawContent.match(/```/g) || []).length;
      console.log(`${logPrefix} [DETAILS] Found ${codeBlockCount} code block markers`);
      
      if (codeBlockCount % 2 === 0) {
        console.log(`${logPrefix} [DETAILS] Code block markers appear to be properly paired`);
      } else {
        console.warn(`${logPrefix} [WARNING] Odd number of code block markers - this may cause extraction issues`);
      }
      
      // Log first and last code block positions
      let firstPos = rawContent.indexOf('```');
      let lastPos = rawContent.lastIndexOf('```');
      console.log(`${logPrefix} [DETAILS] First code block marker at position ${firstPos}, last marker at position ${lastPos}`);
      
      // Try to detect if content is wrapped in a code block
      if (firstPos < 20 && lastPos > rawContent.length - 20) {
        console.log(`${logPrefix} [DETAILS] Content appears to be completely wrapped in a code block`);
      }
    }
    
    // Pre-process the content to handle markdown and other formatting issues
    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks (like ```json and ```)
    content = content.replace(/^```(\w*\n|\n)?/, '').replace(/```$/, '');
    
    // Try to parse the response directly
    try {
      console.log(`Attempting to parse ${sectionType} section AI response as JSON...`);
      
      console.log('[JSON EXTRACTION] Attempting direct JSON.parse()');
      const structuredData: ParsedResume = JSON.parse(content);
      
      // Basic validation to ensure we have at least a minimal structure
      if (!structuredData) {
        throw new Error('Parsed data is empty');
      }
      
      console.log('[JSON EXTRACTION] Direct JSON parsing successful');
      
      // Ensure we have at least the basic structure expected even if empty
      structuredData.contactInfo = structuredData.contactInfo || {};
      structuredData.experience = structuredData.experience || [];
      structuredData.education = structuredData.education || [];
      structuredData.skills = structuredData.skills || [];
      
      // Log the complete structured data to file for reference and debugging
      if (typeof process !== 'undefined') {
        try {
          // Use dynamic import for ESM compatibility
          import('fs').then(fs => {
            // Create logs directory if it doesn't exist
            if (!fs.existsSync('./logs')) {
              fs.mkdirSync('./logs', { recursive: true });
            }
            
            // Create a timestamped filename for the log
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logFilePath = `./logs/parsed_resume_${timestamp}.json`;
            
            // Write the structured data to the log file with nice formatting
            fs.writeFileSync(logFilePath, JSON.stringify(structuredData, null, 2));
            console.log(`Complete structured resume data saved to ${logFilePath}`);
          }).catch(err => {
            console.error('Failed to import fs module:', err);
          });
        } catch (err) {
          console.error('Error writing structured data log file:', err);
        }
      }
      
      console.log(`Successfully parsed ${sectionType} section JSON response`);
      
      // Post-process the data to ensure proper formatting
      const formattedData = await postProcessResumeData(structuredData);
      
      return formattedData;
    } catch (parseError) {
      console.error(`Error parsing ${sectionType} section AI response as JSON:`, parseError);
      
      // Try extraction methods
      let extractedData: ParsedResume | null = null;
      
      // Method 1: Extract JSON object between curly braces
      try {
        // Handle multi-line code blocks with ```json and ``` markers
        if (content.includes('```')) {
          // Extract content between code block markers
          const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            console.log('Found markdown code block, extracting content...');
            content = codeBlockMatch[1].trim();
          }
        }
        
        // Match for a JSON object pattern
        const jsonMatch = content.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[1];
          console.log('Found JSON-like pattern, attempting to parse...');
          extractedData = JSON.parse(extractedJson);
          console.log(`Successfully extracted and parsed JSON from ${sectionType} section response`);
        }
      } catch (extractionError) {
        console.error('JSON regex extraction failed:', extractionError);
      }
      
      // Method 2: Clean up the response and try again
      if (!extractedData) {
        try {
          // Remove common text that might appear before/after JSON
          const cleaned = content
            .replace(/^[^{]*/, '') // Remove everything before first {
            .replace(/[^}]*$/, '') // Remove everything after last }
            .trim();
            
          if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
            console.log('Attempting to parse cleaned JSON...');
            extractedData = JSON.parse(cleaned);
            console.log(`Successfully parsed cleaned JSON from ${sectionType} section`);
          }
        } catch (cleaningError) {
          console.error('Cleaned JSON parsing failed:', cleaningError);
        }
      }
      
      // Method 3: Handle special characters that might break JSON
      if (!extractedData) {
        try {
          // Replace special quotes, fix escaped quotes, etc.
          const sanitized = content
            .replace(/[\u201C\u201D]/g, '"') // Replace curly quotes
            .replace(/[\u2018\u2019]/g, "'") // Replace curly single quotes
            .replace(/\\\"/g, '"')           // Replace escaped quotes
            .replace(/```(?:json)?/g, '')    // Remove code block markers with optional language
            .replace(/```/g, '')             // Remove remaining code block markers
            .replace(/^[^{]*/, '')           // Remove everything before first {
            .replace(/[^}]*$/, '')           // Remove everything after last }
            .trim();
            
          if (sanitized.startsWith('{') && sanitized.endsWith('}')) {
            console.log('Attempting to parse sanitized JSON...');
            extractedData = JSON.parse(sanitized);
            console.log(`Successfully parsed sanitized JSON from ${sectionType} section`);
          }
        } catch (sanitizeError) {
          console.error('Sanitized JSON parsing failed:', sanitizeError);
        }
      }
      
      // Method 4: Super aggressive cleanup for markdown and other formatting
      if (!extractedData) {
        try {
          // Get any text between { and the last }
          let bracesContent = content;
          
          // If there are any ``` markers, just get content between them
          const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            bracesContent = codeBlockMatch[1].trim();
            console.log('Successfully extracted code block content for aggressive cleanup');
          } else if (content.includes('```')) {
            // Crude fallback if regex extraction fails but code blocks exist
            console.log('Code block extraction failed but code blocks exist, using manual extraction');
            const startMarker = content.indexOf('```') + 3;
            const afterStartMarker = content.substring(startMarker);
            const languageMarker = afterStartMarker.match(/^[a-z]+\s/); // Check for language marker
            
            // Adjust the starting point to account for language marker if present
            const contentStart = startMarker + (languageMarker ? languageMarker[0].length : 0);
            const endMarker = content.lastIndexOf('```');
            
            if (endMarker > contentStart) {
              bracesContent = content.substring(contentStart, endMarker).trim();
              console.log('Manually extracted content between code blocks');
            }
          }
          
          // Replace any non-JSON syntax that might cause issues
          const firstBrace = bracesContent.indexOf('{');
          const lastBrace = bracesContent.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const potentialJson = bracesContent.substring(firstBrace, lastBrace + 1);
            
            // Final cleanup pass
            const finalCleanup = potentialJson
              .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
              .replace(/,\s*]/g, ']')  // Remove trailing commas before closing brackets
              .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // Ensure property names are quoted
              
            console.log('Attempting super aggressive cleanup and parsing...');
            extractedData = JSON.parse(finalCleanup);
            console.log(`Successfully parsed after aggressive cleanup from ${sectionType} section`);
          }
        } catch (aggressiveError) {
          console.error('Aggressive cleanup JSON parsing failed:', aggressiveError);
        }
      }
      
      // If we have extracted data, ensure it has the minimum structure
      if (extractedData) {
        extractedData.contactInfo = extractedData.contactInfo || {};
        extractedData.experience = extractedData.experience || [];
        extractedData.education = extractedData.education || [];
        extractedData.skills = extractedData.skills || [];
        
        // Post-process the extracted data
        const formattedData = await postProcessResumeData(extractedData);
        
        return formattedData;
      }
      
      // If all extraction methods fail, return a minimal structure
      console.log(`All JSON parsing attempts failed for ${sectionType} section, falling back to basic extraction`);
      
      // Parse basic information from the resume text using regex
      try {
        console.log('[FALLBACK] Attempting to extract basic information using regex patterns');
        
        // Extract email using regex
        const emailMatch = sectionText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
        const email = emailMatch ? emailMatch[1] : '';
        
        // Extract phone using regex
        const phoneMatch = sectionText.match(/(\+?1?\s*\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4})/);
        const phone = phoneMatch ? phoneMatch[1] : '';
        
        // Try to extract name - look for the first line or something that looks like a name
        const lines = sectionText.split('\n').map(line => line.trim()).filter(Boolean);
        let name = lines[0] || 'Unknown';
        
        // If the first line is too long, it's probably not a name
        if (name.length > 40) {
          name = 'Unknown';
        }
        
        // Try to extract skills using common keywords
        const skillSet = new Set<string>();
        const skillKeywords = [
          'Network', 'Cisco', 'CCNA', 'CCNP', 'Routing', 'Switching', 'Firewall',
          'JavaScript', 'Python', 'Java', 'C++', 'Ruby', 'PHP', 'HTML', 'CSS', 'SQL',
          'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
          'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
          'Leadership', 'Project Management', 'Agile', 'Scrum', 'Communication',
          'Microsoft Office', 'Excel', 'Word', 'PowerPoint', 'Outlook',
          'Analytics', 'Data Analysis', 'Marketing', 'Sales', 'Customer Service',
          'Security', 'VPN', 'LAN', 'WAN', 'Wireless', 'TCP/IP'
        ];
        
        // Add any skills found in the text
        for (const skill of skillKeywords) {
          if (sectionText.includes(skill)) {
            skillSet.add(skill);
          }
        }
        
        // Try to extract certifications, training, and references using pattern matching
        const certifications = extractCertifications(sectionText);
        const training = extractTraining(sectionText);
        const references = extractReferences(sectionText);
        
        // Look for university or college names to extract education
        const educationInstitutions = [
          'University', 'College', 'Institute', 'School', 'Academy', 'Bachelor', 'Master', 'PhD'
        ];
        
        const education = [];
        
        // Find lines that might mention education
        for (const line of lines) {
          for (const edu of educationInstitutions) {
            if (line.includes(edu)) {
              education.push({
                institution: line.length > 80 ? line.substring(0, 80) + '...' : line,
                degree: '',
                field: '',
                graduationDate: ''
              });
              break;
            }
          }
          
          // Limit to 3 education entries
          if (education.length >= 3) break;
        }
        
        console.log(`[FALLBACK] Extracted basic info: Name: ${name}, Email: ${email}, Phone: ${phone}, Skills: ${skillSet.size}`);
        
        // Create the fallback data structure
        const fallbackData = {
          contactInfo: {
            fullName: name,
            email: email,
            phone: phone,
            location: '',
            linkedin: ''
          },
          summary: `Resume extracted with basic parsing from ${sectionText.length} character document.`,
          experience: [],
          education: education,
          skills: Array.from(skillSet),
          projects: [],
          certifications: certifications,
          training: training,
          references: references
        };
        
        // Log the fallback extraction results for debugging
        if (typeof process !== 'undefined') {
          try {
            // Use dynamic import for ESM compatibility
            import('fs').then(fs => {
              // Create logs directory if it doesn't exist
              if (!fs.existsSync('./logs')) {
                fs.mkdirSync('./logs', { recursive: true });
              }
              
              // Create a timestamped filename for the log
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const logFilePath = `./logs/fallback_extraction_${timestamp}.json`;
              
              // Write the structured data to the log file with nice formatting
              fs.writeFileSync(logFilePath, JSON.stringify(fallbackData, null, 2));
              console.log(`Fallback extraction results saved to ${logFilePath}`);
              
              // Also save the original text that we tried to parse
              fs.writeFileSync(`./logs/failed_parsing_text_${timestamp}.txt`, sectionText);
              console.log(`Original text that failed parsing saved to logs/failed_parsing_text_${timestamp}.txt`);
            }).catch(err => {
              console.error('Failed to import fs module:', err);
            });
          } catch (err) {
            console.error('Error writing fallback data log file:', err);
          }
        }
        
        // Post-process the fallback data
        const formattedFallbackData = await postProcessResumeData(fallbackData);
        
        return formattedFallbackData;
      } catch (fallbackError) {
        console.error('[FALLBACK] Basic extraction failed:', fallbackError);
        
        // Return a minimal structure as last resort
        return {
          contactInfo: {},
          summary: "Could not parse resume content due to processing error.",
          experience: [],
          education: [],
          skills: [],
          projects: [],
          certifications: [],
          training: [],
          references: []
        };
      }
    }
  } catch (error) {
    console.error(`Error extracting ${sectionType} section:`, error);
    
    // Return a minimal structure for this section
    return {
      contactInfo: {},
      summary: "",
      experience: [],
      education: [],
      skills: [],
      projects: []
    };
  }
}

/**
 * Parse job description text
 * @param jobDescriptionText Job description text
 * @returns Structured job description data
 */
export async function parseJobDescription(jobDescriptionText: string): Promise<ParsedJobDescription> {
  try {
    console.log(`Processing job description text (${jobDescriptionText.length} chars) in a single request`);
    
    // With Gemini 2.5 Flash, we can process even very large job descriptions in a single call
    // No need to split into sections anymore
    return await parseJobDescriptionSection(jobDescriptionText, "full");
  } catch (error) {
    console.error('Error parsing job description:', error);
    
    // Fallback to text-based extraction if the AI parsing fails
    try {
      console.log('Falling back to basic data extraction...');
      
      // Extract keywords from text
      const commonKeywords = [
        "experience", "years", "degree", "bachelor", "master", "phd", "knowledge",
        "skills", "certification", "ability", "communication", "leadership", 
        "teamwork", "team player", "detailed", "organized", "flexible", "dynamic",
        "professional", "solution", "analytical", "analysis", "results", "growth"
      ];
      
      const technicalKeywords = [
        "JavaScript", "Python", "Java", "C++", "SQL", "AWS", "Azure", "Cloud",
        "Docker", "Kubernetes", "CI/CD", "DevOps", "Frontend", "Backend", "Full-stack",
        "React", "Angular", "Vue", "Node.js", "Express", "Django", "Database",
        "Network", "Cisco", "CCNA", "Security", "Routing", "Firewall", "Engineering"
      ];
      
      // Extract potential keywords from the text
      const extractedKeywords = [...commonKeywords, ...technicalKeywords]
        .filter(keyword => jobDescriptionText.toLowerCase().includes(keyword.toLowerCase()))
        .slice(0, 20); // Limit to 20 keywords
      
      // Try to extract job title and company from the first few lines
      const lines = jobDescriptionText.split('\n').map(line => line.trim()).filter(Boolean);
      const jobTitle = lines[0] || "Unknown Position";
      const company = lines.find(line => 
        line.includes("Inc") || line.includes("LLC") || line.includes("Company") || 
        line.includes("Corp") || line.includes("Ltd") || line.includes("Limited")
      ) || "Unknown Company";
      
      return {
        jobTitle: jobTitle.length > 50 ? "Unknown Position" : jobTitle,
        company: company.length > 50 ? "Unknown Company" : company,
        location: "",
        requirements: [],
        responsibilities: [],
        qualifications: [],
        keywords: extractedKeywords,
        company_culture: []
      };
    } catch (fallbackError) {
      console.error('Even fallback extraction failed:', fallbackError);
      // Return a minimal structure in case of error
      return {
        requirements: [],
        responsibilities: [],
        qualifications: [],
        keywords: [],
        company_culture: []
      };
    }
  }
}

/**
 * Process a specific section of a job description
 * @param sectionText The text of the job description section to process
 * @param sectionType The type of section: "full", "basic", or "detailed"
 * @returns Partial or complete job description data
 */
async function parseJobDescriptionSection(
  sectionText: string, 
  sectionType: "full" | "basic" | "detailed",
  debug: boolean = false
): Promise<ParsedJobDescription> {
  try {
    // Create a focused prompt based on the section we're analyzing
    let focusInstructions = "";
    
    if (sectionType === "basic") {
      focusInstructions = "Focus on extracting job title, company name, location, and general requirements.";
    } else if (sectionType === "detailed") {
      focusInstructions = "Focus on extracting detailed responsibilities, qualifications, and important keywords.";
    }
    
    const prompt = `
      You are parsing ${sectionType === "full" ? "a complete job description" : "a section of a job description"} that has been extracted from a PDF using Google Document AI.
      Extract structured information and return ONLY a JSON object with the following structure - no explanations, no preamble, no markdown formatting:
      {
        "jobTitle": "Job title",
        "company": "Company name",
        "location": "Job location",
        "requirements": ["Requirement 1", "Requirement 2", ...],
        "responsibilities": ["Responsibility 1", "Responsibility 2", ...],
        "qualifications": ["Qualification 1", "Qualification 2", ...],
        "keywords": ["Keyword 1", "Keyword 2", ...],
        "company_culture": ["Culture point 1", "Culture point 2", ...]
      }
      
      ${focusInstructions}
      
      IMPORTANT - This document was extracted directly from a PDF using Google Document AI, which has already preserved the document structure. Look for:
      1. Section headers like REQUIREMENTS, RESPONSIBILITIES, QUALIFICATIONS, etc.
      2. Lists of requirements, responsibilities, and qualifications
      3. The job title and company name typically appear near the top
      4. Information about company culture, benefits, or work environment
      
      Include the most important ATS keywords that would be used to filter candidates.
      These should include technical skills, soft skills, experience levels, certifications, etc.
      
      Job description section:
      ${sectionText}
      
      CRITICAL FORMATTING INSTRUCTIONS:
      1. Return ONLY a raw, valid JSON object with NO explanations before or after
      2. DO NOT use any markdown code formatting (no \`\`\` markers)
      3. DO NOT use the text "json" anywhere in your response
      4. DO NOT wrap your response in code blocks
      5. DO NOT include any special markers in your response
      6. Only provide the bare JSON object starting with { and ending with }
      7. Make sure all strings are properly escaped with double quotes
      8. If you can't find certain information, provide empty arrays rather than omitting fields
      9. Extract ALL information comprehensively, including all details from each section
      
      Your entire response must be a valid JSON object that can be directly processed by JSON.parse().
      
      AGAIN: NEVER USE MARKDOWN CODE FORMATTING ANYWHERE IN YOUR RESPONSE.
      YOUR RESPONSE MUST START WITH { AND END WITH } WITH NO OTHER TEXT BEFORE OR AFTER.
    `;
    
    const systemPrompt = "You are an expert job description parser API that processes text extracted from PDFs by Google Document AI. Extract structured information from job descriptions and return ONLY valid JSON with no explanations or formatting. Your ENTIRE response must be a valid JSON object and nothing else. Do not use code blocks, do not include any text before or after the JSON. The JSON should be directly parseable by JSON.parse() without any preprocessing. NEVER FORMAT YOUR RESPONSE AS A CODE BLOCK. NEVER USE ``` MARKERS ANYWHERE. DO NOT WRAP YOUR RESPONSE WITH ```json or ``` TAGS.";
    
    // Call the AI service
    const response = await queryAI(prompt, systemPrompt);
    
    // Validate the response before processing
    if (!response || !response.choices || !response.choices.length || 
        !response.choices[0] || !response.choices[0].message || 
        !response.choices[0].message.content) {
      console.error('Invalid AI response format:', response);
      throw new Error('AI returned an invalid response format');
    }
    
    // Log the raw response for debugging
    const logPrefix = debug ? '[RESUME_PARSER_DEBUG]' : '';
    console.log(`${logPrefix} Raw ${sectionType} section response (first 100 chars):`, 
      response.choices[0].message.content.substring(0, 100) + '...');
      
    // Log additional details about the response for debugging JSON extraction issues
    const rawContent = response.choices[0].message.content;
    console.log(`${logPrefix} [DETAILS] Response length: ${rawContent.length} characters`);
    
    // Debug: Write full response to file if debug mode is enabled
    if (debug && typeof process !== 'undefined') {
      try {
        // Use dynamic import for ESM compatibility
        import('fs').then(fs => {
          fs.writeFileSync(`./${sectionType}_response.debug.json`, rawContent);
          console.log(`${logPrefix} Full AI response written to ${sectionType}_response.debug.json`);
        }).catch(err => {
          console.error(`${logPrefix} Failed to import fs module:`, err);
        });
      } catch (err) {
        console.error(`${logPrefix} Error writing debug file:`, err);
      }
    }
    
    if (rawContent.includes('```')) {
      console.log(`${logPrefix} [DETAILS] Response contains code blocks`);
      
      // Count code block markers and log their positions
      let codeBlockCount = (rawContent.match(/```/g) || []).length;
      console.log(`${logPrefix} [DETAILS] Found ${codeBlockCount} code block markers`);
      
      if (codeBlockCount % 2 === 0) {
        console.log(`${logPrefix} [DETAILS] Code block markers appear to be properly paired`);
      } else {
        console.warn(`${logPrefix} [WARNING] Odd number of code block markers - this may cause extraction issues`);
      }
      
      // Log first and last code block positions
      let firstPos = rawContent.indexOf('```');
      let lastPos = rawContent.lastIndexOf('```');
      console.log(`${logPrefix} [DETAILS] First code block marker at position ${firstPos}, last marker at position ${lastPos}`);
      
      // Try to detect if content is wrapped in a code block
      if (firstPos < 20 && lastPos > rawContent.length - 20) {
        console.log(`${logPrefix} [DETAILS] Content appears to be completely wrapped in a code block`);
      }
    }
    
    // Pre-process the content to handle markdown and other formatting issues
    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks (like ```json and ```)
    content = content.replace(/^```(\w*\n|\n)?/, '').replace(/```$/, '');
    
    // Try to parse the response directly
    try {
      console.log(`Attempting to parse ${sectionType} section AI response as JSON...`);
      
      console.log('[JSON EXTRACTION] Attempting direct JSON.parse()');
      const structuredData: ParsedJobDescription = JSON.parse(content);
      
      // Ensure we have at least the basic structure expected
      structuredData.requirements = structuredData.requirements || [];
      structuredData.responsibilities = structuredData.responsibilities || [];
      
      console.log('[JSON EXTRACTION] Direct JSON parsing successful');
      structuredData.qualifications = structuredData.qualifications || [];
      structuredData.keywords = structuredData.keywords || [];
      structuredData.company_culture = structuredData.company_culture || [];
      
      console.log(`Successfully parsed ${sectionType} section JSON response`);
      
      // Post-process the data to ensure proper formatting
      const formattedData = await postProcessResumeData(structuredData);
      
      return formattedData;
    } catch (parseError) {
      console.error(`Error parsing ${sectionType} section AI response as JSON:`, parseError);
      
      // Try extraction methods
      let extractedData: ParsedJobDescription | null = null;
      
      // Method 1: Extract JSON object between curly braces
      try {
        // Handle multi-line code blocks with ```json and ``` markers
        if (content.includes('```')) {
          // Extract content between code block markers
          const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            console.log('Found markdown code block, extracting content...');
            content = codeBlockMatch[1].trim();
          }
        }
        
        // Match for a JSON object pattern
        const jsonMatch = content.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[1];
          console.log('Found JSON-like pattern, attempting to parse...');
          extractedData = JSON.parse(extractedJson);
          console.log(`Successfully extracted and parsed JSON from ${sectionType} section response`);
        }
      } catch (extractionError) {
        console.error('JSON regex extraction failed:', extractionError);
      }
      
      // Method 2: Clean up the response and try again
      if (!extractedData) {
        try {
          // Remove common text that might appear before/after JSON
          const cleaned = content
            .replace(/^[^{]*/, '') // Remove everything before first {
            .replace(/[^}]*$/, '') // Remove everything after last }
            .trim();
            
          if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
            console.log('Attempting to parse cleaned JSON...');
            extractedData = JSON.parse(cleaned);
            console.log(`Successfully parsed cleaned JSON from ${sectionType} section`);
          }
        } catch (cleaningError) {
          console.error('Cleaned JSON parsing failed:', cleaningError);
        }
      }
      
      // Method 3: Handle special characters that might break JSON
      if (!extractedData) {
        try {
          // Replace special quotes, fix escaped quotes, etc.
          const sanitized = content
            .replace(/[\u201C\u201D]/g, '"') // Replace curly quotes
            .replace(/[\u2018\u2019]/g, "'") // Replace curly single quotes
            .replace(/\\\"/g, '"')           // Replace escaped quotes
            .replace(/```(?:json)?/g, '')    // Remove code block markers with optional language
            .replace(/```/g, '')             // Remove remaining code block markers
            .replace(/^[^{]*/, '')           // Remove everything before first {
            .replace(/[^}]*$/, '')           // Remove everything after last }
            .trim();
            
          if (sanitized.startsWith('{') && sanitized.endsWith('}')) {
            console.log('Attempting to parse sanitized JSON...');
            extractedData = JSON.parse(sanitized);
            console.log(`Successfully parsed sanitized JSON from ${sectionType} section`);
          }
        } catch (sanitizeError) {
          console.error('Sanitized JSON parsing failed:', sanitizeError);
        }
      }
      
      // Method 4: Super aggressive cleanup for markdown and other formatting
      if (!extractedData) {
        try {
          // Get any text between { and the last }
          let bracesContent = content;
          
          // If there are any ``` markers, just get content between them
          const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            bracesContent = codeBlockMatch[1].trim();
            console.log('Successfully extracted code block content for aggressive cleanup');
          } else if (content.includes('```')) {
            // Crude fallback if regex extraction fails but code blocks exist
            console.log('Code block extraction failed but code blocks exist, using manual extraction');
            const startMarker = content.indexOf('```') + 3;
            const afterStartMarker = content.substring(startMarker);
            const languageMarker = afterStartMarker.match(/^[a-z]+\s/); // Check for language marker
            
            // Adjust the starting point to account for language marker if present
            const contentStart = startMarker + (languageMarker ? languageMarker[0].length : 0);
            const endMarker = content.lastIndexOf('```');
            
            if (endMarker > contentStart) {
              bracesContent = content.substring(contentStart, endMarker).trim();
              console.log('Manually extracted content between code blocks');
            }
          }
          
          // Replace any non-JSON syntax that might cause issues
          const firstBrace = bracesContent.indexOf('{');
          const lastBrace = bracesContent.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const potentialJson = bracesContent.substring(firstBrace, lastBrace + 1);
            
            // Final cleanup pass
            const finalCleanup = potentialJson
              .replace(/,\s*}/g, '}')  // Remove trailing commas before closing braces
              .replace(/,\s*]/g, ']')  // Remove trailing commas before closing brackets
              .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // Ensure property names are quoted
              
            console.log('Attempting super aggressive cleanup and parsing...');
            extractedData = JSON.parse(finalCleanup);
            console.log(`Successfully parsed after aggressive cleanup from ${sectionType} section`);
          }
        } catch (aggressiveError) {
          console.error('Aggressive cleanup JSON parsing failed:', aggressiveError);
        }
      }
      
      // If we have extracted data, ensure it has the minimum structure
      if (extractedData) {
        extractedData.requirements = extractedData.requirements || [];
        extractedData.responsibilities = extractedData.responsibilities || [];
        extractedData.qualifications = extractedData.qualifications || [];
        extractedData.keywords = extractedData.keywords || [];
        extractedData.company_culture = extractedData.company_culture || [];
        
        return extractedData;
      }
      
      // If all extraction methods fail, return a minimal structure for this section type
      console.log(`All JSON parsing attempts failed for ${sectionType} section, falling back to basic extraction`);
      
      // Try to extract some basic information from the job description using regex
      try {
        console.log('[FALLBACK] Attempting to extract basic information from job description');
        
        // Extract lines and find potential job title
        const lines = sectionText.split('\n').map(line => line.trim()).filter(Boolean);
        let jobTitle = lines[0] || "Unknown Position";
        if (jobTitle.length > 50) {
          jobTitle = "Unknown Position";
        }
        
        // Try to find company name - look for company indicators
        let company = "Unknown Company";
        for (const line of lines.slice(0, 10)) {
          if (line.includes(" Inc") || line.includes(" LLC") || line.includes(" Ltd") || 
              line.includes(" Corporation") || line.includes(" Company") || line.includes(" Co.")) {
            company = line;
            if (company.length > 50) {
              company = company.substring(0, 50) + "...";
            }
            break;
          }
        }
        
        // Extract keywords from text
        const commonKeywords = [
          "experience", "years", "degree", "bachelor", "master", "phd", "knowledge",
          "skills", "certification", "ability", "communication", "leadership", 
          "teamwork", "team player", "detailed", "organized", "flexible", "dynamic",
          "professional", "solution", "analytical", "analysis", "results", "growth"
        ];
        
        const technicalKeywords = [
          "JavaScript", "Python", "Java", "C++", "SQL", "AWS", "Azure", "Cloud",
          "Docker", "Kubernetes", "CI/CD", "DevOps", "Frontend", "Backend", "Full-stack",
          "React", "Angular", "Vue", "Node.js", "Express", "Django", "Database",
          "Network", "Cisco", "CCNA", "Security", "Routing", "Firewall", "Engineering"
        ];
        
        // Extract potential keywords from the text
        const extractedKeywords = [...commonKeywords, ...technicalKeywords]
          .filter(keyword => sectionText.toLowerCase().includes(keyword.toLowerCase()))
          .slice(0, 20); // Limit to 20 keywords
        
        // Try to extract requirements by looking for bullet points or numbered lists
        const requirements = [];
        let inRequirementSection = false;
        for (const line of lines) {
          const lowerLine = line.toLowerCase();
          
          // Check if this is a requirements section
          if (lowerLine.includes("requirements") || lowerLine.includes("qualifications") || 
              lowerLine.includes("skills needed") || lowerLine.includes("what you need")) {
            inRequirementSection = true;
            continue;
          }
          
          // Check if we're entering a different section
          if (lowerLine.includes("responsibilities") || lowerLine.includes("what you'll do") ||
              lowerLine.includes("benefits") || lowerLine.includes("about us")) {
            inRequirementSection = false;
          }
          
          // If in requirements section and line looks like a bullet point, add it
          if (inRequirementSection && 
              (line.startsWith("•") || line.startsWith("-") || line.startsWith("*") || 
               line.match(/^\d+\./) || line.length > 20)) {
            requirements.push(line);
            
            // Limit to 10 requirements
            if (requirements.length >= 10) break;
          }
        }
        
        // Try to find responsibilities
        const responsibilities = [];
        let inResponsibilitySection = false;
        for (const line of lines) {
          const lowerLine = line.toLowerCase();
          
          // Check if this is a responsibilities section
          if (lowerLine.includes("responsibilities") || lowerLine.includes("duties") || 
              lowerLine.includes("what you'll do") || lowerLine.includes("job duties")) {
            inResponsibilitySection = true;
            continue;
          }
          
          // Check if we're entering a different section
          if (lowerLine.includes("requirements") || lowerLine.includes("qualifications") ||
              lowerLine.includes("benefits") || lowerLine.includes("about us")) {
            inResponsibilitySection = false;
          }
          
          // If in responsibilities section and line looks like a bullet point, add it
          if (inResponsibilitySection && 
              (line.startsWith("•") || line.startsWith("-") || line.startsWith("*") || 
               line.match(/^\d+\./) || line.length > 20)) {
            responsibilities.push(line);
            
            // Limit to 10 responsibilities
            if (responsibilities.length >= 10) break;
          }
        }
        
        console.log(`[FALLBACK] Extracted basic job info: Title: ${jobTitle}, Company: ${company}, Keywords: ${extractedKeywords.length}`);
        
        return {
          jobTitle: jobTitle,
          company: company,
          location: "",
          requirements: requirements.length > 0 ? requirements : ["Experience in relevant field", "Strong communication skills"],
          responsibilities: responsibilities.length > 0 ? responsibilities : ["Perform job duties as assigned"],
          qualifications: [],
          keywords: extractedKeywords,
          company_culture: []
        };
      } catch (fallbackError) {
        console.error('[FALLBACK] Job description basic extraction failed:', fallbackError);
        
        // Return a minimal structure as last resort
        return {
          jobTitle: "Position",
          company: "Company",
          location: "",
          requirements: ["Experience in relevant field"],
          responsibilities: ["Perform job duties as assigned"],
          qualifications: [],
          keywords: ["professional", "experience", "communication"],
          company_culture: []
        };
      }
    }
  } catch (error) {
    console.error(`Error extracting ${sectionType} section:`, error);
    
    // Return a minimal structure for this section
    return {
      requirements: [],
      responsibilities: [],
      qualifications: [],
      keywords: [],
      company_culture: []
    };
  }
}

/**
 * Format experience description into bullet points
 * @param description String or array of strings
 * @returns Array of bullet points
 */
function formatExperienceDescription(description: string | string[]): string[] {
  // If already an array, ensure each item is cleaned
  if (Array.isArray(description)) {
    return description
      .filter(item => item && item.trim())
      .map(item => cleanBulletPoint(item));
  }
  
  // If it's a string, convert to bullet points
  let text = description || '';
  
  // Split by common delimiters
  let bullets: string[] = [];
  
  // First, try to split by existing bullet markers
  if (text.includes('•') || text.includes('●') || text.includes('■')) {
    bullets = text.split(/[•●■]/).filter(item => item.trim());
  }
  // Try dash markers with proper spacing
  else if (text.includes(' - ') || text.includes('\n-')) {
    bullets = text.split(/(?:\n|^)\s*-\s*/).filter(item => item.trim());
  }
  // Try asterisk markers
  else if (text.includes(' * ') || text.includes('\n*')) {
    bullets = text.split(/(?:\n|^)\s*\*\s*/).filter(item => item.trim());
  }
  // Try numbered lists
  else if (/\d+\.\s/.test(text)) {
    bullets = text.split(/(?:\n|^)\s*\d+\.\s*/).filter(item => item.trim());
  }
  // Try newline splits if text has multiple lines
  else if (text.includes('\n') && text.split('\n').filter(line => line.trim()).length > 1) {
    bullets = text.split('\n').filter(line => line.trim());
  }
  // Try splitting by periods if text has multiple sentences
  else if (text.includes('. ')) {
    bullets = text.split(/\.\s+/)
      .filter(item => item.trim() && item.length > 10)
      .map(item => item.trim() + (item.endsWith('.') ? '' : '.'));
  }
  // Try splitting by "and" if it's a compound sentence
  else if (text.toLowerCase().includes(' and ') && text.length > 100) {
    bullets = text.split(/\s+and\s+/i)
      .filter(item => item.trim() && item.length > 10)
      .map(item => {
        let cleaned = item.trim();
        // Capitalize first letter if needed
        if (cleaned.length > 0 && /^[a-z]/.test(cleaned)) {
          cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
        return cleaned;
      });
  }
  // Try splitting by semicolons
  else if (text.includes(';')) {
    bullets = text.split(';')
      .filter(item => item.trim())
      .map(item => item.trim());
  }
  // Otherwise, check if it's one long paragraph that needs to be a single bullet
  else if (text.trim()) {
    bullets = [text.trim()];
  }
  
  // Clean and format each bullet point
  return bullets
    .map(bullet => cleanBulletPoint(bullet))
    .filter(bullet => bullet.length > 0); // Only remove empty bullets
}

/**
 * Clean and format a single bullet point
 * @param bullet Raw bullet point text
 * @returns Cleaned bullet point
 */
function cleanBulletPoint(bullet: string): string {
  // Remove leading/trailing whitespace
  let cleaned = bullet.trim();
  
  // Remove any remaining bullet markers at the start
  cleaned = cleaned.replace(/^[•●■\-\*]\s*/, '');
  
  // Remove line breaks within the bullet
  cleaned = cleaned.replace(/\n/g, ' ');
  
  // Ensure proper spacing
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Capitalize first letter if not already
  if (cleaned.length > 0 && /^[a-z]/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  // Ensure bullet ends with a period if it doesn't end with punctuation
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  
  return cleaned;
}

/**
 * Post-process parsed resume data to ensure proper formatting
 * @param resumeData Parsed resume data
 * @returns Formatted resume data
 */
async function postProcessResumeData(resumeData: ParsedResume): Promise<ParsedResume> {
  // Format experience descriptions
  if (resumeData.experience && Array.isArray(resumeData.experience)) {
    // Process each experience entry
    for (let i = 0; i < resumeData.experience.length; i++) {
      const exp = resumeData.experience[i];
      if (exp.description) {
        // First try basic formatting
        let formattedDescription = formatExperienceDescription(exp.description);
        
        // If we only got one bullet point, try AI formatting regardless of length
        // Also try AI if we have a string that wasn't properly converted to array
        if (formattedDescription.length === 1 || 
            (typeof exp.description === 'string' && exp.description.length > 50)) {
          try {
            const textToFormat = Array.isArray(exp.description) 
              ? formattedDescription[0] 
              : exp.description;
              
            console.log(`Converting experience description to bullet points for ${exp.title} at ${exp.company}`);
            
            formattedDescription = await formatDescriptionWithAI(
              textToFormat, 
              exp.title || 'Professional',
              exp.company || ''
            );
            
            console.log(`Successfully converted to ${formattedDescription.length} bullet points`);
          } catch (error) {
            console.error('AI formatting failed, using basic formatting:', error);
            // Keep the basic formatted version
          }
        }
        
        resumeData.experience[i].description = formattedDescription;
      }
    }
  }
  
  return resumeData;
}

/**
 * Use AI to convert a long paragraph into bullet points
 * @param description Long paragraph description
 * @param jobTitle Job title for context
 * @param company Company name for context
 * @returns Array of bullet points
 */
async function formatDescriptionWithAI(description: string, jobTitle: string, company: string): Promise<string[]> {
  try {
    const prompt = `
You are converting a job description into bullet points. The text may be one long paragraph or sentence.
Your task is to analyze it and break it down into distinct, comprehensive bullet points.

INSTRUCTIONS:
1. Identify ALL distinct tasks, responsibilities, and achievements in the text
2. Convert each one into a separate bullet point
3. Start each bullet with a strong action verb
4. If the text mentions multiple activities with "and", create separate bullets for each
5. Extract quantifiable metrics and results when present
6. Make each bullet concise but complete

Job Title: ${jobTitle}
Company: ${company}

Original Description:
${description}

CONVERSION RULES:
- If text says "responsible for X and Y and Z", create 3 separate bullets
- If text describes a process, break it into steps as separate bullets
- If text mentions tools or technologies used, include them in relevant bullets
- Include ALL information - do not summarize or skip details

Return ONLY a JSON array of strings. Each string is one bullet point.
DO NOT return a single string. MUST be an array even if original is one sentence.

Example input: "Managed team of developers and handled client communications and developed new features using React"
Example output: ["Managed team of developers to deliver projects on schedule", "Handled client communications to ensure requirement clarity", "Developed new features using React framework"]

CRITICAL: Return ONLY the JSON array. No markdown, no explanations, just the array.
`;

    const systemPrompt = "You are an expert resume writer. Convert job descriptions into concise, impactful bullet points. Return ONLY a JSON array of strings.";
    
    const response = await queryAI(prompt, systemPrompt);
    
    if (response?.choices?.[0]?.message?.content) {
      let content = response.choices[0].message.content.trim();
      
      // Remove markdown if present
      content = content.replace(/^```(\w*\n|\n)?/, '').replace(/```$/, '');
      
      try {
        const bullets = JSON.parse(content);
        if (Array.isArray(bullets) && bullets.length > 0) {
          // Clean each bullet point
          return bullets.map(bullet => cleanBulletPoint(bullet));
        }
      } catch (e) {
        console.error('Failed to parse AI response for bullet points:', e);
      }
    }
  } catch (error) {
    console.error('Error formatting with AI:', error);
  }
  
  // Fallback to original if AI fails
  return [description];
}

/**
 * Extract certifications from text using pattern matching
 * @param text Resume text to analyze
 * @returns Array of certification objects
 */
function extractCertifications(text: string): Array<{
  name?: string;
  title?: string;
  issuer?: string;
  organization?: string;
  date?: string;
  issueDate?: string;
  validUntil?: string;
  description?: string;
}> {
  try {
    const certifications = [];
    
    // Look for a certifications section with case-insensitive match
    const certSectionMatch = text.match(/##?\s*certification[s]?[\s\S]*?(?=##|$)/i);
    
    if (certSectionMatch) {
      // Extract the certifications section
      const certSection = certSectionMatch[0];
      
      // Split into lines and remove empty lines
      const lines = certSection.split('\n').map(line => line.trim()).filter(Boolean);
      
      let i = 0;
      
      // Skip section header lines
      while (i < lines.length && (lines[i].toLowerCase().includes('certification') || lines[i].includes('##'))) {
        i++;
      }
      
      // Process lines in groups of 2-4 (cert name, issuer, date, possibly valid until)
      while (i < lines.length) {
        // Start a new certification
        const certName = lines[i++];
        
        // If we've reached the end or another section header, break
        if (!certName || certName.startsWith('##')) {
          break;
        }
        
        // Initialize with default empty values
        const cert: any = {
          name: certName,
          issuer: '',
          date: '',
          validUntil: ''
        };
        
        // Try to get issuer (should be within next 1-2 lines)
        if (i < lines.length) {
          // Skip any lines that look like dates for now
          if (!isDateLine(lines[i])) {
            cert.issuer = lines[i++];
            cert.organization = cert.issuer; // Use both fields for compatibility
          }
        }
        
        // Try to get date information
        if (i < lines.length) {
          const dateLine = lines[i];
          
          // Check if this is a date or date range
          if (isDateLine(dateLine)) {
            // Handle date range (e.g., "April 2020 - Present")
            if (dateLine.includes('-')) {
              const [startDate, endDate] = dateLine.split('-').map(d => d.trim());
              cert.date = startDate;
              cert.issueDate = startDate; // Use both fields for compatibility
              cert.validUntil = endDate;
            } else {
              cert.date = dateLine;
              cert.issueDate = dateLine; // Use both fields for compatibility
            }
            i++; // Move to next line
          }
        }
        
        certifications.push(cert);
        
        // Skip any blank lines before the next cert
        while (i < lines.length && lines[i].trim() === '') {
          i++;
        }
      }
    } else {
      // If no explicit certifications section, look for certification keywords
      const certKeywords = [
        'CCNA', 'CCNP', 'CCIE', 'CompTIA', 'Network+', 'Security+', 'A+',
        'AWS', 'Azure', 'Google Cloud', 'Certified', 'Certificate',
        'PMP', 'ITIL', 'Scrum', 'CISSP', 'CISM', 'CISA', 'CEH'
      ];
      
      // Build a regex pattern for certification keywords
      const certRegex = new RegExp(`(${certKeywords.join('|')})([^\\n.]*?)(\\d{4}|Present)`, 'g');
      
      // Find all matches in the text
      const matches = text.match(certRegex) || [];
      
      // Process each match
      for (const match of matches) {
        const certMatch = match.match(/(.*?)(\d{4}|Present)/);
        if (certMatch) {
          certifications.push({
            name: certMatch[1].trim(),
            date: certMatch[2],
            issuer: '',  // We don't have context to determine the issuer
            organization: ''
          });
        }
      }
    }
    
    return certifications;
  } catch (error) {
    console.error('Error extracting certifications:', error);
    return [];
  }
}

/**
 * Extract training from text using pattern matching
 * @param text Resume text to analyze
 * @returns Array of training objects
 */
function extractTraining(text: string): Array<{
  name?: string;
  title?: string;
  provider?: string;
  institution?: string;
  date?: string;
  completionDate?: string;
  duration?: string;
  description?: string;
}> {
  try {
    const training = [];
    
    // Look for a training/courses section with case-insensitive match
    const sectionMatch = text.match(/##?\s*(training|courses|workshops|professional development)[\s\S]*?(?=##|$)/i);
    
    if (sectionMatch) {
      // Extract the training section
      const section = sectionMatch[0];
      
      // Split into lines and remove empty lines
      const lines = section.split('\n').map(line => line.trim()).filter(Boolean);
      
      let i = 0;
      
      // Skip section header lines
      while (i < lines.length && (lines[i].includes('TRAINING') || lines[i].includes('COURSES') || 
                                lines[i].includes('##'))) {
        i++;
      }
      
      // Process lines in groups (name, provider, date, etc.)
      while (i < lines.length) {
        // Start a new training item
        const name = lines[i++];
        
        // If we've reached the end or another section header, break
        if (!name || name.startsWith('##')) {
          break;
        }
        
        // Initialize with default empty values
        const train: any = {
          name: name,
          provider: '',
          date: '',
          duration: ''
        };
        
        // Try to get provider/institution (should be within next 1-2 lines)
        if (i < lines.length) {
          // Skip any lines that look like dates for now
          if (!isDateLine(lines[i])) {
            train.provider = lines[i++];
            train.institution = train.provider; // Use both fields for compatibility
          }
        }
        
        // Try to get date information
        if (i < lines.length) {
          const dateLine = lines[i];
          
          // Check if this is a date or date range
          if (isDateLine(dateLine)) {
            // Check if it contains a duration pattern (e.g., "3 months", "2 weeks")
            if (dateLine.match(/\d+\s+(day|week|month|year|hour)s?/i)) {
              train.duration = dateLine;
            } else {
              train.date = dateLine;
              train.completionDate = dateLine; // Use both fields for compatibility
            }
            i++; // Move to next line
          }
        }
        
        training.push(train);
        
        // Skip any blank lines before the next item
        while (i < lines.length && lines[i].trim() === '') {
          i++;
        }
      }
    }
    
    return training;
  } catch (error) {
    console.error('Error extracting training:', error);
    return [];
  }
}

/**
 * Extract references from text using pattern matching
 * @param text Resume text to analyze
 * @returns Array of reference objects
 */
function extractReferences(text: string): Array<{
  name?: string;
  title?: string;
  position?: string;
  company?: string;
  email?: string;
  phone?: string;
  relationship?: string;
}> {
  try {
    const references = [];
    
    // Look for a references section with case-insensitive match
    const sectionMatch = text.match(/##?\s*(references|professional references).*?(?=##|$)/i);
    
    if (sectionMatch) {
      // Extract the references section
      const section = sectionMatch[0];
      
      // Split into lines and remove empty lines
      const lines = section.split('\n').map(line => line.trim()).filter(Boolean);
      
      let i = 0;
      
      // Skip section header lines
      while (i < lines.length && (lines[i].includes('REFERENCE') || lines[i].includes('##'))) {
        i++;
      }
      
      // Process lines in groups (name, title, company, contact info)
      while (i < lines.length) {
        // Start a new reference
        const name = lines[i++];
        
        // If we've reached the end or another section header, break
        if (!name || name.startsWith('##')) {
          break;
        }
        
        // Initialize with default empty values
        const ref = {
          name: name,
          title: '',
          position: '',
          company: '',
          email: '',
          phone: '',
          relationship: ''
        };
        
        // Process the next few lines looking for title/position/company
        let linesParsed = 0;
        while (i < lines.length && linesParsed < 4) {
          const line = lines[i++];
          linesParsed++;
          
          // If we've reached another section header, break
          if (line.startsWith('##')) {
            i--; // back up one line
            break;
          }
          
          // Check for email pattern
          const emailMatch = line.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/i);
          if (emailMatch) {
            ref.email = emailMatch[0];
            continue;
          }
          
          // Check for phone pattern
          const phoneMatch = line.match(/(\+?1?\s*\(?[0-9]{3}\)?[-. ][0-9]{3}[-. ][0-9]{4})/);
          if (phoneMatch) {
            ref.phone = phoneMatch[0];
            continue;
          }
          
          // Check for relationship indicators
          if (line.toLowerCase().includes('relation') || 
              line.toLowerCase().includes('supervisor') ||
              line.toLowerCase().includes('manager') ||
              line.toLowerCase().includes('colleague')) {
            ref.relationship = line;
            continue;
          }
          
          // If we haven't matched anything specific, and title/position is empty, it's probably the title
          if (!ref.title) {
            ref.title = line;
            ref.position = line; // Use both fields for compatibility
            continue;
          }
          
          // If title is filled but company is empty, it's probably the company
          if (ref.title && !ref.company) {
            ref.company = line;
            continue;
          }
        }
        
        references.push(ref);
        
        // Skip any blank lines before the next reference
        while (i < lines.length && lines[i].trim() === '') {
          i++;
        }
      }
    }
    
    return references;
  } catch (error) {
    console.error('Error extracting references:', error);
    return [];
  }
}

/**
 * Helper function to determine if a line represents a date
 * @param line Text line to check
 * @returns True if the line appears to be a date
 */
function isDateLine(line: string): boolean {
  // Check if the line contains a year
  const hasYear = /\b(19|20)\d{2}\b/.test(line);
  
  // Check if it contains month names
  const hasMonth = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(line);
  
  // Check for present/current
  const hasPresent = /\b(Present|Current)\b/i.test(line);
  
  // Date ranges often have hyphens
  const hasRange = line.includes('-');
  
  return (hasYear || hasMonth || hasPresent) && line.length < 30;
}

/**
 * Get potential job titles based on resume data
 * @param resumeData Parsed resume data
 * @returns Array of potential job titles
 */
export async function getPotentialJobTitles(resumeData: ParsedResume, debug: boolean = false): Promise<string[]> {
  try {
    // Limit the amount of experience data to avoid token issues
    let limitedExperience = [...resumeData.experience];
    if (limitedExperience.length > 5) {
      console.log(`Limiting experience entries from ${limitedExperience.length} to 5 most recent for job title generation`);
      limitedExperience = limitedExperience.slice(0, 5);
    }
    
    // For each experience, limit the description length
    limitedExperience = limitedExperience.map(exp => {
      if (exp.description && exp.description.length > 5) {
        return {
          ...exp,
          description: exp.description.slice(0, 5) // Keep only first 5 bullet points
        };
      }
      return exp;
    });
    
    // Create a prompt for the AI to suggest job titles
    const experienceJson = JSON.stringify(limitedExperience);
    const skillsJson = JSON.stringify(resumeData.skills);
    
    const prompt = `
      Based on the following resume information, suggest 5-10 potential job titles that this person would be qualified for.
      Return ONLY a JSON array of strings with the job titles, no explanations, no preamble, no markdown formatting.
      
      Experience:
      ${experienceJson}
      
      Skills:
      ${skillsJson}
      
      Education:
      ${JSON.stringify(resumeData.education)}
      
      RESPOND ONLY WITH A VALID JSON ARRAY OF STRINGS, no explanations before or after.
      DO NOT use markdown formatting or code blocks with backticks.
      DO NOT wrap your response in code blocks or special markers.
      ONLY provide the raw JSON array.
      Example of correct response: ["Job Title 1", "Job Title 2", "Job Title 3"]
      
      CRITICAL: DO NOT FORMAT YOUR RESPONSE AS A CODE BLOCK. ONLY RETURN THE RAW JSON ARRAY.
      NEVER PUT JSON IN A CODE BLOCK.
      NEVER USE SPECIAL MARKERS ANYWHERE IN YOUR RESPONSE.
    `;
    
    const systemPrompt = "You are an expert career counselor API. Identify suitable job roles based on a person's experience, skills, and education, and return ONLY a valid JSON array of job titles with no explanations or markdown formatting. Your ENTIRE response must be a valid JSON array and nothing else. Do not use code blocks, do not include any text before or after the JSON. The JSON array should be directly parseable by JSON.parse() without any preprocessing.";
    
    // Call the AI service with a longer timeout - job title generation is not as time-sensitive
    const response = await queryAI(prompt, systemPrompt);
    
    // Validate the response
    if (!response || !response.choices || !response.choices.length || 
        !response.choices[0] || !response.choices[0].message || 
        !response.choices[0].message.content) {
      console.error('Invalid AI response format:', response);
      throw new Error('AI returned an invalid response format');
    }
    
    // Log the raw response for debugging
    const logPrefix = debug ? '[JOB_TITLES_DEBUG]' : '';
    console.log(`${logPrefix} Raw job titles response (first 100 chars):`, 
      response.choices[0].message.content.substring(0, 100) + '...');
      
    // Debug: Write full response to file if debug mode is enabled
    if (debug && typeof process !== 'undefined') {
      try {
        // Use dynamic import for ESM compatibility
        import('fs').then(fs => {
          fs.writeFileSync('./job_titles_response.debug.json', response.choices[0].message.content);
          console.log(`${logPrefix} Full AI response written to job_titles_response.debug.json`);
        }).catch(err => {
          console.error(`${logPrefix} Failed to import fs module:`, err);
        });
      } catch (err) {
        console.error(`${logPrefix} Error writing debug file:`, err);
      }
    }
    
    // Pre-process the content to handle markdown and other formatting issues
    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks (like ```json and ```)
    content = content.replace(/^```(\w*\n|\n)?/, '').replace(/```$/, '');
    
    // Parse the response to get the job titles
    try {
      console.log('Attempting to parse job titles as JSON array...');
      
      // Try to parse as JSON array directly
      try {
        const jobTitles = JSON.parse(content);
        if (Array.isArray(jobTitles) && jobTitles.length > 0) {
          console.log(`Successfully parsed ${jobTitles.length} job titles from JSON array`);
          return jobTitles;
        } else {
          throw new Error('Parsed content is not a valid array');
        }
      } catch (jsonError) {
        console.log('Could not parse job titles as JSON array, trying alternative extraction methods');
        
        // Multiple fallback methods to extract job titles
        
        // Method 1: Look for array pattern in the text
        try {
          // Handle code blocks first if present
          if (content.includes('```')) {
            console.log('[CODE BLOCKS] Attempting to extract JSON from code blocks');
            
            // Try multiple regex patterns with increasing permissiveness
            let extracted = null;
            
            // First try the most precise pattern: ```json followed by content and ending ```
            const jsonBlockMatch = content.match(/```json([^`]*?)```/i);
            if (jsonBlockMatch && jsonBlockMatch[1]) {
              console.log('[CODE BLOCKS] Found specific json code block');
              extracted = jsonBlockMatch[1].trim();
            }
            
            // If that doesn't work, try a more general pattern
            if (!extracted) {
              const generalBlockMatch = content.match(/```(?:json)?([^`]*?)```/i);
              if (generalBlockMatch && generalBlockMatch[1]) {
                console.log('[CODE BLOCKS] Found general code block');
                extracted = generalBlockMatch[1].trim();
              }
            }
            
            // If that still doesn't work, try the most permissive pattern
            if (!extracted) {
              const anyBlockMatch = content.match(/```([\s\S]*?)```/);
              if (anyBlockMatch && anyBlockMatch[1]) {
                console.log('[CODE BLOCKS] Found code block with permissive pattern');
                extracted = anyBlockMatch[1].trim();
              }
            }
            
            // If we found content, use it
            if (extracted) {
              console.log(`[CODE BLOCKS] Successfully extracted content (${extracted.length} chars)`);
              console.log(`[CODE BLOCKS] First 50 chars of extracted content: ${extracted.substring(0, 50)}...`);
              content = extracted;
            } else {
              // If all extraction methods fail but we know there are code blocks, try removing them
              console.log('[CODE BLOCKS] All extraction patterns failed, removing all code markers');
              const beforeCleanup = content;
              content = content.replace(/```(?:json)?/g, '').replace(/```/g, '');
              console.log(`[CODE BLOCKS] Removed ${(beforeCleanup.match(/```/g) || []).length} code block markers`);
            }
          }
          
          const arrayMatch = content.match(/\[([\s\S]*)\]/);
          if (arrayMatch) {
            console.log('Found array pattern, trying to parse bracketed content');
            const jobTitles = JSON.parse(`[${arrayMatch[1]}]`);
            if (Array.isArray(jobTitles) && jobTitles.length > 0) {
              console.log(`Successfully extracted ${jobTitles.length} job titles from array pattern`);
              return jobTitles;
            }
          }
        } catch (arrayError) {
          console.log('Array pattern extraction failed');
        }
        
        // Method 2: Extract lines that look like job titles
        console.log('Trying line-by-line extraction method');
        const lines = content.split(/\n/)
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0 && !line.startsWith('[') && !line.startsWith(']'))
          .map((line: string) => {
            // Remove list markers, quotes and other non-title characters
            return line.replace(/^["'\d\.\-\*]+\s*/, '').replace(/["',]+$/, '');
          })
          .filter((line: string) => line.length > 0 && !line.includes('```'));
        
        if (lines.length > 0) {
          console.log(`Extracted ${lines.length} job titles from lines`);
          return lines;
        }
        
        // Method 3: Split by commas if it looks like a comma-separated list
        if (content.includes(',')) {
          console.log('Trying comma-separated extraction method');
          const commaSeparated = content
            .replace(/^\[|\]$/g, '') // Remove surrounding brackets if present
            .replace(/```/g, '')     // Remove code block markers
            .split(',')
            .map((item: string) => item.trim().replace(/^["']+|["']+$/g, '')); // Remove quotes
          
          if (commaSeparated.length > 0 && commaSeparated[0].length > 0) {
            console.log(`Extracted ${commaSeparated.length} job titles from comma separation`);
            return commaSeparated;
          }
        }
        
        // Method 4: Super aggressive cleaning and extraction
        try {
          console.log('Attempting aggressive extraction of array-like content');
          
          // Remove everything that's not within square brackets
          const stripped = content.replace(/^[^\[]*/, '').replace(/[^\]]*$/, '');
          if (stripped.startsWith('[') && stripped.endsWith(']')) {
            // Try to fix common JSON syntax issues in arrays
            const cleaned = stripped
              .replace(/,\s*]/g, ']') // Remove trailing commas
              .replace(/,\s*,/g, ',') // Remove double commas
              .replace(/(['"])?([a-zA-Z0-9\s\-\_]+)(['"])?,/g, '"$2",') // Ensure items are quoted
              .replace(/(['"])?([a-zA-Z0-9\s\-\_]+)(['"])?]/g, '"$2"]'); // Quote last item
              
            const jobTitles = JSON.parse(cleaned);
            if (Array.isArray(jobTitles) && jobTitles.length > 0) {
              console.log(`Successfully extracted ${jobTitles.length} job titles after aggressive cleaning`);
              return jobTitles;
            }
          }
        } catch (aggressiveError) {
          console.log('Aggressive extraction failed', aggressiveError);
        }
        
        // Fallback to extraction based on resume data
        console.log('All extraction methods failed, generating job titles from resume data');
        
        // Extract job titles from experience
        const titleFromExperience = resumeData.experience
          .map(exp => exp.title)
          .filter(Boolean) as string[];
        
        // If we have experience titles, generate variations
        if (titleFromExperience.length > 0) {
          // Take the most recent title and create variations
          const recentTitle = titleFromExperience[0];
          return [
            recentTitle,
            `Senior ${recentTitle}`,
            `Lead ${recentTitle}`,
            `${recentTitle} Manager`,
            `${recentTitle} Specialist`
          ];
        }
        
        // If we have skills, create titles based on the most prominent skills
        if (resumeData.skills.length > 0) {
          const topSkills = resumeData.skills.slice(0, 3);
          const generatedTitles = [];
          
          for (const skill of topSkills) {
            generatedTitles.push(`${skill} Specialist`);
            generatedTitles.push(`${skill} Professional`);
          }
          
          if (generatedTitles.length > 0) {
            return generatedTitles;
          }
        }
        
        // Last resort: generic professional titles
        return ['Professional', 'Specialist', 'Consultant', 'Analyst', 'Manager'];
      }
    } catch (error) {
      console.error('Error processing job titles:', error);
      
      // Generate basic job titles based on skills or experience if available
      if (resumeData.skills.length > 0) {
        const skill = resumeData.skills[0];
        return [`${skill} Specialist`, `${skill} Professional`, `${skill} Consultant`];
      } else if (resumeData.experience.length > 0 && resumeData.experience[0].title) {
        const title = resumeData.experience[0].title;
        return [title, `Senior ${title}`, `Lead ${title}`];
      } else {
        return ['Professional', 'Specialist', 'Consultant', 'Analyst', 'Manager'];
      }
    }
  } catch (error) {
    console.error('Error generating potential job titles:', error);
    return ['Professional', 'Specialist', 'Consultant', 'Analyst', 'Manager'];
  }
}