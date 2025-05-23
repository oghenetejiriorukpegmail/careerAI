import { scrapeJobListings, JobListing as BrightDataJobListing } from '@/lib/scraping/bright-data';

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements?: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  jobType?: string;
  postedDate?: string;
  url: string;
  source: 'indeed' | 'linkedin' | 'dice';
}

export interface JobSearchParams {
  keywords: string[];
  location?: string;
  radius?: number;
  jobType?: string[];
  experienceLevel?: string;
  remote?: boolean;
  salary?: {
    min?: number;
    currency?: string;
  };
  datePosted?: 'day' | 'week' | 'month';
  limit?: number;
}

export class JobScraper {
  // private scraper: BrightDataScraper;
  
  constructor() {
    // this.scraper = new BrightDataScraper();
  }
  
  async searchJobs(params: JobSearchParams): Promise<JobListing[]> {
    const allJobs: JobListing[] = [];
    
    // Search across multiple job boards
    const sources: Array<'indeed' | 'linkedin' | 'dice'> = ['indeed', 'linkedin', 'dice'];
    
    const searchPromises = sources.map(source => 
      this.searchJobBoard(source, params).catch(error => {
        console.error(`Error searching ${source}:`, error);
        return [];
      })
    );
    
    const results = await Promise.all(searchPromises);
    
    // Combine and deduplicate results
    for (const jobs of results) {
      allJobs.push(...jobs);
    }
    
    // Remove duplicates based on title and company
    const uniqueJobs = this.deduplicateJobs(allJobs);
    
    // Sort by posted date (newest first)
    return uniqueJobs.sort((a, b) => {
      const dateA = new Date(a.postedDate || 0).getTime();
      const dateB = new Date(b.postedDate || 0).getTime();
      return dateB - dateA;
    });
  }
  
  private async searchJobBoard(
    source: 'indeed' | 'linkedin' | 'dice',
    params: JobSearchParams
  ): Promise<JobListing[]> {
    try {
      // Use Bright Data if credentials are available
      if (process.env.BRIGHT_DATA_USERNAME && process.env.BRIGHT_DATA_PASSWORD) {
        console.log(`Using Bright Data to scrape ${source}...`);
        const brightDataJobs = await scrapeJobListings(
          params.keywords,
          params.location,
          [source]
        );
        
        // Transform Bright Data format to our format
        return brightDataJobs.map(job => ({
          id: job.id,
          title: job.job_title,
          company: job.company_name,
          location: job.location,
          description: job.description,
          url: job.job_url,
          source: job.source,
          postedDate: job.posted_date,
          salary: job.salary_range ? this.parseSalaryRange(job.salary_range) : undefined,
          jobType: 'full-time', // Default, as Bright Data doesn't provide this
          requirements: [] // Would need to be parsed from description
        }));
      }
      
      // Fallback to mock data if Bright Data is not configured
      console.log(`Bright Data not configured, using mock data for ${source}`);
      return this.generateMockJobs(source, 10);
    } catch (error) {
      console.error(`Error scraping ${source}:`, error);
      // Fallback to mock data on error
      return this.generateMockJobs(source, 5);
    }
  }
  
  private buildSearchQuery(params: JobSearchParams): string {
    const parts: string[] = [];
    
    // Add keywords
    if (params.keywords.length > 0) {
      parts.push(params.keywords.join(' OR '));
    }
    
    // Add job type
    if (params.jobType?.length) {
      parts.push(`(${params.jobType.join(' OR ')})`);
    }
    
    // Add experience level
    if (params.experienceLevel) {
      parts.push(params.experienceLevel);
    }
    
    // Add remote preference
    if (params.remote) {
      parts.push('remote');
    }
    
    return parts.join(' ');
  }
  
  private buildSearchUrl(
    source: 'indeed' | 'linkedin' | 'dice',
    query: string,
    params: JobSearchParams
  ): string {
    const encodedQuery = encodeURIComponent(query);
    const encodedLocation = encodeURIComponent(params.location || '');
    
    switch (source) {
      case 'indeed':
        let indeedUrl = `https://www.indeed.com/jobs?q=${encodedQuery}`;
        if (params.location) indeedUrl += `&l=${encodedLocation}`;
        if (params.radius) indeedUrl += `&radius=${params.radius}`;
        if (params.datePosted) {
          const days = { day: 1, week: 7, month: 30 }[params.datePosted];
          indeedUrl += `&fromage=${days}`;
        }
        return indeedUrl;
        
      case 'linkedin':
        let linkedinUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;
        if (params.location) linkedinUrl += `&location=${encodedLocation}`;
        if (params.datePosted) {
          const timeMap = { day: 'r86400', week: 'r604800', month: 'r2592000' };
          linkedinUrl += `&f_TPR=${timeMap[params.datePosted]}`;
        }
        return linkedinUrl;
        
      case 'dice':
        let diceUrl = `https://www.dice.com/jobs?q=${encodedQuery}`;
        if (params.location) diceUrl += `&location=${encodedLocation}`;
        if (params.radius) diceUrl += `&radius=${params.radius}`;
        return diceUrl;
        
      default:
        throw new Error(`Unsupported job board: ${source}`);
    }
  }
  
  private parseJobListings(source: string, html: string): JobListing[] {
    // This would need to be implemented with proper HTML parsing
    // For now, returning mock data
    console.log(`Parsing ${source} listings...`);
    
    // In production, use a proper HTML parser like cheerio
    return this.generateMockJobs(source as any, 5);
  }
  
  private deduplicateJobs(jobs: JobListing[]): JobListing[] {
    const seen = new Set<string>();
    
    return jobs.filter(job => {
      const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  private parseSalaryRange(salaryString: string): JobListing['salary'] | undefined {
    // Parse salary strings like "$80,000 - $100,000" or "$90K-120K"
    const matches = salaryString.match(/\$?([\d,]+)k?\s*[-–]\s*\$?([\d,]+)k?/i);
    if (matches) {
      const min = parseInt(matches[1].replace(/,/g, '')) * (matches[1].toLowerCase().includes('k') ? 1000 : 1);
      const max = parseInt(matches[2].replace(/,/g, '')) * (matches[2].toLowerCase().includes('k') ? 1000 : 1);
      return {
        min,
        max,
        currency: 'USD'
      };
    }
    return undefined;
  }
  
  // Mock data generator for testing
  private generateMockJobs(source: 'indeed' | 'linkedin' | 'dice', count: number): JobListing[] {
    const jobs: JobListing[] = [];
    const titles = ['Software Engineer', 'Senior Developer', 'Full Stack Engineer', 'Frontend Developer', 'Backend Engineer'];
    const companies = ['Tech Corp', 'Innovation Labs', 'Digital Solutions', 'Cloud Systems', 'Data Dynamics'];
    
    for (let i = 0; i < count; i++) {
      jobs.push({
        id: `${source}-${Date.now()}-${i}`,
        title: titles[i % titles.length],
        company: companies[i % companies.length],
        location: 'San Francisco, CA',
        description: 'Join our team to build innovative solutions...',
        requirements: ['JavaScript', 'React', 'Node.js'],
        salary: {
          min: 100000 + (i * 10000),
          max: 150000 + (i * 10000),
          currency: 'USD',
        },
        jobType: 'full-time',
        postedDate: new Date(Date.now() - i * 86400000).toISOString(),
        url: `https://${source}.com/job/${i}`,
        source,
      });
    }
    
    return jobs;
  }
}

export const jobScraper = new JobScraper();