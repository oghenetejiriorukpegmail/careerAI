import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!userId && !sessionId) {
      return NextResponse.json({ error: 'User ID or Session ID is required' }, { status: 400 });
    }

    const userIdentifier = userId || sessionId;
    
    console.log('[STATS V2 API] Fetching stats for user:', userIdentifier);
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // Get ALL applications for this user - force fresh data
    const timestamp = Date.now();
    const { data: applications, error } = await adminSupabase
      .from('job_applications')
      .select('id, status, applied_date, created_at')
      .eq('user_id', userIdentifier!)
      .order('id'); // Add order to ensure consistent results
      
    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch applications',
        details: error.message
      }, { status: 500 });
    }
    
    // Count by status using the exact same logic as debug endpoint
    const stats = {
      total: applications?.length || 0,
      to_apply: 0,
      applied: 0,
      interviewing: 0,
      offered: 0,
      rejected: 0,
      applied_this_week: 0,
      applied_this_month: 0
    };
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    applications?.forEach((app: any) => {
      // Count by status
      if (app.status === 'to_apply') {
        stats.to_apply++;
      } else if (app.status === 'applied') {
        stats.applied++;
      } else if (app.status === 'interviewing') {
        stats.interviewing++;
      } else if (app.status === 'offered') {
        stats.offered++;
      } else if (app.status === 'rejected') {
        stats.rejected++;
      }
      
      // Count by time period
      if (app.applied_date) {
        const appliedDate = new Date(app.applied_date);
        if (appliedDate >= oneWeekAgo) {
          stats.applied_this_week++;
        }
        if (appliedDate >= oneMonthAgo) {
          stats.applied_this_month++;
        }
      }
    });
    
    return NextResponse.json({ 
      stats,
      _debug: {
        totalApplications: applications?.length,
        firstThree: applications?.slice(0, 3)
      }
    });

  } catch (error) {
    console.error('Error fetching application stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch application statistics' 
    }, { status: 500 });
  }
}