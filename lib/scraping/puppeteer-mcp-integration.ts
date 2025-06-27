// Puppeteer MCP Integration for Claude Code
// This file provides integration with Puppeteer MCP tools when running in Claude Code

import { scrapeJobWithScreenshot } from './puppeteer-screenshot';

// These functions will be provided by Claude Code at runtime
declare global {
  var mcp__puppeteer__puppeteer_navigate: any;
  var mcp__puppeteer__puppeteer_screenshot: any;
}

interface PuppeteerMCPResult {
  success: boolean;
  extractedContent?: string;
  error?: string;
}

/**
 * Check if we're running in Claude Code with MCP tools available
 */
export function hasPuppeteerMCP(): boolean {
  // Check if MCP Puppeteer functions are available in global scope
  // In Claude Code environment, these would be available as global functions
  // For now, always return false to use the mock implementation
  return false;
}

/**
 * Use Puppeteer MCP to scrape a job posting via screenshot
 */
export async function scrapeWithPuppeteerMCPIntegration(url: string, visionModel?: string): Promise<PuppeteerMCPResult> {
  console.log('[PUPPETEER MCP INTEGRATION] Checking for MCP availability...');
  
  if (!hasPuppeteerMCP()) {
    console.log('[PUPPETEER MCP INTEGRATION] MCP tools not available, falling back to mock');
    return {
      success: false,
      error: 'Puppeteer MCP tools not available in this environment'
    };
  }
  
  try {
    console.log('[PUPPETEER MCP INTEGRATION] Using real MCP tools for screenshot extraction');
    
    // Use the actual MCP tools
    const navigate = global.mcp__puppeteer__puppeteer_navigate;
    const screenshot = global.mcp__puppeteer__puppeteer_screenshot;
    
    // Run the screenshot-based extraction
    const extractedContent = await scrapeJobWithScreenshot(url, navigate, screenshot, visionModel);
    
    return {
      success: true,
      extractedContent
    };
    
  } catch (error) {
    console.error('[PUPPETEER MCP INTEGRATION] Error during MCP scraping:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during MCP scraping'
    };
  }
}

/**
 * Direct screenshot capture for debugging
 */
export async function captureJobPageScreenshot(url: string): Promise<string | null> {
  if (!hasPuppeteerMCP()) {
    console.log('[PUPPETEER MCP INTEGRATION] Cannot capture screenshot - MCP not available');
    return null;
  }
  
  try {
    // Navigate to the page
    await global.mcp__puppeteer__puppeteer_navigate({ url });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take screenshot
    const screenshotData = await global.mcp__puppeteer__puppeteer_screenshot({
      name: 'job-page-debug',
      encoded: true,
      width: 1920,
      height: 1080
    });
    
    return screenshotData;
  } catch (error) {
    console.error('[PUPPETEER MCP INTEGRATION] Screenshot capture failed:', error);
    return null;
  }
}