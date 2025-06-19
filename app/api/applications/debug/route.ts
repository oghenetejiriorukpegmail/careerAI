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
    
    // Get ALL applications for this user with details
    const { data: applications, error } = await adminSupabase
      .from('job_applications')
      .select(`
        id, 
        status, 
        created_at, 
        updated_at, 
        applied_date, 
        user_id,
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
    
    // Count by status
    const statusCounts: any = {
      total: applications?.length || 0,
      to_apply: 0,
      applied: 0,
      interviewing: 0,
      offered: 0,
      rejected: 0,
      unknown: 0
    };
    
    applications?.forEach((app: any) => {
      if (app.status in statusCounts) {
        statusCounts[app.status]++;
      } else {
        statusCounts.unknown++;
      }
    });
    
    // Get date range stats
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let appliedThisWeek = 0;
    let appliedThisMonth = 0;
    
    applications?.forEach((app: any) => {
      if (app.applied_date) {
        const appliedDate = new Date(app.applied_date);
        if (appliedDate >= oneWeekAgo) {
          appliedThisWeek++;
        }
        if (appliedDate >= oneMonthAgo) {
          appliedThisMonth++;
        }
      }
    });
    
    return NextResponse.json({
      userId,
      totalApplications: applications?.length || 0,
      statusCounts,
      appliedThisWeek,
      appliedThisMonth,
      applications: applications?.slice(0, 10), // First 10 for inspection
    });
    
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}