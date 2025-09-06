/**
 * Identity Service - Core identity management
 * Handles unified identity creation, verification, and business validation
 */

import { createClient } from '@/lib/supabase/client'
import { 
  UnifiedIdentity, 
  IdType, 
  CreateIdentityRequest, 
  CreateIdentityResponse,
  BusinessStatus,
  ParentConsentData,
  VALIDATION_PATTERNS,
  calculateAge,
  isTeen,
  ERROR_CODES
} from '@/types/unified.types'

export class IdentityService {
  private supabase = createClient()

  /**
   * Create new unified identity with business validation
   */
  async createIdentity(request: CreateIdentityRequest): Promise<CreateIdentityResponse> {
    try {
      // Validate input
      const validation = this.validateCreateRequest(request)
      if (!validation.isValid) {
        return { success: false, error: validation.error }
      }

      // Check for existing identity
      const existing = await this.findExistingIdentity(request.email, request.phone)
      if (existing) {
        return { success: false, error: 'Identity already exists with this email or phone' }
      }

      // Calculate age and teen status
      const age = calculateAge(request.birthDate)
      const isTeenUser = isTeen(request.birthDate)

      // Validate age requirements
      if (age < 15) {
        return { 
          success: false, 
          error: 'Minimum age requirement not met (15 years required)' 
        }
      }

      // Prepare identity data
      const identityData = {
        email: request.email.toLowerCase().trim(),
        phone: request.phone.trim(),
        full_name: request.fullName.trim(),
        birth_date: request.birthDate,
        id_type: request.idType,
        is_verified: false,
        business_number: request.businessNumber || null,
        business_name: request.businessName || null,
        business_verification_status: this.getInitialBusinessStatus(request.idType),
        is_active: true
      }

      // Insert identity
      const { data, error } = await this.supabase
        .from('unified_identities')
        .insert(identityData)
        .select()
        .single()

      if (error) {
        console.error('Failed to create identity:', error)
        return { success: false, error: 'Failed to create identity' }
      }

      // Convert to typed interface
      const identity = this.mapToUnifiedIdentity(data)

      // Determine verification requirements
      const requiresVerification = this.requiresVerification(identity)
      const verificationMethod = this.getVerificationMethod(identity)

      return {
        success: true,
        identity,
        requiresVerification,
        verificationMethod
      }

    } catch (error) {
      console.error('Error creating identity:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Verify business identity with external APIs
   */
  async verifyBusinessIdentity(
    identityId: string, 
    businessNumber: string, 
    businessName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get identity
      const identity = await this.getById(identityId)
      if (!identity) {
        return { success: false, error: 'Identity not found' }
      }

      if (!this.isBusinessIdentity(identity.idType)) {
        return { success: false, error: 'Not a business identity' }
      }

      // Call external verification API (e.g., Korean NTS API)
      const verificationResult = await this.callBusinessVerificationAPI(
        businessNumber, 
        businessName
      )

      if (!verificationResult.success) {
        // Update verification status to failed
        await this.updateBusinessVerificationStatus(
          identityId,
          'rejected',
          verificationResult.data
        )
        return { success: false, error: verificationResult.error }
      }

      // Update verification status to verified
      await this.updateBusinessVerificationStatus(
        identityId,
        'verified',
        verificationResult.data
      )

      return { success: true }

    } catch (error) {
      console.error('Error verifying business identity:', error)
      return { success: false, error: 'Verification failed' }
    }
  }

  /**
   * Add parent consent for teen users
   */
  async addParentConsent(
    identityId: string,
    consentData: ParentConsentData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const identity = await this.getById(identityId)
      if (!identity) {
        return { success: false, error: 'Identity not found' }
      }

      if (!identity.isTeen) {
        return { success: false, error: 'Parent consent not required for this user' }
      }

      // Validate parent consent data
      const validation = this.validateParentConsent(consentData)
      if (!validation.isValid) {
        return { success: false, error: validation.error }
      }

      // Update identity with parent consent
      const { error } = await this.supabase
        .from('unified_identities')
        .update({
          parent_consent_data: consentData,
          parent_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', identityId)

      if (error) {
        console.error('Failed to add parent consent:', error)
        return { success: false, error: 'Failed to add parent consent' }
      }

      return { success: true }

    } catch (error) {
      console.error('Error adding parent consent:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Get identity by ID
   */
  async getById(id: string): Promise<UnifiedIdentity | null> {
    try {
      const { data, error } = await this.supabase
        .from('unified_identities')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToUnifiedIdentity(data)
    } catch (error) {
      console.error('Error getting identity by ID:', error)
      return null
    }
  }

  /**
   * Get identity by auth user ID
   */
  async getByAuthUserId(authUserId: string): Promise<UnifiedIdentity | null> {
    try {
      const { data, error } = await this.supabase
        .from('unified_identities')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToUnifiedIdentity(data)
    } catch (error) {
      console.error('Error getting identity by auth user ID:', error)
      return null
    }
  }

  /**
   * Update identity verification status
   */
  async updateVerificationStatus(
    identityId: string,
    isVerified: boolean,
    verificationMethod?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        is_verified: isVerified,
        updated_at: new Date().toISOString()
      }

      if (isVerified) {
        updateData.verified_at = new Date().toISOString()
        if (verificationMethod) {
          updateData.verification_method = verificationMethod
        }
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
   * Link identity to Supabase auth user
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

  // =====================================================
  // Private Helper Methods
  // =====================================================

  private validateCreateRequest(request: CreateIdentityRequest): { isValid: boolean; error?: string } {
    if (!request.email || !VALIDATION_PATTERNS.email.test(request.email)) {
      return { isValid: false, error: 'Invalid email format' }
    }

    if (!request.phone || !VALIDATION_PATTERNS.phone.test(request.phone)) {
      return { isValid: false, error: 'Invalid phone format' }
    }

    if (!request.fullName || request.fullName.trim().length < 2) {
      return { isValid: false, error: 'Full name must be at least 2 characters' }
    }

    if (!request.birthDate) {
      return { isValid: false, error: 'Birth date is required' }
    }

    // Validate business-specific fields
    if (this.isBusinessIdentity(request.idType)) {
      if (!request.businessNumber || !VALIDATION_PATTERNS.businessNumber.test(request.businessNumber)) {
        return { isValid: false, error: 'Valid business number is required for business identities' }
      }

      if (!request.businessName || request.businessName.trim().length < 2) {
        return { isValid: false, error: 'Business name is required for business identities' }
      }
    }

    return { isValid: true }
  }

  private async findExistingIdentity(email: string, phone: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('unified_identities')
      .select('id')
      .or(`email.eq.${email.toLowerCase()},phone.eq.${phone}`)
      .limit(1)

    return (data && data.length > 0) || false
  }

  private getInitialBusinessStatus(idType: IdType): BusinessStatus {
    return this.isBusinessIdentity(idType) ? 'unverified' : 'verified'
  }

  private requiresVerification(identity: UnifiedIdentity): boolean {
    return this.isBusinessIdentity(identity.idType) || identity.isTeen
  }

  private getVerificationMethod(identity: UnifiedIdentity): string | undefined {
    if (this.isBusinessIdentity(identity.idType)) {
      return 'business_verification'
    }
    if (identity.isTeen) {
      return 'parent_consent'
    }
    return undefined
  }

  private isBusinessIdentity(idType: IdType): boolean {
    return idType === 'business_owner' || idType === 'corporation'
  }

  private async updateBusinessVerificationStatus(
    identityId: string,
    status: BusinessStatus,
    verificationData?: any
  ): Promise<void> {
    const updateData: any = {
      business_verification_status: status,
      updated_at: new Date().toISOString()
    }

    if (status === 'verified') {
      updateData.business_verified_at = new Date().toISOString()
    }

    if (verificationData) {
      updateData.business_verification_data = verificationData
    }

    await this.supabase
      .from('unified_identities')
      .update(updateData)
      .eq('id', identityId)
  }

  private validateParentConsent(consentData: ParentConsentData): { isValid: boolean; error?: string } {
    if (!consentData.parentName || consentData.parentName.trim().length < 2) {
      return { isValid: false, error: 'Parent name is required' }
    }

    if (!consentData.parentPhone || !VALIDATION_PATTERNS.phone.test(consentData.parentPhone)) {
      return { isValid: false, error: 'Valid parent phone number is required' }
    }

    if (!consentData.consentedAt) {
      return { isValid: false, error: 'Consent date is required' }
    }

    return { isValid: true }
  }

  private mapToUnifiedIdentity(data: any): UnifiedIdentity {
    return {
      id: data.id,
      email: data.email,
      phone: data.phone,
      fullName: data.full_name,
      birthDate: data.birth_date,
      idType: data.id_type,
      isVerified: data.is_verified,
      verifiedAt: data.verified_at ? new Date(data.verified_at) : undefined,
      verificationMethod: data.verification_method,
      age: data.age || calculateAge(data.birth_date),
      isTeen: data.is_teen || isTeen(data.birth_date),
      parentConsentData: data.parent_consent_data,
      parentVerifiedAt: data.parent_verified_at ? new Date(data.parent_verified_at) : undefined,
      authUserId: data.auth_user_id,
      businessNumber: data.business_number,
      businessName: data.business_name,
      businessVerificationStatus: data.business_verification_status,
      businessVerifiedAt: data.business_verified_at ? new Date(data.business_verified_at) : undefined,
      businessVerificationData: data.business_verification_data,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  private async callBusinessVerificationAPI(
    businessNumber: string,
    businessName: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // TODO: Implement actual business verification API call
    // This would typically call Korean NTS (National Tax Service) API
    
    // Mock implementation for now
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
    
    // Simple validation for demo purposes
    if (businessNumber && businessName && VALIDATION_PATTERNS.businessNumber.test(businessNumber)) {
      return {
        success: true,
        data: {
          businessNumber,
          businessName,
          status: 'active',
          verifiedAt: new Date().toISOString(),
          verificationSource: 'nts_api'
        }
      }
    }

    return {
      success: false,
      error: 'Business verification failed'
    }
  }
}

export const identityService = new IdentityService()