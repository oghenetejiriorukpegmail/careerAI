import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
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
    const { jobDescriptionId, resumeId, coverLetterId, resetStatus = false } = body;
    
    if (!jobDescriptionId) {
      return NextResponse.json({ 
        error: 'Job description ID is required' 
      }, { status: 400 });
    }
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // Check if application already exists
    const { data: existingApp, error: checkError } = await adminSupabase
      .from('job_applications')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('job_description_id', jobDescriptionId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking existing application:', checkError);
      return NextResponse.json({ 
        error: 'Failed to check existing application',
        details: checkError.message
      }, { status: 500 });
    }
    
    if (existingApp) {
      // Update existing application
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (resumeId) updateData.resume_id = resumeId;
      if (coverLetterId) updateData.cover_letter_id = coverLetterId;
      
      // If resetStatus is true, or if current status is 'applied' or beyond, reset to 'to_apply'
      // This ensures newly generated documents reset the application to "ready to apply" state
      if (resetStatus || ['applied', 'interviewing', 'offered', 'rejected'].includes(existingApp.status)) {
        updateData.status = 'to_apply';
        // Clear applied_date since we're resetting to "to_apply"
        updateData.applied_date = null;
      }
      
      const { data: updatedApp, error: updateError } = await adminSupabase
        .from('job_applications')
        .update(updateData)
        .eq('id', existingApp.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('Error updating application:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update application',
          details: updateError.message
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        application: updatedApp,
        created: false 
      });
    } else {
      // Create new application
      const applicationData: any = {
        user_id: session.user.id,
        job_description_id: jobDescriptionId,
        status: 'to_apply',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (resumeId) applicationData.resume_id = resumeId;
      if (coverLetterId) applicationData.cover_letter_id = coverLetterId;
      
      const { data: newApp, error: createError } = await adminSupabase
        .from('job_applications')
        .insert(applicationData)
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating application:', createError);
        return NextResponse.json({ 
          error: 'Failed to create application',
          details: createError.message
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        application: newApp,
        created: true 
      });
    }
  } catch (error) {
    console.error('Error in create application endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}