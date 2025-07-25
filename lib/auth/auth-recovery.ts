/**
 * Auth recovery utilities to handle refresh token issues
 */

export function clearAllAuthStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear all possible auth storage keys
    const keysToRemove = [
      'careerai-auth-token',
      'supabase.auth.token',
      'sb-auth-token'
    ];
    
    // Get supabase project reference from URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
      if (projectRef) {
        keysToRemove.push(`sb-${projectRef}-auth-token`);
        keysToRemove.push(`sb-${projectRef}-auth-token.0`);
        keysToRemove.push(`sb-${projectRef}-auth-token.1`);
      }
    }
    
    // Clear localStorage
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear sessionStorage
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log('Cleared all auth storage');
  } catch (error) {
    console.error('Error clearing auth storage:', error);
  }
}

export function isRefreshTokenError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  return (
    errorCode === 'refresh_token_already_used' ||
    errorCode === 'invalid_refresh_token' ||
    errorMessage.includes('refresh token') ||
    errorMessage.includes('already used') ||
    errorMessage.includes('invalid token')
  );
}

export function shouldForceReauth(error: any): boolean {
  return isRefreshTokenError(error) || 
         error?.status === 401 ||
         error?.code === 'session_expired';
}

export function redirectToLogin(currentPath?: string) {
  if (typeof window === 'undefined') return;
  
  const redirectUrl = new URL('/login', window.location.origin);
  if (currentPath && currentPath !== '/login') {
    redirectUrl.searchParams.set('redirectTo', currentPath);
  }
  
  window.location.href = redirectUrl.toString();
}

export async function handleAuthError(error: any, currentPath?: string) {
  console.error('Auth error detected:', error);
  
  if (shouldForceReauth(error)) {
    console.log('Forcing re-authentication due to auth error');
    clearAllAuthStorage();
    
    // Small delay to ensure storage is cleared
    setTimeout(() => {
      redirectToLogin(currentPath);
    }, 100);
    
    return true; // Indicates auth error was handled
  }
  
  return false; // Not an auth error
}