import { queryAI } from './config';
import { ParsedResume, ParsedJobDescription } from '../documents/document-parser';
import { UserSettings } from '@/lib/utils/settings';

export interface ApplicationQAResponse {
  answer: string;
  confidenceScore: number;
  keyPointsUsed: string[];
  suggestedFollowUp?: string;
}

interface ApplicationQAParams {
  question: string;
  jobDescription: ParsedJobDescription;
  resume: ParsedResume;
  coverLetter?: string | null;
  companyName: string;
  jobTitle: string;
  userId?: string;
}

/**
 * Generate a professional response to job application questions
 * Based ONLY on actual information from the resume and cover letter
 */
export async function generateApplicationResponse(params: ApplicationQAParams): Promise<ApplicationQAResponse> {
  const { 
    question, 
    jobDescription, 
    resume, 
    coverLetter, 
    companyName, 
    jobTitle,
    userId 
  } = params;

  try {
    // Create a comprehensive context from all documents
    const context = {
      resume: resume,
      jobDescription: jobDescription,
      coverLetter: coverLetter || 'No cover letter provided',
      company: companyName,
      position: jobTitle
    };

    const prompt = `
      You are helping a job applicant answer interview questions professionally.
      
      CONTEXT:
      - Position: ${jobTitle} at ${companyName}
      - Applicant's Resume: ${JSON.stringify(resume, null, 2)}
      - Job Requirements: ${JSON.stringify(jobDescription, null, 2)}
      - Cover Letter: ${coverLetter || 'Not provided'}
      
      QUESTION: "${question}"
      
      Generate a professional response that:
      1. Directly answers the question
      2. Uses ONLY factual information from the provided documents
      3. Highlights relevant experience and skills
      4. Is concise but comprehensive (2-4 paragraphs)
      5. Sounds natural and conversational, not robotic
      
      CRITICAL RULES:
      - Use ONLY information that exists in the provided documents
      - DO NOT invent any experiences, skills, or achievements
      - If the resume lacks direct experience, focus on transferable skills
      - Be honest about limitations while maintaining a positive tone
      - Every claim must be verifiable from the documents
      
      Return a JSON object with this structure:
      {
        "answer": "The complete response to the question",
        "confidenceScore": 0.0 to 1.0 (how well the answer is supported by the documents),
        "keyPointsUsed": ["List of specific points from resume/cover letter used"],
        "suggestedFollowUp": "Optional: A related question the applicant might want to prepare for"
      }
    `;

    const systemPrompt = `
      You are an expert career coach helping job applicants prepare professional, truthful responses to interview questions.
      
      ABSOLUTE REQUIREMENTS:
      1. TRUTHFULNESS: Never fabricate or embellish information
      2. Use ONLY facts from the provided resume and cover letter
      3. If asked about something not in the documents, acknowledge the limitation professionally
      4. Focus on transferable skills when direct experience is lacking
      5. Maintain a confident, professional tone while being honest
      
      RESPONSE GUIDELINES:
      - Start with a direct answer to the question
      - Support with specific examples from the resume
      - Connect experiences to the job requirements when relevant
      - End with forward-looking enthusiasm when appropriate
      
      CONFIDENCE SCORING:
      - 0.9-1.0: Answer fully supported by strong, directly relevant experience
      - 0.7-0.8: Answer well-supported with relevant but not exact matches
      - 0.5-0.6: Answer partially supported, using transferable skills
      - 0.3-0.4: Limited support, focusing on potential and willingness to learn
      - 0.0-0.2: Very limited relevant information available
      
      Remember: The applicant must be able to expand on every point in a real interview.
      
      Return valid JSON only, no markdown formatting.
    `;

    // Load user settings if userId provided
    let userSettings;
    if (userId) {
      try {
        const { createServiceRoleClient } = await import('../supabase/server-client');
        const supabase = createServiceRoleClient();
        
        const { data: settingsRow } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', userId)
          .single();
          
        if (settingsRow?.settings) {
          userSettings = settingsRow.settings;
          console.log('[APPLICATION Q&A] Loaded user-specific settings');
        }
      } catch (error) {
        console.error('[APPLICATION Q&A] Error loading user settings:', error);
      }
    }

    // Call the AI service
    const response = await queryAI(prompt, systemPrompt, userSettings, 'application_qa');
    
    // Parse the response
    let parsedResponse: ApplicationQAResponse;
    let content: string;
    
    if (response && typeof response === 'object' && response.choices && response.choices.length > 0) {
      content = response.choices[0].message.content;
    } else if (typeof response === 'string') {
      content = response;
    } else {
      throw new Error('Invalid AI response format');
    }

    // Clean and parse JSON response
    content = cleanAIJsonResponse(content);
    
    try {
      parsedResponse = JSON.parse(content);
      
      // Validate response structure
      if (!parsedResponse.answer || typeof parsedResponse.answer !== 'string') {
        throw new Error('Invalid response structure: missing answer');
      }
      
      // Ensure confidence score is within range
      if (typeof parsedResponse.confidenceScore !== 'number' || 
          parsedResponse.confidenceScore < 0 || 
          parsedResponse.confidenceScore > 1) {
        parsedResponse.confidenceScore = 0.5; // Default to medium confidence
      }
      
      // Ensure keyPointsUsed is an array
      if (!Array.isArray(parsedResponse.keyPointsUsed)) {
        parsedResponse.keyPointsUsed = [];
      }
      
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw content:', content);
      
      // Fallback response
      parsedResponse = {
        answer: "I apologize, but I'm having trouble generating a response. Please try rephrasing your question or ensure your resume and job description are properly uploaded.",
        confidenceScore: 0,
        keyPointsUsed: [],
        suggestedFollowUp: "Could you provide more specific details about what you'd like to know?"
      };
    }

    return parsedResponse;

  } catch (error) {
    console.error('Error generating application response:', error);
    throw new Error('Failed to generate response for the question');
  }
}

// Helper function to clean AI JSON responses (reused from document-generator)
function cleanAIJsonResponse(content: string): string {
  let cleanedContent = content;
  
  // Remove markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  const codeBlockMatch = codeBlockRegex.exec(cleanedContent);
  if (codeBlockMatch) {
    cleanedContent = codeBlockMatch[1].trim();
  }
  
  // Extract JSON from explanatory text
  const jsonStart = cleanedContent.indexOf('{');
  const jsonEnd = cleanedContent.lastIndexOf('}');
  if (jsonStart > 0 && jsonEnd > jsonStart) {
    cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
  }
  
  // Remove JavaScript-style comments
  cleanedContent = cleanedContent
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  
  return cleanedContent.trim();
}

/**
 * Generate common interview questions based on job description
 */
export async function generateSuggestedQuestions(
  jobDescription: ParsedJobDescription,
  userId?: string
): Promise<string[]> {
  const prompt = `
    Based on this job description, suggest 5-7 common interview questions an applicant might face:
    
    Job Title: ${jobDescription.jobTitle}
    Company: ${jobDescription.company}
    Requirements: ${JSON.stringify(jobDescription.requirements)}
    Responsibilities: ${JSON.stringify(jobDescription.responsibilities)}
    
    Return ONLY a JSON array of question strings, no explanations.
    Focus on behavioral, situational, and role-specific questions.
  `;

  const systemPrompt = `
    You are an expert recruiter who knows what questions are commonly asked in interviews.
    Generate realistic, professional interview questions that would be asked for this specific role.
    Include a mix of:
    - Behavioral questions (Tell me about a time...)
    - Situational questions (How would you handle...)
    - Role-specific technical questions
    - Culture fit questions
    
    Return ONLY a JSON array of strings.
  `;

  try {
    // Load user settings if provided
    let userSettings;
    if (userId) {
      try {
        const { createServiceRoleClient } = await import('../supabase/server-client');
        const supabase = createServiceRoleClient();
        
        const { data: settingsRow } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', userId)
          .single();
          
        if (settingsRow?.settings) {
          userSettings = settingsRow.settings;
        }
      } catch (error) {
        console.error('Error loading user settings for suggested questions:', error);
      }
    }

    const response = await queryAI(prompt, systemPrompt, userSettings, 'suggested_questions');
    
    let content: string;
    if (response && typeof response === 'object' && response.choices && response.choices.length > 0) {
      content = response.choices[0].message.content;
    } else if (typeof response === 'string') {
      content = response;
    } else {
      throw new Error('Invalid AI response format');
    }

    content = cleanAIJsonResponse(content);
    const questions = JSON.parse(content);
    
    if (!Array.isArray(questions)) {
      throw new Error('Response is not an array');
    }
    
    return questions.filter(q => typeof q === 'string' && q.length > 0);
    
  } catch (error) {
    console.error('Error generating suggested questions:', error);
    
    // Return default questions as fallback
    return [
      "Why are you interested in this position?",
      "Tell me about your relevant experience for this role.",
      "How do your skills align with our requirements?",
      "What makes you a good fit for our company culture?",
      "Where do you see yourself in 5 years?",
      "What are your greatest strengths and weaknesses?",
      "Do you have any questions for us?"
    ];
  }
}