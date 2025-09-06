/**
 * 🔴 CRITICAL SECURITY TEST SUITE
 * Testing MASTER_ADMIN privilege escalation prevention
 * CVE-2025-001: ADMIN → MASTER_ADMIN privilege escalation vulnerability
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { EnhancedAuthMiddleware } from '../../lib/security/EnhancedAuthMiddleware';
import { RoleHierarchyValidator } from '../../lib/security/RoleHierarchyValidator';
import { PrivilegeEscalationDetector } from '../../lib/security/PrivilegeEscalationDetector';
import { SessionBasedAuth } from '../../lib/security/SessionBasedAuth';
import { SecurityAuditLogger } from '../../lib/security/SecurityAuditLogger';

describe('🔴 CRITICAL: MASTER_ADMIN Security Tests', () => {
  let authMiddleware: EnhancedAuthMiddleware;
  let roleValidator: RoleHierarchyValidator;
  let escalationDetector: PrivilegeEscalationDetector;
  let sessionAuth: SessionBasedAuth;
  let auditLogger: SecurityAuditLogger;

  beforeEach(() => {
    authMiddleware = new EnhancedAuthMiddleware();
    roleValidator = new RoleHierarchyValidator();
    escalationDetector = new PrivilegeEscalationDetector();
    sessionAuth = new SessionBasedAuth();
    auditLogger = new SecurityAuditLogger();
    
    // Clear all security caches
    sessionAuth.clearAllSessions();
    escalationDetector.resetDetection();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. 🔴 RED PHASE: Privilege Escalation Attack Vectors', () => {
    
    test('ADMIN should NOT access MASTER_ADMIN endpoints', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-role-change',
        headers: {
          authorization: 'Bearer mock-admin-token'
        },
        body: {
          userIds: ['user1', 'user2'],
          newRole: 'MASTER_ADMIN'
        }
      });

      // Mock ADMIN user token
      jest.spyOn(authMiddleware, 'verifyToken').mockResolvedValue({
        userId: 'admin-user-id',
        email: 'admin@company.com',
        role: 'ADMIN',
        sessionId: 'session-123'
      });

      const result = await authMiddleware.validateMasterAdminAccess(req, res);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('INSUFFICIENT_PRIVILEGES');
      expect(result.securityEvent).toBe('PRIVILEGE_ESCALATION_ATTEMPT');
    });

    test('Token manipulation should be detected and blocked', async () => {
      const manipulatedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiTUFTVEVSX0FETUlOIn0.fake';
      
      const { req, res } = createMocks({
        method: 'DELETE',
        url: '/api/master-admin/organizations/123',
        headers: {
          authorization: `Bearer ${manipulatedToken}`
        }
      });

      const result = await authMiddleware.validateMasterAdminAccess(req, res);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('TOKEN_MANIPULATION_DETECTED');
      expect(result.securityEvent).toBe('CRITICAL_SECURITY_BREACH');
      expect(auditLogger.getLastEvent()?.severity).toBe('CRITICAL');
    });

    test('Session hijacking with role change should invalidate all sessions', async () => {
      // Create legitimate ADMIN session
      const sessionId = await sessionAuth.createSession({
        userId: 'user-123',
        role: 'ADMIN',
        email: 'admin@company.com'
      });

      // Attempt to escalate privileges in hijacked session
      const hijackAttempt = await sessionAuth.attemptRoleChange(sessionId, 'MASTER_ADMIN');
      
      expect(hijackAttempt.success).toBe(false);
      expect(hijackAttempt.action).toBe('ALL_SESSIONS_INVALIDATED');
      expect(await sessionAuth.isSessionValid(sessionId)).toBe(false);
    });

    test('Concurrent session privilege escalation should be detected', async () => {
      const userId = 'user-456';
      
      // Create multiple sessions
      const session1 = await sessionAuth.createSession({
        userId,
        role: 'ADMIN',
        email: 'admin@company.com'
      });
      
      const session2 = await sessionAuth.createSession({
        userId,
        role: 'ADMIN',
        email: 'admin@company.com'
      });

      // Attempt privilege escalation in one session
      const escalationAttempt = await escalationDetector.detectEscalation({
        sessionId: session1,
        currentRole: 'ADMIN',
        requestedRole: 'MASTER_ADMIN',
        userId
      });

      expect(escalationAttempt.detected).toBe(true);
      expect(escalationAttempt.action).toBe('BLOCK_AND_INVALIDATE_ALL');
      expect(await sessionAuth.isSessionValid(session1)).toBe(false);
      expect(await sessionAuth.isSessionValid(session2)).toBe(false);
    });

    test('API-level granular permission checks should prevent unauthorized access', async () => {
      const testCases = [
        {
          role: 'EMPLOYEE',
          endpoint: '/api/master-admin/users',
          allowed: false
        },
        {
          role: 'ADMIN',
          endpoint: '/api/master-admin/users/bulk-role-change',
          allowed: false
        },
        {
          role: 'ADMIN',
          endpoint: '/api/admin/users',
          allowed: true
        },
        {
          role: 'MASTER_ADMIN',
          endpoint: '/api/master-admin/users/bulk-role-change',
          allowed: true
        }
      ];

      for (const testCase of testCases) {
        const result = await roleValidator.validateEndpointAccess(
          testCase.role,
          testCase.endpoint
        );
        
        expect(result.allowed).toBe(testCase.allowed);
        if (!testCase.allowed) {
          expect(auditLogger.hasLoggedEvent('UNAUTHORIZED_ACCESS_ATTEMPT')).toBe(true);
        }
      }
    });

    test('Role hierarchy violations should be prevented', async () => {
      const hierarchyTests = [
        {
          currentRole: 'EMPLOYEE',
          targetRole: 'ADMIN',
          canPromote: false
        },
        {
          currentRole: 'ADMIN',
          targetRole: 'MASTER_ADMIN',
          canPromote: false
        },
        {
          currentRole: 'MASTER_ADMIN',
          targetRole: 'ADMIN',
          canPromote: true
        },
        {
          currentRole: 'MASTER_ADMIN',
          targetRole: 'MASTER_ADMIN',
          canPromote: true
        }
      ];

      for (const test of hierarchyTests) {
        const result = await roleValidator.canPromoteToRole(
          test.currentRole,
          test.targetRole
        );
        
        expect(result).toBe(test.canPromote);
      }
    });

    test('Privilege escalation patterns should trigger immediate lockdown', async () => {
      const suspiciousPatterns = [
        // Rapid role change attempts
        { userId: 'user1', attempts: 3, timeWindow: 60 },
        // Cross-session escalation
        { userId: 'user2', sessions: ['s1', 's2'], escalationType: 'CROSS_SESSION' },
        // Token replay attack
        { userId: 'user3', tokenReplay: true, originalToken: 'old-token' }
      ];

      for (const pattern of suspiciousPatterns) {
        const detection = await escalationDetector.analyzePattern(pattern);
        
        expect(detection.suspicious).toBe(true);
        expect(detection.action).toContain('LOCKDOWN');
        expect(auditLogger.getCriticalEvents().length).toBeGreaterThan(0);
      }
    });
  });

  describe('2. 🟢 GREEN PHASE: Security Implementation', () => {
    
    test('Enhanced middleware should validate MASTER_ADMIN properly', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-role-change',
        headers: {
          authorization: 'Bearer valid-master-admin-token'
        }
      });

      // Mock valid MASTER_ADMIN token
      jest.spyOn(authMiddleware, 'verifyToken').mockResolvedValue({
        userId: 'master-admin-id',
        email: 'master@company.com',
        role: 'MASTER_ADMIN',
        sessionId: 'master-session-123',
        verified: true
      });

      const result = await authMiddleware.validateMasterAdminAccess(req, res);
      
      expect(result.allowed).toBe(true);
      expect(result.securityChecks).toEqual({
        tokenValid: true,
        roleValid: true,
        sessionValid: true,
        hierarchyValid: true
      });
    });

    test('Multi-layer verification should be enforced', async () => {
      const verificationLayers = await authMiddleware.getVerificationLayers();
      
      expect(verificationLayers).toContain('TOKEN_VERIFICATION');
      expect(verificationLayers).toContain('SESSION_VALIDATION');
      expect(verificationLayers).toContain('ROLE_HIERARCHY_CHECK');
      expect(verificationLayers).toContain('PRIVILEGE_ESCALATION_DETECTION');
      expect(verificationLayers).toContain('AUDIT_LOGGING');
      expect(verificationLayers.length).toBeGreaterThanOrEqual(5);
    });

    test('Session-based re-authentication should work correctly', async () => {
      const session = await sessionAuth.createSession({
        userId: 'master-123',
        role: 'MASTER_ADMIN',
        email: 'master@company.com'
      });

      // Simulate time passing
      await new Promise(resolve => setTimeout(resolve, 100));

      const reAuthResult = await sessionAuth.requireReAuthentication(session, {
        action: 'BULK_ROLE_CHANGE',
        sensitivity: 'CRITICAL'
      });

      expect(reAuthResult.required).toBe(true);
      expect(reAuthResult.method).toBe('PASSWORD_CONFIRMATION');
    });

    test('Audit logger should capture all security events', async () => {
      const events = [
        {
          type: 'LOGIN_ATTEMPT',
          userId: 'user1',
          role: 'ADMIN',
          success: true
        },
        {
          type: 'PRIVILEGE_ESCALATION_ATTEMPT',
          userId: 'user2',
          fromRole: 'ADMIN',
          toRole: 'MASTER_ADMIN',
          blocked: true
        },
        {
          type: 'SUSPICIOUS_ACTIVITY',
          pattern: 'RAPID_ROLE_CHANGES',
          userId: 'user3'
        }
      ];

      for (const event of events) {
        await auditLogger.logSecurityEvent(event);
      }

      const logs = await auditLogger.getSecurityLogs({
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date()
      });

      expect(logs.length).toBe(events.length);
      expect(logs.every(log => log.timestamp)).toBe(true);
      expect(logs.every(log => log.hash)).toBe(true); // Tamper-proof hash
    });
  });

  describe('3. 🔵 REFACTOR PHASE: Performance & Optimization', () => {
    
    test('Security checks should complete within 100ms', async () => {
      const startTime = Date.now();
      
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users',
        headers: {
          authorization: 'Bearer test-token'
        }
      });

      await authMiddleware.validateMasterAdminAccess(req, res);
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(100);
    });

    test('Cache should improve repeated validation performance', async () => {
      const token = 'Bearer consistent-token';
      const measurements: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        
        const { req } = createMocks({
          headers: { authorization: token }
        });
        
        await authMiddleware.validateToken(req);
        measurements.push(Date.now() - start);
      }

      // First call should be slower than cached calls
      expect(measurements[0]).toBeGreaterThan(measurements[4]);
      // Cached calls should be very fast
      expect(measurements[4]).toBeLessThan(10);
    });

    test('Concurrent validations should not cause race conditions', async () => {
      const validations = Array(10).fill(null).map((_, i) => {
        const { req, res } = createMocks({
          headers: {
            authorization: `Bearer token-${i}`
          }
        });
        
        return authMiddleware.validateMasterAdminAccess(req, res);
      });

      const results = await Promise.all(validations);
      
      // All validations should complete without errors
      expect(results.every(r => r.hasOwnProperty('allowed'))).toBe(true);
      expect(results.every(r => r.hasOwnProperty('reason'))).toBe(true);
    });

    test('Memory usage should remain stable under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate 100 authentication attempts
      for (let i = 0; i < 100; i++) {
        const session = await sessionAuth.createSession({
          userId: `user-${i}`,
          role: 'ADMIN',
          email: `user${i}@company.com`
        });
        
        if (i % 10 === 0) {
          // Clean up old sessions periodically
          await sessionAuth.cleanupExpiredSessions();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('4. Integration Tests', () => {
    
    test('Full security pipeline should work end-to-end', async () => {
      // 1. User attempts to access MASTER_ADMIN endpoint
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-role-change',
        headers: {
          authorization: 'Bearer admin-token',
          'x-session-id': 'session-456'
        },
        body: {
          userIds: ['u1', 'u2'],
          newRole: 'ADMIN'
        }
      });

      // 2. Token verification
      const tokenResult = await authMiddleware.verifyToken(req.headers.authorization);
      expect(tokenResult).toBeDefined();

      // 3. Role hierarchy validation
      const roleResult = await roleValidator.validateRole(tokenResult.role, 'MASTER_ADMIN');
      expect(roleResult.valid).toBe(false);

      // 4. Privilege escalation detection
      const escalationResult = await escalationDetector.detectEscalation({
        sessionId: req.headers['x-session-id'],
        currentRole: tokenResult.role,
        requestedRole: 'MASTER_ADMIN',
        userId: tokenResult.userId
      });
      expect(escalationResult.detected).toBe(true);

      // 5. Audit logging
      await auditLogger.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        userId: tokenResult.userId,
        endpoint: req.url,
        blocked: true
      });

      // 6. Final response
      const finalResult = await authMiddleware.validateMasterAdminAccess(req, res);
      expect(finalResult.allowed).toBe(false);
      expect(res.statusCode).toBe(403);
    });
  });
});