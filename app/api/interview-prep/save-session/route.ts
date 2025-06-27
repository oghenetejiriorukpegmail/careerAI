import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const body = await request.json();
    const { transcript, topics, context } = body;

    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ error: 'No transcript to save' }, { status: 400 });
    }

    // Save the session
    const { data, error } = await supabase.from('interview_sessions').insert({
      user_id: user.id,
      topics,
      context,
      transcript,
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }).select().single();

    if (error) {
      console.error('Error saving session:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      sessionId: data.id,
      message: 'Session saved successfully' 
    });
  } catch (error) {
    console.error('Error saving interview session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}