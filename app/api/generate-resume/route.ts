import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server-client';
import { generateAtsResumeWithFormat } from '@/lib/ai/document-generator';
import { ParsedJobDescription } from '@/lib/documents/document-parser';
import { createOrUpdateApplication, saveGeneratedDocument } from '@/lib/utils/application-manager';
import { rateLimitPresets } from '@/lib/middleware/rate-limit';
import { generateResumeSchema, safeValidateInput } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitPresets.aiGeneration(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Check authentication first
    const supabaseClient = createServerClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to generate resumes.'
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    const body = await request.json();
    const { jobId, resumeId, bypassTokenLimits = false, format = 'pdf' } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // First, get the job to see what user_id it has
    console.log('Fetching job data for:', { jobId, userId });
    
    const { data: jobData, error: jobError } = await supabase
      .from('job_descriptions')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      console.error('Error fetching job data:', { jobError, jobId });
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    console.log('Job found with user_id:', jobData.user_id);
    
    // Check if the current user has access to this job
    if (jobData.user_id !== userId) {
      console.error('User does not have access to this job:', { jobUserId: jobData.user_id, userId });
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get user's resume data and profile using the same user_id as the job
    const jobUserId = jobData.user_id;
    console.log('Fetching resume and profile data for user:', jobUserId);
    
    // Build resume query based on whether resumeId is provided
    let resumeQuery = supabase
      .from('resumes')
      .select('*')
      .eq('user_id', jobUserId);
    
    if (resumeId) {
      // Use the specific resume ID provided
      resumeQuery = resumeQuery.eq('id', resumeId).single();
    } else {
      // Fall back to the most recent resume
      resumeQuery = resumeQuery.order('created_at', { ascending: false }).limit(1).single();
    }
    
    // Fetch both resume and profile data
    const [resumeResult, profileResult] = await Promise.all([
      resumeQuery,
      supabase
        .from('profiles')
        .select('full_name, email, location, city, state, country, work_authorization')
        .eq('id', jobUserId)
        .single()
    ]);

    const { data: resumeData, error: resumeError } = resumeResult;
    const { data: profileData, error: profileError } = profileResult;

    if (resumeError || !resumeData) {
      console.error('Error fetching resume data:', { resumeError, jobUserId });
      return NextResponse.json({ error: 'Resume not found. Please upload a resume first.' }, { status: 404 });
    }

    // Profile data is optional - we'll continue even if it's not found
    if (profileError) {
      console.warn('Could not fetch profile data:', { profileError, jobUserId });
    }

    // Parse the job description data - check if we have parsed_data
    const jobParsedData = jobData.parsed_data || {};
    const parsedJobDescription: ParsedJobDescription = {
      jobTitle: jobData.job_title || jobParsedData.jobTitle || '',
      company: jobData.company_name || jobParsedData.company || '',
      location: jobData.location || jobParsedData.location || '',
      requirements: jobParsedData.requirements || jobData.requirements || [],
      responsibilities: jobParsedData.responsibilities || jobData.responsibilities || [],
      qualifications: jobParsedData.qualifications || jobData.qualifications || [],
      keywords: jobParsedData.keywords || jobData.keywords || [],
      company_culture: jobParsedData.company_culture || jobData.company_culture || [],
    };
    
    console.log('Job description data:', {
      hasJobData: !!jobData,
      hasParsedData: !!jobData.parsed_data,
      parsedDataKeys: jobData.parsed_data ? Object.keys(jobData.parsed_data) : [],
      directKeys: Object.keys(jobData),
      finalJobTitle: parsedJobDescription.jobTitle
    });

    // Extract user's name - prioritize profile data, then resume data
    const userName = profileData?.full_name ||
                    resumeData.full_name || 
                    resumeData.personal_info?.name || 
                    resumeData.personal_info?.full_name ||
                    resumeData.name ||
                    resumeData.contact_info?.name ||
                    (resumeData.personal_info?.first_name && resumeData.personal_info?.last_name ? 
                      `${resumeData.personal_info.first_name} ${resumeData.personal_info.last_name}` : null) ||
                    'Applicant';
                    
    console.log('Extracted user name:', { profileName: profileData?.full_name, resumeName: resumeData.full_name, finalName: userName });
    const companyName = jobData.company_name || 'Company';
    
    // Extract the actual parsed resume data from the database
    const parsedResumeData = resumeData.parsed_data || resumeData;
    
    // Ensure contactInfo exists - handle both possible structures
    if (!parsedResumeData.contactInfo) {
      // If the resume uses individual fields instead of contactInfo object
      if (parsedResumeData.email || parsedResumeData.phone || parsedResumeData.linkedin) {
        parsedResumeData.contactInfo = {
          email: parsedResumeData.email || '',
          phone: parsedResumeData.phone || '',
          linkedin: parsedResumeData.linkedin || '',
          location: parsedResumeData.location || ''
        };
      } else {
        parsedResumeData.contactInfo = {};
      }
    }
    
    // Merge profile data (location and work authorization) into the resume data
    if (profileData) {
      console.log('Profile data loaded:', {
        hasCity: !!profileData.city,
        hasState: !!profileData.state,
        hasCountry: !!profileData.country,
        hasLocation: !!profileData.location,
        hasWorkAuth: !!profileData.work_authorization,
        workAuthValue: profileData.work_authorization
      });
      
      // Update contact info with profile location if available
      if (parsedResumeData.contactInfo) {
        console.log('Original resume location:', parsedResumeData.contactInfo.location);
        
        // Construct location from city, state, country if available
        if (profileData.city || profileData.state || profileData.country) {
          const locationParts = [];
          if (profileData.city) locationParts.push(profileData.city);
          if (profileData.state) locationParts.push(profileData.state);
          if (profileData.country) locationParts.push(profileData.country);
          const newLocation = locationParts.join(', ');
          console.log('Setting location from profile fields:', newLocation);
          parsedResumeData.contactInfo.location = newLocation;
        } else if (profileData.location) {
          // Fallback to old location field if new fields aren't populated
          console.log('Setting location from profile.location:', profileData.location);
          parsedResumeData.contactInfo.location = profileData.location;
        } else {
          // If no location data in profile, remove it to avoid showing incorrect data
          console.log('No profile location data, removing location');
          delete parsedResumeData.contactInfo.location;
        }
        
        console.log('Final location after profile merge:', parsedResumeData.contactInfo.location);
      }
      
      // Add work authorization to the parsed resume data
      if (profileData.work_authorization) {
        parsedResumeData.workAuthorization = profileData.work_authorization;
        console.log('Added work authorization to resume data:', parsedResumeData.workAuthorization);
      }
    }
    
    // Also ensure the individual fields are updated if they exist
    if (parsedResumeData.email !== undefined && profileData.email) {
      parsedResumeData.email = profileData.email;
    }
    if (parsedResumeData.phone !== undefined && profileData.phone) {
      parsedResumeData.phone = profileData.phone;
    }
    
    console.log('Resume data structure:', {
      hasResumeData: !!resumeData,
      hasParsedData: !!resumeData.parsed_data,
      parsedDataKeys: resumeData.parsed_data ? Object.keys(resumeData.parsed_data) : [],
      directKeys: Object.keys(resumeData),
      hasWorkAuth: !!parsedResumeData.workAuthorization,
      workAuthValue: parsedResumeData.workAuthorization,
      profileLocation: profileData?.location,
      finalLocation: parsedResumeData.contactInfo?.location
    });

    // Generate the ATS-optimized resume with user's AI settings
    const { document, fileName, contentType } = await generateAtsResumeWithFormat(
      parsedResumeData,
      parsedJobDescription,
      userName,
      companyName,
      format as 'pdf' | 'docx',
      session.user.id,
      bypassTokenLimits
    );

    let resumeDocumentId: string | undefined;
    let applicationResult: any;

    try {
      // Save the generated document to database (optional - for future file storage)
      // Currently we're not storing the actual PDF file, just metadata
      const filePath = `resumes/${jobUserId}/${fileName}`;
      
      resumeDocumentId = await saveGeneratedDocument(
        jobUserId,
        jobId,
        'resume',
        fileName,
        filePath
      );

      console.log('Generated document saved:', { resumeDocumentId, fileName });

      // Automatically create or update job application
      applicationResult = await createOrUpdateApplication({
        userId: jobUserId,
        sessionId: undefined,
        jobDescriptionId: jobId,
        resumeId: resumeDocumentId,
        status: 'to_apply',
        notes: `Resume generated: ${fileName}`
      });

      console.log('Application automatically managed:', {
        applicationId: applicationResult.application.id,
        created: applicationResult.created,
        resumeLinked: true
      });

    } catch (appError) {
      // Don't fail the entire request if application creation fails
      console.error('Warning: Failed to create/update application:', appError);
    }

    // Return the document file with application info in headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    };

    // Add application tracking info to headers
    if (applicationResult) {
      responseHeaders['X-Application-Id'] = applicationResult.application.id;
      responseHeaders['X-Application-Created'] = applicationResult.created.toString();
    }
    if (resumeDocumentId) {
      responseHeaders['X-Document-Id'] = resumeDocumentId;
    }

    return new NextResponse(document, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Error generating resume:', error);
    return NextResponse.json(
      { error: 'Failed to generate resume. Please try again.' },
      { status: 500 }
    );
  }
}