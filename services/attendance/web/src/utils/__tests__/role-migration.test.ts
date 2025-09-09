/**
 * Role Migration Utilities Test Suite
 * 
 * 새로운 ID-ROLE-PAPER 시스템의 마이그레이션 유틸리티 테스트
 * Phase 1 마이그레이션의 무결성 검증
 */

import {
  RoleType,
  IdType,
  PaperType,
  BusinessType,
  UnifiedIdentity,
  Paper,
  BusinessRegistration,
  LEGACY_ROLE_MAPPING
} from '../../types/id-role-paper-unified';

import {
  RoleMigrationUtils,
  MigrationBatchProcessor,
  convertLegacyRole,
  validateRoleTransition,
  calculateRoleFromPapers,
  getHighestRole
} from '../role-migration';

describe('RoleMigrationUtils', () => {
  
  describe('convertLegacyRole', () => {
    test('should convert known legacy roles correctly', () => {
      expect(convertLegacyRole('MASTER_ADMIN')).toBe(RoleType.FRANCHISOR);
      expect(convertLegacyRole('SUPER_ADMIN')).toBe(RoleType.FRANCHISOR);
      expect(convertLegacyRole('BUSINESS_ADMIN')).toBe(RoleType.OWNER);
      expect(convertLegacyRole('ADMIN')).toBe(RoleType.OWNER);
      expect(convertLegacyRole('MANAGER')).toBe(RoleType.MANAGER);
      expect(convertLegacyRole('WORKER')).toBe(RoleType.WORKER);
      expect(convertLegacyRole('EMPLOYEE')).toBe(RoleType.WORKER);
    });

    test('should handle unified roles', () => {
      expect(convertLegacyRole('master')).toBe(RoleType.FRANCHISOR);
      expect(convertLegacyRole('franchise_admin')).toBe(RoleType.FRANCHISOR);
      expect(convertLegacyRole('admin')).toBe(RoleType.OWNER);
      expect(convertLegacyRole('manager')).toBe(RoleType.MANAGER);
      expect(convertLegacyRole('worker')).toBe(RoleType.WORKER);
    });

    test('should default to SEEKER for unknown roles', () => {
      expect(convertLegacyRole('UNKNOWN_ROLE')).toBe(RoleType.SEEKER);
      expect(convertLegacyRole('')).toBe(RoleType.SEEKER);
      expect(convertLegacyRole('random_string')).toBe(RoleType.SEEKER);
    });

    test('should handle case insensitive matching', () => {
      expect(convertLegacyRole('master_admin')).toBe(RoleType.FRANCHISOR);
      expect(convertLegacyRole('Master')).toBe(RoleType.FRANCHISOR);
      expect(convertLegacyRole('ADMIN')).toBe(RoleType.OWNER);
      expect(convertLegacyRole('admin')).toBe(RoleType.OWNER);
    });
  });

  describe('convertToLegacyRole', () => {
    test('should convert new roles to legacy equivalents', () => {
      expect(RoleMigrationUtils.convertToLegacyRole(RoleType.FRANCHISOR)).toBe('MASTER_ADMIN');
      expect(RoleMigrationUtils.convertToLegacyRole(RoleType.FRANCHISEE)).toBe('ADMIN');
      expect(RoleMigrationUtils.convertToLegacyRole(RoleType.OWNER)).toBe('ADMIN');
      expect(RoleMigrationUtils.convertToLegacyRole(RoleType.MANAGER)).toBe('MANAGER');
      expect(RoleMigrationUtils.convertToLegacyRole(RoleType.SUPERVISOR)).toBe('MANAGER');
      expect(RoleMigrationUtils.convertToLegacyRole(RoleType.WORKER)).toBe('WORKER');
      expect(RoleMigrationUtils.convertToLegacyRole(RoleType.SEEKER)).toBe('WORKER');
    });
  });

  describe('getRoleDisplayName', () => {
    test('should return Korean display names by default', () => {
      expect(RoleMigrationUtils.getRoleDisplayName(RoleType.SEEKER)).toBe('구직자');
      expect(RoleMigrationUtils.getRoleDisplayName(RoleType.WORKER)).toBe('워커');
      expect(RoleMigrationUtils.getRoleDisplayName(RoleType.MANAGER)).toBe('매니저');
      expect(RoleMigrationUtils.getRoleDisplayName(RoleType.OWNER)).toBe('사업자관리자');
      expect(RoleMigrationUtils.getRoleDisplayName(RoleType.FRANCHISOR)).toBe('가맹본부관리자');
    });

    test('should return English display names when requested', () => {
      expect(RoleMigrationUtils.getRoleDisplayName(RoleType.SEEKER, 'en')).toBe('Job Seeker');
      expect(RoleMigrationUtils.getRoleDisplayName(RoleType.WORKER, 'en')).toBe('Worker');
      expect(RoleMigrationUtils.getRoleDisplayName(RoleType.MANAGER, 'en')).toBe('Manager');
      expect(RoleMigrationUtils.getRoleDisplayName(RoleType.OWNER, 'en')).toBe('Business Owner');
      expect(RoleMigrationUtils.getRoleDisplayName(RoleType.FRANCHISOR, 'en')).toBe('Franchisor');
    });
  });

  describe('validateRoleTransition', () => {
    test('should allow same level transitions', () => {
      const result = validateRoleTransition(RoleType.WORKER, RoleType.WORKER);
      expect(result.isValid).toBe(true);
    });

    test('should allow downward transitions', () => {
      const result = validateRoleTransition(RoleType.MANAGER, RoleType.WORKER);
      expect(result.isValid).toBe(true);
    });

    test('should validate upward transitions with prerequisites', () => {
      // MANAGER requires WORKER as dependency
      const result = validateRoleTransition(RoleType.SEEKER, RoleType.MANAGER);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('prerequisite role');
      expect(result.requiredPapers).toContain(PaperType.EMPLOYMENT_CONTRACT);
      expect(result.requiredPapers).toContain(PaperType.AUTHORITY_DELEGATION);
    });

    test('should allow valid upward transitions', () => {
      // WORKER can become MANAGER if they have the right papers
      const result = validateRoleTransition(RoleType.WORKER, RoleType.MANAGER);
      expect(result.isValid).toBe(true);
      expect(result.requiredPapers).toContain(PaperType.EMPLOYMENT_CONTRACT);
      expect(result.requiredPapers).toContain(PaperType.AUTHORITY_DELEGATION);
    });
  });

  describe('calculateRoleFromPapers', () => {
    const mockIdentityId = 'test-identity-123';
    const mockBusinessId = 'test-business-456';

    test('should return SEEKER for no papers', () => {
      const roles = calculateRoleFromPapers([]);
      expect(roles).toEqual([RoleType.SEEKER]);
    });

    test('should calculate WORKER from employment contract', () => {
      const papers: Paper[] = [{
        id: 'paper-1',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: mockIdentityId,
        relatedBusinessId: mockBusinessId,
        paperData: {},
        isActive: true,
        validFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const roles = calculateRoleFromPapers(papers, mockBusinessId);
      expect(roles).toContain(RoleType.WORKER);
    });

    test('should calculate MANAGER from employment contract + authority delegation', () => {
      const papers: Paper[] = [
        {
          id: 'paper-1',
          paperType: PaperType.EMPLOYMENT_CONTRACT,
          ownerIdentityId: mockIdentityId,
          relatedBusinessId: mockBusinessId,
          paperData: {},
          isActive: true,
          validFrom: new Date('2024-01-01'),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'paper-2',
          paperType: PaperType.AUTHORITY_DELEGATION,
          ownerIdentityId: mockIdentityId,
          relatedBusinessId: mockBusinessId,
          paperData: {},
          isActive: true,
          validFrom: new Date('2024-01-01'),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const roles = calculateRoleFromPapers(papers, mockBusinessId);
      expect(roles).toContain(RoleType.MANAGER);
      expect(roles).toContain(RoleType.WORKER); // Should inherit WORKER
    });

    test('should calculate OWNER from business registration', () => {
      const papers: Paper[] = [{
        id: 'paper-1',
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: mockIdentityId,
        relatedBusinessId: mockBusinessId,
        paperData: {},
        isActive: true,
        validFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const roles = calculateRoleFromPapers(papers, mockBusinessId);
      expect(roles).toContain(RoleType.OWNER);
    });

    test('should ignore inactive papers', () => {
      const papers: Paper[] = [{
        id: 'paper-1',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: mockIdentityId,
        relatedBusinessId: mockBusinessId,
        paperData: {},
        isActive: false, // Inactive paper
        validFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const roles = calculateRoleFromPapers(papers, mockBusinessId);
      expect(roles).toEqual([RoleType.SEEKER]);
    });

    test('should ignore expired papers', () => {
      const papers: Paper[] = [{
        id: 'paper-1',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: mockIdentityId,
        relatedBusinessId: mockBusinessId,
        paperData: {},
        isActive: true,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-06-01'), // Expired
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const roles = calculateRoleFromPapers(papers, mockBusinessId);
      expect(roles).toEqual([RoleType.SEEKER]);
    });
  });

  describe('getHighestRole', () => {
    test('should return highest role from array', () => {
      const roles = [RoleType.WORKER, RoleType.MANAGER, RoleType.SEEKER];
      expect(getHighestRole(roles)).toBe(RoleType.MANAGER);
    });

    test('should return SEEKER for empty array', () => {
      expect(getHighestRole([])).toBe(RoleType.SEEKER);
    });

    test('should handle single role', () => {
      expect(getHighestRole([RoleType.OWNER])).toBe(RoleType.OWNER);
    });

    test('should handle complex hierarchy', () => {
      const roles = [RoleType.WORKER, RoleType.FRANCHISOR, RoleType.MANAGER, RoleType.OWNER];
      expect(getHighestRole(roles)).toBe(RoleType.FRANCHISOR);
    });
  });

  describe('hasPermission', () => {
    test('should grant all permissions to FRANCHISOR', () => {
      expect(RoleMigrationUtils.hasPermission(RoleType.FRANCHISOR, 'any_resource', 'any_action')).toBe(true);
    });

    test('should respect role-based permissions', () => {
      // WORKER should have attendance read permission
      expect(RoleMigrationUtils.hasPermission(RoleType.WORKER, 'attendance', 'read')).toBe(true);
      
      // WORKER should NOT have user management permission
      expect(RoleMigrationUtils.hasPermission(RoleType.WORKER, 'users', 'write')).toBe(false);
      
      // MANAGER should have user read permission
      expect(RoleMigrationUtils.hasPermission(RoleType.MANAGER, 'users', 'read')).toBe(true);
      
      // OWNER should have business management permission
      expect(RoleMigrationUtils.hasPermission(RoleType.OWNER, 'business', 'manage')).toBe(true);
    });

    test('should deny unknown permissions', () => {
      expect(RoleMigrationUtils.hasPermission(RoleType.SEEKER, 'secret_resource', 'admin')).toBe(false);
    });
  });

  describe('migrateUserData', () => {
    test('should migrate legacy user data correctly', () => {
      const legacyUser = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone: '010-1234-5678',
        auth_user_id: 'auth-456',
        is_verified: true,
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        profile_data: { department: 'IT' }
      };

      const migrated = RoleMigrationUtils.migrateUserData(legacyUser);

      expect(migrated).toEqual({
        id: 'user-123',
        idType: IdType.PERSONAL,
        email: 'test@example.com',
        phone: '010-1234-5678',
        fullName: 'Test User',
        authUserId: 'auth-456',
        isVerified: true,
        isActive: true,
        profileData: { department: 'IT' },
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z')
      });
    });

    test('should handle missing fields with defaults', () => {
      const legacyUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User', // Different field name
        user_id: 'auth-456', // Different field name
        created_at: '2024-01-01T00:00:00.000Z'
      };

      const migrated = RoleMigrationUtils.migrateUserData(legacyUser);

      expect(migrated.idType).toBe(IdType.PERSONAL);
      expect(migrated.fullName).toBe('Test User');
      expect(migrated.authUserId).toBe('auth-456');
      expect(migrated.isVerified).toBe(false);
      expect(migrated.isActive).toBe(true);
      expect(migrated.profileData).toEqual({});
      expect(migrated.updatedAt).toEqual(migrated.createdAt);
    });
  });

  describe('validateCorporateIdConstraints', () => {
    const mockCorporateId: UnifiedIdentity = {
      id: 'corp-123',
      idType: IdType.CORPORATE,
      email: 'corp@example.com',
      fullName: 'Test Corporation',
      authUserId: 'auth-456',
      isVerified: true,
      isActive: true,
      profileData: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    test('should require Personal ID link for Corporate ID', () => {
      const errors = RoleMigrationUtils.validateCorporateIdConstraints(mockCorporateId, []);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('CORPORATE_ID_REQUIRES_PERSONAL_LINK');
    });

    test('should prevent Employment Contract for Corporate ID', () => {
      const corporateIdWithLink = {
        ...mockCorporateId,
        linkedPersonalId: 'personal-456'
      };

      const papers: Paper[] = [{
        id: 'paper-1',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'corp-123',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const errors = RoleMigrationUtils.validateCorporateIdConstraints(corporateIdWithLink, papers);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('CORPORATE_ID_CANNOT_HAVE_EMPLOYMENT_CONTRACT');
    });

    test('should pass validation for valid Corporate ID', () => {
      const validCorporateId = {
        ...mockCorporateId,
        linkedPersonalId: 'personal-456'
      };

      const papers: Paper[] = [{
        id: 'paper-1',
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'corp-123',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const errors = RoleMigrationUtils.validateCorporateIdConstraints(validCorporateId, papers);
      expect(errors).toHaveLength(0);
    });

    test('should not validate Personal IDs', () => {
      const personalId: UnifiedIdentity = {
        ...mockCorporateId,
        idType: IdType.PERSONAL
      };

      const errors = RoleMigrationUtils.validateCorporateIdConstraints(personalId, []);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('MigrationBatchProcessor', () => {
  test('should process items in batches', async () => {
    const processor = new MigrationBatchProcessor();
    const items = Array.from({ length: 250 }, (_, i) => i);
    
    let progressCalls = 0;
    const processedItems: number[] = [];

    const results = await processor.processBatch(
      items,
      async (item) => {
        processedItems.push(item);
        return item * 2;
      },
      (processed, total) => {
        progressCalls++;
        expect(processed).toBeLessThanOrEqual(total);
      }
    );

    expect(results).toHaveLength(250);
    expect(results[0]).toBe(0);
    expect(results[249]).toBe(498);
    expect(processedItems).toHaveLength(250);
    expect(progressCalls).toBeGreaterThan(0);
    expect(processor.getProcessedCount()).toBe(250);
  });

  test('should handle processing errors gracefully', async () => {
    const processor = new MigrationBatchProcessor();
    const items = [1, 2, 3, 4, 5];
    
    const results = await processor.processBatch(
      items,
      async (item) => {
        if (item === 3) {
          throw new Error('Processing error');
        }
        return item * 2;
      }
    );

    // Should still process other items despite error
    expect(results).toHaveLength(4); // 5 items - 1 failed batch
    expect(processor.getErrors()).toHaveLength(1);
    expect(processor.getErrors()[0]).toContain('Batch processing error');
  });
});

describe('Integration Tests', () => {
  test('should handle complete user migration scenario', () => {
    // Simulate legacy user with mixed data
    const legacyUsers = [
      {
        id: 'user-1',
        email: 'worker@test.com',
        full_name: 'Test Worker',
        role: 'WORKER',
        auth_user_id: 'auth-1',
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'user-2',
        email: 'admin@test.com',
        name: 'Test Admin', // Different field name
        role: 'BUSINESS_ADMIN',
        user_id: 'auth-2', // Different field name
        is_verified: true,
        created_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'user-3',
        email: 'master@test.com',
        full_name: 'Master Admin',
        role: 'SUPER_ADMIN',
        auth_user_id: 'auth-3',
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z'
      }
    ];

    // Migrate users
    const migratedUsers = legacyUsers.map(user => 
      RoleMigrationUtils.migrateUserData(user)
    );

    // Verify migrations
    expect(migratedUsers).toHaveLength(3);
    
    // Check converted roles
    expect(convertLegacyRole(legacyUsers[0].role)).toBe(RoleType.WORKER);
    expect(convertLegacyRole(legacyUsers[1].role)).toBe(RoleType.OWNER);
    expect(convertLegacyRole(legacyUsers[2].role)).toBe(RoleType.FRANCHISOR);

    // Generate migration report
    const report = RoleMigrationUtils.generateMigrationReport(legacyUsers, migratedUsers as UnifiedIdentity[]);
    
    expect(report.totalUsers).toBe(3);
    expect(report.successfulMigrations).toBe(3);
    expect(report.failedMigrations).toBe(0);
    expect(report.roleMappings['WORKER']).toBe(1);
    expect(report.roleMappings['BUSINESS_ADMIN']).toBe(1);
    expect(report.roleMappings['SUPER_ADMIN']).toBe(1);
    expect(report.errors).toHaveLength(0);
  });
});