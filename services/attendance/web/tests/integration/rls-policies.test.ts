/**
 * Row Level Security (RLS) Policies Integration Tests
 * 
 * Tests comprehensive RLS policies for ID-ROLE-PAPER architecture:
 * - Business context isolation
 * - Role-based data access control
 * - Cross-business access restrictions
 * - Personal data privacy protection
 * - Paper access restrictions
 * - Real Supabase RLS policy enforcement
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TestDatabase, TestDataFactory, testClient, setupTestEnvironment } from '../setup/id-role-paper-test-setup';

// Auth user simulation
class AuthUserSimulator {
  private static authUsers: Map<string, any> = new Map();

  static async createTestUser(email: string, password: string = 'TestPassword123!'): Promise<{ user: any; session: any }> {
    const { data, error } = await testClient.auth.signUp({
      email,
      password
    });

    if (error) throw new Error(`Failed to create test user: ${error.message}`);

    const user = data.user!;
    const session = data.session!;

    this.authUsers.set(user.id, { user, session });
    return { user, session };
  }

  static async signInUser(email: string, password: string = 'TestPassword123!'): Promise<SupabaseClient> {
    const { data, error } = await testClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw new Error(`Failed to sign in user: ${error.message}`);

    // Create new client with user session
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    );

    await userClient.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

    return userClient;
  }

  static async signOut(): Promise<void> {
    await testClient.auth.signOut();
  }

  static async cleanupTestUsers(): Promise<void> {
    for (const [userId] of this.authUsers) {
      try {
        // In real implementation, would delete user from auth.users
        // For testing, we just clear our tracking
      } catch (error) {
        console.warn(`Failed to cleanup user ${userId}:`, error);
      }
    }
    this.authUsers.clear();
  }
}

describe('RLS Policies Integration Tests', () => {
  let ownerUser: any, ownerClient: SupabaseClient;
  let workerUser: any, workerClient: SupabaseClient;
  let outsiderUser: any, outsiderClient: SupabaseClient;
  
  let ownerId: string, workerId: string, outsiderId: string;
  let businessId: string, otherBusinessId: string;

  setupTestEnvironment();

  beforeAll(async () => {
    // Create test users and their identities
    const owner = await AuthUserSimulator.createTestUser('owner@test.com');
    const worker = await AuthUserSimulator.createTestUser('worker@test.com');
    const outsider = await AuthUserSimulator.createTestUser('outsider@test.com');

    ownerUser = owner.user;
    workerUser = worker.user;
    outsiderUser = outsider.user;

    // Create authenticated clients
    ownerClient = await AuthUserSimulator.signInUser('owner@test.com');
    workerClient = await AuthUserSimulator.signInUser('worker@test.com');
    outsiderClient = await AuthUserSimulator.signInUser('outsider@test.com');

    // Create personal IDs linked to auth users
    const ownerPersonal = TestDataFactory.createPersonalId({
      id: ownerUser.id, // Link to auth user
      name: '김사장',
      phone: '010-1111-1111',
      email: 'owner@test.com'
    });

    const workerPersonal = TestDataFactory.createPersonalId({
      id: workerUser.id,
      name: '김직원',
      phone: '010-2222-2222',
      email: 'worker@test.com'
    });

    const outsiderPersonal = TestDataFactory.createPersonalId({
      id: outsiderUser.id,
      name: '김외부인',
      phone: '010-3333-3333',
      email: 'outsider@test.com'
    });

    // Insert personal IDs using admin client
    await TestDatabase.insertTestData({
      personalIds: [ownerPersonal, workerPersonal, outsiderPersonal]
    });

    ownerId = ownerPersonal.id;
    workerId = workerPersonal.id;
    outsiderId = outsiderPersonal.id;

    // Create businesses
    const business = TestDataFactory.createBusinessRegistration(ownerId, {
      business_name: '테스트 회사',
      business_number: '123-45-67890'
    });

    const otherBusiness = TestDataFactory.createBusinessRegistration(outsiderId, {
      business_name: '다른 회사',
      business_number: '987-65-43210'
    });

    await TestDatabase.insertTestData({
      businessRegistrations: [business, otherBusiness]
    });

    businessId = business.id;
    otherBusinessId = otherBusiness.id;

    // Create papers for roles
    const ownerPaper = TestDataFactory.createPaper(ownerId, businessId, {
      paper_type: 'BUSINESS_REGISTRATION',
      role_granted: 'OWNER'
    });

    const workerPaper = TestDataFactory.createPaper(workerId, businessId, {
      paper_type: 'EMPLOYMENT_CONTRACT',
      role_granted: 'WORKER'
    });

    await TestDatabase.insertTestData({
      papers: [ownerPaper, workerPaper]
    });
  }, 60000);

  afterAll(async () => {
    await AuthUserSimulator.cleanupTestUsers();
    await TestDatabase.cleanup();
  });

  describe('Personal ID Access Control', () => {
    test('should allow users to read their own personal ID', async () => {
      const { data, error } = await ownerClient
        .from('personal_ids')
        .select('*')
        .eq('id', ownerId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(ownerId);
      expect(data.name).toBe('김사장');
    });

    test('should prevent users from reading other personal IDs', async () => {
      const { data, error } = await ownerClient
        .from('personal_ids')
        .select('*')
        .eq('id', workerId)
        .single();

      // Should return no data due to RLS, not an error
      expect(data).toBeNull();
      // Error might be null or indicate no rows found
      if (error) {
        expect(['PGRST116', 'PGRST301']).toContain(error.code);
      }
    });

    test('should allow users to update their own personal ID', async () => {
      const updates = {
        email: 'owner-updated@test.com',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await ownerClient
        .from('personal_ids')
        .update(updates)
        .eq('id', ownerId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.email).toBe('owner-updated@test.com');
    });

    test('should prevent users from updating other personal IDs', async () => {
      const updates = {
        name: '해킹시도',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await ownerClient
        .from('personal_ids')
        .update(updates)
        .eq('id', workerId)
        .select();

      // Update should affect 0 rows due to RLS
      expect(data).toEqual([]);
    });
  });

  describe('Business Registration Access Control', () => {
    test('should allow business owners to read their businesses', async () => {
      const { data, error } = await ownerClient
        .from('business_registrations')
        .select('*')
        .eq('owner_personal_id', ownerId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBe(1);
      expect(data[0].business_name).toBe('테스트 회사');
    });

    test('should allow employees to read businesses they work for', async () => {
      // First, worker should be able to see the business they have papers for
      const { data, error } = await workerClient
        .from('business_registrations')
        .select('*')
        .eq('id', businessId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBe(1);
      expect(data[0].business_name).toBe('테스트 회사');
    });

    test('should prevent access to unrelated businesses', async () => {
      const { data, error } = await workerClient
        .from('business_registrations')
        .select('*')
        .eq('id', otherBusinessId);

      // Should return no data due to RLS
      expect(data).toEqual([]);
    });

    test('should allow business owners to update their businesses', async () => {
      const updates = {
        business_name: '업데이트된 회사명',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await ownerClient
        .from('business_registrations')
        .update(updates)
        .eq('id', businessId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.business_name).toBe('업데이트된 회사명');
    });

    test('should prevent employees from updating business registration', async () => {
      const updates = {
        business_name: '직원이 변경시도',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await workerClient
        .from('business_registrations')
        .update(updates)
        .eq('id', businessId)
        .select();

      // Update should affect 0 rows due to RLS
      expect(data).toEqual([]);
    });
  });

  describe('Paper Access Control', () => {
    test('should allow users to read their own papers', async () => {
      const { data, error } = await workerClient
        .from('papers')
        .select('*')
        .eq('personal_id', workerId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBe(1);
      expect(data[0].role_granted).toBe('WORKER');
    });

    test('should allow business owners to read papers for their businesses', async () => {
      const { data, error } = await ownerClient
        .from('papers')
        .select('*')
        .eq('business_id', businessId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBe(2); // Owner and worker papers
      
      const roles = data.map(p => p.role_granted);
      expect(roles).toContain('OWNER');
      expect(roles).toContain('WORKER');
    });

    test('should prevent access to papers from other businesses', async () => {
      const { data, error } = await workerClient
        .from('papers')
        .select('*')
        .eq('business_id', otherBusinessId);

      // Should return no data due to RLS
      expect(data).toEqual([]);
    });

    test('should allow users to create papers for themselves', async () => {
      const newPaper = TestDataFactory.createPaper(workerId, businessId, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'SUPERVISOR',
        effective_from: '2024-06-01'
      });

      const { data, error } = await workerClient
        .from('papers')
        .insert([newPaper])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.role_granted).toBe('SUPERVISOR');
    });

    test('should prevent users from creating papers for others', async () => {
      const maliciousPaper = TestDataFactory.createPaper(ownerId, businessId, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'MANAGER',
        effective_from: '2024-06-01'
      });

      // Worker tries to create paper for owner
      const { data, error } = await workerClient
        .from('papers')
        .insert([maliciousPaper])
        .select();

      // Insert should fail due to RLS
      expect(error).not.toBeNull();
      expect(error.code).toBe('42501'); // Insufficient privilege
    });

    test('should allow users to update their own papers', async () => {
      // First get the worker's paper
      const { data: workerPapers } = await workerClient
        .from('papers')
        .select('*')
        .eq('personal_id', workerId)
        .eq('role_granted', 'WORKER');

      const paperToUpdate = workerPapers![0];

      const updates = {
        metadata: { department: 'Engineering', level: 'Senior' },
        updated_at: new Date().toISOString()
      };

      const { data, error } = await workerClient
        .from('papers')
        .update(updates)
        .eq('id', paperToUpdate.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.metadata.department).toBe('Engineering');
    });

    test('should prevent users from updating others papers', async () => {
      // Get owner's paper
      const { data: ownerPapers } = await ownerClient
        .from('papers')
        .select('*')
        .eq('personal_id', ownerId);

      const ownerPaper = ownerPapers![0];

      const maliciousUpdates = {
        role_granted: 'SEEKER', // Try to demote owner
        updated_at: new Date().toISOString()
      };

      // Worker tries to update owner's paper
      const { data, error } = await workerClient
        .from('papers')
        .update(maliciousUpdates)
        .eq('id', ownerPaper.id)
        .select();

      // Update should affect 0 rows due to RLS
      expect(data).toEqual([]);
    });
  });

  describe('Role Calculation Access Control', () => {
    test('should allow users to read their own role calculations', async () => {
      // First create a role calculation
      const roleCalc = {
        personal_id: workerId,
        business_id: businessId,
        calculated_roles: ['WORKER'],
        highest_role: 'WORKER',
        calculation_basis: {
          papers: ['paper-1'],
          dependencies: [],
          inheritance: []
        },
        updated_at: new Date().toISOString()
      };

      await testClient
        .from('role_calculations')
        .upsert([roleCalc]);

      // Worker should be able to read their own calculation
      const { data, error } = await workerClient
        .from('role_calculations')
        .select('*')
        .eq('personal_id', workerId)
        .eq('business_id', businessId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.highest_role).toBe('WORKER');
    });

    test('should allow business owners to read role calculations for their business', async () => {
      const { data, error } = await ownerClient
        .from('role_calculations')
        .select('*')
        .eq('business_id', businessId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
    });

    test('should prevent access to role calculations from other businesses', async () => {
      // Create role calculation for other business
      const otherRoleCalc = {
        personal_id: outsiderId,
        business_id: otherBusinessId,
        calculated_roles: ['OWNER'],
        highest_role: 'OWNER',
        calculation_basis: {
          papers: ['other-paper-1'],
          dependencies: [],
          inheritance: []
        },
        updated_at: new Date().toISOString()
      };

      await testClient
        .from('role_calculations')
        .upsert([otherRoleCalc]);

      // Worker should not be able to see calculations from other business
      const { data, error } = await workerClient
        .from('role_calculations')
        .select('*')
        .eq('business_id', otherBusinessId);

      expect(data).toEqual([]);
    });
  });

  describe('Cross-Business Access Isolation', () => {
    test('should completely isolate data between unrelated businesses', async () => {
      // Worker from businessId should have NO access to otherBusinessId data

      // Check business registrations
      const { data: businesses } = await workerClient
        .from('business_registrations')
        .select('*')
        .eq('id', otherBusinessId);
      expect(businesses).toEqual([]);

      // Check papers
      const { data: papers } = await workerClient
        .from('papers')
        .select('*')
        .eq('business_id', otherBusinessId);
      expect(papers).toEqual([]);

      // Check role calculations
      const { data: roles } = await workerClient
        .from('role_calculations')
        .select('*')
        .eq('business_id', otherBusinessId);
      expect(roles).toEqual([]);
    });

    test('should prevent data modification across business boundaries', async () => {
      // Worker should not be able to modify anything in other business
      const updates = {
        business_name: '해킹 시도',
        updated_at: new Date().toISOString()
      };

      const { data } = await workerClient
        .from('business_registrations')
        .update(updates)
        .eq('id', otherBusinessId)
        .select();

      expect(data).toEqual([]);
    });
  });

  describe('Anonymous Access Restrictions', () => {
    test('should prevent anonymous access to all sensitive data', async () => {
      // Sign out to become anonymous
      await AuthUserSimulator.signOut();
      
      const anonymousClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Test access to personal IDs
      const { data: personalIds } = await anonymousClient
        .from('personal_ids')
        .select('*');
      expect(personalIds).toEqual([]);

      // Test access to businesses
      const { data: businesses } = await anonymousClient
        .from('business_registrations')
        .select('*');
      expect(businesses).toEqual([]);

      // Test access to papers
      const { data: papers } = await anonymousClient
        .from('papers')
        .select('*');
      expect(papers).toEqual([]);

      // Test access to role calculations
      const { data: roles } = await anonymousClient
        .from('role_calculations')
        .select('*');
      expect(roles).toEqual([]);
    });

    test('should prevent anonymous data modification', async () => {
      const anonymousClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const maliciousData = {
        name: '익명해커',
        phone: '010-0000-0000'
      };

      const { data, error } = await anonymousClient
        .from('personal_ids')
        .insert([maliciousData])
        .select();

      expect(error).not.toBeNull();
      expect(error.code).toBe('42501'); // Insufficient privilege
    });
  });

  describe('Privilege Escalation Prevention', () => {
    test('should prevent role elevation through paper manipulation', async () => {
      // Worker should not be able to create OWNER paper for themselves
      const maliciousPaper = TestDataFactory.createPaper(workerId, businessId, {
        paper_type: 'BUSINESS_REGISTRATION', // This should only grant OWNER
        role_granted: 'OWNER',
        effective_from: '2024-01-01'
      });

      const { data, error } = await workerClient
        .from('papers')
        .insert([maliciousPaper])
        .select();

      // Should fail due to business logic validation (not just RLS)
      // In real implementation, this would be caught by triggers or constraints
      expect(error).not.toBeNull();
    });

    test('should prevent modification of higher privilege papers', async () => {
      // Worker should not be able to modify owner's papers
      const { data: ownerPapers } = await testClient // Use admin client to get paper
        .from('papers')
        .select('*')
        .eq('personal_id', ownerId)
        .eq('business_id', businessId);

      const ownerPaper = ownerPapers[0];

      const maliciousUpdate = {
        status: 'REVOKED', // Try to revoke owner's paper
        updated_at: new Date().toISOString()
      };

      const { data } = await workerClient
        .from('papers')
        .update(maliciousUpdate)
        .eq('id', ownerPaper.id)
        .select();

      expect(data).toEqual([]); // No rows affected due to RLS
    });
  });

  describe('Data Integrity and Consistency', () => {
    test('should maintain referential integrity across RLS boundaries', async () => {
      // Ensure that RLS doesn't break foreign key relationships
      
      // Create a paper and verify its business reference
      const newPaper = TestDataFactory.createPaper(workerId, businessId, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'SUPERVISOR'
      });

      const { data: paperData, error: paperError } = await workerClient
        .from('papers')
        .insert([newPaper])
        .select()
        .single();

      expect(paperError).toBeNull();
      expect(paperData.business_id).toBe(businessId);

      // Verify the business still exists and is accessible
      const { data: businessData, error: businessError } = await workerClient
        .from('business_registrations')
        .select('*')
        .eq('id', businessId)
        .single();

      expect(businessError).toBeNull();
      expect(businessData).toBeDefined();
    });

    test('should handle cascading operations correctly with RLS', async () => {
      // Test that related data operations work correctly within RLS constraints
      
      // Create multiple related records
      const supervisorPaper = TestDataFactory.createPaper(workerId, businessId, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'SUPERVISOR',
        effective_from: '2024-07-01'
      });

      await workerClient
        .from('papers')
        .insert([supervisorPaper]);

      // Update role calculation based on new paper
      const roleCalc = {
        personal_id: workerId,
        business_id: businessId,
        calculated_roles: ['SUPERVISOR', 'WORKER'],
        highest_role: 'SUPERVISOR',
        calculation_basis: {
          papers: [supervisorPaper.id],
          dependencies: ['WORKER'],
          inheritance: []
        },
        updated_at: new Date().toISOString()
      };

      const { data, error } = await workerClient
        .from('role_calculations')
        .upsert([roleCalc])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.highest_role).toBe('SUPERVISOR');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle RLS efficiently with large datasets', async () => {
      // Create multiple papers to test RLS performance
      const papers = [];
      for (let i = 0; i < 50; i++) {
        papers.push(TestDataFactory.createPaper(workerId, businessId, {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          effective_from: `2024-01-${String(i % 28 + 1).padStart(2, '0')}`,
          metadata: { batch: i }
        }));
      }

      // Insert using admin client to bypass RLS for setup
      await testClient
        .from('papers')
        .insert(papers);

      const startTime = Date.now();

      // Query as worker should return all their papers efficiently
      const { data, error } = await workerClient
        .from('papers')
        .select('*')
        .eq('personal_id', workerId)
        .eq('business_id', businessId);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(50); // Original paper + 50 new ones
      expect(queryTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});