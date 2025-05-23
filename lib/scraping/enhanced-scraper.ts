import * as cheerio from 'cheerio';
type CheerioAPI = cheerio.CheerioAPI;
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
  $('script, style, noscript, iframe, svg, img, video, audio, link, meta').remove();
  $('nav, header, footer, aside, .sidebar, .navigation, .menu, .ads, .advertisement, .cookie-banner, .popup').remove();
  $('[class*="header"], [class*="footer"], [class*="navbar"], [class*="cookie"], [class*="banner"]').remove();
  $('[id*="header"], [id*="footer"], [id*="navbar"], [id*="cookie"], [id*="banner"]').remove();
  
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
      'h1.job-title',
      '[class*="job-title"]', 
      '[class*="jobTitle"]',
      '[class*="position-title"]',
      '[class*="job_title"]',
      '[class*="job-header"]',
      '[class*="posting-title"]',
      '[data-testid*="title"]',
      '[data-qa*="title"]',
      '[data-test*="title"]',
      '[itemprop="title"]',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      '.job-title',
      '#job-title',
      '.title'
    ],
    company: [
      '[class*="company-name"]',
      '[class*="companyName"]',
      '[class*="company_name"]',
      '[class*="employer"]',
      '[class*="organization"]',
      '[data-testid*="company"]',
      '[data-qa*="company"]',
      '[data-test*="company"]',
      '[itemprop="hiringOrganization"]',
      'meta[property="og:site_name"]',
      '.company-name',
      '.company',
      '#company'
    ],
    location: [
      '[class*="location"]',
      '[class*="job-location"]',
      '[class*="job_location"]',
      '[data-testid*="location"]',
      '[data-qa*="location"]',
      '[data-test*="location"]',
      '[class*="address"]',
      '[itemprop="jobLocation"]',
      '[itemprop="address"]',
      '.location',
      '.job-location',
      '#location'
    ],
    description: [
      '[class*="description"]',
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      '[class*="job_description"]',
      '[class*="job-details"]',
      '[class*="job_details"]',
      '[class*="posting-description"]',
      '[id*="description"]',
      '[data-testid*="description"]',
      '[data-qa*="description"]',
      '[data-test*="description"]',
      '[itemprop="description"]',
      '.description',
      '.job-description',
      '#job-description',
      '#jobDescription',
      '.content',
      'article',
      'main',
      '[role="main"]',
      '.job-content',
      '.posting-content'
    ],
    salary: [
      '[class*="salary"]',
      '[class*="compensation"]',
      '[class*="pay"]',
      '[class*="wage"]',
      '[data-testid*="salary"]',
      '[data-qa*="salary"]',
      '[data-test*="salary"]',
      '[itemprop="baseSalary"]',
      '.salary',
      '.compensation',
      '#salary'
    ],
    requirements: [
      '[class*="requirements"]',
      '[class*="qualifications"]',
      '[class*="requirement"]',
      '[class*="qualification"]',
      '[data-testid*="requirements"]',
      '[data-qa*="requirements"]',
      '.requirements',
      '.qualifications',
      '#requirements'
    ]
  };

  // Extract each field
  for (const [field, selectors] of Object.entries(extractors)) {
    if (!result[field as keyof ScrapingResult]) {
      for (const selector of selectors) {
        try {
          let elements = $(selector);
          
          // For description, try to get all matching elements
          if (field === 'description' && elements.length > 1) {
            const allText = elements.map((_, el) => $(el).text().trim()).get()
              .filter(t => t.length > 100)
              .join('\n\n');
            if (allText.length > 200) {
              result[field] = allText;
              break;
            }
          }
          
          const element = elements.first();
          if (element.length) {
            let text = '';
            
            // Handle meta tags differently
            if (selector.startsWith('meta')) {
              text = element.attr('content') || '';
            } else {
              // Get text including nested elements
              text = element.clone()
                .find('script, style').remove().end()
                .text().trim();
            }
            
            // Validate extracted text
            if (text && text.length > 0) {
              // For title/company/location, ensure it's not too long
              if (['title', 'company', 'location'].includes(field) && text.length > 200) {
                continue;
              }
              
              result[field as keyof ScrapingResult] = text as any;
              console.log(`[SCRAPER] Extracted ${field} using selector: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector on error
          continue;
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
    console.log('[SCRAPER] No description found with selectors, trying fallback methods...');
    
    // Method 1: Try to find the largest text block
    const allTextBlocks: { text: string; element: any }[] = [];
    $('div, section, article, main').each((_, el) => {
      const $el = $(el);
      const text = $el.clone()
        .find('script, style, nav, header, footer').remove().end()
        .text().trim();
      
      if (text.length > 200) {
        allTextBlocks.push({ text, element: el });
      }
    });
    
    if (allTextBlocks.length > 0) {
      // Sort by text length and take the longest
      allTextBlocks.sort((a, b) => b.text.length - a.text.length);
      result.description = allTextBlocks[0].text;
      console.log('[SCRAPER] Found description using largest text block method');
    }
    
    // Method 2: Try common parent containers
    if (!result.description || result.description.length < 200) {
      const parentSelectors = [
        'main',
        '[role="main"]',
        '.main-content',
        '#main-content',
        '.job-details',
        '.posting-details',
        'article',
        '.article',
        '#content',
        '.content',
        '.container'
      ];

      for (const selector of parentSelectors) {
        const $container = $(selector).first();
        if ($container.length) {
          // Remove unwanted nested elements
          const cleanedHtml = $container.clone()
            .find('script, style, nav, header, footer, aside, form, button').remove().end();
          
          const text = cleanedHtml.text().trim();
          if (text && text.length > 200) {
            result.description = text;
            console.log(`[SCRAPER] Found description using parent selector: ${selector}`);
            break;
          }
        }
      }
    }
    
    // Method 3: Get all paragraphs and lists
    if (!result.description || result.description.length < 200) {
      const paragraphs = $('p').map((_, el) => $(el).text().trim()).get()
        .filter(text => text.length > 50);
      const lists = $('ul li, ol li').map((_, el) => $(el).text().trim()).get()
        .filter(text => text.length > 10);
      
      const combinedText = [...paragraphs, ...lists].join('\n');
      if (combinedText.length > 200) {
        result.description = combinedText;
        console.log('[SCRAPER] Found description using paragraphs and lists method');
      }
    }
  }

  // Final fallback to full body text
  if (!result.description || result.description.length < 100) {
    console.log('[SCRAPER] Using full body text as last resort');
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
    .replace(/â€¢/g, '•')
    .replace(/â€¦/g, '...')
    // Fix line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // Remove duplicate spaces
    .replace(/  +/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
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
  },

  taleo: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('.titlepage, .job-title, h1').first().text().trim(),
      company: $('.company-name, .org-name').first().text().trim(),
      location: $('.location, .job-location').first().text().trim(),
      description: $('.job-description, .jobdescription, .content').first().text().trim()
    };
  },

  icims: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('h1.iCIMS_JobTitle, .job-header h1, .positionTitle').first().text().trim(),
      company: $('.iCIMS_CompanyName, .company-name').first().text().trim(),
      location: $('.iCIMS_JobLocation, .job-location, .location').first().text().trim(),
      description: $('.iCIMS_JobDescription, .job-description, .jobdescription').first().text().trim()
    };
  },

  successfactors: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('.jobTitle, .job-title, h1').first().text().trim(),
      company: $('.companyName, .company-name').first().text().trim(),
      location: $('.jobLocation, .job-location').first().text().trim(),
      description: $('.jobDescription, .job-description').first().text().trim()
    };
  },

  brassring: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('#Job_Title, .job-title, h1').first().text().trim(),
      company: $('#Company_Name, .company-name').first().text().trim(),
      location: $('#Location, .location').first().text().trim(),
      description: $('#Job_Description, .job-description').first().text().trim()
    };
  },

  ultipro: ($: CheerioAPI): Partial<ScrapingResult> => {
    return {
      title: $('.opportunity-title, .job-title').first().text().trim(),
      company: $('.company-name').first().text().trim(),
      location: $('.opportunity-location, .job-location').first().text().trim(),
      description: $('.opportunity-description, .job-description').first().text().trim()
    };
  }
};

/**
 * Detect job board type from URL
 */
export function detectJobBoard(url: string): string | null {
  const urlLower = url.toLowerCase();
  
  // Major job boards
  if (urlLower.includes('linkedin.com')) return 'linkedin';
  if (urlLower.includes('indeed.com')) return 'indeed';
  if (urlLower.includes('dice.com')) return 'dice';
  
  // ATS systems
  if (urlLower.includes('greenhouse.io')) return 'greenhouse';
  if (urlLower.includes('lever.co')) return 'lever';
  if (urlLower.includes('myworkdayjobs.com') || urlLower.includes('workday.com')) return 'workday';
  if (urlLower.includes('taleo.net') || urlLower.includes('taleo.com')) return 'taleo';
  if (urlLower.includes('icims.com')) return 'icims';
  if (urlLower.includes('successfactors.com') || urlLower.includes('successfactors.eu')) return 'successfactors';
  if (urlLower.includes('brassring.com')) return 'brassring';
  if (urlLower.includes('ultipro.com') || urlLower.includes('ukg.com')) return 'ultipro';
  
  // Check for ATS identifiers in URL patterns
  if (urlLower.includes('/careers/') || urlLower.includes('/jobs/')) {
    // Check for common ATS indicators
    if (urlLower.includes('workday')) return 'workday';
    if (urlLower.includes('taleo')) return 'taleo';
    if (urlLower.includes('icims')) return 'icims';
  }
  
  return null;
}