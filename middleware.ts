import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Authentication disabled - allow all routes
  console.log('Middleware allowing access to:', request.nextUrl.pathname);
  return NextResponse.next();
}

// Apply middleware to all routes (but with no authentication checks)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};