import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  securityMiddleware, 
  maskResponseMiddleware,
  createSecurityHeaders,
  securityHealthCheck,
  createAPIMiddleware
} from './src/middleware/security-middleware';

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

// SQL Injection patterns to detect
const SQL_INJECTION_PATTERNS = [
  /(\b(DROP|DELETE|TRUNCATE|UPDATE|INSERT|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
  /(\b(UNION|SELECT)\b.*\b(FROM|WHERE)\b)/gi,
  /(--|\#|\/\*|\*\/)/g,
  /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
  /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
  /('|")\s*(OR|AND)\s*('|")\d*\s*=\s*('|")\d*/gi,
  /(';|";|\);|");)/g,
  /\b(xp_|sp_|0x|exec|execute|declare|cast|convert)\b/gi,
  /(WAITFOR|DELAY|SLEEP|BENCHMARK)/gi,
];

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-real-ip') ||  // Prioritize real IP (more secure)
         request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         request.ip || 
         'unknown';
}

function detectSQLInjection(value: string): boolean {
  if (!value) return false;
  
  const decodedValue = decodeURIComponent(value);
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(decodedValue)) {
      return true;
    }
  }
  
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);
  
  // Apply comprehensive security middleware to API routes
  if (pathname.startsWith('/api/')) {
    // Apply advanced rate limiting and DDoS protection
    const securityResponse = await securityMiddleware(request, {
      enableRateLimiting: true,
      enablePIIMasking: true,
      enableAuditLogging: true,
      enableDDoSProtection: true,
      skipPaths: ['/api/health', '/api/metrics'],
      whitelistIPs: []
    });
    
    if (securityResponse) {
      return securityResponse;
    }

    // Check all URL parameters for SQL injection
    const searchParams = request.nextUrl.searchParams;
    const suspiciousParams: string[] = [];
    
    for (const [key, value] of searchParams.entries()) {
      if (detectSQLInjection(value)) {
        suspiciousParams.push(`${key}=${value}`);
      }
    }
    
    if (suspiciousParams.length > 0) {
      console.error(`SQL Injection attempt detected from ${clientIp}:`, suspiciousParams);
      
      // Log the attempt
      const logEntry = {
        timestamp: new Date().toISOString(),
        ip: clientIp,
        path: pathname,
        method: request.method,
        suspicious_params: suspiciousParams,
        user_agent: request.headers.get('user-agent')
      };
      
      console.error('SECURITY ALERT:', JSON.stringify(logEntry));
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input detected. This incident has been logged.' 
        },
        { status: 400 }
      );
    }
    
    // Create response with security headers
    const response = NextResponse.next();
    const securityHeaders = createSecurityHeaders();
    
    // Apply all security headers
    securityHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });
    
    // Apply PII masking to response if enabled
    // Note: This is handled by API route handlers individually for better control
    
    return response;
  }
  
  // Skip middleware for static files and _next
  if (
    pathname.startsWith('/_next/') ||
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