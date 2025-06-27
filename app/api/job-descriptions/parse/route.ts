import { NextRequest, NextResponse } from 'next/server';

// Job description parsing function using AI
async function parseJobDescription(jobText: string, url?: string, userId?: string) {
  try {
    // Import AI configuration functions
    const { queryAI } = await import('@/lib/ai/config');
    const { loadServerSettings } = await import('@/lib/ai/settings-loader');
    
    // Load current AI settings - if userId provided, load from database
    let settings;
    if (userId) {
      const { createServerClient } = await import('@/lib/supabase/server-client');
      const supabase = createServerClient();
      
      const { data: userSettingsRow } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();
        
      if (userSettingsRow?.settings) {
        settings = userSettingsRow.settings;
        console.log('[JOB PARSING] Loaded user-specific settings from database:', settings);
      } else {
        settings = loadServerSettings();
        console.log('[JOB PARSING] No user settings found, using defaults');
      }
    } else {
      settings = loadServerSettings();
    }
    
    console.log(`[JOB PARSING] Starting job description parsing with provider: ${settings.aiProvider}, model: ${settings.aiModel}`);
    console.log(`[JOB PARSING] Text length: ${jobText.length} characters`);
    console.log(`[JOB PARSING] URL provided: ${url ? 'Yes' : 'No'}`);
    
    // Define the system prompt for job description parsing
    const systemPrompt = `You are a job description parsing expert. Extract ALL structured information from the job posting text and return it as a complete JSON object. Even if the content is limited, extract what you can and infer reasonable defaults when appropriate.

    Return JSON with these fields (include ALL fields, use empty arrays/null for missing data):
    {
      "job_title": "Official job title",
      "company_name": "Company name",
      "company_description": "Brief company description if available",
      "location": "Job location (city, state, country, remote status)",
      "employment_type": "Full-time, Part-time, Contract, Internship, etc.",
      "department": "Department or team if mentioned",
      "salary_range": "Salary range if mentioned",
      "posted_date": "When the job was posted if available",
      "application_deadline": "Application deadline if mentioned",
      "job_summary": "Brief job summary/overview - if not explicit, create from available content",
      "responsibilities": ["Extract all job duties and responsibilities"],
      "required_qualifications": ["Extract all required qualifications"],
      "preferred_qualifications": ["Extract preferred/nice-to-have qualifications"],
      "required_skills": ["Extract all required technical and soft skills"],
      "preferred_skills": ["Extract preferred skills"],
      "required_experience": "Years of experience required",
      "education_requirements": ["Extract education requirements"],
      "technologies": ["Extract all mentioned technologies, tools, software"],
      "benefits": ["Extract all mentioned benefits"],
      "company_culture": "Company culture/values if mentioned",
      "application_process": "How to apply",
      "contact_information": {"email": null, "phone": null, "contact_person": null},
      "additional_requirements": ["Any other requirements"],
      "ats_keywords": ["Extract key industry terms and buzzwords for ATS optimization"]
    }

    CRITICAL INSTRUCTIONS:
    - ALWAYS return a complete JSON object with all fields
    - If information is missing, use null for strings or empty arrays []
    - Extract every piece of available information, no matter how limited
    - For responsibilities/qualifications, look for bullet points, numbered lists, paragraphs
    - Infer job_summary from title and company if not explicitly stated
    - Include EVERYTHING mentioned about skills, technologies, requirements
    - Be comprehensive - it's better to include too much than too little
    - For responsibilities and qualifications, break them into individual array items
    - Extract all relevant ATS keywords that candidates should include in their applications
    - Separate required vs preferred qualifications and skills when the job posting makes this distinction

    SKILLS AND KEYWORDS EXTRACTION:
    - Extract all technical skills, tools, frameworks, programming languages mentioned
    - Include both hard skills (technical) and soft skills (communication, leadership, etc.)
    - Identify ATS keywords that are critical for application optimization
    - Break down comma-separated lists into individual array items
    - Include variations of skills (e.g., "JavaScript", "JS", "Node.js" as separate items)

    CRITICAL JSON FORMATTING REQUIREMENTS:
    - Return ONLY valid JSON. No markdown code blocks, no explanatory text before or after.
    - Start directly with { and end with }
    - Ensure ALL strings are properly escaped and terminated with closing quotes
    - Ensure ALL objects and arrays are properly closed with } and ]
    - Double-check that the final character is } to complete the JSON object
    - NO trailing commas, NO incomplete strings, NO unterminated objects`;

    const userPrompt = `Parse this job description:\n\n${jobText}`;
    
    // Use the configured AI provider and model from settings
    console.log(`[JOB PARSING] Sending request to ${settings.aiProvider} with model ${settings.aiModel}`);
    const startTime = Date.now();
    
    const response = await queryAI(userPrompt, systemPrompt, settings);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`[JOB PARSING] Response received in ${processingTime}ms`);
    console.log(`[JOB PARSING] Provider: ${settings.aiProvider}, Model: ${settings.aiModel}`);
    
    // Debug the response structure
    console.log(`[JOB PARSING] Response type:`, typeof response);
    console.log(`[JOB PARSING] Response structure:`, JSON.stringify(response, null, 2).substring(0, 1000));
    
    // Extract content from the AI response object
    let parsedContent: string;
    if (response && typeof response === 'object' && response.choices && response.choices.length > 0) {
      console.log(`[JOB PARSING] Extracting from choices[0].message.content`);
      parsedContent = response.choices[0].message.content;
      console.log(`[JOB PARSING] Extracted content type:`, typeof parsedContent);
    } else if (typeof response === 'string') {
      console.log(`[JOB PARSING] Response is already a string`);
      parsedContent = response;
    } else {
      console.error('[JOB PARSING] Invalid response format:', typeof response, response);
      throw new Error('No parsed content received from AI');
    }

    // Ensure parsedContent is actually a string
    if (typeof parsedContent !== 'string') {
      console.error('[JOB PARSING] Parsed content is not a string:', typeof parsedContent, parsedContent);
      // Force conversion to string
      if (parsedContent && typeof parsedContent === 'object') {
        parsedContent = JSON.stringify(parsedContent);
      } else {
        parsedContent = String(parsedContent);
      }
      console.log(`[JOB PARSING] Converted to string, length:`, parsedContent.length);
    }

    if (!parsedContent || parsedContent.trim().length === 0) {
      console.error('[JOB PARSING] Empty content received from AI');
      throw new Error('Empty parsed content received from AI');
    }

    console.log(`[JOB PARSING] Response length: ${parsedContent.length} characters`);
    if (settings.enableLogging) {
      console.log(`[JOB PARSING] Raw response preview: ${parsedContent.substring(0, 500)}...`);
    }

    // Parse the JSON response with enhanced error handling
    let structuredData;
    try {
      // First, try parsing as-is
      structuredData = JSON.parse(parsedContent);
      console.log(`[JOB PARSING] Successfully parsed JSON response`);
      
      if (settings.enableLogging) {
        console.log(`[JOB PARSING] Extracted data preview:`, {
          job_title: structuredData.job_title || 'N/A',
          company_name: structuredData.company_name || 'N/A',
          location: structuredData.location || 'N/A',
          skillsCount: structuredData.required_skills?.length || 0,
          responsibilitiesCount: structuredData.responsibilities?.length || 0
        });
      }
    } catch (parseError) {
      console.error('[JOB PARSING] Initial JSON parsing failed:', parseError);
      console.log('[JOB PARSING] Attempting to fix malformed JSON...');
      
      // Try to fix common JSON issues
      let fixedContent = parsedContent.trim();
      
      // Remove markdown code blocks if present
      if (fixedContent.startsWith('```')) {
        fixedContent = fixedContent.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
      }
      
      // Remove any trailing incomplete JSON structures
      const lastCompleteIndex = fixedContent.lastIndexOf('}');
      if (lastCompleteIndex > 0) {
        fixedContent = fixedContent.substring(0, lastCompleteIndex + 1);
        console.log(`[JOB PARSING] Truncated JSON to last complete brace at position ${lastCompleteIndex}`);
      }
      
      try {
        structuredData = JSON.parse(fixedContent);
        console.log(`[JOB PARSING] Successfully parsed fixed JSON response`);
      } catch (secondParseError) {
        console.error('[JOB PARSING] JSON fixing failed:', secondParseError);
        console.error('[JOB PARSING] Raw content causing parse error (first 1000 chars):', parsedContent.substring(0, 1000));
        
        // Return a basic structure with extracted text as fallback
        structuredData = {
          job_title: "Parse Error - Check Logs",
          company_name: "Unknown",
          job_summary: "AI response was malformed. Raw text extraction successful but structured parsing failed.",
          parse_error: true,
          error_details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
          raw_content_length: parsedContent.length
        };
        
        console.log(`[JOB PARSING] Using fallback structure due to parsing failure`);
      }
    }

    return structuredData;
  } catch (error) {
    console.error('[JOB PARSING] Error parsing job description with AI:', error);
    throw error;
  }
}

// Extract basic job information from ePlus URL pattern
function extractInfoFromEplusURL(url: string): any {
  try {
    // URL pattern: https://careers.eplus.com/careers-home/jobs/7456/Principal+Architect+-+Carrier+Networking
    const match = url.match(/\/jobs\/(\d+)\/([^?]+)/);
    if (match) {
      const [, jobId, titleSlug] = match;
      const jobTitle = decodeURIComponent(titleSlug.replace(/\+/g, ' '));
      return {
        job_id: jobId,
        job_title: jobTitle,
        company_name: 'ePlus inc.',
        source_url: url
      };
    }
  } catch (error) {
    console.warn('[URL EXTRACTION] Failed to extract from URL pattern:', error);
  }
  return null;
}

// Alternative scraping approach for sites that block basic fetch
async function tryAlternativeScraping(url: string, headers: any, userId?: string): Promise<string> {
  try {
    // Try with simplified headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });
    
    if (response.ok) {
      const html = await response.text();
      console.log(`[URL SCRAPING] Alternative approach got ${html.length} characters`);
      return html;
    }
    
    throw new Error(`Alternative approach failed: ${response.status}`);
  } catch (error) {
    console.error('[URL SCRAPING] Alternative approach also failed:', error);
    throw error;
  }
}

// Enhanced URL scraping function with job board specific handling
async function scrapeJobFromURL(url: string, userId?: string, visionModel?: string): Promise<string> {
  try {
    console.log(`[URL SCRAPING] Attempting to scrape job from URL: ${url}`);
    
    // Check cache first
    const { scrapingCache } = await import('@/lib/scraping/scraping-cache');
    const cachedContent = scrapingCache.get(url);
    if (cachedContent) {
      console.log('[URL SCRAPING] Using cached content');
      return cachedContent;
    }
    
    // PRIMARY METHOD: Try direct Puppeteer screenshot-based extraction
    console.log('[URL SCRAPING] Using direct Puppeteer as primary scraping method...');
    try {
      const { scrapeWithDirectPuppeteer } = await import('@/lib/scraping/puppeteer-direct');
      const puppeteerResult = await scrapeWithDirectPuppeteer(url, visionModel);
      
      if (puppeteerResult.success && puppeteerResult.extractedContent && puppeteerResult.extractedContent.length > 100) {
        console.log('[URL SCRAPING] Direct Puppeteer extraction successful (PRIMARY METHOD)');
        scrapingCache.set(url, puppeteerResult.extractedContent);
        return puppeteerResult.extractedContent;
      } else if (puppeteerResult.error) {
        console.log('[URL SCRAPING] Direct Puppeteer failed, will try fallback methods:', puppeteerResult.error);
      }
    } catch (puppeteerError) {
      console.error('[URL SCRAPING] Direct Puppeteer error, continuing with fallback methods:', puppeteerError);
    }
    
    // FALLBACK: Traditional HTML scraping methods
    console.log('[URL SCRAPING] Falling back to traditional HTML scraping...');
    
    // Detect job board type for specialized handling
    const urlLower = url.toLowerCase();
    let isLinkedIn = urlLower.includes('linkedin.com');
    let isIndeed = urlLower.includes('indeed.com');
    let isDice = urlLower.includes('dice.com');
    let isEplus = urlLower.includes('eplus.com');
    
    // For some sites, try to extract basic information from URL first
    if (isEplus) {
      console.log('[URL SCRAPING] Detected ePlus careers site - extracting from URL pattern');
      const urlInfo = extractInfoFromEplusURL(url);
      if (urlInfo) {
        console.log('[URL SCRAPING] Extracted basic info from URL pattern:', urlInfo);
      }
    }
    
    // Enhanced headers to avoid bot detection
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];
    
    const headers = {
      'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/avif,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let response;
    let html = '';
    
    // Try different approaches
    try {
      response = await fetch(url, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      html = await response.text();
      console.log(`[URL SCRAPING] Successfully fetched ${html.length} characters from URL`);
      
      // For ePlus, immediately try AI extraction since their content is dynamically loaded
      if (isEplus && html.length > 10000) {
        console.log('[URL SCRAPING] ePlus page detected with substantial HTML, debugging...');
        
        // Debug the page structure
        try {
          const { debugWebpage } = await import('@/lib/scraping/debug-scraper');
          await debugWebpage(html, url);
        } catch (debugError) {
          console.error('[URL SCRAPING] Debug failed:', debugError);
        }
        
        // Try deep extraction when we have large HTML
        try {
          const { deepExtractContent } = await import('@/lib/scraping/deep-extractor');
          const deepResult = await deepExtractContent(html, url);
          
          if (deepResult && deepResult.content) {
            console.log(`[URL SCRAPING] Deep extraction succeeded using ${deepResult.method}`);
            
            // Format the extracted content
            let formattedContent = '';
            const content = deepResult.content;
            
            if (typeof content === 'object') {
              // If we found endpoints, try to fetch them
              if (content.endpoints) {
                console.log('[URL SCRAPING] Found API endpoints:', content.endpoints);
                // Could implement API fetching here
              } else {
                // Format job data
                if (content.jobTitle || content.title) {
                  formattedContent = `Job Title: ${content.jobTitle || content.title}\n`;
                }
                if (content.company || content.company_name) {
                  formattedContent += `Company: ${content.company || content.company_name}\n`;
                }
                if (content.location) {
                  formattedContent += `Location: ${content.location}\n`;
                }
                if (content.salary || content.salary_range) {
                  formattedContent += `Salary: ${content.salary || content.salary_range}\n`;
                }
                formattedContent += '\n';
                
                if (content.description || content.job_summary) {
                  formattedContent += `Description:\n${content.description || content.job_summary}\n\n`;
                }
                
                if (content.responsibilities && Array.isArray(content.responsibilities)) {
                  formattedContent += `Responsibilities:\n`;
                  content.responsibilities.forEach((r: string) => {
                    formattedContent += `- ${r}\n`;
                  });
                  formattedContent += '\n';
                }
                
                if (content.qualifications && Array.isArray(content.qualifications)) {
                  formattedContent += `Qualifications:\n`;
                  content.qualifications.forEach((q: string) => {
                    formattedContent += `- ${q}\n`;
                  });
                  formattedContent += '\n';
                }
                
                if (content.requirements && Array.isArray(content.requirements)) {
                  formattedContent += `Requirements:\n`;
                  content.requirements.forEach((r: string) => {
                    formattedContent += `- ${r}\n`;
                  });
                }
              }
            }
            
            if (formattedContent && formattedContent.length > 200) {
              console.log('[URL SCRAPING] Deep extraction provided rich content');
              scrapingCache.set(url, formattedContent);
              return formattedContent;
            }
            
            // If deep extraction found API endpoints, try to fetch them
            if (deepResult.content.endpoints && Array.isArray(deepResult.content.endpoints)) {
              console.log('[URL SCRAPING] Attempting to fetch discovered API endpoints...');
              try {
                const { discoverAndFetchAPI } = await import('@/lib/scraping/api-discovery');
                const apiResult = await discoverAndFetchAPI(url, html);
                
                if (apiResult && apiResult.success && apiResult.data) {
                  console.log('[URL SCRAPING] Successfully fetched job data from API');
                  
                  // Format the API data
                  const apiData = apiResult.data;
                  let apiContent = '';
                  
                  if (apiData.title || apiData.jobTitle) {
                    apiContent += `Job Title: ${apiData.title || apiData.jobTitle}\n`;
                  }
                  if (apiData.company) apiContent += `Company: ${apiData.company}\n`;
                  if (apiData.location) apiContent += `Location: ${apiData.location}\n`;
                  if (apiData.salary) apiContent += `Salary: ${apiData.salary}\n`;
                  apiContent += '\n';
                  
                  if (apiData.description) {
                    apiContent += `Description:\n${apiData.description}\n\n`;
                  }
                  
                  if (apiData.responsibilities) {
                    apiContent += `Responsibilities:\n`;
                    if (Array.isArray(apiData.responsibilities)) {
                      apiData.responsibilities.forEach((r: string) => apiContent += `- ${r}\n`);
                    } else {
                      apiContent += `${apiData.responsibilities}\n`;
                    }
                    apiContent += '\n';
                  }
                  
                  if (apiData.qualifications || apiData.requirements) {
                    const quals = apiData.qualifications || apiData.requirements;
                    apiContent += `Requirements:\n`;
                    if (Array.isArray(quals)) {
                      quals.forEach((q: string) => apiContent += `- ${q}\n`);
                    } else {
                      apiContent += `${quals}\n`;
                    }
                  }
                  
                  if (apiContent.length > 200) {
                    scrapingCache.set(url, apiContent);
                    return apiContent;
                  }
                }
              } catch (apiError) {
                console.error('[URL SCRAPING] API discovery failed:', apiError);
              }
            }
          }
        } catch (deepError) {
          console.error('[URL SCRAPING] Deep extraction failed:', deepError);
        }
        
        // Try to extract from SPA
        try {
          const { extractFromSPA } = await import('@/lib/scraping/spa-handler');
          const spaData = extractFromSPA(html, url);
          if (spaData) {
            console.log('[URL SCRAPING] SPA data extracted:', JSON.stringify(spaData).substring(0, 200));
          }
        } catch (spaError) {
          console.error('[URL SCRAPING] SPA extraction failed:', spaError);
        }
        
        // Try AI extraction
        try {
          const { extractJobWithAI, formatExtractedJob } = await import('@/lib/scraping/ai-powered-scraper');
          const extractedData = await extractJobWithAI(html, url, userId);
          
          if (extractedData && extractedData.description && extractedData.description.length > 100) {
            const formattedContent = formatExtractedJob(extractedData);
            console.log('[URL SCRAPING] AI extraction successful for ePlus');
            scrapingCache.set(url, formattedContent);
            return formattedContent;
          }
        } catch (aiError) {
          console.error('[URL SCRAPING] AI extraction failed for ePlus:', aiError);
        }
        
        // Try Puppeteer as last resort for JavaScript-heavy sites
        console.log('[URL SCRAPING] All extraction methods failed for ePlus, trying Puppeteer...');
        try {
          const { scrapeWithPuppeteer } = await import('@/lib/scraping/puppeteer-scraper-safe');
          const puppeteerResult = await scrapeWithPuppeteer(url);
          
          if (puppeteerResult.success && puppeteerResult.extractedContent && puppeteerResult.extractedContent.length > 100) {
            console.log('[URL SCRAPING] Puppeteer extraction successful');
            scrapingCache.set(url, puppeteerResult.extractedContent);
            return puppeteerResult.extractedContent;
          } else if (puppeteerResult.error) {
            console.error('[URL SCRAPING] Puppeteer failed:', puppeteerResult.error);
          }
        } catch (puppeteerError) {
          console.error('[URL SCRAPING] Puppeteer scraping failed:', puppeteerError);
        }
      }
      
    } catch (fetchError) {
      console.error('[URL SCRAPING] Direct fetch failed:', fetchError);
      
      // Try AI-powered scraper first
      console.log('[URL SCRAPING] Attempting AI-powered extraction...');
      try {
        const response = await fetch(url, {
          headers,
          redirect: 'follow',
          signal: AbortSignal.timeout(15000)
        });
        
        if (response.ok) {
          const html = await response.text();
          const { extractJobWithAI, formatExtractedJob } = await import('@/lib/scraping/ai-powered-scraper');
          
          console.log('[URL SCRAPING] Sending to AI for extraction...');
          const extractedData = await extractJobWithAI(html, url, userId);
          
          if (extractedData && extractedData.description) {
            const formattedContent = formatExtractedJob(extractedData);
            console.log('[URL SCRAPING] AI extraction successful');
            
            // Cache the result
            scrapingCache.set(url, formattedContent);
            return formattedContent;
          }
        }
      } catch (aiError) {
        console.error('[URL SCRAPING] AI-powered extraction failed:', aiError);
      }
      
      // Fallback to enhanced scraper
      console.log('[URL SCRAPING] Falling back to enhanced scraping...');
      try {
        const { enhancedJobScrape, detectJobBoard } = await import('@/lib/scraping/enhanced-scraper');
        
        // Detect job board type
        const jobBoard = detectJobBoard(url);
        console.log(`[URL SCRAPING] Detected job board: ${jobBoard || 'unknown'}`);
        
        const scrapedData = await enhancedJobScrape(url);
        
        if (scrapedData && scrapedData.description) {
          console.log('[URL SCRAPING] Successfully scraped using enhanced scraper');
          
          // Format the scraped data into a job description
          let formattedContent = '';
          
          if (scrapedData.title) {
            formattedContent += `Job Title: ${scrapedData.title}\n`;
          }
          if (scrapedData.company) {
            formattedContent += `Company: ${scrapedData.company}\n`;
          }
          if (scrapedData.location) {
            formattedContent += `Location: ${scrapedData.location}\n`;
          }
          if (scrapedData.jobType) {
            formattedContent += `Job Type: ${scrapedData.jobType}\n`;
          }
          if (scrapedData.salary) {
            formattedContent += `Salary: ${scrapedData.salary}\n`;
          }
          
          formattedContent += `\nDescription:\n${scrapedData.description}\n`;
          
          if (scrapedData.requirements && scrapedData.requirements.length > 0) {
            formattedContent += `\nRequirements:\n${scrapedData.requirements.map(r => `- ${r}`).join('\n')}\n`;
          }
          
          if (scrapedData.qualifications && scrapedData.qualifications.length > 0) {
            formattedContent += `\nQualifications:\n${scrapedData.qualifications.map(q => `- ${q}`).join('\n')}\n`;
          }
          
          if (scrapedData.benefits && scrapedData.benefits.length > 0) {
            formattedContent += `\nBenefits:\n${scrapedData.benefits.map(b => `- ${b}`).join('\n')}\n`;
          }
          
          // Cache the formatted content
          if (formattedContent && formattedContent.length > 100) {
            scrapingCache.set(url, formattedContent);
          }
          
          return formattedContent;
        }
      } catch (enhancedError) {
        console.error('[URL SCRAPING] Enhanced scraping failed:', enhancedError);
      }
      
      // Try Bright Data as last resort if credentials are available
      if (process.env.BRIGHT_DATA_USERNAME && process.env.BRIGHT_DATA_PASSWORD) {
        console.log('[URL SCRAPING] Attempting Bright Data as last resort...');
        try {
          const { scrapeJobDescription } = await import('@/lib/scraping/bright-data');
          const brightDataContent = await scrapeJobDescription(url);
          if (brightDataContent) {
            console.log('[URL SCRAPING] Successfully scraped content using Bright Data');
            return brightDataContent;
          }
        } catch (brightDataError) {
          console.error('[URL SCRAPING] Bright Data last resort failed:', brightDataError);
          
          // Puppeteer MCP already tried as primary method, skip duplicate attempt
        }
      }
      
      // For ePlus, use specialized scraper
      if (isEplus) {
        console.log('[URL SCRAPING] Using specialized ePlus scraper...');
        try {
          const { scrapeEplusJob } = await import('@/lib/scraping/eplus-scraper');
          const eplusContent = await scrapeEplusJob(url);
          if (eplusContent && eplusContent.length > 100) {
            // Cache the content
            scrapingCache.set(url, eplusContent);
            return eplusContent;
          }
        } catch (eplusError) {
          console.error('[URL SCRAPING] ePlus scraper failed:', eplusError);
        }
        
        // Fallback to alternative scraping
        console.log('[URL SCRAPING] Trying alternative approach for ePlus...');
        html = await tryAlternativeScraping(url, headers, userId);
      } else {
        throw fetchError;
      }
    }
    
    // Job board specific content extraction
    let extractedText = '';
    
    // Try using enhanced scraper with job board specific extractors
    try {
      const { detectJobBoard, jobBoardExtractors } = await import('@/lib/scraping/enhanced-scraper');
      const cheerio = await import('cheerio');
      const $ = cheerio.default.load(html);
      const jobBoard = detectJobBoard(url);
      
      if (jobBoard && jobBoardExtractors[jobBoard as keyof typeof jobBoardExtractors]) {
        console.log(`[URL SCRAPING] Using enhanced ${jobBoard} extractor`);
        const extracted = jobBoardExtractors[jobBoard as keyof typeof jobBoardExtractors]($ as any);
        
        // Format extracted data
        if (extracted.title) extractedText += `Job Title: ${extracted.title}\n`;
        if (extracted.company) extractedText += `Company: ${extracted.company}\n`;
        if (extracted.location) extractedText += `Location: ${extracted.location}\n`;
        if (extracted.salary) extractedText += `Salary: ${extracted.salary}\n`;
        if (extracted.description) extractedText += `\nDescription:\n${extracted.description}\n`;
      }
    } catch (error) {
      console.log('[URL SCRAPING] Enhanced extractor failed, falling back to legacy');
    }
    
    // Fallback to legacy extractors if enhanced didn't work
    if (!extractedText || extractedText.length < 100) {
      if (isLinkedIn) {
        console.log('[URL SCRAPING] Using legacy LinkedIn extraction');
        extractedText = extractLinkedInJobContent(html);
      } else if (isIndeed) {
        console.log('[URL SCRAPING] Using legacy Indeed extraction');
        extractedText = extractIndeedJobContent(html);
      } else if (isDice) {
        console.log('[URL SCRAPING] Using legacy Dice extraction');
        extractedText = extractDiceJobContent(html);
      } else {
        console.log('[URL SCRAPING] Using legacy generic extraction');
        extractedText = extractGenericJobContent(html);
      }
    }
    
    if (!extractedText || extractedText.trim().length < 100) {
      console.warn('[URL SCRAPING] Extracted content seems too short, falling back to generic extraction');
      extractedText = extractGenericJobContent(html);
      
      // Check if we only got a minimal summary
      const looksLikeMinimalSummary = extractedText && (
        extractedText.includes('This is a') && 
        extractedText.includes('position at') &&
        extractedText.length < 200
      );
      
      if (looksLikeMinimalSummary) {
        console.warn('[URL SCRAPING] Detected minimal summary only, trying AI extraction...');
        
        // Try AI extraction on the HTML we already have
        try {
          const { extractJobWithAI, formatExtractedJob } = await import('@/lib/scraping/ai-powered-scraper');
          const extractedData = await extractJobWithAI(html, url, userId);
          
          if (extractedData && extractedData.description && extractedData.description.length > 100) {
            extractedText = formatExtractedJob(extractedData);
            console.log('[URL SCRAPING] AI extraction provided better content');
          }
        } catch (aiError) {
          console.error('[URL SCRAPING] AI extraction failed for minimal content:', aiError);
        }
      }
      
      // If still too short after generic extraction, try URL-based fallback
      if (!extractedText || extractedText.trim().length < 50) {
        console.warn('[URL SCRAPING] Content still too short after generic extraction. Trying URL-based fallback...');
        
        // Try Bright Data as last resort if credentials are available
        if (process.env.BRIGHT_DATA_USERNAME && process.env.BRIGHT_DATA_PASSWORD) {
          console.log('[URL SCRAPING] Attempting Bright Data as last resort...');
          try {
            const { scrapeJobDescription } = await import('@/lib/scraping/bright-data');
            const brightDataContent = await scrapeJobDescription(url);
            if (brightDataContent && brightDataContent.trim().length > 100) {
              console.log('[URL SCRAPING] Successfully scraped content using Bright Data');
              return brightDataContent;
            }
          } catch (brightDataError) {
            console.error('[URL SCRAPING] Bright Data last resort failed:', brightDataError);
          }
        }
        
        // Try to create minimal job description from URL for known sites
        if (isEplus) {
          const urlInfo = extractInfoFromEplusURL(url);
          if (urlInfo) {
            console.log('[URL SCRAPING] Using URL-extracted information as fallback');
            extractedText = `Job Title: ${urlInfo.job_title}\nCompany: ${urlInfo.company_name}\nLocation: Plymouth, Minnesota\nJob ID: ${urlInfo.job_id}\nSource: ${urlInfo.source_url}\n\nNote: This is a ${urlInfo.job_title} position at ${urlInfo.company_name}. Please visit the original URL for complete job details.`;
          }
        }
        
        // If we still don't have enough content, analyze why and provide specific guidance
        if (!extractedText || extractedText.trim().length < 50) {
          // Analyze the HTML to understand why extraction failed
          try {
            const { analyzeExtractionFailure, generateErrorMessage } = await import('@/lib/scraping/extraction-analyzer');
            const analysis = analyzeExtractionFailure(html, url);
            const errorMessage = generateErrorMessage(analysis, url);
            
            console.log('[URL SCRAPING] Extraction analysis:', analysis);
            
            throw new Error(errorMessage);
          } catch (analysisError) {
            // Fallback error message if analysis fails
            const errorMessage = `Unable to extract sufficient content from URL. ${
              isEplus ? 'This ePlus careers page uses dynamic loading. ' : 
              isLinkedIn ? 'LinkedIn requires authentication to view full job descriptions. ' :
              isIndeed ? 'Indeed may be blocking automated access. ' :
              'The page may be dynamically loaded or require authentication. '
            }Please try copying and pasting the job description directly.`;
            
            // Puppeteer MCP already attempted as primary method
            // Try legacy Puppeteer as additional fallback
            console.log('[URL SCRAPING] Trying legacy Puppeteer as additional fallback...');
            try {
              const { scrapeWithPuppeteer } = await import('@/lib/scraping/puppeteer-scraper-safe');
              const puppeteerResult = await scrapeWithPuppeteer(url);
              
              if (puppeteerResult.success && puppeteerResult.extractedContent && puppeteerResult.extractedContent.length > 100) {
                console.log('[URL SCRAPING] Legacy Puppeteer extraction successful');
                scrapingCache.set(url, puppeteerResult.extractedContent);
                return puppeteerResult.extractedContent;
              } else if (puppeteerResult.error) {
                console.error('[URL SCRAPING] Legacy Puppeteer also failed:', puppeteerResult.error);
                
                // Provide specific guidance for known problematic sites
                if (isEplus) {
                  throw new Error(
                    'ePlus careers site requires JavaScript to load job descriptions.\n\n' +
                    'Automated extraction failed. To extract the job description:\n' +
                    '1. Open the link in your browser\n' +
                    '2. Wait for the page to fully load\n' +
                    '3. You should see sections like "YOUR IMPACT" and "QUALIFICATIONS"\n' +
                    '4. Select all text (Ctrl+A on Windows, Cmd+A on Mac)\n' +
                    '5. Copy the text\n' +
                    '6. Use the "Paste Text" option in CareerAI to paste the job description\n\n' +
                    'This will ensure all job details are captured correctly.'
                  );
                }
              }
            } catch (puppeteerError) {
              console.error('[URL SCRAPING] Legacy Puppeteer error:', puppeteerError);
            }
            
            // For ePlus and similar SPAs, provide specific guidance
            if (isEplus) {
              throw new Error(
                'ePlus careers site requires JavaScript to load job descriptions.\n\n' +
                'To extract the job description:\n' +
                '1. Open the link in your browser\n' +
                '2. Wait for the page to fully load\n' +
                '3. You should see sections like "YOUR IMPACT" and "QUALIFICATIONS"\n' +
                '4. Select all text (Ctrl+A on Windows, Cmd+A on Mac)\n' +
                '5. Copy the text\n' +
                '6. Use the "Paste Text" option in CareerAI to paste the job description\n\n' +
                'This will ensure all job details are captured correctly.'
              );
            }
            throw new Error(analysisError instanceof Error ? analysisError.message : errorMessage);
          }
        }
      }
    }
    
    console.log(`[URL SCRAPING] Extracted ${extractedText.length} characters from URL`);
    console.log(`[URL SCRAPING] Content preview: ${extractedText.substring(0, 300)}...`);
    
    if (extractedText.length < 500) {
      console.warn(`[URL SCRAPING] Warning: Extracted content is quite short (${extractedText.length} chars). Full content:`);
      console.log(extractedText);
    }
    
    // Cache successful scrape
    if (extractedText && extractedText.length > 100) {
      scrapingCache.set(url, extractedText);
    }
    
    return extractedText;
  } catch (error) {
    console.error('[URL SCRAPING] Error scraping URL:', error);
    throw new Error(`Failed to scrape job posting from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// LinkedIn job content extraction
function extractLinkedInJobContent(html: string): string {
  // Look for common LinkedIn job posting selectors and patterns
  let text = html;
  
  // Remove scripts, styles, and navigation
  text = text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  
  // Extract job description content (LinkedIn uses various class names)
  const jobDescriptionPatterns = [
    /<div[^>]*class="[^"]*job-description[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*class="[^"]*job-details[^"]*"[^>]*>([\s\S]*?)<\/section>/gi
  ];
  
  for (const pattern of jobDescriptionPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      text = matches.join(' ');
      break;
    }
  }
  
  return cleanExtractedText(text);
}

// Indeed job content extraction
function extractIndeedJobContent(html: string): string {
  let text = html;
  
  // Remove scripts, styles, and navigation
  text = text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  
  // Extract job description content (Indeed uses various class names)
  const jobDescriptionPatterns = [
    /<div[^>]*class="[^"]*jobsearch-JobComponent[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*id="[^"]*jobDescriptionText[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*jobDescriptionContent[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  ];
  
  for (const pattern of jobDescriptionPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      text = matches.join(' ');
      break;
    }
  }
  
  return cleanExtractedText(text);
}

// Dice job content extraction
function extractDiceJobContent(html: string): string {
  let text = html;
  
  // Remove scripts, styles, and navigation
  text = text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  
  // Extract job description content
  const jobDescriptionPatterns = [
    /<div[^>]*class="[^"]*job-description[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*class="[^"]*job-details[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
    /<div[^>]*id="[^"]*job-description[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  ];
  
  for (const pattern of jobDescriptionPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      text = matches.join(' ');
      break;
    }
  }
  
  return cleanExtractedText(text);
}

// Generic job content extraction for other sites
function extractGenericJobContent(html: string): string {
  // First, try to find job-specific content areas
  const jobContentSelectors = [
    // Common job content containers
    /class="[^"]*job[^"]*description[^"]*"/gi,
    /class="[^"]*job[^"]*content[^"]*"/gi,
    /class="[^"]*posting[^"]*content[^"]*"/gi,
    /class="[^"]*job[^"]*detail[^"]*"/gi,
    /id="[^"]*job[^"]*description[^"]*"/gi,
    /id="[^"]*job[^"]*content[^"]*"/gi,
    // Generic content areas
    /class="[^"]*content[^"]*"/gi,
    /class="[^"]*main[^"]*"/gi,
    /class="[^"]*body[^"]*"/gi,
  ];

  let jobContent = '';
  
  // Try to extract from job-specific containers first
  for (const selector of jobContentSelectors) {
    const matches = html.match(new RegExp(`<[^>]*${selector.source}[^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'gi'));
    if (matches && matches.length > 0) {
      // Get the largest match (likely the main content)
      const largestMatch = matches.reduce((a, b) => a.length > b.length ? a : b, '');
      if (largestMatch.length > jobContent.length) {
        jobContent = largestMatch;
      }
    }
  }

  // If no specific job content found, fall back to cleaning the entire HTML
  if (!jobContent || jobContent.length < 200) {
    jobContent = html;
  }

  // Remove scripts, styles, navigation, ads, and other non-content elements
  jobContent = jobContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*navigation[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]*class="[^"]*menu[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '') // Remove forms
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '') // Remove buttons
    .replace(/<input[^>]*>/gi, '') // Remove inputs
    .replace(/<!--[\s\S]*?-->/gi, ''); // Remove comments
  
  return cleanExtractedText(jobContent);
}

// Clean and format extracted text
function cleanExtractedText(html: string): string {
  let text = html;
  
  // Convert common HTML elements to meaningful text
  text = text
    // Convert list items to bullet points
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    // Convert headings to preserve structure
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, ':\n')
    // Convert paragraphs and divs to line breaks
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<br[^>]*>/gi, '\n')
    // Convert table cells to preserve structure
    .replace(/<\/td>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Replace HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, '...')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    // Clean up whitespace while preserving structure
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
    .replace(/\n[ \t]+/g, '\n') // Remove leading spaces on new lines
    .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces before new lines
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .trim();
    
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobText, url, inputMethod, userId, visionModel } = body;
    
    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }

    let contentToProcess = jobText;
    let processingMethod = inputMethod || 'text_paste';
    
    // Handle URL input method
    if (inputMethod === 'url' && url) {
      console.log('[JOB PROCESSING] Processing job description from URL');
      try {
        contentToProcess = await scrapeJobFromURL(url, userId, visionModel);
        processingMethod = 'url';
      } catch (scrapeError) {
        console.error('[JOB PROCESSING] URL scraping failed:', scrapeError);
        
        // Provide helpful suggestions based on the URL
        const urlLower = url.toLowerCase();
        let suggestions = [
          'Copy and paste the job description text directly instead of using the URL',
          'Make sure the URL is publicly accessible (not behind a login)',
          'Try opening the URL in a private/incognito browser window first'
        ];
        
        if (urlLower.includes('linkedin.com')) {
          suggestions.unshift('LinkedIn jobs often require login - try copying the job description text instead');
        } else if (urlLower.includes('indeed.com')) {
          suggestions.unshift('Indeed may be blocking automated access - try copying the job text manually');
        } else if (urlLower.includes('eplus.com')) {
          suggestions.unshift('ePlus careers page may load content dynamically - try copying the full job description text');
        }
        
        return NextResponse.json({
          error: `Unable to extract job information from URL`,
          details: scrapeError instanceof Error ? scrapeError.message : 'Unknown error',
          suggestions,
          inputMethod: 'url',
          url,
          alternativeMethod: 'Please copy and paste the job description text directly using the "Paste Text" option'
        }, { status: 400 });
      }
    }
    
    if (!contentToProcess || contentToProcess.trim().length === 0) {
      return NextResponse.json({
        error: 'Job description content is required'
      }, { status: 400 });
    }

    console.log(`[JOB PROCESSING] Processing job description via ${processingMethod}`);
    console.log(`[JOB PROCESSING] Content length: ${contentToProcess.length} characters`);

    // Load AI settings for attribution
    const { loadServerSettings } = await import('@/lib/ai/settings-loader');
    const settings = loadServerSettings();

    // Parse the job description using AI
    const parsedData = await parseJobDescription(contentToProcess, url, userId);
    
    console.log('[JOB PROCESSING] Job description parsed successfully');

    // Save to database
    console.log('[DATABASE] Saving job description to database...');
    try {
      const { getSupabaseAdminClient } = await import('@/lib/supabase/client');
      const supabaseAdmin = getSupabaseAdminClient();
      
      if (!supabaseAdmin) {
        console.error('[DATABASE] Admin client not available');
        throw new Error('Database connection not available');
      }

      // Try to insert with full schema first, fallback to basic schema if needed
      let jobData, dbError;
      
      try {
        const fullJobDescriptionData = {
          user_id: userId,
          job_title: parsedData.job_title || 'Unknown Position',
          company_name: parsedData.company_name || 'Unknown Company', 
          location: parsedData.location || 'Unknown Location',
          description: contentToProcess,
          url: url || null,
          input_method: processingMethod,
          employment_type: parsedData.employment_type || null,
          salary_range: parsedData.salary_range || null,
          posted_date: parsedData.posted_date || null,
          application_deadline: parsedData.application_deadline || null,
          processing_status: 'completed',
          ai_provider: settings.aiProvider,
          ai_model: settings.aiModel,
          parsed_data: parsedData,
          raw_content: contentToProcess
        };

        const result = await supabaseAdmin
          .from('job_descriptions')
          .insert(fullJobDescriptionData)
          .select()
          .single();
          
        jobData = result.data;
        dbError = result.error;
      } catch (fullSchemaError) {
        console.log('[DATABASE] Full schema insert failed, trying basic schema');
        
        // Fallback to basic schema (original table structure)
        try {
          const basicJobDescriptionData = {
            user_id: userId,
            job_title: parsedData.job_title || 'Unknown Position',
            company_name: parsedData.company_name || 'Unknown Company', 
            location: parsedData.location || 'Unknown Location',
            description: contentToProcess,
            url: url || null,
            parsed_data: parsedData
          };

          const result = await supabaseAdmin
            .from('job_descriptions')
            .insert(basicJobDescriptionData)
            .select()
            .single();
            
          jobData = result.data;
          dbError = result.error;
          
          console.log('[DATABASE] Basic schema insert successful - run schema updates from DATABASE_SCHEMA_UPDATE.md for full features');
        } catch (basicSchemaError) {
          console.error('[DATABASE] Both full and basic schema inserts failed:', basicSchemaError);
          throw basicSchemaError;
        }
      }

      if (dbError) {
        console.error('[DATABASE] Error saving job description:', dbError);
        
        // Check if the error is due to missing columns
        if (dbError.message && dbError.message.includes('Could not find the') && dbError.message.includes('column')) {
          console.log('[DATABASE] Column missing error detected, trying basic schema');
          
          // Try basic schema insert
          try {
            const basicJobDescriptionData = {
              user_id: userId,
              job_title: parsedData.job_title || 'Unknown Position',
              company_name: parsedData.company_name || 'Unknown Company', 
              location: parsedData.location || 'Unknown Location',
              description: contentToProcess,
              url: url || null,
              parsed_data: parsedData
            };

            const basicResult = await supabaseAdmin
              .from('job_descriptions')
              .insert(basicJobDescriptionData)
              .select()
              .single();
              
            if (basicResult.error) {
              throw new Error(`Basic schema insert failed: ${basicResult.error.message}`);
            }
            
            jobData = basicResult.data;
            dbError = null; // Clear the error since basic insert succeeded
            
            console.log('[DATABASE] Basic schema insert successful - run schema updates from DATABASE_SCHEMA_UPDATE.md for full features');
          } catch (basicError) {
            console.error('[DATABASE] Basic schema insert also failed:', basicError);
            throw new Error(`Database save failed: ${dbError.message}`);
          }
        } else {
          throw new Error(`Database save failed: ${dbError.message}`);
        }
      }

      console.log(`[DATABASE] Job description saved successfully with ID: ${jobData.id}`);

      return NextResponse.json({
        success: true,
        message: 'Job description processed and saved successfully',
        jobId: jobData.id,
        inputMethod: processingMethod,
        url: url || null,
        parsedData,
        processingInfo: {
          aiProvider: settings.aiProvider,
          aiModel: settings.aiModel,
          contentLength: contentToProcess.length,
          parseSuccess: !parsedData.parse_error
        }
      });

    } catch (dbError) {
      console.error('[DATABASE] Failed to save job description to database:', dbError);
      
      // Return success for processing but indicate database issue
      return NextResponse.json({
        success: true,
        message: 'Job description processed successfully but not saved to database',
        warning: 'Database save failed - job data was processed but not stored',
        inputMethod: processingMethod,
        url: url || null,
        parsedData,
        processingInfo: {
          aiProvider: settings.aiProvider,
          aiModel: settings.aiModel,
          contentLength: contentToProcess.length,
          parseSuccess: !parsedData.parse_error
        }
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Error processing job description:', error);
    return NextResponse.json({
      error: `Failed to process job description: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}