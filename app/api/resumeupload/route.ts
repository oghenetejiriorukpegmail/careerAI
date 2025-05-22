import { NextRequest, NextResponse } from 'next/server';

// Google Document AI processing function
async function processDocumentWithGoogleAI(fileBuffer: ArrayBuffer, mimeType: string) {
  try {
    // Use dynamic import to avoid webpack issues
    const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai').then(m => m.v1);
    
    // Initialize the client with credentials
    const client = new DocumentProcessorServiceClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    const projectId = process.env.GOOGLE_PROJECT_ID;
    const location = 'us'; // or your preferred location
    const processorId = process.env.GOOGLE_PROCESSOR_ID;

    // The full resource name of the processor
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // Configure the request for processing the document
    const request = {
      name,
      rawDocument: {
        content: Buffer.from(fileBuffer).toString('base64'),
        mimeType,
      },
    };

    // Process the document
    const [result] = await client.processDocument(request);
    const { document } = result;

    if (!document || !document.text) {
      throw new Error('No text extracted from document');
    }

    return document.text;
  } catch (error) {
    console.error('Google Document AI error:', error);
    throw new Error(`Document AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Skills normalization function to ensure proper itemization
function normalizeSkills(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  // Create a copy to avoid mutating the original
  const normalized = { ...data };
  
  if (normalized.skills) {
    let skills: string[] = [];
    
    // Handle different skills formats
    if (Array.isArray(normalized.skills)) {
      // Process each skill item
      normalized.skills.forEach((skill: any) => {
        if (typeof skill === 'string') {
          // Split comma-separated skills
          const splitSkills = skill.split(/[,;]/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
          skills.push(...splitSkills);
        } else if (skill && typeof skill === 'object') {
          // Handle nested skill objects (flatten them)
          if (skill.name) skills.push(skill.name);
          if (skill.category && skill.items && Array.isArray(skill.items)) {
            skills.push(...skill.items);
          }
          // Handle other object formats by extracting string values
          Object.values(skill).forEach((value: any) => {
            if (typeof value === 'string') {
              const splitSkills = value.split(/[,;]/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
              skills.push(...splitSkills);
            }
          });
        }
      });
    } else if (typeof normalized.skills === 'string') {
      // Handle skills as a single string
      skills = normalized.skills.split(/[,;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    
    // Remove duplicates and clean up
    const uniqueSkills = [...new Set(skills)]
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0 && skill.length < 100) // Reasonable length filter
      .slice(0, 100); // Limit to prevent excessive skills
    
    normalized.skills = uniqueSkills;
    
    console.log(`[SKILLS NORMALIZATION] Processed ${skills.length} raw skills into ${uniqueSkills.length} normalized skills`);
  }
  
  return normalized;
}

// AI-powered resume parsing function
async function parseResumeText(text: string) {
  try {
    // Import AI configuration functions
    const { queryAI } = await import('@/lib/ai/config');
    const { loadServerSettings } = await import('@/lib/ai/settings-loader');
    
    // Load current AI settings
    const settings = loadServerSettings();
    
    console.log(`[AI PROCESSING] Starting resume parsing with provider: ${settings.aiProvider}, model: ${settings.aiModel}`);
    console.log(`[AI PROCESSING] Text length: ${text.length} characters`);
    console.log(`[AI PROCESSING] Enable logging: ${settings.enableLogging}`);
    
    // Define the system prompt for resume parsing
    const systemPrompt = `You are a resume parsing expert. Extract ALL structured information from the resume text and return it as JSON with these fields:
    {
      "name": "Full name",
      "email": "Email address", 
      "phone": "Phone number",
      "address": "Complete address if available",
      "linkedin": "LinkedIn profile URL if available",
      "website": "Personal website/portfolio URL if available",
      "summary": "Professional summary/objective",
      "experience": [{"title": "Job title", "company": "Company name", "location": "Job location", "duration": "Employment duration", "description": "Job description"}],
      "education": [{"degree": "Degree", "school": "Institution", "location": "School location", "year": "Graduation year", "gpa": "GPA if mentioned"}],
      "skills": ["skill1", "skill2"],
      "certifications": [{"name": "Certification name", "issuer": "Issuing organization", "date": "Date obtained", "expiry": "Expiry date if applicable", "credential_id": "Credential ID if available"}],
      "licenses": [{"name": "License name", "issuer": "Issuing authority", "date": "Date obtained", "expiry": "Expiry date", "license_number": "License number if available"}],
      "training": [{"name": "Training/Course name", "provider": "Training provider", "date": "Date completed", "duration": "Duration if mentioned"}],
      "projects": [{"name": "Project name", "description": "Project description", "technologies": ["tech1", "tech2"], "date": "Project date/duration", "url": "Project URL if available"}],
      "awards": [{"name": "Award name", "issuer": "Issuing organization", "date": "Date received", "description": "Award description"}],
      "publications": [{"title": "Publication title", "journal": "Journal/Conference name", "date": "Publication date", "url": "Publication URL if available"}],
      "languages": [{"language": "Language name", "proficiency": "Proficiency level"}],
      "references": [{"name": "Reference name", "title": "Reference title", "company": "Reference company", "phone": "Reference phone", "email": "Reference email"}],
      "volunteer": [{"organization": "Organization name", "role": "Volunteer role", "duration": "Duration", "description": "Volunteer description"}],
      "hobbies": ["hobby1", "hobby2"],
      "additional_sections": [{"section_title": "Section name", "content": "Section content"}]
    }
    
    Instructions:
    - Extract ALL information present in the resume, don't skip any sections
    - If a field is not present, omit it from the JSON (don't include empty arrays or null values)
    - For dates, preserve the original format from the resume
    - For arrays, only include them if there are actual items to add
    - Be thorough and capture every piece of information
    - If there are custom sections not covered above, put them in "additional_sections"
    
    SKILLS EXTRACTION REQUIREMENTS:
    - The "skills" field MUST be an array of individual skill strings: ["skill1", "skill2", "skill3"]
    - Extract ALL technical skills, soft skills, and competencies mentioned
    - Break down comma-separated skill lists into individual array items
    - Break down skill categories into individual skills (e.g., "Programming: Python, Java, C++" becomes ["Python", "Java", "C++"])
    - Include tools, technologies, frameworks, languages, methodologies, certifications as skills
    - Do NOT group skills into categories or objects - use flat string array only
    - Examples of proper skills formatting:
      * "Python, Java, JavaScript" → ["Python", "Java", "JavaScript"]
      * "Network Administration, Cisco, BGP, OSPF" → ["Network Administration", "Cisco", "BGP", "OSPF"]
      * "Project Management, Agile, Scrum, Leadership" → ["Project Management", "Agile", "Scrum", "Leadership"]
    
    CRITICAL JSON FORMATTING REQUIREMENTS:
    - Return ONLY valid JSON. No markdown code blocks, no explanatory text before or after.
    - Start directly with { and end with }
    - Ensure ALL strings are properly escaped and terminated with closing quotes
    - Ensure ALL objects and arrays are properly closed with } and ]
    - Double-check that the final character is } to complete the JSON object
    - NO trailing commas, NO incomplete strings, NO unterminated objects`;

    const userPrompt = `Parse this resume text:\n\n${text}`;
    
    // Use the configured AI provider and model from settings
    console.log(`[AI PROCESSING] Sending request to ${settings.aiProvider} with model ${settings.aiModel}`);
    const startTime = Date.now();
    
    const response = await queryAI(userPrompt, systemPrompt);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`[AI PROCESSING] Response received in ${processingTime}ms`);
    console.log(`[AI PROCESSING] Provider: ${settings.aiProvider}, Model: ${settings.aiModel}`);
    
    const parsedContent = response.choices[0]?.message?.content;
    
    if (!parsedContent) {
      console.error('[AI PROCESSING] No content received from AI');
      throw new Error('No parsed content received from AI');
    }

    console.log(`[AI PROCESSING] Response length: ${parsedContent.length} characters`);
    if (settings.enableLogging) {
      console.log(`[AI PROCESSING] Raw response preview: ${parsedContent.substring(0, 500)}...`);
    }

    // Parse the JSON response with enhanced error handling
    let structuredData;
    try {
      // First, try parsing as-is
      structuredData = JSON.parse(parsedContent);
      console.log(`[AI PROCESSING] Successfully parsed JSON response`);
      
      if (settings.enableLogging) {
        console.log(`[AI PROCESSING] Extracted data preview:`, {
          name: structuredData.name || 'N/A',
          email: structuredData.email || 'N/A',
          phone: structuredData.phone || 'N/A',
          experienceCount: structuredData.experience?.length || 0,
          educationCount: structuredData.education?.length || 0,
          skillsCount: structuredData.skills?.length || 0
        });
      }
      
      // Post-process skills to ensure proper itemization
      structuredData = normalizeSkills(structuredData);
    } catch (parseError) {
      console.error('[AI PROCESSING] Initial JSON parsing failed:', parseError);
      console.log('[AI PROCESSING] Attempting to fix malformed JSON...');
      
      // Advanced JSON repair function
      function repairJSON(jsonString: string): string {
        let fixed = jsonString.trim();
        
        // Step 1: Handle truncated strings by finding incomplete string patterns
        // Look for unterminated string literals (quotes without proper closing)
        const lastQuoteIndex = fixed.lastIndexOf('"');
        if (lastQuoteIndex > 0) {
          // Check if this quote is properly closed
          const afterQuote = fixed.substring(lastQuoteIndex + 1);
          const nextQuote = afterQuote.indexOf('"');
          const nextDelimiter = afterQuote.search(/[,\]\}]/);
          
          // If no closing quote or delimiter is malformed, truncate at previous complete structure
          if (nextQuote === -1 || (nextDelimiter !== -1 && nextDelimiter < nextQuote)) {
            // Find the previous complete structure
            let truncateAt = lastQuoteIndex;
            
            // Look backwards for the previous complete field
            for (let i = lastQuoteIndex - 1; i >= 0; i--) {
              if (fixed[i] === ',' || fixed[i] === '[' || fixed[i] === '{') {
                truncateAt = i;
                break;
              }
            }
            
            fixed = fixed.substring(0, truncateAt);
            console.log(`[AI PROCESSING] Truncated at unterminated string position ${truncateAt}`);
          }
        }
        
        // Step 2: Find the last complete object/array structure
        let lastCompletePos = -1;
        let braceDepth = 0;
        let bracketDepth = 0;
        let inString = false;
        let escaped = false;
        
        for (let i = 0; i < fixed.length; i++) {
          const char = fixed[i];
          
          if (escaped) {
            escaped = false;
            continue;
          }
          
          if (char === '\\' && inString) {
            escaped = true;
            continue;
          }
          
          if (char === '"' && !escaped) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') braceDepth++;
            if (char === '}') braceDepth--;
            if (char === '[') bracketDepth++;
            if (char === ']') bracketDepth--;
            
            // If we're at a balanced state, this could be a good truncation point
            if (braceDepth === 0 && bracketDepth === 0 && (char === '}' || char === ']')) {
              lastCompletePos = i;
            }
          }
        }
        
        if (lastCompletePos > 0) {
          fixed = fixed.substring(0, lastCompletePos + 1);
          console.log(`[AI PROCESSING] Truncated to last balanced structure at position ${lastCompletePos}`);
        }
        
        // Step 3: Balance any remaining unmatched brackets/braces
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        
        const missingBraces = openBraces - closeBraces;
        const missingBrackets = openBrackets - closeBrackets;
        
        if (missingBraces > 0) {
          fixed += '}'.repeat(missingBraces);
          console.log(`[AI PROCESSING] Added ${missingBraces} missing closing braces`);
        }
        
        if (missingBrackets > 0) {
          fixed += ']'.repeat(missingBrackets);
          console.log(`[AI PROCESSING] Added ${missingBrackets} missing closing brackets`);
        }
        
        return fixed;
      }
      
      const fixedContent = repairJSON(parsedContent);
      
      try {
        structuredData = JSON.parse(fixedContent);
        console.log(`[AI PROCESSING] Successfully parsed fixed JSON response`);
        
        if (settings.enableLogging) {
          console.log(`[AI PROCESSING] Extracted data preview:`, {
            name: structuredData.name || 'N/A',
            email: structuredData.email || 'N/A',
            phone: structuredData.phone || 'N/A',
            experienceCount: structuredData.experience?.length || 0,
            educationCount: structuredData.education?.length || 0,
            skillsCount: structuredData.skills?.length || 0
          });
        }
        
        // Post-process skills to ensure proper itemization
        structuredData = normalizeSkills(structuredData);
      } catch (secondParseError) {
        console.error('[AI PROCESSING] JSON fixing failed:', secondParseError);
        console.error('[AI PROCESSING] Original content length:', parsedContent.length);
        console.error('[AI PROCESSING] Fixed content length:', fixedContent.length);
        console.error('[AI PROCESSING] Raw content causing parse error (first 1000 chars):', parsedContent.substring(0, 1000));
        console.error('[AI PROCESSING] Raw content causing parse error (last 1000 chars):', parsedContent.substring(Math.max(0, parsedContent.length - 1000)));
        
        // Return a basic structure with extracted text as fallback
        structuredData = {
          name: "Parse Error - Check Logs",
          summary: "AI response was malformed. Raw text extraction successful but structured parsing failed.",
          parse_error: true,
          error_details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
          raw_content_length: parsedContent.length
        };
        
        console.log(`[AI PROCESSING] Using fallback structure due to parsing failure`);
      }
    }

    return structuredData;
  } catch (error) {
    console.error('[AI PROCESSING] Error parsing resume with AI:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file) {
      return NextResponse.json({
        error: 'No file provided'
      }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Basic file validation
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Please upload a PDF or DOCX file.'
      }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        error: 'File size must be less than 10MB'
      }, { status: 400 });
    }

    console.log(`[DOCUMENT PROCESSING] Processing resume: ${file.name} (${file.size} bytes)`);

    // Load AI settings for later use
    const { loadServerSettings } = await import('@/lib/ai/settings-loader');
    const settings = loadServerSettings();

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();

    // Step 1: Extract text using Google Document AI
    console.log('[GOOGLE DOCUMENT AI] Starting text extraction...');
    const documentAiStartTime = Date.now();
    
    const extractedText = await processDocumentWithGoogleAI(fileBuffer, file.type);
    
    const documentAiEndTime = Date.now();
    const documentAiProcessingTime = documentAiEndTime - documentAiStartTime;
    
    if (!extractedText || extractedText.trim().length === 0) {
      console.error('[GOOGLE DOCUMENT AI] No text extracted from document');
      return NextResponse.json({
        error: 'No text could be extracted from the document'
      }, { status: 400 });
    }

    console.log(`[GOOGLE DOCUMENT AI] Text extraction completed in ${documentAiProcessingTime}ms`);
    console.log(`[GOOGLE DOCUMENT AI] Extracted ${extractedText.length} characters of text`);
    console.log(`[GOOGLE DOCUMENT AI] Text preview: ${extractedText.substring(0, 200)}...`);

    // Step 2: Parse the extracted text using AI
    console.log('[AI PARSING] Starting resume structure parsing...');
    const aiParsingStartTime = Date.now();
    
    const structuredData = await parseResumeText(extractedText);
    
    const aiParsingEndTime = Date.now();
    const aiParsingTime = aiParsingEndTime - aiParsingStartTime;
    const totalProcessingTime = aiParsingEndTime - documentAiStartTime;

    console.log(`[AI PARSING] Resume parsing completed in ${aiParsingTime}ms`);
    console.log(`[DOCUMENT PROCESSING] Total processing time: ${totalProcessingTime}ms (Document AI: ${documentAiProcessingTime}ms + AI Parsing: ${aiParsingTime}ms)`);
    console.log('[DOCUMENT PROCESSING] Resume processed successfully');

    // Step 3: Save to database
    console.log('[DATABASE] Saving resume to database...');
    try {
      const { getSupabaseAdminClient } = await import('@/lib/supabase/client');
      const supabaseAdmin = getSupabaseAdminClient();
      
      if (!supabaseAdmin) {
        console.error('[DATABASE] Admin client not available');
        throw new Error('Database connection not available');
      }

      // Create a placeholder file path since we're not storing the actual file
      const filePath = `processed_resumes/${userId}/${Date.now()}_${file.name}`;

      // Try to insert with all columns first (assuming updated schema)
      let resumeData, dbError;
      
      try {
        const fullInsertData = {
          user_id: userId,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          extracted_text: extractedText,
          processing_status: 'completed',
          ai_provider: settings.aiProvider,
          ai_model: settings.aiModel,
          parsed_data: structuredData
        };

        const result = await supabaseAdmin
          .from('resumes')
          .insert(fullInsertData)
          .select()
          .single();
          
        resumeData = result.data;
        dbError = result.error;
      } catch (fullSchemaError) {
        console.log('[DATABASE] Full schema insert failed, trying basic schema');
        
        // Fallback to basic schema (original table structure)
        try {
          const basicInsertData = {
            user_id: userId,
            file_path: filePath,
            file_name: file.name,
            file_type: file.type,
            parsed_data: structuredData
          };

          const result = await supabaseAdmin
            .from('resumes')
            .insert(basicInsertData)
            .select()
            .single();
            
          resumeData = result.data;
          dbError = result.error;
          
          console.log('[DATABASE] Basic schema insert successful - run schema updates from DATABASE_SCHEMA_UPDATE.md for full features');
        } catch (basicSchemaError) {
          console.error('[DATABASE] Both full and basic schema inserts failed:', basicSchemaError);
          throw basicSchemaError;
        }
      }

      if (dbError) {
        console.error('[DATABASE] Error saving resume:', dbError);
        throw new Error(`Database save failed: ${dbError.message}`);
      }

      console.log(`[DATABASE] Resume saved successfully with ID: ${resumeData.id}`);

      return NextResponse.json({
        success: true,
        message: 'Resume processed and saved successfully',
        uploadSuccess: true,
        parseSuccess: true,
        aiSuccess: true,
        dbSuccess: true,
        resumeId: resumeData.id,
        filename: file.name,
        size: file.size,
        type: file.type,
        extractedText: extractedText.substring(0, 1000) + (extractedText.length > 1000 ? '...' : ''), // Return first 1000 chars
        structuredData
      });

    } catch (dbError) {
      console.error('[DATABASE] Failed to save resume to database:', dbError);
      
      // Return success for processing but indicate database issue
      return NextResponse.json({
        success: true,
        message: 'Resume processed successfully but not saved to database',
        warning: 'Database save failed - resume data was processed but not stored',
        uploadSuccess: true,
        parseSuccess: true,
        aiSuccess: true,
        dbSuccess: false,
        filename: file.name,
        size: file.size,
        type: file.type,
        extractedText: extractedText.substring(0, 1000) + (extractedText.length > 1000 ? '...' : ''),
        structuredData
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Error processing resume:', error);
    return NextResponse.json({
      error: `Failed to process resume: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}