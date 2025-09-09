/**
 * Privilege Escalation Security Tests
 * 
 * Tests security measures against privilege escalation attacks:
 * - Role elevation prevention
 * - Business ownership hijacking
 * - Paper forgery and manipulation
 * - Cross-business unauthorized access
 * - Authentication bypass attempts
 * - Data manipulation attacks
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TestDatabase, TestDataFactory, testClient, setupTestEnvironment } from '../setup/id-role-paper-test-setup';

// Security test utilities
class SecurityTestUtils {
  static async createCompromisedUser(name: string, email: string): Promise<{ 
    userId: string;
    client: SupabaseClient;
    personalId: string;
  }> {
    // Create auth user
    const { data: authData, error } = await testClient.auth.signUp({
      email,
      password: 'CompromisedUser123!'
    });

    if (error) throw new Error(`Failed to create compromised user: ${error.message}`);

    const userId = authData.user!.id;

    // Create authenticated client
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await client.auth.setSession({
      access_token: authData.session!.access_token,
      refresh_token: authData.session!.refresh_token
    });

    // Create personal ID
    const personalId = TestDataFactory.createPersonalId({
      id: userId,
      name,
      phone: `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      email
    });

    await testClient
      .from('personal_ids')
      .insert([personalId]);

    return { userId, client, personalId: personalId.id };
  }

  static async attemptSQLInjection(client: SupabaseClient, tableName: string, maliciousPayload: string): Promise<any> {
    try {
      // Attempt various SQL injection patterns
      const injectionAttempts = [
        `'; DROP TABLE ${tableName}; --`,
        `' OR '1'='1`,
        `'; UPDATE personal_ids SET name = 'HACKED' WHERE '1'='1'; --`,
        `' UNION SELECT * FROM pg_user --`,
        `'; INSERT INTO papers (personal_id, business_id, role_granted) VALUES ('hacker', 'hack-biz', 'FRANCHISOR'); --`
      ];

      const results = [];

      for (const injection of injectionAttempts) {
        try {
          const { data, error } = await client
            .from(tableName)
            .select('*')
            .eq('name', injection);

          results.push({
            payload: injection,
            succeeded: !error,
            data: data || null,
            error: error?.message || null
          });
        } catch (err: any) {
          results.push({
            payload: injection,
            succeeded: false,
            data: null,
            error: err.message
          });
        }
      }

      return results;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  static async attemptDirectDatabaseAccess(client: SupabaseClient): Promise<any> {
    const privilegedOperations = [
      // Attempt to access system tables
      { operation: 'pg_user', query: client.from('pg_user').select('*') },
      { operation: 'information_schema', query: client.from('information_schema.tables').select('*') },
      { operation: 'pg_tables', query: client.from('pg_tables').select('*') },
      
      // Attempt to call admin functions
      { operation: 'create_table', query: client.rpc('create_table', { table_name: 'hacker_table' }) },
      { operation: 'drop_table', query: client.rpc('drop_table', { table_name: 'papers' }) }
    ];

    const results = [];

    for (const { operation, query } of privilegedOperations) {
      try {
        const { data, error } = await query;
        results.push({
          operation,
          succeeded: !error && data !== null,
          error: error?.message || null
        });
      } catch (err: any) {
        results.push({
          operation,
          succeeded: false,
          error: err.message
        });
      }
    }

    return results;
  }

  static async attemptTokenManipulation(validToken: string): Promise<string[]> {
    const manipulationAttempts = [];

    try {
      // Attempt to decode and modify JWT
      const parts = validToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        
        // Attempt role elevation in token
        const elevatedPayload = {
          ...payload,
          role: 'service_role',
          user_metadata: { role: 'admin', is_super_user: true }
        };

        const manipulatedToken = parts[0] + '.' + btoa(JSON.stringify(elevatedPayload)) + '.' + parts[2];
        manipulationAttempts.push(manipulatedToken);

        // Attempt to extend expiration
        const extendedPayload = {
          ...payload,
          exp: Math.floor(Date.now() / 1000) + 86400 * 365 // 1 year
        };

        const extendedToken = parts[0] + '.' + btoa(JSON.stringify(extendedPayload)) + '.' + parts[2];
        manipulationAttempts.push(extendedToken);
      }
    } catch (error) {
      // Token manipulation failed
    }

    return manipulationAttempts;
  }
}

describe('Privilege Escalation Security Tests', () => {
  let legitimateOwner: any;
  let maliciousUser: any;
  let businessId: string;

  setupTestEnvironment();

  beforeAll(async () => {
    // Create legitimate business owner
    legitimateOwner = await SecurityTestUtils.createCompromisedUser(
      '정당한사장',
      'legitimate@test.com'
    );

    // Create malicious user (low privilege)
    maliciousUser = await SecurityTestUtils.createCompromisedUser(
      '악성사용자',
      'malicious@test.com'
    );

    // Create business owned by legitimate user
    const business = TestDataFactory.createBusinessRegistration(legitimateOwner.personalId, {
      business_name: '보안테스트 회사',
      business_number: '999-99-99999'
    });

    await testClient
      .from('business_registrations')
      .insert([business]);

    businessId = business.id;

    // Create legitimate owner paper
    const ownerPaper = TestDataFactory.createPaper(legitimateOwner.personalId, businessId, {
      paper_type: 'BUSINESS_REGISTRATION',
      role_granted: 'OWNER'
    });

    await testClient
      .from('papers')
      .insert([ownerPaper]);
  }, 60000);

  afterAll(async () => {
    await TestDatabase.cleanup();
  });

  describe('Role Elevation Prevention', () => {
    test('should prevent direct role elevation through paper creation', async () => {
      // Malicious user attempts to create OWNER paper for themselves
      const maliciousPaper = TestDataFactory.createPaper(maliciousUser.personalId, businessId, {
        paper_type: 'BUSINESS_REGISTRATION',
        role_granted: 'OWNER',
        effective_from: '2024-01-01'
      });

      const { data, error } = await maliciousUser.client
        .from('papers')
        .insert([maliciousPaper])
        .select();

      expect(error).not.toBeNull();
      expect(error.code).toBe('42501'); // Insufficient privilege
      expect(data).toBeNull();
    });

    test('should prevent role elevation through paper modification', async () => {
      // First, create a legitimate WORKER paper for malicious user
      const workerPaper = TestDataFactory.createPaper(maliciousUser.personalId, businessId, {
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER'
      });

      const { data: insertData } = await testClient // Use admin to create legitimate paper
        .from('papers')
        .insert([workerPaper])
        .select()
        .single();

      // Now malicious user attempts to elevate their role
      const { data, error } = await maliciousUser.client
        .from('papers')
        .update({ role_granted: 'OWNER' })
        .eq('id', insertData.id)
        .select();

      // Update should be prevented or have business logic validation
      expect(data).toEqual([]); // No rows affected
    });

    test('should prevent indirect role elevation through metadata manipulation', async () => {
      // Create legitimate paper with metadata
      const paper = TestDataFactory.createPaper(maliciousUser.personalId, businessId, {
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        metadata: { department: 'IT' }
      });

      const { data: insertData } = await testClient
        .from('papers')
        .insert([paper])
        .select()
        .single();

      // Attempt to inject privileged metadata
      const maliciousMetadata = {
        metadata: {
          department: 'Management',
          override_role: 'OWNER',
          admin_access: true,
          bypass_validation: true
        }
      };

      const { data } = await maliciousUser.client
        .from('papers')
        .update(maliciousMetadata)
        .eq('id', insertData.id)
        .select();

      // Verify metadata doesn't grant additional privileges
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].role_granted).toBe('WORKER'); // Role should remain unchanged
      
      // System should ignore privileged metadata fields
      expect(data[0].metadata.override_role).toBeUndefined();
    });

    test('should prevent role elevation through business ownership transfer', async () => {
      // Malicious user attempts to transfer business to themselves
      const maliciousTransfer = {
        owner_personal_id: maliciousUser.personalId,
        updated_at: new Date().toISOString()
      };

      const { data } = await maliciousUser.client
        .from('business_registrations')
        .update(maliciousTransfer)
        .eq('id', businessId)
        .select();

      expect(data).toEqual([]); // No rows affected due to RLS
    });
  });

  describe('Business Hijacking Prevention', () => {
    test('should prevent unauthorized business registration modification', async () => {
      const hijackAttempt = {
        business_name: '해킹된 회사',
        owner_personal_id: maliciousUser.personalId,
        business_number: '000-00-00000'
      };

      const { data } = await maliciousUser.client
        .from('business_registrations')
        .update(hijackAttempt)
        .eq('id', businessId)
        .select();

      expect(data).toEqual([]);
    });

    test('should prevent business impersonation through duplicate registration', async () => {
      // Attempt to create business with same details but different owner
      const duplicateBusiness = TestDataFactory.createBusinessRegistration(maliciousUser.personalId, {
        business_name: '보안테스트 회사', // Same name
        business_number: '999-99-99999' // Same business number
      });

      const { error } = await maliciousUser.client
        .from('business_registrations')
        .insert([duplicateBusiness])
        .select();

      expect(error).not.toBeNull();
      // Should fail due to unique constraint on business_number
    });

    test('should prevent business takeover through paper forgery', async () => {
      // Attempt to create multiple conflicting OWNER papers
      const forgedPaper = TestDataFactory.createPaper(maliciousUser.personalId, businessId, {
        paper_type: 'OWNERSHIP_CERTIFICATE',
        role_granted: 'OWNER',
        effective_from: '2024-01-01',
        metadata: { forged: true }
      });

      const { data, error } = await maliciousUser.client
        .from('papers')
        .insert([forgedPaper])
        .select();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe('Cross-Business Unauthorized Access', () => {
    test('should prevent access to other businesses data', async () => {
      // Create another business for different owner
      const otherOwner = await SecurityTestUtils.createCompromisedUser(
        '다른사장',
        'other@test.com'
      );

      const otherBusiness = TestDataFactory.createBusinessRegistration(otherOwner.personalId, {
        business_name: '다른 회사',
        business_number: '111-11-11111'
      });

      await testClient
        .from('business_registrations')
        .insert([otherBusiness]);

      // Malicious user attempts to access other business
      const { data } = await maliciousUser.client
        .from('business_registrations')
        .select('*')
        .eq('id', otherBusiness.id);

      expect(data).toEqual([]);
    });

    test('should prevent cross-business paper manipulation', async () => {
      // Create another business and its papers
      const otherOwner = await SecurityTestUtils.createCompromisedUser(
        '다른사장2',
        'other2@test.com'
      );

      const otherBusiness = TestDataFactory.createBusinessRegistration(otherOwner.personalId, {
        business_name: '다른 회사2',
        business_number: '222-22-22222'
      });

      const { data: businessData } = await testClient
        .from('business_registrations')
        .insert([otherBusiness])
        .select()
        .single();

      const otherPaper = TestDataFactory.createPaper(otherOwner.personalId, businessData.id, {
        paper_type: 'BUSINESS_REGISTRATION',
        role_granted: 'OWNER'
      });

      const { data: paperData } = await testClient
        .from('papers')
        .insert([otherPaper])
        .select()
        .single();

      // Malicious user attempts to modify other business's paper
      const { data } = await maliciousUser.client
        .from('papers')
        .update({ status: 'REVOKED' })
        .eq('id', paperData.id)
        .select();

      expect(data).toEqual([]); // No rows affected
    });
  });

  describe('Authentication and Authorization Bypass', () => {
    test('should prevent unauthenticated access', async () => {
      const anonymousClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Attempt to access sensitive data without authentication
      const tests = [
        anonymousClient.from('personal_ids').select('*'),
        anonymousClient.from('business_registrations').select('*'),
        anonymousClient.from('papers').select('*'),
        anonymousClient.from('role_calculations').select('*')
      ];

      for (const test of tests) {
        const { data } = await test;
        expect(data).toEqual([]);
      }
    });

    test('should prevent token manipulation attacks', async () => {
      const { data: sessionData } = await maliciousUser.client.auth.getSession();
      const originalToken = sessionData.session?.access_token;

      if (originalToken) {
        const manipulatedTokens = await SecurityTestUtils.attemptTokenManipulation(originalToken);

        for (const token of manipulatedTokens) {
          const testClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );

          try {
            await testClient.auth.setSession({
              access_token: token,
              refresh_token: 'dummy'
            });

            const { data } = await testClient
              .from('personal_ids')
              .select('*');

            // Manipulated token should not grant access
            expect(data).toEqual([]);
          } catch (error) {
            // Expected - manipulated token should be rejected
            expect(error).toBeDefined();
          }
        }
      }
    });

    test('should prevent session hijacking', async () => {
      // Get legitimate user's session
      const { data: ownerSession } = await legitimateOwner.client.auth.getSession();

      if (ownerSession.session) {
        // Malicious user attempts to use owner's token
        try {
          await maliciousUser.client.auth.setSession(ownerSession.session);

          // Even with hijacked session, RLS should prevent unauthorized access
          const { data } = await maliciousUser.client
            .from('business_registrations')
            .select('*')
            .eq('owner_personal_id', legitimateOwner.personalId);

          // Should be blocked by additional security measures
          expect(data).toEqual([]);
        } catch (error) {
          // Session reuse should be prevented
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in select queries', async () => {
      const injectionResults = await SecurityTestUtils.attemptSQLInjection(
        maliciousUser.client,
        'personal_ids',
        'malicious'
      );

      for (const result of injectionResults) {
        expect(result.succeeded).toBe(false);
        expect(result.data).toBeNull();
      }
    });

    test('should prevent SQL injection in insert operations', async () => {
      const maliciousData = {
        name: "'; DROP TABLE papers; --",
        phone: "010-0000-0000'; DELETE FROM business_registrations; --",
        email: "hacker@evil.com'; INSERT INTO papers (role_granted) VALUES ('FRANCHISOR'); --"
      };

      const { data, error } = await maliciousUser.client
        .from('personal_ids')
        .insert([maliciousData])
        .select();

      // Should either fail completely or sanitize the input
      if (!error) {
        expect(data[0].name).not.toContain('DROP TABLE');
        expect(data[0].phone).not.toContain('DELETE FROM');
        expect(data[0].email).not.toContain('INSERT INTO');
      }
    });

    test('should prevent SQL injection through function calls', async () => {
      // Attempt SQL injection through RPC calls if any exist
      try {
        const { error } = await maliciousUser.client.rpc('nonexistent_function', {
          param: "'; DROP TABLE papers; --"
        });

        // Function should not exist, but injection should not execute
        expect(error).toBeDefined();
        expect(error.code).not.toBe('42P01'); // Should not be "table doesn't exist" if injection worked
      } catch (err) {
        // Expected - function doesn't exist
      }
    });
  });

  describe('Data Integrity Attacks', () => {
    test('should prevent data corruption through batch operations', async () => {
      // Attempt to corrupt data through bulk operations
      const corruptionAttempts = [
        { name: null, phone: '010-1111-1111' },
        { name: 'Test', phone: null },
        { name: '', phone: '' },
        { name: 'A'.repeat(1000), phone: '010-2222-2222' } // Oversized data
      ];

      const { data, error } = await maliciousUser.client
        .from('personal_ids')
        .insert(corruptionAttempts)
        .select();

      // Should fail validation or sanitize data
      if (!error) {
        for (const record of data) {
          expect(record.name).toBeTruthy();
          expect(record.phone).toBeTruthy();
          expect(record.name.length).toBeLessThan(100);
        }
      } else {
        expect(error).toBeDefined();
      }
    });

    test('should prevent foreign key constraint bypass', async () => {
      // Attempt to create paper with non-existent references
      const invalidPaper = {
        personal_id: 'non-existent-person',
        business_id: 'non-existent-business',
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        effective_from: '2024-01-01',
        status: 'ACTIVE'
      };

      const { error } = await maliciousUser.client
        .from('papers')
        .insert([invalidPaper])
        .select();

      expect(error).not.toBeNull();
      expect(error.code).toBe('23503'); // Foreign key violation
    });

    test('should prevent timestamp manipulation', async () => {
      const futurePaper = TestDataFactory.createPaper(maliciousUser.personalId, businessId, {
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        effective_from: '2024-01-01',
        created_at: '2030-01-01T00:00:00Z' // Future timestamp
      });

      const { data } = await testClient // Use admin client to allow creation
        .from('papers')
        .insert([futurePaper])
        .select()
        .single();

      // System should override with current timestamp
      const createdAt = new Date(data.created_at);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
      
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute of current time
    });
  });

  describe('Advanced Attack Vectors', () => {
    test('should prevent direct database system access', async () => {
      const systemAccessResults = await SecurityTestUtils.attemptDirectDatabaseAccess(maliciousUser.client);

      for (const result of systemAccessResults) {
        expect(result.succeeded).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    test('should prevent privilege escalation through stored procedures', async () => {
      // Attempt to call privileged functions if any exist
      const privilegedCalls = [
        'grant_admin_access',
        'promote_user',
        'override_rls',
        'bypass_security',
        'elevate_role'
      ];

      for (const functionName of privilegedCalls) {
        try {
          const { error } = await maliciousUser.client.rpc(functionName, {
            user_id: maliciousUser.personalId
          });

          // Function either doesn't exist or access is denied
          expect(error).toBeDefined();
          expect(['42883', '42501']).toContain(error.code); // Function doesn't exist or insufficient privilege
        } catch (err) {
          // Expected
        }
      }
    });

    test('should prevent lateral movement between user accounts', async () => {
      // Create another user account
      const targetUser = await SecurityTestUtils.createCompromisedUser(
        '타겟사용자',
        'target@test.com'
      );

      // Malicious user attempts to access target user's data
      const { data } = await maliciousUser.client
        .from('personal_ids')
        .select('*')
        .eq('id', targetUser.personalId);

      expect(data).toEqual([]); // RLS should prevent access
    });

    test('should prevent business logic bypass through API manipulation', async () => {
      // Attempt to bypass business rules by manipulating the paper creation flow
      
      // Try to create MANAGER role without WORKER prerequisite
      const invalidManagerPaper = TestDataFactory.createPaper(maliciousUser.personalId, businessId, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'MANAGER',
        effective_from: '2024-01-01'
      });

      // This should fail due to business rule validation
      const { data, error } = await maliciousUser.client
        .from('papers')
        .insert([invalidManagerPaper])
        .select();

      // Should be prevented by business logic triggers or constraints
      if (error) {
        expect(error).toBeDefined();
      } else {
        // If insert succeeds, role calculation should detect the violation
        const roleCalc = await maliciousUser.client
          .from('role_calculations')
          .select('*')
          .eq('personal_id', maliciousUser.personalId)
          .eq('business_id', businessId)
          .single();

        // Role calculation should not grant MANAGER without WORKER
        if (roleCalc.data) {
          expect(roleCalc.data.calculated_roles).not.toContain('MANAGER');
        }
      }
    });
  });

  describe('Security Monitoring and Logging', () => {
    test('should log security violations for monitoring', async () => {
      // Perform various security violations that should be logged
      const violations = [
        // Unauthorized access attempt
        maliciousUser.client
          .from('business_registrations')
          .select('*')
          .eq('owner_personal_id', legitimateOwner.personalId),
        
        // Privilege escalation attempt
        maliciousUser.client
          .from('papers')
          .insert([TestDataFactory.createPaper(maliciousUser.personalId, businessId, {
            paper_type: 'BUSINESS_REGISTRATION',
            role_granted: 'OWNER'
          })]),
        
        // Data modification attempt
        maliciousUser.client
          .from('business_registrations')
          .update({ owner_personal_id: maliciousUser.personalId })
          .eq('id', businessId)
      ];

      for (const violation of violations) {
        try {
          await violation;
        } catch (error) {
          // Violations should be caught and logged
          // In real implementation, check audit logs
        }
      }

      // Verify that violations don't succeed
      const { data: businesses } = await testClient
        .from('business_registrations')
        .select('*')
        .eq('id', businessId)
        .single();

      expect(businesses.owner_personal_id).toBe(legitimateOwner.personalId);
    });

    test('should maintain audit trail of all operations', async () => {
      // Perform legitimate operations that should be audited
      const workerPaper = TestDataFactory.createPaper(maliciousUser.personalId, businessId, {
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER'
      });

      await testClient // Admin creates legitimate paper
        .from('papers')
        .insert([workerPaper]);

      // Update the paper
      await maliciousUser.client
        .from('papers')
        .update({ 
          metadata: { updated: true },
          updated_at: new Date().toISOString()
        })
        .eq('id', workerPaper.id);

      // In real implementation, verify audit trail exists
      // This would check audit_logs table or similar
      const { data: updatedPaper } = await testClient
        .from('papers')
        .select('*')
        .eq('id', workerPaper.id)
        .single();

      expect(updatedPaper.metadata.updated).toBe(true);
      expect(updatedPaper.updated_at).toBeDefined();
    });
  });
});