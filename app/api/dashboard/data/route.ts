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
    
    // Fetch all dashboard data in parallel
    const [
      profileResult,
      applicationsResult,
      totalAppCountResult,
      jobMatchesResult,
      totalMatchCountResult,
      resumeCountResult
    ] = await Promise.all([
      // Profile data
      adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
        
      // Recent applications with job details (order by updated_at to show recently modified)
      adminSupabase
        .from('job_applications')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          job_description_id,
          job_descriptions (
            company_name,
            job_title
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5),
        
      // Total application count
      adminSupabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
        
      // Recent job matches
      adminSupabase
        .from('job_match_results')
        .select(`
          *,
          job_descriptions (
            company_name,
            job_title,
            location,
            url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
        
      // Total job matches count
      adminSupabase
        .from('job_match_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
        
      // Resume count
      adminSupabase
        .from('resumes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    ]);
    
    // Process applications data
    console.log('[Dashboard API] Raw applications data:', applicationsResult.data);
    
    const applications = applicationsResult.data?.map((app: any) => ({
      id: app.id,
      company_name: app.job_descriptions?.company_name || 'Unknown Company',
      job_title: app.job_descriptions?.job_title || 'Unknown Position',
      status: app.status,
      created_at: app.created_at,
      updated_at: app.updated_at
    })) || [];
    
    console.log('[Dashboard API] Processed applications:', applications);
    
    return NextResponse.json({
      profile: profileResult.data,
      applications,
      totalApplications: totalAppCountResult.count || 0,
      jobMatches: jobMatchesResult.data || [],
      totalJobMatches: totalMatchCountResult.count || 0,
      resumeCount: resumeCountResult.count || 0
    });
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}