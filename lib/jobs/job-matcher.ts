import { queryAIJson } from '@/lib/ai/ai-service';
import { queryAI } from '@/lib/ai/config';
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
  private userSettings?: any;
  
  constructor(userSettings?: any) {
    this.userSettings = userSettings;
  }
  
  async matchJobsToProfile(
    userProfile: ParsedResume,
    jobs: any[],
    criteria?: Partial<JobMatchingCriteria>
  ): Promise<JobMatch[]> {
    const systemPrompt = `You are an expert job matching AI. Analyze the user profile and job descriptions to determine match scores.
    
    Consider these factors:
    1. Skills match (both required and preferred) - 40% weight
    2. Experience level alignment - 30% weight
    3. Education requirements - 20% weight
    4. Location preferences - 10% weight
    5. Salary expectations (if provided)
    6. Job type preferences
    7. Career progression fit
    8. Industry/domain alignment
    
    Score each job from 0-100 based on how well it matches the candidate's profile.
    Return ALL jobs with their scores, even if below 60.
    Provide specific, actionable reasons for the match and identify key missing skills.`;
    
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
    
    Analyze each job and return matches with scores above 60%.
    
    Return an array of objects with EXACTLY this structure:
    [
      {
        "jobId": "<use the exact job.id from the input>",
        "title": "<job title>",
        "company": "<company name>",
        "location": "<location>",
        "matchScore": <number 0-100>,
        "matchReasons": ["reason 1", "reason 2", ...],
        "missingSkills": ["skill 1", "skill 2", ...],
        "skillsScore": <number 0-100>,
        "experienceScore": <number 0-100>,
        "educationScore": <number 0-100>,
        "locationScore": <number 0-100>
      }
    ]
    
    CRITICAL: The jobId MUST be the exact id from the input jobs list, not a generated value.
    `;
    
    try {
      let matches: JobMatch[];
      
      if (this.userSettings) {
        // Use queryAI with user settings
        const response = await queryAI(prompt, systemPrompt, this.userSettings, 'job_matching');
        const content = response.choices[0].message.content;
        // Parse AI response
        
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (parseError) {
          // Failed to parse AI response
          throw new Error('Invalid AI response format');
        }
        
        matches = parsed.matches || parsed;
        
        if (!Array.isArray(matches)) {
          // Invalid response format, return empty matches
          matches = [];
        }
        
        // Process matches
      } else {
        // Fallback to default AI service
        matches = await queryAIJson<JobMatch[]>(prompt, systemPrompt);
      }
      
      // Ensure consistent property names
      matches = matches.map((match: any) => ({
        ...match,
        jobId: match.jobId || match.id,
        relevanceScore: match.matchScore || match.relevanceScore || 0,
        matchReasons: match.matchReasons || [],
        missingSkills: match.missingSkills || [],
        // Add additional scores for detailed breakdown
        skillsScore: match.skillsScore || 0,
        experienceScore: match.experienceScore || 0,
        educationScore: match.educationScore || 0,
        locationScore: match.locationScore || 0
      }));
      
      // Sort by match score descending
      // Sort by match score descending
      
      // Lower threshold to 50 for debugging
      return matches
        .filter((match: any) => (match.matchScore || match.relevanceScore) >= 50)
        .sort((a: any, b: any) => (b.matchScore || b.relevanceScore) - (a.matchScore || a.relevanceScore));
    } catch (error) {
      // Error occurred during job matching
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
      if (this.userSettings) {
        // Use queryAI with user settings
        const response = await queryAI(prompt, systemPrompt, this.userSettings, 'job_matching');
        const content = response.choices[0].message.content;
        return JSON.parse(content);
      } else {
        // Fallback to default AI service
        return await queryAIJson<JobMatchingCriteria>(prompt, systemPrompt);
      }
    } catch (error) {
      // Error extracting criteria, use defaults
      
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