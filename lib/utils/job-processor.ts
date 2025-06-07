import { createServiceRoleClient } from '@/lib/supabase/server-client';
import { extractDocumentText } from '@/lib/documents/pdf-parser';
import { generateAtsResume, generateCoverLetter } from '@/lib/ai/document-generator';
import { ParsedJobDescription } from '@/lib/documents/document-parser';
import { queryAI } from '@/lib/ai/config';
import { loadServerSettings } from '@/lib/ai/settings-loader';
import { createServerClient } from '@/lib/supabase/server-client';
import { createOrUpdateApplication, saveGeneratedDocument } from '@/lib/utils/application-manager';
import { convertTextToBullets } from './bullet-processor';

export interface JobProcessingRecord {
  id: string;
  user_id: string;
  type: 'resume_parse' | 'cover_letter' | 'resume_generate';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input_data: any;
  result_data?: any;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  metadata?: any;
}

export class JobProcessor {
  /**
   * Create a new job processing record
   */
  static async createJob(
    userId: string,
    type: JobProcessingRecord['type'],
    inputData: any,
    metadata?: any
  ): Promise<string> {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('job_processing')
      .insert({
        user_id: userId,
        type,
        input_data: inputData,
        metadata,
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating job:', error);
      throw new Error('Failed to create processing job');
    }
    
    return data.id;
  }
  
  /**
   * Update job status
   */
  static async updateJobStatus(
    jobId: string,
    status: JobProcessingRecord['status'],
    resultData?: any,
    errorMessage?: string
  ): Promise<void> {
    const supabase = createServiceRoleClient();
    
    const updateData: any = { status };
    
    if (status === 'processing') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    if (resultData) {
      updateData.result_data = resultData;
    }
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    const { error } = await supabase
      .from('job_processing')
      .update(updateData)
      .eq('id', jobId);
    
    if (error) {
      console.error('Error updating job status:', error);
      throw new Error('Failed to update job status');
    }
  }
  
  /**
   * Create a notification for job completion
   */
  static async createNotification(
    userId: string,
    jobId: string,
    type: string,
    title: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    const supabase = createServiceRoleClient();
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        job_id: jobId,
        type,
        title,
        message,
        metadata
      });
    
    if (error) {
      console.error('Error creating notification:', error);
      // Don't throw here - notifications are non-critical
    }
  }
  
  /**
   * Parse resume text using AI
   */
  static async parseResumeText(text: string, userId?: string): Promise<{ parsedData: any; aiProvider: string; aiModel: string }> {
    // Try to load user-specific settings from database
    let settings = loadServerSettings();
    
    if (userId) {
      try {
        const supabase = createServerClient();
        const { data: settingsRow } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', userId)
          .single();
          
        if (settingsRow?.settings) {
          settings = settingsRow.settings;
          console.log(`[AI PROCESSING] Loaded user-specific settings from database`);
        } else {
          console.log(`[AI PROCESSING] No user settings found, using defaults`);
        }
      } catch (error) {
        console.error('[AI PROCESSING] Error loading user settings:', error);
      }
    }
    
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
      "experience": [{"title": "Job title", "company": "Company name", "location": "Job location", "duration": "Employment duration", "description": ["Bullet point 1", "Bullet point 2", "Bullet point 3"], "technologies": ["tech1", "tech2"]}],
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
    
    EXPERIENCE DESCRIPTION FORMATTING - CRITICAL:
    - The "description" field in experience MUST be an array of strings, NOT a single string
    - Convert paragraph descriptions into comprehensive bullet points
    - Each array element should be one complete responsibility, achievement, or task
    - Split compound sentences into separate bullets (e.g., "did X and Y" → ["Did X", "Did Y"])
    - Start each bullet with an action verb (Developed, Managed, Led, Implemented, etc.)
    - Extract ALL tasks and responsibilities - do not limit or summarize
    - Each bullet should be a complete, self-contained statement
    - DO NOT join multiple responsibilities with semicolons or "and" - use separate array elements
    - Example input: "Managed team and developed software and handled communications"
    - Example output: [
        "Managed cross-functional team of engineers",
        "Developed software solutions using modern frameworks", 
        "Handled client communications and requirements gathering"
      ]
    - NEVER return description as a single string like "Managed team; Developed software; Handled communications"
    - ALWAYS return as an array like ["Managed team", "Developed software", "Handled communications"]
    
    SKILLS EXTRACTION REQUIREMENTS:
    - The "skills" field MUST be an array of individual skill strings: ["skill1", "skill2", "skill3"]
    - Extract ALL technical skills, soft skills, and competencies mentioned
    - Break down comma-separated skill lists into individual array items
    - Break down skill categories into individual skills (e.g., "Programming: Python, Java, C++" becomes ["Python", "Java", "C++"])
    - Include tools, technologies, frameworks, languages, methodologies, certifications as skills
    - Do NOT group skills into categories or objects - use flat string array only
    
    TECHNOLOGY EXTRACTION FOR PROJECTS & EXPERIENCE:
    - For each project and experience entry, extract technologies, tools, frameworks, languages, and platforms mentioned
    - Look for technology keywords in the description like: Python, Java, React, AWS, Docker, etc.
    - Extract version numbers if mentioned (e.g., "Python 3.9" → "Python 3.9")
    - Include databases (MySQL, PostgreSQL, MongoDB), cloud services (AWS, Azure, GCP), and tools (Git, Jenkins, Kubernetes)
    - The "technologies" array should be concise - only include actual technologies, not general terms
    - Example: "Built web app using React, Node.js, and MongoDB" → technologies: ["React", "Node.js", "MongoDB"]
    
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
    
    const response = await queryAI(userPrompt, systemPrompt, settings, 'resume_parsing');
    
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
      
      // Post-process experience descriptions to ensure they are arrays
      if (structuredData.experience && Array.isArray(structuredData.experience)) {
        structuredData.experience = structuredData.experience.map((exp: any) => {
          if (exp.description && typeof exp.description === 'string') {
            console.log(`[AI PROCESSING] Converting experience description to bullet points for: ${exp.title}`);
            
            // Use the bullet processor utility for consistent formatting
            exp.description = convertTextToBullets(exp.description);
            console.log(`[AI PROCESSING] Converted to ${exp.description.length} bullet points`);
          }
          return exp;
        });
      }
      
      // Also process project descriptions
      if (structuredData.projects && Array.isArray(structuredData.projects)) {
        structuredData.projects = structuredData.projects.map((proj: any) => {
          if (proj.description && typeof proj.description === 'string' && proj.description.length > 100) {
            console.log(`[AI PROCESSING] Converting project description to bullet points for: ${proj.name}`);
            const bullets = convertTextToBullets(proj.description);
            // For projects, only convert to array if we got multiple bullets
            if (bullets.length > 1) {
              proj.description = bullets;
            }
          }
          return proj;
        });
      }
      
      // Process volunteer descriptions
      if (structuredData.volunteer && Array.isArray(structuredData.volunteer)) {
        structuredData.volunteer = structuredData.volunteer.map((vol: any) => {
          if (vol.description && typeof vol.description === 'string' && vol.description.length > 100) {
            console.log(`[AI PROCESSING] Converting volunteer description to bullet points`);
            const bullets = convertTextToBullets(vol.description);
            if (bullets.length > 1) {
              vol.description = bullets;
            }
          }
          return vol;
        });
      }
      
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
    } catch (parseError) {
      console.error('[AI PROCESSING] JSON parsing failed:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }
    
    return {
      parsedData: structuredData,
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel
    };
  }

  /**
   * Process a resume parsing job
   */
  static async processResumeParseJob(job: JobProcessingRecord): Promise<void> {
    try {
      await this.updateJobStatus(job.id, 'processing');
      
      const { content, filename, userId } = job.input_data;
      
      // Parse the resume
      const { parsedData, aiProvider, aiModel } = await this.parseResumeText(content, userId);
      
      // Save the parsed resume to the resumes table
      const supabase = createServiceRoleClient();
      
      // Generate a unique file path for this resume
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `resumes/${job.user_id}/${timestamp}_${filename || 'resume.pdf'}`;
      
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .insert({
          user_id: job.user_id,
          file_path: filePath,
          file_name: filename || 'Untitled Resume',
          file_type: job.metadata?.fileType || 'application/pdf',
          file_size: job.metadata?.fileSize || 0,
          extracted_text: job.input_data.content,
          processing_status: 'completed',
          ai_provider: aiProvider,
          ai_model: aiModel,
          parsed_data: parsedData
        })
        .select()
        .single();
      
      if (resumeError) {
        console.error('Error saving resume to database:', resumeError);
        throw new Error('Failed to save resume to database');
      }
      
      // Update job with results and resume ID
      await this.updateJobStatus(job.id, 'completed', {
        ...parsedData,
        resumeId: resumeData.id
      });
      
      // Create notification
      await this.createNotification(
        job.user_id,
        job.id,
        'job_completed',
        'Resume Parsed Successfully',
        'Your resume has been processed and is ready to view.',
        { filename, resumeId: resumeData.id }
      );
      
    } catch (error) {
      console.error('Error processing resume parse job:', error);
      
      await this.updateJobStatus(
        job.id,
        'failed',
        null,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      
      await this.createNotification(
        job.user_id,
        job.id,
        'job_failed',
        'Resume Parsing Failed',
        'There was an error processing your resume. Please try again.',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
  
  /**
   * Process a resume generation job
   */
  static async processResumeGenerateJob(job: JobProcessingRecord): Promise<void> {
    try {
      await this.updateJobStatus(job.id, 'processing');
      
      const { resumeData, jobDescription, userName, companyName, userId, jobDescriptionId, bypassTokenLimits } = job.input_data;
      
      // Generate the resume
      const { pdf, fileName } = await generateAtsResume(
        resumeData,
        jobDescription as ParsedJobDescription,
        userName,
        companyName,
        userId,
        bypassTokenLimits || false
      );
      
      // Save to storage
      const supabase = createServiceRoleClient();
      const filePath = `resumes/${userId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user_files')
        .upload(filePath, Buffer.from(pdf), {
          contentType: 'application/pdf',
          upsert: false
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Save document record
      const docId = await saveGeneratedDocument(
        userId,
        jobDescriptionId,
        'resume',
        fileName,
        filePath
      );
      
      // Create or update application
      if (jobDescriptionId) {
        await createOrUpdateApplication({
          userId,
          jobDescriptionId,
          resumeId: docId
        });
      }
      
      // Update job with results
      await this.updateJobStatus(job.id, 'completed', {
        fileName,
        filePath,
        documentId: docId,
        companyName
      });
      
      // Create notification
      await this.createNotification(
        job.user_id,
        job.id,
        'job_completed',
        'Resume Generated Successfully',
        `Your tailored resume for ${companyName} is ready to download.`,
        { fileName, companyName, documentId: docId }
      );
      
    } catch (error) {
      console.error('Error processing resume generate job:', error);
      
      await this.updateJobStatus(
        job.id,
        'failed',
        null,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      
      await this.createNotification(
        job.user_id,
        job.id,
        'job_failed',
        'Resume Generation Failed',
        'There was an error generating your resume. Please try again.',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
  
  /**
   * Process a cover letter generation job
   */
  static async processCoverLetterJob(job: JobProcessingRecord): Promise<void> {
    try {
      await this.updateJobStatus(job.id, 'processing');
      
      const { resumeData, jobDescription, userName, companyName, userId, jobDescriptionId, bypassTokenLimits } = job.input_data;
      
      // Generate the cover letter
      const { pdf, fileName } = await generateCoverLetter(
        resumeData,
        jobDescription as ParsedJobDescription,
        userName,
        companyName,
        userId,
        bypassTokenLimits || false
      );
      
      // Save to storage
      const supabase = createServiceRoleClient();
      const filePath = `cover-letters/${userId}/${fileName}`;
      
      // Convert Uint8Array to Buffer
      const pdfBuffer = Buffer.from(pdf);
      
      const { error: uploadError } = await supabase.storage
        .from('user_files')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Save document record
      const docId = await saveGeneratedDocument(
        userId,
        jobDescriptionId,
        'cover_letter',
        fileName,
        filePath
      );
      
      // Create or update application
      if (jobDescriptionId) {
        await createOrUpdateApplication({
          userId,
          jobDescriptionId,
          coverLetterId: docId
        });
      }
      
      // Update job with results
      await this.updateJobStatus(job.id, 'completed', {
        fileName,
        filePath,
        documentId: docId,
        companyName
      });
      
      // Create notification
      await this.createNotification(
        job.user_id,
        job.id,
        'job_completed',
        'Cover Letter Generated Successfully',
        `Your cover letter for ${companyName} is ready to download.`,
        { fileName, companyName, documentId: docId }
      );
      
    } catch (error) {
      console.error('Error processing cover letter job:', error);
      
      await this.updateJobStatus(
        job.id,
        'failed',
        null,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      
      await this.createNotification(
        job.user_id,
        job.id,
        'job_failed',
        'Cover Letter Generation Failed',
        'There was an error generating your cover letter. Please try again.',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
  
  /**
   * Main job processor - processes pending jobs
   */
  static async processPendingJobs(batchSize: number = 1): Promise<void> {
    const supabase = createServiceRoleClient();
    
    // Get oldest pending jobs
    const { data: jobs, error } = await supabase
      .from('job_processing')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(batchSize);
    
    if (error || !jobs || jobs.length === 0) {
      return; // No pending jobs
    }
    
    // Process jobs in parallel with concurrency limit
    const promises = jobs.map(job => this.processJob(job as JobProcessingRecord));
    await Promise.allSettled(promises);
  }
  
  /**
   * Process a specific job by ID
   */
  static async processSpecificJob(jobId: string): Promise<void> {
    const job = await this.getJobStatus(jobId);
    if (!job || job.status !== 'pending') {
      return;
    }
    
    await this.processJob(job);
  }
  
  /**
   * Process a single job
   */
  private static async processJob(job: JobProcessingRecord): Promise<void> {
    // Process based on job type
    switch (job.type) {
      case 'resume_parse':
        await this.processResumeParseJob(job);
        break;
      case 'resume_generate':
        await this.processResumeGenerateJob(job);
        break;
      case 'cover_letter':
        await this.processCoverLetterJob(job);
        break;
      default:
        console.error('Unknown job type:', job.type);
        await this.updateJobStatus(job.id, 'failed', null, 'Unknown job type');
    }
  }
  
  /**
   * Get job status
   */
  static async getJobStatus(jobId: string): Promise<JobProcessingRecord | null> {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('job_processing')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      console.error('Error getting job status:', error);
      return null;
    }
    
    return data as JobProcessingRecord;
  }
}