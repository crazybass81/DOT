// Phase 1.3: 역할 관리 유틸리티 함수들
// TDD: 테스트를 통과시키기 위한 유틸리티 구현

import {
  MultiRoleUser,
  UserRole,
  Contract,
  RoleType,
  ContractStatus,
  RolePermissions,
  DashboardInfo
} from '@/types/multi-role';

/**
 * 사용자가 특정 역할을 가지고 있는지 확인
 */
export function hasRole(
  user: MultiRoleUser, 
  roleType: RoleType, 
  organizationId?: string
): boolean {
  return user.roles.some(role => 
    role.roleType === roleType && 
    role.isActive &&
    (organizationId ? role.organizationId === organizationId : true)
  );
}

/**
 * 사용자의 모든 활성 역할 반환
 */
export function getActiveRoles(user: MultiRoleUser): UserRole[] {
  return user.roles.filter(role => role.isActive);
}

/**
 * 사용자의 모든 활성 계약 반환
 */
export function getActiveContracts(user: MultiRoleUser): Contract[] {
  return user.contracts.filter(contract => 
    contract.isActive && 
    (contract.status === ContractStatus.ACTIVE || contract.status === ContractStatus.PENDING)
  );
}

/**
 * 사용자가 특정 조직에 접근할 수 있는지 확인
 */
export function canAccessOrganization(user: MultiRoleUser, organizationId: string): boolean {
  // 역할이나 계약을 통해 조직에 접근 가능한지 확인
  const hasRoleInOrg = user.roles.some(role => 
    role.organizationId === organizationId && role.isActive
  );
  
  const hasContractInOrg = user.contracts.some(contract =>
    contract.organizationId === organizationId && 
    contract.isActive &&
    contract.status === ContractStatus.ACTIVE
  );
  
  return hasRoleInOrg || hasContractInOrg;
}

/**
 * 역할별 권한 반환
 */
export function getRolePermissions(roleType: RoleType): RolePermissions {
  const basePermissions: RolePermissions = {
    canViewOwnAttendance: true,
    canViewOwnContracts: true,
    canManageEmployees: false,
    canManageOrganization: false,
    canCreateContracts: false,
    canApproveAttendance: false,
    canAccessSystemAdmin: false,
    canManageAllOrganizations: false,
    canManageFranchises: false,
    canViewFranchiseReports: false
  };

  switch (roleType) {
    case RoleType.WORKER:
      return {
        ...basePermissions
        // 근로자는 기본 권한만 가짐
      };

    case RoleType.MANAGER:
      return {
        ...basePermissions,
        canApproveAttendance: true,
        canManageEmployees: false // 제한적 직원 관리
      };

    case RoleType.ADMIN:
      return {
        ...basePermissions,
        canManageEmployees: true,
        canManageOrganization: true,
        canCreateContracts: true,
        canApproveAttendance: true
      };

    case RoleType.FRANCHISE:
      return {
        ...basePermissions,
        canManageEmployees: true,
        canManageOrganization: true,
        canCreateContracts: true,
        canApproveAttendance: true,
        canManageFranchises: true,
        canViewFranchiseReports: true
      };

    default:
      return basePermissions;
  }
}

/**
 * 역할을 한국어로 표시
 */
export function formatRoleDisplay(roleType: RoleType): string {
  const roleDisplayMap: Record<RoleType, string> = {
    [RoleType.WORKER]: '근로자',
    [RoleType.ADMIN]: '관리자',
    [RoleType.MANAGER]: '매니저',
    [RoleType.FRANCHISE]: '가맹본부'
  };

  return roleDisplayMap[roleType] || roleType;
}

/**
 * 계약 상태를 한국어로 표시
 */
export function formatContractStatus(status: ContractStatus): string {
  const statusDisplayMap: Record<ContractStatus, string> = {
    [ContractStatus.PENDING]: '대기중',
    [ContractStatus.ACTIVE]: '활성',
    [ContractStatus.TERMINATED]: '해지',
    [ContractStatus.EXPIRED]: '만료'
  };

  return statusDisplayMap[status] || status;
}

/**
 * 사용자가 접근 가능한 대시보드 목록 생성
 */
export function getAvailableDashboards(user: MultiRoleUser): DashboardInfo[] {
  const dashboards: DashboardInfo[] = [];
  
  // 근로자 대시보드들
  const activeContracts = getActiveContracts(user);
  activeContracts.forEach(contract => {
    dashboards.push({
      id: `worker-${contract.id}`,
      type: 'worker',
      title: `근로자 - ${contract.organizationName}`,
      description: `${contract.organizationName}에서의 근무 관리`,
      path: `/worker-dashboard?contract=${contract.id}`,
      role: user.roles.find(r => r.organizationId === contract.organizationId && r.roleType === RoleType.WORKER)!,
      contract
    });
  });

  // 관리자 대시보드들
  const adminRoles = user.roles.filter(role => 
    role.roleType === RoleType.ADMIN && role.isActive
  );
  adminRoles.forEach(role => {
    dashboards.push({
      id: `admin-${role.organizationId}`,
      type: 'admin',
      title: `관리자 - ${role.organizationName}`,
      description: `${role.organizationName} 조직 관리`,
      path: `/admin-dashboard?org=${role.organizationId}`,
      role
    });
  });

  // 매니저 대시보드들
  const managerRoles = user.roles.filter(role => 
    role.roleType === RoleType.MANAGER && role.isActive
  );
  managerRoles.forEach(role => {
    dashboards.push({
      id: `manager-${role.organizationId}`,
      type: 'manager',
      title: `매니저 - ${role.organizationName}`,
      description: `${role.organizationName} 팀 관리`,
      path: `/manager-dashboard?org=${role.organizationId}`,
      role
    });
  });

  // 가맹본부 대시보드들
  const franchiseRoles = user.roles.filter(role => 
    role.roleType === RoleType.FRANCHISE && role.isActive
  );
  franchiseRoles.forEach(role => {
    dashboards.push({
      id: `franchise-${role.organizationId}`,
      type: 'franchise',
      title: `가맹본부 - ${role.organizationName}`,
      description: `${role.organizationName} 가맹점 관리`,
      path: `/franchise-dashboard?org=${role.organizationId}`,
      role
    });
  });

  return dashboards.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * 사용자가 단일 역할인지 복합 역할인지 판단
 */
export function getUserRoleType(user: MultiRoleUser): 'single' | 'multiple' {
  const activeRoles = getActiveRoles(user);
  const activeContracts = getActiveContracts(user);
  
  const totalRoles = activeRoles.length + activeContracts.length;
  return totalRoles <= 1 ? 'single' : 'multiple';
}

/**
 * 기본 대시보드 경로 결정 (로그인 직후 리다이렉트용)
 */
export function getDefaultDashboardPath(user: MultiRoleUser): string {
  const dashboards = getAvailableDashboards(user);
  
  if (dashboards.length === 0) {
    return '/onboarding'; // 역할이 없으면 온보딩으로
  }
  
  if (dashboards.length === 1) {
    return dashboards[0].path; // 단일 역할이면 바로 해당 대시보드로
  }
  
  // 복합 역할이면 역할 선택 허브로
  return '/role-hub';
}

/**
 * Master Admin인지 확인
 */
export function isMasterAdmin(user: MultiRoleUser): boolean {
  // Master Admin은 특별한 이메일이나 메타데이터로 구분
  return user.email === 'archt723@gmail.com' || 
         user.metadata?.isMasterAdmin === true;
}

/**
 * 조직별로 역할 그룹핑
 */
export function groupRolesByOrganization(roles: UserRole[]): Record<string, UserRole[]> {
  return roles.reduce((acc, role) => {
    if (!acc[role.organizationId]) {
      acc[role.organizationId] = [];
    }
    acc[role.organizationId].push(role);
    return acc;
  }, {} as Record<string, UserRole[]>);
}