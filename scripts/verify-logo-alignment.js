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

async function verifyLogoAlignment() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const screenshotsDir = path.join(__dirname, '..', 'logo-alignment-fixed');
  await fs.mkdir(screenshotsDir, { recursive: true });

  const page = await browser.newPage();
  
  const pagesToCheck = [
    { name: 'homepage', url: 'http://localhost:3000/', needsAuth: false },
    { name: 'dashboard', url: 'http://localhost:3000/dashboard', needsAuth: true }
  ];

  for (const pageInfo of pagesToCheck) {
    if (pageInfo.needsAuth) {
      await loginToApp(page, 'oghenetejiri@gmail.com', 'IderaOluwa@01');
    }
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(pageInfo.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Add visual alignment guide
    await page.evaluate(() => {
      const logo = document.querySelector('span.font-bold');
      const firstNavItem = document.querySelector('nav a');
      
      if (logo && firstNavItem) {
        // Add baseline guide
        const guide = document.createElement('div');
        guide.style.position = 'fixed';
        guide.style.top = '0';
        guide.style.left = '0';
        guide.style.width = '100%';
        guide.style.height = '1px';
        guide.style.background = 'rgba(255,0,0,0.5)';
        guide.style.zIndex = '9999';
        guide.style.pointerEvents = 'none';
        
        const logoRect = logo.getBoundingClientRect();
        const navRect = firstNavItem.getBoundingClientRect();
        
        // Position at the middle point between logo and nav baselines
        const avgBaseline = (logoRect.bottom + navRect.bottom) / 2;
        guide.style.top = avgBaseline + 'px';
        document.body.appendChild(guide);
        
        // Add text annotations
        const annotation = document.createElement('div');
        annotation.style.position = 'fixed';
        annotation.style.top = '60px';
        annotation.style.left = '20px';
        annotation.style.background = 'white';
        annotation.style.padding = '10px';
        annotation.style.border = '1px solid black';
        annotation.style.zIndex = '9999';
        annotation.style.fontSize = '12px';
        annotation.innerHTML = `
          Logo baseline: ${Math.round(logoRect.bottom)}px<br>
          Nav baseline: ${Math.round(navRect.bottom)}px<br>
          Offset: ${Math.round(Math.abs(logoRect.bottom - navRect.bottom))}px<br>
          Logo size: ${window.getComputedStyle(logo).fontSize}<br>
          Nav size: ${window.getComputedStyle(firstNavItem).fontSize}
        `;
        document.body.appendChild(annotation);
      }
    });

    // Take screenshot with guide
    const screenshotPath = path.join(screenshotsDir, `${pageInfo.name}-with-guide.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: false 
    });

    // Analyze alignment
    const alignmentData = await page.evaluate(() => {
      const logo = document.querySelector('span.font-bold');
      const firstNavItem = document.querySelector('nav a');
      
      if (!logo || !firstNavItem) {
        return { error: 'Elements not found' };
      }
      
      const logoRect = logo.getBoundingClientRect();
      const navRect = firstNavItem.getBoundingClientRect();
      
      return {
        logo: {
          fontSize: window.getComputedStyle(logo).fontSize,
          baseline: logoRect.bottom,
          height: logoRect.height
        },
        nav: {
          fontSize: window.getComputedStyle(firstNavItem).fontSize,
          baseline: navRect.bottom,
          height: navRect.height
        },
        alignment: {
          baselineOffset: Math.abs(logoRect.bottom - navRect.bottom),
          isAligned: Math.abs(logoRect.bottom - navRect.bottom) < 3 // Within 3px tolerance
        }
      };
    });

    console.log(`\n=== ${pageInfo.name.toUpperCase()} Alignment ===`);
    console.log(`Logo: ${alignmentData.logo.fontSize} (baseline: ${alignmentData.logo.baseline}px)`);
    console.log(`Nav: ${alignmentData.nav.fontSize} (baseline: ${alignmentData.nav.baseline}px)`);
    console.log(`Baseline offset: ${alignmentData.alignment.baselineOffset}px`);
    console.log(`Status: ${alignmentData.alignment.isAligned ? '✅ ALIGNED' : '❌ MISALIGNED'}`);

    // Remove guides and take clean screenshot
    await page.evaluate(() => {
      document.querySelectorAll('div[style*="position: fixed"]').forEach(el => el.remove());
    });

    const cleanScreenshotPath = path.join(screenshotsDir, `${pageInfo.name}-clean.png`);
    await page.screenshot({ 
      path: cleanScreenshotPath,
      fullPage: false 
    });
  }

  console.log(`\nScreenshots saved to: ${screenshotsDir}`);
  await browser.close();
}

// Run verification
verifyLogoAlignment().catch(console.error);