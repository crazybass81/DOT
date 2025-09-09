/**
 * Identity Service - Core identity management for ID-ROLE-PAPER system
 * 
 * Manages unified identities, papers, business registrations, and computed roles.
 * Provides comprehensive identity operations with Supabase integration.
 */

import { 
  UnifiedIdentity, 
  Paper, 
  ComputedRole, 
  BusinessRegistration,
  IdType,
  PaperType,
  RoleType,
  VerificationStatus,
  BusinessType,
  CreatePaperRequest,
  CreateBusinessRegistrationRequest,
  IdentityWithContext,
  RoleCalculationContext,
  IdRolePaperError,
  IdRolePaperErrorType
} from '../../../src/types/id-role-paper';
import { RoleCalculator } from '../../../src/lib/role-engine/role-calculator';
import { getSupabaseClient, getSupabaseServerClient } from '../lib/supabase/client';

export class IdentityService {
  private static instance: IdentityService;
  
  static getInstance(): IdentityService {
    if (!this.instance) {
      this.instance = new IdentityService();
    }
    return this.instance;
  }

  /**
   * Create a new unified identity
   */
  async createIdentity(data: {
    idType: IdType;
    email: string;
    phone?: string;
    fullName: string;
    birthDate?: Date;
    idNumber?: string;
    authUserId: string;
    linkedPersonalId?: string;
    profileData?: Record<string, any>;
  }): Promise<UnifiedIdentity> {
    try {
      const supabase = await getSupabaseServerClient();

      // Validate Corporate ID requirements
      if (data.idType === IdType.CORPORATE && !data.linkedPersonalId) {
        throw new Error('Corporate ID requires linkedPersonalId');
      }

      // Verify linked Personal ID exists
      if (data.linkedPersonalId) {
        const { data: linkedId, error } = await supabase
          .from('unified_identities')
          .select('id, id_type')
          .eq('id', data.linkedPersonalId)
          .eq('id_type', IdType.PERSONAL)
          .single();

        if (error || !linkedId) {
          throw new Error(`Invalid linkedPersonalId: ${data.linkedPersonalId}`);
        }
      }

      const identityData = {
        id_type: data.idType,
        email: data.email,
        phone: data.phone,
        full_name: data.fullName,
        birth_date: data.birthDate?.toISOString(),
        id_number: data.idNumber,
        auth_user_id: data.authUserId,
        linked_personal_id: data.linkedPersonalId,
        is_verified: false,
        is_active: true,
        profile_data: data.profileData || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: identity, error } = await supabase
        .from('unified_identities')
        .insert(identityData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create identity: ${error.message}`);
      }

      return this.mapDatabaseToIdentity(identity);
    } catch (error) {
      console.error('Error creating identity:', error);
      throw error;
    }
  }

  /**
   * Get identity by ID with full context
   */
  async getIdentityWithContext(identityId: string): Promise<IdentityWithContext | null> {
    try {
      const identity = await this.getIdentity(identityId);
      if (!identity) return null;

      const [papers, businessRegistrations] = await Promise.all([
        this.getIdentityPapers(identityId),
        this.getIdentityBusinessRegistrations(identityId)
      ]);

      // Calculate roles
      const context: RoleCalculationContext = {
        identity,
        papers,
        businessRegistrations
      };

      const roleResult = RoleCalculator.calculateRoles(context);
      const computedRoles = await this.saveComputedRoles(identityId, roleResult.calculatedRoles);

      // Get permissions for primary role
      const primaryRole = RoleCalculator.getHighestPriorityRole(computedRoles.map(r => r.role));
      const permissions = await this.getRolePermissions(primaryRole);

      return {
        identity,
        papers,
        computedRoles,
        businessRegistrations,
        primaryRole,
        availableRoles: computedRoles.map(r => r.role),
        permissions
      };
    } catch (error) {
      console.error('Error getting identity with context:', error);
      throw error;
    }
  }

  /**
   * Get identity by auth user ID
   */
  async getIdentityByAuthUser(authUserId: string): Promise<UnifiedIdentity | null> {
    try {
      const supabase = await getSupabaseServerClient();

      const { data, error } = await supabase
        .from('unified_identities')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw new Error(`Failed to get identity by auth user: ${error.message}`);
      }

      return this.mapDatabaseToIdentity(data);
    } catch (error) {
      console.error('Error getting identity by auth user:', error);
      throw error;
    }
  }

  /**
   * Create a new paper for an identity
   */
  async createPaper(identityId: string, paperRequest: CreatePaperRequest): Promise<Paper> {
    try {
      const supabase = await getSupabaseServerClient();

      // Validate identity exists and is active
      const identity = await this.getIdentity(identityId);
      if (!identity || !identity.isActive) {
        throw new Error(`Invalid or inactive identity: ${identityId}`);
      }

      // Validate business context if provided
      if (paperRequest.relatedBusinessId) {
        const business = await this.getBusinessRegistration(paperRequest.relatedBusinessId);
        if (!business || !business.isActive) {
          throw new Error(`Invalid or inactive business: ${paperRequest.relatedBusinessId}`);
        }
      }

      const paperData = {
        paper_type: paperRequest.paperType,
        owner_identity_id: identityId,
        related_business_id: paperRequest.relatedBusinessId,
        paper_data: paperRequest.paperData,
        is_active: true,
        valid_from: (paperRequest.validFrom || new Date()).toISOString(),
        valid_until: paperRequest.validUntil?.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: paper, error } = await supabase
        .from('papers')
        .insert(paperData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create paper: ${error.message}`);
      }

      // Recalculate roles after adding paper
      await this.recalculateRoles(identityId);

      return this.mapDatabaseToPaper(paper);
    } catch (error) {
      console.error('Error creating paper:', error);
      throw error;
    }
  }

  /**
   * Create a business registration
   */
  async createBusinessRegistration(
    identityId: string, 
    businessRequest: CreateBusinessRegistrationRequest
  ): Promise<BusinessRegistration> {
    try {
      const supabase = await getSupabaseServerClient();

      // Validate identity exists and is active
      const identity = await this.getIdentity(identityId);
      if (!identity || !identity.isActive) {
        throw new Error(`Invalid or inactive identity: ${identityId}`);
      }

      // Check for duplicate registration number
      const { data: existing } = await supabase
        .from('business_registrations')
        .select('id')
        .eq('registration_number', businessRequest.registrationNumber)
        .eq('is_active', true)
        .single();

      if (existing) {
        throw new Error(`Business registration number already exists: ${businessRequest.registrationNumber}`);
      }

      const businessData = {
        registration_number: businessRequest.registrationNumber,
        business_name: businessRequest.businessName,
        business_type: businessRequest.businessType,
        owner_identity_id: identityId,
        registration_data: businessRequest.registrationData || {},
        verification_status: VerificationStatus.PENDING,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: business, error } = await supabase
        .from('business_registrations')
        .insert(businessData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create business registration: ${error.message}`);
      }

      // Automatically create business registration paper
      await this.createPaper(identityId, {
        paperType: PaperType.BUSINESS_REGISTRATION,
        relatedBusinessId: business.id,
        paperData: {
          registration_number: businessRequest.registrationNumber,
          business_name: businessRequest.businessName,
          business_type: businessRequest.businessType
        }
      });

      return this.mapDatabaseToBusinessRegistration(business);
    } catch (error) {
      console.error('Error creating business registration:', error);
      throw error;
    }
  }

  /**
   * Link Corporate ID to Personal ID
   */
  async linkCorporateToPersonal(corporateId: string, personalId: string): Promise<void> {
    try {
      const supabase = await getSupabaseServerClient();

      // Validate both identities exist
      const [corporate, personal] = await Promise.all([
        this.getIdentity(corporateId),
        this.getIdentity(personalId)
      ]);

      if (!corporate || corporate.idType !== IdType.CORPORATE) {
        throw new Error(`Invalid corporate identity: ${corporateId}`);
      }

      if (!personal || personal.idType !== IdType.PERSONAL) {
        throw new Error(`Invalid personal identity: ${personalId}`);
      }

      const { error } = await supabase
        .from('unified_identities')
        .update({ 
          linked_personal_id: personalId,
          updated_at: new Date().toISOString()
        })
        .eq('id', corporateId);

      if (error) {
        throw new Error(`Failed to link corporate to personal: ${error.message}`);
      }
    } catch (error) {
      console.error('Error linking corporate to personal:', error);
      throw error;
    }
  }

  /**
   * Recalculate roles for an identity
   */
  async recalculateRoles(identityId: string): Promise<ComputedRole[]> {
    try {
      const identity = await this._getIdentity(identityId);
      if (!identity) {
        throw new Error(`Identity not found: ${identityId}`);
      }

      const [papers, businessRegistrations] = await Promise.all([
        this.getIdentityPapers(identityId),
        this.getIdentityBusinessRegistrations(identityId)
      ]);

      const context: RoleCalculationContext = {
        identity,
        papers,
        businessRegistrations
      };

      const roleResult = RoleCalculator.calculateRoles(context);
      return await this.saveComputedRoles(identityId, roleResult.calculatedRoles);
    } catch (error) {
      console.error('Error recalculating roles:', error);
      throw error;
    }
  }

  /**
   * Get identity papers
   */
  async getIdentityPapers(identityId: string): Promise<Paper[]> {
    try {
      const supabase = await getSupabaseServerClient();

      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .eq('owner_identity_id', identityId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get identity papers: ${error.message}`);
      }

      return data.map(this.mapDatabaseToPaper);
    } catch (error) {
      console.error('Error getting identity papers:', error);
      throw error;
    }
  }

  /**
   * Get identity business registrations
   */
  async getIdentityBusinessRegistrations(identityId: string): Promise<BusinessRegistration[]> {
    try {
      const supabase = await getSupabaseServerClient();

      const { data, error } = await supabase
        .from('business_registrations')
        .select('*')
        .eq('owner_identity_id', identityId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get business registrations: ${error.message}`);
      }

      return data.map(this.mapDatabaseToBusinessRegistration);
    } catch (error) {
      console.error('Error getting business registrations:', error);
      throw error;
    }
  }

  /**
   * Verify identity
   */
  async verifyIdentity(identityId: string): Promise<void> {
    try {
      const supabase = await getSupabaseServerClient();

      const { error } = await supabase
        .from('unified_identities')
        .update({ 
          is_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', identityId);

      if (error) {
        throw new Error(`Failed to verify identity: ${error.message}`);
      }
    } catch (error) {
      console.error('Error verifying identity:', error);
      throw error;
    }
  }

  /**
   * Deactivate identity
   */
  async deactivateIdentity(identityId: string): Promise<void> {
    try {
      const supabase = await getSupabaseServerClient();

      const { error } = await supabase
        .from('unified_identities')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', identityId);

      if (error) {
        throw new Error(`Failed to deactivate identity: ${error.message}`);
      }

      // Deactivate all papers and computed roles
      await Promise.all([
        this.deactivateIdentityPapers(identityId),
        this.deactivateComputedRoles(identityId)
      ]);
    } catch (error) {
      console.error('Error deactivating identity:', error);
      throw error;
    }
  }

  /**
   * Get identity by ID (public method)
   */
  async getIdentity(identityId: string): Promise<UnifiedIdentity | null> {
    return this._getIdentity(identityId);
  }

  // Private helper methods

  private async _getIdentity(identityId: string): Promise<UnifiedIdentity | null> {
    try {
      const supabase = await getSupabaseServerClient();

      const { data, error } = await supabase
        .from('unified_identities')
        .select('*')
        .eq('id', identityId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw new Error(`Failed to get identity: ${error.message}`);
      }

      return this.mapDatabaseToIdentity(data);
    } catch (error) {
      console.error('Error getting identity:', error);
      throw error;
    }
  }

  private async getBusinessRegistration(businessId: string): Promise<BusinessRegistration | null> {
    try {
      const supabase = await getSupabaseServerClient();

      const { data, error } = await supabase
        .from('business_registrations')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw new Error(`Failed to get business registration: ${error.message}`);
      }

      return this.mapDatabaseToBusinessRegistration(data);
    } catch (error) {
      console.error('Error getting business registration:', error);
      throw error;
    }
  }

  private async saveComputedRoles(
    identityId: string, 
    calculatedRoles: Array<{
      role: RoleType;
      sourcePapers: string[];
      businessContext?: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<ComputedRole[]> {
    try {
      const supabase = await getSupabaseServerClient();

      // Deactivate existing computed roles
      await this.deactivateComputedRoles(identityId);

      // Insert new computed roles
      const rolesToInsert = calculatedRoles.map(role => ({
        identity_id: identityId,
        role: role.role,
        source_papers: role.sourcePapers,
        business_context_id: role.businessContext,
        is_active: true,
        computed_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('computed_roles')
        .insert(rolesToInsert)
        .select();

      if (error) {
        throw new Error(`Failed to save computed roles: ${error.message}`);
      }

      return data.map(this.mapDatabaseToComputedRole);
    } catch (error) {
      console.error('Error saving computed roles:', error);
      throw error;
    }
  }

  private async deactivateComputedRoles(identityId: string): Promise<void> {
    try {
      const supabase = await getSupabaseServerClient();

      await supabase
        .from('computed_roles')
        .update({ is_active: false })
        .eq('identity_id', identityId);
    } catch (error) {
      console.error('Error deactivating computed roles:', error);
      throw error;
    }
  }

  private async deactivateIdentityPapers(identityId: string): Promise<void> {
    try {
      const supabase = await getSupabaseServerClient();

      await supabase
        .from('papers')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('owner_identity_id', identityId);
    } catch (error) {
      console.error('Error deactivating identity papers:', error);
      throw error;
    }
  }

  private async getRolePermissions(role: RoleType): Promise<any[]> {
    try {
      const { permissionService } = await import('../lib/permissions/role-permissions');
      return permissionService.getRolePermissions(role);
    } catch (error) {
      console.error('Error getting role permissions:', error);
      return [];
    }
  }

  // Database mapping methods

  private mapDatabaseToIdentity(data: any): UnifiedIdentity {
    return {
      id: data.id,
      idType: data.id_type as IdType,
      email: data.email,
      phone: data.phone,
      fullName: data.full_name,
      birthDate: data.birth_date ? new Date(data.birth_date) : undefined,
      idNumber: data.id_number,
      authUserId: data.auth_user_id,
      linkedPersonalId: data.linked_personal_id,
      isVerified: data.is_verified,
      isActive: data.is_active,
      profileData: data.profile_data || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapDatabaseToPaper(data: any): Paper {
    return {
      id: data.id,
      paperType: data.paper_type as PaperType,
      ownerIdentityId: data.owner_identity_id,
      relatedBusinessId: data.related_business_id,
      paperData: data.paper_data || {},
      isActive: data.is_active,
      validFrom: new Date(data.valid_from),
      validUntil: data.valid_until ? new Date(data.valid_until) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapDatabaseToBusinessRegistration(data: any): BusinessRegistration {
    return {
      id: data.id,
      registrationNumber: data.registration_number,
      businessName: data.business_name,
      businessType: data.business_type as BusinessType,
      ownerIdentityId: data.owner_identity_id,
      registrationData: data.registration_data || {},
      verificationStatus: data.verification_status as VerificationStatus,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapDatabaseToComputedRole(data: any): ComputedRole {
    return {
      id: data.id,
      identityId: data.identity_id,
      role: data.role as RoleType,
      sourcePapers: data.source_papers || [],
      businessContextId: data.business_context_id,
      isActive: data.is_active,
      computedAt: new Date(data.computed_at)
    };
  }
}

// Export singleton instance
export const identityService = IdentityService.getInstance();