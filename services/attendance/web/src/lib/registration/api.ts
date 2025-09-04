import { SupabaseClient } from '@supabase/supabase-js'
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase-config'

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
  auth_user_id: string
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
  role_type: 'WORKER' | 'ADMIN' | 'MANAGER' | 'FRANCHISE'
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
    // employees 테이블에서 중복 확인
    const { data: emailCheck } = await this.supabase
      .from('employees')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    const { data: phoneCheck } = await this.supabase
      .from('employees')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    return {
      emailAvailable: !emailCheck,
      phoneAvailable: !phoneCheck,
      existingAccount: !!emailCheck || !!phoneCheck,
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
    employee?: Employee
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

      // 3. employees 테이블에 추가 (역할 없이, 대기 상태)
      const { data: employee, error: empError } = await this.supabase
        .from('employees')
        .insert({
          auth_user_id: authUser.user.id,
          email: data.email,
          phone: data.phone,
          name: data.fullName,
          birth_date: data.birthDate,
          role: 'EMPLOYEE',
          approval_status: 'PENDING',
          is_active: true
        })
        .select()
        .single()

      if (empError) {
        console.error('Employee creation error:', empError)
        // Auth 계정 삭제
        await this.supabase.auth.admin.deleteUser(authUser.user.id)
        return { success: false, error: '직원 정보 생성 실패' }
      }

      // 4. 청소년인 경우 메타데이터에 표시
      if (age < 18) {
        await this.supabase
          .from('employees')
          .update({
            metadata: {
              is_teen: true,
              requires_parent_consent: true
            }
          })
          .eq('id', employee.id)
      }

      return {
        success: true,
        user: authUser.user,
        employee
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
    employee?: Employee
    organization?: Organization
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

      // 3. 조직 생성 (개인사업자/법인/가맹본부인 경우)
      let organization: Organization | undefined
      let role: 'EMPLOYEE' | 'ADMIN' = 'EMPLOYEE'
      let roleType: 'WORKER' | 'ADMIN' = 'WORKER'

      if (data.registrationType !== 'personal' && data.businessInfo) {
        const bizType = data.registrationType === 'business_owner' ? 'PERSONAL' :
                       data.registrationType === 'corporation_founder' ? 'CORP' :
                       'FRANCHISE'

        const orgCode = Math.random().toString(36).substring(2, 10).toUpperCase()

        const { data: newOrg, error: orgError } = await this.supabase
          .from('organizations')
          .insert({
            name: data.businessInfo.name,
            code: orgCode,
            biz_number: data.businessInfo.bizNumber,
            biz_type: bizType,
            is_active: true,
            metadata: {
              founder_id: authUser.user.id,
              founded_at: new Date().toISOString(),
              address: data.businessInfo.address || null
            }
          })
          .select()
          .single()

        if (orgError) {
          console.error('Organization creation error:', orgError)
          // Auth 계정 삭제
          await this.supabase.auth.admin.deleteUser(authUser.user.id)
          return { success: false, error: '조직 생성 실패' }
        }

        organization = newOrg
        role = 'ADMIN'
        roleType = 'ADMIN'
      }

      // 4. employees 테이블에 추가
      const { data: employee, error: empError } = await this.supabase
        .from('employees')
        .insert({
          auth_user_id: authUser.user.id,
          organization_id: organization?.id,
          email: data.email,
          phone: data.phone,
          name: data.fullName,
          birth_date: data.birthDate,
          role: role,
          approval_status: organization ? 'APPROVED' : 'PENDING',
          is_active: true,
          approved_at: organization ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (empError) {
        console.error('Employee creation error:', empError)
        // Auth 계정 삭제
        await this.supabase.auth.admin.deleteUser(authUser.user.id)
        return { success: false, error: '직원 정보 생성 실패' }
      }

      // 5. user_roles 테이블에 역할 추가
      if (organization) {
        const { error: roleError } = await this.supabase
          .from('user_roles')
          .insert({
            employee_id: employee.id,
            organization_id: organization.id,
            role_type: roleType,
            is_active: true,
            granted_at: new Date().toISOString(),
            granted_by: employee.id // 자기 자신이 부여
          })

        if (roleError) {
          console.error('Role assignment error:', roleError)
        }
      }

      // 6. 청소년인 경우 계약 정보에 표시
      if (age < 18) {
        // contracts 테이블에 청소년 표시를 위한 준비
        // 실제 계약은 나중에 생성됨
        await this.supabase
          .from('employees')
          .update({
            metadata: {
              ...employee.metadata,
              is_teen: true,
              requires_parent_consent: true
            }
          })
          .eq('id', employee.id)
      }

      return {
        success: true,
        user: authUser.user,
        employee,
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
    employee?: Employee
    roles?: UserRole[]
    error?: string
  }> {
    try {
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError || !authData.user) {
        return { success: false, error: authError?.message || '로그인 실패' }
      }

      // 직원 정보 조회
      const { data: employee } = await this.supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single()

      if (!employee) {
        return { success: false, error: '직원 정보를 찾을 수 없습니다.' }
      }

      // 역할 정보 조회
      const { data: roles } = await this.supabase
        .from('user_roles')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('is_active', true)

      return {
        success: true,
        user: authData.user,
        employee,
        roles: roles || []
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
  async getOrganizationByCode(code: string): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Organization fetch error:', error)
      return null
    }

    return data
  }

  /**
   * 기존 직원에게 역할 추가
   */
  async addRole(
    employeeId: string,
    organizationId: string,
    roleType: 'WORKER' | 'ADMIN' | 'MANAGER' | 'FRANCHISE'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .insert({
          employee_id: employeeId,
          organization_id: organizationId,
          role_type: roleType,
          is_active: true,
          granted_at: new Date().toISOString(),
          granted_by: employeeId // 임시로 자기 자신
        })

      if (error) throw error

      // employees 테이블의 role도 업데이트 (필요한 경우)
      if (roleType === 'ADMIN') {
        await this.supabase
          .from('employees')
          .update({ role: 'ADMIN' })
          .eq('id', employeeId)
      } else if (roleType === 'MANAGER') {
        await this.supabase
          .from('employees')
          .update({ role: 'MANAGER' })
          .eq('id', employeeId)
      }

      return { success: true }
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
    employee: Employee | null
    roles: UserRole[]
    organizations: Organization[]
  } | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    if (!user) return null

    // 직원 정보 조회
    const { data: employee } = await this.supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (!employee) {
      return { user, employee: null, roles: [], organizations: [] }
    }

    // 역할 조회
    const { data: roles } = await this.supabase
      .from('user_roles')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('is_active', true)

    // 조직 정보 조회
    const orgIds = roles?.map(r => r.organization_id).filter(Boolean) || []
    let organizations: Organization[] = []
    
    if (orgIds.length > 0) {
      const { data: orgs } = await this.supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
      
      organizations = orgs || []
    }

    return {
      user,
      employee,
      roles: roles || [],
      organizations
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
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { success: false, error: '로그인이 필요합니다' }
      }

      // 1. 직원 정보 조회
      const { data: employee } = await this.supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!employee) {
        return { success: false, error: '직원 정보를 찾을 수 없습니다' }
      }

      // 2. 법인 조직 생성
      const orgCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      const { data: organization, error: orgError } = await this.supabase
        .from('organizations')
        .insert({
          name: data.business.corporationName,
          code: orgCode,
          biz_number: data.business.businessNumber,
          biz_type: 'CORP',
          is_active: true,
          metadata: {
            representative_name: data.business.representativeName,
            establish_date: data.business.establishDate,
            address: data.business.businessAddress,
            founder_id: user.id
          }
        })
        .select()
        .single()

      if (orgError || !organization) {
        console.error('Organization creation error:', orgError)
        return { success: false, error: '법인 생성 실패' }
      }

      // 3. 직원 정보 업데이트 (ADMIN 역할로)
      await this.supabase
        .from('employees')
        .update({
          organization_id: organization.id,
          role: 'ADMIN',
          approval_status: 'APPROVED',
          approved_at: new Date().toISOString()
        })
        .eq('id', employee.id)

      // 4. user_roles 테이블에 ADMIN 역할 추가
      await this.supabase
        .from('user_roles')
        .insert({
          employee_id: employee.id,
          organization_id: organization.id,
          role_type: 'ADMIN',
          is_active: true,
          granted_at: new Date().toISOString(),
          granted_by: employee.id
        })

      // 5. contracts 테이블에 근로계약 생성
      await this.supabase
        .from('contracts')
        .insert({
          employee_id: employee.id,
          organization_id: organization.id,
          start_date: new Date().toISOString().split('T')[0],
          status: 'ACTIVE',
          wage: parseFloat(data.employment.wageAmount),
          wage_type: data.employment.wageType.toUpperCase(),
          terms: {
            position: data.employment.position,
            work_start_time: data.employment.workStartTime,
            work_end_time: data.employment.workEndTime,
            work_days: data.employment.workDays,
            lunch_break_minutes: parseInt(data.employment.lunchBreak),
            annual_leave_days: parseInt(data.employment.annualLeave)
          },
          is_teen: false
        })

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
    await this.supabase.auth.signOut()
  }

  /**
   * 세션 확인
   */
  async checkSession(): Promise<boolean> {
    const { data: { session } } = await this.supabase.auth.getSession()
    return !!session
  }
}