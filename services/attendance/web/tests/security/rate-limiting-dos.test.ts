/**
 * 🔴 RED Phase: DoS Attack & Rate Limiting Security Tests
 * CVE-2025-005: DoS vulnerability through missing rate limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createAdvancedRateLimiter, 
  DDoSDetector, 
  IPBlacklistManager,
  RateLimitingSystem 
} from '../../src/lib/security/advanced-rate-limiter';

describe('🔴 CRITICAL: DoS Attack Prevention Tests', () => {
  let rateLimiter: RateLimitingSystem;
  let ddosDetector: DDoSDetector;
  let blacklistManager: IPBlacklistManager;

  beforeEach(() => {
    // Initialize security systems
    rateLimiter = new RateLimitingSystem();
    ddosDetector = new DDoSDetector();
    blacklistManager = new IPBlacklistManager();
  });

  afterEach(() => {
    // Clean up
    rateLimiter.destroy();
    ddosDetector.destroy();
    blacklistManager.clear();
  });

  describe('API-Specific Rate Limiting', () => {
    test('General API: Should enforce 100 req/min per IP', async () => {
      const testIP = '192.168.1.100';
      const endpoint = '/api/general/data';
      
      // Simulate 100 requests - should pass
      for (let i = 0; i < 100; i++) {
        const req = createMockRequest(endpoint, testIP);
        const result = await rateLimiter.checkLimit(req, 'general');
        expect(result.allowed).toBe(true);
      }

      // 101st request - should be blocked
      const req = createMockRequest(endpoint, testIP);
      const result = await rateLimiter.checkLimit(req, 'general');
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.message).toContain('Rate limit exceeded');
    });

    test('Search API: Should enforce 50 req/min per IP', async () => {
      const testIP = '192.168.1.101';
      const endpoint = '/api/search';
      
      // Simulate 50 requests - should pass
      for (let i = 0; i < 50; i++) {
        const req = createMockRequest(endpoint, testIP);
        const result = await rateLimiter.checkLimit(req, 'search');
        expect(result.allowed).toBe(true);
      }

      // 51st request - should be blocked
      const req = createMockRequest(endpoint, testIP);
      const result = await rateLimiter.checkLimit(req, 'search');
      expect(result.allowed).toBe(false);
    });

    test('Auth API: Should enforce 10 req/min per IP', async () => {
      const testIP = '192.168.1.102';
      const endpoint = '/api/auth/login';
      
      // Simulate 10 requests - should pass
      for (let i = 0; i < 10; i++) {
        const req = createMockRequest(endpoint, testIP);
        const result = await rateLimiter.checkLimit(req, 'auth');
        expect(result.allowed).toBe(true);
      }

      // 11th request - should be blocked
      const req = createMockRequest(endpoint, testIP);
      const result = await rateLimiter.checkLimit(req, 'auth');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('Master Admin API: Should enforce 20 req/min per user', async () => {
      const userId = 'admin-123';
      const endpoint = '/api/master-admin/users';
      
      // Simulate 20 requests - should pass
      for (let i = 0; i < 20; i++) {
        const req = createMockRequest(endpoint, '192.168.1.103', userId);
        const result = await rateLimiter.checkLimit(req, 'master-admin');
        expect(result.allowed).toBe(true);
      }

      // 21st request - should be blocked
      const req = createMockRequest(endpoint, '192.168.1.103', userId);
      const result = await rateLimiter.checkLimit(req, 'master-admin');
      expect(result.allowed).toBe(false);
    });

    test('Bulk Operations: Should enforce 5 req/min per user', async () => {
      const userId = 'user-456';
      const endpoint = '/api/bulk/update';
      
      // Simulate 5 requests - should pass
      for (let i = 0; i < 5; i++) {
        const req = createMockRequest(endpoint, '192.168.1.104', userId);
        const result = await rateLimiter.checkLimit(req, 'bulk');
        expect(result.allowed).toBe(true);
      }

      // 6th request - should be blocked
      const req = createMockRequest(endpoint, '192.168.1.104', userId);
      const result = await rateLimiter.checkLimit(req, 'bulk');
      expect(result.allowed).toBe(false);
    });
  });

  describe('DDoS Attack Detection', () => {
    test('Should detect and mitigate distributed DoS attack', async () => {
      const attackerIPs = Array.from({ length: 100 }, (_, i) => `10.0.0.${i}`);
      const endpoint = '/api/vulnerable';
      const attackDetected = [];

      // Simulate distributed attack
      for (const ip of attackerIPs) {
        for (let i = 0; i < 20; i++) {
          const req = createMockRequest(endpoint, ip);
          const isAttack = await ddosDetector.detectAttack(req);
          
          if (isAttack) {
            attackDetected.push(ip);
            break;
          }
        }
      }

      // Should detect pattern as DDoS
      expect(attackDetected.length).toBeGreaterThan(50);
      expect(ddosDetector.getAttackStatus()).toBe('ACTIVE');
      expect(ddosDetector.getMitigationMode()).toBe('ENABLED');
    });

    test('Should trigger emergency mode on sustained attack', async () => {
      const endpoint = '/api/target';
      
      // Simulate sustained attack (1000 requests in 10 seconds)
      const startTime = Date.now();
      let requestCount = 0;

      while (Date.now() - startTime < 10000 && requestCount < 1000) {
        const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const req = createMockRequest(endpoint, ip);
        await ddosDetector.detectAttack(req);
        requestCount++;
      }

      // Should trigger emergency mode
      expect(ddosDetector.isEmergencyMode()).toBe(true);
      expect(ddosDetector.getBlockedIPs().size).toBeGreaterThan(0);
    });

    test('Should distinguish between legitimate traffic spike and DDoS', async () => {
      // Simulate legitimate traffic spike (same authenticated users)
      const legitimateUsers = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
      
      for (const userId of legitimateUsers) {
        for (let i = 0; i < 30; i++) {
          const req = createMockRequest('/api/data', '192.168.1.1', userId);
          const isAttack = await ddosDetector.detectAttack(req);
          expect(isAttack).toBe(false); // Should not flag legitimate users
        }
      }

      // Simulate DDoS (many IPs, no auth)
      for (let i = 0; i < 100; i++) {
        const ip = `10.0.0.${i}`;
        const req = createMockRequest('/api/data', ip);
        await ddosDetector.detectAttack(req);
      }

      expect(ddosDetector.getAttackStatus()).toBe('ACTIVE');
    });
  });

  describe('Automatic IP Blacklisting', () => {
    test('Should automatically blacklist IPs after repeated violations', async () => {
      const maliciousIP = '203.0.113.42';
      const endpoint = '/api/protected';
      
      // Trigger multiple rate limit violations
      for (let i = 0; i < 200; i++) {
        const req = createMockRequest(endpoint, maliciousIP);
        await rateLimiter.checkLimit(req, 'general');
      }

      // IP should be blacklisted
      expect(blacklistManager.isBlacklisted(maliciousIP)).toBe(true);
      
      // All subsequent requests should be immediately blocked
      const req = createMockRequest('/api/any', maliciousIP);
      const result = await blacklistManager.checkAccess(req);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('IP_BLACKLISTED');
    });

    test('Should implement progressive penalties for repeat offenders', async () => {
      const offenderIP = '198.51.100.1';
      
      // First violation - warning
      await blacklistManager.recordViolation(offenderIP, 'RATE_LIMIT');
      expect(blacklistManager.getPenaltyLevel(offenderIP)).toBe('WARNING');
      
      // Second violation - temporary block (5 minutes)
      await blacklistManager.recordViolation(offenderIP, 'RATE_LIMIT');
      expect(blacklistManager.getPenaltyLevel(offenderIP)).toBe('TEMP_BLOCK');
      expect(blacklistManager.getBlockDuration(offenderIP)).toBe(300000); // 5 min
      
      // Third violation - extended block (1 hour)
      await blacklistManager.recordViolation(offenderIP, 'RATE_LIMIT');
      expect(blacklistManager.getPenaltyLevel(offenderIP)).toBe('EXTENDED_BLOCK');
      expect(blacklistManager.getBlockDuration(offenderIP)).toBe(3600000); // 1 hour
      
      // Fourth violation - permanent blacklist
      await blacklistManager.recordViolation(offenderIP, 'RATE_LIMIT');
      expect(blacklistManager.getPenaltyLevel(offenderIP)).toBe('PERMANENT');
    });

    test('Should maintain whitelist for trusted IPs', async () => {
      const trustedIPs = ['192.168.1.1', '10.0.0.1']; // Internal IPs
      
      // Add to whitelist
      trustedIPs.forEach(ip => blacklistManager.addToWhitelist(ip));
      
      // Even with violations, whitelisted IPs should not be blocked
      for (const ip of trustedIPs) {
        for (let i = 0; i < 500; i++) {
          const req = createMockRequest('/api/admin', ip);
          const result = await blacklistManager.checkAccess(req);
          expect(result.allowed).toBe(true);
        }
        
        // Should not be blacklisted despite violations
        expect(blacklistManager.isBlacklisted(ip)).toBe(false);
      }
    });
  });

  describe('Rate Limiting Bypass Attempts', () => {
    test('Should prevent header spoofing bypass', async () => {
      const realIP = '203.0.113.99';
      const spoofedIP = '192.168.1.1';
      
      // Attempt to bypass with X-Forwarded-For header
      const req = new NextRequest('http://localhost/api/data', {
        headers: {
          'X-Forwarded-For': spoofedIP,
          'X-Real-IP': realIP,
        }
      });
      
      // Should use real IP, not spoofed
      const fingerprint = await rateLimiter.generateFingerprint(req);
      expect(fingerprint).toContain(realIP);
      expect(fingerprint).not.toContain(spoofedIP);
    });

    test('Should prevent User-Agent rotation bypass', async () => {
      const ip = '203.0.113.100';
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (X11; Linux x86_64)'
      ];
      
      // Try to bypass by rotating User-Agent
      for (let i = 0; i < 150; i++) {
        const req = createMockRequest('/api/data', ip, null, {
          'User-Agent': userAgents[i % userAgents.length]
        });
        await rateLimiter.checkLimit(req, 'general');
      }
      
      // Should still be rate limited despite User-Agent changes
      const req = createMockRequest('/api/data', ip);
      const result = await rateLimiter.checkLimit(req, 'general');
      expect(result.allowed).toBe(false);
    });

    test('Should prevent distributed botnet bypass', async () => {
      // Simulate botnet with similar request patterns
      const botnetIPs = Array.from({ length: 50 }, (_, i) => `198.51.100.${i}`);
      const targetEndpoint = '/api/victim';
      const commonHeaders = {
        'Accept': 'application/json',
        'Accept-Language': 'en-US',
        'Cache-Control': 'no-cache'
      };
      
      const detectedBots = [];
      
      for (const ip of botnetIPs) {
        const req = createMockRequest(targetEndpoint, ip, null, commonHeaders);
        const isBotnet = await ddosDetector.detectBotnetPattern(req);
        
        if (isBotnet) {
          detectedBots.push(ip);
        }
      }
      
      // Should detect botnet pattern
      expect(detectedBots.length).toBeGreaterThan(30);
      expect(ddosDetector.getBotnetStatus()).toBe('DETECTED');
    });
  });

  describe('Performance Under Load', () => {
    test('Should maintain sub-10ms response time under normal load', async () => {
      const iterations = 1000;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        const req = createMockRequest('/api/test', `192.168.1.${i % 255}`);
        await rateLimiter.checkLimit(req, 'general');
        const elapsed = Date.now() - start;
        times.push(elapsed);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(10); // Average under 10ms
      expect(maxTime).toBeLessThan(50); // Max under 50ms
    });

    test('Should handle 10,000 concurrent connections', async () => {
      const promises = [];
      
      for (let i = 0; i < 10000; i++) {
        const req = createMockRequest('/api/concurrent', `10.0.${Math.floor(i / 255)}.${i % 255}`);
        promises.push(rateLimiter.checkLimit(req, 'general'));
      }
      
      const start = Date.now();
      const results = await Promise.all(promises);
      const elapsed = Date.now() - start;
      
      expect(results.filter(r => r.allowed).length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(5000); // Complete within 5 seconds
    });
  });
});

// Helper function to create mock requests
function createMockRequest(
  url: string, 
  ip: string, 
  userId?: string,
  headers?: Record<string, string>
): NextRequest {
  const mockHeaders = new Headers({
    'X-Real-IP': ip,
    'X-Forwarded-For': ip,
    ...(userId && { 'X-User-Id': userId }),
    ...headers
  });
  
  return new NextRequest(`http://localhost${url}`, {
    headers: mockHeaders
  });
}