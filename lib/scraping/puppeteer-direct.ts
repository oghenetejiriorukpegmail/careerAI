import puppeteer, { Page } from 'puppeteer';
import { analyzeJobScreenshotWithModel } from '@/lib/ai/multimodal-service';

interface DirectPuppeteerResult {
  success: boolean;
  extractedContent?: string;
  textContent?: string;
  error?: string;
  contentSource?: string;
}

/**
 * LinkedIn-specific: click "Show more" and expand the full job description
 */
async function expandLinkedInContent(page: Page): Promise<void> {
  try {
    // Click "Show more" button on job description
    const showMoreSelectors = [
      'button.show-more-less-html__button--more',
      'button[aria-label="Show more"]',
      'button[aria-label="Click to see more"]',
      '.show-more-less-html__button',
      '[data-tracking-control-name="public_jobs_show-more-html-btn"]'
    ];
    
    for (const selector of showMoreSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          console.log(`[PUPPETEER DIRECT] Clicked "Show more" via: ${selector}`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          break;
        }
      } catch { /* selector not found, try next */ }
    }
    
    // Also try to dismiss any sign-in modals/overlays blocking content
    const dismissSelectors = [
      'button[data-tracking-control-name="public_jobs_contextual-sign-in-modal_modal_dismiss"]',
      '.contextual-sign-in-modal__modal-dismiss',
      'button.modal__dismiss',
      '[aria-label="Dismiss"]',
      '.artdeco-modal__dismiss'
    ];
    
    for (const selector of dismissSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          console.log(`[PUPPETEER DIRECT] Dismissed modal via: ${selector}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch { /* no modal to dismiss */ }
    }
  } catch (err) {
    console.log('[PUPPETEER DIRECT] LinkedIn expansion attempt completed (no critical errors)');
  }
}

/**
 * Extract structured text from the page, filtering out navigation/sidebar noise.
 * For LinkedIn, targets the job description container specifically.
 */
async function extractCleanText(page: Page, url: string): Promise<string> {
  const isLinkedIn = url.toLowerCase().includes('linkedin.com');
  
  if (isLinkedIn) {
    // LinkedIn-specific extraction: target the job description container
    const linkedInText = await page.evaluate(() => {
      const sections: string[] = [];
      
      // Job title
      const titleEl = document.querySelector('.top-card-layout__title, .topcard__title, h1.t-24, h1');
      if (titleEl) sections.push(`Job Title: ${titleEl.textContent?.trim()}`);
      
      // Company name
      const companyEl = document.querySelector('.topcard__org-name-link, .top-card-layout__company-url, a[data-tracking-control-name="public_jobs_topcard-org-name"]');
      if (companyEl) sections.push(`Company: ${companyEl.textContent?.trim()}`);
      
      // Location
      const locationEl = document.querySelector('.topcard__flavor--bullet, .top-card-layout__bullet');
      if (locationEl) sections.push(`Location: ${locationEl.textContent?.trim()}`);
      
      // Salary
      const salaryEl = document.querySelector('.salary-main-rail__data-amount, .compensation__salary, .job-details-preferences-and-skills__pill');
      if (salaryEl) sections.push(`Salary: ${salaryEl.textContent?.trim()}`);
      
      // Pay range section
      const payRangeEl = document.querySelector('.salary-main-rail, .compensation');
      if (payRangeEl) {
        const payText = payRangeEl.textContent?.trim();
        if (payText && !sections.some(s => s.includes(payText))) {
          sections.push(`Pay Range: ${payText}`);
        }
      }
      
      // Seniority, employment type, industry
      const criteriaEls = document.querySelectorAll('.description__job-criteria-item, .job-criteria__item');
      criteriaEls.forEach(el => {
        const label = el.querySelector('.description__job-criteria-subheader, .job-criteria__subheader')?.textContent?.trim();
        const value = el.querySelector('.description__job-criteria-text, .job-criteria__text')?.textContent?.trim();
        if (label && value) sections.push(`${label}: ${value}`);
      });
      
      // Main job description body — this is the critical part
      const descContainers = [
        '.show-more-less-html__markup',
        '.description__text',
        '.decorated-job-posting__details',
        '.core-section-container__content',
        '.jobs-description__content',
        '.jobs-box__html-content'
      ];
      
      for (const selector of descContainers) {
        const el = document.querySelector(selector);
        if (el && el.textContent && el.textContent.trim().length > 100) {
          sections.push(`\nJob Description:\n${el.textContent.trim()}`);
          break;
        }
      }
      
      // If we couldn't find the structured description, grab the main content area
      if (!sections.some(s => s.startsWith('\nJob Description'))) {
        const mainContent = document.querySelector('.decorated-job-posting, .two-pane-serp-page__detail-view, main');
        if (mainContent) {
          // Remove sidebar elements before extracting
          const clone = mainContent.cloneNode(true) as Element;
          clone.querySelectorAll('.similar-jobs, .people-also-viewed, .aside-container, nav, footer, .contextual-sign-in-modal').forEach(el => el.remove());
          const cleanText = clone.textContent?.trim();
          if (cleanText && cleanText.length > 200) {
            sections.push(`\nPage Content:\n${cleanText}`);
          }
        }
      }
      
      return sections.join('\n');
    });
    
    if (linkedInText && linkedInText.length > 100) {
      console.log(`[PUPPETEER DIRECT] LinkedIn-specific extraction: ${linkedInText.length} chars`);
      return linkedInText;
    }
  }
  
  // Generic extraction for non-LinkedIn sites
  const textContent = await page.evaluate(() => {
    // Remove noise elements
    const noiseSelectors = 'script, style, noscript, iframe, nav, footer, .sidebar, .similar-jobs, .people-also-viewed, .advertisement, [role="complementary"], [role="navigation"]';
    const clone = document.body.cloneNode(true) as Element;
    clone.querySelectorAll(noiseSelectors).forEach(el => el.remove());
    return clone.textContent?.trim() || '';
  });
  
  return textContent;
}

/**
 * Use Puppeteer directly to take screenshots and extract job data
 * Enhanced with LinkedIn-specific handling and text+vision dual extraction
 */
export async function scrapeWithDirectPuppeteer(url: string, visionModel?: string): Promise<DirectPuppeteerResult> {
  console.log('[PUPPETEER DIRECT] Starting screenshot-based extraction for:', url);
  
  const isLinkedIn = url.toLowerCase().includes('linkedin.com');
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set a realistic user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 900 });
    
    // Navigate to the URL
    console.log('[PUPPETEER DIRECT] Navigating to URL...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for initial render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // LinkedIn-specific: expand content and dismiss modals
    if (isLinkedIn) {
      console.log('[PUPPETEER DIRECT] LinkedIn detected — expanding content...');
      await expandLinkedInContent(page);
    }
    
    // Scroll to load lazy content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract clean text content (filtered, structured)
    const textContent = await extractCleanText(page, url);
    console.log(`[PUPPETEER DIRECT] Extracted ${textContent.length} characters of clean text content`);
    
    // Take screenshot for vision AI
    console.log('[PUPPETEER DIRECT] Taking full-page screenshot...');
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      type: 'jpeg',
      fullPage: true,
      quality: 80
    });
    
    if (!screenshot) {
      throw new Error('Failed to take screenshot');
    }
    
    console.log(`[PUPPETEER DIRECT] Screenshot captured, size: ${screenshot.length} characters`);
    
    // DUAL EXTRACTION STRATEGY:
    // 1. If we have substantial text content (>500 chars), prefer text — it's more accurate
    // 2. Use vision AI as enhancement/fallback, not primary source
    // 3. Combine both when text is limited but screenshot has more visible content
    
    if (textContent.length > 500) {
      // Good text extraction — use text as primary, vision as supplement
      console.log('[PUPPETEER DIRECT] Using extracted text as primary content source');
      
      try {
        const visionContent = await analyzeJobScreenshotWithModel(screenshot, visionModel);
        console.log('[PUPPETEER DIRECT] Vision AI analysis complete (supplementary)');
        
        // Combine: text content + any extra details vision caught
        const combined = `--- EXTRACTED TEXT (PRIMARY) ---\n${textContent}\n\n--- VISUAL ANALYSIS (SUPPLEMENTARY) ---\n${visionContent}`;
        
        return {
          success: true,
          extractedContent: combined,
          textContent,
          contentSource: 'text+vision'
        };
      } catch (aiError) {
        console.log('[PUPPETEER DIRECT] Vision AI failed, using text content only');
        return {
          success: true,
          extractedContent: textContent,
          textContent,
          contentSource: 'text-only'
        };
      }
    } else {
      // Limited text — rely on vision AI as primary
      console.log('[PUPPETEER DIRECT] Limited text content, using vision AI as primary');
      
      try {
        const extractedContent = await analyzeJobScreenshotWithModel(screenshot, visionModel);
        console.log('[PUPPETEER DIRECT] Vision AI analysis complete (primary)');
        
        // Prepend whatever text we did get for context
        const combined = textContent.length > 50 
          ? `--- EXTRACTED TEXT ---\n${textContent}\n\n--- VISUAL ANALYSIS ---\n${extractedContent}`
          : extractedContent;
        
        return {
          success: true,
          extractedContent: combined,
          textContent,
          contentSource: 'vision-primary'
        };
      } catch (aiError) {
        console.error('[PUPPETEER DIRECT] AI analysis failed:', aiError);
        
        if (textContent.length > 100) {
          return {
            success: true,
            extractedContent: textContent,
            textContent,
            error: 'AI analysis failed, using extracted text',
            contentSource: 'text-fallback'
          };
        }
        
        throw aiError;
      }
    }
    
  } catch (error) {
    console.error('[PUPPETEER DIRECT] Error during extraction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during screenshot extraction'
    };
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extract text content from a page using Puppeteer (no screenshots)
 */
export async function extractTextWithPuppeteer(url: string): Promise<DirectPuppeteerResult> {
  console.log('[PUPPETEER DIRECT] Starting text extraction for:', url);
  
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    const page = await browser.newPage();
    
    // Navigate to the URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Extract all text content
    const extractedContent = await page.evaluate(() => {
      // Remove unwanted elements
      const unwanted = document.querySelectorAll('script, style, noscript, iframe');
      unwanted.forEach(el => el.remove());
      
      // Get all text content from the page
      return document.body.innerText || document.body.textContent || '';
    });
    
    if (!extractedContent || extractedContent.length < 100) {
      throw new Error('No meaningful content extracted from page');
    }
    
    console.log(`[PUPPETEER DIRECT] Extracted ${extractedContent.length} characters`);
    
    return {
      success: true,
      extractedContent
    };
    
  } catch (error) {
    console.error('[PUPPETEER DIRECT] Text extraction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}