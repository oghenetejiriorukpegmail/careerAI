import { NextRequest, NextResponse } from 'next/server';
import { getApplicationStats } from '@/lib/utils/application-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!userId && !sessionId) {
      return NextResponse.json({ error: 'User ID or Session ID is required' }, { status: 400 });
    }

    console.log('[STATS API] Fetching stats for user:', userId || sessionId);
    
    const stats = await getApplicationStats(userId || '', sessionId || undefined);

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error fetching application stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch application statistics' 
    }, { status: 500 });
  }
}