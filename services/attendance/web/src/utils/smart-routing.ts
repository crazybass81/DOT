import { MultiRoleUser, RoleType } from '../types/multi-role';

// 대시보드 정보 인터페이스
export interface DashboardInfo {
  path: string;
  label: string;
  roleType: RoleType;
  organizationId?: string;
}

// 스마트 라우팅 결과
export interface SmartRoutingResult {
  defaultPath: string;
  availablePaths: DashboardInfo[];
  hasMultipleRoles: boolean;
  totalRoles: number;
  suggestedPath?: string;
}

// 역할별 권한 레벨 (높을수록 상위 권한)
const ROLE_HIERARCHY: Record<RoleType, number> = {
  [RoleType.FRANCHISE]: 4,
  [RoleType.MANAGER]: 3,
  [RoleType.ADMIN]: 2,
  [RoleType.WORKER]: 1
};

// 역할별 대시보드 경로 매핑
const ROLE_DASHBOARD_MAP: Record<RoleType, { path: string; label: string }> = {
  [RoleType.WORKER]: {
    path: '/dashboard/worker',
    label: '근로자 대시보드'
  },
  [RoleType.ADMIN]: {
    path: '/dashboard/admin',
    label: '관리자 대시보드'
  },
  [RoleType.MANAGER]: {
    path: '/dashboard/manager',
    label: '매니저 대시보드'
  },
  [RoleType.FRANCHISE]: {
    path: '/dashboard/franchise',
    label: '프랜차이즈 대시보드'
  }
};

/**
 * 사용자의 활성 역할들을 반환
 */
function getActiveRoles(user: MultiRoleUser, organizationId?: string) {
  if (!user?.roles || !Array.isArray(user.roles)) {
    return [];
  }

  return user.roles.filter(role => {
    if (!role.isActive) return false;
    if (organizationId && role.organizationId !== organizationId) return false;
    return true;
  });
}

/**
 * 역할 타입별로 그룹화하고 중복 제거
 */
function getUniqueRoleTypes(roles: MultiRoleUser['roles']): RoleType[] {
  if (!roles || !Array.isArray(roles)) return [];
  
  const roleTypes = new Set(roles.map(role => role.roleType));
  return Array.from(roleTypes);
}

/**
 * 권한 레벨에 따라 역할 타입들을 정렬
 */
function sortRolesByHierarchy(roleTypes: RoleType[]): RoleType[] {
  return roleTypes.sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
}

/**
 * 사용자의 기본 대시보드를 결정
 */
export function determineDefaultDashboard(
  user: MultiRoleUser,
  organizationId?: string
): string {
  try {
    const activeRoles = getActiveRoles(user, organizationId);
    
    if (activeRoles.length === 0) {
      return '/dashboard'; // 기본 대시보드
    }

    const uniqueRoleTypes = getUniqueRoleTypes(activeRoles);
    const sortedRoles = sortRolesByHierarchy(uniqueRoleTypes);
    
    // 가장 높은 권한의 역할 대시보드로 라우팅
    const highestRole = sortedRoles[0];
    return ROLE_DASHBOARD_MAP[highestRole]?.path || '/dashboard';
  } catch (error) {
    console.error('Error determining default dashboard:', error);
    return '/dashboard';
  }
}

/**
 * 사용자가 접근 가능한 모든 대시보드 반환
 */
export function getPossibleDashboards(
  user: MultiRoleUser,
  organizationId?: string
): DashboardInfo[] {
  try {
    const activeRoles = getActiveRoles(user, organizationId);
    
    if (activeRoles.length === 0) {
      return [];
    }

    const uniqueRoleTypes = getUniqueRoleTypes(activeRoles);
    const sortedRoles = sortRolesByHierarchy(uniqueRoleTypes);
    
    return sortedRoles.map(roleType => ({
      path: ROLE_DASHBOARD_MAP[roleType].path,
      label: ROLE_DASHBOARD_MAP[roleType].label,
      roleType
    }));
  } catch (error) {
    console.error('Error getting possible dashboards:', error);
    return [];
  }
}

/**
 * 조직별 역할 분석
 */
function analyzeRolesByOrganization(user: MultiRoleUser) {
  if (!user?.roles) return {};

  const orgRoles: Record<string, { roleTypes: RoleType[]; count: number }> = {};
  
  user.roles.filter(role => role.isActive).forEach(role => {
    if (!orgRoles[role.organizationId]) {
      orgRoles[role.organizationId] = { roleTypes: [], count: 0 };
    }
    
    if (!orgRoles[role.organizationId].roleTypes.includes(role.roleType)) {
      orgRoles[role.organizationId].roleTypes.push(role.roleType);
    }
    orgRoles[role.organizationId].count++;
  });

  return orgRoles;
}

/**
 * 사용자 선호도 기반 대시보드 추천
 */
function getSuggestedDashboard(
  availablePaths: DashboardInfo[],
  lastAccessedDashboard?: string,
  userPreferences?: { preferredRoleType?: RoleType }
): string | undefined {
  // 최근 접속한 대시보드가 사용 가능한 경우
  if (lastAccessedDashboard) {
    const isAvailable = availablePaths.some(path => path.path === lastAccessedDashboard);
    if (isAvailable) {
      return lastAccessedDashboard;
    }
  }

  // 사용자 선호 역할이 있는 경우
  if (userPreferences?.preferredRoleType) {
    const preferredDashboard = availablePaths.find(
      path => path.roleType === userPreferences.preferredRoleType
    );
    if (preferredDashboard) {
      return preferredDashboard.path;
    }
  }

  return undefined;
}

/**
 * 스마트 라우팅 메인 함수
 */
export function smartRouter(
  user: MultiRoleUser | null | undefined,
  organizationId?: string,
  lastAccessedDashboard?: string,
  userPreferences?: { preferredRoleType?: RoleType }
): SmartRoutingResult {
  // 사용자가 없거나 유효하지 않은 경우
  if (!user) {
    return {
      defaultPath: '/dashboard',
      availablePaths: [],
      hasMultipleRoles: false,
      totalRoles: 0
    };
  }

  try {
    const activeRoles = getActiveRoles(user, organizationId);
    const availablePaths = getPossibleDashboards(user, organizationId);
    const defaultPath = determineDefaultDashboard(user, organizationId);
    
    const uniqueRoleTypes = getUniqueRoleTypes(activeRoles);
    const hasMultipleRoles = uniqueRoleTypes.length > 1;
    const totalRoles = activeRoles.length;

    const suggestedPath = getSuggestedDashboard(
      availablePaths,
      lastAccessedDashboard,
      userPreferences
    );

    return {
      defaultPath,
      availablePaths,
      hasMultipleRoles,
      totalRoles,
      suggestedPath
    };
  } catch (error) {
    console.error('Smart routing error:', error);
    return {
      defaultPath: '/dashboard',
      availablePaths: [],
      hasMultipleRoles: false,
      totalRoles: 0
    };
  }
}

/**
 * 특정 대시보드에 대한 접근 권한 확인
 */
export function canAccessDashboard(
  user: MultiRoleUser,
  dashboardPath: string,
  organizationId?: string
): boolean {
  if (!user) return false;

  try {
    const availablePaths = getPossibleDashboards(user, organizationId);
    return availablePaths.some(path => path.path === dashboardPath);
  } catch (error) {
    console.error('Error checking dashboard access:', error);
    return false;
  }
}

/**
 * 사용자의 조직별 역할 요약 정보
 */
export function getUserRoleSummary(user: MultiRoleUser) {
  if (!user?.roles) {
    return {
      totalOrganizations: 0,
      totalActiveRoles: 0,
      rolesByOrganization: {},
      highestRole: null
    };
  }

  const activeRoles = user.roles.filter(role => role.isActive);
  const organizations = new Set(activeRoles.map(role => role.organizationId));
  const rolesByOrg = analyzeRolesByOrganization(user);
  
  const allRoleTypes = getUniqueRoleTypes(activeRoles);
  const highestRole = sortRolesByHierarchy(allRoleTypes)[0] || null;

  return {
    totalOrganizations: organizations.size,
    totalActiveRoles: activeRoles.length,
    rolesByOrganization: rolesByOrg,
    highestRole
  };
}

/**
 * 대시보드 스위처에서 사용할 조직별 대시보드 옵션
 */
export function getDashboardSwitcherOptions(user: MultiRoleUser): Array<{
  organizationId: string;
  organizationName: string;
  dashboards: DashboardInfo[];
}> {
  if (!user?.roles) return [];

  const activeRoles = user.roles.filter(role => role.isActive);
  const orgGroups = new Map<string, DashboardInfo[]>();

  activeRoles.forEach(role => {
    if (!orgGroups.has(role.organizationId)) {
      orgGroups.set(role.organizationId, []);
    }

    const existing = orgGroups.get(role.organizationId)!;
    const dashboardInfo = {
      path: ROLE_DASHBOARD_MAP[role.roleType].path,
      label: ROLE_DASHBOARD_MAP[role.roleType].label,
      roleType: role.roleType,
      organizationId: role.organizationId
    };

    // 중복 제거
    if (!existing.find(d => d.roleType === role.roleType)) {
      existing.push(dashboardInfo);
    }
  });

  return Array.from(orgGroups.entries()).map(([orgId, dashboards]) => ({
    organizationId: orgId,
    organizationName: `조직 ${orgId}`, // 실제로는 조직 이름을 DB에서 가져와야 함
    dashboards: sortRolesByHierarchy(dashboards.map(d => d.roleType))
      .map(roleType => dashboards.find(d => d.roleType === roleType)!)
  }));
}