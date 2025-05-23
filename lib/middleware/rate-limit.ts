import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore: RateLimitStore = {};

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  message?: string; // Custom error message
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Too many requests, please try again later.',
};

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  
  return async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
    // Generate key for rate limiting
    const key = finalConfig.keyGenerator ? 
      finalConfig.keyGenerator(req) : 
      getDefaultKey(req);
    
    const now = Date.now();
    const resetTime = now + finalConfig.windowMs;
    
    // Get or create rate limit entry
    if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
      rateLimitStore[key] = { count: 1, resetTime };
      return null; // Allow request
    }
    
    // Check if limit exceeded
    if (rateLimitStore[key].count >= finalConfig.maxRequests) {
      const retryAfter = Math.ceil((rateLimitStore[key].resetTime - now) / 1000);
      
      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: finalConfig.message,
          retryAfter 
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitStore[key].resetTime).toISOString(),
          },
        }
      );
    }
    
    // Increment counter
    rateLimitStore[key].count++;
    
    return null; // Allow request
  };
}

function getDefaultKey(req: NextRequest): string {
  // Get IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  // Include path in key to have separate limits per endpoint
  const path = req.nextUrl.pathname;
  
  // Try to get user ID from auth header or session
  const authHeader = req.headers.get('authorization');
  const userId = authHeader ? `auth:${authHeader.substring(0, 20)}` : `ip:${ip}`;
  
  return `${userId}:${path}`;
}

// Preset configurations for different API types
export const rateLimitPresets = {
  // Strict limit for AI generation endpoints
  aiGeneration: createRateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    message: 'AI generation rate limit exceeded. Please wait before generating more content.',
  }),
  
  // Moderate limit for document parsing
  documentParsing: createRateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 20, // 20 requests per minute
    message: 'Document parsing rate limit exceeded. Please wait before uploading more documents.',
  }),
  
  // Higher limit for general API calls
  general: createRateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  }),
  
  // Very strict limit for auth endpoints
  auth: createRateLimiter({
    windowMs: 900000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  }),
};