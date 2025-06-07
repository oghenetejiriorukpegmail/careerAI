import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { queryAI } from '@/lib/ai/config';
import { loadServerSettings } from '@/lib/ai/settings-loader';
import { createServerClient } from '@/lib/supabase/server-client';

// Helper function to calculate years of experience
function calculateYearsOfExperience(experience: any[]): number {
  if (!experience || experience.length === 0) return 0;
  
  let earliestYear = new Date().getFullYear();
  let latestYear = 0;
  
  experience.forEach((exp: any) => {
    if (exp.duration) {
      // Extract years from duration string (e.g., "2019 - 2021" or "Jan 2019 - Present")
      const yearMatches = exp.duration.match(/\b(19|20)\d{2}\b/g);
      if (yearMatches) {
        yearMatches.forEach((year: string) => {
          const yearNum = parseInt(year);
          if (yearNum < earliestYear) earliestYear = yearNum;
          if (yearNum > latestYear) latestYear = yearNum;
        });
      }
      if (exp.duration.toLowerCase().includes('present')) {
        latestYear = new Date().getFullYear();
      }
    }
  });
  
  return latestYear > 0 ? latestYear - earliestYear : 0;
}

// Helper function to extract industries from experience
function extractIndustries(experience: any[]): string {
  if (!experience || experience.length === 0) return 'Various industries';
  
  const companies = experience
    .slice(0, 3)
    .map((exp: any) => exp.company)
    .filter(Boolean);
  
  return companies.length > 0 ? companies.join(', ') : 'Various industries';
}

// Helper function to extract key achievements from experience
function extractKeyAchievements(experience: any[]): string[] {
  if (!experience || experience.length === 0) return [];
  
  const achievements: string[] = [];
  
  // Look for bullet points with quantifiable results
  experience.slice(0, 3).forEach((exp: any) => {
    if (exp.description) {
      const descriptions = Array.isArray(exp.description) ? exp.description : [exp.description];
      
      descriptions.forEach((desc: string) => {
        // Look for achievements with numbers, percentages, or result indicators
        if (desc.match(/\d+%|\$[\d,]+|increased|decreased|improved|reduced|saved|generated|led|managed/i)) {
          achievements.push(desc.substring(0, 100) + (desc.length > 100 ? '...' : ''));
        }
      });
    }
  });
  
  return achievements.slice(0, 3); // Return top 3 achievements
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { sectionTitle, content, instructions, fullResumeData } = await request.json();

    if (!sectionTitle || !content) {
      return NextResponse.json(
        { error: 'Section title and content are required' },
        { status: 400 }
      );
    }
    
    // Extract key information from full resume for context
    const resumeContext = fullResumeData ? {
      name: fullResumeData.name || 'Unknown',
      currentRole: fullResumeData.experience?.[0]?.title || 'Professional',
      yearsOfExperience: calculateYearsOfExperience(fullResumeData.experience),
      skills: fullResumeData.skills?.slice(0, 10).join(', ') || 'Various skills',
      education: fullResumeData.education?.[0]?.degree || 'Degree',
      industries: extractIndustries(fullResumeData.experience)
    } : null;

    // Get user's AI settings
    let settings = loadServerSettings();
    
    try {
      const supabaseServer = createServerClient();
      const { data: settingsRow } = await supabaseServer
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();
        
      if (settingsRow?.settings) {
        settings = settingsRow.settings;
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
    
    // Create section-specific prompts for better results
    let sectionGuidelines = '';
    
    switch (sectionTitle.toLowerCase()) {
      case 'professional summary':
      case 'summary':
        sectionGuidelines = `
- Keep it to 2-4 sentences
- Highlight key skills and years of experience
- Include 1-2 major achievements
- Use strong action words
- Avoid first-person pronouns${
  resumeContext ? `
- Reference their ${resumeContext.yearsOfExperience}+ years of experience
- Highlight expertise in ${resumeContext.skills}
- Position them as a ${resumeContext.currentRole} with proven track record` : ''
}`;
        break;
        
      case 'experience':
      case 'work experience':
        sectionGuidelines = `
- Start each bullet with a strong action verb
- Quantify achievements with numbers, percentages, or metrics
- Focus on results and impact, not just duties
- Use industry-specific keywords
- Keep bullets concise (1-2 lines each)
- Maintain chronological order`;
        break;
        
      case 'skills':
        sectionGuidelines = `
- Group related skills logically
- Prioritize most relevant skills
- Use industry-standard terminology
- Balance technical and soft skills${
  resumeContext ? `
- Ensure skills align with ${resumeContext.yearsOfExperience}+ years of experience
- Include skills relevant to ${resumeContext.industries}
- Maintain consistency with technologies mentioned in experience section` : ''
}`;
        break;
        
      case 'education':
        sectionGuidelines = `
- Include relevant coursework if recent graduate
- Highlight academic achievements (GPA if 3.5+, honors, etc.)
- Keep entries concise and formatted consistently`;
        break;
        
      default:
        sectionGuidelines = `
- Use clear, professional language
- Be concise and impactful
- Focus on relevance to career goals`;
    }
    
    const systemPrompt = `You are an expert resume writer specializing in creating ATS-optimized, professional resume content. 
${resumeContext ? `
RESUME CONTEXT:
- Candidate: ${resumeContext.name}
- Current/Recent Role: ${resumeContext.currentRole}
- Years of Experience: ${resumeContext.yearsOfExperience}+ years
- Key Skills: ${resumeContext.skills}
- Education: ${resumeContext.education}
- Industry Experience: ${resumeContext.industries}

Use this context to ensure the rewritten section aligns with the overall resume narrative and maintains consistency in tone, level of seniority, and industry focus.
` : ''}
Your task is to rewrite the given resume section while maintaining the factual information but improving:
- Clarity and conciseness
- Professional tone
- Action-oriented language
- ATS keyword optimization
- Quantifiable achievements where possible
- Consistency with the candidate's overall experience level and career trajectory

Section-specific guidelines for ${sectionTitle}:${sectionGuidelines}

Important guidelines:
- Preserve ALL factual information (dates, companies, roles, technologies, etc.)
- Do not add information that wasn't in the original
- Maintain the same general structure and format
- If the input is a list of items (like bullet points), return a list with the same number of items
- Focus on making the content more impactful and professional
- Ensure the language matches the seniority level (${resumeContext?.yearsOfExperience || 0}+ years of experience)
- Use industry-appropriate terminology`;

    const userPrompt = `Please rewrite the following "${sectionTitle}" section of a resume:

Current Content:
${content}

${instructions ? `Additional Instructions: ${instructions}` : 'Focus on making it more professional, concise, and impactful.'}

${resumeContext ? `Remember to:
- Align the language with someone who has ${resumeContext.yearsOfExperience}+ years of experience
- Maintain consistency with their role as a ${resumeContext.currentRole}
- Use terminology appropriate for ${resumeContext.industries}
- Ensure the tone matches their level of seniority and expertise` : ''}

Provide only the rewritten content without any explanations or meta-commentary.`;

    // Generate the rewritten content
    const response = await queryAI(userPrompt, systemPrompt, settings, 'rewrite_section');
    
    if (!response || !response.choices || !response.choices[0]?.message?.content) {
      throw new Error('Failed to generate rewritten content');
    }
    
    const rewrittenContent = response.choices[0].message.content.trim();

    return NextResponse.json({
      rewrittenContent,
      sectionTitle,
    });

  } catch (error) {
    console.error('Error in rewrite-section API:', error);
    return NextResponse.json(
      { error: 'Failed to rewrite section' },
      { status: 500 }
    );
  }
}