import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const supabaseClient = createServerClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Not authenticated'
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      user: {
        id: session.user.id,
        email: session.user.email,
        metadata: session.user.user_metadata
      }
    });
    
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}