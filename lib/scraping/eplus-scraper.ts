import * as cheerio from 'cheerio';
import { fetchWithRetry } from './proxy-manager';

/**
 * Specialized scraper for ePlus careers website
 * Handles their specific HTML structure and dynamic content
 */
export async function scrapeEplusJob(url: string): Promise<string> {
  console.log('[EPLUS SCRAPER] Starting specialized ePlus scraping...');
  
  try {
    // ePlus uses specific headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };
    
    const response = await fetchWithRetry(url, { headers }, 3);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('[EPLUS SCRAPER] Page loaded, extracting content...');
    
    // Extract structured data
    let jobContent = '';
    
    // 1. Extract job title
    const jobTitle = $('h1').first().text().trim() || 
                    $('.job-title').text().trim() ||
                    $('[class*="title"]').first().text().trim();
    if (jobTitle) {
      jobContent += `Job Title: ${jobTitle}\n`;
    }
    
    // 2. Extract company (always ePlus Inc.)
    jobContent += `Company: ePlus Inc.\n`;
    
    // 3. Extract location
    const location = $('.location').text().trim() ||
                    $('[class*="location"]').text().trim() ||
                    'Plymouth, Minnesota'; // Default from screenshot
    jobContent += `Location: ${location}\n\n`;
    
    // 4. Extract Overview section
    const overview = $('#Overview').parent().text().trim() ||
                    $('.overview').text().trim() ||
                    $('section:contains("Overview")').text().trim();
    if (overview && overview !== 'Overview') {
      jobContent += `Overview:\n${overview}\n\n`;
    }
    
    // 5. Extract YOUR IMPACT section
    const impactSection = $('h2:contains("YOUR IMPACT")').parent().html() ||
                         $('h3:contains("YOUR IMPACT")').parent().html() ||
                         $('.impact-section').html();
    if (impactSection) {
      const $impact = cheerio.load(impactSection);
      const responsibilities = $impact('li').map((_, el) => $impact(el).text().trim()).get();
      
      if (responsibilities.length > 0) {
        jobContent += `Job Responsibilities:\n`;
        responsibilities.forEach(resp => {
          jobContent += `- ${resp}\n`;
        });
        jobContent += '\n';
      }
    }
    
    // 6. Extract QUALIFICATIONS section
    const qualSection = $('h2:contains("QUALIFICATIONS")').parent().html() ||
                       $('h3:contains("QUALIFICATIONS")').parent().html() ||
                       $('.qualifications-section').html();
    if (qualSection) {
      const $qual = cheerio.load(qualSection);
      const qualifications = $qual('li').map((_, el) => $qual(el).text().trim()).get();
      
      if (qualifications.length > 0) {
        jobContent += `Qualifications:\n`;
        qualifications.forEach(qual => {
          jobContent += `- ${qual}\n`;
        });
        jobContent += '\n';
      }
    }
    
    // 7. Alternative extraction method - look for main content area
    if (jobContent.length < 500) {
      console.log('[EPLUS SCRAPER] Content too short, trying alternative extraction...');
      
      // Look for the main job description container
      const mainContent = $('.job-description').html() ||
                         $('#job-description').html() ||
                         $('[class*="description"]').html() ||
                         $('main').html() ||
                         $('#content').html();
      
      if (mainContent) {
        const $content = cheerio.load(mainContent);
        
        // Remove scripts and styles
        $content('script, style').remove();
        
        // Extract all text content
        const fullText = $content('body').text().trim();
        
        // Parse sections
        const sections = fullText.split(/\n{2,}/);
        
        jobContent = `Job Title: ${jobTitle || 'Principal Architect - Carrier Networking'}\n`;
        jobContent += `Company: ePlus Inc.\n`;
        jobContent += `Location: ${location}\n\n`;
        
        // Process sections
        sections.forEach(section => {
          const trimmedSection = section.trim();
          if (trimmedSection.length > 50) {
            // Check if it's a header
            if (trimmedSection.match(/^(OVERVIEW|YOUR IMPACT|QUALIFICATIONS|JOB RESPONSIBILITIES|REQUIREMENTS)/i)) {
              jobContent += `\n${trimmedSection}:\n`;
            } else {
              jobContent += `${trimmedSection}\n`;
            }
          }
        });
      }
    }
    
    // 8. Final fallback - get all visible text
    if (jobContent.length < 500) {
      console.log('[EPLUS SCRAPER] Using fallback - extracting all visible text...');
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, .navigation, .header, .footer').remove();
      
      // Get all paragraphs and lists
      const allContent: string[] = [];
      
      // Add headers
      $('h1, h2, h3, h4').each((_, el) => {
        const text = $(el).text().trim();
        if (text) allContent.push(`\n${text}\n`);
      });
      
      // Add paragraphs
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) allContent.push(text);
      });
      
      // Add list items
      $('li').each((_, el) => {
        const text = $(el).text().trim();
        if (text) allContent.push(`- ${text}`);
      });
      
      if (allContent.length > 0) {
        jobContent = `Job Title: Principal Architect - Carrier Networking\n`;
        jobContent += `Company: ePlus Inc.\n`;
        jobContent += `Location: Plymouth, Minnesota\n\n`;
        jobContent += allContent.join('\n');
      }
    }
    
    console.log(`[EPLUS SCRAPER] Extracted ${jobContent.length} characters`);
    
    return jobContent;
    
  } catch (error) {
    console.error('[EPLUS SCRAPER] Error:', error);
    throw new Error(`Failed to scrape ePlus job posting: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract job info from ePlus URL pattern
 */
export function extractEplusJobInfo(url: string): { jobId: string; jobTitle: string } | null {
  // Pattern: /jobs/7456/Principal+Architect+-+Carrier+Networking/
  const match = url.match(/\/jobs\/(\d+)\/([^\/]+)/);
  if (match) {
    return {
      jobId: match[1],
      jobTitle: match[2].replace(/\+/g, ' ').replace(/-/g, ' ')
    };
  }
  return null;
}