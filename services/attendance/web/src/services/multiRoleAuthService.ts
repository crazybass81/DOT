// Phase 1.4: 역할 기반 인증 서비스 확장
// TDD: 테스트를 통과시키기 위한 다중 역할 인증 서비스 구현

import { supabase } from '@/lib/supabase-config';
import {
  MultiRoleUser,
  UserRole,
  Contract,
  RoleType,
  ContractStatus,
  DashboardInfo,
  CreateRoleRequest,
  UpdateRoleRequest,
  ApiResponse
} from '../types/multi-role';

import {
  hasRole,
  getActiveRoles,
  getActiveContracts,
  canAccessOrganization,
  getRolePermissions,
  getAvailableDashboards,
  getDefaultDashboardPath,
  isMasterAdmin,
  getUserRoleType
} from '../utils/role-utils';

/**
 * 인증 결과 타입
 */
interface AuthResult {
  success: boolean;
  user: MultiRoleUser | null;
  error?: string;
  needsVerification?: boolean;
}

/**
 * 역할 관리 결과 타입
 */
interface RoleResult {
  success: boolean;
  role?: UserRole;
  error?: string;
}

/**
 * 다중 역할을 지원하는 확장 인증 서비스
 */
export class MultiRoleAuthService {
  
  /**
   * 역할 정보를 포함한 로그인
   */
  async signInWithRoles(email: string, password: string): Promise<AuthResult> {
    try {
      // 1. 기본 인증
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        return {
          success: false,
          user: null,
          error: authError?.message || '로그인에 실패했습니다'
        };
      }

      // 2. 사용자의 모든 역할과 계약 정보 로드
      const user = await this.loadUserWithRoles(authData.user.id);

      if (!user) {
        return {
          success: false,
          user: null,
          error: '사용자 정보를 로드할 수 없습니다'
        };
      }

      return {
        success: true,
        user
      };

    } catch (error: any) {
      return {
        success: false,
        user: null,
        error: error.message || '로그인 중 오류가 발생했습니다'
      };
    }
  }

  /**
   * 사용자 ID로 역할과 계약 정보를 포함한 사용자 정보 로드
   */
  async loadUserWithRoles(userId: string): Promise<MultiRoleUser | null> {
    try {
      // 1. 기본 사용자 정보 가져오기
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        return null;
      }

      // 2. 사용자의 모든 역할 가져오기
      const roles = await this.getUserRoles(userId);

      // 3. 사용자의 모든 계약 가져오기
      const contracts = await this.getUserContracts(userId);

      // 4. MultiRoleUser 객체 구성
      const multiRoleUser: MultiRoleUser = {
        id: userId,
        email: userData.user.email || '',
        name: userData.user.user_metadata?.name || userData.user.email?.split('@')[0] || '사용자',
        roles,
        contracts,
        metadata: userData.user.user_metadata || {}
      };

      return multiRoleUser;

    } catch (error) {
      console.error('Error loading user with roles:', error);
      return null;
    }
  }

  /**
   * 현재 로그인된 사용자 정보 가져오기
   */
  async getCurrentUser(): Promise<MultiRoleUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      return await this.loadUserWithRoles(user.id);

    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * 사용자의 모든 활성 역할 조회 (통합 테이블 사용)
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const { data, error } = await supabase
        .from('role_assignments')
        .select(`
          id,
          identity_id,
          organization_id,
          role,
          is_active,
          assigned_at,
          assigned_by,
          employee_code,
          department,
          position,
          organizations_v3!inner(name)
        `)
        .eq('identity_id', userId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        employeeId: item.identity_id, // Updated field mapping
        organizationId: item.organization_id,
        roleType: item.role as RoleType,
        isActive: item.is_active,
        grantedAt: new Date(item.assigned_at),
        grantedBy: item.assigned_by,
        organizationName: (item as any).organizations_v3?.name || '알 수 없는 조직'
      }));

    } catch (error) {
      console.error('Error in getUserRoles:', error);
      return [];
    }
  }

  /**
   * 특정 조직에서의 사용자 역할 조회
   */
  async getUserRolesInOrganization(userId: string, organizationId: string): Promise<UserRole[]> {
    const allRoles = await this.getUserRoles(userId);
    return allRoles.filter(role => role.organizationId === organizationId);
  }

  /**
   * 사용자의 모든 활성 계약 조회 (현재 통합 스키마에 contracts 테이블 없음)
   */
  async getUserContracts(userId: string): Promise<Contract[]> {
    // TODO: 통합 스키마에 contracts 테이블이 없으므로 빈 배열 반환
    // 필요시 별도의 contracts 테이블을 생성하거나 role_assignments로 통합
    console.log('getUserContracts called for userId:', userId);
    console.log('Contracts not implemented in unified schema yet - returning empty array');
    return [];
  }

  /**
   * 특정 조직의 사용자 계약 조회
   */
  async getUserContractsInOrganization(userId: string, organizationId: string): Promise<Contract[]> {
    const allContracts = await this.getUserContracts(userId);
    return allContracts.filter(contract => contract.organizationId === organizationId);
  }

  /**
   * 사용자 역할 추가
   */
  async addUserRole(userId: string, roleRequest: CreateRoleRequest): Promise<RoleResult> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          employee_id: roleRequest.employeeId,
          organization_id: roleRequest.organizationId,
          role_type: roleRequest.roleType,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // 조직 이름 가져오기
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', roleRequest.organizationId)
        .single();

      const role: UserRole = {
        id: data.id,
        employeeId: data.employee_id,
        organizationId: data.organization_id,
        roleType: data.role_type,
        isActive: data.is_active,
        grantedAt: new Date(data.granted_at),
        organizationName: orgData?.name || '알 수 없는 조직'
      };

      return {
        success: true,
        role
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || '역할 추가 중 오류가 발생했습니다'
      };
    }
  }

  /**
   * 사용자 역할 비활성화
   */
  async deactivateUserRole(userId: string, roleId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('id', roleId)
        .eq('employees.user_id', userId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || '역할 비활성화 중 오류가 발생했습니다'
      };
    }
  }

  /**
   * 사용자 역할 확인
   */
  async hasRole(userId: string, roleType: RoleType, organizationId?: string): Promise<boolean> {
    const user = await this.loadUserWithRoles(userId);
    if (!user) return false;

    return hasRole(user, roleType, organizationId);
  }

  /**
   * 조직 접근 권한 확인
   */
  async canAccessOrganization(userId: string, organizationId: string): Promise<boolean> {
    const user = await this.loadUserWithRoles(userId);
    if (!user) return false;

    return canAccessOrganization(user, organizationId);
  }

  /**
   * 특정 작업 수행 권한 확인
   */
  async canPerformAction(userId: string, action: string, organizationId?: string): Promise<boolean> {
    const user = await this.loadUserWithRoles(userId);
    if (!user) return false;

    // 조직별 역할 확인
    const orgRoles = user.roles.filter(role => 
      role.isActive && (!organizationId || role.organizationId === organizationId)
    );

    for (const role of orgRoles) {
      const permissions = getRolePermissions(role.roleType);
      
      switch (action) {
        case 'manage-employees':
          if (permissions.canManageEmployees) return true;
          break;
        case 'manage-organization':
          if (permissions.canManageOrganization) return true;
          break;
        case 'view-attendance':
          if (permissions.canViewOwnAttendance) return true;
          break;
        case 'approve-attendance':
          if (permissions.canApproveAttendance) return true;
          break;
        case 'create-contracts':
          if (permissions.canCreateContracts) return true;
          break;
        case 'system-admin':
          if (permissions.canAccessSystemAdmin) return true;
          break;
        default:
          break;
      }
    }

    return false;
  }

  /**
   * 사용자 접근 가능 대시보드 목록
   */
  async getAvailableDashboards(userId: string): Promise<DashboardInfo[]> {
    const user = await this.loadUserWithRoles(userId);
    if (!user) return [];

    return getAvailableDashboards(user);
  }

  /**
   * 기본 대시보드 경로 결정
   */
  async getDefaultDashboardPath(userId: string): Promise<string> {
    const user = await this.loadUserWithRoles(userId);
    if (!user) return '/login';

    return getDefaultDashboardPath(user);
  }

  /**
   * Master Admin 확인
   */
  async isMasterAdmin(emailOrUserId: string): Promise<boolean> {
    // 이메일로 직접 확인
    if (emailOrUserId === 'archt723@gmail.com') {
      return true;
    }

    // 사용자 ID로 확인
    try {
      const user = await this.loadUserWithRoles(emailOrUserId);
      if (!user) return false;

      return isMasterAdmin(user);
    } catch {
      return false;
    }
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || '로그아웃 중 오류가 발생했습니다'
      };
    }
  }

  /**
   * 세션 정보 가져오기
   */
  async getSession() {
    return await supabase.auth.getSession();
  }

  /**
   * 인증 상태 변경 리스너 등록
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

// 싱글톤 인스턴스 export
export const multiRoleAuthService = new MultiRoleAuthService();