import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';
import { JobMatcher } from '@/lib/jobs/job-matcher';

export async function POST(request: NextRequest) {
  try {
    const { jobDescriptionId } = await request.json();
    
    if (!jobDescriptionId) {
      return NextResponse.json({ 
        error: 'Job description ID is required'
      }, { status: 400 });
    }
    
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    const adminSupabase = getSupabaseAdminClient();
    
    // Get the job description
    const { data: jobDescription, error: jobError } = await adminSupabase
      .from('job_descriptions')
      .select('*')
      .eq('id', jobDescriptionId)
      .eq('user_id', userId)
      .single();
      
    if (jobError || !jobDescription) {
      return NextResponse.json({ 
        error: 'Job description not found'
      }, { status: 404 });
    }
    
    if (!jobDescription.parsed_data) {
      return NextResponse.json({ 
        error: 'Job description has not been parsed yet'
      }, { status: 400 });
    }
    
    // Get user's primary resume
    const { data: primaryResume } = await adminSupabase
      .from('resumes')
      .select('id, parsed_content')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();
      
    if (!primaryResume || !primaryResume.parsed_content) {
      return NextResponse.json({ 
        message: 'No primary resume found or resume not parsed',
        matchScore: null
      });
    }
    
    // Get user's AI model preference
    const { data: settingsRow } = await adminSupabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();
      
    const userSettings = settingsRow?.settings || {
      aiProvider: 'openrouter',
      aiModel: 'qwen/qwq-32b-preview'
    };
    
    // Initialize job matcher with user settings
    const jobMatcher = new JobMatcher(userSettings);
    
    // Calculate detailed match score
    const matchScore = jobMatcher.calculateDetailedMatchScore(
      primaryResume.parsed_content,
      jobDescription.parsed_data
    );
    
    // Update job description with match score
    const { error: updateError } = await adminSupabase
      .from('job_descriptions')
      .update({ 
        match_score: matchScore.score,
        last_matched_at: new Date().toISOString(),
        matched_resume_id: primaryResume.id
      })
      .eq('id', jobDescriptionId);
      
    if (updateError) {
      console.error('Error updating match score:', updateError);
    }
    
    // Save match result
    await adminSupabase
      .from('job_match_results')
      .upsert({
        user_id: userId,
        resume_id: primaryResume.id,
        job_description_id: jobDescriptionId,
        match_score: matchScore.score,
        match_breakdown: matchScore.breakdown,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,resume_id,job_description_id'
      });
    
    return NextResponse.json({
      success: true,
      matchScore: matchScore.score,
      breakdown: matchScore.breakdown,
      resumeId: primaryResume.id
    });
    
  } catch (error) {
    console.error('Error calculating match score:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}