import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    
    // Method 1: Count using aggregation
    const { count: totalCount, error: countError } = await adminSupabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
      
    // Method 2: Get all and count manually
    const { data: allApps, error: allError } = await adminSupabase
      .from('job_applications')
      .select('id, status')
      .eq('user_id', userId);
      
    // Method 3: Count by status
    const { data: appliedApps, count: appliedCount } = await adminSupabase
      .from('job_applications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'applied');
      
    const { data: toApplyApps, count: toApplyCount } = await adminSupabase
      .from('job_applications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'to_apply');
    
    // Manual count
    const manualCounts: any = {};
    if (allApps) {
      allApps.forEach((app: any) => {
        const status = app.status || 'null';
        manualCounts[status] = (manualCounts[status] || 0) + 1;
      });
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      userId,
      method1_totalCount: totalCount,
      method2_manualTotal: allApps?.length || 0,
      method2_manualCounts: manualCounts,
      method3_appliedCount: appliedCount,
      method3_toApplyCount: toApplyCount,
      allApplications: allApps
    });
    
  } catch (error) {
    console.error('Error in direct count:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}