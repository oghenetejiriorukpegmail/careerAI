import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';
import { generateResumeTXT, generateCoverLetterTXT } from '@/lib/documents/txt-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Create Supabase client
    const supabase = createServerClient();
    
    // Get user authentication using the more secure method
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    let userId: string | null = null;
    
    if (!authError && user) {
      userId = user.id;
    } else {
      // Check for session-based user
      const sessionUserId = request.headers.get('x-session-id');
      if (sessionUserId) {
        userId = sessionUserId;
      }
    }
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    // Use service role client to bypass RLS for document lookup
    const adminSupabase = getSupabaseAdminClient();
    
    // Get document information
    const { data: document, error: docError } = await adminSupabase
      .from('generated_documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (docError || !document) {
      console.error('Document not found:', { id, userId, error: docError });
      return NextResponse.json({ 
        error: 'Document not found', 
        details: docError?.message || 'No document found with this ID for the current user'
      }, { status: 404 });
    }
    
    // PRIORITY 1: Serve pre-generated TXT file if available (for new documents)
    // This avoids regeneration and provides faster, consistent downloads
    if (document.txt_file_path) {
      try {
        // Download the TXT file from storage
        const { data: txtFileData, error: txtFileError } = await adminSupabase.storage
          .from('user_files')
          .download(document.txt_file_path);
          
        if (!txtFileError && txtFileData) {
          const txtContent = await txtFileData.text();
          const filename = document.file_name.replace(/\.(pdf|docx)$/, '.txt');
          
          console.log('Serving pre-generated TXT file:', { 
            docType: document.doc_type, 
            filename, 
            contentLength: txtContent.length,
            filePath: document.txt_file_path
          });
          
          return new NextResponse(txtContent, {
            status: 200,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Content-Disposition': `attachment; filename="${filename}"`,
              'Content-Length': Buffer.byteLength(txtContent, 'utf8').toString(),
            },
          });
        } else {
          console.warn('TXT file not found in storage, falling back to regeneration:', {
            error: txtFileError,
            filePath: document.txt_file_path
          });
        }
      } catch (txtError) {
        console.error('Error downloading TXT file:', txtError);
        // Fall back to regeneration
      }
    } else {
      console.warn('No TXT file path in database, falling back to regeneration for document:', document.id);
    }
    
    // PRIORITY 2: Fallback to regeneration (for legacy documents without stored TXT files)
    // This maintains backward compatibility but is slower and may use different AI models
    console.log('Falling back to TXT regeneration for document:', document.id);
    
    // Download the file from storage
    const { data: fileData, error: fileError } = await adminSupabase.storage
      .from('user_files')
      .download(document.file_path);
      
    if (fileError || !fileData) {
      console.error('Error downloading file from user_files:', fileError);
      return NextResponse.json({ 
        error: 'Failed to download file',
        details: fileError?.message || 'File not found in storage'
      }, { status: 500 });
    }
    
    // For TXT generation, we'll use the original resume/job data that was used to generate the document
    // This approach is more reliable than trying to parse the generated PDF
    let documentData;
    try {
      if (document.doc_type === 'resume') {
        // For resumes, we need to get the original resume data and merge it with profile data
        // This matches the same data flow used during document generation
        const { data: resumeData, error: resumeError } = await adminSupabase
          .from('resumes')
          .select('parsed_data')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        // Also get profile data for location, work authorization, etc.
        const { data: profileData, error: profileError } = await adminSupabase
          .from('profiles')
          .select('location, work_authorization, email, full_name')
          .eq('id', userId)
          .single();
        
        if (resumeError || !resumeData) {
          console.error('Could not find resume data for user:', { userId, error: resumeError });
          // Fallback to profile data if available
          documentData = {
            fullName: profileData?.full_name || document.file_name.replace(/\.(pdf|docx)$/, '').replace(/_/g, ' '),
            contactInfo: {
              email: profileData?.email || '',
              phone: '',
              location: profileData?.location || '',
              linkedin: ''
            },
            summary: 'Professional summary not available',
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
            trainings: [],
            references: [],
            workAuthorization: profileData?.work_authorization || ''
          };
        } else {
          // For resumes, we need to regenerate using the same AI process that creates the PDF
          const parsedResumeData = typeof resumeData.parsed_data === 'string' 
            ? JSON.parse(resumeData.parsed_data) 
            : resumeData.parsed_data;
          
          // Get the job description if this resume was tailored for a specific job
          let jobData = null;
          if (document.job_description_id) {
            const { data: jobResult } = await adminSupabase
              .from('job_descriptions')
              .select('parsed_data, company_name, job_title')
              .eq('id', document.job_description_id)
              .single();
            
            if (jobResult) {
              jobData = typeof jobResult.parsed_data === 'string' 
                ? JSON.parse(jobResult.parsed_data) 
                : jobResult.parsed_data;
            }
          }
          
          console.log('Regenerating resume content using AI for TXT format...');
          
          // We need to call the AI directly since generateAtsResume returns PDF, not data
          // Let's recreate the same AI call that's used internally
          const { queryAI } = await import('@/lib/ai/config');
          
          // For resumes, use the original parsed data directly - no need to regenerate
          // This ensures we get the complete content that was originally processed
          documentData = {
            fullName: parsedResumeData.contactInfo?.fullName || profileData?.full_name || 'Unknown',
            contactInfo: {
              email: parsedResumeData.contactInfo?.email || profileData?.email || '',
              phone: parsedResumeData.contactInfo?.phone || '',
              location: parsedResumeData.contactInfo?.location || profileData?.location || '',
              linkedin: parsedResumeData.contactInfo?.linkedin || ''
            },
            summary: parsedResumeData.summary || 'Professional summary not available',
            experience: parsedResumeData.experience || [],
            education: parsedResumeData.education || [],
            skills: parsedResumeData.skills || [],
            projects: parsedResumeData.projects || [],
            certifications: parsedResumeData.certifications || [],
            trainings: parsedResumeData.training || [],
            references: parsedResumeData.references || [],
            workAuthorization: parsedResumeData.workAuthorization || profileData?.work_authorization || ''
          };
          
          console.log('Resume data structure:', {
            hasExperience: documentData.experience?.length > 0,
            experienceCount: documentData.experience?.length || 0,
            hasSkills: documentData.skills?.length > 0,
            skillsCount: documentData.skills?.length || 0,
            hasProjects: documentData.projects?.length > 0,
            projectsCount: documentData.projects?.length || 0,
            hasCertifications: documentData.certifications?.length > 0,
            certificationsCount: documentData.certifications?.length || 0,
            hasTrainings: documentData.trainings?.length > 0,
            trainingsCount: documentData.trainings?.length || 0
          });
          
          console.log('Successfully regenerated resume content for TXT format');
        }
      } else if (document.doc_type === 'cover_letter') {
        // For cover letters, we need to regenerate the content using the same data sources
        // that were used during the original generation
        
        // Get the job description this cover letter was generated for
        const { data: jobData, error: jobError } = await adminSupabase
          .from('job_descriptions')
          .select('parsed_data, company_name, job_title')
          .eq('id', document.job_description_id)
          .single();
        
        // Get the user's resume data (same as we do for resumes)
        const { data: resumeData, error: resumeError } = await adminSupabase
          .from('resumes')
          .select('parsed_data')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        // Get profile data
        const { data: profileData, error: profileError } = await adminSupabase
          .from('profiles')
          .select('location, work_authorization, email, full_name')
          .eq('id', userId)
          .single();
        
        if (jobError || !jobData || resumeError || !resumeData) {
          console.error('Could not find job or resume data for cover letter:', { 
            jobError, resumeError, jobDescriptionId: document.job_description_id 
          });
          // Fallback to basic structure
          documentData = {
            fullName: profileData?.full_name || document.file_name.replace(/\.(pdf|docx)$/, '').replace(/_/g, ' '),
            contactInfo: {
              email: profileData?.email || '',
              phone: '',
              location: profileData?.location || ''
            },
            date: new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            recipient: {
              name: 'Hiring Manager',
              company: jobData?.company_name || 'Company'
            },
            jobTitle: jobData?.job_title || 'Position',
            paragraphs: ['Thank you for considering my application for this position.'],
            closing: 'Sincerely'
          };
        } else {
          // Parse the data and regenerate the exact same cover letter content using AI
          const parsedResumeData = typeof resumeData.parsed_data === 'string' 
            ? JSON.parse(resumeData.parsed_data) 
            : resumeData.parsed_data;
          const parsedJobData = typeof jobData.parsed_data === 'string' 
            ? JSON.parse(jobData.parsed_data) 
            : jobData.parsed_data;
          
          console.log('Regenerating cover letter content using AI for TXT format...');
          
          // We need to call the AI directly since generateCoverLetter returns PDF, not data
          // Let's recreate the same AI call that's used internally
          const { queryAI } = await import('@/lib/ai/config');
          
          // Load user settings to get their preferred AI model
          let userSettings: any = {};
          try {
            const { data: settingsRow } = await adminSupabase
              .from('user_settings')
              .select('settings')
              .eq('user_id', userId)
              .single();
            
            if (settingsRow?.settings) {
              userSettings = settingsRow.settings;
              console.log('[TXT ENDPOINT] Loaded user AI settings:', userSettings);
            }
          } catch (error) {
            console.error('[TXT ENDPOINT] Error loading user settings, using defaults:', error);
          }
          
          const currentDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          const prompt = `
            I need to create a personalized cover letter for a job application.
            
            IMPORTANT: Use this exact date for the cover letter: ${currentDate}
            Here is the candidate's information:
            ${JSON.stringify(parsedResumeData, null, 2)}
            Here is the job description:
            ${JSON.stringify(parsedJobData, null, 2)}
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
              "date": "${currentDate}",
              "recipient": {
                "name": "Hiring Manager",
                "title": "",
                "company": "",
                "address": ""
              },
              "jobTitle": "",
              "paragraphs": ["paragraph1", "paragraph2", "paragraph3"],
              "closing": "Sincerely"
            }
          `;
          
          const systemPrompt = `You are an expert cover letter writer. Generate professional, compelling cover letters that highlight the candidate's actual qualifications and experiences. CRITICAL: Your response must be a valid JSON object with no markdown formatting or code blocks. Return only the JSON structure requested.`;
          
          const aiResponse = await queryAI(prompt, systemPrompt, userSettings);
          
          // Parse the AI response to get the cover letter data
          let aiContent = aiResponse.choices[0].message.content.trim();
          
          // Remove any markdown formatting
          aiContent = aiContent.replace(/^```(\w*\n|\n)?/, '').replace(/```$/, '');
          
          try {
            documentData = JSON.parse(aiContent);
            console.log('Successfully parsed AI-generated cover letter data');
          } catch (parseError) {
            console.error('Failed to parse AI cover letter response:', parseError);
            // Use fallback structure
            documentData = {
              fullName: parsedResumeData.contactInfo?.fullName || profileData?.full_name || 'Unknown',
              contactInfo: {
                email: parsedResumeData.contactInfo?.email || profileData?.email || '',
                phone: parsedResumeData.contactInfo?.phone || '',
                location: parsedResumeData.contactInfo?.location || profileData?.location || ''
              },
              date: currentDate,
              recipient: {
                name: 'Hiring Manager',
                company: parsedJobData.company || jobData.company_name || 'Company'
              },
              jobTitle: parsedJobData.jobTitle || jobData.job_title || 'Position',
              paragraphs: [
                `I am writing to express my strong interest in the ${parsedJobData.jobTitle || jobData.job_title || 'position'} role at ${parsedJobData.company || jobData.company_name || 'your company'}.`,
                `With my background in ${parsedResumeData.skills?.slice(0, 3).join(', ') || 'relevant technologies'}, I am confident I can contribute effectively to your team.`,
                `I look forward to discussing how my experience can benefit your organization.`
              ],
              closing: 'Sincerely'
            };
          }
          
          console.log('Successfully regenerated cover letter content for TXT format');
        }
      } else {
        return NextResponse.json({ error: 'Unsupported document type' }, { status: 400 });
      }
      
      console.log('Prepared document data for TXT generation:', {
        docType: document.doc_type,
        hasData: !!documentData,
        dataKeys: Object.keys(documentData || {}),
        fullName: documentData?.fullName,
        experienceCount: documentData?.experience?.length || 0,
        skillsCount: documentData?.skills?.length || 0,
        projectsCount: documentData?.projects?.length || 0,
        paragraphsCount: documentData?.paragraphs?.length || 0,
        company: documentData?.recipient?.company || 'N/A',
        jobTitle: documentData?.jobTitle || 'N/A',
        isAIGenerated: !!(documentData?.paragraphs?.length > 1 || documentData?.summary?.length > 50)
      });
    } catch (parseError) {
      console.error('Error preparing document data:', parseError);
      return NextResponse.json({ error: 'Failed to prepare document data' }, { status: 500 });
    }
    
    // Generate TXT content based on document type
    let txtContent: string;
    let filename: string;
    
    try {
      if (document.doc_type === 'resume') {
        txtContent = generateResumeTXT(documentData);
        filename = document.file_name.replace('.pdf', '.txt');
      } else if (document.doc_type === 'cover_letter') {
        txtContent = generateCoverLetterTXT(documentData);
        filename = document.file_name.replace('.pdf', '.txt');
      } else {
        return NextResponse.json({ error: 'Unsupported document type' }, { status: 400 });
      }
      
      console.log('Generated TXT content:', { 
        docType: document.doc_type, 
        filename, 
        contentLength: txtContent.length 
      });
    } catch (generationError) {
      console.error('Error generating TXT content:', generationError);
      return NextResponse.json({ 
        error: 'Failed to generate TXT content',
        details: generationError instanceof Error ? generationError.message : String(generationError)
      }, { status: 500 });
    }
    
    // Return the TXT content as a downloadable file
    const response = new NextResponse(txtContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(txtContent, 'utf8').toString(),
      },
    });
    
    return response;
    
  } catch (error) {
    console.error('Error generating TXT document:', error);
    return NextResponse.json({ 
      error: 'Failed to generate TXT document',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}