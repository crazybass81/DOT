/**
 * Enhanced Security Middleware for Next.js
 * Comprehensive security implementation with multiple layers of protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateToken, trackFailedAttempt } from './jwt-validator';
import { createRateLimiter, RateLimitConfigs } from './rate-limiter';
import { sanitizeText } from './input-validator';
import { createHash } from 'crypto';

// Security configuration from environment
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ENABLE_SECURITY_HEADERS = process.env.ENABLE_SECURITY_HEADERS !== 'false';
const MAX_REQUEST_SIZE = parseInt(process.env.MAX_REQUEST_SIZE || '1048576'); // 1MB default

// Protected routes configuration
const ROUTE_CONFIG = {
  public: [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/health',
  ],
  authRequired: [
    '/dashboard',
    '/attendance',
    '/profile',
  ],
  adminOnly: [
    '/admin',
    '/api/admin',
  ],
  masterAdminOnly: [
    '/master-admin',
    '/api/master-admin',
  ],
};

// Security headers configuration
const SECURITY_HEADERS = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS filter
  'X-XSS-Protection': '1; mode=block',
  
  // Force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Prevent referrer leakage
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  
  // Content Security Policy
  'Content-Security-Policy': IS_PRODUCTION
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';"
    : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:* https://*.supabase.co wss://*.supabase.co;",
};

// Rate limiters for different endpoint types
const rateLimiters = {
  auth: createRateLimiter(RateLimitConfigs.auth),
  api: createRateLimiter(RateLimitConfigs.api),
  admin: createRateLimiter(RateLimitConfigs.admin),
  read: createRateLimiter(RateLimitConfigs.read),
  write: createRateLimiter(RateLimitConfigs.write),
};

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         request.headers.get('x-real-ip') ||
         request.ip ||
         'unknown';
}

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return ROUTE_CONFIG.public.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if route requires authentication
 */
function requiresAuth(pathname: string): boolean {
  return ROUTE_CONFIG.authRequired.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  ) || pathname.startsWith('/api/');
}

/**
 * Check if route requires admin access
 */
function requiresAdmin(pathname: string): boolean {
  return ROUTE_CONFIG.adminOnly.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if route requires master admin access
 */
function requiresMasterAdmin(pathname: string): boolean {
  return ROUTE_CONFIG.masterAdminOnly.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Validate CORS origin
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (!IS_PRODUCTION) return true; // Allow all origins in development
  
  return ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin);
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  if (!ENABLE_SECURITY_HEADERS) return response;
  
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Generate request fingerprint for tracking
 */
function generateRequestFingerprint(request: NextRequest): string {
  const factors = [
    getClientIP(request),
    request.headers.get('user-agent') || '',
    request.headers.get('accept-language') || '',
    request.headers.get('accept-encoding') || '',
  ];
  
  return createHash('sha256')
    .update(factors.join('|'))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Log security event
 */
async function logSecurityEvent(
  event: string,
  request: NextRequest,
  details: Record<string, any> = {}
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent'),
    method: request.method,
    path: request.nextUrl.pathname,
    fingerprint: generateRequestFingerprint(request),
    ...details,
  };
  
  if (IS_PRODUCTION) {
    // Send to security monitoring service
    console.log('[SECURITY]', JSON.stringify(logEntry));
  } else {
    console.log('[SECURITY]', logEntry);
  }
}

/**
 * Main security middleware
 */
export async function securityMiddleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const origin = request.headers.get('origin');
  
  try {
    // Skip middleware for static assets
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/_next/') ||
      pathname.includes('.') // Files with extensions
    ) {
      return NextResponse.next();
    }
    
    // CORS validation for API routes
    if (pathname.startsWith('/api/')) {
      if (!isAllowedOrigin(origin)) {
        await logSecurityEvent('CORS_VIOLATION', request, { origin });
        
        return new NextResponse('Forbidden', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }
      
      // Handle preflight requests
      if (method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
    }
    
    // Apply rate limiting based on route type
    let rateLimitResponse: NextResponse | null = null;
    
    if (pathname.startsWith('/api/auth/') || pathname.startsWith('/auth/')) {
      rateLimitResponse = await rateLimiters.auth(request);
    } else if (pathname.startsWith('/api/master-admin/')) {
      rateLimitResponse = await rateLimiters.admin(request);
    } else if (pathname.startsWith('/api/')) {
      if (method === 'GET') {
        rateLimitResponse = await rateLimiters.read(request);
      } else {
        rateLimitResponse = await rateLimiters.write(request);
      }
    }
    
    if (rateLimitResponse) {
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', request);
      return applySecurityHeaders(rateLimitResponse);
    }
    
    // Check request size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      await logSecurityEvent('REQUEST_SIZE_EXCEEDED', request, { size: contentLength });
      
      return new NextResponse('Request entity too large', {
        status: 413,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
    
    // Public routes - allow access
    if (isPublicRoute(pathname)) {
      const response = NextResponse.next();
      return applySecurityHeaders(response);
    }
    
    // Authentication check for protected routes
    if (requiresAuth(pathname)) {
      // Get token from cookie or header
      const cookieToken = request.cookies.get('sb-auth-token')?.value;
      const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
      const token = headerToken || cookieToken;
      
      if (!token) {
        await logSecurityEvent('AUTH_MISSING', request);
        
        // Redirect to login for web pages, return 401 for API
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Authentication required' }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }
        
        return NextResponse.redirect(new URL('/login', request.url));
      }
      
      // Validate token
      const validation = await validateToken(token);
      
      if (!validation.valid) {
        const ip = getClientIP(request);
        const isBlocked = await trackFailedAttempt(ip);
        
        if (isBlocked) {
          await logSecurityEvent('AUTH_BLOCKED', request, { reason: 'Too many failed attempts' });
          
          return new NextResponse('Too many failed authentication attempts', {
            status: 429,
            headers: {
              'Retry-After': '900', // 15 minutes
              'Content-Type': 'text/plain',
            },
          });
        }
        
        await logSecurityEvent('AUTH_INVALID', request, { 
          reason: validation.error,
          expired: validation.expired,
          revoked: validation.revoked,
        });
        
        // Clear invalid cookie
        const response = pathname.startsWith('/api/')
          ? new NextResponse(
              JSON.stringify({ error: validation.error || 'Invalid token' }),
              {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          : NextResponse.redirect(new URL('/login', request.url));
        
        response.cookies.delete('sb-auth-token');
        return applySecurityHeaders(response);
      }
      
      // Check admin permissions
      if (requiresAdmin(pathname)) {
        const isAdmin = validation.payload?.roles?.includes('ADMIN') ||
                       validation.payload?.roles?.includes('MANAGER') ||
                       validation.payload?.isMasterAdmin;
        
        if (!isAdmin) {
          await logSecurityEvent('ADMIN_ACCESS_DENIED', request, {
            userId: validation.payload?.userId,
            roles: validation.payload?.roles,
          });
          
          return new NextResponse(
            JSON.stringify({ error: 'Admin access required' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      // Check master admin permissions
      if (requiresMasterAdmin(pathname)) {
        if (!validation.payload?.isMasterAdmin) {
          await logSecurityEvent('MASTER_ADMIN_ACCESS_DENIED', request, {
            userId: validation.payload?.userId,
            roles: validation.payload?.roles,
          });
          
          return new NextResponse(
            JSON.stringify({ error: 'Master admin access required' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      // Add user context to headers for downstream use
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', validation.payload?.userId || '');
      requestHeaders.set('x-user-email', validation.payload?.email || '');
      requestHeaders.set('x-user-roles', JSON.stringify(validation.payload?.roles || []));
      requestHeaders.set('x-is-master-admin', String(validation.payload?.isMasterAdmin || false));
      requestHeaders.set('x-request-id', generateRequestFingerprint(request));
      
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      
      // Add CORS headers for API routes
      if (pathname.startsWith('/api/') && origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return applySecurityHeaders(response);
    }
    
    // Default - allow the request
    const response = NextResponse.next();
    return applySecurityHeaders(response);
    
  } catch (error) {
    await logSecurityEvent('MIDDLEWARE_ERROR', request, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Don't expose internal errors
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

/**
 * Export as default middleware
 */
export { securityMiddleware as middleware };