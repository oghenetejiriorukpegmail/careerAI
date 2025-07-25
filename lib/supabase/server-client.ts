import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Get these from environment variables - required for production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Creates a Supabase Admin client with the Service Role key - can bypass RLS
 * IMPORTANT: Only use server-side
 */
export function createServiceRoleClient() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      debug: false
    }
  });
}

/**
 * Creates a Supabase client using the user's session from cookies
 * Use in Server Components or Route Handlers
 */
export function createServerClient() {
  const cookieStore = cookies();
  return createServerComponentClient({ cookies: () => cookieStore });
}

/**
 * Verify if a user is authenticated by checking their session
 * Provide the userId if you need to validate a specific user
 */
export async function verifyAuthentication(userId?: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getSession();
  
  if (error || !data.session) {
    return { authenticated: false, user: null };
  }
  
  // If a userId is provided, check if it matches the authenticated user
  if (userId && data.session.user.id !== userId) {
    return { authenticated: false, user: null };
  }
  
  return { 
    authenticated: true, 
    user: data.session.user 
  };
}