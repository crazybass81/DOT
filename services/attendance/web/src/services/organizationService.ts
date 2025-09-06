/**
 * Organization Service - Organization and role management
 * Handles organization creation, hierarchy validation, and role assignments
 */

import { supabase } from '../lib/supabase-config'
import { 
  Organization, 
  RoleAssignment,
  UnifiedRole,
  IdType,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  AssignRoleRequest,
  AssignRoleResponse,
  OrganizationSettings,
  generateOrgCode,
  validateBusinessOwnership,
  validateFranchiseHierarchy,
  ERROR_CODES
} from '../types/unified.types'
import { identityService } from './identityService'

export class OrganizationService {
  private supabase = supabase

  /**
   * Create new organization with business validation
   */
  async createOrganization(request: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
    try {
      // Validate input
      const validation = await this.validateCreateRequest(request)
      if (!validation.isValid) {
        return { success: false, error: validation.error }
      }

      // Get owner identity
      const owner = await identityService.getById(request.ownerIdentityId)
      if (!owner) {
        return { success: false, error: 'Owner identity not found' }
      }

      // Validate business ownership rules
      if (!this.validateOwnershipRules(owner, request.orgType)) {
        return { 
          success: false, 
          error: 'Owner identity type does not match organization type' 
        }
      }

      // Generate unique organization code
      const code = await this.generateUniqueOrgCode()

      // Prepare organization data
      const orgData = {
        code,
        name: request.name.trim(),
        display_name: request.displayName?.trim() || request.name.trim(),
        org_type: request.orgType,
        owner_identity_id: request.ownerIdentityId,
        business_number: request.businessNumber || null,
        settings: this.getDefaultSettings(request.settings),
        business_registration: {},
        business_verification_status: this.getInitialBusinessStatus(request.orgType, owner),
        is_active: true
      }

      // Insert organization
      const { data, error } = await this.supabase
        .from('organizations_v3')
        .insert(orgData)
        .select()
        .single()

      if (error) {
        console.error('Failed to create organization:', error)
        return { success: false, error: 'Failed to create organization' }
      }

      // Create admin role for owner
      const adminRoleResult = await this.assignRole({
        identityId: request.ownerIdentityId,
        organizationId: data.id,
        role: 'admin',
        assignedBy: request.ownerIdentityId // Self-assigned for organization creation
      })

      if (!adminRoleResult.success) {
        // Rollback organization creation
        await this.supabase
          .from('organizations_v3')
          .delete()
          .eq('id', data.id)

        return { success: false, error: 'Failed to assign admin role to owner' }
      }

      const organization = this.mapToOrganization(data)

      return {
        success: true,
        organization,
        code
      }

    } catch (error) {
      console.error('Error creating organization:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Assign role to user in organization
   */
  async assignRole(request: AssignRoleRequest): Promise<AssignRoleResponse> {
    try {
      // Validate request
      const validation = await this.validateRoleAssignmentRequest(request)
      if (!validation.isValid) {
        return { success: false, error: validation.error }
      }

      // Check for existing active role
      const existingRole = await this.getActiveRole(request.identityId, request.organizationId, request.role)
      if (existingRole) {
        return { success: false, error: 'User already has this role in the organization' }
      }

      // Validate admin role uniqueness
      if (request.role === 'admin' && request.organizationId) {
        const existingAdmin = await this.getOrganizationAdmin(request.organizationId)
        if (existingAdmin) {
          return { success: false, error: 'Organization already has an admin. Remove existing admin first.' }
        }
      }

      // Prepare role assignment data
      const roleData = {
        identity_id: request.identityId,
        organization_id: request.organizationId || null,
        role: request.role,
        is_active: true,
        is_primary: false, // Can be updated later
        custom_permissions: request.customPermissions || {},
        access_restrictions: {},
        assigned_by: request.assignedBy,
        assigned_at: new Date().toISOString(),
        metadata: {}
      }

      // Insert role assignment
      const { data, error } = await this.supabase
        .from('role_assignments')
        .insert(roleData)
        .select()
        .single()

      if (error) {
        console.error('Failed to assign role:', error)
        return { success: false, error: 'Failed to assign role' }
      }

      const roleAssignment = this.mapToRoleAssignment(data)

      return {
        success: true,
        roleAssignment
      }

    } catch (error) {
      console.error('Error assigning role:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRole(
    roleAssignmentId: string, 
    revokedBy: string, 
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('role_assignments')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: revokedBy,
          revocation_reason: reason || null
        })
        .eq('id', roleAssignmentId)
        .eq('is_active', true)

      if (error) {
        console.error('Failed to revoke role:', error)
        return { success: false, error: 'Failed to revoke role' }
      }

      return { success: true }

    } catch (error) {
      console.error('Error revoking role:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    try {
      const { data, error } = await this.supabase
        .from('organizations_v3')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToOrganization(data)
    } catch (error) {
      console.error('Error getting organization by ID:', error)
      return null
    }
  }

  /**
   * Get organization by code
   */
  async getByCode(code: string): Promise<Organization | null> {
    try {
      const { data, error } = await this.supabase
        .from('organizations_v3')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToOrganization(data)
    } catch (error) {
      console.error('Error getting organization by code:', error)
      return null
    }
  }

  /**
   * Get user's role assignments
   */
  async getUserRoles(identityId: string): Promise<RoleAssignment[]> {
    try {
      const { data, error } = await this.supabase
        .from('role_assignments')
        .select('*')
        .eq('identity_id', identityId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })

      if (error) {
        console.error('Error getting user roles:', error)
        return []
      }

      return data?.map(this.mapToRoleAssignment) || []
    } catch (error) {
      console.error('Error getting user roles:', error)
      return []
    }
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string): Promise<RoleAssignment[]> {
    try {
        .from('role_assignments')
        .select(`
          *,
          unified_identities!inner(
            id,
            email,
            full_name,
            is_verified,
            is_active
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('unified_identities.is_active', true)
        .order('assigned_at', { ascending: false })

      if (error) {
        console.error('Error getting organization members:', error)
        return []
      }

      return data?.map(this.mapToRoleAssignment) || []
    } catch (error) {
      console.error('Error getting organization members:', error)
      return []
    }
  }

  /**
   * Update organization settings
   */
  async updateSettings(
    organizationId: string, 
    settings: Partial<OrganizationSettings>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current organization
      const org = await this.getById(organizationId)
      if (!org) {
        return { success: false, error: 'Organization not found' }
      }

      // Merge settings
      const updatedSettings = { ...org.settings, ...settings }

      const { error } = await this.supabase
        .from('organizations_v3')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)

      if (error) {
        console.error('Failed to update organization settings:', error)
        return { success: false, error: 'Failed to update settings' }
      }

      return { success: true }

    } catch (error) {
      console.error('Error updating organization settings:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Validate franchise hierarchy
   */
  async validateFranchiseHierarchy(parentOrgId: string, childOrgType: IdType): Promise<boolean> {
    if (childOrgType !== 'franchise_store') {
      return true
    }

    const parentOrg = await this.getById(parentOrgId)
    return parentOrg?.orgType === 'franchise_hq' || false
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  private async validateCreateRequest(request: CreateOrganizationRequest): Promise<{ isValid: boolean; error?: string }> {
    if (!request.name || request.name.trim().length < 2) {
      return { isValid: false, error: 'Organization name must be at least 2 characters' }
    }

    if (!request.ownerIdentityId) {
      return { isValid: false, error: 'Owner identity ID is required' }
    }

    if (!request.orgType) {
      return { isValid: false, error: 'Organization type is required' }
    }

    // Check if name is already taken
    const { data: existing } = await this.supabase
      .from('organizations_v3')
      .select('id')
      .eq('name', request.name.trim())
      .eq('is_active', true)
      .limit(1)

    if (existing && existing.length > 0) {
      return { isValid: false, error: 'Organization name already exists' }
    }

    return { isValid: true }
  }

  private validateOwnershipRules(owner: any, orgType: IdType): boolean {
    // Business organizations must be owned by business identities
    if (orgType === 'business_owner' || orgType === 'corporation') {
      return owner.idType === orgType && owner.businessVerificationStatus === 'verified'
    }

    // Personal organizations can be owned by anyone
    if (orgType === 'personal') {
      return true
    }

    // Franchise HQ must be owned by business identity
    if (orgType === 'franchise_hq') {
      return owner.idType === 'business_owner' || owner.idType === 'corporation'
    }

    return false
  }

  private async validateRoleAssignmentRequest(request: AssignRoleRequest): Promise<{ isValid: boolean; error?: string }> {
    if (!request.identityId) {
      return { isValid: false, error: 'Identity ID is required' }
    }

    if (!request.assignedBy) {
      return { isValid: false, error: 'Assigned by is required' }
    }

    // Master role cannot have organization
    if (request.role === 'master' && request.organizationId) {
      return { isValid: false, error: 'Master role cannot be assigned to specific organization' }
    }

    // Other roles must have organization
    if (request.role !== 'master' && !request.organizationId) {
      return { isValid: false, error: 'Organization is required for non-master roles' }
    }

    // Validate franchise admin role
    if (request.role === 'franchise_admin' && request.organizationId) {
      const org = await this.getById(request.organizationId)
      if (!org || org.orgType !== 'franchise_hq') {
        return { isValid: false, error: 'Franchise admin role can only be assigned to franchise headquarters' }
      }
    }

    return { isValid: true }
  }

  private async generateUniqueOrgCode(): Promise<string> {
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const code = generateOrgCode()
      
      const { data } = await this.supabase
        .from('organizations_v3')
        .select('id')
        .eq('code', code)
        .limit(1)

      if (!data || data.length === 0) {
        return code
      }

      attempts++
    }

    throw new Error('Failed to generate unique organization code')
  }

  private getDefaultSettings(customSettings?: Partial<OrganizationSettings>): OrganizationSettings {
    const defaults: OrganizationSettings = {
      workingHours: { start: '09:00', end: '18:00' },
      overtimePolicy: { enabled: true, threshold: 480 },
      gpsTracking: { enabled: true, radius: 100 },
      approvalRequired: true,
      notifications: { email: true, push: true, sms: false }
    }

    return { ...defaults, ...customSettings }
  }

  private getInitialBusinessStatus(orgType: IdType, owner: any): string {
    if (orgType === 'business_owner' || orgType === 'corporation') {
      return owner.businessVerificationStatus
    }
    return 'verified'
  }

  private async getActiveRole(
    identityId: string, 
    organizationId: string | undefined, 
    role: UnifiedRole
  ): Promise<RoleAssignment | null> {
    try {
      const query = this.supabase
        .from('role_assignments')
        .select('*')
        .eq('identity_id', identityId)
        .eq('role', role)
        .eq('is_active', true)

      if (organizationId) {
        query.eq('organization_id', organizationId)
      } else {
        query.is('organization_id', null)
      }

      const { data, error } = await query.single()

      if (error || !data) {
        return null
      }

      return this.mapToRoleAssignment(data)
    } catch (error) {
      return null
    }
  }

  private async getOrganizationAdmin(organizationId: string): Promise<RoleAssignment | null> {
    try {
      const { data, error } = await this.supabase
        .from('role_assignments')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('role', 'admin')
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToRoleAssignment(data)
    } catch (error) {
      return null
    }
  }

  private mapToOrganization(data: any): Organization {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      displayName: data.display_name,
      description: data.description,
      logoUrl: data.logo_url,
      orgType: data.org_type,
      parentOrgId: data.parent_org_id,
      ownerIdentityId: data.owner_identity_id,
      businessRegistration: data.business_registration || {},
      businessVerificationStatus: data.business_verification_status,
      settings: data.settings,
      maxEmployees: data.max_employees,
      maxLocations: data.max_locations,
      subscriptionTier: data.subscription_tier,
      subscriptionExpiresAt: data.subscription_expires_at ? new Date(data.subscription_expires_at) : undefined,
      billingData: data.billing_data || {},
      isActive: data.is_active,
      suspendedAt: data.suspended_at ? new Date(data.suspended_at) : undefined,
      suspensionReason: data.suspension_reason,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  private mapToRoleAssignment(data: any): RoleAssignment {
    return {
      id: data.id,
      identityId: data.identity_id,
      organizationId: data.organization_id,
      role: data.role,
      isActive: data.is_active,
      isPrimary: data.is_primary,
      customPermissions: data.custom_permissions || {},
      accessRestrictions: data.access_restrictions || {},
      assignedAt: new Date(data.assigned_at),
      assignedBy: data.assigned_by,
      revokedAt: data.revoked_at ? new Date(data.revoked_at) : undefined,
      revokedBy: data.revoked_by,
      revocationReason: data.revocation_reason,
      metadata: data.metadata || {}
    }
  }
}

export const organizationService = new OrganizationService()