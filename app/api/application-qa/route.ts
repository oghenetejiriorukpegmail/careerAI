import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getSupabaseAdminClient } from '@/lib/supabase/server-client';
import { rateLimitPresets } from '@/lib/middleware/rate-limit';
import { generateApplicationResponse } from '@/lib/ai/application-qa';
import { ParsedJobDescription, ParsedResume } from '@/lib/documents/document-parser';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitPresets.aiGeneration(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to use Q&A feature.'
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    const body = await request.json();
    const { question, jobDescriptionId, resumeId, coverLetterId } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ 
        error: 'Question is required and must be a string' 
      }, { status: 400 });
    }

    if (!jobDescriptionId) {
      return NextResponse.json({ 
        error: 'Job description ID is required' 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database connection not available' 
      }, { status: 500 });
    }

    // Fetch job description
    const { data: jobData, error: jobError } = await supabase
      .from('job_descriptions')
      .select('*')
      .eq('id', jobDescriptionId)
      .single();

    if (jobError || !jobData) {
      console.error('Error fetching job data:', jobError);
      return NextResponse.json({ 
        error: 'Job description not found',
        details: jobError?.message 
      }, { status: 404 });
    }

    // Verify the job belongs to the user
    if (jobData.user_id !== userId && jobData.user_id !== 'session-' + userId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'This job description does not belong to you.'
      }, { status: 403 });
    }

    // Fetch resume data
    let resumeData: ParsedResume | null = null;
    if (resumeId) {
      const { data: resume, error: resumeError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .eq('user_id', userId)
        .single();

      if (resumeError || !resume) {
        console.error('Error fetching resume:', resumeError);
        return NextResponse.json({ 
          error: 'Resume not found',
          details: resumeError?.message 
        }, { status: 404 });
      }

      resumeData = resume.parsed_data;
    } else {
      // Use the latest resume if no resumeId provided
      const { data: resumes, error: resumesError } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (resumesError || !resumes || resumes.length === 0) {
        return NextResponse.json({ 
          error: 'No resume found',
          message: 'Please upload a resume first.'
        }, { status: 404 });
      }

      resumeData = resumes[0].parsed_data;
    }

    // Fetch cover letter data if provided
    let coverLetterContent: string | null = null;
    if (coverLetterId) {
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', coverLetterId)
        .eq('user_id', userId)
        .single();

      if (docError || !document) {
        console.error('Error fetching cover letter:', docError);
        // Continue without cover letter - it's optional
      } else {
        // Extract text content from the document
        coverLetterContent = document.metadata?.content || null;
      }
    }

    // Generate response using AI
    const response = await generateApplicationResponse({
      question,
      jobDescription: jobData.parsed_data as ParsedJobDescription,
      resume: resumeData,
      coverLetter: coverLetterContent,
      companyName: jobData.company_name || 'the company',
      jobTitle: jobData.job_title || 'the position',
      userId
    });

    // Store the Q&A in the database for future reference
    const { error: insertError } = await supabase
      .from('application_qa_history')
      .insert({
        user_id: userId,
        job_description_id: jobDescriptionId,
        resume_id: resumeId || null,
        cover_letter_id: coverLetterId || null,
        question,
        answer: response.answer,
        confidence_score: response.confidenceScore,
        metadata: {
          keyPointsUsed: response.keyPointsUsed,
          suggestedFollowUp: response.suggestedFollowUp
        }
      });

    if (insertError) {
      console.error('Error storing Q&A history:', insertError);
      // Continue - this is not critical
    }

    return NextResponse.json({
      success: true,
      response
    });

  } catch (error) {
    console.error('[APPLICATION Q&A] Error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate response',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// GET endpoint to retrieve Q&A history
export async function GET(request: NextRequest) {
  try {
    const supabaseClient = createServerClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const jobDescriptionId = searchParams.get('jobDescriptionId');

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database connection not available' 
      }, { status: 500 });
    }

    let query = supabase
      .from('application_qa_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (jobDescriptionId) {
      query = query.eq('job_description_id', jobDescriptionId);
    }

    const { data: history, error } = await query.limit(50);

    if (error) {
      console.error('Error fetching Q&A history:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch Q&A history',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      history: history || []
    });

  } catch (error) {
    console.error('[APPLICATION Q&A GET] Error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch Q&A history',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}