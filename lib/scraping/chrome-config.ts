import { execSync } from 'child_process';
import { existsSync } from 'fs';

/**
 * Get Chrome executable path for different environments
 */
export function getChromePath(): string | undefined {
  // Common Chrome paths on different systems
  const paths = [
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Chromium\\Application\\chrome.exe',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    // WSL
    '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
    '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];

  // Check each path
  for (const path of paths) {
    if (existsSync(path)) {
      console.log('[CHROME] Found Chrome at:', path);
      return path;
    }
  }

  // Try to find Chrome using 'which' command on Unix-like systems
  try {
    const chromePath = execSync('which google-chrome || which chromium || which chromium-browser', { encoding: 'utf8' }).trim();
    if (chromePath) {
      console.log('[CHROME] Found Chrome via which:', chromePath);
      return chromePath;
    }
  } catch (e) {
    // Not found via which
  }

  // In production environments like Vercel/Netlify, we'll use @sparticuz/chromium
  if (process.env.VERCEL || process.env.NETLIFY || process.env.NODE_ENV === 'production') {
    console.log('[CHROME] Running in serverless/production environment, will use @sparticuz/chromium');
    return undefined;
  }

  console.warn('[CHROME] Chrome executable not found. Puppeteer may not work correctly.');
  console.warn('[CHROME] Install Chrome or set PUPPETEER_EXECUTABLE_PATH environment variable.');
  
  return undefined;
}

/**
 * Get Puppeteer launch options for current environment
 */
export function getPuppeteerOptions() {
  const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || getChromePath();
  
  const options: any = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  };

  if (chromePath) {
    options.executablePath = chromePath;
  }

  return options;
}