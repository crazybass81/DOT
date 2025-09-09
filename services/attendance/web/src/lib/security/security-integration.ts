/**
 * Security Integration Layer
 * Connects advanced security systems to the middleware pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdvancedRateLimiter } from './advanced-rate-limiter';
import { PIIMaskingSystem } from './pii-masking';

// Initialize security systems
const rateLimiter = createAdvancedRateLimiter();
const piiMasker = new PIIMaskingSystem();

/**
 * Enhanced security middleware with all protection systems
 */
export async function enhancedSecurityMiddleware(request: NextRequest) {
  const url = request.nextUrl;
  const method = request.method;
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'unknown';

  // Skip security for static files
  if (url.pathname.startsWith('/_next/') || 
      url.pathname.startsWith('/favicon') ||
      url.pathname.includes('.')) {
    return NextResponse.next();
  }

  // Apply rate limiting to API routes
  if (url.pathname.startsWith('/api/')) {
    const rateLimitResult = await rateLimiter.middleware(request);
    if (rateLimitResult) {
      // Add security logging
      await logSecurityEvent('RATE_LIMIT_VIOLATED', {
        ip,
        path: url.pathname,
        method,
        timestamp: new Date().toISOString()
      });
      return rateLimitResult;
    }
  }

  // SQL Injection detection for all routes with parameters
  if (url.searchParams.size > 0) {
    const sqlInjectionDetected = await detectSQLInjection(url.searchParams);
    if (sqlInjectionDetected.isAttack) {
      await logSecurityEvent('SQL_INJECTION_ATTEMPT', {
        ip,
        path: url.pathname,
        method,
        suspiciousParams: sqlInjectionDetected.suspiciousParams,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input detected',
          code: 'SECURITY_VIOLATION'
        },
        { 
          status: 400,
          headers: {
            'X-Security-Alert': 'SQL_INJECTION_BLOCKED',
            'X-Incident-ID': generateIncidentId()
          }
        }
      );
    }
  }

  // XSS protection for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const body = await request.clone().text();
      if (body) {
        const xssDetected = detectXSS(body);
        if (xssDetected.isAttack) {
          await logSecurityEvent('XSS_ATTEMPT', {
            ip,
            path: url.pathname,
            method,
            patterns: xssDetected.patterns,
            timestamp: new Date().toISOString()
          });

          return NextResponse.json(
            { 
              success: false, 
              error: 'Potentially harmful content detected',
              code: 'XSS_BLOCKED'
            },
            { 
              status: 400,
              headers: {
                'X-Security-Alert': 'XSS_BLOCKED',
                'X-Incident-ID': generateIncidentId()
              }
            }
          );
        }
      }
    } catch (error) {
      // Continue if body parsing fails
      console.warn('Security middleware: Failed to parse request body for XSS detection');
    }
  }

  // Continue with the request
  return NextResponse.next();
}

/**
 * SQL Injection Detection
 */
async function detectSQLInjection(searchParams: URLSearchParams): Promise<{
  isAttack: boolean;
  suspiciousParams: string[];
}> {
  const SQL_PATTERNS = [
    /(\b(DROP|DELETE|TRUNCATE|UPDATE|INSERT|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(\b(UNION|SELECT)\b.*\b(FROM|WHERE)\b)/gi,
    /(--|\#|\/\*|\*\/)/g,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
    /('|")\s*(OR|AND)\s*('|")\d*\s*=\s*('|")\d*/gi,
    /(';|";|\);|");)/g,
    /\b(xp_|sp_|0x|exec|execute|declare|cast|convert)\b/gi,
    /(WAITFOR|DELAY|SLEEP|BENCHMARK)/gi,
    /\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b/gi
  ];

  const suspiciousParams: string[] = [];

  for (const [key, value] of searchParams.entries()) {
    const decodedValue = decodeURIComponent(value);
    
    for (const pattern of SQL_PATTERNS) {
      if (pattern.test(decodedValue)) {
        suspiciousParams.push(`${key}=${value}`);
        break;
      }
    }
  }

  return {
    isAttack: suspiciousParams.length > 0,
    suspiciousParams
  };
}

/**
 * XSS Detection
 */
function detectXSS(content: string): {
  isAttack: boolean;
  patterns: string[];
} {
  const XSS_PATTERNS = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /<object[^>]*>[\s\S]*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /expression\s*\(/gi,
    /vbscript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    /<svg[^>]*onload[^>]*>/gi,
    /<img[^>]*onerror[^>]*>/gi
  ];

  const detectedPatterns: string[] = [];

  for (const pattern of XSS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      detectedPatterns.push(...matches.slice(0, 3)); // Limit to 3 matches per pattern
    }
  }

  return {
    isAttack: detectedPatterns.length > 0,
    patterns: detectedPatterns
  };
}

/**
 * Enhanced response interceptor with PII masking
 */
export async function secureResponseInterceptor(
  response: Response, 
  request: NextRequest
): Promise<Response> {
  // Only process JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return response;
  }

  // Skip masking for public endpoints
  if (isPublicEndpoint(request.nextUrl.pathname)) {
    return response;
  }

  try {
    const responseData = await response.clone().json();
    
    // Check if response contains PII
    const containsPII = detectPIIInResponse(responseData);
    
    if (containsPII) {
      // Log PII access
      await logPIIAccess({
        path: request.nextUrl.pathname,
        method: request.method,
        userId: request.headers.get('x-user-id') || 'anonymous',
        ip: request.headers.get('x-real-ip') || 'unknown',
        timestamp: new Date().toISOString()
      });

      // Mask PII in response
      const maskedData = await piiMasker.maskApiResponse(responseData);
      
      return new NextResponse(JSON.stringify(maskedData), {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...response.headers,
          'X-PII-Masked': 'true',
          'X-Data-Classification': 'SENSITIVE'
        }
      });
    }
  } catch (error) {
    console.error('Security response interceptor error:', error);
  }

  return response;
}

/**
 * Detect PII in response data
 */
function detectPIIInResponse(data: any): boolean {
  if (!data) return false;
  
  const jsonStr = JSON.stringify(data).toLowerCase();
  const piiIndicators = [
    'email', 'phone', 'mobile', 'address', 'street',
    'business_number', 'tax_id', 'ssn', 'social_security',
    'credit_card', 'card_number', 'medical', 'diagnosis',
    'salary', 'compensation', 'performance_review'
  ];
  
  return piiIndicators.some(indicator => jsonStr.includes(indicator));
}

/**
 * Check if endpoint is public (no PII masking needed)
 */
function isPublicEndpoint(pathname: string): boolean {
  const publicPaths = [
    '/api/health',
    '/api/status',
    '/api/metrics',
    '/api/public/'
  ];
  
  return publicPaths.some(path => pathname.startsWith(path));
}

/**
 * Security event logging
 */
async function logSecurityEvent(eventType: string, details: any): Promise<void> {
  const event = {
    type: eventType,
    severity: getSeverityLevel(eventType),
    details,
    timestamp: new Date().toISOString(),
    source: 'SECURITY_MIDDLEWARE'
  };

  console.log('[SECURITY EVENT]', JSON.stringify(event));

  // In production, send to SIEM/security monitoring
  // await sendToSecurityMonitoring(event);
}

/**
 * PII access logging
 */
async function logPIIAccess(details: any): Promise<void> {
  const event = {
    type: 'PII_ACCESS',
    details,
    timestamp: new Date().toISOString(),
    compliance: {
      gdpr: true,
      ccpa: true,
      retention_days: 2555 // 7 years
    }
  };

  console.log('[PII ACCESS]', JSON.stringify(event));

  // In production, store in compliance audit log
  // await storeComplianceAudit(event);
}

/**
 * Get severity level for different event types
 */
function getSeverityLevel(eventType: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const severityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
    'RATE_LIMIT_VIOLATED': 'MEDIUM',
    'SQL_INJECTION_ATTEMPT': 'HIGH',
    'XSS_ATTEMPT': 'HIGH',
    'DDOS_ATTACK': 'CRITICAL',
    'BRUTE_FORCE_ATTEMPT': 'HIGH',
    'UNAUTHORIZED_ACCESS': 'HIGH',
    'PII_ACCESS': 'MEDIUM',
    'DATA_EXPORT': 'MEDIUM'
  };

  return severityMap[eventType] || 'LOW';
}

/**
 * Generate unique incident ID
 */
function generateIncidentId(): string {
  return `INC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Security headers for all responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'"
  ].join('; '));

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=self',
    'accelerometer=()',
    'autoplay=()',
    'encrypted-media=()',
    'fullscreen=()',
    'gyroscope=()',
    'magnetometer=()',
    'payment=()',
    'usb=()'
  ].join(', '));

  // Custom security headers
  response.headers.set('X-Security-Framework', 'ID-ROLE-PAPER');
  response.headers.set('X-Security-Version', '2.0');

  return response;
}

/**
 * Emergency security lockdown
 */
export async function emergencyLockdown(reason: string): Promise<void> {
  console.error(`[EMERGENCY LOCKDOWN] Reason: ${reason}`);
  
  // In production:
  // 1. Block all non-essential endpoints
  // 2. Enable maximum rate limiting
  // 3. Require additional authentication
  // 4. Alert security team
  // 5. Enable full request logging
  
  await logSecurityEvent('EMERGENCY_LOCKDOWN', {
    reason,
    timestamp: new Date().toISOString(),
    action: 'SYSTEM_LOCKED'
  });
}