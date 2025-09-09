/**
 * Identity Service Implementation
 * Core identity management for ID-ROLE-PAPER system
 * 
 * Manages Personal and Corporate IDs with role calculation integration
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  IdType,
  RoleType,
  UnifiedIdentity,
  BusinessRegistration,
  Paper,
  ComputedRole,
  RoleCalculationContext,
  Permission,
  IdentityWithContext
} from '../../types/id-role-paper';
import { RoleCalculator } from '../role-engine/role-calculator';

/**
 * Request types for Identity Service operations
 */
export interface CreateIdentityRequest {
  idType: IdType;
  email: string;
  fullName: string;
  phone?: string;
  birthDate?: Date;
  idNumber?: string;
  authUserId: string;
  linkedPersonalId?: string;
  profileData?: Record<string, any>;
}

export interface UpdateIdentityRequest {
  fullName?: string;
  phone?: string;
  birthDate?: Date;
  profileData?: Record<string, any>;
}

export interface IdentitySearchRequest {
  emailPattern?: string;
  fullNamePattern?: string;
  idType?: IdType;
  isVerified?: boolean;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface VerifyIdentityRequest {
  verified: boolean;
  verificationData?: Record<string, any>;
}

/**
 * Response types for Identity Service operations
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Identity Service - Core identity management functionality
 */
export class IdentityService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Create a new identity (Personal or Corporate)
   */
  async createIdentity(request: CreateIdentityRequest): Promise<ServiceResponse<UnifiedIdentity>> {
    try {
      // Validate request data
      const validation = this.validateCreateRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // For Corporate IDs, validate linked Personal ID exists
      if (request.idType === IdType.CORPORATE && request.linkedPersonalId) {
        const linkedPersonalExists = await this.verifyLinkedPersonalId(request.linkedPersonalId);
        if (!linkedPersonalExists) {
          return {
            success: false,
            error: 'Linked Personal ID not found'
          };
        }
      }

      // Create identity record
      const identityData: Partial<UnifiedIdentity> = {
        idType: request.idType,
        email: request.email,
        fullName: request.fullName,
        phone: request.phone,
        birthDate: request.birthDate,
        idNumber: request.idNumber,
        authUserId: request.authUserId,
        linkedPersonalId: request.linkedPersonalId,
        isVerified: false,
        isActive: true,
        profileData: request.profileData || {}
      };

      const { data, error } = await this.supabase
        .from('unified_identities')
        .insert([identityData])
        .select()
        .single();

      if (error) {
        // Handle duplicate email error
        if (error.code === '23505' && error.message.includes('email')) {
          return {
            success: false,
            error: 'Email already exists'
          };
        }

        return {
          success: false,
          error: `Failed to create identity: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as UnifiedIdentity
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Retrieve identity by ID
   */
  async getIdentityById(identityId: string): Promise<ServiceResponse<UnifiedIdentity>> {
    try {
      const { data, error } = await this.supabase
        .from('unified_identities')
        .select('*')
        .eq('id', identityId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Identity not found'
          };
        }

        return {
          success: false,
          error: `Failed to retrieve identity: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as UnifiedIdentity
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update identity information
   */
  async updateIdentity(identityId: string, request: UpdateIdentityRequest): Promise<ServiceResponse<UnifiedIdentity>> {
    try {
      // Validate update request
      const validation = this.validateUpdateRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      const updateData: Partial<UnifiedIdentity> = {
        ...request,
        updatedAt: new Date()
      };

      const { data, error } = await this.supabase
        .from('unified_identities')
        .update(updateData)
        .eq('id', identityId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update identity: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as UnifiedIdentity
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get identity with full context (roles, papers, businesses)
   */
  async getIdentityWithContext(identityId: string): Promise<ServiceResponse<IdentityWithContext>> {
    try {
      // Get base identity
      const identityResult = await this.getIdentityById(identityId);
      if (!identityResult.success || !identityResult.data) {
        return {
          success: false,
          error: identityResult.error || 'Identity not found'
        };
      }

      const identity = identityResult.data;

      // Get papers for this identity
      const { data: papers, error: papersError } = await this.supabase
        .from('papers')
        .select('*')
        .eq('ownerIdentityId', identityId)
        .eq('isActive', true);

      if (papersError) {
        return {
          success: false,
          error: `Failed to retrieve papers: ${papersError.message}`
        };
      }

      // Get business registrations
      const businessIds = papers
        ?.filter(p => p.relatedBusinessId)
        .map(p => p.relatedBusinessId) || [];

      let businessRegistrations: BusinessRegistration[] = [];
      if (businessIds.length > 0) {
        const { data: businesses, error: businessesError } = await this.supabase
          .from('business_registrations')
          .select('*')
          .in('id', businessIds);

        if (businessesError) {
          return {
            success: false,
            error: `Failed to retrieve businesses: ${businessesError.message}`
          };
        }

        businessRegistrations = businesses || [];
      }

      // Calculate roles using RoleCalculator
      const roleCalculationContext: RoleCalculationContext = {
        identity,
        papers: papers || [],
        businessRegistrations
      };

      const roleCalculationResult = RoleCalculator.calculateRoles(roleCalculationContext);
      
      // Convert calculated roles to ComputedRole format
      const computedRoles: ComputedRole[] = roleCalculationResult.calculatedRoles.map(cr => ({
        id: `computed-${identityId}-${cr.role}-${cr.businessContext || 'global'}`,
        identityId,
        role: cr.role,
        sourcePapers: cr.sourcePapers,
        businessContextId: cr.businessContext,
        isActive: true,
        computedAt: new Date()
      }));

      // Determine primary role (highest in hierarchy)
      const primaryRole = computedRoles.length > 0 
        ? RoleCalculator.getHighestRole(computedRoles)
        : RoleType.SEEKER;

      // Get available roles
      const availableRoles = computedRoles.map(cr => cr.role);

      // Generate basic permissions based on roles
      const permissions = this.generateBasicPermissions(availableRoles);

      const identityWithContext: IdentityWithContext = {
        identity,
        papers: papers || [],
        computedRoles,
        businessRegistrations,
        primaryRole,
        availableRoles,
        permissions
      };

      return {
        success: true,
        data: identityWithContext
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Search identities with filters
   */
  async searchIdentities(request: IdentitySearchRequest): Promise<ServiceResponse<UnifiedIdentity[]>> {
    try {
      let query = this.supabase
        .from('unified_identities')
        .select('*');

      // Apply filters
      if (request.emailPattern) {
        query = query.ilike('email', `%${request.emailPattern}%`);
      }

      if (request.fullNamePattern) {
        query = query.ilike('fullName', `%${request.fullNamePattern}%`);
      }

      if (request.idType) {
        query = query.eq('idType', request.idType);
      }

      if (request.isVerified !== undefined) {
        query = query.eq('isVerified', request.isVerified);
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
        data: data as UnifiedIdentity[]
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verify an identity
   */
  async verifyIdentity(identityId: string, request: VerifyIdentityRequest): Promise<ServiceResponse<UnifiedIdentity>> {
    try {
      const updateData = {
        isVerified: request.verified,
        profileData: request.verificationData ? {
          verificationData: request.verificationData
        } : undefined,
        updatedAt: new Date()
      };

      const { data, error } = await this.supabase
        .from('unified_identities')
        .update(updateData)
        .eq('id', identityId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to verify identity: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as UnifiedIdentity
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Deactivate an identity
   */
  async deactivateIdentity(identityId: string): Promise<ServiceResponse<UnifiedIdentity>> {
    try {
      const { data, error } = await this.supabase
        .from('unified_identities')
        .update({ 
          isActive: false,
          updatedAt: new Date()
        })
        .eq('id', identityId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to deactivate identity: ${error.message}`
        };
      }

      return {
        success: true,
        data: data as UnifiedIdentity
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate create identity request
   */
  private validateCreateRequest(request: CreateIdentityRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Email validation
    if (!request.email || request.email.trim() === '') {
      errors.push('Email is required');
    } else if (!this.isValidEmail(request.email)) {
      errors.push('Invalid email format');
    }

    // Full name validation
    if (!request.fullName || request.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }

    // Phone validation (if provided)
    if (request.phone && !this.isValidPhoneNumber(request.phone)) {
      errors.push('Invalid phone number format');
    }

    // Corporate ID specific validation
    if (request.idType === IdType.CORPORATE && !request.linkedPersonalId) {
      errors.push('Corporate ID requires linked Personal ID');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate update identity request
   */
  private validateUpdateRequest(request: UpdateIdentityRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Full name validation (if provided)
    if (request.fullName && request.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }

    // Phone validation (if provided)
    if (request.phone && !this.isValidPhoneNumber(request.phone)) {
      errors.push('Invalid phone number format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Verify that linked Personal ID exists
   */
  private async verifyLinkedPersonalId(personalId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('unified_identities')
        .select('id')
        .eq('id', personalId)
        .eq('idType', IdType.PERSONAL)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Generate basic permissions based on roles
   */
  private generateBasicPermissions(roles: RoleType[]): Permission[] {
    const permissions: Permission[] = [];

    // Base permissions for all users
    permissions.push({
      resource: 'profile',
      action: 'read'
    });

    // Role-specific permissions
    if (roles.includes(RoleType.WORKER) || roles.includes(RoleType.MANAGER) || roles.includes(RoleType.SUPERVISOR)) {
      permissions.push(
        { resource: 'attendance', action: 'create', businessContext: true },
        { resource: 'attendance', action: 'read', businessContext: true }
      );
    }

    if (roles.includes(RoleType.MANAGER) || roles.includes(RoleType.SUPERVISOR)) {
      permissions.push(
        { resource: 'team', action: 'read', businessContext: true },
        { resource: 'reports', action: 'read', businessContext: true }
      );
    }

    if (roles.includes(RoleType.OWNER) || roles.includes(RoleType.FRANCHISEE) || roles.includes(RoleType.FRANCHISOR)) {
      permissions.push(
        { resource: 'business', action: 'manage', businessContext: true },
        { resource: 'employees', action: 'manage', businessContext: true },
        { resource: 'reports', action: 'manage', businessContext: true }
      );
    }

    return permissions;
  }

  /**
   * Email format validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Korean phone number format validation
   */
  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
  }
}

// Export singleton instance factory
export const createIdentityService = (supabaseClient: SupabaseClient): IdentityService => {
  return new IdentityService(supabaseClient);
};