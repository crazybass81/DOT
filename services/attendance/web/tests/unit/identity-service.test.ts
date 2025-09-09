/**
 * Identity Service Unit Tests
 * TDD implementation for ID-ROLE-PAPER Identity Management
 */

import { 
  IdentityService,
  CreateIdentityRequest,
  UpdateIdentityRequest,
  IdentityWithContext
} from '../../src/lib/services/identity-service';
import { 
  IdType,
  RoleType,
  UnifiedIdentity,
  BusinessRegistration,
  Paper,
  ComputedRole
} from '../../src/types/id-role-paper';

// Mock Supabase client with chainable methods
const mockSupabaseClient = {
  from: jest.fn(() => {
    const selectChain = {
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      single: jest.fn(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      mockResolvedValue: jest.fn().mockReturnThis(),
      mockResolvedValueOnce: jest.fn().mockReturnThis()
    };

    const insertChain = {
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    };

    const updateChain = {
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    };

    const deleteChain = {
      eq: jest.fn()
    };

    return {
      select: jest.fn(() => selectChain),
      insert: jest.fn(() => insertChain),
      update: jest.fn(() => updateChain),
      delete: jest.fn(() => deleteChain)
    };
  }),
  auth: {
    getUser: jest.fn()
  }
};

describe('Identity Service', () => {
  let identityService: IdentityService;

  beforeEach(() => {
    identityService = new IdentityService(mockSupabaseClient as any);
    jest.clearAllMocks();
  });

  describe('Personal Identity Management', () => {
    test('should create Personal ID with valid data', async () => {
      const createRequest: CreateIdentityRequest = {
        idType: IdType.PERSONAL,
        email: 'test@example.com',
        fullName: '김테스트',
        phone: '010-1234-5678',
        birthDate: new Date('1990-01-01'),
        idNumber: '900101-1234567',
        authUserId: 'auth-123',
        profileData: { department: 'Engineering' }
      };

      const mockCreatedIdentity: UnifiedIdentity = {
        id: 'identity-123',
        ...createRequest,
        isVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockCreatedIdentity,
        error: null
      });

      const result = await identityService.createIdentity(createRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedIdentity);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('unified_identities');
    });

    test('should validate required fields for Personal ID', async () => {
      const invalidRequest: CreateIdentityRequest = {
        idType: IdType.PERSONAL,
        email: '', // Invalid empty email
        fullName: '김테스트',
        authUserId: 'auth-123'
      };

      const result = await identityService.createIdentity(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email is required');
    });

    test('should prevent duplicate email addresses', async () => {
      const createRequest: CreateIdentityRequest = {
        idType: IdType.PERSONAL,
        email: 'existing@example.com',
        fullName: '김테스트',
        authUserId: 'auth-123'
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value' }
      });

      const result = await identityService.createIdentity(createRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email already exists');
    });

    test('should retrieve Personal ID by ID', async () => {
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

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      const result = await identityService.getIdentityById('identity-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockIdentity);
    });

    test('should update Personal ID information', async () => {
      const updateRequest: UpdateIdentityRequest = {
        fullName: '김수정',
        phone: '010-9876-5432',
        profileData: { department: 'Marketing', level: 'Senior' }
      };

      const updatedIdentity: UnifiedIdentity = {
        id: 'identity-123',
        idType: IdType.PERSONAL,
        email: 'test@example.com',
        fullName: '김수정',
        phone: '010-9876-5432',
        authUserId: 'auth-123',
        isVerified: true,
        isActive: true,
        profileData: { department: 'Marketing', level: 'Senior' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedIdentity,
        error: null
      });

      const result = await identityService.updateIdentity('identity-123', updateRequest);

      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe('김수정');
      expect(result.data?.phone).toBe('010-9876-5432');
    });
  });

  describe('Corporate Identity Management', () => {
    test('should create Corporate ID with Personal ID linking', async () => {
      const createRequest: CreateIdentityRequest = {
        idType: IdType.CORPORATE,
        email: 'corp@example.com',
        fullName: '테스트 법인',
        authUserId: 'auth-456',
        linkedPersonalId: 'personal-123',
        idNumber: '123-45-67890', // Business Registration Number
        profileData: { companyType: 'Corporation' }
      };

      const mockCreatedIdentity: UnifiedIdentity = {
        id: 'identity-corp-123',
        ...createRequest,
        isVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock linked Personal ID verification
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'personal-123' },
        error: null
      });

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockCreatedIdentity,
        error: null
      });

      const result = await identityService.createIdentity(createRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedIdentity);
      expect(result.data?.linkedPersonalId).toBe('personal-123');
    });

    test('should require Personal ID link for Corporate ID', async () => {
      const invalidRequest: CreateIdentityRequest = {
        idType: IdType.CORPORATE,
        email: 'corp@example.com',
        fullName: '테스트 법인',
        authUserId: 'auth-456'
        // Missing linkedPersonalId
      };

      const result = await identityService.createIdentity(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Corporate ID requires linked Personal ID');
    });

    test('should validate linked Personal ID exists', async () => {
      const createRequest: CreateIdentityRequest = {
        idType: IdType.CORPORATE,
        email: 'corp@example.com',
        fullName: '테스트 법인',
        authUserId: 'auth-456',
        linkedPersonalId: 'non-existent-id'
      };

      // Mock Personal ID not found
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // PostgreSQL not found
      });

      const result = await identityService.createIdentity(createRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Linked Personal ID not found');
    });
  });

  describe('Identity with Role Context', () => {
    test('should retrieve identity with computed roles and business context', async () => {
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

      const mockPapers: Paper[] = [
        {
          id: 'paper-123',
          paperType: 'Employment Contract' as any,
          ownerIdentityId: 'identity-123',
          relatedBusinessId: 'business-123',
          paperData: {},
          isActive: true,
          validFrom: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockBusinesses: BusinessRegistration[] = [
        {
          id: 'business-123',
          registrationNumber: '123-45-67890',
          businessName: '테스트 회사',
          businessType: 'individual' as any,
          ownerIdentityId: 'owner-123',
          registrationData: {},
          verificationStatus: 'verified' as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock database calls
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      // Mock papers query
      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: mockPapers,
        error: null
      });

      // Mock business registrations query
      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: mockBusinesses,
        error: null
      });

      const result = await identityService.getIdentityWithContext('identity-123');

      expect(result.success).toBe(true);
      expect(result.data?.identity.id).toBe('identity-123');
      expect(result.data?.papers).toHaveLength(1);
      expect(result.data?.businessRegistrations).toHaveLength(1);
    });

    test('should handle identity not found', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await identityService.getIdentityWithContext('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Identity not found');
    });
  });

  describe('Identity Search and Filtering', () => {
    test('should search identities by email pattern', async () => {
      const mockIdentities: UnifiedIdentity[] = [
        {
          id: 'identity-1',
          idType: IdType.PERSONAL,
          email: 'john@example.com',
          fullName: 'John Doe',
          authUserId: 'auth-1',
          isVerified: true,
          isActive: true,
          profileData: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockSupabaseClient.from().select().ilike().limit().order.mockResolvedValue({
        data: mockIdentities,
        error: null
      });

      const result = await identityService.searchIdentities({
        emailPattern: '@example.com',
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].email).toContain('@example.com');
    });

    test('should filter identities by type', async () => {
      mockSupabaseClient.from().select().eq().order.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await identityService.searchIdentities({
        idType: IdType.CORPORATE,
        limit: 50
      });

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().select).toHaveBeenCalled();
    });
  });

  describe('Identity Verification', () => {
    test('should verify identity successfully', async () => {
      const verifiedIdentity: UnifiedIdentity = {
        id: 'identity-123',
        idType: IdType.PERSONAL,
        email: 'test@example.com',
        fullName: '김테스트',
        authUserId: 'auth-123',
        isVerified: true, // Changed to verified
        isActive: true,
        profileData: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: verifiedIdentity,
        error: null
      });

      const result = await identityService.verifyIdentity('identity-123', {
        verified: true,
        verificationData: { method: 'document', verifiedBy: 'admin-123' }
      });

      expect(result.success).toBe(true);
      expect(result.data?.isVerified).toBe(true);
    });

    test('should deactivate identity', async () => {
      const deactivatedIdentity: UnifiedIdentity = {
        id: 'identity-123',
        idType: IdType.PERSONAL,
        email: 'test@example.com',
        fullName: '김테스트',
        authUserId: 'auth-123',
        isVerified: true,
        isActive: false, // Deactivated
        profileData: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: deactivatedIdentity,
        error: null
      });

      const result = await identityService.deactivateIdentity('identity-123');

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(false);
    });
  });

  describe('Business Rules Validation', () => {
    test('should enforce email format validation', async () => {
      const createRequest: CreateIdentityRequest = {
        idType: IdType.PERSONAL,
        email: 'invalid-email',
        fullName: '김테스트',
        authUserId: 'auth-123'
      };

      const result = await identityService.createIdentity(createRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    test('should enforce phone number format', async () => {
      const createRequest: CreateIdentityRequest = {
        idType: IdType.PERSONAL,
        email: 'test@example.com',
        fullName: '김테스트',
        phone: '123-456', // Invalid format
        authUserId: 'auth-123'
      };

      const result = await identityService.createIdentity(createRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number format');
    });

    test('should validate Korean name format', async () => {
      const createRequest: CreateIdentityRequest = {
        idType: IdType.PERSONAL,
        email: 'test@example.com',
        fullName: 'A', // Too short
        authUserId: 'auth-123'
      };

      const result = await identityService.createIdentity(createRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Full name must be at least 2 characters');
    });
  });

  describe('Integration with Role Calculator', () => {
    test('should integrate with role calculation engine', async () => {
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

      // Mock successful identity retrieval
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      // Mock papers and business registrations (empty arrays)
      mockSupabaseClient.from().select().eq().mockResolvedValue({
        data: [],
        error: null
      });

      mockSupabaseClient.from().select().in().mockResolvedValue({
        data: [],
        error: null
      });

      const result = await identityService.getIdentityWithContext('identity-123');

      expect(result.success).toBe(true);
      // Should have calculated roles even if empty (SEEKER role)
      expect(result.data?.computedRoles).toBeDefined();
      expect(result.data?.primaryRole).toBe(RoleType.SEEKER);
    });
  });
});