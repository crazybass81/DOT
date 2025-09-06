import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/attendance',
  '/admin'
];

// Routes that don't require approval (public routes)
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/approval-pending',
  '/auth'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files, API routes, and _next
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if the route requires protection
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // For protected routes, we'll let the client-side components handle
  // the detailed authentication and approval checks using the auth service
  // This middleware just ensures we have some form of session
  
  const authCookies = request.cookies.getAll().filter(cookie => 
    cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
  );
  
  if (authCookies.length === 0) {
    // No authentication cookies found, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Let the request proceed - detailed checks happen client-side
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};