import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (unreadOnly) {
      query = query.eq('read', false);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({
        error: 'Failed to fetch notifications'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      notifications: data || []
    });
    
  } catch (error) {
    console.error('[NOTIFICATIONS] Error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch notifications'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { notificationIds, read = true } = body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({
        error: 'Notification IDs are required'
      }, { status: 400 });
    }
    
    // Update notifications
    const { error } = await supabase
      .from('notifications')
      .update({ read })
      .eq('user_id', session.user.id)
      .in('id', notificationIds);
    
    if (error) {
      console.error('Error updating notifications:', error);
      return NextResponse.json({
        error: 'Failed to update notifications'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `${notificationIds.length} notifications marked as ${read ? 'read' : 'unread'}`
    });
    
  } catch (error) {
    console.error('[NOTIFICATIONS] Error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update notifications'
    }, { status: 500 });
  }
}