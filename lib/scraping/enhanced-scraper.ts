import * as cheerio from 'cheerio';
import { CheerioAPI } from 'cheerio';
import { fetchWithRetry } from './proxy-manager';

interface ScrapingResult {
  title?: string;
  company?: string;
  location?: string;
  description: string;
  requirements?: string[];
  qualifications?: string[];
  benefits?: string[];
  salary?: string;
  jobType?: string;
  experience?: string;
  rawText: string;
}

/**
 * Enhanced job scraping with multiple fallback strategies
 */
export async function enhancedJobScrape(url: string): Promise<ScrapingResult> {
  // Multiple user agents for rotation
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  ];

  const headers = {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'no-cache',
  };

  // Use enhanced fetch with retry
  const response = await fetchWithRetry(url, { headers });

  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Remove noise elements
  $('script, style, noscript, iframe, svg, img, video, audio').remove();
  $('nav, header, footer, aside, .sidebar, .navigation, .menu, .ads, .advertisement').remove();
  
  // Try to extract structured data
  const result: ScrapingResult = {
    description: '',
    rawText: ''
  };

  // Try JSON-LD structured data first
  const jsonLdScript = $('script[type="application/ld+json"]').text();
  if (jsonLdScript) {
    try {
      const jsonData = JSON.parse(jsonLdScript);
      if (jsonData['@type'] === 'JobPosting' || jsonData.jobPosting) {
        const job = jsonData.jobPosting || jsonData;
        result.title = job.title;
        result.company = job.hiringOrganization?.name;
        result.location = job.jobLocation?.address?.addressLocality || job.jobLocation?.name;
        result.description = job.description;
        result.salary = job.baseSalary?.value?.value;
        result.jobType = job.employmentType;
      }
    } catch (e) {
      console.log('Failed to parse JSON-LD data');
    }
  }

  // Extract using common selectors
  const extractors = {
    title: [
      'h1', 
      '[class*="job-title"]', 
      '[class*="jobTitle"]',
      '[class*="position-title"]',
      '[data-testid*="title"]',
      'meta[property="og:title"]'
    ],
    company: [
      '[class*="company-name"]',
      '[class*="companyName"]',
      '[class*="employer"]',
      '[data-testid*="company"]',
      'meta[property="og:site_name"]'
    ],
    location: [
      '[class*="location"]',
      '[class*="job-location"]',
      '[data-testid*="location"]',
      '[class*="address"]'
    ],
    description: [
      '[class*="description"]',
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      '[id*="description"]',
      '[data-testid*="description"]',
      'article',
      'main',
      '[role="main"]'
    ],
    salary: [
      '[class*="salary"]',
      '[class*="compensation"]',
      '[class*="pay"]',
      '[data-testid*="salary"]'
    ],
    requirements: [
      '[class*="requirements"]',
      '[class*="qualifications"]',
      '[data-testid*="requirements"]'
    ]
  };

  // Extract each field
  for (const [field, selectors] of Object.entries(extractors)) {
    if (!result[field as keyof ScrapingResult]) {
      for (const selector of selectors) {
        const element = $(selector).first();
        if (element.length) {
          const text = element.text().trim();
          if (text && text.length > 0) {
            if (field === 'title' && selector.startsWith('meta')) {
              result[field] = element.attr('content') || '';
            } else {
              result[field as keyof ScrapingResult] = text as any;
            }
            break;
          }
        }
      }
    }
  }

  // Extract lists (requirements, qualifications, benefits)
  const listSelectors = [
    { field: 'requirements', keywords: ['requirements', 'required', 'must have'] },
    { field: 'qualifications', keywords: ['qualifications', 'qualified', 'preferred'] },
    { field: 'benefits', keywords: ['benefits', 'perks', 'we offer'] }
  ];

  for (const { field, keywords } of listSelectors) {
    // Find headers containing keywords
    $('h1, h2, h3, h4, h5, h6, strong, b').each((_, el) => {
      const text = $(el).text().toLowerCase();
      if (keywords.some(kw => text.includes(kw))) {
        // Look for the next list
        const list = $(el).nextAll('ul, ol').first();
        if (list.length) {
          result[field as keyof ScrapingResult] = list.find('li').map((_, li) => 
            $(li).text().trim()
          ).get().filter(item => item.length > 0) as any;
        }
      }
    });
  }

  // Get clean description text
  if (!result.description) {
    // Try to find the main content area
    const contentSelectors = [
      'main',
      'article', 
      '[role="main"]',
      '#content',
      '.content',
      'body'
    ];

    for (const selector of contentSelectors) {
      const content = $(selector).first().text().trim();
      if (content && content.length > 200) {
        result.description = content;
        break;
      }
    }
  }

  // Fallback to full body text
  if (!result.description || result.description.length < 100) {
    result.description = $('body').text().trim();
  }

  // Clean up the description
  result.description = cleanText(result.description);
  result.rawText = result.description;

  // Try to extract additional info from description if not found
  if (!result.salary) {
    const salaryMatch = result.description.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|\/)\s*(?:year|annum|hr|hour))?/i);
    if (salaryMatch) {
      result.salary = salaryMatch[0];
    }
  }

  if (!result.jobType) {
    const jobTypeMatch = result.description.match(/\b(?:full[- ]?time|part[- ]?time|contract|temporary|freelance|remote|hybrid)\b/i);
    if (jobTypeMatch) {
      result.jobType = jobTypeMatch[0];
    }
  }

  return result;
}

/**
 * Clean extracted text
 */
function cleanText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Fix common encoding issues
    .replace(/â€™/g, "'")
    .replace(/â€"/g, "—")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    // Remove duplicate spaces
    .replace(/  +/g, ' ')
    // Trim
    .trim();
}

/**
 * Extract job info for specific job boards
 */
export const jobBoardExtractors = {
  linkedin: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('.job-details-jobs-unified-top-card__job-title, .topcard__title').first().text().trim(),
      company: $('.job-details-jobs-unified-top-card__company-name, .topcard__org-name-link').first().text().trim(),
      location: $('.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet').first().text().trim(),
      description: $('.jobs-description__content, .description__text').first().text().trim()
    };
  },

  indeed: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('[data-testid="job-title"], .jobsearch-JobInfoHeader-title').first().text().trim(),
      company: $('[data-testid="company-name"], .jobsearch-InlineCompanyRating-companyHeader').first().text().trim(),
      location: $('[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle > div:last-child').first().text().trim(),
      description: $('#jobDescriptionText, .jobsearch-JobComponent-description').first().text().trim()
    };
  },

  dice: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('[data-cy="job-title"], h1.job-title').first().text().trim(),
      company: $('[data-cy="company-name"], .company-name').first().text().trim(),
      location: $('[data-cy="location"], .location').first().text().trim(),
      description: $('[data-cy="job-description"], .job-description').first().text().trim()
    };
  },

  greenhouse: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('#header .app-title, h1.app-title').first().text().trim(),
      company: $('#header .company-name, .company-name').first().text().trim(),
      location: $('#header .location, .location').first().text().trim(),
      description: $('#content .content, #job-details').first().text().trim()
    };
  },

  lever: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('.posting-headline h2').first().text().trim(),
      company: $('.posting-categories .company').first().text().trim(),
      location: $('.posting-categories .location').first().text().trim(),
      description: $('.posting-content').first().text().trim()
    };
  },

  workday: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('[data-automation-id="jobPostingHeader"] h2').first().text().trim(),
      company: $('[data-automation-id="company"]').first().text().trim(),
      location: $('[data-automation-id="location"]').first().text().trim(),
      description: $('[data-automation-id="jobPostingDescription"]').first().text().trim()
    };
  }
};

/**
 * Detect job board type from URL
 */
export function detectJobBoard(url: string): string | null {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('linkedin.com')) return 'linkedin';
  if (urlLower.includes('indeed.com')) return 'indeed';
  if (urlLower.includes('dice.com')) return 'dice';
  if (urlLower.includes('greenhouse.io')) return 'greenhouse';
  if (urlLower.includes('lever.co')) return 'lever';
  if (urlLower.includes('myworkdayjobs.com')) return 'workday';
  
  return null;
}