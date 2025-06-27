import { queryAI } from './config';
import { detectQuestionCategory } from '@/lib/constants/application-questions';

interface JobContext {
  jobDescription?: string;
  company?: string;
  position?: string;
}

class QuestionAnswerer {
  async generateAnswer(
    question: string,
    resumeContent: string,
    jobContext?: JobContext
  ): Promise<string> {
    const category = detectQuestionCategory(question);
    
    const systemPrompt = `You are an expert career coach helping job applicants craft compelling, professional answers for job applications. Your responses should be ready to copy and paste directly into application forms.

CRITICAL RULES:
1. Generate professional, engaging answers that the applicant can use immediately
2. Draw from the resume's experiences, skills, and achievements to support your answers
3. For "Why do you want to work here?" questions, connect the candidate's background to the company's needs
4. Keep answers concise but impactful (2-4 sentences typically)
5. Write in first person as if you are the candidate
6. Make logical connections between the candidate's experience and the job requirements
7. Be enthusiastic but professional
8. For yes/no questions, start with a clear yes/no followed by supporting details

Question Category: ${category}`;

    const userPrompt = `Generate a professional, ready-to-use answer for this job application question:

Question: ${question}

${jobContext ? `Job Context:
- Company: ${jobContext.company || 'Not specified'}
- Position: ${jobContext.position || 'Not specified'}
- Job Description Summary: ${jobContext.jobDescription ? jobContext.jobDescription.substring(0, 800) + '...' : 'Not provided'}
` : ''}

Candidate's Resume:
${resumeContent}

Instructions:
1. Write a compelling answer in first person that the candidate can copy and paste directly
2. For "Why do you want to work for [Company]?" questions:
   - Express genuine interest in the company/role
   - Connect 2-3 specific experiences or skills from the resume to the job requirements
   - Show how the candidate's background makes them a great fit
   - Mention career growth or learning opportunities if relevant
3. Make the answer specific to this company and position, not generic
4. Keep it professional, confident, and enthusiastic
5. Length: 2-4 sentences for most questions, up to 5-6 for complex behavioral questions

Generate the answer now:`;

    try {
      const aiResponse = await queryAI(userPrompt, systemPrompt);
      const content = aiResponse.choices?.[0]?.message?.content || aiResponse.content || '';
      return this.formatAnswer(content, category);
    } catch (error) {
      console.error('Error generating answer:', error);
      throw new Error('Failed to generate answer');
    }
  }

  private formatAnswer(answer: string, category: string): string {
    // Clean up the answer
    answer = answer.trim();
    
    // Remove any quotes if the AI wrapped the answer in quotes
    if ((answer.startsWith('"') && answer.endsWith('"')) || 
        (answer.startsWith("'") && answer.endsWith("'"))) {
      answer = answer.slice(1, -1);
    }
    
    // Ensure proper formatting based on category
    switch (category) {
      case 'experience':
      case 'skills':
        // These should be specific and factual
        if (answer.length > 500) {
          // Truncate if too long but keep it substantial
          const sentences = answer.split('. ');
          answer = sentences.slice(0, 4).join('. ');
          if (!answer.endsWith('.')) answer += '.';
        }
        break;
        
      case 'behavioral':
        // These need more detail for STAR format responses
        if (answer.length > 800) {
          const sentences = answer.split('. ');
          answer = sentences.slice(0, 6).join('. ');
          if (!answer.endsWith('.')) answer += '.';
        }
        break;
        
      case 'company':
        // "Why do you want to work here" needs good detail
        if (answer.length > 600) {
          const sentences = answer.split('. ');
          answer = sentences.slice(0, 5).join('. ');
          if (!answer.endsWith('.')) answer += '.';
        }
        break;
        
      case 'other':
        // Keep these moderately detailed
        if (answer.length > 400) {
          const sentences = answer.split('. ');
          answer = sentences.slice(0, 3).join('. ');
          if (!answer.endsWith('.')) answer += '.';
        }
        break;
    }
    
    return answer;
  }

  async generateBulkAnswers(
    questions: Array<{ question: string; category?: string }>,
    resumeContent: string,
    jobContext?: JobContext
  ): Promise<Array<{ question: string; answer: string; category: string }>> {
    const results = await Promise.all(
      questions.map(async (q) => {
        try {
          const answer = await this.generateAnswer(q.question, resumeContent, jobContext);
          const category = q.category || detectQuestionCategory(q.question);
          
          return {
            question: q.question,
            answer,
            category
          };
        } catch (error) {
          console.error(`Error answering question "${q.question}":`, error);
          return {
            question: q.question,
            answer: 'Unable to generate answer at this time.',
            category: q.category || 'other'
          };
        }
      })
    );
    
    return results;
  }
}

export const questionAnswerer = new QuestionAnswerer();