import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { JobProcessor } from '@/lib/utils/job-processor';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const jobId = params.id;
    
    if (!jobId) {
      return NextResponse.json({
        error: 'Job ID is required'
      }, { status: 400 });
    }
    
    // Get job status
    const job = await JobProcessor.getJobStatus(jobId);
    
    if (!job) {
      return NextResponse.json({
        error: 'Job not found'
      }, { status: 404 });
    }
    
    // Check if user owns this job
    if (job.user_id !== session.user.id) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 403 });
    }
    
    // Return job status and results
    return NextResponse.json({
      id: job.id,
      status: job.status,
      type: job.type,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      result: job.result_data,
      error: job.error_message,
      metadata: job.metadata
    });
    
  } catch (error) {
    console.error('[JOB STATUS] Error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get job status'
    }, { status: 500 });
  }
}