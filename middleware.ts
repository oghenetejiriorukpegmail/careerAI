import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const supabase = createMiddlewareClient({ req: request, res: response });
  
  // Refresh session from cookies
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Middleware session error:', error);
  }
  
  // Only log auth-related paths to reduce noise
  if (request.nextUrl.pathname.includes('login') || request.nextUrl.pathname.includes('dashboard')) {
    console.log(`Middleware: ${request.nextUrl.pathname} - Session: ${session ? 'Authenticated' : 'Not authenticated'}`);
  }
  
  const isAuthRoute = request.nextUrl.pathname === '/login' || 
                     request.nextUrl.pathname === '/signup' ||
                     request.nextUrl.pathname === '/signup/confirmation' ||
                     request.nextUrl.pathname === '/' ||
                     request.nextUrl.pathname === '/auth/callback';
  
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isPublicApiRoute = request.nextUrl.pathname === '/api/auth/callback' ||
                          request.nextUrl.pathname === '/api/auth/session';
  const isPublicAsset = request.nextUrl.pathname === '/icon.svg' || 
                       request.nextUrl.pathname === '/favicon.ico' ||
                       request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i);
  
  // If no session and trying to access protected route
  if (!session && !isAuthRoute && !isPublicApiRoute && !isPublicAsset) {
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