import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server-client';
import { generateAtsResume } from '@/lib/ai/document-generator';
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
    const { jobId } = body;

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
    
    // Fetch both resume and profile data
    const [resumeResult, profileResult] = await Promise.all([
      supabase
        .from('resumes')
        .select('*')
        .eq('user_id', jobUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('profiles')
        .select('full_name, email')
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

    // Parse the job description data
    const parsedJobDescription: ParsedJobDescription = {
      jobTitle: jobData.job_title || '',
      company: jobData.company_name || '',
      location: jobData.location || '',
      requirements: jobData.requirements || [],
      responsibilities: jobData.responsibilities || [],
      qualifications: jobData.qualifications || [],
      keywords: jobData.keywords || [],
      company_culture: jobData.company_culture || [],
    };

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

    // Generate the ATS-optimized resume with user's AI settings
    const { pdf, fileName } = await generateAtsResume(
      resumeData,
      parsedJobDescription,
      userName,
      companyName,
      session.user.id
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

    // Return the PDF file with application info in headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/pdf',
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

    return new NextResponse(pdf, {
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