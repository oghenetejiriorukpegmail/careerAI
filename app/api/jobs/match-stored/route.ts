import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { getSupabaseAdminClient } from '@/lib/supabase/client';
import { JobMatcher } from '@/lib/jobs/job-matcher';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabaseClient = createServerClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { resumeId, jobDescriptionIds, matchAll } = await request.json();
    
    // Log request data for debugging
    
    if (!resumeId) {
      return NextResponse.json({ 
        error: 'Resume ID is required'
      }, { status: 400 });
    }
    
    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdminClient();
    
    // First, let's check what resumes this user has
    const { data: allResumes } = await adminSupabase
      .from('resumes')
      .select('id, file_name, user_id')
      .eq('user_id', userId);
    
    // Check user resumes
    
    // Fetch the selected resume
    // Fetch the selected resume
    
    const { data: resume, error: resumeError } = await adminSupabase
      .from('resumes')
      .select('id, file_name, parsed_data')
      .eq('id', resumeId)
      .eq('user_id', userId)
      .single();
      
    if (resumeError || !resume) {
      // Resume not found or error occurred
      return NextResponse.json({ 
        error: 'Resume not found'
      }, { status: 404 });
    }
    
    if (!resume.parsed_data) {
      return NextResponse.json({ 
        error: 'Resume has not been parsed yet'
      }, { status: 400 });
    }
    
    // Fetch job descriptions
    let jobQuery = adminSupabase
      .from('job_descriptions')
      .select('*')
      .eq('user_id', userId)
      .not('parsed_data', 'is', null);
      
    if (!matchAll && jobDescriptionIds?.length > 0) {
      jobQuery = jobQuery.in('id', jobDescriptionIds);
    }
    
    const { data: jobDescriptions, error: jobsError } = await jobQuery;
    
    if (jobsError) {
      // Error fetching job descriptions
      return NextResponse.json({ 
        error: 'Failed to fetch job descriptions'
      }, { status: 500 });
    }
    
    if (!jobDescriptions || jobDescriptions.length === 0) {
      return NextResponse.json({ 
        matches: [],
        message: 'No job descriptions found to match'
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
    
    // Use configured AI model for job matching
    
    // Initialize job matcher with user settings
    const jobMatcher = new JobMatcher(userSettings);
    
    // Prepare jobs for matching
    const jobsForMatching = jobDescriptions.map((job: any) => ({
      id: job.id,
      title: job.job_title,
      company: job.company_name,
      location: job.location || 'Not specified',
      url: job.url || '',
      description: job.description,
      source: 'stored',
      requiredSkills: job.parsed_data?.required_skills || [],
      preferredSkills: job.parsed_data?.preferred_skills || [],
      technologies: job.parsed_data?.technologies || [],
      qualifications: job.parsed_data?.required_qualifications || [],
      responsibilities: job.parsed_data?.responsibilities || [],
      experienceYears: extractExperienceYears(job.parsed_data),
      educationLevel: job.parsed_data?.education_requirements?.[0] || '',
      employmentType: job.parsed_data?.employment_type || 'Full-time',
      salaryRange: job.parsed_data?.salary_range,
      benefits: job.parsed_data?.benefits || [],
      atsKeywords: job.parsed_data?.ats_keywords || []
    }));
    
    // Process jobs for matching
    
    // Match jobs to the selected resume in batches
    const batchSize = 5; // Process 5 jobs at a time
    let allMatches: any[] = [];
    
    for (let i = 0; i < jobsForMatching.length; i += batchSize) {
      const batch = jobsForMatching.slice(i, i + batchSize);
      // Process batch
      
      try {
        const batchMatches = await jobMatcher.matchJobsToProfile(
          resume.parsed_data,
          batch
        );
        allMatches = allMatches.concat(batchMatches);
      } catch (batchError) {
        // Handle batch error gracefully
      }
    }
    
    const matches = allMatches;
    
    // Save match results to database
    // Save match results to database
    
    if (matches.length > 0) {
      // Prepare match records for database insertion
      
      const matchRecords = matches.map((match: any) => {
        // Start with minimal record
        const record: any = {
          user_id: userId,
          resume_id: resumeId,
          job_description_id: match.jobId,
          match_score: match.matchScore || match.relevanceScore || 0
        };
        
        // Add optional fields if they exist
        if (match.skillsScore !== undefined || match.experienceScore !== undefined) {
          record.match_breakdown = {
            skillsScore: match.skillsScore || 0,
            experienceScore: match.experienceScore || 0,
            educationScore: match.educationScore || 0,
            locationScore: match.locationScore || 0
          };
        }
        
        if (match.matchReasons && match.matchReasons.length > 0) {
          record.match_reasons = match.matchReasons;
        }
        
        if (match.missingSkills && match.missingSkills.length > 0) {
          record.missing_skills = match.missingSkills;
        }
        
        return record;
      });
      
      // Insert or update match records
      
      // Insert or update match records
      for (const record of matchRecords) {
        // First try to delete any existing record to avoid constraint issues
        await adminSupabase
          .from('job_match_results')
          .delete()
          .match({
            user_id: record.user_id,
            resume_id: record.resume_id,
            job_description_id: record.job_description_id
          });
          
        // Then insert the new record
        const { data: insertData, error: insertError } = await adminSupabase
          .from('job_match_results')
          .insert(record)
          .select();
          
        if (insertError) {
          // Log error for monitoring but continue processing
        } else {
          // Match record saved successfully
        }
      }
    }
    
    // Update match scores in job_descriptions table
    for (const match of matches) {
      const { error: updateError } = await adminSupabase
        .from('job_descriptions')
        .update({ 
          match_score: match.matchScore || match.relevanceScore || 0,
          last_matched_at: new Date().toISOString(),
          matched_resume_id: resumeId
        })
        .eq('id', match.jobId);
        
      if (updateError) {
        // Continue even if score update fails
      }
    }
    
    // Verify matches were saved
    const { count: savedCount } = await adminSupabase
      .from('job_match_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
      
    // Return match results
    
    return NextResponse.json({
      success: true,
      matches: matches.sort((a, b) => (b.matchScore || b.relevanceScore) - (a.matchScore || a.relevanceScore)),
      resumeUsed: {
        id: resume.id,
        fileName: resume.file_name
      },
      totalJobsAnalyzed: jobDescriptions.length,
      totalMatches: matches.length,
      savedMatches: savedCount,
      aiModel: `${userSettings.aiProvider}/${userSettings.aiModel}`
    });
    
  } catch (error) {
    // Handle unexpected errors
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function extractExperienceYears(parsedData: any): number {
  if (!parsedData) return 0;
  
  // Try to extract years from various fields
  const experienceText = parsedData.experience_required || 
                        parsedData.required_qualifications?.join(' ') || 
                        '';
                        
  const yearMatch = experienceText.match(/(\d+)\+?\s*years?/i);
  return yearMatch ? parseInt(yearMatch[1]) : 0;
}