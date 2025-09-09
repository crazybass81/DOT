/**
 * Paper Service Implementation
 * Core paper management for ID-ROLE-PAPER system
 * 
 * Handles all 6 paper types with business context validation and lifecycle management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  PaperType,
  Paper,
  UnifiedIdentity,
  BusinessRegistration,
  VerificationStatus
} from '../../types/id-role-paper';

/**
 * Request types for Paper Service operations
 */
export interface CreatePaperRequest {
  paperType: PaperType;
  ownerIdentityId: string;
  relatedBusinessId?: string;
  paperData: Record<string, any>;
  validFrom?: Date;
  validUntil?: Date;
}

export interface UpdatePaperRequest {
  paperData?: Record<string, any>;
  validFrom?: Date;
  validUntil?: Date;
  isActive?: boolean;
}

export interface PaperSearchRequest {
  ownerIdentityId?: string;
  relatedBusinessId?: string;
  paperType?: PaperType;
  isActive?: boolean;
  validOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ValidatePaperRequest {
  verificationStatus: VerificationStatus;
  verificationData?: Record<string, any>;
}

/**
 * Response types for Paper Service operations
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Paper Service - Core paper management functionality
 */
export class PaperService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Create a new paper record
   */
  async createPaper(request: CreatePaperRequest): Promise<ServiceResponse<Paper>> {
    try {
      // Validate request data
      const validation = this.validateCreateRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Verify owner identity exists
      const ownerExists = await this.verifyOwnerIdentity(request.ownerIdentityId);
      if (!ownerExists) {
        return {
          success: false,
          error: 'Owner identity not found or invalid'
        };
      }

      // Validate business context if provided
      if (request.relatedBusinessId) {
        const businessValid = await this.validateBusinessContext(
          request.relatedBusinessId,
          request.ownerIdentityId,
          request.paperType
        );
        if (!businessValid.isValid) {
          return {
            success: false,
            error: businessValid.error
          };
        }
      }

      // Validate paper type specific requirements
      const paperValidation = this.validatePaperTypeRequirements(request);
      if (!paperValidation.isValid) {
        return {
          success: false,
          error: paperValidation.errors.join(', ')
        };
      }

      // Create paper record
      const paperData: Partial<Paper> = {
        paperType: request.paperType,
        ownerIdentityId: request.ownerIdentityId,
        relatedBusinessId: request.relatedBusinessId,
        paperData: request.paperData,
        isActive: true,
        validFrom: request.validFrom || new Date(),
        validUntil: request.validUntil
      };

      const { data, error } = await this.supabase
        .from('papers')
        .insert([paperData])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create paper: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as Paper
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Retrieve paper by ID
   */
  async getPaperById(paperId: string): Promise<ServiceResponse<Paper>> {
    try {
      const { data, error } = await this.supabase
        .from('papers')
        .select('*')
        .eq('id', paperId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Paper not found'
          };
        }

        return {
          success: false,
          error: `Failed to retrieve paper: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as Paper
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update paper information
   */
  async updatePaper(paperId: string, request: UpdatePaperRequest): Promise<ServiceResponse<Paper>> {
    try {
      // Validate update request
      const validation = this.validateUpdateRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      const updateData: Partial<Paper> = {
        ...request,
        updatedAt: new Date()
      };

      const { data, error } = await this.supabase
        .from('papers')
        .update(updateData)
        .eq('id', paperId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update paper: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as Paper
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Search papers with filters
   */
  async searchPapers(request: PaperSearchRequest): Promise<ServiceResponse<Paper[]>> {
    try {
      let query = this.supabase
        .from('papers')
        .select('*');

      // Apply filters
      if (request.ownerIdentityId) {
        query = query.eq('ownerIdentityId', request.ownerIdentityId);
      }

      if (request.relatedBusinessId) {
        query = query.eq('relatedBusinessId', request.relatedBusinessId);
      }

      if (request.paperType) {
        query = query.eq('paperType', request.paperType);
      }

      if (request.isActive !== undefined) {
        query = query.eq('isActive', request.isActive);
      }

      // Filter only valid papers (not expired)
      if (request.validOnly) {
        const now = new Date().toISOString();
        query = query.or(`validUntil.is.null,validUntil.gte.${now}`);
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
        data: data as Paper[]
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get papers by owner identity
   */
  async getPapersByOwner(ownerIdentityId: string): Promise<ServiceResponse<Paper[]>> {
    try {
      const { data, error } = await this.supabase
        .from('papers')
        .select('*')
        .eq('ownerIdentityId', ownerIdentityId)
        .eq('isActive', true)
        .order('createdAt', { ascending: false });

      if (error) {
        return {
          success: false,
          error: `Failed to retrieve papers: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as Paper[]
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get papers by business context
   */
  async getPapersByBusiness(businessId: string): Promise<ServiceResponse<Paper[]>> {
    try {
      const { data, error } = await this.supabase
        .from('papers')
        .select('*')
        .eq('relatedBusinessId', businessId)
        .eq('isActive', true)
        .order('createdAt', { ascending: false });

      if (error) {
        return {
          success: false,
          error: `Failed to retrieve business papers: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as Paper[]
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate a paper record
   */
  async validatePaper(paperId: string, request: ValidatePaperRequest): Promise<ServiceResponse<Paper>> {
    try {
      const updateData = {
        paperData: request.verificationData ? {
          ...request.verificationData,
          verificationStatus: request.verificationStatus
        } : undefined,
        updatedAt: new Date()
      };

      const { data, error } = await this.supabase
        .from('papers')
        .update(updateData)
        .eq('id', paperId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to validate paper: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as Paper
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Deactivate a paper record
   */
  async deactivatePaper(paperId: string): Promise<ServiceResponse<Paper>> {
    try {
      const { data, error } = await this.supabase
        .from('papers')
        .update({ 
          isActive: false,
          updatedAt: new Date()
        })
        .eq('id', paperId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to deactivate paper: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as Paper
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extend paper validity period
   */
  async extendPaperValidity(paperId: string, newValidUntil: Date): Promise<ServiceResponse<Paper>> {
    try {
      const { data, error } = await this.supabase
        .from('papers')
        .update({ 
          validUntil: newValidUntil,
          updatedAt: new Date()
        })
        .eq('id', paperId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to extend paper validity: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as Paper
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate create paper request
   */
  private validateCreateRequest(request: CreatePaperRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Paper type validation
    if (!Object.values(PaperType).includes(request.paperType)) {
      errors.push('Invalid paper type');
    }

    // Owner identity validation
    if (!request.ownerIdentityId || request.ownerIdentityId.trim() === '') {
      errors.push('Owner identity ID is required');
    }

    // Paper data validation
    if (!request.paperData || Object.keys(request.paperData).length === 0) {
      errors.push('Paper data is required');
    }

    // Date validation
    if (request.validFrom && request.validUntil && request.validFrom >= request.validUntil) {
      errors.push('Valid from date must be before valid until date');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate update paper request
   */
  private validateUpdateRequest(request: UpdatePaperRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Date validation
    if (request.validFrom && request.validUntil && request.validFrom >= request.validUntil) {
      errors.push('Valid from date must be before valid until date');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate paper type specific requirements
   */
  private validatePaperTypeRequirements(request: CreatePaperRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (request.paperType) {
      case PaperType.BUSINESS_REGISTRATION:
        if (!request.paperData.registrationNumber) {
          errors.push('Business registration number is required');
        }
        if (!request.paperData.businessName) {
          errors.push('Business name is required');
        }
        break;

      case PaperType.EMPLOYMENT_CONTRACT:
        if (!request.relatedBusinessId) {
          errors.push('Employment contract requires business context');
        }
        if (!request.paperData.position) {
          errors.push('Employee position is required');
        }
        if (!request.paperData.startDate) {
          errors.push('Employment start date is required');
        }
        break;

      case PaperType.AUTHORITY_DELEGATION:
        if (!request.relatedBusinessId) {
          errors.push('Authority delegation requires business context');
        }
        if (!request.paperData.delegatedAuthorities || !Array.isArray(request.paperData.delegatedAuthorities)) {
          errors.push('Delegated authorities list is required');
        }
        if (!request.paperData.delegatedBy) {
          errors.push('Delegator identity is required');
        }
        break;

      case PaperType.SUPERVISOR_AUTHORITY_DELEGATION:
        if (!request.relatedBusinessId) {
          errors.push('Supervisor authority delegation requires business context');
        }
        if (!request.paperData.supervisoryLevel) {
          errors.push('Supervisory level is required');
        }
        if (!request.paperData.delegatedBy) {
          errors.push('Delegator identity is required');
        }
        break;

      case PaperType.FRANCHISE_AGREEMENT:
        if (!request.relatedBusinessId) {
          errors.push('Franchise agreement requires business context');
        }
        if (!request.paperData.franchiseTerritory) {
          errors.push('Franchise territory is required');
        }
        if (!request.paperData.franchiseFee) {
          errors.push('Franchise fee information is required');
        }
        break;

      case PaperType.FRANCHISE_HQ_REGISTRATION:
        if (!request.paperData.franchiseBrand) {
          errors.push('Franchise brand information is required');
        }
        if (!request.paperData.franchiseSystem) {
          errors.push('Franchise system details are required');
        }
        break;

      default:
        errors.push('Unsupported paper type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Verify owner identity exists and is valid for paper ownership
   */
  private async verifyOwnerIdentity(identityId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('unified_identities')
        .select('id, isVerified, isActive')
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
   * Validate business context for paper type
   */
  private async validateBusinessContext(
    businessId: string,
    ownerIdentityId: string,
    paperType: PaperType
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Verify business exists and is active
      const { data: business, error: businessError } = await this.supabase
        .from('business_registrations')
        .select('id, ownerIdentityId, isActive, verificationStatus')
        .eq('id', businessId)
        .single();

      if (businessError || !business) {
        return {
          isValid: false,
          error: 'Business not found'
        };
      }

      if (!business.isActive) {
        return {
          isValid: false,
          error: 'Business is not active'
        };
      }

      // For certain paper types, verify owner relationship
      if ([PaperType.EMPLOYMENT_CONTRACT, PaperType.AUTHORITY_DELEGATION, PaperType.SUPERVISOR_AUTHORITY_DELEGATION].includes(paperType)) {
        // These can be issued to employees, not just business owner
        return { isValid: true };
      }

      // For business ownership papers, verify ownership
      if ([PaperType.FRANCHISE_AGREEMENT].includes(paperType)) {
        if (business.ownerIdentityId !== ownerIdentityId) {
          return {
            isValid: false,
            error: 'Only business owner can have franchise agreement papers'
          };
        }
      }

      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: 'Failed to validate business context'
      };
    }
  }
}

// Export singleton instance factory
export const createPaperService = (supabaseClient: SupabaseClient): PaperService => {
  return new PaperService(supabaseClient);
};