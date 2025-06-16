import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required'
      }, { status: 400 });
    }
    
    // Use admin client
    const supabase = getSupabaseAdminClient();
    
    // Get applications
    const { data: applications, error } = await supabase
      .from('job_applications')
      .select('id, status, applied_date, created_at, user_id')
      .eq('user_id', userId);
      
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch applications',
        details: error.message
      }, { status: 500 });
    }
    
    // Manual count
    const stats: {
      total: number;
      to_apply: number;
      applied: number;
      interviewing: number;
      offered: number;
      rejected: number;
      unknown: any[];
    } = {
      total: applications?.length || 0,
      to_apply: 0,
      applied: 0,
      interviewing: 0,
      offered: 0,
      rejected: 0,
      unknown: []
    };
    
    const statusDetails: any[] = [];
    
    applications?.forEach((app: any, index: number) => {
      const statusInfo = {
        index,
        id: app.id.substring(0, 8),
        status: app.status,
        status_type: typeof app.status,
        status_length: app.status?.length,
        status_trimmed: app.status?.trim(),
        matches_to_apply: app.status === 'to_apply',
        matches_applied: app.status === 'applied'
      };
      
      if (index < 5) {
        statusDetails.push(statusInfo);
      }
      
      // Count by status
      switch(app.status) {
        case 'to_apply':
          stats.to_apply++;
          break;
        case 'applied':
          stats.applied++;
          break;
        case 'interviewing':
          stats.interviewing++;
          break;
        case 'offered':
          stats.offered++;
          break;
        case 'rejected':
          stats.rejected++;
          break;
        default:
          stats.unknown.push({
            id: app.id,
            status: app.status,
            status_json: JSON.stringify(app.status)
          });
      }
    });
    
    return NextResponse.json({
      userId,
      stats,
      statusDetails,
      sampleApplications: applications?.slice(0, 3)
    });
    
  } catch (error) {
    console.error('Error in test stats:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}