// Phase 1.4: 역할 기반 인증 서비스 확장 테스트
// TDD: 다중 역할 지원 인증 서비스 요구사항 정의

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// 테스트할 확장 인증 서비스 import (아직 구현 안됨)
import { MultiRoleAuthService } from '@/services/multiRoleAuthService';
import { RoleType, ContractStatus } from '@/types/multi-role';

// Mock 데이터
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: '테스트 사용자'
};

const mockUserRoles = [
  {
    id: 'role-1',
    employeeId: 'emp-1',
    organizationId: 'org-1',
    roleType: RoleType.WORKER,
    isActive: true,
    grantedAt: new Date(),
    organizationName: 'A카페'
  },
  {
    id: 'role-2',
    employeeId: 'emp-2',
    organizationId: 'org-2',
    roleType: RoleType.ADMIN,
    isActive: true,
    grantedAt: new Date(),
    organizationName: 'B법인'
  }
];

const mockContracts = [
  {
    id: 'contract-1',
    employeeId: 'emp-1',
    organizationId: 'org-1',
    contractType: 'PART_TIME' as any,
    startDate: new Date('2024-01-01'),
    status: ContractStatus.ACTIVE,
    wageAmount: 12000,
    wageType: 'HOURLY',
    isActive: true,
    organizationName: 'A카페'
  }
];

describe('MultiRoleAuthService', () => {
  let authService: MultiRoleAuthService;

  beforeEach(() => {
    authService = new MultiRoleAuthService();
    // Supabase mock 초기화
    jest.clearAllMocks();
  });

  describe('로그인 및 사용자 정보 로드', () => {
    test('로그인 시 사용자의 모든 역할과 계약을 로드해야 함', async () => {
      // Mock Supabase 응답 설정
      const mockSupabase = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: mockUser, session: { access_token: 'token' } },
            error: null
          })
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockUserRoles,
                error: null
              })
            })
          })
        })
      };

      // 실제로는 Supabase를 mock하여 테스트
      const result = await authService.signInWithRoles('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(result.user?.roles).toHaveLength(2);
      expect(result.user?.roles[0].roleType).toBe(RoleType.WORKER);
      expect(result.user?.roles[1].roleType).toBe(RoleType.ADMIN);
    });

    test('로그인 실패 시 적절한 에러를 반환해야 함', async () => {
      const result = await authService.signInWithRoles('invalid@example.com', 'wrong-password');

      expect(result.success).toBe(false);
      expect(result.error).toContain('로그인에 실패했습니다');
      expect(result.user).toBeNull();
    });
  });

  describe('역할 관리', () => {
    test('사용자의 모든 활성 역할을 조회할 수 있어야 함', async () => {
      const roles = await authService.getUserRoles('user-123');

      expect(roles).toHaveLength(2);
      expect(roles.every(role => role.isActive)).toBe(true);
    });

    test('특정 조직에서의 역할만 조회할 수 있어야 함', async () => {
      const orgRoles = await authService.getUserRolesInOrganization('user-123', 'org-1');

      expect(orgRoles).toHaveLength(1);
      expect(orgRoles[0].organizationId).toBe('org-1');
      expect(orgRoles[0].roleType).toBe(RoleType.WORKER);
    });

    test('새로운 역할을 추가할 수 있어야 함', async () => {
      const newRole = {
        employeeId: 'emp-3',
        organizationId: 'org-3',
        roleType: RoleType.MANAGER
      };

      const result = await authService.addUserRole('user-123', newRole);

      expect(result.success).toBe(true);
      expect(result.role?.roleType).toBe(RoleType.MANAGER);
    });

    test('역할을 비활성화할 수 있어야 함', async () => {
      const result = await authService.deactivateUserRole('user-123', 'role-1');

      expect(result.success).toBe(true);
    });
  });

  describe('계약 관리', () => {
    test('사용자의 모든 활성 계약을 조회할 수 있어야 함', async () => {
      const contracts = await authService.getUserContracts('user-123');

      expect(contracts).toHaveLength(1);
      expect(contracts[0].status).toBe(ContractStatus.ACTIVE);
    });

    test('특정 조직의 계약만 조회할 수 있어야 함', async () => {
      const orgContracts = await authService.getUserContractsInOrganization('user-123', 'org-1');

      expect(orgContracts).toHaveLength(1);
      expect(orgContracts[0].organizationId).toBe('org-1');
    });
  });

  describe('권한 검증', () => {
    test('사용자가 특정 역할을 가지고 있는지 확인할 수 있어야 함', async () => {
      const hasWorkerRole = await authService.hasRole('user-123', RoleType.WORKER);
      const hasManagerRole = await authService.hasRole('user-123', RoleType.MANAGER);

      expect(hasWorkerRole).toBe(true);
      expect(hasManagerRole).toBe(false);
    });

    test('사용자가 특정 조직에 접근할 수 있는지 확인할 수 있어야 함', async () => {
      const canAccessOrg1 = await authService.canAccessOrganization('user-123', 'org-1');
      const canAccessOrg3 = await authService.canAccessOrganization('user-123', 'org-3');

      expect(canAccessOrg1).toBe(true);
      expect(canAccessOrg3).toBe(false);
    });

    test('사용자가 특정 작업을 수행할 권한이 있는지 확인할 수 있어야 함', async () => {
      const canManageEmployees = await authService.canPerformAction('user-123', 'manage-employees', 'org-2');
      const canViewAttendance = await authService.canPerformAction('user-123', 'view-attendance', 'org-1');

      expect(canManageEmployees).toBe(true); // ADMIN 역할
      expect(canViewAttendance).toBe(true); // WORKER 역할
    });
  });

  describe('대시보드 라우팅', () => {
    test('사용자가 접근 가능한 대시보드 목록을 반환해야 함', async () => {
      const dashboards = await authService.getAvailableDashboards('user-123');

      expect(dashboards.length).toBeGreaterThan(0);
      expect(dashboards.some(d => d.type === 'worker')).toBe(true);
      expect(dashboards.some(d => d.type === 'admin')).toBe(true);
    });

    test('기본 대시보드 경로를 결정할 수 있어야 함', async () => {
      const defaultPath = await authService.getDefaultDashboardPath('user-123');

      expect(defaultPath).toBeTruthy();
      expect(typeof defaultPath).toBe('string');
    });

    test('단일 역할 사용자는 바로 해당 대시보드로 이동해야 함', async () => {
      // 단일 역할 사용자 mock
      const singleRoleUser = 'single-role-user';
      const defaultPath = await authService.getDefaultDashboardPath(singleRoleUser);

      expect(defaultPath).not.toBe('/role-hub');
    });

    test('복합 역할 사용자는 역할 선택 허브로 이동해야 함', async () => {
      const defaultPath = await authService.getDefaultDashboardPath('user-123');

      expect(defaultPath).toBe('/role-hub');
    });
  });

  describe('Master Admin 검증', () => {
    test('Master Admin 사용자를 올바르게 식별해야 함', async () => {
      const isMaster = await authService.isMasterAdmin('archt723@gmail.com');
      const isNotMaster = await authService.isMasterAdmin('user-123');

      expect(isMaster).toBe(true);
      expect(isNotMaster).toBe(false);
    });
  });

  describe('세션 관리', () => {
    test('현재 로그인된 사용자 정보를 가져올 수 있어야 함', async () => {
      const currentUser = await authService.getCurrentUser();

      if (currentUser) {
        expect(currentUser.id).toBeTruthy();
        expect(currentUser.email).toBeTruthy();
        expect(Array.isArray(currentUser.roles)).toBe(true);
        expect(Array.isArray(currentUser.contracts)).toBe(true);
      }
    });

    test('세션이 없으면 null을 반환해야 함', async () => {
      // 로그아웃 상태 mock
      const currentUser = await authService.getCurrentUser();

      expect(currentUser).toBeNull();
    });
  });

});