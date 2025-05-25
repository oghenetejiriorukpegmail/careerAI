import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to delete job descriptions.'
      }, { status: 401 });
    }
    
    const jobId = params.id;
    const userId = session.user.id;
    
    // Use admin client for deletion
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // First verify the job belongs to the user
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('job_descriptions')
      .select('id, user_id')
      .eq('id', jobId)
      .single();
    
    if (jobError || !jobData) {
      return NextResponse.json({ error: 'Job description not found' }, { status: 404 });
    }
    
    if (jobData.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Delete in the correct order to respect foreign key constraints
    
    // 1. First delete job applications (they reference generated_documents)
    const { error: appsError } = await supabaseAdmin
      .from('job_applications')
      .delete()
      .eq('job_description_id', jobId);
    
    if (appsError) {
      console.error('Error deleting job applications:', appsError);
      return NextResponse.json({ 
        error: 'Failed to delete associated applications',
        details: appsError.message 
      }, { status: 500 });
    }
    
    // 2. Then delete generated documents (now safe since job_applications are gone)
    const { error: docsError } = await supabaseAdmin
      .from('generated_documents')
      .delete()
      .eq('job_description_id', jobId);
    
    if (docsError) {
      console.error('Error deleting generated documents:', docsError);
      return NextResponse.json({ 
        error: 'Failed to delete associated documents',
        details: docsError.message 
      }, { status: 500 });
    }
    
    // 3. Finally delete the job description
    const { error: deleteError } = await supabaseAdmin
      .from('job_descriptions')
      .delete()
      .eq('id', jobId);
    
    if (deleteError) {
      console.error('Error deleting job description:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete job description',
        details: deleteError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Job description and all associated data deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in job description deletion:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}