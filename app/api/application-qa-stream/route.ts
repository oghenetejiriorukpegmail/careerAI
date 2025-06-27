import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server-client';
import { aiService } from '@/lib/ai/ai-service';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET endpoint for SSE streaming
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const conversationId = searchParams.get('conversationId');
  const message = searchParams.get('message');
  const action = searchParams.get('action');

  // Handle export action
  if (action === 'export' && conversationId) {
    return handleExport(conversationId);
  }

  if (!conversationId || !message) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Generate response using AI
        const response = await generateResponse(conversationId, message);
        
        // Simulate streaming by chunking the response
        const words = response.content.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`));
          
          // Add small delay for natural feel
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Send completion with quick replies
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'complete',
          quickReplies: response.quickReplies 
        })}\n\n`));

        // Save message to database
        await saveMessage(conversationId, 'user', message);
        await saveMessage(conversationId, 'assistant', response.content);

      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error', 
          error: 'Failed to generate response' 
        })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// POST endpoint for creating conversations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobDescriptionId, applicationId, context } = body;

    if (action === 'create_conversation') {
      const conversationId = uuidv4();
      const session = await getServerSession();
      
      // Create conversation record
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from('qa_conversations')
        .insert({
          id: conversationId,
          user_id: session?.user?.id || null,
          session_id: session ? null : conversationId,
          job_description_id: jobDescriptionId || null,
          application_id: applicationId || null,
          context: context || {},
        });

      if (error) {
        console.error('Error creating conversation:', error);
        throw error;
      }

      return NextResponse.json({ conversationId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateResponse(conversationId: string, message: string) {
  // Get conversation context
  const supabase = createServiceRoleClient();
  const { data: conversation } = await supabase
    .from('qa_conversations')
    .select('*, qa_messages(*)')
    .eq('id', conversationId)
    .single();

  // Get relevant context (job description, resume, etc.)
  let context = '';
  if (conversation?.job_description_id) {
    const { data: job } = await supabase
      .from('job_descriptions')
      .select('*')
      .eq('id', conversation.job_description_id)
      .single();
    
    if (job) {
      context += `Job Title: ${job.job_title}\\nCompany: ${job.company_name}\\nDescription: ${job.description}\\n\\n`;
    }
  }

  // Get conversation history
  const history = conversation?.qa_messages?.map((msg: any) => ({
    role: msg.role,
    content: msg.content
  })) || [];

  // Generate response
  const systemPrompt = `You are a helpful career advisor. Provide professional, actionable advice based on the context provided. Be encouraging and supportive while remaining truthful and practical.

${context ? `Context:\\n${context}` : ''}

Important: Keep responses concise (2-3 paragraphs max) and focused on the user's question.`;

  const response = await aiService.query(message, systemPrompt);
  const responseContent = response.content;

  // Generate quick replies based on context
  const quickReplies = generateQuickReplies(message, context);

  return {
    content: responseContent,
    quickReplies
  };
}

function generateQuickReplies(message: string, context: string): string[] {
  // Context-aware quick reply generation
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('interview')) {
    return [
      "What are common interview questions?",
      "How should I prepare for a technical interview?",
      "What questions should I ask the interviewer?"
    ];
  } else if (lowerMessage.includes('resume')) {
    return [
      "How can I improve my resume?",
      "What skills should I highlight?",
      "Should I include a summary section?"
    ];
  } else if (context.includes('Job Title:')) {
    return [
      "What makes me qualified for this role?",
      "How can I stand out as a candidate?",
      "What should I emphasize in my application?"
    ];
  }
  
  // Default quick replies
  return [
    "Tell me more about this role",
    "How can I improve my application?",
    "What are my strengths for this position?"
  ];
}

async function saveMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  const supabase = createServiceRoleClient();
  await supabase
    .from('qa_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
    });
}

async function handleExport(conversationId: string) {
  try {
    // Get conversation with messages
    const supabase = createServiceRoleClient();
    const { data: conversation, error } = await supabase
      .from('qa_conversations')
      .select('*, qa_messages(*)')
      .eq('id', conversationId)
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Format conversation as text
    let exportText = `Career Advisor Conversation
Date: ${new Date(conversation.created_at).toLocaleDateString()}
${conversation.job_description_id ? `Job Application Context: Yes` : ''}

---

`;

    // Sort messages by timestamp
    const messages = conversation.qa_messages.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    messages.forEach((msg: any) => {
      const timestamp = new Date(msg.created_at).toLocaleTimeString();
      exportText += `[${timestamp}] ${msg.role === 'user' ? 'You' : 'Career Advisor'}: ${msg.content}\\n\\n`;
    });

    // Return as downloadable text file
    return new NextResponse(exportText, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="career-advisor-chat-${conversationId}.txt"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}