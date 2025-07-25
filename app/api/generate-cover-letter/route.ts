import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server-client';
import { generateCoverLetter } from '@/lib/ai/document-generator';
import { ParsedJobDescription } from '@/lib/documents/document-parser';
import { createOrUpdateApplication, saveGeneratedDocument } from '@/lib/utils/application-manager';

export async function POST(request: NextRequest) {
  try {
    // Check authentication first
    const supabaseClient = createServerClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to generate cover letters.'
      }, { status: 401 });
    }
    
    const userId = user.id;
    
    const body = await request.json();
    const { jobId, resumeId, bypassTokenLimits = false } = body;

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
    console.log('Resume data structure:', {
      hasResumeData: !!resumeData,
      hasParsedData: !!resumeData.parsed_data,
      parsedDataKeys: resumeData.parsed_data ? Object.keys(resumeData.parsed_data) : [],
      directKeys: Object.keys(resumeData)
    });

    // Generate the cover letter with user's AI settings
    const { pdf, txt, pdfFileName, txtFileName, structuredData } = await generateCoverLetter(
      parsedResumeData,
      parsedJobDescription,
      userName,
      companyName,
      user.id,
      bypassTokenLimits
    );

    let coverLetterDocumentId: string | undefined;
    let applicationResult: any;

    try {
      // Save both PDF and TXT files to storage
      const pdfFilePath = `cover-letters/${jobUserId}/${pdfFileName}`;
      const txtFilePath = txtFileName ? `cover-letters/${jobUserId}/${txtFileName}` : undefined;
      
      // Store PDF file in Supabase Storage
      const { error: pdfUploadError } = await supabase.storage
        .from('user_files')
        .upload(pdfFilePath, pdf, {
          upsert: true,
          contentType: 'application/pdf'
        });
      
      if (pdfUploadError) {
        console.error('Error uploading PDF file:', pdfUploadError);
        // Continue without failing the entire request
      }
      
      // Store TXT file in Supabase Storage if available
      if (txt && txtFilePath) {
        const { error: txtUploadError } = await supabase.storage
          .from('user_files')
          .upload(txtFilePath, txt, {
            upsert: true,
            contentType: 'text/plain'
          });
        
        if (txtUploadError) {
          console.error('Error uploading TXT file:', txtUploadError);
          // Continue without failing the entire request
        }
      }
      
      // Save the generated document metadata to database
      coverLetterDocumentId = await saveGeneratedDocument(
        jobUserId,
        jobId,
        'cover_letter',
        pdfFileName,
        pdfFilePath,
        txtFilePath
      );

      console.log('Generated document saved:', { coverLetterDocumentId, pdfFileName });

      // Automatically create or update job application
      applicationResult = await createOrUpdateApplication({
        userId: jobUserId,
        sessionId: undefined,
        jobDescriptionId: jobId,
        coverLetterId: coverLetterDocumentId,
        status: 'to_apply',
        notes: `Cover letter generated: ${pdfFileName}`
      });

      console.log('Application automatically managed:', {
        applicationId: applicationResult.application.id,
        created: applicationResult.created,
        coverLetterLinked: true
      });

    } catch (appError) {
      // Don't fail the entire request if application creation fails
      console.error('Warning: Failed to create/update application:', appError);
    }

    // Return the PDF file with application info in headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfFileName}"`,
    };

    // Add application tracking info to headers
    if (applicationResult) {
      responseHeaders['X-Application-Id'] = applicationResult.application.id;
      responseHeaders['X-Application-Created'] = applicationResult.created.toString();
    }
    if (coverLetterDocumentId) {
      responseHeaders['X-Document-Id'] = coverLetterDocumentId;
    }

    return new NextResponse(pdf, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Error generating cover letter:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover letter. Please try again.' },
      { status: 500 }
    );
  }
}