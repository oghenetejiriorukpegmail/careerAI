import { createClient } from '@/lib/supabase/client';
import { aiService } from './ai-service';
import { Database } from '@/lib/supabase/types';

type QAConversation = Database['public']['Tables']['qa_conversations']['Row'];
type QAMessage = Database['public']['Tables']['qa_messages']['Row'];

export interface ConversationContext {
  jobDescriptionId?: string;
  jobApplicationId?: string;
  documentType?: 'resume' | 'cover_letter';
  additionalContext?: Record<string, any>;
}

export interface QuickReply {
  text: string;
  action: string;
  data?: any;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata?: {
    quickReplies?: QuickReply[];
    isTyping?: boolean;
  };
}

export class QAConversationManager {
  private supabase = createClient();

  async createConversation(
    userId: string,
    context: ConversationContext
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('qa_conversations')
      .insert({
        user_id: userId,
        job_description_id: context.jobDescriptionId,
        job_application_id: context.jobApplicationId,
        context: context.documentType || 'general',
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: any
  ): Promise<ConversationMessage> {
    const { data, error } = await this.supabase
      .from('qa_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      role: data.role as 'user' | 'assistant',
      content: data.content,
      createdAt: data.created_at,
      metadata: data.metadata,
    };
  }

  async getConversationHistory(
    conversationId: string,
    limit = 50
  ): Promise<ConversationMessage[]> {
    const { data, error } = await this.supabase
      .from('qa_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      createdAt: msg.created_at,
      metadata: msg.metadata,
    }));
  }

  async generateResponse(
    conversationId: string,
    userMessage: string,
    context: ConversationContext
  ): Promise<{ content: string; quickReplies?: QuickReply[] }> {
    // Get conversation history for context
    const history = await this.getConversationHistory(conversationId, 10);

    // Build context-aware system prompt
    const systemPrompt = await this.buildSystemPrompt(context, history);

    // Generate AI response
    const response = await aiService.query(userMessage, systemPrompt);

    // Extract quick replies if applicable
    const quickReplies = this.extractQuickReplies(
      response.content,
      context,
      userMessage
    );

    return {
      content: this.cleanResponse(response.content),
      quickReplies,
    };
  }

  private async buildSystemPrompt(
    context: ConversationContext,
    history: ConversationMessage[]
  ): Promise<string> {
    let basePrompt = `You are a helpful career advisor assistant integrated into a job application platform. 
You help users with their job search, applications, resumes, and career-related questions.

Key guidelines:
- Be concise but thorough
- Provide actionable advice
- Reference specific details from the user's context when available
- Suggest next steps when appropriate
- Be encouraging and professional`;

    // Add context-specific information
    if (context.jobDescriptionId) {
      const { data: jobDesc } = await this.supabase
        .from('job_descriptions')
        .select('job_title, company_name, description, parsed_data')
        .eq('id', context.jobDescriptionId)
        .single();

      if (jobDesc) {
        basePrompt += `\n\nCurrent Job Context:
- Position: ${jobDesc.job_title} at ${jobDesc.company_name}
- Key Requirements: ${this.extractKeyRequirements(jobDesc.parsed_data)}`;
      }
    }

    if (context.jobApplicationId) {
      const { data: application } = await this.supabase
        .from('job_applications')
        .select('status, notes')
        .eq('id', context.jobApplicationId)
        .single();

      if (application) {
        basePrompt += `\n\nApplication Status: ${application.status}`;
        if (application.notes) {
          basePrompt += `\nApplication Notes: ${application.notes}`;
        }
      }
    }

    // Add conversation history
    if (history.length > 0) {
      basePrompt += '\n\nConversation History:\n';
      history.slice(-5).forEach((msg) => {
        basePrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${
          msg.content
        }\n`;
      });
    }

    return basePrompt;
  }

  private extractKeyRequirements(parsedData: any): string {
    if (!parsedData?.required_skills) return 'Not available';
    
    const skills = parsedData.required_skills.slice(0, 5).join(', ');
    return skills || 'Not available';
  }

  private extractQuickReplies(
    response: string,
    context: ConversationContext,
    userMessage: string
  ): QuickReply[] {
    const quickReplies: QuickReply[] = [];
    const lowerMessage = userMessage.toLowerCase();
    const lowerResponse = response.toLowerCase();

    // Context-aware quick replies
    if (context.jobDescriptionId && !context.documentType) {
      if (lowerResponse.includes('resume') || lowerMessage.includes('resume')) {
        quickReplies.push({
          text: 'Generate tailored resume',
          action: 'generate_resume',
          data: { jobDescriptionId: context.jobDescriptionId },
        });
      }
      if (lowerResponse.includes('cover letter') || lowerMessage.includes('cover')) {
        quickReplies.push({
          text: 'Create cover letter',
          action: 'generate_cover_letter',
          data: { jobDescriptionId: context.jobDescriptionId },
        });
      }
    }

    // General quick replies based on conversation flow
    if (lowerResponse.includes('interview') || lowerResponse.includes('prepare')) {
      quickReplies.push({
        text: 'Common interview questions',
        action: 'interview_questions',
      });
    }

    if (lowerResponse.includes('salary') || lowerResponse.includes('negotiate')) {
      quickReplies.push({
        text: 'Salary negotiation tips',
        action: 'salary_tips',
      });
    }

    if (lowerResponse.includes('follow up') || lowerResponse.includes('after applying')) {
      quickReplies.push({
        text: 'Follow-up email template',
        action: 'followup_template',
      });
    }

    // Always include these helpful options
    if (quickReplies.length < 3) {
      quickReplies.push({
        text: 'More job search tips',
        action: 'job_search_tips',
      });
    }

    return quickReplies.slice(0, 3); // Limit to 3 quick replies
  }

  private cleanResponse(response: string): string {
    // Remove any markdown formatting that might interfere with display
    return response
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/```[\s\S]*?```/g, (match) => {
        // Preserve code blocks but clean them
        return match.replace(/```/g, '');
      })
      .trim();
  }

  async exportConversation(
    conversationId: string,
    format: 'text' | 'pdf' = 'text'
  ): Promise<string | Buffer> {
    const { data: conversation } = await this.supabase
      .from('qa_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    const messages = await this.getConversationHistory(conversationId);

    if (format === 'text') {
      let content = `Career Advisor Conversation\n`;
      content += `Date: ${new Date(conversation.created_at).toLocaleDateString()}\n`;
      content += `Context: ${conversation.context}\n\n`;
      content += '---\n\n';

      messages.forEach((msg) => {
        const timestamp = new Date(msg.createdAt).toLocaleTimeString();
        content += `[${timestamp}] ${msg.role === 'user' ? 'You' : 'Career Advisor'}: ${
          msg.content
        }\n\n`;
      });

      return content;
    }

    // For PDF export, we'd integrate with the existing PDF generator
    // This is a placeholder - would need to implement PDF generation
    throw new Error('PDF export not yet implemented');
  }

  async getUserConversations(
    userId: string,
    limit = 10
  ): Promise<QAConversation[]> {
    const { data, error } = await this.supabase
      .from('qa_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async archiveConversation(conversationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('qa_conversations')
      .update({ status: 'archived' })
      .eq('id', conversationId);

    if (error) throw error;
  }
}