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
        storageKey: 'careerai-auth-token'
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js/2.39.0'
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