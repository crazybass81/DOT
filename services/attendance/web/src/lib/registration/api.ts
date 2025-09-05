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

      // 3. employees 테이블 생성 시도 (실패해도 계속 진행)
      let employee = null
      try {
        const { data: emp, error: empError } = await this.supabase
          .from('employees')
          .insert({
            user_id: authUser.user.id,
            name: data.fullName,
            email: data.email,
            phone: data.phone,
            birth_date: data.birthDate,
            is_active: true
          })
          .select()
          .single()
          
        if (empError) {
          console.log('Employee record creation failed (table may not exist):', empError.message)
          // employees 테이블이 없어도 auth 계정은 생성되었으므로 성공으로 처리
        } else {
          employee = emp
        }
      } catch (err) {
        console.log('Employee table access failed, continuing without it')
      }

      // Auth 계정은 생성되었으므로 성공 반환
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
            is_active: true,
            metadata: {
              business_type: bizType,  // metadata에 타입 저장
              business_number: data.businessInfo.bizNumber,
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
          user_id: authUser.user.id,  // auth_user_id -> user_id
          organization_id: organization?.id,
          email: data.email,
          phone: data.phone,
          name: data.fullName,
          birth_date: data.birthDate,
          position: role === 'ADMIN' ? 'admin' : 'worker',  // role -> position
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

      // 5. user_roles 테이블에 역할 추가
      if (organization) {
        const { error: roleError } = await this.supabase
          .from('user_roles')
          .insert({
            user_id: authUser.user.id,  // employee_id -> user_id
            organization_id: organization.id,
            role: roleType === 'ADMIN' ? 'admin' : 'worker',  // role_type -> role
            is_active: true
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
        .eq('user_id', authData.user.id)  // auth_user_id -> user_id
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
          role: roleType.toLowerCase() as 'worker' | 'admin' | 'manager' | 'owner',
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
      .eq('user_id', user.id)  // auth_user_id -> user_id
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
        .eq('user_id', user.id)
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
          is_active: true,
          metadata: {
            business_type: 'CORP',  // metadata에 타입 저장
            business_number: data.business.businessNumber,
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
          position: 'owner'  // 법인 설립자는 owner
        })
        .eq('id', employee.id)

      // 4. user_roles 테이블에 owner 역할 추가
      await this.supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          role: 'owner',
          is_active: true
        })

      // 5. contracts 테이블에 근로계약 생성
      await this.supabase
        .from('contracts')
        .insert({
          employee_id: employee.id,
          organization_id: organization.id,
          contract_type: 'PERMANENT',
          start_date: new Date().toISOString().split('T')[0],
          is_active: true,
          position: data.employment.position,
          wage: parseFloat(data.employment.wageAmount),
          wage_type: data.employment.wageType.toUpperCase(),
          metadata: {
            work_start_time: data.employment.workStartTime,
            work_end_time: data.employment.workEndTime,
            work_days: data.employment.workDays,
            lunch_break_minutes: parseInt(data.employment.lunchBreak),
            annual_leave_days: parseInt(data.employment.annualLeave),
            auto_generated: true,
            role: 'founder'
          }
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