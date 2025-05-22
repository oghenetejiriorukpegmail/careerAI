import { NextRequest, NextResponse } from 'next/server';
import { getApplicationStats } from '@/lib/utils/application-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (!userId && !sessionId) {
      return NextResponse.json({ error: 'User ID or Session ID is required' }, { status: 400 });
    }

    const userIdentifier = userId || sessionId;
    
    const stats = await getApplicationStats(userIdentifier!, sessionId);

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error fetching application stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch application statistics' 
    }, { status: 500 });
  }
}