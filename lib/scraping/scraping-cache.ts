/**
 * Simple in-memory cache for scraped job descriptions
 * Helps avoid repeated scraping of the same URLs
 */

interface CacheEntry {
  content: string;
  timestamp: number;
  url: string;
}

export class ScrapingCache {
  private cache = new Map<string, CacheEntry>();
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours
  private maxSize = 100; // Maximum number of entries

  /**
   * Get cached content if available and not expired
   */
  get(url: string): string | null {
    const entry = this.cache.get(url);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(url);
      return null;
    }
    
    console.log(`[CACHE] Hit for URL: ${url}`);
    return entry.content;
  }

  /**
   * Store content in cache
   */
  set(url: string, content: string): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(url, {
      content,
      timestamp: Date.now(),
      url
    });
    
    console.log(`[CACHE] Stored content for URL: ${url}`);
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.maxAge) {
        expiredKeys.push(key);
      }
    });
    
    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      console.log(`[CACHE] Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Find the oldest entry in the cache
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });
    
    return oldestKey;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('[CACHE] Cleared all entries');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; oldestEntry: number | null } {
    let oldestTime: number | null = null;
    
    this.cache.forEach((entry) => {
      if (oldestTime === null || entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
      }
    });
    
    return {
      size: this.cache.size,
      oldestEntry: oldestTime
    };
  }
}

// Export singleton instance
export const scrapingCache = new ScrapingCache();

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    scrapingCache.cleanup();
  }, 60 * 60 * 1000);
}