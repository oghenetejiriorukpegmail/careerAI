const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function analyzeAlignments() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  });

  const screenshotsDir = path.join(__dirname, '..', 'alignment-screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });

  const page = await browser.newPage();
  
  // Set different viewport sizes to test responsiveness
  const viewports = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'laptop', width: 1366, height: 768 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 }
  ];

  const pages = [
    { path: '/', name: 'homepage' },
    { path: '/login', name: 'login' },
    { path: '/signup', name: 'signup' },
    { path: '/dashboard', name: 'dashboard' },
    { path: '/dashboard/resume', name: 'resume-list' },
    { path: '/dashboard/generate', name: 'generate' },
    { path: '/dashboard/job-opportunities', name: 'job-opportunities' },
    { path: '/dashboard/applications', name: 'applications' },
    { path: '/dashboard/settings', name: 'settings' }
  ];

  const alignmentIssues = [];

  for (const viewport of viewports) {
    await page.setViewport({ width: viewport.width, height: viewport.height });
    
    for (const pageInfo of pages) {
      try {
        console.log(`Analyzing ${pageInfo.name} at ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        await page.goto(`http://localhost:3000${pageInfo.path}`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Take screenshot
        const screenshotPath = path.join(screenshotsDir, `${pageInfo.name}-${viewport.name}.png`);
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });

        // Check for common alignment issues
        const issues = await page.evaluate(() => {
          const problems = [];

          // Check for horizontal overflow
          if (document.documentElement.scrollWidth > window.innerWidth) {
            problems.push({
              type: 'horizontal-overflow',
              description: 'Page has horizontal scrollbar',
              scrollWidth: document.documentElement.scrollWidth,
              windowWidth: window.innerWidth
            });
          }

          // Check for overlapping elements
          const elements = document.querySelectorAll('*');
          const overlaps = [];
          
          for (let i = 0; i < Math.min(elements.length, 100); i++) {
            const rect1 = elements[i].getBoundingClientRect();
            if (rect1.width === 0 || rect1.height === 0) continue;
            
            for (let j = i + 1; j < Math.min(elements.length, 100); j++) {
              const rect2 = elements[j].getBoundingClientRect();
              if (rect2.width === 0 || rect2.height === 0) continue;
              
              // Check if elements are siblings (not parent-child)
              if (!elements[i].contains(elements[j]) && !elements[j].contains(elements[i])) {
                if (!(rect1.right < rect2.left || 
                      rect2.right < rect1.left || 
                      rect1.bottom < rect2.top || 
                      rect2.bottom < rect1.top)) {
                  overlaps.push({
                    element1: elements[i].tagName + (elements[i].className ? '.' + elements[i].className : ''),
                    element2: elements[j].tagName + (elements[j].className ? '.' + elements[j].className : '')
                  });
                }
              }
            }
          }

          if (overlaps.length > 0) {
            problems.push({
              type: 'overlapping-elements',
              description: 'Elements are overlapping',
              count: overlaps.length,
              examples: overlaps.slice(0, 3)
            });
          }

          // Check for text overflow
          const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button');
          const textOverflows = [];
          
          textElements.forEach(el => {
            if (el.scrollWidth > el.clientWidth) {
              textOverflows.push({
                element: el.tagName + (el.className ? '.' + el.className : ''),
                text: el.textContent.substring(0, 50) + '...',
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth
              });
            }
          });

          if (textOverflows.length > 0) {
            problems.push({
              type: 'text-overflow',
              description: 'Text is overflowing containers',
              count: textOverflows.length,
              examples: textOverflows.slice(0, 3)
            });
          }

          // Check for broken layouts (elements outside viewport)
          const viewportWidth = window.innerWidth;
          const elementsOutside = [];
          
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > viewportWidth && rect.width > 0) {
              elementsOutside.push({
                element: el.tagName + (el.className ? '.' + el.className : ''),
                rightPosition: rect.right,
                viewportWidth: viewportWidth
              });
            }
          });

          if (elementsOutside.length > 0) {
            problems.push({
              type: 'elements-outside-viewport',
              description: 'Elements extending beyond viewport',
              count: elementsOutside.length,
              examples: elementsOutside.slice(0, 3)
            });
          }

          return problems;
        });

        if (issues.length > 0) {
          alignmentIssues.push({
            page: pageInfo.name,
            path: pageInfo.path,
            viewport: viewport.name,
            viewportSize: `${viewport.width}x${viewport.height}`,
            issues: issues,
            screenshot: screenshotPath
          });
        }

      } catch (error) {
        console.error(`Error analyzing ${pageInfo.name} at ${viewport.name}:`, error.message);
        alignmentIssues.push({
          page: pageInfo.name,
          path: pageInfo.path,
          viewport: viewport.name,
          viewportSize: `${viewport.width}x${viewport.height}`,
          error: error.message
        });
      }
    }
  }

  // Save the analysis report
  const reportPath = path.join(__dirname, '..', 'alignment-analysis-report.json');
  await fs.writeFile(reportPath, JSON.stringify(alignmentIssues, null, 2));
  
  console.log('\nAlignment Analysis Complete!');
  console.log(`Found ${alignmentIssues.length} pages with potential issues`);
  console.log(`Report saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${screenshotsDir}`);

  // Generate a summary
  const summary = alignmentIssues.reduce((acc, issue) => {
    if (issue.issues) {
      issue.issues.forEach(problem => {
        acc[problem.type] = (acc[problem.type] || 0) + 1;
      });
    }
    return acc;
  }, {});

  console.log('\nIssue Summary:');
  Object.entries(summary).forEach(([type, count]) => {
    console.log(`- ${type}: ${count} occurrences`);
  });

  await browser.close();
}

// Run the analysis
analyzeAlignments().catch(console.error);