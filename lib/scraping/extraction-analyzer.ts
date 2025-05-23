import * as cheerio from 'cheerio';

interface ExtractionAnalysis {
  htmlSize: number;
  hasJavaScript: boolean;
  isReactApp: boolean;
  isAngularApp: boolean;
  isVueApp: boolean;
  hasIframes: boolean;
  hasShadowDOM: boolean;
  visibleTextLength: number;
  scriptToHTMLRatio: number;
  recommendedAction: string;
  technicalDetails: string[];
}

/**
 * Analyze why extraction failed and provide guidance
 */
export function analyzeExtractionFailure(html: string, url: string): ExtractionAnalysis {
  const $ = cheerio.load(html);
  const analysis: ExtractionAnalysis = {
    htmlSize: html.length,
    hasJavaScript: false,
    isReactApp: false,
    isAngularApp: false,
    isVueApp: false,
    hasIframes: false,
    hasShadowDOM: false,
    visibleTextLength: 0,
    scriptToHTMLRatio: 0,
    recommendedAction: '',
    technicalDetails: []
  };
  
  // Calculate script to HTML ratio
  const scriptContent = $('script').text().length;
  analysis.scriptToHTMLRatio = scriptContent / html.length;
  analysis.hasJavaScript = scriptContent > 1000;
  
  // Detect frameworks
  analysis.isReactApp = html.includes('react') || html.includes('_react') || html.includes('__REACT');
  analysis.isAngularApp = html.includes('ng-') || html.includes('angular');
  analysis.isVueApp = html.includes('v-') || html.includes('vue') || html.includes('Vue');
  
  // Check for iframes
  analysis.hasIframes = $('iframe').length > 0;
  
  // Check for shadow DOM
  analysis.hasShadowDOM = html.includes('shadowRoot') || html.includes('shadow-root');
  
  // Get visible text length
  $('script, style, noscript').remove();
  analysis.visibleTextLength = $('body').text().trim().length;
  
  // Technical details
  if (analysis.htmlSize > 500000) {
    analysis.technicalDetails.push(`Large HTML file (${Math.round(analysis.htmlSize / 1024)}KB)`);
  }
  
  if (analysis.scriptToHTMLRatio > 0.7) {
    analysis.technicalDetails.push(`${Math.round(analysis.scriptToHTMLRatio * 100)}% of content is JavaScript`);
  }
  
  if (analysis.isReactApp) {
    analysis.technicalDetails.push('React application detected');
  } else if (analysis.isAngularApp) {
    analysis.technicalDetails.push('Angular application detected');
  } else if (analysis.isVueApp) {
    analysis.technicalDetails.push('Vue.js application detected');
  }
  
  if (analysis.hasIframes) {
    analysis.technicalDetails.push('Content may be inside iframes');
  }
  
  if (analysis.hasShadowDOM) {
    analysis.technicalDetails.push('Uses Shadow DOM (content hidden from scraping)');
  }
  
  if (analysis.visibleTextLength < 500) {
    analysis.technicalDetails.push(`Very little visible text (${analysis.visibleTextLength} characters)`);
  }
  
  // Determine recommended action
  if (analysis.scriptToHTMLRatio > 0.8 && analysis.visibleTextLength < 1000) {
    analysis.recommendedAction = 
      'This is a JavaScript-heavy application that loads content dynamically. ' +
      'Please open the page in your browser, wait for it to fully load, then copy and paste the job description.';
  } else if (analysis.hasIframes) {
    analysis.recommendedAction = 
      'The job content appears to be inside an iframe which cannot be accessed directly. ' +
      'Please copy and paste the job description from the webpage.';
  } else if (analysis.hasShadowDOM) {
    analysis.recommendedAction = 
      'This page uses Shadow DOM technology which hides content from scrapers. ' +
      'Please copy and paste the job description manually.';
  } else if (url.includes('eplus')) {
    analysis.recommendedAction = 
      'ePlus careers uses a dynamic application that requires JavaScript. ' +
      'To get the job description:\n' +
      '1. Open the link in your browser\n' +
      '2. Wait for the page to fully load (you should see "YOUR IMPACT" and "QUALIFICATIONS" sections)\n' +
      '3. Select all text (Ctrl+A or Cmd+A)\n' +
      '4. Copy and paste it here using the "Paste Text" option';
  } else {
    analysis.recommendedAction = 
      'Unable to extract job content from this page. ' +
      'Please copy and paste the job description directly from the webpage.';
  }
  
  return analysis;
}

/**
 * Generate a user-friendly error message based on the analysis
 */
export function generateErrorMessage(analysis: ExtractionAnalysis, url: string): string {
  let message = analysis.recommendedAction + '\n\n';
  
  if (analysis.technicalDetails.length > 0) {
    message += 'Technical details:\n';
    analysis.technicalDetails.forEach(detail => {
      message += `• ${detail}\n`;
    });
  }
  
  return message;
}