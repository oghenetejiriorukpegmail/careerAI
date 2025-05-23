// Chrome configuration stub for Netlify deployment
// Returns empty configuration since Puppeteer is not available

/**
 * Get Puppeteer launch options - stub implementation
 */
export function getPuppeteerOptions(): any {
  console.warn('[CHROME] Chrome/Puppeteer configuration is disabled for this deployment');
  return {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
}

/**
 * Find Chrome executable path - stub implementation
 */
export function findChrome(): string | undefined {
  console.warn('[CHROME] Chrome executable lookup is disabled');
  return undefined;
}

/**
 * Check if running in production environment
 */
export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production' || 
         process.env.VERCEL === '1' || 
         process.env.NETLIFY === 'true';
}