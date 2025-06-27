import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { queryAI } from '@/lib/ai/config';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    const body = await request.json();
    const { topics, previousQuestion, context } = body;

    if (!topics || topics.length === 0) {
      return NextResponse.json({ error: 'No topics selected' }, { status: 400 });
    }

    const contextInfo = context ? `
Context:
- Company: ${context.companyName || 'Not specified'}
- Role: ${context.role || 'Not specified'}
- Job Description excerpt: ${context.jobDescription ? context.jobDescription.substring(0, 300) + '...' : 'Not provided'}
` : '';

    const prompt = `Generate a new interview question based on the following:

Topics: ${topics.join(', ')}
Previous Question: ${previousQuestion}
${contextInfo}

Generate a different question that:
1. Is relevant to one of the selected topics
2. Is different from the previous question
3. Is specific to the company/role if context is provided
4. Is challenging but fair

Return only the question, no additional text or formatting.`;

    const response = await queryAI(prompt, 'fast');
    const question = response.choices?.[0]?.message?.content || response.content || '';

    return NextResponse.json({ question: question.trim() });
  } catch (error) {
    console.error('Error generating next question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}