import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'task-manager-session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page and auth API
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // For API routes (except auth), check session but don't redirect - return 401 instead
  if (pathname.startsWith('/api/')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      const sessionData = JSON.parse(sessionCookie.value);
      
      // Check if session is expired
      if (Date.now() > sessionData.expiresAt) {
        return NextResponse.json(
          { success: false, error: 'Session expired' },
          { status: 401 }
        );
      }

      // Session is valid for API route
      return NextResponse.next();

    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }
  }

  // For page routes, check session and redirect to login if needed
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value);
    
    // Check if session is expired
    if (Date.now() > sessionData.expiresAt) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // Session is valid, continue
    return NextResponse.next();

  } catch (error) {
    // Invalid session data, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};