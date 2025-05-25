import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, refresh_token } = body;
    
    if (!access_token) {
      return NextResponse.json({ error: 'No access token provided' }, { status: 400 });
    }
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Set the session using the tokens from the client
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    
    if (error) {
      console.error('Session set error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    console.log('Session set successfully');
    
    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Error in session establishment:', error);
    return NextResponse.json({ error: 'Failed to establish session' }, { status: 500 });
  }
}