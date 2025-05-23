import { SupabaseClient } from '@supabase/supabase-js';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000,   // 30 seconds
  backoffFactor: 2
};

/**
 * Wrapper for Supabase auth operations with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelay!;

  for (let attempt = 0; attempt < opts.maxRetries!; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error
      if (error?.status === 429 || error?.code === 'over_request_rate_limit') {
        console.log(`Rate limit hit. Attempt ${attempt + 1}/${opts.maxRetries}. Waiting ${delay}ms...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increase delay for next attempt
        delay = Math.min(delay * opts.backoffFactor!, opts.maxDelay!);
      } else {
        // For other errors, don't retry
        throw error;
      }
    }
  }
  
  throw lastError;
}

/**
 * Safe session refresh that handles rate limits
 */
export async function safeSessionRefresh(supabase: SupabaseClient) {
  try {
    const { data: { session }, error } = await withRetry(
      async () => {
        const result = await supabase.auth.getSession();
        if (result.error?.code === 'refresh_token_already_used') {
          // If refresh token is already used, sign out and clear session
          await supabase.auth.signOut();
          return { data: { session: null }, error: null };
        }
        return result;
      },
      { maxRetries: 2, initialDelay: 2000 }
    );
    
    return { session, error };
  } catch (error) {
    console.error('Failed to refresh session after retries:', error);
    return { session: null, error };
  }
}

/**
 * Check if error is due to rate limiting
 */
export function isRateLimitError(error: any): boolean {
  return error?.status === 429 || 
         error?.code === 'over_request_rate_limit' ||
         error?.message?.includes('rate limit');
}

/**
 * Get retry delay based on error headers
 */
export function getRetryDelay(error: any): number {
  // Check for Retry-After header
  const retryAfter = error?.headers?.['retry-after'];
  if (retryAfter) {
    return parseInt(retryAfter) * 1000; // Convert seconds to milliseconds
  }
  
  // Default to 60 seconds for rate limit errors
  if (isRateLimitError(error)) {
    return 60000;
  }
  
  return 5000; // Default 5 seconds
}