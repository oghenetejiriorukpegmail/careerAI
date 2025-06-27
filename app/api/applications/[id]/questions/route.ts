import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { questionAnswerer } from '@/lib/ai/question-answerer';
import { getSupabaseAdminClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    console.log('[Questions API] GET request for application:', params.id);
    
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Questions API] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Questions API] Fetching for user:', user.id);

    // Debug: Log the exact query being made
    console.log('[Questions API] Query params:', { id: params.id, user_id: user.id });
    
    // Use admin client for more reliable querying
    const adminSupabase = getSupabaseAdminClient();
    
    const { data: application, error } = await adminSupabase
      .from('job_applications')
      .select('application_questions')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[Questions API] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!application) {
      console.log('[Questions API] Application not found for id:', params.id, 'and user:', user.id);
      
      // Debug: Check if any application exists with this ID
      const { data: debugApp } = await adminSupabase
        .from('job_applications')
        .select('id, user_id')
        .eq('id', params.id)
        .maybeSingle();
      
      console.log('[Questions API] Debug - Application exists?', debugApp);
      
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    console.log('[Questions API] Found application with questions:', application.application_questions);
    return NextResponse.json({ questions: application.application_questions || [] });
  } catch (error) {
    console.error('[Questions API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { questions } = body;

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Invalid questions data' }, { status: 400 });
    }

    // Get application details
    const adminSupabase = getSupabaseAdminClient();
    const { data: application, error: appError } = await adminSupabase
      .from('job_applications')
      .select(`
        id,
        job_descriptions (
          id,
          job_title,
          company_name,
          location,
          description
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (appError) {
      console.error('[Questions API] Error fetching application:', appError);
      return NextResponse.json({ error: appError.message }, { status: 500 });
    }

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Get user's resume - check for primary resume first
    let { data: resume, error: resumeError } = await adminSupabase
      .from('resumes')
      .select('parsed_data, extracted_text')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (resumeError) {
      console.error('[Questions API] Error fetching resume:', resumeError);
      return NextResponse.json({ error: resumeError.message }, { status: 500 });
    }

    if (!resume) {
      // If no primary resume, get the most recent one
      const { data: anyResume, error: anyResumeError } = await adminSupabase
        .from('resumes')
        .select('parsed_data, extracted_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (!anyResume) {
        return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
      }
      
      resume = anyResume;
    }

    // Generate answers for unanswered questions
    const answeredQuestions = await Promise.all(
      questions.map(async (q: any) => {
        if (q.answer) {
          return q;
        }

        try {
          // Use parsed_data if available, otherwise use extracted_text
          const resumeContent = resume.parsed_data ? 
            JSON.stringify(resume.parsed_data) : 
            resume.extracted_text || '';
            
          const answer = await questionAnswerer.generateAnswer(
            q.question,
            resumeContent,
            {
              jobDescription: application.job_descriptions?.description || '',
              company: application.job_descriptions?.company_name || 'Unknown Company',
              position: application.job_descriptions?.job_title || 'Unknown Position'
            }
          );

          return {
            ...q,
            answer
          };
        } catch (error) {
          console.error('Error generating answer:', error);
          return q;
        }
      })
    );

    // Update the application with the questions
    const { error: updateError } = await adminSupabase
      .from('job_applications')
      .update({ application_questions: answeredQuestions })
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ questions: answeredQuestions });
  } catch (error) {
    console.error('Error saving questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { questionIndex, answer } = body;

    if (typeof questionIndex !== 'number' || !answer) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Get current questions
    const adminSupabase = getSupabaseAdminClient();
    const { data: application, error: fetchError } = await adminSupabase
      .from('job_applications')
      .select('application_questions')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[Questions API] Error fetching application:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const questions = application.application_questions || [];
    if (questionIndex >= questions.length) {
      return NextResponse.json({ error: 'Invalid question index' }, { status: 400 });
    }

    // Update the specific question
    questions[questionIndex].answer = answer;

    // Save back to database
    const { error: updateError } = await adminSupabase
      .from('job_applications')
      .update({ application_questions: questions })
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}