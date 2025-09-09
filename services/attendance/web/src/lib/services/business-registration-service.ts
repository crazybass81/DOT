/**
 * Business Registration Service Implementation
 * Manages business entities and their lifecycle in ID-ROLE-PAPER system
 * 
 * Handles business creation, ownership validation, and business context management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  BusinessType,
  BusinessRegistration,
  UnifiedIdentity,
  VerificationStatus,
  CreateBusinessRegistrationRequest
} from '../../types/id-role-paper';

/**
 * Request types for Business Registration Service operations
 */
export interface CreateBusinessRequest {
  registrationNumber: string;
  businessName: string;
  businessType: BusinessType;
  ownerIdentityId: string;
  registrationData?: Record<string, any>;
}

export interface UpdateBusinessRequest {
  businessName?: string;
  registrationData?: Record<string, any>;
}

export interface BusinessSearchRequest {
  namePattern?: string;
  registrationNumber?: string;
  businessType?: BusinessType;
  ownerIdentityId?: string;
  verificationStatus?: VerificationStatus;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface VerifyBusinessRequest {
  status: VerificationStatus;
  verificationData?: Record<string, any>;
}

/**
 * Response types for Business Registration Service operations
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Business Registration Service - Core business entity management
 */
export class BusinessRegistrationService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Create a new business registration
   */
  async createBusiness(request: CreateBusinessRequest): Promise<ServiceResponse<BusinessRegistration>> {
    try {
      // Validate request data
      const validation = this.validateCreateRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Verify owner identity exists and is valid
      const ownerExists = await this.verifyOwnerIdentity(request.ownerIdentityId);
      if (!ownerExists) {
        return {
          success: false,
          error: 'Owner identity not found or invalid'
        };
      }

      // Check for duplicate registration number
      const duplicateCheck = await this.checkDuplicateRegistrationNumber(request.registrationNumber);
      if (duplicateCheck) {
        return {
          success: false,
          error: 'Business registration number already exists'
        };
      }

      // Create business registration record
      const businessData: Partial<BusinessRegistration> = {
        registrationNumber: request.registrationNumber,
        businessName: request.businessName,
        businessType: request.businessType,
        ownerIdentityId: request.ownerIdentityId,
        registrationData: request.registrationData || {},
        verificationStatus: VerificationStatus.PENDING,
        isActive: true
      };

      const { data, error } = await this.supabase
        .from('business_registrations')
        .insert([businessData])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create business registration: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as BusinessRegistration
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Retrieve business registration by ID
   */
  async getBusinessById(businessId: string): Promise<ServiceResponse<BusinessRegistration>> {
    try {
      const { data, error } = await this.supabase
        .from('business_registrations')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Business registration not found'
          };
        }

        return {
          success: false,
          error: `Failed to retrieve business registration: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as BusinessRegistration
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update business registration information
   */
  async updateBusiness(businessId: string, request: UpdateBusinessRequest): Promise<ServiceResponse<BusinessRegistration>> {
    try {
      // Validate update request
      const validation = this.validateUpdateRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      const updateData: Partial<BusinessRegistration> = {
        ...request,
        updatedAt: new Date()
      };

      const { data, error } = await this.supabase
        .from('business_registrations')
        .update(updateData)
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update business registration: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as BusinessRegistration
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Search business registrations with filters
   */
  async searchBusinesses(request: BusinessSearchRequest): Promise<ServiceResponse<BusinessRegistration[]>> {
    try {
      let query = this.supabase
        .from('business_registrations')
        .select('*');

      // Apply filters
      if (request.namePattern) {
        query = query.ilike('businessName', `%${request.namePattern}%`);
      }

      if (request.registrationNumber) {
        query = query.eq('registrationNumber', request.registrationNumber);
      }

      if (request.businessType) {
        query = query.eq('businessType', request.businessType);
      }

      if (request.ownerIdentityId) {
        query = query.eq('ownerIdentityId', request.ownerIdentityId);
      }

      if (request.verificationStatus) {
        query = query.eq('verificationStatus', request.verificationStatus);
      }

      if (request.isActive !== undefined) {
        query = query.eq('isActive', request.isActive);
      }

      // Apply pagination
      if (request.offset) {
        query = query.range(request.offset, (request.offset + (request.limit || 10)) - 1);
      } else if (request.limit) {
        query = query.limit(request.limit);
      }

      // Order by creation date
      query = query.order('createdAt', { ascending: false });

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: `Search failed: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as BusinessRegistration[]
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get all businesses owned by an identity
   */
  async getBusinessesByOwner(ownerIdentityId: string): Promise<ServiceResponse<BusinessRegistration[]>> {
    try {
      const { data, error } = await this.supabase
        .from('business_registrations')
        .select('*')
        .eq('ownerIdentityId', ownerIdentityId)
        .eq('isActive', true)
        .order('createdAt', { ascending: false });

      if (error) {
        return {
          success: false,
          error: `Failed to retrieve businesses: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as BusinessRegistration[]
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verify a business registration
   */
  async verifyBusiness(businessId: string, request: VerifyBusinessRequest): Promise<ServiceResponse<BusinessRegistration>> {
    try {
      const updateData = {
        verificationStatus: request.status,
        registrationData: request.verificationData ? {
          verificationData: request.verificationData
        } : undefined,
        updatedAt: new Date()
      };

      const { data, error } = await this.supabase
        .from('business_registrations')
        .update(updateData)
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to verify business registration: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as BusinessRegistration
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Deactivate a business registration
   */
  async deactivateBusiness(businessId: string): Promise<ServiceResponse<BusinessRegistration>> {
    try {
      const { data, error } = await this.supabase
        .from('business_registrations')
        .update({ 
          isActive: false,
          updatedAt: new Date()
        })
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to deactivate business registration: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as BusinessRegistration
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Transfer business ownership
   */
  async transferOwnership(businessId: string, newOwnerIdentityId: string): Promise<ServiceResponse<BusinessRegistration>> {
    try {
      // Verify new owner identity exists
      const ownerExists = await this.verifyOwnerIdentity(newOwnerIdentityId);
      if (!ownerExists) {
        return {
          success: false,
          error: 'New owner identity not found or invalid'
        };
      }

      const { data, error } = await this.supabase
        .from('business_registrations')
        .update({ 
          ownerIdentityId: newOwnerIdentityId,
          updatedAt: new Date()
        })
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to transfer business ownership: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as BusinessRegistration
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate create business request
   */
  private validateCreateRequest(request: CreateBusinessRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Registration number validation
    if (!request.registrationNumber || request.registrationNumber.trim() === '') {
      errors.push('Business registration number is required');
    } else if (!this.isValidRegistrationNumber(request.registrationNumber)) {
      errors.push('Invalid business registration number format');
    }

    // Business name validation
    if (!request.businessName || request.businessName.trim().length < 2) {
      errors.push('Business name must be at least 2 characters');
    }

    // Owner identity validation
    if (!request.ownerIdentityId || request.ownerIdentityId.trim() === '') {
      errors.push('Owner identity ID is required');
    }

    // Business type validation
    if (!Object.values(BusinessType).includes(request.businessType)) {
      errors.push('Invalid business type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate update business request
   */
  private validateUpdateRequest(request: UpdateBusinessRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Business name validation (if provided)
    if (request.businessName && request.businessName.trim().length < 2) {
      errors.push('Business name must be at least 2 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Verify owner identity exists and is valid for business ownership
   */
  private async verifyOwnerIdentity(identityId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('unified_identities')
        .select('id, idType, isVerified, isActive')
        .eq('id', identityId)
        .single();

      if (error || !data) {
        return false;
      }

      // Owner must be verified and active
      return data.isVerified && data.isActive;
    } catch {
      return false;
    }
  }

  /**
   * Check if registration number already exists
   */
  private async checkDuplicateRegistrationNumber(registrationNumber: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('business_registrations')
        .select('id')
        .eq('registrationNumber', registrationNumber)
        .maybeSingle();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Korean business registration number format validation
   */
  private isValidRegistrationNumber(registrationNumber: string): boolean {
    // Korean business registration number formats:
    // Individual: XXX-XX-XXXXX (10 digits)
    // Corporate: XXXXXX-XXXXXXX (13 digits)
    const individualPattern = /^\d{3}-\d{2}-\d{5}$/;
    const corporatePattern = /^\d{6}-\d{7}$/;
    
    return individualPattern.test(registrationNumber) || corporatePattern.test(registrationNumber);
  }
}

// Export singleton instance factory
export const createBusinessRegistrationService = (supabaseClient: SupabaseClient): BusinessRegistrationService => {
  return new BusinessRegistrationService(supabaseClient);
};