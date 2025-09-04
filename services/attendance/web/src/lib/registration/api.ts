import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  RegistrationStartRequest,
  RegistrationStartResponse,
  AgeVerificationRequest,
  AgeVerificationResponse,
  BusinessVerificationRequest,
  BusinessVerificationResponse,
  RoleSelectionRequest,
  RoleSelectionResponse,
  RegistrationCompleteRequest,
  RegistrationCompleteResponse,
  PersonalAccount,
  Organization,
  UserRole,
  RegistrationFlow,
} from './types'

export class RegistrationAPI {
  private supabase: SupabaseClient
  private supabaseUrl: string
  private supabaseKey: string

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey)
    this.supabaseUrl = supabaseUrl
    this.supabaseKey = supabaseAnonKey
  }

  /**
   * Check if email or phone is already registered
   */
  async checkAvailability(email: string, phone: string): Promise<{
    emailAvailable: boolean
    phoneAvailable: boolean
    existingAccount: boolean
  }> {
    const { data: emailCheck } = await this.supabase
      .from('personal_accounts')
      .select('id')
      .eq('email', email)
      .single()

    const { data: phoneCheck } = await this.supabase
      .from('personal_accounts')
      .select('id')
      .eq('phone', phone)
      .single()

    return {
      emailAvailable: !emailCheck,
      phoneAvailable: !phoneCheck,
      existingAccount: !!emailCheck || !!phoneCheck,
    }
  }

  /**
   * Start registration flow
   */
  async startRegistration(
    request: RegistrationStartRequest
  ): Promise<RegistrationStartResponse> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/register-user-v2/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.supabaseKey}`,
          },
          body: JSON.stringify(request),
        }
      )

      const data = await response.json()
      return data
    } catch (error) {
      return {
        success: false,
        flowId: '',
        sessionId: '',
        requiresAgeVerification: false,
        requiresParentConsent: false,
        nextStep: '',
        error: error instanceof Error ? error.message : '오류가 발생했습니다',
      }
    }
  }

  /**
   * Verify age through various methods
   */
  async verifyAge(
    request: AgeVerificationRequest
  ): Promise<AgeVerificationResponse> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/register-user-v2/verify-age`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.supabaseKey}`,
          },
          body: JSON.stringify(request),
        }
      )

      const data = await response.json()
      return data
    } catch (error) {
      return {
        success: false,
        verified: false,
        nextStep: '',
        error: error instanceof Error ? error.message : '오류가 발생했습니다',
      }
    }
  }

  /**
   * Verify business registration
   */
  async verifyBusiness(
    request: BusinessVerificationRequest
  ): Promise<BusinessVerificationResponse> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/register-user-v2/verify-business`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.supabaseKey}`,
          },
          body: JSON.stringify(request),
        }
      )

      const data = await response.json()
      return data
    } catch (error) {
      return {
        success: false,
        verified: false,
        nextStep: '',
        error: error instanceof Error ? error.message : '오류가 발생했습니다',
      }
    }
  }

  /**
   * Select user role
   */
  async selectRole(
    request: RoleSelectionRequest
  ): Promise<RoleSelectionResponse> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/register-user-v2/select-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.supabaseKey}`,
          },
          body: JSON.stringify(request),
        }
      )

      const data = await response.json()
      return data
    } catch (error) {
      return {
        success: false,
        roleSelected: 'worker',
        nextStep: '',
        error: error instanceof Error ? error.message : '오류가 발생했습니다',
      }
    }
  }

  /**
   * Complete registration
   */
  async completeRegistration(
    request: RegistrationCompleteRequest
  ): Promise<RegistrationCompleteResponse> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/register-user-v2/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.supabaseKey}`,
          },
          body: JSON.stringify(request),
        }
      )

      const data = await response.json()
      return data
    } catch (error) {
      return {
        success: false,
        accountId: '',
        authUserId: '',
        role: 'worker',
        message: '',
        error: error instanceof Error ? error.message : '오류가 발생했습니다',
      }
    }
  }

  /**
   * Get registration flow status
   */
  async getFlowStatus(flowId: string): Promise<RegistrationFlow | null> {
    const { data, error } = await this.supabase
      .from('registration_flows')
      .select('*')
      .eq('id', flowId)
      .single()

    if (error) {
      console.error('Error fetching flow status:', error)
      return null
    }

    return data
  }

  /**
   * Get user's current account
   */
  async getCurrentAccount(): Promise<PersonalAccount | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) return null

    const { data, error } = await this.supabase
      .from('personal_accounts')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching account:', error)
      return null
    }

    return data
  }

  /**
   * Get user's roles
   */
  async getUserRoles(accountId: string): Promise<UserRole[]> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select(`
        *,
        organizations:organization_id(*)
      `)
      .eq('account_id', accountId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching user roles:', error)
      return []
    }

    return data || []
  }

  /**
   * Get organizations
   */
  async getOrganizations(): Promise<Organization[]> {
    const { data, error } = await this.supabase
      .from('organizations_v2')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching organizations:', error)
      return []
    }

    return data || []
  }

  /**
   * Get organization by code
   */
  async getOrganizationByCode(code: string): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from('organizations_v2')
      .select('*')
      .eq('code', code)
      .single()

    if (error) {
      console.error('Error fetching organization:', error)
      return null
    }

    return data
  }

  /**
   * Add role to existing user
   */
  async addRole(
    accountId: string,
    roleType: string,
    organizationId?: string,
    createOrg?: {
      name: string
      type: string
      businessNumber?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // If creating new organization
      if (createOrg) {
        const { data: org, error: orgError } = await this.supabase
          .from('organizations_v2')
          .insert({
            name: createOrg.name,
            type: createOrg.type,
            business_number: createOrg.businessNumber,
            owner_account_id: accountId,
            code: Math.random().toString(36).substring(2, 10).toUpperCase(),
          })
          .select()
          .single()

        if (orgError) throw orgError
        organizationId = org.id
      }

      // Add the role
      const { error: roleError } = await this.supabase
        .from('user_roles')
        .insert({
          account_id: accountId,
          organization_id: organizationId,
          role: roleType,
          is_active: true,
        })

      if (roleError) throw roleError

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '오류가 발생했습니다' }
    }
  }

  /**
   * Request parent consent for teen registration
   */
  async requestParentConsent(
    flowId: string,
    parentPhone: string,
    parentName: string
  ): Promise<{ success: boolean; consentUrl?: string; error?: string }> {
    try {
      // Generate consent URL
      const consentUrl = `${window.location.origin}/parent-consent/${flowId}`

      // In production, send SMS to parent
      // For now, we'll just return the URL
      console.log(`Would send SMS to ${parentPhone} for ${parentName}`)
      console.log(`Consent URL: ${consentUrl}`)

      // Update flow with parent info
      const { error } = await this.supabase
        .from('registration_flows')
        .update({
          flow_data: {
            parentConsent: {
              parentName,
              parentPhone,
              consentRequested: true,
              consentUrl,
            },
          },
        })
        .eq('id', flowId)

      if (error) throw error

      return { success: true, consentUrl }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '오류가 발생했습니다' }
    }
  }

  /**
   * Verify parent consent
   */
  async verifyParentConsent(
    flowId: string,
    consentCode: string
  ): Promise<{ success: boolean; verified: boolean; error?: string }> {
    try {
      // In production, verify the consent code
      // For now, we'll accept any 6-digit code
      const isValid = /^\d{6}$/.test(consentCode)

      if (isValid) {
        // Update flow as verified
        const { error } = await this.supabase
          .from('registration_flows')
          .update({
            current_step: 'role_selection',
            flow_data: {
              parentConsent: {
                verified: true,
                verifiedAt: new Date().toISOString(),
              },
            },
          })
          .eq('id', flowId)

        if (error) throw error
      }

      return { success: true, verified: isValid }
    } catch (error) {
      return { success: false, verified: false, error: error instanceof Error ? error.message : '오류가 발생했습니다' }
    }
  }

  /**
   * Resend verification code
   */
  async resendVerification(
    flowId: string,
    type: 'age' | 'parent'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In production, resend SMS or email
      console.log(`Resending ${type} verification for flow ${flowId}`)
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '오류가 발생했습니다' }
    }
  }

  /**
   * Cancel registration flow
   */
  async cancelRegistration(flowId: string): Promise<{ success: boolean }> {
    const { error } = await this.supabase
      .from('registration_flows')
      .delete()
      .eq('id', flowId)

    return { success: !error }
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Mock NICE API verification (for development)
   */
  async mockNiceVerification(data: any): Promise<boolean> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Always return true in development
    return true
  }

  /**
   * Mock NTS API verification (for development)
   */
  async mockNtsVerification(businessNumber: string): Promise<{
    isValid: boolean
    businessName: string
    representativeName: string
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Return mock data
    return {
      isValid: true,
      businessName: '테스트 사업장',
      representativeName: '홍길동',
    }
  }
}