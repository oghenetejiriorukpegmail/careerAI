import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-client';
import { jobMatcher } from '@/lib/jobs/job-matcher';
import { jobScraper } from '@/lib/jobs/job-scraper';
import { rateLimitPresets } from '@/lib/middleware/rate-limit';
import { z } from 'zod';
import { safeValidateInput } from '@/lib/validation/schemas';

const jobMatchSchema = z.object({
  keywords: z.array(z.string()).min(1).max(10),
  location: z.string().optional(),
  radius: z.number().min(0).max(100).optional(),
  jobTypes: z.array(z.enum(['full-time', 'part-time', 'contract', 'internship', 'remote'])).optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
  remote: z.boolean().optional(),
  salaryMin: z.number().min(0).optional(),
  datePosted: z.enum(['day', 'week', 'month']).optional(),
  limit: z.number().min(1).max(50).optional(),
});

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitPresets.general(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  try {
    // Validate input
    const body = await request.json();
    const validation = safeValidateInput(jobMatchSchema, body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', message: validation.error },
        { status: 400 }
      );
    }
    
    const params = validation.data;
    
    // Get user session
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get user's resume profile
    const { data: resumeData, error: resumeError } = await supabase
      .from('resumes')
      .select('parsed_content')
      .eq('user_id', session.user.id)
      .eq('is_primary', true)
      .single();
    
    if (resumeError || !resumeData) {
      return NextResponse.json(
        { error: 'No primary resume found. Please upload a resume first.' },
        { status: 404 }
      );
    }
    
    const userProfile = resumeData.parsed_content;
    
    // Search for jobs
    const jobs = await jobScraper.searchJobs({
      keywords: params.keywords,
      location: params.location,
      radius: params.radius,
      jobType: params.jobTypes,
      experienceLevel: params.experienceLevel,
      remote: params.remote,
      salary: params.salaryMin ? { min: params.salaryMin, currency: 'USD' } : undefined,
      datePosted: params.datePosted,
      limit: params.limit || 20,
    });
    
    if (jobs.length === 0) {
      return NextResponse.json({
        matches: [],
        message: 'No jobs found matching your criteria.',
      });
    }
    
    // Extract matching criteria from user profile
    const criteria = await jobMatcher.extractMatchingCriteria(userProfile);
    
    // Match jobs to profile
    const matches = await jobMatcher.matchJobsToProfile(
      userProfile,
      jobs,
      {
        ...criteria,
        locations: params.location ? [params.location] : criteria.locations,
        jobTypes: params.jobTypes || criteria.jobTypes,
        salaryMin: params.salaryMin || criteria.salaryMin,
      }
    );
    
    // Save top matches to database for tracking
    if (matches.length > 0) {
      const jobOpportunities = matches.slice(0, 10).map(match => ({
        user_id: session.user.id,
        job_title: match.title,
        company: match.company,
        location: match.location,
        match_score: match.matchScore,
        match_reasons: match.matchReasons,
        missing_skills: match.missingSkills,
        job_url: match.url,
        source: 'job_matcher',
        status: 'new',
        created_at: new Date().toISOString(),
      }));
      
      const { error: insertError } = await supabase
        .from('job_opportunities')
        .insert(jobOpportunities);
      
      if (insertError) {
        console.error('Error saving job opportunities:', insertError);
      }
    }
    
    return NextResponse.json({
      matches: matches.slice(0, params.limit || 20),
      totalFound: jobs.length,
      criteria,
    });
    
  } catch (error) {
    console.error('Job matching error:', error);
    return NextResponse.json(
      { error: 'Failed to match jobs', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}