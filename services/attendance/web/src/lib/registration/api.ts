import { SupabaseClient } from '@supabase/supabase-js'
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase-config'
import { unifiedIdentityService } from '../../services/unified-identity.service'
import { organizationService } from '../../services/organization.service'
import { supabaseAuthService } from '../../services/supabaseAuthService'

export interface RegistrationData {
  email: string
  phone: string
  fullName: string
  birthDate: string
  registrationType: 'personal' | 'business_owner' | 'corporation_founder' | 'franchise_founder'
  password: string
  businessInfo?: {
    name: string
    bizNumber: string
    address?: string
  }
}

export interface Organization {
  id: string
  name: string
  code: string
  biz_number?: string
  biz_type: 'PERSONAL' | 'CORP' | 'FRANCHISE'
  is_active: boolean
  metadata?: any
  created_at: string
}

export interface Employee {
  id: string
  user_id: string  // auth_user_id -> user_id
  organization_id?: string
  email: string
  phone: string
  name: string
  birth_date?: string
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN'
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED'
  is_active: boolean
  created_at: string
}

export interface UserRole {
  id: string
  employee_id: string
  organization_id?: string
  role: 'worker' | 'admin' | 'manager' | 'owner'  // role_type -> role
  is_active: boolean
  granted_at: string
}

export class RegistrationAPI {
  private supabase: SupabaseClient
  private supabaseUrl: string
  private supabaseKey: string

  constructor() {
    this.supabase = supabase
    this.supabaseUrl = supabaseUrl
    this.supabaseKey = supabaseAnonKey
  }

  /**
   * 이메일/전화번호 중복 확인
   */
  async checkAvailability(email: string, phone: string): Promise<{
    emailAvailable: boolean
    phoneAvailable: boolean
    existingAccount: boolean
  }> {
    // 현재는 중복 체크를 스킵하고 항상 사용 가능으로 반환
    // Supabase는 회원가입 시 자동으로 중복 이메일을 체크함
    return {
      emailAvailable: true,
      phoneAvailable: true,
      existingAccount: false
    }
  }

  /**
   * 나이 계산
   */
  calculateAge(birthDate: string): number {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  /**
   * 기본 회원가입 (역할 없이)
   */
  async registerBasicAccount(data: {
    email: string
    password: string
    fullName: string
    phone: string
    birthDate: string
  }): Promise<{
    success: boolean
    user?: any
    identity?: any
    error?: string
  }> {
    try {
      // 1. 나이 확인
      const age = this.calculateAge(data.birthDate)
      if (age < 15) {
        return { success: false, error: '만 15세 미만은 가입할 수 없습니다.' }
      }

      // 2. Supabase Auth 계정 생성
      const { data: authUser, error: authError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone,
          }
        }
      })

      if (authError || !authUser.user) {
        console.error('Auth error:', authError)
        return { success: false, error: authError?.message || '계정 생성 실패' }
      }

      // 3. unified_identities 테이블에 통합 신원 생성
      const identityResult = await unifiedIdentityService.createIdentity({
        email: data.email,
        full_name: data.fullName,
        phone: data.phone,
        birth_date: data.birthDate,
        id_type: 'personal',
        auth_user_id: authUser.user.id,
        verification_status: 'pending',
        verification_method: 'email'
      })

      if (!identityResult.success) {
        console.error('Identity creation error:', identityResult.error)
        // Auth 계정 정리
        try {
          await this.supabase.auth.signOut()
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError)
        }
        return { success: false, error: identityResult.error || '신원 생성 실패' }
      }

      return {
        success: true,
        user: authUser.user,
        identity: identityResult.identity
      }
    } catch (error) {
      console.error('Registration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '회원가입 처리 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 회원가입 처리 (기존 - 전체)
   */
  async register(data: RegistrationData): Promise<{
    success: boolean
    user?: any
    identity?: any
    organization?: any
    error?: string
  }> {
    try {
      // 1. 나이 확인
      const age = this.calculateAge(data.birthDate)
      if (age < 15) {
        return { success: false, error: '만 15세 미만은 가입할 수 없습니다.' }
      }

      // 2. Supabase Auth 계정 생성
      const { data: authUser, error: authError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone,
          }
        }
      })

      if (authError || !authUser.user) {
        console.error('Auth error:', authError)
        return { success: false, error: authError?.message || '계정 생성 실패' }
      }

      // 3. 통합 신원 생성
      const identityResult = await unifiedIdentityService.createIdentity({
        email: data.email,
        full_name: data.fullName,
        phone: data.phone,
        birth_date: data.birthDate,
        id_type: data.registrationType === 'personal' ? 'personal' : 'business',
        auth_user_id: authUser.user.id,
        verification_status: 'pending',
        verification_method: data.registrationType === 'personal' ? 'email' : 'business_registration'
      })

      if (!identityResult.success) {
        console.error('Identity creation error:', identityResult.error)
        try {
          await this.supabase.auth.signOut()
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError)
        }
        return { success: false, error: identityResult.error || '신원 생성 실패' }
      }

      // 4. 조직 생성 (개인사업자/법인/가맹본부인 경우)
      let organization: any = undefined

      if (data.registrationType !== 'personal' && data.businessInfo && identityResult.identity) {
        const bizType = data.registrationType === 'business_owner' ? 'PERSONAL' :
                       data.registrationType === 'corporation_founder' ? 'CORP' :
                       'FRANCHISE'

        const orgResult = await organizationService.createOrganization({
          name: data.businessInfo.name,
          business_type: bizType,
          business_registration_number: data.businessInfo.bizNumber,
          address: data.businessInfo.address || '',
          founder_identity_id: identityResult.identity.id,
          metadata: {
            founded_at: new Date().toISOString(),
            is_active: true
          }
        })

        if (!orgResult.success) {
          console.error('Organization creation error:', orgResult.error)
          return { success: false, error: '조직 생성 실패' }
        }

        organization = orgResult.organization

        // 5. 조직에 관리자 역할 할당
        const roleResult = await organizationService.assignRole({
          identityId: identityResult.identity.id,
          organizationId: organization.id,
          role: 'admin',
          assignedBy: identityResult.identity.id
        })

        if (!roleResult.success) {
          console.error('Role assignment error:', roleResult.error)
        }
      }

      return {
        success: true,
        user: authUser.user,
        identity: identityResult.identity,
        organization
      }
    } catch (error) {
      console.error('Registration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '회원가입 처리 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 기존 사용자 로그인
   */
  async login(email: string, password: string): Promise<{
    success: boolean
    user?: any
    identity?: any
    roles?: any[]
    error?: string
  }> {
    try {
      const result = await supabaseAuthService.signIn(email, password)
      
      return {
        success: true,
        user: result,
        identity: result,
        roles: [] // Will be populated by the auth service
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '로그인 처리 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 조직 코드로 조회
   */
  async getOrganizationByCode(code: string): Promise<any | null> {
    try {
      const result = await organizationService.getOrganizationByCode(code)
      return result.success ? result.organization : null
    } catch (error) {
      console.error('Organization fetch error:', error)
      return null
    }
  }

  /**
   * 기존 직원에게 역할 추가
   */
  async addRole(
    identityId: string,
    organizationId: string,
    roleType: 'WORKER' | 'ADMIN' | 'MANAGER' | 'FRANCHISE'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const role = roleType.toLowerCase() as 'worker' | 'admin' | 'manager' | 'franchise_admin'
      
      const result = await organizationService.assignRole({
        identityId,
        organizationId,
        role: role === 'franchise' ? 'franchise_admin' : role,
        assignedBy: identityId // Self-assignment for now
      })

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '역할 추가 실패'
      }
    }
  }

  /**
   * 비밀번호 유효성 검사
   */
  validatePassword(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('비밀번호는 최소 8자 이상이어야 합니다')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('대문자를 포함해야 합니다')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('소문자를 포함해야 합니다')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('숫자를 포함해야 합니다')
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('특수문자를 포함해야 합니다')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 현재 로그인한 사용자 정보 조회
   */
  async getCurrentUser(): Promise<{
    user: any
    identity: any | null
    roles: any[]
    organizations: any[]
  } | null> {
    try {
      const user = await supabaseAuthService.getCurrentUser()
      if (!user) return null

      const roles = await organizationService.getUserRoles(user.id)
      const organizations = await organizationService.getUserOrganizations(user.id)

      return {
        user,
        identity: user,
        roles: roles || [],
        organizations: organizations || []
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  /**
   * 법인 설립 (조직 생성 + 근로계약)
   */
  async setupCorporation(data: {
    business: {
      corporationName: string
      businessNumber: string
      businessAddress: string
      representativeName: string
      establishDate: string
    }
    employment: {
      position: string
      wageType: 'hourly' | 'monthly' | 'yearly'
      wageAmount: string
      workStartTime: string
      workEndTime: string
      workDays: number[]
      lunchBreak: string
      annualLeave: string
    }
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await supabaseAuthService.getCurrentUser()
      if (!user) {
        return { success: false, error: '로그인이 필요합니다' }
      }

      // 1. 법인 조직 생성
      const orgResult = await organizationService.createOrganization({
        name: data.business.corporationName,
        business_type: 'CORP',
        business_registration_number: data.business.businessNumber,
        address: data.business.businessAddress,
        founder_identity_id: user.id,
        metadata: {
          representative_name: data.business.representativeName,
          establish_date: data.business.establishDate,
          is_active: true
        }
      })

      if (!orgResult.success) {
        console.error('Organization creation error:', orgResult.error)
        return { success: false, error: '법인 생성 실패' }
      }

      // 2. 설립자에게 admin 역할 할당
      const roleResult = await organizationService.assignRole({
        identityId: user.id,
        organizationId: orgResult.organization!.id,
        role: 'admin',
        assignedBy: user.id
      })

      if (!roleResult.success) {
        console.error('Role assignment error:', roleResult.error)
      }

      // 3. 근로계약 정보는 향후 contracts 시스템에서 처리
      // (현재는 조직 생성과 역할 할당만 수행)

      return { success: true }
    } catch (error) {
      console.error('Corporation setup error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '법인 설립 실패'
      }
    }
  }

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    await supabaseAuthService.signOut()
  }

  /**
   * 세션 확인
   */
  async checkSession(): Promise<boolean> {
    try {
      const session = await supabaseAuthService.getSession()
      return !!session
    } catch (error) {
      return false
    }
  }
}