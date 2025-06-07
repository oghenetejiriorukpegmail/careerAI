const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function loginToApp(page, email, password) {
  console.log('Logging in...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
  await page.type('input[type="email"], input[name="email"]', email);
  await page.type('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('Login successful!');
}

async function verifyFixes() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const screenshotsDir = path.join(__dirname, '..', 'alignment-screenshots-fixed');
  await fs.mkdir(screenshotsDir, { recursive: true });

  const page = await browser.newPage();
  
  // Login first
  try {
    await loginToApp(page, 'oghenetejiri@gmail.com', 'IderaOluwa@01');
  } catch (error) {
    console.error('Login failed:', error.message);
  }

  // Test the problematic pages
  const testCases = [
    { viewport: { name: 'tablet', width: 768, height: 1024 }, pages: ['dashboard', 'resume'] },
    { viewport: { name: 'mobile', width: 375, height: 812 }, pages: ['resume'] }
  ];

  console.log('Verifying fixes...\n');

  for (const testCase of testCases) {
    await page.setViewport({ width: testCase.viewport.width, height: testCase.viewport.height });
    
    for (const pageName of testCase.pages) {
      const pagePath = pageName === 'resume' ? '/dashboard/resume' : `/dashboard`;
      
      console.log(`Testing ${pageName} at ${testCase.viewport.name} (${testCase.viewport.width}x${testCase.viewport.height})`);
      
      await page.goto(`http://localhost:3000${pagePath}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Take screenshot
      const screenshotPath = path.join(screenshotsDir, `${pageName}-${testCase.viewport.name}-fixed.png`);
      await page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });

      // Check for issues
      const issues = await page.evaluate(() => {
        const problems = [];
        const viewportWidth = window.innerWidth;

        // Check horizontal overflow
        if (document.documentElement.scrollWidth > viewportWidth) {
          problems.push(`❌ Horizontal overflow still present (${document.documentElement.scrollWidth}px vs ${viewportWidth}px)`);
        } else {
          problems.push('✅ No horizontal overflow');
        }

        // Check for elements outside viewport
        let elementsOutside = 0;
        document.querySelectorAll('*').forEach(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          
          if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) {
            return;
          }
          
          if (rect.right > viewportWidth + 5) {
            elementsOutside++;
          }
        });

        if (elementsOutside > 0) {
          problems.push(`❌ ${elementsOutside} elements still outside viewport`);
        } else {
          problems.push('✅ All elements within viewport');
        }

        // Check for text overflow
        let textOverflows = 0;
        document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button').forEach(el => {
          if (el.scrollWidth > el.clientWidth + 2) {
            const style = window.getComputedStyle(el);
            if (style.overflow !== 'hidden' && style.textOverflow !== 'ellipsis') {
              textOverflows++;
            }
          }
        });

        if (textOverflows > 0) {
          problems.push(`⚠️  ${textOverflows} text elements with overflow (may be intentional)`);
        } else {
          problems.push('✅ No text overflow issues');
        }

        return problems;
      });

      console.log(`Results for ${pageName}:`);
      issues.forEach(issue => console.log(`  ${issue}`));
      console.log('');
    }
  }

  console.log(`Screenshots saved to: ${screenshotsDir}`);
  await browser.close();
}

// Run verification
verifyFixes().catch(console.error);