import * as cheerio from 'cheerio';
type CheerioAPI = cheerio.CheerioAPI;

interface DeepExtractionResult {
  method: string;
  content: any;
  confidence: number;
}

/**
 * Deep extraction that tries multiple aggressive strategies
 */
export async function deepExtractContent(html: string, url: string): Promise<DeepExtractionResult | null> {
  console.log('[DEEP EXTRACTOR] Starting comprehensive extraction...');
  
  const results: DeepExtractionResult[] = [];
  
  // Strategy 1: Find ALL script tags and look for job data
  console.log('[DEEP EXTRACTOR] Strategy 1: Searching all script tags...');
  const scriptResults = extractFromScripts(html);
  if (scriptResults) results.push(scriptResults);
  
  // Strategy 2: Find base64 encoded data
  console.log('[DEEP EXTRACTOR] Strategy 2: Looking for base64 encoded data...');
  const base64Results = extractBase64Data(html);
  if (base64Results) results.push(base64Results);
  
  // Strategy 3: Extract from HTML comments
  console.log('[DEEP EXTRACTOR] Strategy 3: Checking HTML comments...');
  const commentResults = extractFromComments(html);
  if (commentResults) results.push(commentResults);
  
  // Strategy 4: Find JSON-LD or structured data
  console.log('[DEEP EXTRACTOR] Strategy 4: Looking for structured data...');
  const structuredResults = extractStructuredData(html);
  if (structuredResults) results.push(structuredResults);
  
  // Strategy 5: Find data in window object assignments
  console.log('[DEEP EXTRACTOR] Strategy 5: Searching window object assignments...');
  const windowResults = extractWindowData(html);
  if (windowResults) results.push(windowResults);
  
  // Strategy 6: Extract all text and look for patterns
  console.log('[DEEP EXTRACTOR] Strategy 6: Pattern matching in all text...');
  const patternResults = extractByPatterns(html);
  if (patternResults) results.push(patternResults);
  
  // Strategy 7: Find API endpoints and data URLs
  console.log('[DEEP EXTRACTOR] Strategy 7: Looking for API endpoints...');
  const apiResults = extractAPIEndpoints(html);
  if (apiResults) results.push(apiResults);
  
  // Strategy 8: Check meta tags and data attributes
  console.log('[DEEP EXTRACTOR] Strategy 8: Checking meta and data attributes...');
  const metaResults = extractFromMetaAndData(html);
  if (metaResults) results.push(metaResults);
  
  // Strategy 9: ePlus specific extraction
  if (url.includes('eplus')) {
    console.log('[DEEP EXTRACTOR] Strategy 9: Trying ePlus-specific extraction...');
    try {
      const eplusModule = await import('./eplus-specific-extractor');
      const eplusData = eplusModule.extractEplusJobData(html);
      if (eplusData) {
        results.push({
          method: 'eplus_specific_extraction',
          content: eplusData,
          confidence: 0.9
        });
      }
    } catch (e) {
      console.error('[DEEP EXTRACTOR] ePlus extraction error:', e);
    }
  }
  
  // Return the best result
  if (results.length > 0) {
    results.sort((a, b) => b.confidence - a.confidence);
    console.log(`[DEEP EXTRACTOR] Found ${results.length} results, best method: ${results[0].method}`);
    return results[0];
  }
  
  return null;
}

function extractFromScripts(html: string): DeepExtractionResult | null {
  const $ = cheerio.load(html);
  let bestResult: any = null;
  
  $('script').each((i, el) => {
    const content = $(el).text();
    if (!content || content.length < 100) return;
    
    // Look for job-related variable assignments
    const patterns = [
      /(?:var|let|const)\s+(\w+)\s*=\s*({[\s\S]+?});/g,
      /window\.(\w+)\s*=\s*({[\s\S]+?});/g,
      /data\s*:\s*({[\s\S]+?}),/g,
      /"job[^"]*"\s*:\s*({[\s\S]+?})/gi,
      /"position[^"]*"\s*:\s*({[\s\S]+?})/gi,
      /"posting[^"]*"\s*:\s*({[\s\S]+?})/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        try {
          const jsonStr = match[1] || match[2];
          // Try to extract JSON object
          const parsed = extractJSON(jsonStr);
          if (parsed && isJobRelated(parsed)) {
            bestResult = parsed;
            console.log(`[SCRIPT EXTRACTOR] Found job data in script tag ${i}`);
            return false; // break
          }
        } catch (e) {
          // Continue
        }
      }
    }
  });
  
  return bestResult ? {
    method: 'script_extraction',
    content: bestResult,
    confidence: 0.8
  } : null;
}

function extractBase64Data(html: string): DeepExtractionResult | null {
  // Look for base64 encoded JSON
  const base64Pattern = /(?:data:|content:)\s*(?:application\/json;)?base64,([A-Za-z0-9+/=]+)/g;
  let match;
  
  while ((match = base64Pattern.exec(html)) !== null) {
    try {
      const decoded = Buffer.from(match[1], 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (isJobRelated(parsed)) {
        return {
          method: 'base64_extraction',
          content: parsed,
          confidence: 0.7
        };
      }
    } catch (e) {
      // Continue
    }
  }
  
  return null;
}

function extractFromComments(html: string): DeepExtractionResult | null {
  const commentPattern = /<!--\s*([\s\S]*?)\s*-->/g;
  let match;
  
  while ((match = commentPattern.exec(html)) !== null) {
    const comment = match[1];
    if (comment.includes('{') && comment.includes('}')) {
      try {
        const parsed = extractJSON(comment);
        if (parsed && isJobRelated(parsed)) {
          return {
            method: 'comment_extraction',
            content: parsed,
            confidence: 0.6
          };
        }
      } catch (e) {
        // Continue
      }
    }
  }
  
  return null;
}

function extractStructuredData(html: string): DeepExtractionResult | null {
  const $ = cheerio.load(html);
  
  // JSON-LD
  const jsonLd = $('script[type="application/ld+json"]').text();
  if (jsonLd) {
    try {
      const parsed = JSON.parse(jsonLd);
      if (parsed['@type'] === 'JobPosting' || isJobRelated(parsed)) {
        return {
          method: 'json_ld_extraction',
          content: parsed,
          confidence: 0.95
        };
      }
    } catch (e) {
      // Continue
    }
  }
  
  // Microdata
  const jobPosting = $('[itemtype*="JobPosting"]');
  if (jobPosting.length > 0) {
    const data: any = {};
    jobPosting.find('[itemprop]').each((i, el) => {
      const $el = $(el);
      const prop = $el.attr('itemprop');
      const content = $el.attr('content') || $el.text().trim();
      if (prop && content) {
        data[prop] = content;
      }
    });
    
    if (Object.keys(data).length > 0) {
      return {
        method: 'microdata_extraction',
        content: data,
        confidence: 0.9
      };
    }
  }
  
  return null;
}

function extractWindowData(html: string): DeepExtractionResult | null {
  // Look for window/global variable assignments
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/,
    /window\.__data\s*=\s*({[\s\S]+?});/,
    /window\.pageData\s*=\s*({[\s\S]+?});/,
    /window\.jobData\s*=\s*({[\s\S]+?});/,
    /__NEXT_DATA__\s*=\s*({[\s\S]+?})<\/script>/,
    /window\[["']__remixContext["']\]\s*=\s*({[\s\S]+?});/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const parsed = extractJSON(match[1]);
        if (parsed) {
          // Deep search for job data
          const jobData = findJobData(parsed);
          if (jobData) {
            return {
              method: 'window_data_extraction',
              content: jobData,
              confidence: 0.85
            };
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }
  
  return null;
}

function extractByPatterns(html: string): DeepExtractionResult | null {
  const $ = cheerio.load(html);
  
  // Remove scripts and styles
  $('script, style').remove();
  
  const text = $('body').text();
  const jobData: any = {};
  
  // Look for specific patterns
  const patterns = {
    jobTitle: /(?:job\s*title|position|role)\s*:?\s*([^\n]+)/i,
    company: /(?:company|employer|organization)\s*:?\s*([^\n]+)/i,
    location: /(?:location|city|where)\s*:?\s*([^\n]+)/i,
    salary: /(?:salary|compensation|pay)\s*:?\s*([^\n]+)/i,
    yourImpact: /YOUR IMPACT\s*:?\s*([\s\S]+?)(?=QUALIFICATIONS|REQUIREMENTS|$)/i,
    qualifications: /QUALIFICATIONS\s*:?\s*([\s\S]+?)(?=REQUIREMENTS|RESPONSIBILITIES|$)/i,
    responsibilities: /RESPONSIBILITIES\s*:?\s*([\s\S]+?)(?=QUALIFICATIONS|REQUIREMENTS|$)/i
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      jobData[key] = match[1].trim();
    }
  }
  
  // Extract lists
  if (jobData.yourImpact) {
    jobData.responsibilities = extractListItems(jobData.yourImpact);
    delete jobData.yourImpact;
  }
  
  if (jobData.qualifications) {
    jobData.qualifications = extractListItems(jobData.qualifications);
  }
  
  if (Object.keys(jobData).length > 2) {
    return {
      method: 'pattern_extraction',
      content: jobData,
      confidence: 0.6
    };
  }
  
  return null;
}

function extractAPIEndpoints(html: string): DeepExtractionResult | null {
  const endpoints: string[] = [];
  
  // Look for API URLs
  const apiPatterns = [
    /['"]([^'"]*\/api\/[^'"]+)['"]/g,
    /fetch\(['"]([^'"]+)['"]/g,
    /axios\.[a-z]+\(['"]([^'"]+)['"]/g,
    /url:\s*['"]([^'"]+)['"]/g
  ];
  
  for (const pattern of apiPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1];
      if (url.includes('job') || url.includes('position') || url.includes('career')) {
        endpoints.push(url);
      }
    }
  }
  
  // Also look for GraphQL endpoints
  if (html.includes('graphql') || html.includes('query')) {
    const graphqlPattern = /query\s+(\w+)[\s\S]*?{[\s\S]*?job[\s\S]*?}/gi;
    const match = html.match(graphqlPattern);
    if (match) {
      endpoints.push('GRAPHQL_QUERY_FOUND');
    }
  }
  
  if (endpoints.length > 0) {
    return {
      method: 'api_endpoint_discovery',
      content: { endpoints: Array.from(new Set(endpoints)) },
      confidence: 0.5
    };
  }
  
  return null;
}

function extractFromMetaAndData(html: string): DeepExtractionResult | null {
  const $ = cheerio.load(html);
  const data: any = {};
  
  // Meta tags
  $('meta').each((i, el) => {
    const $el = $(el);
    const property = $el.attr('property') || $el.attr('name');
    const content = $el.attr('content');
    
    if (property && content) {
      if (property.includes('title') || property.includes('job')) {
        data[property] = content;
      }
    }
  });
  
  // Data attributes
  $('[data-job-id], [data-position], [data-job-title], [data-company]').each((i, el) => {
    const $el = $(el);
    const attrs = (el as any).attribs || {};
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('data-') && value) {
        data[key.replace('data-', '')] = value;
      }
    }
  });
  
  if (Object.keys(data).length > 0) {
    return {
      method: 'meta_data_extraction',
      content: data,
      confidence: 0.4
    };
  }
  
  return null;
}

// Helper functions
function extractJSON(str: string): any {
  // Try to extract a valid JSON object from a string
  try {
    // First try direct parse
    return JSON.parse(str);
  } catch (e) {
    // Try to find JSON boundaries
    let depth = 0;
    let start = -1;
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (!escape) {
        if (char === '"' && !inString) inString = true;
        else if (char === '"' && inString) inString = false;
        else if (char === '\\') escape = true;
        else if (!inString) {
          if (char === '{') {
            if (depth === 0) start = i;
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth === 0 && start >= 0) {
              const jsonStr = str.substring(start, i + 1);
              try {
                return JSON.parse(jsonStr);
              } catch (e) {
                // Continue looking
              }
            }
          }
        }
      } else {
        escape = false;
      }
    }
  }
  
  return null;
}

function isJobRelated(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  const jobKeywords = ['job', 'position', 'career', 'posting', 'vacancy', 'role', 
                       'title', 'company', 'employer', 'responsibilities', 'qualifications',
                       'requirements', 'skills', 'experience', 'salary', 'location'];
  
  const objStr = JSON.stringify(obj).toLowerCase();
  return jobKeywords.some(keyword => objStr.includes(keyword));
}

function findJobData(obj: any, visited = new Set()): any {
  if (!obj || typeof obj !== 'object' || visited.has(obj)) return null;
  visited.add(obj);
  
  // Check if this object is job data
  if (isJobRelated(obj) && (obj.title || obj.jobTitle || obj.position)) {
    return obj;
  }
  
  // Recursively search
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value && typeof value === 'object') {
      const result = findJobData(value, visited);
      if (result) return result;
    }
  }
  
  return null;
}

function extractListItems(text: string): string[] {
  const lines = text.split('\n');
  const items: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && (trimmed.match(/^[-•*]\s*/) || trimmed.match(/^\d+\.\s*/))) {
      items.push(trimmed.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''));
    } else if (trimmed.length > 20 && trimmed.length < 300) {
      // Might be a paragraph-style list item
      items.push(trimmed);
    }
  }
  
  return items.filter(item => item.length > 10);
}