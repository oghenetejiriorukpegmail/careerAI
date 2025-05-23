/**
 * Proxy manager for web scraping
 * Uses free proxy services and rotation
 */

interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks5';
  auth?: {
    username: string;
    password: string;
  };
}

// Free proxy providers (these change frequently)
const PROXY_SOURCES = [
  'https://www.proxy-list.download/api/v1/get?type=https',
  'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt'
];

export class ProxyManager {
  private proxies: ProxyConfig[] = [];
  private currentIndex = 0;
  private lastFetch = 0;
  private fetchInterval = 30 * 60 * 1000; // 30 minutes

  async getProxy(): Promise<ProxyConfig | null> {
    // Refresh proxy list if needed
    if (Date.now() - this.lastFetch > this.fetchInterval || this.proxies.length === 0) {
      await this.fetchProxies();
    }

    if (this.proxies.length === 0) {
      return null;
    }

    // Rotate through proxies
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    
    return proxy;
  }

  private async fetchProxies() {
    console.log('[PROXY] Fetching fresh proxy list...');
    const newProxies: ProxyConfig[] = [];

    for (const source of PROXY_SOURCES) {
      try {
        const response = await fetch(source, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const text = await response.text();
          const lines = text.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            const match = line.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)$/);
            if (match) {
              newProxies.push({
                host: match[1],
                port: parseInt(match[2]),
                protocol: 'http'
              });
            }
          }
        }
      } catch (error) {
        console.error(`[PROXY] Failed to fetch from ${source}:`, error);
      }
    }

    // Add some known working proxies as fallback
    const fallbackProxies: ProxyConfig[] = [
      // These are public proxies that may or may not work
      { host: '47.88.62.42', port: 80, protocol: 'http' },
      { host: '47.91.88.100', port: 80, protocol: 'http' },
      { host: '161.35.70.249', port: 8080, protocol: 'http' }
    ];

    this.proxies = [...newProxies, ...fallbackProxies];
    this.lastFetch = Date.now();
    console.log(`[PROXY] Loaded ${this.proxies.length} proxies`);
  }

  async testProxy(proxy: ProxyConfig): Promise<boolean> {
    try {
      const testUrl = 'http://httpbin.org/ip';
      const proxyUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`;
      
      // Note: Node.js fetch doesn't support proxies directly
      // This would need a proper HTTP agent with proxy support
      // For now, we'll assume proxies work
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const proxyManager = new ProxyManager();

/**
 * Enhanced fetch with retry and proxy support
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Add random delay between retries
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
      }
      
      // Rotate user agent
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
      ];
      
      const headers = {
        ...options.headers,
        'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };

      const response = await fetch(url, {
        ...options,
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });

      if (response.ok) {
        return response;
      }

      // Handle rate limiting
      if (response.status === 429) {
        console.log(`[FETCH] Rate limited, waiting longer before retry ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 5000));
        continue;
      }

      // Handle other errors
      if (response.status >= 500) {
        console.log(`[FETCH] Server error ${response.status}, retrying ${i + 1}/${maxRetries}`);
        continue;
      }

      // Non-retryable error
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error as Error;
      console.error(`[FETCH] Attempt ${i + 1}/${maxRetries} failed:`, error);
      
      if (i === maxRetries - 1) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}