import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // Get specific application
    const { data: application, error } = await adminSupabase
      .from('job_applications')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();
      
    if (error || !application) {
      return NextResponse.json({ 
        error: 'Application not found',
        details: error?.message
      }, { status: 404 });
    }
    
    return NextResponse.json({ application });
    
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { status, notes, applied_date } = body;
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // Build update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (status) {
      updateData.status = status;
      // Automatically set applied_date when status changes to applied
      if (status === 'applied' && !applied_date) {
        updateData.applied_date = new Date().toISOString();
      }
    }
    
    if (notes !== undefined) updateData.notes = notes;
    if (applied_date) updateData.applied_date = applied_date;
    
    console.log(`[PATCH /api/applications/${params.id}] Updating with:`, updateData);
    
    // Update application
    const { data: application, error } = await adminSupabase
      .from('job_applications')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating application:', error);
      return NextResponse.json({ 
        error: 'Failed to update application',
        details: error.message
      }, { status: 500 });
    }
    
    if (!application) {
      return NextResponse.json({ 
        error: 'Application not found or access denied'
      }, { status: 404 });
    }
    
    console.log(`[PATCH /api/applications/${params.id}] Updated successfully:`, application.status);
    
    return NextResponse.json({ application });
    
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}