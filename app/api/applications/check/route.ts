import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    // Get job description ID from query params
    const { searchParams } = new URL(request.url);
    const jobDescriptionId = searchParams.get('jobDescriptionId');
    
    if (!jobDescriptionId) {
      return NextResponse.json({ 
        error: 'Job description ID is required' 
      }, { status: 400 });
    }
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // Check for existing application
    const { data: application, error } = await adminSupabase
      .from('job_applications')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_description_id', jobDescriptionId)
      .maybeSingle();
      
    if (error) {
      console.error('Error checking application:', error);
      return NextResponse.json({ 
        error: 'Failed to check application',
        details: error.message
      }, { status: 500 });
    }
    
    // Also fetch generated documents for this job
    const { data: documents, error: docsError } = await adminSupabase
      .from('generated_documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_description_id', jobDescriptionId);
      
    if (docsError) {
      console.error('Error checking documents:', docsError);
    }
    
    return NextResponse.json({ 
      application,
      documents: documents || [],
      exists: !!application
    });
    
  } catch (error) {
    console.error('Error in check application endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}