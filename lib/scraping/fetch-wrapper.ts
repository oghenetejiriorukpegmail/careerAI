/**
 * Fetch wrapper that can be easily adapted for MCP Fetch server
 * when it becomes available
 */

interface FetchOptions {
  headers?: Record<string, string>;
  timeout?: number;
  followRedirects?: boolean;
  userAgent?: string;
}

interface FetchResult {
  success: boolean;
  content?: string;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
}

/**
 * Enhanced fetch with better error handling and options
 */
export async function enhancedFetch(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const {
    headers = {},
    timeout = 15000,
    followRedirects = true,
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  } = options;

  try {
    console.log(`[FETCH] Fetching URL: ${url}`);
    
    // Build headers
    const fetchHeaders = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...headers
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        headers: fetchHeaders,
        redirect: followRedirects ? 'follow' : 'manual',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status
        };
      }

      const content = await response.text();
      
      // Get response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      console.log(`[FETCH] Successfully fetched ${content.length} characters`);

      return {
        success: true,
        content,
        statusCode: response.status,
        headers: responseHeaders
      };

    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    console.error(`[FETCH] Error fetching URL:`, error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timeout after ${timeout}ms`
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: false,
      error: 'Unknown fetch error'
    };
  }
}

/**
 * Fetch with JavaScript rendering simulation
 * This is a placeholder for when we have proper JS rendering
 */
export async function fetchWithJavaScript(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  console.log(`[FETCH] JavaScript rendering not available, using standard fetch`);
  
  // For now, just use standard fetch
  // When MCP Fetch server is available, this can use its JS rendering capabilities
  return enhancedFetch(url, options);
}

/**
 * Check if MCP Fetch server is available
 */
export function isMCPFetchAvailable(): boolean {
  // Check if MCP Fetch tools are available
  // This would check for mcp__fetch__ prefixed tools
  return false; // Placeholder - update when MCP is available
}

/**
 * Future MCP Fetch integration
 * This function will use MCP Fetch server when available
 */
export async function fetchWithMCP(url: string, options: any = {}): Promise<FetchResult> {
  // Placeholder for MCP Fetch integration
  // When available, this would use:
  // - mcp__fetch__fetch_url for basic fetching
  // - mcp__fetch__fetch_with_js for JavaScript rendering
  // - mcp__fetch__fetch_with_proxy for proxy support
  
  console.log('[FETCH] MCP Fetch not available, using standard fetch');
  return enhancedFetch(url, options);
}