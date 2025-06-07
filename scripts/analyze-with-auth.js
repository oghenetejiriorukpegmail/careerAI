const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function loginToApp(page, email, password) {
  console.log('Logging in...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  
  // Wait for login form
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
  
  // Fill in credentials
  await page.type('input[type="email"], input[name="email"]', email);
  await page.type('input[type="password"], input[name="password"]', password);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('Login successful!');
}

async function analyzeWithAuth() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const screenshotsDir = path.join(__dirname, '..', 'alignment-screenshots-auth');
  await fs.mkdir(screenshotsDir, { recursive: true });

  const page = await browser.newPage();
  
  // Login first
  try {
    await loginToApp(page, 'oghenetejiri@gmail.com', 'IderaOluwa@01');
  } catch (error) {
    console.error('Login failed:', error.message);
  }

  // Test key pages at mobile resolution (where most alignment issues occur)
  const criticalPages = [
    { path: '/dashboard', name: 'dashboard' },
    { path: '/dashboard/resume', name: 'resume-list' },
    { path: '/dashboard/generate', name: 'generate' },
    { path: '/dashboard/job-opportunities', name: 'job-opportunities' },
    { path: '/dashboard/applications', name: 'applications' }
  ];

  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 }
  ];

  const alignmentIssues = [];

  for (const viewport of viewports) {
    await page.setViewport({ width: viewport.width, height: viewport.height });
    
    for (const pageInfo of criticalPages) {
      try {
        console.log(`Analyzing ${pageInfo.name} at ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        await page.goto(`http://localhost:3000${pageInfo.path}`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for content
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Take screenshot
        const screenshotPath = path.join(screenshotsDir, `${pageInfo.name}-${viewport.name}.png`);
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });

        // Analyze for issues
        const issues = await page.evaluate(() => {
          const problems = [];
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // Check horizontal overflow
          if (document.documentElement.scrollWidth > viewportWidth) {
            problems.push({
              type: 'horizontal-overflow',
              severity: 'high',
              description: `Page has horizontal scrollbar (${document.documentElement.scrollWidth}px vs ${viewportWidth}px viewport)`,
              elements: []
            });
          }

          // Check for elements outside viewport
          const elementsOutside = [];
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            
            // Skip hidden elements
            if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) {
              return;
            }
            
            if (rect.right > viewportWidth + 5) { // 5px tolerance
              elementsOutside.push({
                selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
                rightEdge: Math.round(rect.right),
                overflow: Math.round(rect.right - viewportWidth)
              });
            }
          });

          if (elementsOutside.length > 0) {
            problems.push({
              type: 'elements-outside-viewport',
              severity: 'high',
              description: `${elementsOutside.length} elements extend beyond viewport`,
              elements: elementsOutside.slice(0, 5) // Top 5 offenders
            });
          }

          // Check for text overflow
          const textOverflows = [];
          document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button, td, th').forEach(el => {
            if (el.scrollWidth > el.clientWidth + 2) { // 2px tolerance
              const style = window.getComputedStyle(el);
              if (style.overflow !== 'hidden' && style.textOverflow !== 'ellipsis') {
                textOverflows.push({
                  selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
                  text: el.textContent.substring(0, 50),
                  scrollWidth: el.scrollWidth,
                  clientWidth: el.clientWidth
                });
              }
            }
          });

          if (textOverflows.length > 0) {
            problems.push({
              type: 'text-overflow',
              severity: 'medium',
              description: `${textOverflows.length} text elements are overflowing`,
              elements: textOverflows.slice(0, 5)
            });
          }

          // Check for overlapping elements (focusing on common issues)
          const overlaps = [];
          const headers = document.querySelectorAll('header, nav, .header, .navbar');
          const buttons = document.querySelectorAll('button, a.button, .btn');
          
          // Check if header overlaps main content
          headers.forEach(header => {
            const headerRect = header.getBoundingClientRect();
            const mainContent = document.querySelector('main, .main-content, .content');
            if (mainContent) {
              const mainRect = mainContent.getBoundingClientRect();
              if (headerRect.bottom > mainRect.top && headerRect.top < mainRect.top) {
                overlaps.push({
                  element1: 'header',
                  element2: 'main content',
                  description: 'Header overlapping main content'
                });
              }
            }
          });

          // Check for button text overflow
          buttons.forEach(btn => {
            if (btn.scrollWidth > btn.clientWidth) {
              overlaps.push({
                element1: btn.tagName.toLowerCase(),
                element2: 'self',
                description: `Button text overflowing: "${btn.textContent}"`
              });
            }
          });

          if (overlaps.length > 0) {
            problems.push({
              type: 'overlapping-elements',
              severity: 'high',
              description: `${overlaps.length} overlapping elements found`,
              elements: overlaps
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
        console.error(`Error analyzing ${pageInfo.name}:`, error.message);
      }
    }
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalIssues: alignmentIssues.length,
      byViewport: {},
      bySeverity: { high: 0, medium: 0, low: 0 }
    },
    details: alignmentIssues
  };

  // Calculate summary stats
  alignmentIssues.forEach(item => {
    report.summary.byViewport[item.viewport] = (report.summary.byViewport[item.viewport] || 0) + 1;
    item.issues.forEach(issue => {
      report.summary.bySeverity[issue.severity] = (report.summary.bySeverity[issue.severity] || 0) + 1;
    });
  });

  // Save report
  const reportPath = path.join(__dirname, '..', 'alignment-report-auth.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n=== Alignment Analysis Complete ===');
  console.log(`Total pages with issues: ${report.summary.totalIssues}`);
  console.log('\nIssues by viewport:');
  Object.entries(report.summary.byViewport).forEach(([viewport, count]) => {
    console.log(`  ${viewport}: ${count} pages`);
  });
  console.log('\nIssues by severity:');
  Object.entries(report.summary.bySeverity).forEach(([severity, count]) => {
    console.log(`  ${severity}: ${count} issues`);
  });
  console.log(`\nFull report: ${reportPath}`);
  console.log(`Screenshots: ${screenshotsDir}`);

  await browser.close();
}

// Run analysis
analyzeWithAuth().catch(console.error);