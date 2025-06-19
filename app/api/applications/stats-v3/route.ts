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
    
    console.log('[STATS V3 API] Fetching stats for user:', userIdentifier);
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // Use count queries for each status
    const [
      totalResult,
      toApplyResult,
      appliedResult,
      interviewingResult,
      offeredResult,
      rejectedResult
    ] = await Promise.all([
      adminSupabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('user_id', userIdentifier!),
      adminSupabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('user_id', userIdentifier!).eq('status', 'to_apply'),
      adminSupabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('user_id', userIdentifier!).eq('status', 'applied'),
      adminSupabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('user_id', userIdentifier!).eq('status', 'interviewing'),
      adminSupabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('user_id', userIdentifier!).eq('status', 'offered'),
      adminSupabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('user_id', userIdentifier!).eq('status', 'rejected')
    ]);
    
    // Get applications with applied_date for time-based stats
    const { data: appliedApps } = await adminSupabase
      .from('job_applications')
      .select('applied_date')
      .eq('user_id', userIdentifier!)
      .not('applied_date', 'is', null);
      
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let applied_this_week = 0;
    let applied_this_month = 0;
    
    appliedApps?.forEach((app: any) => {
      if (app.applied_date) {
        const appliedDate = new Date(app.applied_date);
        if (appliedDate >= oneWeekAgo) {
          applied_this_week++;
        }
        if (appliedDate >= oneMonthAgo) {
          applied_this_month++;
        }
      }
    });
    
    const stats = {
      total: totalResult.count || 0,
      to_apply: toApplyResult.count || 0,
      applied: appliedResult.count || 0,
      interviewing: interviewingResult.count || 0,
      offered: offeredResult.count || 0,
      rejected: rejectedResult.count || 0,
      applied_this_week,
      applied_this_month
    };
    
    return NextResponse.json({ 
      stats,
      _debug: {
        timestamp: new Date().toISOString(),
        method: 'count_queries'
      }
    });

  } catch (error) {
    console.error('Error fetching application stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch application statistics' 
    }, { status: 500 });
  }
}