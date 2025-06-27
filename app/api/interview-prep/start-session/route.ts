import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { queryAI } from '@/lib/ai/config';

const topicQuestions: Record<string, string[]> = {
  behavioral: [
    "Tell me about a time when you had to work under pressure. How did you handle it?",
    "Describe a situation where you had to work with a difficult team member. How did you resolve it?",
    "Give me an example of a time you showed leadership.",
    "Tell me about a mistake you made and how you handled it.",
    "Describe a time when you had to adapt to a significant change at work."
  ],
  technical: [
    "Walk me through your approach to debugging a complex issue.",
    "How do you stay updated with the latest technology trends?",
    "Describe the most challenging technical problem you've solved.",
    "How do you ensure code quality in your projects?",
    "Explain a technical concept to someone without a technical background."
  ],
  situational: [
    "How would you handle a situation where you disagree with your manager's decision?",
    "What would you do if you were assigned a task with an impossible deadline?",
    "How would you approach learning a completely new technology for a project?",
    "What would you do if a colleague was not pulling their weight on a team project?",
    "How would you handle receiving critical feedback from a peer?"
  ],
  'company-fit': [
    "Why are you interested in working for our company?",
    "What do you know about our company culture?",
    "How do you think you can contribute to our team?",
    "What aspects of our company mission resonate with you?",
    "Where do you see yourself fitting into our organization?"
  ],
  career: [
    "Where do you see yourself professionally in 5 years?",
    "What motivates you in your career?",
    "Why are you looking to leave your current position?",
    "What are your salary expectations?",
    "What is your ideal work environment?"
  ],
  'role-specific': [
    "What interests you most about this specific role?",
    "How does your experience prepare you for this position?",
    "What would be your approach in the first 90 days?",
    "What questions do you have about the role?",
    "How would you measure success in this position?"
  ]
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const body = await request.json();
    const { topics, jobDescription, companyName, role } = body;

    if (!topics || topics.length === 0) {
      return NextResponse.json({ error: 'No topics selected' }, { status: 400 });
    }

    let question = '';
    
    // If job context is provided, generate a contextual question
    if (jobDescription || companyName || role) {
      const context = `
        ${companyName ? `Company: ${companyName}` : ''}
        ${role ? `Role: ${role}` : ''}
        ${jobDescription ? `Job Description: ${jobDescription.substring(0, 500)}...` : ''}
      `.trim();

      const prompt = `Generate a relevant interview question based on the selected topics: ${topics.join(', ')} and the following context:
      ${context}
      
      The question should be specific and relevant to the role/company if provided, otherwise generate a general question for the topic.
      Return only the question, no additional text.`;

      const response = await queryAI(prompt, 'fast');
      question = response.choices?.[0]?.message?.content || response.content || '';
      question = question.trim();
    } else {
      // Select a random question from the selected topics
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const topicQuestionList = topicQuestions[randomTopic] || [];
      
      if (topicQuestionList.length > 0) {
        question = topicQuestionList[Math.floor(Math.random() * topicQuestionList.length)];
      } else {
        // Generate a question for custom topics
        const prompt = `Generate a professional interview question for the topic: ${randomTopic}. Return only the question.`;
        const response = await queryAI(prompt, 'fast');
        question = response.choices?.[0]?.message?.content || response.content || '';
        question = question.trim();
      }
    }

    // Store session data if user is logged in
    if (user) {
      await supabase.from('interview_sessions').insert({
        user_id: user.id,
        topics,
        context: { jobDescription, companyName, role },
        started_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Error starting interview session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}