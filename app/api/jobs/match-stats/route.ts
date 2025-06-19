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
    
    console.log('[MATCH STATS API] Fetching stats for user:', userIdentifier);
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // Get match statistics
    const [
      totalMatchesResult,
      highMatchesResult,
      mediumMatchesResult,
      recentMatchesResult
    ] = await Promise.all([
      // Total matches
      adminSupabase
        .from('job_match_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userIdentifier!),
        
      // High matches (80+ score)
      adminSupabase
        .from('job_match_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userIdentifier!)
        .gte('match_score', 80),
        
      // Medium matches (70-79 score)
      adminSupabase
        .from('job_match_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userIdentifier!)
        .gte('match_score', 70)
        .lt('match_score', 80),
        
      // Recent matches (last 7 days)
      adminSupabase
        .from('job_match_results')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userIdentifier!)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);
    
    // Get match score distribution
    const { data: allMatches } = await adminSupabase
      .from('job_match_results')
      .select('match_score')
      .eq('user_id', userIdentifier!);
      
    let scoreDistribution = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      'below60': 0
    };
    
    allMatches?.forEach((match: any) => {
      const score = match.match_score;
      if (score >= 90) scoreDistribution['90-100']++;
      else if (score >= 80) scoreDistribution['80-89']++;
      else if (score >= 70) scoreDistribution['70-79']++;
      else if (score >= 60) scoreDistribution['60-69']++;
      else scoreDistribution['below60']++;
    });
    
    const stats = {
      total: totalMatchesResult.count || 0,
      highMatches: highMatchesResult.count || 0,
      mediumMatches: mediumMatchesResult.count || 0,
      recentMatches: recentMatchesResult.count || 0,
      scoreDistribution,
      averageScore: allMatches && allMatches.length > 0 
        ? Math.round(allMatches.reduce((sum: number, m: any) => sum + m.match_score, 0) / allMatches.length)
        : 0
    };
    
    return NextResponse.json({ 
      stats,
      _debug: {
        timestamp: new Date().toISOString(),
        method: 'match_stats'
      }
    });

  } catch (error) {
    console.error('Error fetching match stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch match statistics' 
    }, { status: 500 });
  }
}