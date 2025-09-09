/**
 * Permission Service Unit Tests
 * TDD implementation for ID-ROLE-PAPER Permission Management
 */

import { 
  PermissionService,
  PermissionCheckRequest,
  BulkPermissionCheckRequest,
  PermissionMatrixRequest,
  PermissionResult,
  PermissionMatrix
} from '../../src/lib/services/permission-service';
import { 
  RoleType,
  PaperType,
  Paper,
  UnifiedIdentity,
  BusinessRegistration,
  ComputedRole,
  IdType
} from '../../src/types/id-role-paper';

// Mock Supabase client with chainable methods
const mockSupabaseClient = {
  from: jest.fn(() => {
    const selectChain = {
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn(),
      mockResolvedValue: jest.fn().mockReturnThis(),
      mockResolvedValueOnce: jest.fn().mockReturnThis()
    };

    return {
      select: jest.fn(() => selectChain)
    };
  }),
  auth: {
    getUser: jest.fn()
  }
};

describe('Permission Service', () => {
  let permissionService: PermissionService;

  beforeEach(() => {
    permissionService = new PermissionService(mockSupabaseClient as any);
    jest.clearAllMocks();
  });

  const mockIdentity: UnifiedIdentity = {
    id: 'identity-123',
    idType: IdType.PERSONAL,
    email: 'test@example.com',
    fullName: '김테스트',
    authUserId: 'auth-123',
    isVerified: true,
    isActive: true,
    profileData: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockBusinessRegistration: BusinessRegistration = {
    id: 'business-123',
    registrationNumber: '123-45-67890',
    businessName: '테스트 회사',
    businessType: 'individual' as any,
    ownerIdentityId: 'identity-123',
    registrationData: {},
    verificationStatus: 'verified' as any,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('SEEKER Role Permissions', () => {
    beforeEach(() => {
      // Mock identity with no papers (SEEKER role)
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      // Mock empty papers
      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null
      });
    });

    test('should allow identity read access for SEEKER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'identity',
        action: 'read'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
      expect(result.data?.reason).toBe('Permission granted');
    });

    test('should allow identity update for SEEKER (own profile)', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'identity',
        action: 'update'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should deny business management for SEEKER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'business',
        action: 'create'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(false);
      expect(result.data?.requiredRole).toBe(RoleType.OWNER);
    });

    test('should deny attendance access without business context', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'attendance',
        action: 'read'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(false);
      expect(result.data?.requiredRole).toBe(RoleType.WORKER);
    });
  });

  describe('WORKER Role Permissions', () => {
    beforeEach(() => {
      // Mock identity
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      // Mock employment contract paper
      const employmentPaper: Paper = {
        id: 'paper-employment-123',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          position: 'Software Engineer',
          startDate: '2023-03-01'
        },
        isActive: true,
        validFrom: new Date('2023-03-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: [employmentPaper],
        error: null
      });

      // Mock business registrations
      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: [mockBusinessRegistration],
        error: null
      });
    });

    test('should allow attendance read with business context for WORKER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'attendance',
        action: 'read',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should allow attendance creation with business context for WORKER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'attendance',
        action: 'create',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should deny attendance approval for WORKER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'attendance',
        action: 'approve',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(false);
      expect(result.data?.requiredRole).toBe(RoleType.MANAGER);
    });

    test('should deny employee management for WORKER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'employees',
        action: 'read',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(false);
      expect(result.data?.requiredRole).toBe(RoleType.MANAGER);
    });
  });

  describe('MANAGER Role Permissions', () => {
    beforeEach(() => {
      // Mock identity
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      // Mock employment contract and authority delegation papers
      const employmentPaper: Paper = {
        id: 'paper-employment-123',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          position: 'Software Engineer',
          startDate: '2023-03-01'
        },
        isActive: true,
        validFrom: new Date('2023-03-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const authorityPaper: Paper = {
        id: 'paper-authority-123',
        paperType: PaperType.AUTHORITY_DELEGATION,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          delegatedAuthorities: ['attendance_management', 'employee_reports'],
          delegatedBy: 'owner-identity-456'
        },
        isActive: true,
        validFrom: new Date('2023-03-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: [employmentPaper, authorityPaper],
        error: null
      });

      // Mock business registrations
      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: [mockBusinessRegistration],
        error: null
      });
    });

    test('should allow attendance approval for MANAGER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'attendance',
        action: 'approve',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should allow employee read access for MANAGER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'employees',
        action: 'read',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should allow reports access for MANAGER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'reports',
        action: 'read',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should allow team management for MANAGER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'team',
        action: 'manage',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should deny employee creation for MANAGER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'employees',
        action: 'create',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(false);
      expect(result.data?.requiredRole).toBe(RoleType.OWNER);
    });
  });

  describe('OWNER Role Permissions', () => {
    beforeEach(() => {
      // Mock identity
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      // Mock business registration paper
      const businessPaper: Paper = {
        id: 'paper-business-123',
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'identity-123',
        paperData: {
          registrationNumber: '123-45-67890',
          businessName: '테스트 회사'
        },
        isActive: true,
        validFrom: new Date('2023-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: [businessPaper],
        error: null
      });

      // Mock business registrations (empty for owner)
      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: [],
        error: null
      });
    });

    test('should allow business creation for OWNER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'business',
        action: 'create'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should allow business management for OWNER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'business',
        action: 'manage',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should allow employee management for OWNER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'employees',
        action: 'manage',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should allow paper validation for OWNER', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'papers',
        action: 'validate',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });

    test('should deny franchise operations for OWNER without franchise papers', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'franchise',
        action: 'read',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(false);
      expect(result.data?.requiredRole).toBe(RoleType.FRANCHISEE);
    });
  });

  describe('Bulk Permission Checks', () => {
    beforeEach(() => {
      // Mock WORKER identity
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      const employmentPaper: Paper = {
        id: 'paper-employment-123',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: { position: 'Software Engineer' },
        isActive: true,
        validFrom: new Date('2023-03-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: [employmentPaper],
        error: null
      });

      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: [mockBusinessRegistration],
        error: null
      });
    });

    test('should check multiple permissions in bulk', async () => {
      const request: BulkPermissionCheckRequest = {
        identityId: 'identity-123',
        permissions: [
          { resource: 'attendance', action: 'read', businessContext: 'business-123' },
          { resource: 'attendance', action: 'create', businessContext: 'business-123' },
          { resource: 'attendance', action: 'approve', businessContext: 'business-123' },
          { resource: 'employees', action: 'read', businessContext: 'business-123' }
        ]
      };

      const result = await permissionService.checkBulkPermissions(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // WORKER should be able to read and create attendance
      expect(result.data!['attendance:read'].granted).toBe(true);
      expect(result.data!['attendance:create'].granted).toBe(true);

      // WORKER should not be able to approve attendance or read employees
      expect(result.data!['attendance:approve'].granted).toBe(false);
      expect(result.data!['employees:read'].granted).toBe(false);
    });
  });

  describe('Permission Matrix', () => {
    beforeEach(() => {
      // Mock MANAGER identity
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      const employmentPaper: Paper = {
        id: 'paper-employment-123',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: { position: 'Software Engineer' },
        isActive: true,
        validFrom: new Date('2023-03-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const authorityPaper: Paper = {
        id: 'paper-authority-123',
        paperType: PaperType.AUTHORITY_DELEGATION,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          delegatedAuthorities: ['attendance_management'],
          delegatedBy: 'owner-identity-456'
        },
        isActive: true,
        validFrom: new Date('2023-03-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: [employmentPaper, authorityPaper],
        error: null
      });

      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: [mockBusinessRegistration],
        error: null
      });
    });

    test('should generate complete permission matrix', async () => {
      const request: PermissionMatrixRequest = {
        identityId: 'identity-123',
        businessContext: 'business-123'
      };

      const result = await permissionService.getPermissionMatrix(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const matrix = result.data!;
      expect(matrix.identityId).toBe('identity-123');
      expect(matrix.businessContext).toBe('business-123');
      expect(matrix.effectiveRole).toBe(RoleType.MANAGER);
      expect(matrix.availableRoles).toContain(RoleType.WORKER);
      expect(matrix.availableRoles).toContain(RoleType.MANAGER);

      // Check specific permissions
      expect(matrix.permissions.attendance.read.granted).toBe(true);
      expect(matrix.permissions.attendance.approve.granted).toBe(true);
      expect(matrix.permissions.employees.read.granted).toBe(true);
      expect(matrix.permissions.employees.create.granted).toBe(false); // Requires OWNER
    });

    test('should get available actions for resource', async () => {
      const result = await permissionService.getAvailableActions(
        'identity-123',
        'attendance',
        'business-123'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const actions = result.data!;
      expect(actions).toContain('read');
      expect(actions).toContain('create');
      expect(actions).toContain('update');
      expect(actions).toContain('approve');
      expect(actions).not.toContain('delete'); // MANAGER can't delete attendance
    });
  });

  describe('Business Context Validation', () => {
    beforeEach(() => {
      // Mock WORKER identity
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      const employmentPaper: Paper = {
        id: 'paper-employment-123',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: { position: 'Software Engineer' },
        isActive: true,
        validFrom: new Date('2023-03-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: [employmentPaper],
        error: null
      });

      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: [mockBusinessRegistration],
        error: null
      });
    });

    test('should require business context for business-scoped permissions', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'attendance',
        action: 'read'
        // Missing businessContext
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(false);
      expect(result.data?.businessContextRequired).toBe(true);
    });

    test('should allow action with proper business context', async () => {
      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'attendance',
        action: 'read',
        businessContext: 'business-123'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle identity not found', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const request: PermissionCheckRequest = {
        identityId: 'non-existent',
        resource: 'identity',
        action: 'read'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Identity not found or invalid');
    });

    test('should handle unknown resource', async () => {
      // Mock basic identity
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null
      });

      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'unknown-resource',
        action: 'read'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(false);
      expect(result.data?.reason).toContain('Unknown resource');
    });

    test('should handle unknown action', async () => {
      // Mock basic identity
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: [],
        error: null
      });

      const request: PermissionCheckRequest = {
        identityId: 'identity-123',
        resource: 'identity',
        action: 'unknown-action'
      };

      const result = await permissionService.checkPermission(request);

      expect(result.success).toBe(true);
      expect(result.data?.granted).toBe(false);
      expect(result.data?.reason).toContain('Unknown action');
    });
  });
});