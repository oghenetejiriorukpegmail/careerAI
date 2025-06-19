import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const applicationId = request.nextUrl.searchParams.get('id');
    
    if (!applicationId) {
      return NextResponse.json({ 
        error: 'Application ID is required'
      }, { status: 400 });
    }
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // Get the specific application
    const { data: application, error } = await adminSupabase
      .from('job_applications')
      .select('id, status, updated_at')
      .eq('id', applicationId)
      .single();
      
    if (error) {
      console.error('Error fetching application:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch application',
        details: error.message
      }, { status: 500 });
    }
    
    if (!application) {
      return NextResponse.json({ 
        error: 'Application not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      id: application.id,
      status: application.status,
      updated_at: application.updated_at,
      checked_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error verifying status:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}