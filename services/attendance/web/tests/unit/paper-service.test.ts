/**
 * Paper Service Unit Tests
 * TDD implementation for ID-ROLE-PAPER Paper Management
 */

import { 
  PaperService,
  CreatePaperRequest,
  UpdatePaperRequest,
  PaperSearchRequest
} from '../../src/lib/services/paper-service';
import { 
  PaperType,
  Paper,
  UnifiedIdentity,
  BusinessRegistration,
  VerificationStatus
} from '../../src/types/id-role-paper';

// Mock Supabase client with chainable methods
const mockSupabaseClient = {
  from: jest.fn(() => {
    const selectChain = {
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
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

describe('Paper Service', () => {
  let paperService: PaperService;

  beforeEach(() => {
    paperService = new PaperService(mockSupabaseClient as any);
    jest.clearAllMocks();
  });

  describe('Business Registration Paper Management', () => {
    test('should create Business Registration paper with valid data', async () => {
      const createRequest: CreatePaperRequest = {
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'identity-123',
        paperData: {
          registrationNumber: '123-45-67890',
          businessName: '테스트 사업자',
          businessType: 'individual',
          registrationDate: '2023-01-15'
        },
        validFrom: new Date('2023-01-15'),
        validUntil: new Date('2028-01-15')
      };

      const mockCreatedPaper: Paper = {
        id: 'paper-123',
        ...createRequest,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock owner verification
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'identity-123', isVerified: true, isActive: true },
        error: null
      });

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockCreatedPaper,
        error: null
      });

      const result = await paperService.createPaper(createRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedPaper);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('papers');
    });

    test('should validate required fields for Business Registration', async () => {
      const invalidRequest: CreatePaperRequest = {
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'identity-123',
        paperData: {
          // Missing registrationNumber and businessName
          businessType: 'individual'
        }
      };

      const result = await paperService.createPaper(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Business registration number is required');
      expect(result.error).toContain('Business name is required');
    });
  });

  describe('Employment Contract Paper Management', () => {
    test('should create Employment Contract with business context', async () => {
      const createRequest: CreatePaperRequest = {
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          position: 'Software Engineer',
          startDate: '2023-03-01',
          salary: 5000000,
          employmentType: 'full-time'
        },
        validFrom: new Date('2023-03-01')
      };

      const mockCreatedPaper: Paper = {
        id: 'paper-employment-123',
        ...createRequest,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock owner verification
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'identity-123', isVerified: true, isActive: true },
        error: null
      });

      // Mock business context validation
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { 
          id: 'business-123', 
          ownerIdentityId: 'owner-123', 
          isActive: true,
          verificationStatus: 'verified' 
        },
        error: null
      });

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockCreatedPaper,
        error: null
      });

      const result = await paperService.createPaper(createRequest);

      expect(result.success).toBe(true);
      expect(result.data?.paperType).toBe(PaperType.EMPLOYMENT_CONTRACT);
      expect(result.data?.relatedBusinessId).toBe('business-123');
    });

    test('should require business context for Employment Contract', async () => {
      const invalidRequest: CreatePaperRequest = {
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        // Missing relatedBusinessId
        paperData: {
          position: 'Software Engineer',
          startDate: '2023-03-01'
        }
      };

      const result = await paperService.createPaper(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Employment contract requires business context');
    });

    test('should validate required employment fields', async () => {
      const invalidRequest: CreatePaperRequest = {
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          // Missing position and startDate
          salary: 5000000
        }
      };

      const result = await paperService.createPaper(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Employee position is required');
      expect(result.error).toContain('Employment start date is required');
    });
  });

  describe('Authority Delegation Paper Management', () => {
    test('should create Authority Delegation with proper delegation structure', async () => {
      const createRequest: CreatePaperRequest = {
        paperType: PaperType.AUTHORITY_DELEGATION,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          delegatedAuthorities: ['attendance_management', 'employee_reports', 'schedule_approval'],
          delegatedBy: 'manager-identity-456',
          delegationLevel: 'team_lead',
          effectiveDate: '2023-04-01'
        },
        validFrom: new Date('2023-04-01'),
        validUntil: new Date('2024-04-01')
      };

      const mockCreatedPaper: Paper = {
        id: 'paper-authority-123',
        ...createRequest,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock owner verification
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'identity-123', isVerified: true, isActive: true },
        error: null
      });

      // Mock business context validation
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { 
          id: 'business-123', 
          ownerIdentityId: 'owner-123', 
          isActive: true,
          verificationStatus: 'verified' 
        },
        error: null
      });

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockCreatedPaper,
        error: null
      });

      const result = await paperService.createPaper(createRequest);

      expect(result.success).toBe(true);
      expect(result.data?.paperData.delegatedAuthorities).toEqual([
        'attendance_management', 'employee_reports', 'schedule_approval'
      ]);
      expect(result.data?.paperData.delegatedBy).toBe('manager-identity-456');
    });

    test('should validate authority delegation requirements', async () => {
      const invalidRequest: CreatePaperRequest = {
        paperType: PaperType.AUTHORITY_DELEGATION,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          // Missing delegatedAuthorities array and delegatedBy
          delegationLevel: 'team_lead'
        }
      };

      const result = await paperService.createPaper(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Delegated authorities list is required');
      expect(result.error).toContain('Delegator identity is required');
    });
  });

  describe('Supervisor Authority Delegation Paper Management', () => {
    test('should create Supervisor Authority Delegation', async () => {
      const createRequest: CreatePaperRequest = {
        paperType: PaperType.SUPERVISOR_AUTHORITY_DELEGATION,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          supervisoryLevel: 'department_supervisor',
          delegatedBy: 'director-identity-789',
          supervisedDepartments: ['engineering', 'qa'],
          approvalLimits: {
            timeoff: true,
            overtime: true,
            schedule_changes: true
          }
        }
      };

      const mockCreatedPaper: Paper = {
        id: 'paper-supervisor-123',
        ...createRequest,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock owner verification
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'identity-123', isVerified: true, isActive: true },
        error: null
      });

      // Mock business context validation
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { 
          id: 'business-123', 
          ownerIdentityId: 'owner-123', 
          isActive: true,
          verificationStatus: 'verified' 
        },
        error: null
      });

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockCreatedPaper,
        error: null
      });

      const result = await paperService.createPaper(createRequest);

      expect(result.success).toBe(true);
      expect(result.data?.paperData.supervisoryLevel).toBe('department_supervisor');
    });
  });

  describe('Franchise Agreement Paper Management', () => {
    test('should create Franchise Agreement with territory and fee info', async () => {
      const createRequest: CreatePaperRequest = {
        paperType: PaperType.FRANCHISE_AGREEMENT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          franchiseTerritory: '서울특별시 강남구',
          franchiseFee: {
            initialFee: 50000000,
            monthlyRoyalty: 0.05,
            marketingFee: 0.02
          },
          franchiseBrand: '맛있는 치킨',
          agreementTerm: '5 years'
        },
        validFrom: new Date('2023-05-01'),
        validUntil: new Date('2028-05-01')
      };

      const mockCreatedPaper: Paper = {
        id: 'paper-franchise-123',
        ...createRequest,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock owner verification
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'identity-123', isVerified: true, isActive: true },
        error: null
      });

      // Mock business context validation (business owner check)
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { 
          id: 'business-123', 
          ownerIdentityId: 'identity-123', // Same as paper owner for franchise agreement
          isActive: true,
          verificationStatus: 'verified' 
        },
        error: null
      });

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockCreatedPaper,
        error: null
      });

      const result = await paperService.createPaper(createRequest);

      expect(result.success).toBe(true);
      expect(result.data?.paperData.franchiseTerritory).toBe('서울특별시 강남구');
      expect(result.data?.paperData.franchiseFee.initialFee).toBe(50000000);
    });

    test('should validate franchise agreement requirements', async () => {
      const invalidRequest: CreatePaperRequest = {
        paperType: PaperType.FRANCHISE_AGREEMENT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          // Missing franchiseTerritory and franchiseFee
          franchiseBrand: '맛있는 치킨'
        }
      };

      const result = await paperService.createPaper(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Franchise territory is required');
      expect(result.error).toContain('Franchise fee information is required');
    });
  });

  describe('Franchise HQ Registration Paper Management', () => {
    test('should create Franchise HQ Registration', async () => {
      const createRequest: CreatePaperRequest = {
        paperType: PaperType.FRANCHISE_HQ_REGISTRATION,
        ownerIdentityId: 'identity-123',
        paperData: {
          franchiseBrand: '맛있는 치킨 본사',
          franchiseSystem: {
            businessModel: 'food_service',
            standardOperatingProcedures: true,
            trainingProgram: true,
            marketingSupport: true
          },
          registrationAuthority: '한국프랜차이즈협회',
          franchiseRegistrationNumber: 'FR-2023-001234'
        }
      };

      const mockCreatedPaper: Paper = {
        id: 'paper-franchise-hq-123',
        ...createRequest,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock owner verification
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'identity-123', isVerified: true, isActive: true },
        error: null
      });

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockCreatedPaper,
        error: null
      });

      const result = await paperService.createPaper(createRequest);

      expect(result.success).toBe(true);
      expect(result.data?.paperData.franchiseBrand).toBe('맛있는 치킨 본사');
      expect(result.data?.paperData.franchiseSystem.businessModel).toBe('food_service');
    });

    test('should validate franchise HQ registration requirements', async () => {
      const invalidRequest: CreatePaperRequest = {
        paperType: PaperType.FRANCHISE_HQ_REGISTRATION,
        ownerIdentityId: 'identity-123',
        paperData: {
          // Missing franchiseBrand and franchiseSystem
          registrationAuthority: '한국프랜차이즈협회'
        }
      };

      const result = await paperService.createPaper(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Franchise brand information is required');
      expect(result.error).toContain('Franchise system details are required');
    });
  });

  describe('Paper Retrieval and Search', () => {
    test('should retrieve paper by ID', async () => {
      const mockPaper: Paper = {
        id: 'paper-123',
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'identity-123',
        paperData: { registrationNumber: '123-45-67890' },
        isActive: true,
        validFrom: new Date('2023-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockPaper,
        error: null
      });

      const result = await paperService.getPaperById('paper-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPaper);
    });

    test('should search papers by owner identity', async () => {
      const mockPapers: Paper[] = [
        {
          id: 'paper-1',
          paperType: PaperType.BUSINESS_REGISTRATION,
          ownerIdentityId: 'identity-123',
          paperData: { registrationNumber: '123-45-67890' },
          isActive: true,
          validFrom: new Date('2023-01-01'),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockSupabaseClient.from().select().eq().order.mockResolvedValue({
        data: mockPapers,
        error: null
      });

      const result = await paperService.getPapersByOwner('identity-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].ownerIdentityId).toBe('identity-123');
    });

    test('should search papers with filters', async () => {
      const searchRequest: PaperSearchRequest = {
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        relatedBusinessId: 'business-123',
        isActive: true,
        limit: 10
      };

      mockSupabaseClient.from().select().eq().limit().order.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await paperService.searchPapers(searchRequest);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().select).toHaveBeenCalled();
    });
  });

  describe('Paper Lifecycle Management', () => {
    test('should update paper information', async () => {
      const updateRequest: UpdatePaperRequest = {
        paperData: { position: 'Senior Software Engineer', salary: 6000000 },
        validUntil: new Date('2025-12-31')
      };

      const updatedPaper: Paper = {
        id: 'paper-123',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        paperData: updateRequest.paperData!,
        isActive: true,
        validFrom: new Date('2023-03-01'),
        validUntil: updateRequest.validUntil,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedPaper,
        error: null
      });

      const result = await paperService.updatePaper('paper-123', updateRequest);

      expect(result.success).toBe(true);
      expect(result.data?.paperData.position).toBe('Senior Software Engineer');
      expect(result.data?.paperData.salary).toBe(6000000);
    });

    test('should validate paper', async () => {
      const validateRequest = {
        verificationStatus: VerificationStatus.VERIFIED,
        verificationData: { verifiedBy: 'admin-123', verificationDate: '2023-06-01' }
      };

      const validatedPaper: Paper = {
        id: 'paper-123',
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'identity-123',
        paperData: {
          registrationNumber: '123-45-67890',
          verificationStatus: VerificationStatus.VERIFIED,
          verifiedBy: 'admin-123',
          verificationDate: '2023-06-01'
        },
        isActive: true,
        validFrom: new Date('2023-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: validatedPaper,
        error: null
      });

      const result = await paperService.validatePaper('paper-123', validateRequest);

      expect(result.success).toBe(true);
      expect(result.data?.paperData.verificationStatus).toBe(VerificationStatus.VERIFIED);
    });

    test('should deactivate paper', async () => {
      const deactivatedPaper: Paper = {
        id: 'paper-123',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        paperData: { position: 'Software Engineer' },
        isActive: false,
        validFrom: new Date('2023-03-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: deactivatedPaper,
        error: null
      });

      const result = await paperService.deactivatePaper('paper-123');

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(false);
    });

    test('should extend paper validity', async () => {
      const newValidUntil = new Date('2025-12-31');
      
      const extendedPaper: Paper = {
        id: 'paper-123',
        paperType: PaperType.FRANCHISE_AGREEMENT,
        ownerIdentityId: 'identity-123',
        paperData: { franchiseTerritory: '서울특별시 강남구' },
        isActive: true,
        validFrom: new Date('2023-01-01'),
        validUntil: newValidUntil,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: extendedPaper,
        error: null
      });

      const result = await paperService.extendPaperValidity('paper-123', newValidUntil);

      expect(result.success).toBe(true);
      expect(result.data?.validUntil).toEqual(newValidUntil);
    });
  });

  describe('Business Rules Validation', () => {
    test('should enforce owner identity verification', async () => {
      const createRequest: CreatePaperRequest = {
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'unverified-identity',
        paperData: {
          registrationNumber: '123-45-67890',
          businessName: '테스트 사업자'
        }
      };

      // Mock unverified owner
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { id: 'unverified-identity', isVerified: false, isActive: true },
        error: null
      });

      const result = await paperService.createPaper(createRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Owner identity not found or invalid');
    });

    test('should validate date consistency', async () => {
      const invalidRequest: CreatePaperRequest = {
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'business-123',
        paperData: {
          position: 'Software Engineer',
          startDate: '2023-03-01'
        },
        validFrom: new Date('2023-12-31'), // After validUntil
        validUntil: new Date('2023-06-01')
      };

      const result = await paperService.createPaper(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Valid from date must be before valid until date');
    });

    test('should handle inactive business context', async () => {
      const createRequest: CreatePaperRequest = {
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-123',
        relatedBusinessId: 'inactive-business',
        paperData: {
          position: 'Software Engineer',
          startDate: '2023-03-01'
        }
      };

      // Mock owner verification
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'identity-123', isVerified: true, isActive: true },
        error: null
      });

      // Mock inactive business
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { 
          id: 'inactive-business', 
          ownerIdentityId: 'owner-123', 
          isActive: false, // Inactive business
          verificationStatus: 'verified' 
        },
        error: null
      });

      const result = await paperService.createPaper(createRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Business is not active');
    });
  });
});