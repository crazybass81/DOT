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

/**
 * Enhanced authentication check with multiple validation methods
 */
async function checkAuthentication(request: NextRequest): Promise<boolean> {
  // Method 1: Check Supabase auth cookies
  const authCookies = request.cookies.getAll().filter(cookie => {
    // Look for various Supabase cookie patterns
    return (
      (cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')) ||
      (cookie.name.startsWith('supabase-auth-token')) ||
      (cookie.name.includes('access-token')) ||
      (cookie.name.includes('session'))
    );
  });

  if (authCookies.length > 0) {
    // Validate cookie content
    for (const cookie of authCookies) {
      if (await validateAuthCookie(cookie.value)) {
        return true;
      }
    }
  }

  // Method 2: Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    if (authHeader.startsWith('Bearer ') && authHeader.length > 20) {
      return await validateBearerToken(authHeader);
    }
  }

  // Method 3: Check session storage or custom auth headers
  const sessionId = request.headers.get('x-session-id') || 
                    request.headers.get('x-auth-session');
  if (sessionId && sessionId.length > 10) {
    return await validateSessionId(sessionId);
  }

  return false;
}

/**
 * Validate authentication cookie content
 */
async function validateAuthCookie(cookieValue: string): Promise<boolean> {
  try {
    if (!cookieValue || cookieValue.length < 10) {
      return false;
    }

    // Check if cookie value looks like a JWT token or session ID
    if (cookieValue.includes('.') && cookieValue.split('.').length === 3) {
      // Looks like JWT - basic validation
      return await validateJWTStructure(cookieValue);
    }

    // Check if it's a valid session format
    if (cookieValue.length >= 32 && /^[a-zA-Z0-9-_]+$/.test(cookieValue)) {
      return true; // Valid session format
    }

    return false;
  } catch (error) {
    console.error('Cookie validation error:', error);
    return false;
  }
}

/**
 * Validate Bearer token
 */
async function validateBearerToken(authHeader: string): Promise<boolean> {
  try {
    const token = authHeader.substring(7); // Remove 'Bearer '
    return await validateJWTStructure(token);
  } catch (error) {
    console.error('Bearer token validation error:', error);
    return false;
  }
}

/**
 * Validate session ID
 */
async function validateSessionId(sessionId: string): Promise<boolean> {
  try {
    // Basic session ID format validation
    return sessionId.length >= 16 && 
           sessionId.length <= 256 && 
           /^[a-zA-Z0-9-_]+$/.test(sessionId);
  } catch (error) {
    console.error('Session ID validation error:', error);
    return false;
  }
}

/**
 * Basic JWT structure validation (without signature verification)
 */
async function validateJWTStructure(token: string): Promise<boolean> {
  try {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Try to decode header and payload
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Check for required JWT fields
    if (!header.typ || !header.alg) {
      return false;
    }

    // Check if token is not expired (basic check)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    // Check for user identification
    if (!payload.sub && !payload.user_id && !payload.id) {
      return false;
    }

    return true;
  } catch (error) {
    // If JWT parsing fails, it's not a valid JWT
    return false;
  }
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

  // Enhanced authentication check for protected routes
  const hasValidAuth = await checkAuthentication(request);
  
  if (!hasValidAuth) {
    // No valid authentication found, redirect to login
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