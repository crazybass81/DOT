/**
 * JWT Token Validation and Security Module
 * Provides comprehensive JWT validation with security best practices
 */

import { jwtVerify, SignJWT, JWTPayload } from 'jose';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';

// Security configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
const JWT_ISSUER = process.env.NEXT_PUBLIC_APP_URL || 'https://dot-attendance.com';
const JWT_AUDIENCE = 'dot-attendance-api';
const TOKEN_EXPIRY = 60 * 60 * 8; // 8 hours
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days

// Token blacklist for revoked tokens (in production, use Redis)
const tokenBlacklist = new Set<string>();

// Failed attempt tracking (in production, use Redis)
const failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  organizationId?: string;
  isMasterAdmin: boolean;
  sessionId: string;
  fingerprint?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
  expired?: boolean;
  revoked?: boolean;
}

/**
 * Generate a secure JWT token
 */
export async function generateSecureToken(
  payload: Omit<TokenPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>
): Promise<string> {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  const secret = new TextEncoder().encode(JWT_SECRET);
  const tokenId = createHash('sha256')
    .update(`${payload.userId}-${Date.now()}-${Math.random()}`)
    .digest('hex');

  const jwt = await new SignJWT({
    ...payload,
    jti: tokenId, // JWT ID for tracking
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(`${TOKEN_EXPIRY}s`)
    .sign(secret);

  return jwt;
}

/**
 * Validate JWT token with comprehensive security checks
 */
export async function validateToken(token: string): Promise<TokenValidationResult> {
  try {
    if (!JWT_SECRET) {
      return { valid: false, error: 'JWT configuration missing' };
    }

    // Check if token is blacklisted
    const tokenHash = createHash('sha256').update(token).digest('hex');
    if (tokenBlacklist.has(tokenHash)) {
      return { valid: false, revoked: true, error: 'Token has been revoked' };
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    
    // Verify token signature and claims
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
      clockTolerance: 5, // 5 seconds clock skew tolerance
    });

    // Type guard for custom payload
    const tokenPayload = payload as TokenPayload;

    // Additional security checks
    if (!tokenPayload.userId || !tokenPayload.sessionId) {
      return { valid: false, error: 'Invalid token structure' };
    }

    // Check if session is still active (implement session store check)
    const isSessionActive = await checkSessionActive(tokenPayload.sessionId);
    if (!isSessionActive) {
      return { valid: false, error: 'Session expired or invalidated' };
    }

    // Validate fingerprint if present
    if (tokenPayload.fingerprint) {
      const currentFingerprint = await generateFingerprint();
      if (tokenPayload.fingerprint !== currentFingerprint) {
        // Log suspicious activity
        await logSuspiciousActivity(tokenPayload.userId, 'Fingerprint mismatch');
        return { valid: false, error: 'Security validation failed' };
      }
    }

    return {
      valid: true,
      payload: tokenPayload,
    };

  } catch (error: any) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return { valid: false, expired: true, error: 'Token expired' };
    }
    
    if (error.code === 'ERR_JWT_INVALID') {
      return { valid: false, error: 'Invalid token' };
    }

    return { valid: false, error: 'Token validation failed' };
  }
}

/**
 * Extract and validate token from request
 */
export async function extractAndValidateToken(
  authHeader?: string | null,
  cookieName?: string
): Promise<TokenValidationResult> {
  let token: string | undefined;

  // Try to get token from Authorization header first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Fallback to cookie if no header token
  if (!token && cookieName) {
    const cookieStore = cookies();
    const cookieToken = cookieStore.get(cookieName);
    if (cookieToken) {
      token = cookieToken.value;
    }
  }

  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  return validateToken(token);
}

/**
 * Revoke a token (add to blacklist)
 */
export async function revokeToken(token: string): Promise<void> {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  tokenBlacklist.add(tokenHash);
  
  // In production, store in Redis with TTL matching token expiry
  // await redis.setex(`revoked:${tokenHash}`, TOKEN_EXPIRY, '1');
}

/**
 * Check if a session is still active
 */
async function checkSessionActive(sessionId: string): Promise<boolean> {
  // In production, check against session store (Redis/Database)
  // For now, return true as placeholder
  return true;
}

/**
 * Generate device fingerprint for additional security
 */
async function generateFingerprint(): Promise<string> {
  // In production, combine various factors:
  // - User agent
  // - Accept headers
  // - Accept-Language
  // - IP address subnet
  // - Screen resolution (from client)
  
  const factors = [
    process.env.NODE_ENV,
    new Date().getDate().toString(), // Daily rotation
  ];
  
  return createHash('sha256')
    .update(factors.join('-'))
    .digest('hex');
}

/**
 * Log suspicious activity for security monitoring
 */
async function logSuspiciousActivity(
  userId: string,
  activity: string
): Promise<void> {
  console.error(`[SECURITY] Suspicious activity detected for user ${userId}: ${activity}`);
  
  // In production, send to security monitoring system
  // await securityMonitor.alert({
  //   userId,
  //   activity,
  //   timestamp: new Date(),
  //   severity: 'HIGH'
  // });
}

/**
 * Track failed authentication attempts
 */
export async function trackFailedAttempt(identifier: string): Promise<boolean> {
  const now = new Date();
  const attempt = failedAttempts.get(identifier) || { count: 0, lastAttempt: now };
  
  // Reset counter if last attempt was more than 15 minutes ago
  if (now.getTime() - attempt.lastAttempt.getTime() > 15 * 60 * 1000) {
    attempt.count = 0;
  }
  
  attempt.count++;
  attempt.lastAttempt = now;
  failedAttempts.set(identifier, attempt);
  
  // Block after 5 failed attempts
  if (attempt.count >= 5) {
    await logSuspiciousActivity(identifier, `Blocked after ${attempt.count} failed attempts`);
    return true; // Blocked
  }
  
  return false; // Not blocked
}

/**
 * Clear failed attempts for an identifier
 */
export function clearFailedAttempts(identifier: string): void {
  failedAttempts.delete(identifier);
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  const expected = createHash('sha256')
    .update(`${sessionToken}-${JWT_SECRET}`)
    .digest('hex');
  
  return token === expected;
}

/**
 * Generate CSRF token for a session
 */
export function generateCSRFToken(sessionToken: string): string {
  return createHash('sha256')
    .update(`${sessionToken}-${JWT_SECRET}`)
    .digest('hex');
}

/**
 * Cleanup expired tokens from blacklist
 */
export function cleanupExpiredTokens(): void {
  // In production, this would be handled by Redis TTL
  // For now, clear the entire set periodically
  if (tokenBlacklist.size > 10000) {
    tokenBlacklist.clear();
  }
}

// Run cleanup every hour
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
}