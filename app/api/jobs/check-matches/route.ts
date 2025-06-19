import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdminClient();
    
    // Check job_match_results
    const { data: matches, count: matchCount } = await adminSupabase
      .from('job_match_results')
      .select(`
        *,
        job_descriptions (
          job_title,
          company_name
        ),
        resumes (
          file_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    // Check job_descriptions with match scores
    const { data: jobsWithScores } = await adminSupabase
      .from('job_descriptions')
      .select('id, job_title, company_name, match_score, last_matched_at')
      .eq('user_id', userId)
      .not('match_score', 'is', null)
      .order('match_score', { ascending: false });
      
    // Get all job IDs for reference
    const { data: allJobs } = await adminSupabase
      .from('job_descriptions')
      .select('id, job_title')
      .eq('user_id', userId);
      
    return NextResponse.json({
      matchCount: matchCount || 0,
      matches: matches || [],
      jobsWithScores: jobsWithScores || [],
      totalJobs: allJobs?.length || 0,
      sampleJobIds: allJobs?.slice(0, 3).map((j: any) => ({ id: j.id, title: j.job_title })) || []
    });
    
  } catch (error) {
    console.error('Error checking matches:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}