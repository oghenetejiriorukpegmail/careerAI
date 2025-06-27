import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { queryAI } from '@/lib/ai/config';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    const body = await request.json();
    const { question, answer, context } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
    }

    // Get user's resume if logged in for personalized feedback
    let resumeContent = '';
    if (user) {
      const { data: resume } = await supabase
        .from('resumes')
        .select('parsed_data, extracted_text')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();
      
      if (resume) {
        resumeContent = resume.parsed_data ? 
          JSON.stringify(resume.parsed_data) : 
          resume.extracted_text || '';
      }
    }

    const contextInfo = context ? `
Context:
- Company: ${context.companyName || 'Not specified'}
- Role: ${context.role || 'Not specified'}
- Job Description: ${context.jobDescription ? context.jobDescription.substring(0, 300) + '...' : 'Not provided'}
` : '';

    const prompt = `You are an expert interview coach. Evaluate the following interview answer and provide constructive feedback.

Question: ${question}

Candidate's Answer: ${answer}

${contextInfo}

${resumeContent ? `Candidate's Background: ${resumeContent.substring(0, 500)}...` : ''}

Please provide feedback that includes:
1. Strengths of the answer
2. Areas for improvement
3. Specific suggestions to make the answer more impactful
4. If applicable, how to better align the answer with the company/role

Keep the feedback constructive, specific, and actionable. Format with clear sections.`;

    const response = await queryAI(prompt, 'quality');
    const feedback = response.choices?.[0]?.message?.content || response.content || '';
    
    console.log('[Interview Prep] Generated feedback:', feedback.substring(0, 200) + '...');

    // Store the Q&A if user is logged in
    if (user) {
      await supabase.from('interview_practice_history').insert({
        user_id: user.id,
        question,
        answer,
        feedback,
        context,
        created_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}