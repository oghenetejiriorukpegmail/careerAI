import { ParsedJobDescription } from '../documents/document-parser';

interface JinaResponse {
  code: number;
  status: number;
  data: {
    title: string;
    content: string;
    url: string;
    usage: {
      tokens: number;
    };
  };
}

/**
 * Scrape job description from URL using Jina.ai Reader API
 */
export async function scrapeJobWithJina(url: string): Promise<ParsedJobDescription | null> {
  try {
    console.log('[JINA SCRAPER] Starting job scraping for URL:', url);
    
    const jinaApiKey = process.env.JINA_API_KEY || 'jina_933b9f02b16d41a998aafc79fe851fa7QYyIIGNIswaOQ88eMESyOuWPwuAb';
    
    if (!jinaApiKey) {
      console.error('[JINA SCRAPER] No Jina API key found');
      return null;
    }
    
    // Check if this is a Greenhouse job board (these are known to be problematic for Jina)
    const isGreenhouse = url.includes('greenhouse.io');
    const isLever = url.includes('lever.co');
    const isWorkday = url.includes('workday.com');
    const isDynamicSite = isGreenhouse || isLever || isWorkday;
    
    if (isDynamicSite) {
      console.log('[JINA SCRAPER] Detected dynamic job board - using enhanced extraction settings');
    }

    // Use Jina Reader API with optimized parameters for job boards
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    
    // Use more aggressive settings for known dynamic sites
    const waitTime = isDynamicSite ? '5' : '2';  // Dynamic sites need longer wait
    const timeout = isDynamicSite ? '20' : '10'; // Longer timeout for complex sites
    
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jinaApiKey}`,
        'Accept': 'application/json',
        'X-Return-Format': 'json',
        'X-Retain-Images': 'none',
        'X-Wait-For': waitTime,
        'X-Timeout': timeout,
        // Skip selector for dynamic sites to get full page content
        ...(isDynamicSite ? {} : { 'X-Target-Selector': 'main, .job-description, .job-content, .content, #job-content' })
      }
    });

    if (!response.ok) {
      console.error('[JINA SCRAPER] HTTP error:', response.status, response.statusText);
      return null;
    }

    const data: JinaResponse = await response.json();
    
    if (data.code !== 200) {
      console.error('[JINA SCRAPER] Jina API error:', data);
      return null;
    }

    console.log('[JINA SCRAPER] Successfully scraped content, tokens used:', data.data.usage?.tokens || 'unknown');
    
    // Parse the scraped content
    const content = data.data.content;
    const title = data.data.title;
    
    // Check if we got mostly legal/compliance content or insufficient content
    const contentLower = content?.toLowerCase() || '';
    const hasLegalKeywords = contentLower.includes('for government reporting purposes') ||
                           contentLower.includes('equal employment opportunity') ||
                           contentLower.includes('protected veterans') ||
                           contentLower.includes('form cc-305');
    
    const hasJobKeywords = contentLower.includes('responsibilities') ||
                          contentLower.includes('requirements') ||
                          contentLower.includes('qualifications') ||
                          contentLower.includes('experience') ||
                          contentLower.includes('skills') ||
                          contentLower.includes('job description') ||
                          contentLower.includes('role') ||
                          contentLower.includes('position');
    
    const isLegalContent = content && (
      (hasLegalKeywords && !hasJobKeywords) ||  // Has legal content but no job content
      content.length < 500  // Very short content is likely incomplete
    );
    
    if (isLegalContent) {
      console.log('[JINA SCRAPER] Detected legal/compliance content, trying alternative approach');
      
      // Try multiple extraction strategies in order of effectiveness
      const strategies = [
        // Strategy 1: Full page with longer wait time
        {
          name: 'full-page-long-wait',
          headers: {
            'Authorization': `Bearer ${jinaApiKey}`,
            'Accept': 'application/json',
            'X-Return-Format': 'json',
            'X-Retain-Images': 'none',
            'X-Wait-For': '5',  // Wait longer for dynamic content
            'X-Timeout': '15'   // Longer timeout for complex pages
          }
        },
        // Strategy 2: Target specific content areas
        {
          name: 'content-focused',
          headers: {
            'Authorization': `Bearer ${jinaApiKey}`,
            'Accept': 'application/json',
            'X-Return-Format': 'json',
            'X-Retain-Images': 'none',
            'X-Wait-For': '3',
            'X-Target-Selector': '.job-posting, .job-description, [data-testid="job-description"], main .content'
          }
        }
      ];
      
      for (const strategy of strategies) {
        try {
          console.log(`[JINA SCRAPER] Trying ${strategy.name} strategy`);
          const fallbackUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
          const fallbackResponse = await fetch(fallbackUrl, {
            method: 'GET',
            headers: strategy.headers
          });
          
          if (fallbackResponse.ok) {
            const fallbackData: JinaResponse = await fallbackResponse.json();
            if (fallbackData.code === 200 && fallbackData.data.content) {
              console.log(`[JINA SCRAPER] ${strategy.name} got ${fallbackData.data.content.length} chars`);
              
              // Use this content if it's significantly better
              if (fallbackData.data.content.length > content.length * 1.5) {
                console.log(`[JINA SCRAPER] Using ${strategy.name} content as it's much better`);
                const parsedJob = await parseJobContent(fallbackData.data.content, title, url);
                return parsedJob;
              }
            }
          }
        } catch (strategyError) {
          console.log(`[JINA SCRAPER] ${strategy.name} strategy failed:`, strategyError);
          continue;
        }
      }
    }
    
    // Extract job information from the scraped content
    const parsedJob = await parseJobContent(content, title, url);
    
    // Return whatever we extracted - let the user decide if it's sufficient
    if (!parsedJob) {
      console.log('[JINA SCRAPER] Failed to create parsed job object');
      return null;
    }
    
    // Log quality for user information but don't filter
    if (parsedJob.requirements.length === 0 && 
        parsedJob.responsibilities.length === 0 && 
        parsedJob.qualifications.length === 0 &&
        (!content || content.length < 300)) {
      console.log('[JINA SCRAPER] Note: Extracted content has limited structured data - this may be due to dynamic content or site structure');
      console.log(`[JINA SCRAPER] Content length: ${content?.length || 0} chars, Requirements: ${parsedJob.requirements.length}, Responsibilities: ${parsedJob.responsibilities.length}`);
    }
    
    return parsedJob;

  } catch (error) {
    console.error('[JINA SCRAPER] Error scraping job:', error);
    return null;
  }
}

/**
 * Clean job content by removing legal/compliance sections that Jina might extract
 */
function cleanJobContent(content: string): string {
  let cleaned = content;
  
  // Remove common legal/compliance sections - be more surgical to preserve job content
  const legalSectionPatterns = [
    // Government reporting and compliance - use more specific patterns
    /For government reporting purposes[\s\S]*?(?=Job Title|Position|Role|About|We are|Overview|Description|Requirements|Responsibilities|Qualifications|$)/i,
    /we ask candidates to respond to the below self-identification[\s\S]*?(?=Job Title|Position|Role|About|We are|Overview|Description|Requirements|Responsibilities|Qualifications|$)/i,
    /As set forth in.*?Equal Employment Opportunity policy[\s\S]*?(?=Job Title|Position|Role|About|We are|Overview|Description|Requirements|Responsibilities|Qualifications|$)/i,
    /Form CC-305[\s\S]*?$/i,
    /OMB Control Number[\s\S]*?$/i,
    
    // Veterans classification - more precise matching
    /If you believe you belong to any of the categories of protected veterans[\s\S]*?(?=Job Title|Position|Role|About|We are|Overview|Description|Requirements|Responsibilities|Qualifications|$)/i,
    /Classification of protected categories is as follows[\s\S]*?(?=Job Title|Position|Role|About|We are|Overview|Description|Requirements|Responsibilities|Qualifications|$)/i,
    
    // Disability disclosure - prevent over-removal
    /Why are you being asked to complete this form[\s\S]*?(?=Job Title|Position|Role|About|We are|Overview|Description|Requirements|Responsibilities|Qualifications|$)/i,
    
    // Gender/demographics dropdowns
    /Gender\s*Select\.\.\./i,
    /Veteran Status\s*Select\.\.\./i,
    
    // Large legal blocks that are clearly not job content
    /disabled veteran.{100,}service-connected disability/i,
    /recently separated veteran.{100,}air service/i,
    /active duty wartime.{100,}campaign badge/i,
    /Armed forces service medal.{100,}Executive Order/i
  ];
  
  for (const pattern of legalSectionPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  // If we removed too much content, something went wrong
  if (cleaned.length < content.length * 0.1) {
    console.log('[JINA SCRAPER] Warning: Cleaning removed too much content, using original');
    return content;
  }
  
  return cleaned;
}

/**
 * Parse job content extracted by Jina into structured job description
 */
async function parseJobContent(content: string, title: string, url: string): Promise<ParsedJobDescription> {
  try {
    // Clean and filter content first - remove compliance/legal sections
    const cleanedContent = cleanJobContent(content);
    
    // If cleaned content is too short, the extraction may have failed
    if (cleanedContent.length < 100) {
      console.log('[JINA SCRAPER] Cleaned content too short, may need alternative extraction method');
      console.log('[JINA SCRAPER] Original content length:', content.length);
      console.log('[JINA SCRAPER] Cleaned content length:', cleanedContent.length);
    }
    
    // Basic extraction using patterns and keywords
    const jobDescription: ParsedJobDescription = {
      jobTitle: extractJobTitle(cleanedContent, title),
      company: extractCompany(cleanedContent, url),
      location: extractLocation(cleanedContent),
      requirements: extractRequirements(cleanedContent),
      responsibilities: extractResponsibilities(cleanedContent),
      qualifications: extractQualifications(cleanedContent),
      keywords: extractKeywords(cleanedContent),
      company_culture: extractCompanyCulture(cleanedContent)
    };

    console.log('[JINA SCRAPER] Parsed job description:', {
      jobTitle: jobDescription.jobTitle,
      company: jobDescription.company,
      location: jobDescription.location,
      requirementsCount: jobDescription.requirements.length,
      responsibilitiesCount: jobDescription.responsibilities.length
    });

    return jobDescription;

  } catch (error) {
    console.error('[JINA SCRAPER] Error parsing job content:', error);
    
    // Return basic structure with available information
    return {
      jobTitle: title || 'Job Position',
      company: extractCompany(content, url) || 'Company',
      location: extractLocation(content) || '',
      requirements: [],
      responsibilities: [],
      qualifications: [],
      keywords: [],
      company_culture: []
    };
  }
}

function extractJobTitle(content: string, title: string): string {
  // First try to use the page title
  if (title && title.toLowerCase() !== 'job posting' && title.length > 3) {
    // Clean up common title patterns
    const cleanTitle = title
      .replace(/\s*-\s*.*$/, '') // Remove everything after dash
      .replace(/\s*\|\s*.*$/, '') // Remove everything after pipe
      .replace(/\s*at\s+.*$/i, '') // Remove "at Company"
      .trim();
    
    if (cleanTitle.length > 3) {
      return cleanTitle;
    }
  }

  // Try to extract from content
  const jobTitlePatterns = [
    /job title[:\s]+([^\n]+)/i,
    /position[:\s]+([^\n]+)/i,
    /role[:\s]+([^\n]+)/i,
    /we are hiring[:\s]+([^\n]+)/i,
    /looking for[:\s]+([^\n]+)/i
  ];

  for (const pattern of jobTitlePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return title || 'Job Position';
}

function extractCompany(content: string, url: string): string {
  // Try to extract from URL first
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Enhanced patterns for job board detection
    if (hostname.includes('linkedin.com')) {
      const companyMatch = content.match(/company[:\s]+([^\n]+)/i);
      if (companyMatch) return companyMatch[1].trim();
    }
    
    // Greenhouse job boards pattern
    if (hostname.includes('greenhouse.io')) {
      // Extract company name from greenhouse URL path or content
      const pathMatch = url.match(/greenhouse\.io\/([^\/]+)/);
      if (pathMatch && pathMatch[1] && pathMatch[1] !== 'job-boards') {
        const companyFromPath = pathMatch[1].replace(/[-_]/g, ' ').toLowerCase()
          .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        return companyFromPath;
      }
      
      // Look for company info in content
      const greenhouseCompanyPatterns = [
        /We're ([^.]+) and we're/i,
        /About ([^:\n.]{2,30})[:\n.]/i,
        /At ([^,:\n.]{2,30})[,:\n.]/i,
        /Join ([^,:\n.]{2,30})[,:\n.]/i
      ];
      
      for (const pattern of greenhouseCompanyPatterns) {
        const match = content.match(pattern);
        if (match && match[1] && !match[1].toLowerCase().includes('looking') && !match[1].toLowerCase().includes('hiring')) {
          return match[1].trim();
        }
      }
    }
    
    // Generic job board detection - avoid using hostname as company
    const isJobBoard = hostname.includes('indeed.com') || hostname.includes('glassdoor.com') || 
                      hostname.includes('monster.com') || hostname.includes('ziprecruiter.com') ||
                      hostname.includes('dice.com') || hostname.includes('greenhouse.io') ||
                      hostname.includes('lever.co') || hostname.includes('workday.com');
    
    if (!isJobBoard) {
      // Likely a company website
      const companyName = hostname.replace(/^www\./, '').split('.')[0];
      return companyName.charAt(0).toUpperCase() + companyName.slice(1);
    }
  } catch (e) {
    // URL parsing failed, continue with content extraction
  }

  // Enhanced content extraction patterns
  const companyPatterns = [
    /company[:\s]+([^\n]+)/i,
    /employer[:\s]+([^\n]+)/i,
    /organization[:\s]+([^\n]+)/i,
    /about ([^:\n.]{2,50})[:\n.]/i,
    /join ([^,:\n.]{2,50})/i,
    /We are ([^,:\n.]{2,50})/i,
    /Working at ([^,:\n.]{2,50})/i
  ];

  for (const pattern of companyPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const company = match[1].trim();
      // Filter out common false positives
      const excludeWords = ['looking', 'hiring', 'seeking', 'searching', 'we', 'our', 'the', 'this', 'that'];
      const hasExcludedWord = excludeWords.some(word => company.toLowerCase().includes(word));
      
      if (company.length > 1 && company.length < 100 && !hasExcludedWord) {
        return company;
      }
    }
  }

  return 'Company';
}

function extractLocation(content: string): string {
  const locationPatterns = [
    /location[:\s]+([^\n]+)/i,
    /based in[:\s]+([^\n]+)/i,
    /office[:\s]+([^\n]+)/i,
    /([A-Z][a-z]+,\s*[A-Z]{2})/g, // US format: City, ST
    /([A-Z][a-z]+,\s*[A-Z][a-z]+)/g, // International: City, Country
    /(remote|hybrid|on-site)/i
  ];

  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return '';
}

function extractRequirements(content: string): string[] {
  const requirements: string[] = [];
  
  // Look for requirements sections
  const reqSectionPatterns = [
    /requirements?[:\s]*([\s\S]*?)(?=responsibilities|qualifications|about|benefits|\n\n\n)/i,
    /what you'll need[:\s]*([\s\S]*?)(?=what you'll do|about|benefits|\n\n\n)/i,
    /must have[:\s]*([\s\S]*?)(?=nice to have|responsibilities|about|\n\n\n)/i
  ];

  for (const pattern of reqSectionPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const reqText = match[1];
      const items = extractBulletPoints(reqText);
      requirements.push(...items);
      break;
    }
  }

  return requirements.filter(req => req.length > 10 && req.length < 200);
}

function extractResponsibilities(content: string): string[] {
  const responsibilities: string[] = [];
  
  // Look for responsibilities sections
  const respSectionPatterns = [
    /responsibilities[:\s]*([\s\S]*?)(?=requirements|qualifications|about|benefits|\n\n\n)/i,
    /what you'll do[:\s]*([\s\S]*?)(?=what you'll need|requirements|about|\n\n\n)/i,
    /job duties[:\s]*([\s\S]*?)(?=requirements|qualifications|about|\n\n\n)/i,
    /role overview[:\s]*([\s\S]*?)(?=requirements|qualifications|about|\n\n\n)/i
  ];

  for (const pattern of respSectionPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const respText = match[1];
      const items = extractBulletPoints(respText);
      responsibilities.push(...items);
      break;
    }
  }

  return responsibilities.filter(resp => resp.length > 10 && resp.length < 200);
}

function extractQualifications(content: string): string[] {
  const qualifications: string[] = [];
  
  // Look for qualifications sections
  const qualSectionPatterns = [
    /qualifications[:\s]*([\s\S]*?)(?=responsibilities|requirements|about|benefits|\n\n\n)/i,
    /preferred[:\s]*([\s\S]*?)(?=requirements|responsibilities|about|\n\n\n)/i,
    /nice to have[:\s]*([\s\S]*?)(?=requirements|responsibilities|about|\n\n\n)/i,
    /desired[:\s]*([\s\S]*?)(?=requirements|responsibilities|about|\n\n\n)/i
  ];

  for (const pattern of qualSectionPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const qualText = match[1];
      const items = extractBulletPoints(qualText);
      qualifications.push(...items);
      break;
    }
  }

  return qualifications.filter(qual => qual.length > 10 && qual.length < 200);
}

function extractBulletPoints(text: string): string[] {
  const bullets: string[] = [];
  
  // Split by common bullet point indicators
  const lines = text.split(/\n+/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines or very short lines
    if (trimmed.length < 10) continue;
    
    // Remove bullet point indicators
    const cleaned = trimmed
      .replace(/^[•·\-\*\+]\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/^[a-zA-Z]\.\s*/, '')
      .trim();
    
    if (cleaned.length > 10 && cleaned.length < 200) {
      bullets.push(cleaned);
    }
  }
  
  return bullets;
}

function extractKeywords(content: string): string[] {
  const keywords: string[] = [];
  
  // Technical keywords patterns
  const techKeywords = [
    // Programming languages
    /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin)\b/gi,
    // Frameworks
    /\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|Laravel|Rails)\b/gi,
    // Databases
    /\b(MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|Oracle|SQL Server)\b/gi,
    // Cloud platforms
    /\b(AWS|Azure|GCP|Google Cloud|Docker|Kubernetes|Terraform)\b/gi,
    // Tools and technologies
    /\b(Git|Jenkins|JIRA|Confluence|Slack|Agile|Scrum|REST|GraphQL|API)\b/gi
  ];

  for (const pattern of techKeywords) {
    const matches = content.match(pattern);
    if (matches) {
      keywords.push(...matches.map(match => match.toLowerCase()));
    }
  }

  // Remove duplicates and return
  return [...new Set(keywords)];
}

function extractCompanyCulture(content: string): string[] {
  const culture: string[] = [];
  
  // Look for culture-related sections
  const cultureSectionPatterns = [
    /culture[:\s]*([\s\S]*?)(?=benefits|requirements|responsibilities|\n\n\n)/i,
    /values[:\s]*([\s\S]*?)(?=benefits|requirements|responsibilities|\n\n\n)/i,
    /about us[:\s]*([\s\S]*?)(?=benefits|requirements|responsibilities|\n\n\n)/i,
    /why join[:\s]*([\s\S]*?)(?=benefits|requirements|responsibilities|\n\n\n)/i
  ];

  for (const pattern of cultureSectionPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const cultureText = match[1];
      const items = extractBulletPoints(cultureText);
      culture.push(...items);
      break;
    }
  }

  return culture.filter(item => item.length > 10 && item.length < 200);
}