// Safe wrapper for Puppeteer that handles missing dependencies gracefully

interface PuppeteerScrapingResult {
  success: boolean;
  extractedContent?: string;
  content?: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  error?: string;
  screenshot?: string;
}

/**
 * Check if Puppeteer is available in the current environment
 */
export function isPuppeteerAvailable(): boolean {
  try {
    require.resolve('puppeteer-core');
    return true;
  } catch {
    return false;
  }
}

/**
 * Scrape job posting using Puppeteer (headless Chrome)
 * This executes JavaScript and waits for dynamic content to load
 */
export async function scrapeWithPuppeteer(url: string): Promise<PuppeteerScrapingResult> {
  // Check if puppeteer-core is available
  if (!isPuppeteerAvailable()) {
    console.warn('[PUPPETEER] puppeteer-core not available in this environment');
    return {
      success: false,
      error: 'Puppeteer not available. JavaScript-heavy sites cannot be scraped in this environment.'
    };
  }

  try {
    // Dynamic imports to avoid build errors
    const puppeteer = await import('puppeteer-core');
    const { getPuppeteerOptions } = await import('./chrome-config');
    
    let browser;
    let chromium: any = null;
    
    // Try to load @sparticuz/chromium for production
    if (process.env.VERCEL || process.env.NETLIFY || process.env.NODE_ENV === 'production') {
      try {
        chromium = await import('@sparticuz/chromium');
        console.log('[PUPPETEER] Loaded @sparticuz/chromium for production');
      } catch (e) {
        console.warn('[PUPPETEER] @sparticuz/chromium not available');
      }
    }
    
    console.log('[PUPPETEER] Launching headless browser...');
    
    // Check if we're in production and have chromium available
    if (chromium && (process.env.VERCEL || process.env.NETLIFY || process.env.NODE_ENV === 'production')) {
      console.log('[PUPPETEER] Using @sparticuz/chromium for production environment');
      
      browser = await puppeteer.default.launch({
        args: chromium.default.args,
        defaultViewport: chromium.default.defaultViewport,
        executablePath: await chromium.default.executablePath(),
        headless: chromium.default.headless,
      });
    } else {
      // Development/local environment
      console.log('[PUPPETEER] Using local Chrome installation');
      const launchOptions = getPuppeteerOptions();
      
      browser = await puppeteer.default.launch(launchOptions);
    }
    
    const page = await browser.newPage();
    
    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );
    
    // Enable JavaScript
    await page.setJavaScriptEnabled(true);
    
    console.log('[PUPPETEER] Navigating to URL...');
    
    // Navigate to the page
    await page.goto(url, {
      waitUntil: 'networkidle0', // Wait until no network activity
      timeout: 30000
    });
    
    // Wait a bit more for any lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // For ePlus specifically, wait for job content
    if (url.includes('eplus')) {
      console.log('[PUPPETEER] Detected ePlus, waiting for specific elements...');
      try {
        await Promise.race([
          page.waitForSelector('text/YOUR IMPACT', { timeout: 10000 }),
          page.waitForSelector('text/QUALIFICATIONS', { timeout: 10000 }),
          page.waitForSelector('[class*="job-description"]', { timeout: 10000 })
        ]);
      } catch (e) {
        console.log('[PUPPETEER] Timeout waiting for ePlus elements, continuing...');
      }
    }
    
    // Take a screenshot for debugging
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      fullPage: true 
    });
    
    // Extract content using multiple strategies
    const result = await page.evaluate(() => {
      // Remove unwanted elements
      const unwantedSelectors = [
        'script', 'style', 'noscript', 'iframe',
        'nav', 'header', 'footer', '.navbar', '.header', '.footer',
        '[class*="cookie"]', '[class*="banner"]', '[class*="popup"]'
      ];
      
      unwantedSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      // Try to find job-specific content
      const jobData: any = {
        fullText: document.body.innerText,
        title: '',
        company: '',
        location: '',
        description: ''
      };
      
      // Extract title
      const titleSelectors = ['h1', '[class*="job-title"]', '[class*="position-title"]'];
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          jobData.title = element.textContent.trim();
          break;
        }
      }
      
      // Extract company
      const companySelectors = ['[class*="company-name"]', '[class*="employer"]'];
      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          jobData.company = element.textContent.trim();
          break;
        }
      }
      
      // Extract location
      const locationSelectors = ['[class*="location"]', '[class*="job-location"]'];
      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          jobData.location = element.textContent.trim();
          break;
        }
      }
      
      // Extract main content areas
      const contentSelectors = [
        '[class*="description"]',
        '[class*="job-description"]',
        'main',
        'article',
        '[role="main"]'
      ];
      
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent && element.textContent.length > 200) {
          jobData.description = element.textContent.trim();
          break;
        }
      }
      
      // Look for specific sections
      const sections: any = {};
      const sectionKeywords = ['YOUR IMPACT', 'QUALIFICATIONS', 'REQUIREMENTS', 'RESPONSIBILITIES', 'BENEFITS'];
      
      for (const keyword of sectionKeywords) {
        // Find elements containing the keyword
        const xpath = `//*[contains(text(),'${keyword}')]`;
        const elements = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
        let node = elements.iterateNext();
        
        if (node && node.parentElement) {
          // Get the content after this heading
          let content = '';
          let sibling = node.parentElement.nextElementSibling;
          
          while (sibling && !sectionKeywords.some(k => sibling?.textContent?.includes(k))) {
            content += sibling.textContent + '\n';
            sibling = sibling.nextElementSibling;
          }
          
          if (content) {
            sections[keyword] = content.trim();
          }
        }
      }
      
      jobData.sections = sections;
      
      return jobData;
    });
    
    // Format the extracted content
    let formattedContent = '';
    
    if (result.title) formattedContent += `Job Title: ${result.title}\n`;
    if (result.company) formattedContent += `Company: ${result.company}\n`;
    if (result.location) formattedContent += `Location: ${result.location}\n`;
    formattedContent += '\n';
    
    // Add sections
    if (result.sections && Object.keys(result.sections).length > 0) {
      for (const [section, content] of Object.entries(result.sections)) {
        formattedContent += `${section}:\n${content}\n\n`;
      }
    } else if (result.description) {
      formattedContent += `Description:\n${result.description}\n`;
    }
    
    // If we didn't get structured content, use the full text
    if (formattedContent.length < 200 && result.fullText) {
      formattedContent = result.fullText;
    }
    
    console.log(`[PUPPETEER] Extracted ${formattedContent.length} characters`);
    
    await browser.close();
    
    return {
      success: true,
      extractedContent: formattedContent,
      content: formattedContent,
      title: result.title,
      company: result.company,
      location: result.location,
      description: result.description || formattedContent,
      screenshot: screenshot as string
    };
    
  } catch (error) {
    console.error('[PUPPETEER] Error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Puppeteer scraping failed'
    };
  }
}