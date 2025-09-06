/**
 * SQL Injection 보안 테스트 스위트
 * 다양한 SQL Injection 공격 시나리오를 테스트하여 시스템의 보안성 검증
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  InputValidator,
  SQLInjectionDetector, 
  QuerySanitizer,
  DatabaseAccessLogger,
  WhitelistValidator
} from '@/lib/security/sql-injection-prevention';

describe('SQL Injection Prevention System', () => {
  
  describe('SQLInjectionDetector', () => {
    let detector: SQLInjectionDetector;

    beforeEach(() => {
      detector = new SQLInjectionDetector();
    });

    describe('Classic SQL Injection Patterns', () => {
      it('should detect DROP TABLE injection', () => {
        const maliciousInputs = [
          "'; DROP TABLE users; --",
          "1'; DROP TABLE organizations; --",
          "admin'; DROP DATABASE attendance; --",
          "'; DROP TABLE user_roles; SELECT * FROM users WHERE '1'='1"
        ];

        maliciousInputs.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
          expect(result.attackType).toContain('DROP_TABLE');
          expect(result.confidence).toBeGreaterThan(0.9);
        });
      });

      it('should detect UNION SELECT injection', () => {
        const maliciousInputs = [
          "' UNION SELECT * FROM sensitive_data --",
          "1 UNION SELECT password FROM users",
          "' UNION ALL SELECT null, null, null FROM credit_cards --",
          "admin' UNION SELECT 1,2,3,4,5 FROM information_schema.tables --"
        ];

        maliciousInputs.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
          expect(result.attackType).toContain('UNION_INJECTION');
        });
      });

      it('should detect UPDATE injection attempts', () => {
        const maliciousInputs = [
          "'; UPDATE users SET role='MASTER_ADMIN' WHERE email='hacker@evil.com'; --",
          "admin'; UPDATE organizations SET status='ACTIVE'; --",
          "1'; UPDATE user_roles SET role='ADMIN' WHERE user_id='123'; --"
        ];

        maliciousInputs.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
          expect(result.attackType).toContain('UPDATE_INJECTION');
        });
      });

      it('should detect DELETE injection attempts', () => {
        const maliciousInputs = [
          "'; DELETE FROM audit_logs; --",
          "1 OR 1=1; DELETE FROM users WHERE 1=1; --",
          "admin'; DELETE FROM sessions; --"
        ];

        maliciousInputs.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
          expect(result.attackType).toContain('DELETE_INJECTION');
        });
      });
    });

    describe('Advanced SQL Injection Techniques', () => {
      it('should detect Blind SQL Injection', () => {
        const blindSQLInputs = [
          "admin' AND 1=1 --",
          "admin' AND 1=2 --",
          "1' AND (SELECT COUNT(*) FROM users) > 0 --",
          "' OR '1'='1",
          "admin' AND SUBSTRING((SELECT password FROM users LIMIT 1),1,1)='a' --"
        ];

        blindSQLInputs.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
          expect(result.attackType).toContain('BLIND_INJECTION');
        });
      });

      it('should detect Time-based SQL Injection', () => {
        const timeBased = [
          "admin' AND SLEEP(5) --",
          "1' AND (SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END) --",
          "'; WAITFOR DELAY '00:00:05' --",
          "admin' AND BENCHMARK(5000000,MD5('test')) --"
        ];

        timeBased.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
          expect(result.attackType).toContain('TIME_BASED_INJECTION');
        });
      });

      it('should detect Boolean-based SQL Injection', () => {
        const booleanBased = [
          "admin' AND 1=1 #",
          "admin' AND 1=0 #",
          "' OR 'a'='a",
          "' OR 'a'='b",
          "1' AND ASCII(SUBSTRING((SELECT database()),1,1))>64 --"
        ];

        booleanBased.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
          expect(['BOOLEAN_INJECTION', 'BLIND_INJECTION']).toContain(
            result.attackType[0]
          );
        });
      });

      it('should detect Stacked Queries injection', () => {
        const stackedQueries = [
          "1'; INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'ADMIN'); --",
          "admin'; CREATE TABLE evil (data TEXT); --",
          "'; EXEC xp_cmdshell('net user hacker password /add'); --"
        ];

        stackedQueries.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
          expect(result.attackType).toContain('STACKED_QUERIES');
        });
      });
    });

    describe('Obfuscation and Evasion Techniques', () => {
      it('should detect hex-encoded injection', () => {
        const hexEncoded = [
          "0x27204F52202731273D2731", // ' OR '1'='1 in hex
          "CHAR(39)+CHAR(32)+CHAR(79)+CHAR(82)+CHAR(32)+CHAR(39)+CHAR(49)",
          "0x'; DROP TABLE users; --"
        ];

        hexEncoded.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
          expect(result.attackType).toContain('ENCODED_INJECTION');
        });
      });

      it('should detect comment-based evasion', () => {
        const commentEvasion = [
          "ad/*comment*/min' OR 1=1 --",
          "'; /*comment*/ DROP /*another*/ TABLE users; --",
          "UN/**/ION SEL/**/ECT * FROM users"
        ];

        commentEvasion.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
          expect(result.confidence).toBeGreaterThan(0.7);
        });
      });

      it('should detect case variation attacks', () => {
        const caseVariation = [
          "'; DrOp TaBlE users; --",
          "' UnIoN SeLeCt * FrOm users --",
          "aDmIn' OR '1'='1"
        ];

        caseVariation.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
        });
      });

      it('should detect whitespace manipulation', () => {
        const whitespaceAttacks = [
          "'     OR    '1'='1",
          "'\tOR\t'1'='1",
          "'\nUNION\nSELECT\n*\nFROM\nusers"
        ];

        whitespaceAttacks.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(true);
        });
      });
    });

    describe('Safe Input Detection', () => {
      it('should allow legitimate search queries', () => {
        const safeInputs = [
          "john.doe@example.com",
          "John O'Brien", // Legitimate apostrophe in name
          "123-456-7890",
          "Search for user's data",
          "Employee-123",
          "user@company.org"
        ];

        safeInputs.forEach(input => {
          const result = detector.detect(input);
          expect(result.isMalicious).toBe(false);
          expect(result.confidence).toBeLessThan(0.3);
        });
      });
    });
  });

  describe('InputValidator', () => {
    let validator: InputValidator;

    beforeEach(() => {
      validator = new InputValidator();
    });

    describe('Email Validation', () => {
      it('should validate safe email addresses', () => {
        const validEmails = [
          'user@example.com',
          'john.doe@company.org',
          'admin+test@service.io'
        ];

        validEmails.forEach(email => {
          const result = validator.validateEmail(email);
          expect(result.isValid).toBe(true);
          expect(result.sanitized).toBe(email);
        });
      });

      it('should reject emails with SQL injection', () => {
        const maliciousEmails = [
          "admin'@example.com",
          "user@example.com'; DROP TABLE users; --",
          "test@test.com' OR '1'='1"
        ];

        maliciousEmails.forEach(email => {
          const result = validator.validateEmail(email);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('SQL_INJECTION_DETECTED');
        });
      });
    });

    describe('UUID Validation', () => {
      it('should validate proper UUIDs', () => {
        const validUUIDs = [
          '123e4567-e89b-12d3-a456-426614174000',
          '550e8400-e29b-41d4-a716-446655440000'
        ];

        validUUIDs.forEach(uuid => {
          const result = validator.validateUUID(uuid);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject malformed UUIDs with injection', () => {
        const maliciousUUIDs = [
          "123e4567-e89b-12d3-a456-426614174000' OR '1'='1",
          "'; DROP TABLE users; --",
          "550e8400-e29b-41d4-a716-446655440000 UNION SELECT * FROM users"
        ];

        maliciousUUIDs.forEach(uuid => {
          const result = validator.validateUUID(uuid);
          expect(result.isValid).toBe(false);
        });
      });
    });

    describe('Search Query Validation', () => {
      it('should sanitize search queries', () => {
        const searchQueries = [
          { input: "John's Company", expected: "John''s Company" },
          { input: "test'; DROP TABLE", expected: "test'''' DROP TABLE" },
          { input: "normal search", expected: "normal search" }
        ];

        searchQueries.forEach(({ input, expected }) => {
          const result = validator.validateSearchQuery(input);
          expect(result.sanitized).toBe(expected);
        });
      });

      it('should limit search query length', () => {
        const longQuery = 'a'.repeat(1000);
        const result = validator.validateSearchQuery(longQuery);
        expect(result.sanitized.length).toBeLessThanOrEqual(255);
      });
    });

    describe('Role Validation', () => {
      it('should only allow whitelisted roles', () => {
        const validRoles = ['EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'];
        
        validRoles.forEach(role => {
          const result = validator.validateRole(role);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid or injected roles', () => {
        const invalidRoles = [
          "ADMIN'; DROP TABLE users; --",
          "SUPER_ADMIN",
          "'; UPDATE users SET role='ADMIN",
          "EMPLOYEE OR 1=1"
        ];

        invalidRoles.forEach(role => {
          const result = validator.validateRole(role);
          expect(result.isValid).toBe(false);
        });
      });
    });

    describe('Date Validation', () => {
      it('should validate ISO date strings', () => {
        const validDates = [
          '2024-01-01',
          '2024-12-31T23:59:59Z',
          '2024-06-15T12:00:00.000Z'
        ];

        validDates.forEach(date => {
          const result = validator.validateDate(date);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject dates with injection attempts', () => {
        const maliciousDates = [
          "2024-01-01'; DROP TABLE users; --",
          "'; DELETE FROM audit_logs WHERE date < '2024-01-01",
          "2024-01-01' OR '1'='1"
        ];

        maliciousDates.forEach(date => {
          const result = validator.validateDate(date);
          expect(result.isValid).toBe(false);
        });
      });
    });
  });

  describe('QuerySanitizer', () => {
    let sanitizer: QuerySanitizer;

    beforeEach(() => {
      sanitizer = new QuerySanitizer();
    });

    it('should escape single quotes properly', () => {
      const input = "O'Brien's Company";
      const sanitized = sanitizer.escapeString(input);
      expect(sanitized).toBe("O''Brien''s Company");
    });

    it('should remove SQL comments', () => {
      const inputs = [
        { input: "value -- comment", expected: "value" },
        { input: "value /* comment */", expected: "value" },
        { input: "value # comment", expected: "value" }
      ];

      inputs.forEach(({ input, expected }) => {
        const result = sanitizer.removeComments(input);
        expect(result.trim()).toBe(expected);
      });
    });

    it('should parameterize queries', () => {
      const query = "SELECT * FROM users WHERE email = ? AND role = ?";
      const params = ["user@example.com", "ADMIN"];
      
      const result = sanitizer.parameterize(query, params);
      expect(result.query).toBe(query);
      expect(result.params).toEqual(params);
      expect(result.isSafe).toBe(true);
    });

    it('should reject non-parameterized queries with user input', () => {
      const query = "SELECT * FROM users WHERE email = 'user@example.com'";
      const result = sanitizer.validateQuery(query);
      expect(result.isSafe).toBe(false);
      expect(result.warnings).toContain('NON_PARAMETERIZED_QUERY');
    });
  });

  describe('WhitelistValidator', () => {
    let validator: WhitelistValidator;

    beforeEach(() => {
      validator = new WhitelistValidator({
        roles: ['EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'],
        statuses: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
        sortFields: ['name', 'email', 'created_at', 'updated_at'],
        sortOrders: ['asc', 'desc']
      });
    });

    it('should validate against whitelist', () => {
      expect(validator.validate('role', 'ADMIN')).toBe(true);
      expect(validator.validate('role', 'SUPER_USER')).toBe(false);
      expect(validator.validate('status', 'ACTIVE')).toBe(true);
      expect(validator.validate('status', 'DELETED')).toBe(false);
    });

    it('should validate complex filter objects', () => {
      const validFilter = {
        role: 'ADMIN',
        status: 'ACTIVE',
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const result = validator.validateFilters(validFilter);
      expect(result.isValid).toBe(true);
    });

    it('should reject filters with invalid values', () => {
      const invalidFilter = {
        role: "ADMIN'; DROP TABLE users; --",
        status: 'ACTIVE',
        sortBy: 'password'
      };

      const result = validator.validateFilters(invalidFilter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('INVALID_ROLE');
      expect(result.errors).toContain('INVALID_SORT_FIELD');
    });
  });

  describe('DatabaseAccessLogger', () => {
    let logger: DatabaseAccessLogger;

    beforeEach(() => {
      logger = new DatabaseAccessLogger();
    });

    it('should log suspicious query attempts', async () => {
      const suspiciousQuery = {
        query: "SELECT * FROM users WHERE email = '; DROP TABLE users; --'",
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        timestamp: new Date()
      };

      const logEntry = await logger.logSuspiciousActivity(suspiciousQuery);
      expect(logEntry.severity).toBe('CRITICAL');
      expect(logEntry.blocked).toBe(true);
      expect(logEntry.attackType).toContain('DROP_TABLE');
    });

    it('should track query patterns for anomaly detection', async () => {
      const userId = 'user-123';
      
      // Simulate normal queries
      for (let i = 0; i < 10; i++) {
        await logger.trackQuery({
          userId,
          query: 'SELECT * FROM users WHERE id = ?',
          duration: 50 + Math.random() * 50
        });
      }

      // Simulate anomalous query
      const anomaly = await logger.detectAnomaly({
        userId,
        query: 'SELECT * FROM credit_cards',
        duration: 5000
      });

      expect(anomaly.isAnomalous).toBe(true);
      expect(anomaly.reasons).toContain('UNUSUAL_TABLE_ACCESS');
      expect(anomaly.reasons).toContain('SLOW_QUERY');
    });

    it('should generate security reports', async () => {
      const report = await logger.generateSecurityReport({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
      });

      expect(report).toHaveProperty('totalQueries');
      expect(report).toHaveProperty('blockedAttempts');
      expect(report).toHaveProperty('topAttackTypes');
      expect(report).toHaveProperty('suspiciousUsers');
    });
  });

  describe('Integration Tests', () => {
    it('should prevent SQL injection in user search API', async () => {
      const maliciousSearches = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM passwords"
      ];

      for (const search of maliciousSearches) {
        const response = await fetch('/api/master-admin/users?search=' + encodeURIComponent(search));
        
        // Should either block the request or sanitize it
        expect(response.status).toBeOneOf([400, 403]);
        
        if (response.status === 200) {
          const data = await response.json();
          // Ensure no sensitive data leaked
          expect(data.users).not.toContainEqual(
            expect.objectContaining({ password: expect.anything() })
          );
        }
      }
    });

    it('should log and alert on repeated injection attempts', async () => {
      const attackerIp = '192.168.1.100';
      const logger = new DatabaseAccessLogger();
      
      // Simulate multiple injection attempts
      for (let i = 0; i < 5; i++) {
        await logger.logSuspiciousActivity({
          query: `'; DROP TABLE users_${i}; --`,
          ipAddress: attackerIp,
          userId: null,
          timestamp: new Date()
        });
      }

      const threatLevel = await logger.assessThreatLevel(attackerIp);
      expect(threatLevel).toBe('HIGH');
      
      const shouldBlock = await logger.shouldBlockIp(attackerIp);
      expect(shouldBlock).toBe(true);
    });
  });
});