import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { checkSubscriptionMiddleware } from '@/lib/middleware/subscription'; // Disabled for now
// import '@/lib/utils/suppress-supabase-logs'; // Suppress noisy GoTrueClient debug logs - temporarily disabled due to build errors

export async function middleware(request: NextRequest) {
  // Handle health check endpoint
  if (request.nextUrl.pathname === '/health' || request.nextUrl.pathname === '/api/health') {
    return NextResponse.json({ status: 'ok', message: 'CareerAI is healthy' }, { status: 200 });
  }
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const supabase = createMiddlewareClient({ req: request, res: response });
  
  // Enhanced session handling with retry logic
  let session = null;
  let error = null;
  
  try {
    const result = await supabase.auth.getSession();
    session = result.data?.session;
    error = result.error;
    
    // Handle specific auth errors with proper cleanup
    if (error?.code === 'refresh_token_already_used') {
      console.log('Refresh token already used, clearing all auth state...');
      
      // Clear all auth cookies and storage
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl) {
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
          if (projectRef) {
            const cookieBase = `sb-${projectRef}-auth-token`;
            response.cookies.delete(cookieBase);
            response.cookies.delete(`${cookieBase}.0`);
            response.cookies.delete(`${cookieBase}.1`);
          }
        }
        // Also clear the custom storage key
        response.cookies.delete('careerai-auth-token');
      } catch (cookieError) {
        console.error('Error clearing cookies:', cookieError);
      }
      
      // Force signout to clear any remaining state
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error during force signout:', signOutError);
      }
      
      session = null;
    } else if (error?.status === 429 || error?.code === 'over_request_rate_limit') {
      console.log('Rate limit reached, proceeding without session refresh');
      session = null;
    } else if (error?.message?.includes('Invalid Refresh Token')) {
      console.log('Invalid refresh token detected, clearing auth state...');
      
      // Clear cookies for invalid refresh token
      const cookiePrefix = 'sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0];
      response.cookies.delete(cookiePrefix + '-auth-token');
      response.cookies.delete(cookiePrefix + '-auth-token.0');
      response.cookies.delete(cookiePrefix + '-auth-token.1');
      
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error during invalid token signout:', signOutError);
      }
      
      session = null;
    } else if (session?.expires_at && Date.now() / 1000 > session.expires_at) {
      console.log('Session expired, clearing auth state...');
      session = null;
    }
  } catch (e: any) {
    console.error('Middleware session error:', e);
    
    // Clear potentially corrupted auth state
    if (e.message?.includes('refresh') || e.message?.includes('token')) {
      const cookiePrefix = 'sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0];
      response.cookies.delete(cookiePrefix + '-auth-token');
      response.cookies.delete(cookiePrefix + '-auth-token.0');
      response.cookies.delete(cookiePrefix + '-auth-token.1');
    }
    
    session = null;
  }
  
  // Log auth-related paths including password reset
  if (request.nextUrl.pathname.includes('login') || 
      request.nextUrl.pathname.includes('dashboard') || 
      request.nextUrl.pathname.includes('forgot-password') || 
      request.nextUrl.pathname.includes('reset-password')) {
    console.log(`Middleware: ${request.nextUrl.pathname} - Session: ${session ? 'Authenticated' : 'Not authenticated'}`);
  }
  
  const isAuthRoute = request.nextUrl.pathname === '/login' || 
                     request.nextUrl.pathname === '/signup' ||
                     request.nextUrl.pathname === '/signup/confirmation' ||
                     request.nextUrl.pathname === '/' ||
                     request.nextUrl.pathname === '/auth/callback' ||
                     request.nextUrl.pathname === '/forgot-password' ||
                     request.nextUrl.pathname === '/reset-password';
  
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isPublicApiRoute = request.nextUrl.pathname === '/api/auth/callback' ||
                          request.nextUrl.pathname === '/api/auth/session';
  const isPublicAsset = request.nextUrl.pathname === '/icon.svg' || 
                       request.nextUrl.pathname === '/favicon.ico' ||
                       request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i);
  
  // Check if this is a password recovery flow (has access_token and type=recovery in URL)
  // Note: Supabase sends these as hash fragments, but we also check query params for compatibility
  const isPasswordRecovery = request.nextUrl.searchParams.has('access_token') && 
                            request.nextUrl.searchParams.get('type') === 'recovery';
  
  // Check if this is a magic link flow
  const isMagicLink = request.nextUrl.searchParams.has('access_token') && 
                     request.nextUrl.searchParams.get('type') === 'magiclink';
  
  // Also check if we're on the reset-password page (recovery tokens come as hash fragments there)
  const isResetPasswordPage = request.nextUrl.pathname === '/reset-password';
  
  // If no session and trying to access protected route
  if (!session && !isAuthRoute && !isPublicApiRoute && !isPublicAsset && !isPasswordRecovery && !isMagicLink) {
    if (isApiRoute) {
      // Return 401 for API routes
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    // Redirect to login for web routes
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  // If has session and trying to access auth routes
  if (session && isAuthRoute && request.nextUrl.pathname !== '/') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }
  
  // Check subscription limits for API routes - DISABLED FOR NOW
  // if (session && isApiRoute && !isPublicApiRoute) {
  //   const subscriptionResponse = await checkSubscriptionMiddleware(request);
  //   if (subscriptionResponse.status !== 200 && subscriptionResponse !== response) {
  //     return subscriptionResponse;
  //   }
  // }
  
  // IMPORTANT: Return the response to ensure cookies are properly set
  return response;
}

// Apply middleware to all paths except Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    '/((?!_next/static|_next/image).*)',
  ],
};