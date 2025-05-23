import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Debug function to analyze webpage structure
 */
export async function debugWebpage(html: string, url: string): Promise<void> {
  console.log('[DEBUG SCRAPER] Analyzing webpage structure...');
  
  const $ = cheerio.load(html);
  
  // Log basic page info
  console.log(`[DEBUG] Page title: ${$('title').text()}`);
  console.log(`[DEBUG] HTML length: ${html.length} characters`);
  
  // Look for job-related content
  const jobSelectors = [
    'h1', 'h2', 'h3',
    '[class*="job"]',
    '[class*="position"]',
    '[class*="description"]',
    '[class*="qualification"]',
    '[class*="requirement"]',
    '[class*="responsibility"]',
    '[class*="impact"]',
    '[id*="job"]',
    '[id*="description"]',
    'main',
    'article',
    '.content',
    '#content'
  ];
  
  console.log('[DEBUG] Searching for job content...');
  
  for (const selector of jobSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      console.log(`[DEBUG] Found ${elements.length} elements matching "${selector}"`);
      elements.each((i, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        if (text.length > 50 && text.length < 500) {
          console.log(`[DEBUG]   - ${selector} [${i}]: "${text.substring(0, 100)}..."`);
        }
      });
    }
  }
  
  // Look for specific ePlus content
  if (url.includes('eplus')) {
    console.log('[DEBUG] Checking for ePlus-specific content...');
    
    // Check for JSON data
    $('script[type="application/json"], script[type="application/ld+json"]').each((i, el) => {
      const content = $(el).text();
      if (content.length > 0) {
        console.log(`[DEBUG] Found JSON script tag ${i}: ${content.substring(0, 200)}...`);
      }
    });
    
    // Check for data attributes
    $('[data-job], [data-position], [data-description]').each((i, el) => {
      const $el = $(el);
      console.log(`[DEBUG] Found data attribute element: ${(el as any).name || 'unknown'} with attributes:`, $el.attr());
    });
  }
  
  // Save HTML for manual inspection if needed
  try {
    const debugDir = path.join(process.cwd(), 'debug-scraping');
    await fs.mkdir(debugDir, { recursive: true });
    const filename = `debug-${Date.now()}.html`;
    await fs.writeFile(path.join(debugDir, filename), html);
    console.log(`[DEBUG] HTML saved to debug-scraping/${filename}`);
  } catch (error) {
    console.error('[DEBUG] Failed to save debug HTML:', error);
  }
  
  // Check for iframes
  const iframes = $('iframe');
  if (iframes.length > 0) {
    console.log(`[DEBUG] Found ${iframes.length} iframes - content might be in iframe`);
  }
  
  // Check for shadow DOM indicators
  if (html.includes('shadowRoot') || html.includes('shadow-root')) {
    console.log('[DEBUG] Page might be using Shadow DOM');
  }
  
  // Check for React/Vue/Angular
  if (html.includes('__NEXT_DATA__') || html.includes('_next')) {
    console.log('[DEBUG] Next.js application detected');
  }
  if (html.includes('ng-') || html.includes('angular')) {
    console.log('[DEBUG] Angular application detected');
  }
  if (html.includes('v-') || html.includes('vue')) {
    console.log('[DEBUG] Vue application detected');
  }
  if (html.includes('react') || html.includes('_react')) {
    console.log('[DEBUG] React application detected');
  }
}