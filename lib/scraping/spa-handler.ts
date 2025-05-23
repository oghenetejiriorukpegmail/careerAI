import * as cheerio from 'cheerio';

/**
 * Extract job data from Single Page Applications
 * Looks for embedded JSON data, API endpoints, and other SPA patterns
 */
export function extractFromSPA(html: string, url: string): any {
  console.log('[SPA HANDLER] Attempting to extract data from SPA...');
  
  const $ = cheerio.load(html);
  let extractedData: any = null;
  
  // 1. Look for __INITIAL_STATE__ or similar
  const statePatterns = [
    '__INITIAL_STATE__',
    '__NEXT_DATA__',
    '__NUXT__',
    'window.__data',
    'window.__PRELOADED_STATE__',
    '__APP_STATE__'
  ];
  
  for (const pattern of statePatterns) {
    const regex = new RegExp(`${pattern}\\s*=\\s*({[^;]+});?`, 'i');
    const match = html.match(regex);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        console.log(`[SPA HANDLER] Found ${pattern} with data`);
        extractedData = data;
        break;
      } catch (e) {
        console.log(`[SPA HANDLER] Failed to parse ${pattern}`);
      }
    }
  }
  
  // 2. Look for embedded JSON in script tags
  if (!extractedData) {
    $('script').each((i, el) => {
      const content = $(el).text();
      
      // Look for job-related JSON
      if (content.includes('job') || content.includes('position') || content.includes('career')) {
        // Try to extract JSON objects
        const jsonMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        if (jsonMatches) {
          for (const jsonStr of jsonMatches) {
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed && (parsed.job || parsed.position || parsed.jobTitle || parsed.title)) {
                console.log('[SPA HANDLER] Found job data in script tag');
                extractedData = parsed;
                return false; // break out of .each()
              }
            } catch (e) {
              // Not valid JSON, continue
            }
          }
        }
      }
    });
  }
  
  // 3. Look for API configuration
  const apiPatterns = [
    /api[Uu]rl\s*[:=]\s*["']([^"']+)["']/,
    /endpoint\s*[:=]\s*["']([^"']+)["']/,
    /baseURL\s*[:=]\s*["']([^"']+)["']/
  ];
  
  let apiEndpoint: string | null = null;
  for (const pattern of apiPatterns) {
    const match = html.match(pattern);
    if (match) {
      apiEndpoint = match[1];
      console.log(`[SPA HANDLER] Found API endpoint: ${apiEndpoint}`);
      break;
    }
  }
  
  // 4. For ePlus specifically
  if (url.includes('eplus')) {
    // Extract job ID from URL
    const jobIdMatch = url.match(/jobs\/(\d+)/);
    if (jobIdMatch) {
      const jobId = jobIdMatch[1];
      console.log(`[SPA HANDLER] ePlus job ID: ${jobId}`);
      
      // Look for data attributes or hidden inputs with job data
      const dataElements = $('[data-job-id], [data-position-id], input[name*="job"]');
      dataElements.each((i, el) => {
        const $el = $(el);
        console.log(`[SPA HANDLER] Found data element: ${(el as any).name || 'unknown'} with value: ${$el.val() || $el.text()}`);
      });
      
      // ePlus might load data from an API like /api/jobs/{id}
      if (!extractedData) {
        extractedData = {
          jobId,
          possibleApiEndpoints: [
            `/api/jobs/${jobId}`,
            `/careers-home/api/jobs/${jobId}`,
            `/api/positions/${jobId}`,
            `/api/job-postings/${jobId}`
          ]
        };
      }
    }
  }
  
  // 5. Extract any visible text that might be job content
  if (!extractedData) {
    const visibleText: string[] = [];
    
    // Get all text nodes
    $('body *').each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      // Skip if element has children (to avoid duplicates)
      if ($el.children().length === 0 && text.length > 50 && text.length < 1000) {
        // Check if it contains job-related keywords
        const jobKeywords = ['responsibilities', 'qualifications', 'requirements', 'experience', 
                           'skills', 'benefits', 'salary', 'location', 'position', 'role'];
        
        const hasKeyword = jobKeywords.some(kw => text.toLowerCase().includes(kw));
        if (hasKeyword) {
          visibleText.push(text);
        }
      }
    });
    
    if (visibleText.length > 0) {
      console.log(`[SPA HANDLER] Found ${visibleText.length} text blocks with job keywords`);
      extractedData = { textBlocks: visibleText };
    }
  }
  
  return extractedData;
}

/**
 * Generate possible API endpoints for a job URL
 */
export function generatePossibleAPIs(url: string): string[] {
  const apis: string[] = [];
  
  // Extract base URL
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  
  // Extract job ID if present
  const jobIdMatch = url.match(/(?:jobs?|positions?|postings?|careers?)[\/\-](\d+)/i);
  const jobId = jobIdMatch ? jobIdMatch[1] : null;
  
  if (jobId) {
    // Common API patterns
    apis.push(
      `${baseUrl}/api/jobs/${jobId}`,
      `${baseUrl}/api/v1/jobs/${jobId}`,
      `${baseUrl}/api/positions/${jobId}`,
      `${baseUrl}/api/postings/${jobId}`,
      `${baseUrl}/api/job/${jobId}`,
      `${baseUrl}/api/job-postings/${jobId}`,
      `${baseUrl}/careers/api/jobs/${jobId}`,
      `${baseUrl}/careers-home/api/jobs/${jobId}`,
      `${baseUrl}/graphql` // GraphQL endpoint
    );
  }
  
  return apis;
}