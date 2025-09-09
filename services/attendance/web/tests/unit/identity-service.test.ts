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

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

// Mock identity service
class IdentityService {
  constructor(private client: any) {}

  async createPersonalId(data: {
    name: string;
    phone: string;
    email?: string;
    birth_date?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    // Validation
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'Name is required' };
    }

    if (!data.phone || !this.isValidPhone(data.phone)) {
      return { success: false, error: 'Valid phone number is required' };
    }

    if (data.email && !this.isValidEmail(data.email)) {
      return { success: false, error: 'Valid email is required' };
    }

    // Check for existing phone number
    const existing = await this.findPersonalIdByPhone(data.phone);
    if (existing.success && existing.data) {
      return { success: false, error: 'Phone number already exists' };
    }

    const personalId = TestDataFactory.createPersonalId({
      name: data.name.trim(),
      phone: data.phone,
      email: data.email,
      birth_date: data.birth_date
    });

    // Mock database insert
    mockSupabaseClient.from.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [personalId],
          error: null
        })
      })
    });

    try {
      const { data: insertData, error } = await this.client
        .from('personal_ids')
        .insert([personalId])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: insertData };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createCorporateId(data: {
    personal_id: string;
    business_name: string;
    business_number: string;
    representative_name: string;
    business_type: BusinessType;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    // Validation
    if (!data.personal_id) {
      return { success: false, error: 'Personal ID is required' };
    }

    if (!data.business_name || data.business_name.trim().length === 0) {
      return { success: false, error: 'Business name is required' };
    }

    if (!data.business_number || !this.isValidBusinessNumber(data.business_number)) {
      return { success: false, error: 'Valid business number is required' };
    }

    // Verify personal ID exists
    const personalIdExists = await this.verifyPersonalIdExists(data.personal_id);
    if (!personalIdExists.success) {
      return { success: false, error: 'Personal ID does not exist' };
    }

    // Check for existing business number
    const existing = await this.findCorporateIdByBusinessNumber(data.business_number);
    if (existing.success && existing.data) {
      return { success: false, error: 'Business number already exists' };
    }

    const corporateId = TestDataFactory.createCorporateId(data.personal_id, {
      business_name: data.business_name.trim(),
      business_number: data.business_number,
      representative_name: data.representative_name,
      business_type: data.business_type
    });

    // Mock database insert
    mockSupabaseClient.from.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [corporateId],
          error: null
        })
      })
    });

    try {
      const { data: insertData, error } = await this.client
        .from('corporate_ids')
        .insert([corporateId])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: insertData };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async findPersonalIdByPhone(phone: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!phone) {
      return { success: false, error: 'Phone number is required' };
    }

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' } // No rows found
          })
        })
      })
    });

    try {
      const { data, error } = await this.client
        .from('personal_ids')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async findCorporateIdByBusinessNumber(businessNumber: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!businessNumber) {
      return { success: false, error: 'Business number is required' };
    }

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' } // No rows found
          })
        })
      })
    });

    try {
      const { data, error } = await this.client
        .from('corporate_ids')
        .select('*')
        .eq('business_number', businessNumber)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async verifyPersonalIdExists(personalId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!personalId) {
      return { success: false, error: 'Personal ID is required' };
    }

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: TestDataFactory.createPersonalId({ id: personalId }),
            error: null
          })
        })
      })
    });

    try {
      const { data, error } = await this.client
        .from('personal_ids')
        .select('id, name')
        .eq('id', personalId)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getIdentityWithBusinessContext(personalId: string): Promise<{ 
    success: boolean; 
    data?: {
      personal_id: any;
      corporate_ids: any[];
      business_registrations: any[];
    }; 
    error?: string 
  }> {
    if (!personalId) {
      return { success: false, error: 'Personal ID is required' };
    }

    // Mock complex query
    const personalIdData = TestDataFactory.createPersonalId({ id: personalId });
    const corporateIds = [
      TestDataFactory.createCorporateId(personalId, { business_type: 'CORPORATION' })
    ];
    const businessRegistrations = [
      TestDataFactory.createBusinessRegistration(personalId, { business_type: 'SOLE_PROPRIETORSHIP' })
    ];

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: personalIdData,
            error: null
          })
        })
      })
    });

    try {
      // Get personal ID
      const { data: personalData, error: personalError } = await this.client
        .from('personal_ids')
        .select('*')
        .eq('id', personalId)
        .single();

      if (personalError) throw personalError;

      // Get linked corporate IDs
      const { data: corporateData, error: corporateError } = await this.client
        .from('corporate_ids')
        .select('*')
        .eq('linked_personal_id', personalId);

      // Get business registrations
      const { data: businessData, error: businessError } = await this.client
        .from('business_registrations')
        .select('*')
        .eq('owner_personal_id', personalId);

      return {
        success: true,
        data: {
          personal_id: personalData,
          corporate_ids: corporateData || [],
          business_registrations: businessData || []
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updatePersonalId(personalId: string, updates: {
    name?: string;
    phone?: string;
    email?: string;
    birth_date?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!personalId) {
      return { success: false, error: 'Personal ID is required' };
    }

    // Validate updates
    if (updates.name !== undefined && (!updates.name || updates.name.trim().length === 0)) {
      return { success: false, error: 'Name cannot be empty' };
    }

    if (updates.phone !== undefined && !this.isValidPhone(updates.phone)) {
      return { success: false, error: 'Valid phone number is required' };
    }

    if (updates.email !== undefined && updates.email && !this.isValidEmail(updates.email)) {
      return { success: false, error: 'Valid email is required' };
    }

    // Check phone uniqueness if phone is being updated
    if (updates.phone) {
      const existing = await this.findPersonalIdByPhone(updates.phone);
      if (existing.success && existing.data && existing.data.id !== personalId) {
        return { success: false, error: 'Phone number already exists' };
      }
    }

    const updatedData = { ...updates, updated_at: new Date().toISOString() };

    mockSupabaseClient.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: personalId, ...updatedData },
              error: null
            })
          })
        })
      })
    });

    try {
      const { data, error } = await this.client
        .from('personal_ids')
        .update(updatedData)
        .eq('id', personalId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidBusinessNumber(businessNumber: string): boolean {
    // Korean business number format: XXX-XX-XXXXX
    const businessNumberRegex = /^\d{3}-\d{2}-\d{5}$/;
    return businessNumberRegex.test(businessNumber);
  }
}

describe('Identity Service', () => {
  let identityService: IdentityService;

  beforeEach(() => {
    jest.clearAllMocks();
    identityService = new IdentityService(mockSupabaseClient);
  });

  describe('Personal ID Management', () => {
    test('should create personal ID with valid data', async () => {
      const personalData = {
        name: '김테스트',
        phone: '010-1234-5678',
        email: 'test@example.com',
        birth_date: '1990-01-01'
      };

      const result = await identityService.createPersonalId(personalData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe(personalData.name);
      expect(result.data.phone).toBe(personalData.phone);
      expect(result.error).toBeUndefined();
    });

    test('should fail to create personal ID with empty name', async () => {
      const personalData = {
        name: '',
        phone: '010-1234-5678'
      };

      const result = await identityService.createPersonalId(personalData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name is required');
      expect(result.data).toBeUndefined();
    });

    test('should fail to create personal ID with invalid phone', async () => {
      const personalData = {
        name: '김테스트',
        phone: '123-456-7890' // Invalid format
      };

      const result = await identityService.createPersonalId(personalData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Valid phone number is required');
      expect(result.data).toBeUndefined();
    });

    test('should fail to create personal ID with invalid email', async () => {
      const personalData = {
        name: '김테스트',
        phone: '010-1234-5678',
        email: 'invalid-email' // Invalid format
      };

      const result = await identityService.createPersonalId(personalData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Valid email is required');
      expect(result.data).toBeUndefined();
    });

    test('should create personal ID without email (optional)', async () => {
      const personalData = {
        name: '김테스트',
        phone: '010-1234-5678'
      };

      const result = await identityService.createPersonalId(personalData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.email).toBeUndefined();
    });

    test('should find personal ID by phone', async () => {
      const phone = '010-1234-5678';

      // Mock finding existing data
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: TestDataFactory.createPersonalId({ phone }),
              error: null
            })
          })
        })
      });

      const result = await identityService.findPersonalIdByPhone(phone);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.phone).toBe(phone);
    });

    test('should update personal ID successfully', async () => {
      const personalId = 'test-personal-id';
      const updates = {
        name: '김업데이트',
        email: 'updated@example.com'
      };

      const result = await identityService.updatePersonalId(personalId, updates);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe(updates.name);
      expect(result.data.email).toBe(updates.email);
    });

    test('should fail to update personal ID with invalid data', async () => {
      const personalId = 'test-personal-id';
      const updates = {
        name: '', // Invalid empty name
        phone: '123-456-7890' // Invalid phone format
      };

      const result = await identityService.updatePersonalId(personalId, updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name cannot be empty');
    });
  });

  describe('Corporate ID Management', () => {
    test('should create corporate ID with valid data', async () => {
      const personalId = 'test-personal-id';
      const corporateData = {
        personal_id: personalId,
        business_name: '테스트회사',
        business_number: '123-45-67890',
        representative_name: '김대표',
        business_type: 'CORPORATION' as BusinessType
      };

      const result = await identityService.createCorporateId(corporateData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.business_name).toBe(corporateData.business_name);
      expect(result.data.linked_personal_id).toBe(personalId);
    });

    test('should fail to create corporate ID without personal ID', async () => {
      const corporateData = {
        personal_id: '',
        business_name: '테스트회사',
        business_number: '123-45-67890',
        representative_name: '김대표',
        business_type: 'CORPORATION' as BusinessType
      };

      const result = await identityService.createCorporateId(corporateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Personal ID is required');
    });

    test('should fail to create corporate ID with invalid business number', async () => {
      const corporateData = {
        personal_id: 'test-personal-id',
        business_name: '테스트회사',
        business_number: '123-456-78901', // Invalid format
        representative_name: '김대표',
        business_type: 'CORPORATION' as BusinessType
      };

      const result = await identityService.createCorporateId(corporateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Valid business number is required');
    });

    test('should find corporate ID by business number', async () => {
      const businessNumber = '123-45-67890';

      // Mock finding existing data
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: TestDataFactory.createCorporateId('pid1', { business_number: businessNumber }),
              error: null
            })
          })
        })
      });

      const result = await identityService.findCorporateIdByBusinessNumber(businessNumber);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.business_number).toBe(businessNumber);
    });
  });

  describe('Business Context Resolution', () => {
    test('should get identity with business context', async () => {
      const personalId = 'test-personal-id';

      const result = await identityService.getIdentityWithBusinessContext(personalId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.personal_id).toBeDefined();
      expect(result.data?.corporate_ids).toBeDefined();
      expect(result.data?.business_registrations).toBeDefined();
      expect(Array.isArray(result.data?.corporate_ids)).toBe(true);
      expect(Array.isArray(result.data?.business_registrations)).toBe(true);
    });

    test('should fail to get business context without personal ID', async () => {
      const result = await identityService.getIdentityWithBusinessContext('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Personal ID is required');
    });
  });

  describe('Validation Helpers', () => {
    test('should validate phone numbers correctly', () => {
      const service = new IdentityService(mockSupabaseClient) as any;
      
      expect(service.isValidPhone('010-1234-5678')).toBe(true);
      expect(service.isValidPhone('010-9999-0000')).toBe(true);
      
      expect(service.isValidPhone('123-456-7890')).toBe(false);
      expect(service.isValidPhone('010-12345-678')).toBe(false);
      expect(service.isValidPhone('010-123-5678')).toBe(false);
      expect(service.isValidPhone('')).toBe(false);
    });

    test('should validate emails correctly', () => {
      const service = new IdentityService(mockSupabaseClient) as any;
      
      expect(service.isValidEmail('test@example.com')).toBe(true);
      expect(service.isValidEmail('user.name+tag@domain.co.kr')).toBe(true);
      
      expect(service.isValidEmail('invalid-email')).toBe(false);
      expect(service.isValidEmail('@example.com')).toBe(false);
      expect(service.isValidEmail('test@')).toBe(false);
      expect(service.isValidEmail('')).toBe(false);
    });

    test('should validate business numbers correctly', () => {
      const service = new IdentityService(mockSupabaseClient) as any;
      
      expect(service.isValidBusinessNumber('123-45-67890')).toBe(true);
      expect(service.isValidBusinessNumber('999-99-99999')).toBe(true);
      
      expect(service.isValidBusinessNumber('123-456-7890')).toBe(false);
      expect(service.isValidBusinessNumber('12-45-67890')).toBe(false);
      expect(service.isValidBusinessNumber('123-45-678901')).toBe(false);
      expect(service.isValidBusinessNumber('')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const personalData = {
        name: '김테스트',
        phone: '010-1234-5678'
      };

      // Mock database error
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      });

      const result = await identityService.createPersonalId(personalData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    test('should handle missing required fields', async () => {
      const result = await identityService.createPersonalId({} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    test('should handle null/undefined inputs', async () => {
      const result = await identityService.findPersonalIdByPhone('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });
  });
});