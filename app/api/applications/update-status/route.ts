import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { applicationId, status } = body;
    
    if (!applicationId || !status) {
      return NextResponse.json({ 
        error: 'Application ID and status are required' 
      }, { status: 400 });
    }
    
    const validStatuses = ['to_apply', 'applied', 'interviewing', 'offered', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      }, { status: 400 });
    }
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // Update application status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // If changing to 'applied', set the applied_date
    if (status === 'applied') {
      updateData.applied_date = new Date().toISOString();
    }
    
    const { data: updatedApp, error: updateError } = await adminSupabase
      .from('job_applications')
      .update(updateData)
      .eq('id', applicationId)
      .eq('user_id', session.user.id) // Ensure user owns this application
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating application status:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update application status',
        details: updateError.message
      }, { status: 500 });
    }
    
    if (!updatedApp) {
      return NextResponse.json({ 
        error: 'Application not found or access denied'
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      application: updatedApp,
      message: `Application status updated to ${status}`
    });
    
  } catch (error) {
    console.error('Error in update status endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}