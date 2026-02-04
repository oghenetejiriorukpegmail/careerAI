import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { clearAllAuthStorage, handleAuthError, isRefreshTokenError } from '@/lib/auth/auth-recovery';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export function useAuthRecovery() {
  const router = useRouter();
  
  useEffect(() => {
    if (!supabase) return;
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state change:', event, session ? 'Session exists' : 'No session');
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing storage and redirecting');
        clearAllAuthStorage();
        router.push('/login');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      } else if (event === 'SIGNED_IN') {
        console.log('User signed in successfully');
      }
    });
    
    // Global error handler for API calls
    const handleGlobalAuthError = (error: any) => {
      if (isRefreshTokenError(error)) {
        console.log('Global auth error detected, handling recovery');
        handleAuthError(error, window.location.pathname);
      }
    };
    
    // Listen for unhandled promise rejections that might be auth errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && isRefreshTokenError(event.reason)) {
        console.log('Unhandled auth error detected');
        handleAuthError(event.reason, window.location.pathname);
        event.preventDefault(); // Prevent default browser error handling
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Cleanup
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [router]);
  
  // Return a function to manually trigger auth recovery
  const recoverAuth = async () => {
    try {
      // Try to get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('No valid session found, clearing auth state');
        clearAllAuthStorage();
        router.push('/login');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error during auth recovery:', error);
      handleAuthError(error, window.location.pathname);
      return false;
    }
  };
  
  return { recoverAuth };
}