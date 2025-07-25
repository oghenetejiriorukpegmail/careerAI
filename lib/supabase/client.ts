import { createClient } from '@supabase/supabase-js';

// Get these from environment variables - required for all environments
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Development logging disabled for production

// Singleton pattern to prevent multiple instances
let supabaseInstance: any = null;
let supabaseAdminInstance: any = null;

// Create a single supabase client for the entire app
export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'careerai-auth-token',
        // Add retry configuration for refresh token
        flowType: 'pkce',
        // Debug mode disabled to reduce console noise
        debug: false
      },
      // Add global error handling for auth errors
      global: {
        headers: {
          'X-Client-Info': 'careerai-web'
        }
      }
    });
    
    // Add global auth state change listener to handle token refresh failures
    supabaseInstance.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Auth token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing local storage');
        // Clear any remaining auth data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('careerai-auth-token');
          localStorage.removeItem('sb-' + supabaseUrl.split('//')[1]?.split('.')[0] + '-auth-token');
        }
      }
    });
  }
  return supabaseInstance;
}

// Export the client instance - will throw at runtime if env vars missing
export const supabase = supabaseUrl && supabaseAnonKey ? getSupabaseClient() : null as any;

// Create a service role client for admin operations (server-side only)
export function getSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdminInstance;
}

// Don't export admin client directly - use getSupabaseAdminClient() when needed
export const supabaseAdmin = null as any;