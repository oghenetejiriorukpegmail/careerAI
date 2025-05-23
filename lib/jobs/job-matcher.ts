import { queryAIJson } from '@/lib/ai/ai-service';
import { ParsedResume } from '@/lib/documents/document-parser';

export interface JobMatch {
  jobId: string;
  title: string;
  company: string;
  location: string;
  matchScore: number; // 0-100
  matchReasons: string[];
  missingSkills: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  jobType?: string;
  postedDate?: string;
  url?: string;
}

export interface JobMatchingCriteria {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears: number;
  educationLevel?: string;
  jobTypes?: string[];
  locations?: string[];
  salaryMin?: number;
  remotePreference?: 'remote' | 'hybrid' | 'onsite' | 'any';
}

export class JobMatcher {
  async matchJobsToProfile(
    userProfile: ParsedResume,
    jobs: any[],
    criteria?: Partial<JobMatchingCriteria>
  ): Promise<JobMatch[]> {
    const systemPrompt = `You are an expert job matching AI. Analyze the user profile and job descriptions to determine match scores.
    
    Consider these factors:
    1. Skills match (both required and preferred)
    2. Experience level alignment
    3. Location preferences
    4. Salary expectations
    5. Job type preferences
    6. Career progression fit
    
    Return a JSON array of matched jobs with scores and detailed reasons.`;
    
    const prompt = `
    User Profile:
    ${JSON.stringify({
      skills: userProfile.skills,
      experience: userProfile.experience,
      education: userProfile.education,
      summary: userProfile.summary,
    }, null, 2)}
    
    Matching Criteria:
    ${JSON.stringify(criteria || {}, null, 2)}
    
    Jobs to Match:
    ${JSON.stringify(jobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      requirements: job.requirements,
      salary: job.salary,
      jobType: job.jobType,
      postedDate: job.postedDate,
      url: job.url,
    })), null, 2)}
    
    Analyze each job and return matches with scores above 60%. Include:
    - matchScore (0-100)
    - matchReasons (array of specific reasons why it's a good match)
    - missingSkills (skills the job requires that the user doesn't have)
    `;
    
    try {
      const matches = await queryAIJson<JobMatch[]>(prompt, systemPrompt);
      
      // Sort by match score descending
      return matches
        .filter(match => match.matchScore >= 60)
        .sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error('Error matching jobs:', error);
      throw new Error('Failed to match jobs to profile');
    }
  }
  
  async extractMatchingCriteria(userProfile: ParsedResume): Promise<JobMatchingCriteria> {
    const systemPrompt = `Extract job matching criteria from a user's resume profile.`;
    
    const prompt = `
    Based on this resume profile, extract job matching criteria:
    
    ${JSON.stringify(userProfile, null, 2)}
    
    Return a JSON object with:
    - requiredSkills: Array of must-have skills based on their experience
    - preferredSkills: Array of nice-to-have skills
    - experienceYears: Number of years of experience
    - educationLevel: Highest education level
    - jobTypes: Preferred job types (full-time, contract, etc.)
    - locations: Preferred locations (if mentioned)
    - salaryMin: Minimum expected salary (if determinable from seniority)
    - remotePreference: remote/hybrid/onsite/any
    `;
    
    try {
      return await queryAIJson<JobMatchingCriteria>(prompt, systemPrompt);
    } catch (error) {
      console.error('Error extracting matching criteria:', error);
      
      // Return default criteria based on profile
      return {
        requiredSkills: userProfile.skills || [],
        preferredSkills: [],
        experienceYears: this.calculateExperienceYears(userProfile),
        educationLevel: userProfile.education?.[0]?.degree,
        jobTypes: ['full-time'],
        locations: [],
        remotePreference: 'any',
      };
    }
  }
  
  private calculateExperienceYears(profile: ParsedResume): number {
    if (!profile.experience?.length) return 0;
    
    const sortedExperience = [...profile.experience].sort((a, b) => {
      const dateA = new Date(a.startDate || 0).getTime();
      const dateB = new Date(b.startDate || 0).getTime();
      return dateA - dateB;
    });
    
    const firstJob = sortedExperience[0];
    if (!firstJob.startDate) return 0;
    
    const startYear = new Date(firstJob.startDate).getFullYear();
    const currentYear = new Date().getFullYear();
    
    return currentYear - startYear;
  }
  
  calculateDetailedMatchScore(
    userProfile: ParsedResume,
    jobRequirements: any
  ): {
    score: number;
    breakdown: {
      skillsScore: number;
      experienceScore: number;
      educationScore: number;
      locationScore: number;
    };
  } {
    const breakdown = {
      skillsScore: this.calculateSkillsMatch(userProfile, jobRequirements),
      experienceScore: this.calculateExperienceMatch(userProfile, jobRequirements),
      educationScore: this.calculateEducationMatch(userProfile, jobRequirements),
      locationScore: this.calculateLocationMatch(userProfile, jobRequirements),
    };
    
    // Weighted average
    const weights = {
      skills: 0.4,
      experience: 0.3,
      education: 0.2,
      location: 0.1,
    };
    
    const score = 
      breakdown.skillsScore * weights.skills +
      breakdown.experienceScore * weights.experience +
      breakdown.educationScore * weights.education +
      breakdown.locationScore * weights.location;
    
    return {
      score: Math.round(score),
      breakdown,
    };
  }
  
  private calculateSkillsMatch(profile: ParsedResume, requirements: any): number {
    const userSkills = new Set(
      (profile.skills || []).map(s => s.toLowerCase())
    );
    
    const requiredSkills = (requirements.requiredSkills || []).map((s: string) => s.toLowerCase());
    const preferredSkills = (requirements.preferredSkills || []).map((s: string) => s.toLowerCase());
    
    if (requiredSkills.length === 0) return 100;
    
    const requiredMatches = requiredSkills.filter((skill: string) => userSkills.has(skill)).length;
    const preferredMatches = preferredSkills.filter((skill: string) => userSkills.has(skill)).length;
    
    const requiredScore = (requiredMatches / requiredSkills.length) * 80;
    const preferredScore = preferredSkills.length > 0 
      ? (preferredMatches / preferredSkills.length) * 20
      : 20;
    
    return Math.round(requiredScore + preferredScore);
  }
  
  private calculateExperienceMatch(profile: ParsedResume, requirements: any): number {
    const userYears = this.calculateExperienceYears(profile);
    const requiredYears = requirements.experienceYears || 0;
    
    if (userYears >= requiredYears) return 100;
    if (userYears >= requiredYears * 0.8) return 80;
    if (userYears >= requiredYears * 0.6) return 60;
    
    return Math.max(0, 40 - (requiredYears - userYears) * 10);
  }
  
  private calculateEducationMatch(profile: ParsedResume, requirements: any): number {
    if (!requirements.educationLevel) return 100;
    
    const educationLevels = {
      'high school': 1,
      'associate': 2,
      'bachelor': 3,
      'master': 4,
      'phd': 5,
      'doctorate': 5,
    };
    
    const userLevel = profile.education?.[0]?.degree?.toLowerCase() || '';
    const requiredLevel = requirements.educationLevel.toLowerCase();
    
    const userScore = Object.entries(educationLevels).find(([key]) => 
      userLevel.includes(key)
    )?.[1] || 0;
    
    const requiredScore = educationLevels[requiredLevel as keyof typeof educationLevels] || 3;
    
    if (userScore >= requiredScore) return 100;
    if (userScore === requiredScore - 1) return 80;
    
    return Math.max(0, 60 - (requiredScore - userScore) * 20);
  }
  
  private calculateLocationMatch(profile: ParsedResume, requirements: any): number {
    if (!requirements.location) return 100;
    
    const userLocation = profile.contactInfo?.location?.toLowerCase() || '';
    const jobLocation = requirements.location.toLowerCase();
    
    // Check for remote options
    if (jobLocation.includes('remote') || requirements.remote) return 100;
    
    // Check for exact match
    if (userLocation && jobLocation.includes(userLocation)) return 100;
    
    // Check for same state/country
    const userParts = userLocation.split(',').map((p: string) => p.trim());
    const jobParts = jobLocation.split(',').map((p: string) => p.trim());
    
    if (userParts.some((part: string) => jobParts.includes(part))) return 80;
    
    return 50; // Different location
  }
}

export const jobMatcher = new JobMatcher();