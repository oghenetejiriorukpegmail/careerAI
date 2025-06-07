import { NextRequest, NextResponse } from 'next/server';
import { JobProcessor } from '@/lib/utils/job-processor';
import { processJobInline } from '@/lib/utils/inline-job-processor';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';
import { rateLimitPresets } from '@/lib/middleware/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitPresets.aiGeneration(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Check authentication
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
    const { jobId, resumeId, bypassTokenLimits = false } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Fetch job data
    const { data: jobData, error: jobError } = await supabase
      .from('job_descriptions')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      console.error('Error fetching job data:', jobError);
      return NextResponse.json({ 
        error: 'Job not found',
        details: jobError?.message 
      }, { status: 404 });
    }

    // Verify the job belongs to the user
    if (jobData.user_id !== userId && jobData.user_id !== 'session-' + userId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'This job does not belong to you.'
      }, { status: 403 });
    }

    // Fetch resume data
    let resumeData;
    if (resumeId) {
      const { data: resume, error: resumeError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .eq('user_id', userId)
        .single();

      if (resumeError || !resume) {
        console.error('Error fetching resume:', resumeError);
        return NextResponse.json({ 
          error: 'Resume not found',
          details: resumeError?.message 
        }, { status: 404 });
      }

      resumeData = resume.parsed_data;
    } else {
      // Use default resume data from resumes table
      const { data: resumes, error: resumesError } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (resumesError || !resumes || resumes.length === 0) {
        return NextResponse.json({ 
          error: 'No resume found',
          message: 'Please upload a resume first.'
        }, { status: 404 });
      }

      resumeData = resumes[0].parsed_data;
    }

    // Create async job for resume generation
    const jobProcessingId = await JobProcessor.createJob(
      userId,
      'resume_generate',
      {
        resumeData,
        jobDescription: jobData.parsed_data,
        userName: resumeData.name || 'Your Name',
        companyName: jobData.company_name || 'Company',
        userId,
        jobDescriptionId: jobId,
        bypassTokenLimits
      },
      {
        jobTitle: jobData.job_title,
        companyName: jobData.company_name
      }
    );

    console.log(`[ASYNC PROCESSING] Created job ${jobProcessingId} for resume generation`);

    // Start processing the job
    // In Replit, this will process inline; elsewhere it uses background processing
    processJobInline(jobProcessingId).catch(console.error);

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId: jobProcessingId,
      message: 'Resume generation started. You will be notified when it\'s ready.',
      status: 'processing'
    });

  } catch (error) {
    console.error('[ASYNC RESUME GENERATION] Error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to start resume generation',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}