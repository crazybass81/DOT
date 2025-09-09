/**
 * ID-ROLE-PAPER Test Setup Configuration
 * 
 * Comprehensive test database setup with new schema supporting:
 * - Personal/Corporate IDs
 * - Business Registrations  
 * - Paper-based role calculation
 * - 7-role hierarchy system
 * - Multi-business context isolation
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Types for the new architecture
export type IdType = 'PERSONAL' | 'CORPORATE';
export type BusinessType = 'SOLE_PROPRIETORSHIP' | 'CORPORATION' | 'PARTNERSHIP' | 'FRANCHISE';
export type PaperType = 'BUSINESS_REGISTRATION' | 'EMPLOYMENT_CONTRACT' | 'PARTNERSHIP_AGREEMENT' | 'FRANCHISE_AGREEMENT' | 'MANAGEMENT_APPOINTMENT' | 'OWNERSHIP_CERTIFICATE';
export type RoleType = 'SEEKER' | 'WORKER' | 'MANAGER' | 'OWNER' | 'FRANCHISEE' | 'FRANCHISOR' | 'SUPERVISOR';

export interface TestPersonalId {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birth_date?: string;
  created_at: string;
}

export interface TestCorporateId {
  id: string;
  linked_personal_id: string;
  business_name: string;
  business_number: string;
  representative_name: string;
  business_type: BusinessType;
  created_at: string;
}

export interface TestBusinessRegistration {
  id: string;
  business_name: string;
  business_number: string;
  business_type: BusinessType;
  owner_personal_id: string;
  registration_date: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  created_at: string;
}

export interface TestPaper {
  id: string;
  personal_id: string;
  business_id: string;
  paper_type: PaperType;
  role_granted: RoleType;
  effective_from: string;
  effective_until?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  metadata: Record<string, any>;
  created_at: string;
}

export interface TestRoleCalculation {
  personal_id: string;
  business_id: string;
  calculated_roles: RoleType[];
  highest_role: RoleType;
  calculation_basis: {
    papers: string[];
    dependencies: string[];
    inheritance: string[];
  };
  updated_at: string;
}

// Test configuration
export const testConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ',
  testTimeout: 30000,
  cleanupTables: [
    'role_calculations',
    'papers',
    'business_registrations',
    'corporate_ids',
    'personal_ids'
  ]
};

export const testClient = createClient(testConfig.supabaseUrl, testConfig.supabaseAnonKey);

// Mock data factories for comprehensive testing
export class TestDataFactory {
  static createPersonalId(overrides: Partial<TestPersonalId> = {}): TestPersonalId {
    const timestamp = new Date().toISOString();
    return {
      id: uuidv4(),
      name: '김테스트' + Math.random().toString(36).substring(7),
      phone: '010-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000),
      email: 'test' + Math.random().toString(36).substring(7) + '@test.com',
      birth_date: '1990-01-01',
      created_at: timestamp,
      ...overrides
    };
  }

  static createCorporateId(personalId: string, overrides: Partial<TestCorporateId> = {}): TestCorporateId {
    const timestamp = new Date().toISOString();
    const businessNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
    return {
      id: uuidv4(),
      linked_personal_id: personalId,
      business_name: '테스트회사' + Math.random().toString(36).substring(7),
      business_number: businessNumber.substring(0,3) + '-' + businessNumber.substring(3,5) + '-' + businessNumber.substring(5),
      representative_name: '김대표',
      business_type: 'CORPORATION',
      created_at: timestamp,
      ...overrides
    };
  }

  static createBusinessRegistration(ownerPersonalId: string, overrides: Partial<TestBusinessRegistration> = {}): TestBusinessRegistration {
    const timestamp = new Date().toISOString();
    const businessNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
    return {
      id: uuidv4(),
      business_name: '테스트사업체' + Math.random().toString(36).substring(7),
      business_number: businessNumber.substring(0,3) + '-' + businessNumber.substring(3,5) + '-' + businessNumber.substring(5),
      business_type: 'SOLE_PROPRIETORSHIP',
      owner_personal_id: ownerPersonalId,
      registration_date: '2024-01-01',
      status: 'ACTIVE',
      created_at: timestamp,
      ...overrides
    };
  }

  static createPaper(personalId: string, businessId: string, overrides: Partial<TestPaper> = {}): TestPaper {
    const timestamp = new Date().toISOString();
    return {
      id: uuidv4(),
      personal_id: personalId,
      business_id: businessId,
      paper_type: 'EMPLOYMENT_CONTRACT',
      role_granted: 'WORKER',
      effective_from: '2024-01-01',
      status: 'ACTIVE',
      metadata: {},
      created_at: timestamp,
      ...overrides
    };
  }

  // Role hierarchy test scenarios
  static createRoleHierarchyScenario() {
    const personalId = uuidv4();
    const businessId = uuidv4();
    
    return {
      personalId,
      businessId,
      scenarios: [
        // SEEKER - no papers
        {
          name: 'SEEKER',
          papers: [],
          expectedRoles: ['SEEKER'],
          highestRole: 'SEEKER'
        },
        // WORKER - employment contract
        {
          name: 'WORKER',
          papers: [
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'EMPLOYMENT_CONTRACT',
              role_granted: 'WORKER'
            })
          ],
          expectedRoles: ['WORKER'],
          highestRole: 'WORKER'
        },
        // MANAGER - requires WORKER + management appointment
        {
          name: 'MANAGER',
          papers: [
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'EMPLOYMENT_CONTRACT',
              role_granted: 'WORKER'
            }),
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'MANAGEMENT_APPOINTMENT',
              role_granted: 'MANAGER'
            })
          ],
          expectedRoles: ['WORKER', 'MANAGER'],
          highestRole: 'MANAGER'
        },
        // OWNER - business registration
        {
          name: 'OWNER',
          papers: [
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'BUSINESS_REGISTRATION',
              role_granted: 'OWNER'
            })
          ],
          expectedRoles: ['OWNER', 'MANAGER', 'WORKER'], // Inheritance
          highestRole: 'OWNER'
        },
        // FRANCHISEE - franchise agreement
        {
          name: 'FRANCHISEE',
          papers: [
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'FRANCHISE_AGREEMENT',
              role_granted: 'FRANCHISEE'
            })
          ],
          expectedRoles: ['FRANCHISEE', 'MANAGER', 'WORKER'], // Inheritance
          highestRole: 'FRANCHISEE'
        },
        // FRANCHISOR - multiple franchise agreements
        {
          name: 'FRANCHISOR',
          papers: [
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'FRANCHISE_AGREEMENT',
              role_granted: 'FRANCHISOR'
            })
          ],
          expectedRoles: ['FRANCHISOR', 'FRANCHISEE', 'MANAGER', 'WORKER'], // Full inheritance
          highestRole: 'FRANCHISOR'
        },
        // SUPERVISOR - appointment with worker base
        {
          name: 'SUPERVISOR',
          papers: [
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'EMPLOYMENT_CONTRACT',
              role_granted: 'WORKER'
            }),
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'MANAGEMENT_APPOINTMENT',
              role_granted: 'SUPERVISOR'
            })
          ],
          expectedRoles: ['WORKER', 'SUPERVISOR'],
          highestRole: 'SUPERVISOR'
        }
      ]
    };
  }

  // Multi-business context scenarios
  static createMultiBusinessScenario() {
    const personalId = uuidv4();
    const business1Id = uuidv4();
    const business2Id = uuidv4();
    const business3Id = uuidv4();

    return {
      personalId,
      businesses: [
        {
          id: business1Id,
          name: '카페A',
          type: 'SOLE_PROPRIETORSHIP'
        },
        {
          id: business2Id,
          name: '프랜차이즈B',
          type: 'FRANCHISE'
        },
        {
          id: business3Id,
          name: '회사C',
          type: 'CORPORATION'
        }
      ],
      contexts: [
        {
          businessId: business1Id,
          papers: [
            TestDataFactory.createPaper(personalId, business1Id, {
              paper_type: 'BUSINESS_REGISTRATION',
              role_granted: 'OWNER'
            })
          ],
          expectedRoles: ['OWNER', 'MANAGER', 'WORKER'],
          highestRole: 'OWNER'
        },
        {
          businessId: business2Id,
          papers: [
            TestDataFactory.createPaper(personalId, business2Id, {
              paper_type: 'FRANCHISE_AGREEMENT',
              role_granted: 'FRANCHISEE'
            })
          ],
          expectedRoles: ['FRANCHISEE', 'MANAGER', 'WORKER'],
          highestRole: 'FRANCHISEE'
        },
        {
          businessId: business3Id,
          papers: [
            TestDataFactory.createPaper(personalId, business3Id, {
              paper_type: 'EMPLOYMENT_CONTRACT',
              role_granted: 'WORKER'
            })
          ],
          expectedRoles: ['WORKER'],
          highestRole: 'WORKER'
        }
      ]
    };
  }

  // Edge cases and error scenarios
  static createEdgeCaseScenarios() {
    const personalId = uuidv4();
    const businessId = uuidv4();

    return {
      personalId,
      businessId,
      scenarios: [
        {
          name: 'Expired Papers',
          papers: [
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'EMPLOYMENT_CONTRACT',
              role_granted: 'WORKER',
              effective_until: '2023-12-31',
              status: 'EXPIRED'
            })
          ],
          expectedRoles: ['SEEKER'], // Should revert to SEEKER
          highestRole: 'SEEKER'
        },
        {
          name: 'Revoked Papers',
          papers: [
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'MANAGEMENT_APPOINTMENT',
              role_granted: 'MANAGER',
              status: 'REVOKED'
            })
          ],
          expectedRoles: ['SEEKER'], // Should revert to SEEKER
          highestRole: 'SEEKER'
        },
        {
          name: 'Invalid Role Dependencies',
          papers: [
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'MANAGEMENT_APPOINTMENT',
              role_granted: 'MANAGER'
              // Missing WORKER base role
            })
          ],
          expectedRoles: ['SEEKER'], // Should fail validation
          highestRole: 'SEEKER',
          shouldFail: true
        },
        {
          name: 'Conflicting Papers',
          papers: [
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'BUSINESS_REGISTRATION',
              role_granted: 'OWNER'
            }),
            TestDataFactory.createPaper(personalId, businessId, {
              paper_type: 'EMPLOYMENT_CONTRACT',
              role_granted: 'WORKER'
            })
          ],
          expectedRoles: ['OWNER', 'MANAGER', 'WORKER'], // OWNER should take precedence
          highestRole: 'OWNER'
        }
      ]
    };
  }
}

// Test database setup and teardown utilities
export class TestDatabase {
  static async setupSchema(): Promise<void> {
    console.log('🔧 Setting up ID-ROLE-PAPER test schema...');

    // Check if tables exist (they should be created by migration)
    const tables = [
      'personal_ids',
      'corporate_ids', 
      'business_registrations',
      'papers',
      'role_calculations'
    ];

    for (const table of tables) {
      const { error } = await testClient
        .from(table)
        .select('count')
        .limit(1);

      if (error) {
        throw new Error(`Table ${table} does not exist: ${error.message}`);
      }
    }

    console.log('✅ All required tables exist');
  }

  static async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    // Delete in dependency order
    for (const table of testConfig.cleanupTables) {
      const { error } = await testClient
        .from(table)
        .delete()
        .like('id', '%'); // Delete test records

      if (error && !error.message.includes('No rows found')) {
        console.warn(`Warning: Failed to cleanup ${table}: ${error.message}`);
      }
    }

    console.log('✅ Test data cleanup completed');
  }

  static async insertTestData(data: {
    personalIds?: TestPersonalId[];
    corporateIds?: TestCorporateId[];
    businessRegistrations?: TestBusinessRegistration[];
    papers?: TestPaper[];
  }): Promise<void> {
    if (data.personalIds?.length) {
      const { error } = await testClient
        .from('personal_ids')
        .insert(data.personalIds);
      if (error) throw new Error(`Failed to insert personal IDs: ${error.message}`);
    }

    if (data.corporateIds?.length) {
      const { error } = await testClient
        .from('corporate_ids')
        .insert(data.corporateIds);
      if (error) throw new Error(`Failed to insert corporate IDs: ${error.message}`);
    }

    if (data.businessRegistrations?.length) {
      const { error } = await testClient
        .from('business_registrations')
        .insert(data.businessRegistrations);
      if (error) throw new Error(`Failed to insert business registrations: ${error.message}`);
    }

    if (data.papers?.length) {
      const { error } = await testClient
        .from('papers')
        .insert(data.papers);
      if (error) throw new Error(`Failed to insert papers: ${error.message}`);
    }
  }

  static async verifyRoleCalculation(personalId: string, businessId: string): Promise<TestRoleCalculation | null> {
    const { data, error } = await testClient
      .from('role_calculations')
      .select('*')
      .eq('personal_id', personalId)
      .eq('business_id', businessId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get role calculation: ${error.message}`);
    }

    return data;
  }
}

// Jest setup helpers
export function setupTestEnvironment() {
  beforeAll(async () => {
    await TestDatabase.setupSchema();
  }, testConfig.testTimeout);

  afterAll(async () => {
    await TestDatabase.cleanup();
  }, testConfig.testTimeout);

  beforeEach(async () => {
    // Clean slate for each test
    await TestDatabase.cleanup();
  });
}

export default {
  TestDataFactory,
  TestDatabase,
  testClient,
  testConfig,
  setupTestEnvironment
};