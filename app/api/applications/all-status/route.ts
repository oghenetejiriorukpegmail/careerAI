import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // Get ALL applications with their current status
    const { data: applications, error } = await adminSupabase
      .from('job_applications')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        job_descriptions (
          company_name,
          job_title
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch applications',
        details: error.message
      }, { status: 500 });
    }
    
    // Group by status
    const statusGroups: any = {};
    applications?.forEach((app: any) => {
      const status = app.status || 'null';
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push({
        id: app.id,
        company: app.job_descriptions?.company_name || 'Unknown',
        title: app.job_descriptions?.job_title || 'Unknown',
        created: new Date(app.created_at).toLocaleDateString(),
        updated: new Date(app.updated_at).toLocaleDateString()
      });
    });
    
    // Get counts
    const counts: any = {};
    Object.keys(statusGroups).forEach(status => {
      counts[status] = statusGroups[status].length;
    });
    
    return NextResponse.json({
      total: applications?.length || 0,
      counts,
      statusGroups,
      recentFive: applications?.slice(0, 5).map((app: any) => ({
        id: app.id,
        company: app.job_descriptions?.company_name,
        title: app.job_descriptions?.job_title,
        status: app.status,
        created: app.created_at,
        updated: app.updated_at
      }))
    });
    
  } catch (error) {
    console.error('Error in all-status endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}