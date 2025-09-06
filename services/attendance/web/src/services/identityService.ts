/**
 * Identity Service - Unified identity management
 * Handles identity creation, verification, and role management
 */

import { supabase } from '../lib/supabase-config'
import { 
  Identity, 
  IdType,
  CreateIdentityRequest,
  CreateIdentityResponse,
  VALIDATION_PATTERNS,
  ERROR_CODES
} from '../types/unified.types'

export class IdentityService {
  private supabase = supabase

  /**
   * Create new unified identity
   */
  async createIdentity(request: CreateIdentityRequest): Promise<CreateIdentityResponse> {
    try {
      // Validate input
      const validation = await this.validateCreateRequest(request)
      if (!validation.isValid) {
        return { success: false, error: validation.error }
      }

      // Check for existing identity
      const existingIdentity = await this.getByEmail(request.email)
      if (existingIdentity) {
        return { success: false, error: 'Identity with this email already exists' }
      }

      // Prepare identity data
      const identityData = {
        email: request.email.toLowerCase().trim(),
        phone: request.phone?.trim(),
        full_name: request.fullName.trim(),
        birth_date: request.birthDate,
        id_type: request.idType,
        id_number: request.idNumber?.trim(),
        business_verification_data: request.businessData || {},
        business_verification_status: this.getInitialVerificationStatus(request.idType),
        auth_user_id: request.authUserId || null,
        profile_data: request.profileData || {},
        is_verified: false,
        is_active: true
      }

      // Insert identity
      const response = await this.supabase
        .from('unified_identities')
        .insert(identityData)
        .select()
        .single()

      if (!response) {
        return { success: false, error: 'No response from database' }
      }

      const { data, error } = response

      if (error) {
        console.error('Failed to create identity:', error)
        return { success: false, error: 'Failed to create identity' }
      }

      const identity = this.mapToIdentity(data)

      return {
        success: true,
        identity,
        requiresVerification: this.requiresVerification(request.idType),
        verificationMethod: this.getVerificationMethod(request.idType)
      }

    } catch (error) {
      console.error('Error creating identity:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Get identity by ID
   */
  async getById(id: string): Promise<Identity | null> {
    try {
      const { data, error } = await this.supabase
        .from('unified_identities')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToIdentity(data)
    } catch (error) {
      console.error('Error getting identity by ID:', error)
      return null
    }
  }

  /**
   * Get identity by auth user ID
   */
  async getByAuthUserId(authUserId: string): Promise<Identity | null> {
    try {
      const { data, error } = await this.supabase
        .from('unified_identities')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToIdentity(data)
    } catch (error) {
      console.error('Error getting identity by auth user ID:', error)
      return null
    }
  }

  /**
   * Get identity by email
   */
  async getByEmail(email: string): Promise<Identity | null> {
    try {
      const response = await this.supabase
        .from('unified_identities')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .maybeSingle()

      if (!response || response.error || !response.data) {
        return null
      }

      return this.mapToIdentity(response.data)
    } catch (error) {
      console.error('Error getting identity by email:', error)
      return null
    }
  }

  /**
   * Update identity verification status
   */
  async updateVerificationStatus(
    identityId: string, 
    status: 'pending' | 'verified' | 'rejected',
    verificationData?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        business_verification_status: status,
        updated_at: new Date().toISOString()
      }

      if (status === 'verified') {
        updateData.is_verified = true
      }

      if (verificationData) {
        updateData.business_verification_data = verificationData
      }

      const { error } = await this.supabase
        .from('unified_identities')
        .update(updateData)
        .eq('id', identityId)

      if (error) {
        console.error('Failed to update verification status:', error)
        return { success: false, error: 'Failed to update verification status' }
      }

      return { success: true }

    } catch (error) {
      console.error('Error updating verification status:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Link auth user to existing identity
   */
  async linkAuthUser(identityId: string, authUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('unified_identities')
        .update({
          auth_user_id: authUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', identityId)
        .is('auth_user_id', null) // Only link if not already linked

      if (error) {
        console.error('Failed to link auth user:', error)
        return { success: false, error: 'Failed to link auth user' }
      }

      return { success: true }

    } catch (error) {
      console.error('Error linking auth user:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Update identity profile
   */
  async updateProfile(
    identityId: string, 
    updates: {
      fullName?: string
      phone?: string
      profileData?: any
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.fullName) updateData.full_name = updates.fullName.trim()
      if (updates.phone) updateData.phone = updates.phone.trim()
      if (updates.profileData) updateData.profile_data = updates.profileData

      const { error } = await this.supabase
        .from('unified_identities')
        .update(updateData)
        .eq('id', identityId)

      if (error) {
        console.error('Failed to update profile:', error)
        return { success: false, error: 'Failed to update profile' }
      }

      return { success: true }

    } catch (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  private async validateCreateRequest(request: CreateIdentityRequest): Promise<{ isValid: boolean; error?: string }> {
    // Email validation
    if (!request.email || !VALIDATION_PATTERNS.email.test(request.email)) {
      return { isValid: false, error: 'Valid email is required' }
    }

    // Phone validation
    if (!request.phone || !VALIDATION_PATTERNS.phone.test(request.phone)) {
      return { isValid: false, error: 'Valid phone number is required' }
    }

    // Full name validation
    if (!request.fullName || request.fullName.trim().length < 2) {
      return { isValid: false, error: 'Full name must be at least 2 characters' }
    }

    // Birth date validation
    if (!request.birthDate) {
      return { isValid: false, error: 'Birth date is required' }
    }

    // ID type validation
    const validIdTypes: IdType[] = ['personal', 'business_owner', 'corporation', 'franchise_hq']
    if (!validIdTypes.includes(request.idType)) {
      return { isValid: false, error: 'Invalid ID type' }
    }

    // Business-specific validation
    if (['business_owner', 'corporation', 'franchise_hq'].includes(request.idType)) {
      if (!request.idNumber || !VALIDATION_PATTERNS.businessNumber.test(request.idNumber)) {
        return { isValid: false, error: 'Valid business number is required for business identities' }
      }
    }

    return { isValid: true }
  }

  private getInitialVerificationStatus(idType: IdType): string {
    switch (idType) {
      case 'personal':
        return 'verified' // Personal identities are auto-verified
      case 'business_owner':
      case 'corporation':
      case 'franchise_hq':
        return 'pending' // Business identities require verification
      default:
        return 'pending'
    }
  }

  private requiresVerification(idType: IdType): boolean {
    return ['business_owner', 'corporation', 'franchise_hq'].includes(idType)
  }

  private getVerificationMethod(idType: IdType): string {
    switch (idType) {
      case 'business_owner':
        return 'business_registration'
      case 'corporation':
        return 'corporate_registration'
      case 'franchise_hq':
        return 'franchise_license'
      default:
        return 'none'
    }
  }

  private mapToIdentity(data: any): Identity {
    return {
      id: data.id,
      email: data.email,
      phone: data.phone,
      fullName: data.full_name,
      birthDate: data.birth_date,
      idType: data.id_type,
      idNumber: data.id_number,
      businessVerificationStatus: data.business_verification_status,
      businessVerificationData: data.business_verification_data || {},
      authUserId: data.auth_user_id,
      profileData: data.profile_data || {},
      isVerified: data.is_verified,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
}

export const identityService = new IdentityService()