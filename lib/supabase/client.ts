import { createClient } from '@supabase/supabase-js';

// Get these from environment variables - required for all environments
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Development logging disabled for production

// Singleton pattern to prevent multiple instances
let supabaseInstance: any = null;
let supabaseAdminInstance: any = null;

// Create a single supabase client for the entire app
export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'careerai-auth-token'
      }
    });
  }
  return supabaseInstance;
}

// Export the client instance
export const supabase = getSupabaseClient();

// Create a service role client for admin operations (server-side only)
export function getSupabaseAdminClient() {
  if (!supabaseAdminInstance && supabaseServiceRoleKey) {
    supabaseAdminInstance = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdminInstance;
}

// Export the admin client instance
export const supabaseAdmin = getSupabaseAdminClient();