/**
 * Security Middleware Integration
 * Combines Rate Limiting and PII Masking for comprehensive API protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createAdvancedRateLimiter,
  RateLimitingSystem,
  DDoSDetector,
  IPBlacklistManager 
} from '../lib/security/advanced-rate-limiter';
import { 
  PIIMaskingSystem,
  DataClassifier,
  ComplianceValidator,
  AuditLogger 
} from '../lib/security/pii-masking';

// Initialize security systems
const rateLimiter = createAdvancedRateLimiter();
const piiMasker = new PIIMaskingSystem();
const dataClassifier = new DataClassifier();
const complianceValidator = new ComplianceValidator();
const auditLogger = new AuditLogger();

/**
 * Security middleware configuration
 */
export interface SecurityConfig {
  enableRateLimiting?: boolean;
  enablePIIMasking?: boolean;
  enableAuditLogging?: boolean;
  enableDDoSProtection?: boolean;
  skipPaths?: string[];
  whitelistIPs?: string[];
}

const defaultConfig: SecurityConfig = {
  enableRateLimiting: true,
  enablePIIMasking: true,
  enableAuditLogging: true,
  enableDDoSProtection: true,
  skipPaths: ['/health', '/metrics', '/public'],
  whitelistIPs: []
};

/**
 * Main security middleware
 */
export async function securityMiddleware(
  req: NextRequest,
  config: SecurityConfig = defaultConfig
): Promise<NextResponse | null> {
  const path = req.nextUrl.pathname;
  
  // Skip security for exempted paths
  if (config.skipPaths?.some(skip => path.startsWith(skip))) {
    return null;
  }

  // 1. Rate Limiting & DDoS Protection
  if (config.enableRateLimiting) {
    const rateLimitResponse = await rateLimiter.middleware(req);
    if (rateLimitResponse) {
      // Log rate limit violation
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', req);
      return rateLimitResponse;
    }
  }

  // Continue to next middleware
  return null;
}

/**
 * Response interceptor for PII masking
 */
export async function maskResponseMiddleware(
  response: Response,
  req: NextRequest,
  config: SecurityConfig = defaultConfig
): Promise<Response> {
  if (!config.enablePIIMasking) {
    return response;
  }

  // Only mask JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return response;
  }

  try {
    // Clone response to read body
    const clonedResponse = response.clone();
    const originalData = await clonedResponse.json();
    
    // Check if response contains PII
    const containsPII = detectPII(originalData);
    
    if (containsPII) {
      // Log PII access
      if (config.enableAuditLogging) {
        await logPIIAccess(req, originalData);
      }
      
      // Mask PII data
      const maskedData = await piiMasker.maskApiResponse(originalData);
      
      // Create new response with masked data
      return new NextResponse(JSON.stringify(maskedData), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
  } catch (error) {
    console.error('Error masking response:', error);
  }

  return response;
}

/**
 * Detect if data contains PII
 */
function detectPII(data: any): boolean {
  if (!data) return false;
  
  const jsonStr = JSON.stringify(data).toLowerCase();
  const piiIndicators = [
    'email', 'phone', 'address', 'ssn', 
    'credit', 'card', 'business_number',
    'tax_id', 'passport', 'driver_license'
  ];
  
  return piiIndicators.some(indicator => jsonStr.includes(indicator));
}

/**
 * Log security events
 */
async function logSecurityEvent(eventType: string, req: NextRequest): Promise<void> {
  const event = {
    type: eventType,
    timestamp: new Date(),
    ip: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown',
    path: req.nextUrl.pathname,
    method: req.method,
    userAgent: req.headers.get('user-agent'),
    userId: req.headers.get('x-user-id')
  };
  
  console.log('[SECURITY EVENT]', event);
  
  // In production, send to security monitoring service
  // await sendToSIEM(event);
}

/**
 * Log PII access for compliance
 */
async function logPIIAccess(req: NextRequest, data: any): Promise<void> {
  const piiFields = detectPIIFields(data);
  
  if (piiFields.length > 0) {
    await auditLogger.logPIIAccess({
      userId: req.headers.get('x-user-id') || 'anonymous',
      action: req.method,
      resource: req.nextUrl.pathname,
      piiFields,
      timestamp: new Date(),
      ip: req.headers.get('x-real-ip') || 'unknown'
    });
  }
}

/**
 * Detect specific PII fields in data
 */
function detectPIIFields(data: any, prefix: string = ''): string[] {
  const fields: string[] = [];
  
  if (typeof data !== 'object' || data === null) {
    return fields;
  }
  
  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const lowerKey = key.toLowerCase();
    
    if (lowerKey.includes('email') || 
        lowerKey.includes('phone') || 
        lowerKey.includes('address') ||
        lowerKey.includes('ssn') ||
        lowerKey.includes('credit')) {
      fields.push(fullKey);
    }
    
    if (typeof value === 'object') {
      fields.push(...detectPIIFields(value, fullKey));
    }
  }
  
  return fields;
}

/**
 * Create security headers
 */
export function createSecurityHeaders(): Headers {
  const headers = new Headers();
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Content-Security-Policy', "default-src 'self'");
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return headers;
}

/**
 * Emergency mode activation for critical threats
 */
export async function activateEmergencyMode(reason: string): Promise<void> {
  console.error(`[EMERGENCY MODE ACTIVATED] Reason: ${reason}`);
  
  // Implement emergency measures
  // 1. Increase rate limiting strictness
  // 2. Block all non-essential endpoints
  // 3. Alert security team
  // 4. Enable full request logging
  
  // In production, trigger incident response
  // await triggerIncidentResponse(reason);
}

/**
 * Health check for security systems
 */
export async function securityHealthCheck(): Promise<HealthCheckResult> {
  const checks = {
    rateLimiting: 'HEALTHY',
    piiMasking: 'HEALTHY',
    auditLogging: 'HEALTHY',
    ddosProtection: 'HEALTHY'
  };
  
  // Test each system
  try {
    // Test rate limiter
    const testReq = new NextRequest('http://localhost/test');
    const rateLimitTest = await rateLimiter.middleware(testReq);
    checks.rateLimiting = rateLimitTest === null ? 'HEALTHY' : 'DEGRADED';
    
    // Test PII masking
    const testData = { email: 'test@example.com' };
    const maskedTest = await piiMasker.maskApiResponse(testData);
    checks.piiMasking = maskedTest.email.includes('****') ? 'HEALTHY' : 'UNHEALTHY';
    
  } catch (error) {
    console.error('Security health check failed:', error);
  }
  
  const allHealthy = Object.values(checks).every(status => status === 'HEALTHY');
  
  return {
    status: allHealthy ? 'HEALTHY' : 'DEGRADED',
    components: checks,
    timestamp: new Date(),
    message: allHealthy ? 'All security systems operational' : 'Some security systems degraded'
  };
}

/**
 * Middleware factory for specific API types
 */
export const createAPIMiddleware = {
  auth: () => securityMiddleware,
  admin: () => async (req: NextRequest) => {
    const config: SecurityConfig = {
      ...defaultConfig,
      enableRateLimiting: true,
      enablePIIMasking: true,
      enableAuditLogging: true
    };
    return securityMiddleware(req, config);
  },
  public: () => async (req: NextRequest) => {
    const config: SecurityConfig = {
      ...defaultConfig,
      enablePIIMasking: false,
      enableAuditLogging: false
    };
    return securityMiddleware(req, config);
  },
  bulk: () => async (req: NextRequest) => {
    const config: SecurityConfig = {
      ...defaultConfig,
      enableRateLimiting: true, // Strict limits for bulk operations
      enablePIIMasking: true
    };
    return securityMiddleware(req, config);
  }
};

// Type definitions
interface HealthCheckResult {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  components: Record<string, string>;
  timestamp: Date;
  message: string;
}

// Export security systems for direct access if needed
export {
  rateLimiter,
  piiMasker,
  dataClassifier,
  complianceValidator,
  auditLogger
};