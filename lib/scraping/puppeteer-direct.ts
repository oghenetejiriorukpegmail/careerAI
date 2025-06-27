import puppeteer from 'puppeteer';
import { analyzeJobScreenshotWithModel } from '@/lib/ai/multimodal-service';

interface DirectPuppeteerResult {
  success: boolean;
  extractedContent?: string;
  error?: string;
}

/**
 * Use Puppeteer directly to take screenshots and extract job data
 * This is the production implementation that doesn't rely on MCP or mocks
 */
export async function scrapeWithDirectPuppeteer(url: string, visionModel?: string): Promise<DirectPuppeteerResult> {
  console.log('[PUPPETEER DIRECT] Starting screenshot-based extraction for:', url);
  
  let browser;
  
  try {
    // Launch browser with necessary flags for production
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
    
    // Set viewport to a reasonable size to reduce screenshot size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the URL
    console.log('[PUPPETEER DIRECT] Navigating to URL...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for page to fully load and render
    console.log('[PUPPETEER DIRECT] Waiting for dynamic content...');
    
    // Give time for JavaScript rendering
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Scroll to bottom to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Scroll back to top
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take full-page screenshot
    console.log('[PUPPETEER DIRECT] Taking full-page screenshot...');
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      type: 'jpeg',
      fullPage: true, // Capture entire page
      quality: 80 // Good quality balance
    });
    
    if (!screenshot) {
      throw new Error('Failed to take screenshot');
    }
    
    console.log(`[PUPPETEER DIRECT] Screenshot captured, size: ${screenshot.length} characters`);
    
    // Also try to extract text content as fallback
    const textContent = await page.evaluate(() => {
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      
      // Get all text content from the page
      return document.body.innerText || document.body.textContent || '';
    });
    
    console.log(`[PUPPETEER DIRECT] Extracted ${textContent.length} characters of text content`);
    
    // Use AI to analyze the full-page screenshot
    console.log('[PUPPETEER DIRECT] Analyzing full-page screenshot with AI...');
    
    try {
      const extractedContent = await analyzeJobScreenshotWithModel(screenshot, visionModel);
      
      console.log('[PUPPETEER DIRECT] AI analysis complete');
      
      return {
        success: true,
        extractedContent
      };
      
    } catch (aiError) {
      console.error('[PUPPETEER DIRECT] AI analysis failed:', aiError);
      
      // If AI fails but we have text content, return that
      if (textContent && textContent.length > 500) {
        console.log('[PUPPETEER DIRECT] Falling back to extracted text content');
        return {
          success: true,
          extractedContent: textContent,
          error: 'AI analysis failed, using extracted text'
        };
      }
      
      throw aiError;
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