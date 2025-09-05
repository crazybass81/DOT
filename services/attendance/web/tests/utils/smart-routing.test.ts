import { smartRouter, determineDefaultDashboard, getPossibleDashboards } from '../../src/utils/smart-routing';
import { MultiRoleUser, RoleType } from '../../src/types/multi-role';

describe('스마트 라우팅 시스템', () => {
  // Mock user data based on user-permission-diagram.md
  const mockUsers = {
    // 김철수 - 8개 역할을 가진 복잡한 사용자
    kimCheolSu: {
      id: 'user1',
      email: 'kim@example.com',
      name: '김철수',
      roles: [
        {
          id: 'role1',
          employeeId: 'emp1',
          organizationId: 'org1',
          roleType: RoleType.WORKER,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        {
          id: 'role2',
          employeeId: 'emp1',
          organizationId: 'org1',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        {
          id: 'role3',
          employeeId: 'emp2',
          organizationId: 'org2',
          roleType: RoleType.MANAGER,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        {
          id: 'role4',
          employeeId: 'emp3',
          organizationId: 'org3',
          roleType: RoleType.FRANCHISE,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        {
          id: 'role5',
          employeeId: 'emp4',
          organizationId: 'org4',
          roleType: RoleType.WORKER,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        {
          id: 'role6',
          employeeId: 'emp5',
          organizationId: 'org5',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        {
          id: 'role7',
          employeeId: 'emp6',
          organizationId: 'org6',
          roleType: RoleType.MANAGER,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        {
          id: 'role8',
          employeeId: 'emp7',
          organizationId: 'org7',
          roleType: RoleType.FRANCHISE,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        }
      ]
    } as MultiRoleUser,

    // 단순 근로자
    simpleWorker: {
      id: 'user2',
      email: 'worker@example.com',
      name: '이영희',
      roles: [
        {
          id: 'role1',
          employeeId: 'emp1',
          organizationId: 'org1',
          roleType: RoleType.WORKER,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        }
      ]
    } as MultiRoleUser,

    // 관리자
    admin: {
      id: 'user3',
      email: 'admin@example.com',
      name: '박관리',
      roles: [
        {
          id: 'role1',
          employeeId: 'emp1',
          organizationId: 'org1',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        }
      ]
    } as MultiRoleUser,

    // 매니저
    manager: {
      id: 'user4',
      email: 'manager@example.com',
      name: '최매니저',
      roles: [
        {
          id: 'role1',
          employeeId: 'emp1',
          organizationId: 'org1',
          roleType: RoleType.MANAGER,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        }
      ]
    } as MultiRoleUser,

    // 프랜차이즈
    franchise: {
      id: 'user5',
      email: 'franchise@example.com',
      name: '정프랜',
      roles: [
        {
          id: 'role1',
          employeeId: 'emp1',
          organizationId: 'org1',
          roleType: RoleType.FRANCHISE,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        }
      ]
    } as MultiRoleUser,

    // 멀티 역할 사용자 (근로자 + 관리자)
    workerAdmin: {
      id: 'user6',
      email: 'workeradmin@example.com',
      name: '김워커',
      roles: [
        {
          id: 'role1',
          employeeId: 'emp1',
          organizationId: 'org1',
          roleType: RoleType.WORKER,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        {
          id: 'role2',
          employeeId: 'emp1',
          organizationId: 'org1',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        }
      ]
    } as MultiRoleUser
  };

  describe('determineDefaultDashboard', () => {
    test('단순 근로자는 워커 대시보드로 라우팅', () => {
      const result = determineDefaultDashboard(mockUsers.simpleWorker);
      expect(result).toBe('/dashboard/worker');
    });

    test('관리자는 관리자 대시보드로 라우팅', () => {
      const result = determineDefaultDashboard(mockUsers.admin);
      expect(result).toBe('/dashboard/admin');
    });

    test('매니저는 매니저 대시보드로 라우팅', () => {
      const result = determineDefaultDashboard(mockUsers.manager);
      expect(result).toBe('/dashboard/manager');
    });

    test('프랜차이즈는 프랜차이즈 대시보드로 라우팅', () => {
      const result = determineDefaultDashboard(mockUsers.franchise);
      expect(result).toBe('/dashboard/franchise');
    });

    test('멀티 역할 사용자는 최고 권한 역할의 대시보드로 라우팅', () => {
      const result = determineDefaultDashboard(mockUsers.workerAdmin);
      // ADMIN이 WORKER보다 높은 권한이므로 admin 대시보드로
      expect(result).toBe('/dashboard/admin');
    });

    test('김철수(8개 역할)는 프랜차이즈 대시보드로 라우팅', () => {
      const result = determineDefaultDashboard(mockUsers.kimCheolSu);
      // 권한 순서: FRANCHISE > MANAGER > ADMIN > WORKER
      expect(result).toBe('/dashboard/franchise');
    });

    test('역할이 없는 사용자는 기본 대시보드로 라우팅', () => {
      const userWithoutRoles = {
        ...mockUsers.simpleWorker,
        roles: []
      };
      const result = determineDefaultDashboard(userWithoutRoles);
      expect(result).toBe('/dashboard');
    });

    test('비활성 역할만 있는 사용자는 기본 대시보드로 라우팅', () => {
      const userWithInactiveRoles = {
        ...mockUsers.simpleWorker,
        roles: mockUsers.simpleWorker.roles.map(role => ({
          ...role,
          isActive: false
        }))
      };
      const result = determineDefaultDashboard(userWithInactiveRoles);
      expect(result).toBe('/dashboard');
    });
  });

  describe('getPossibleDashboards', () => {
    test('단순 근로자는 워커 대시보드만 가능', () => {
      const result = getPossibleDashboards(mockUsers.simpleWorker);
      expect(result).toEqual([
        { path: '/dashboard/worker', label: '근로자 대시보드', roleType: RoleType.WORKER }
      ]);
    });

    test('멀티 역할 사용자는 모든 해당 대시보드 반환', () => {
      const result = getPossibleDashboards(mockUsers.workerAdmin);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        path: '/dashboard/worker',
        label: '근로자 대시보드',
        roleType: RoleType.WORKER
      });
      expect(result).toContainEqual({
        path: '/dashboard/admin',
        label: '관리자 대시보드',
        roleType: RoleType.ADMIN
      });
    });

    test('김철수는 4가지 대시보드 모두 접근 가능', () => {
      const result = getPossibleDashboards(mockUsers.kimCheolSu);
      expect(result).toHaveLength(4);
      
      const roleTypes = result.map(dashboard => dashboard.roleType);
      expect(roleTypes).toContain(RoleType.WORKER);
      expect(roleTypes).toContain(RoleType.ADMIN);
      expect(roleTypes).toContain(RoleType.MANAGER);
      expect(roleTypes).toContain(RoleType.FRANCHISE);
    });

    test('대시보드는 권한 순서대로 정렬됨', () => {
      const result = getPossibleDashboards(mockUsers.kimCheolSu);
      const roleTypes = result.map(dashboard => dashboard.roleType);
      
      // 권한 순서: FRANCHISE > MANAGER > ADMIN > WORKER
      expect(roleTypes[0]).toBe(RoleType.FRANCHISE);
      expect(roleTypes[1]).toBe(RoleType.MANAGER);
      expect(roleTypes[2]).toBe(RoleType.ADMIN);
      expect(roleTypes[3]).toBe(RoleType.WORKER);
    });
  });

  describe('smartRouter', () => {
    test('기본 라우팅 결정', () => {
      const result = smartRouter(mockUsers.simpleWorker);
      
      expect(result.defaultPath).toBe('/dashboard/worker');
      expect(result.availablePaths).toHaveLength(1);
      expect(result.hasMultipleRoles).toBe(false);
    });

    test('멀티 역할 사용자 라우팅', () => {
      const result = smartRouter(mockUsers.workerAdmin);
      
      expect(result.defaultPath).toBe('/dashboard/admin');
      expect(result.availablePaths).toHaveLength(2);
      expect(result.hasMultipleRoles).toBe(true);
    });

    test('복잡한 멀티 역할 사용자(김철수) 라우팅', () => {
      const result = smartRouter(mockUsers.kimCheolSu);
      
      expect(result.defaultPath).toBe('/dashboard/franchise');
      expect(result.availablePaths).toHaveLength(4);
      expect(result.hasMultipleRoles).toBe(true);
      expect(result.totalRoles).toBe(8);
    });

    test('특정 조직 컨텍스트 고려', () => {
      const result = smartRouter(mockUsers.kimCheolSu, 'org1');
      
      // org1에서의 역할만 고려
      expect(result.defaultPath).toBe('/dashboard/admin'); // org1에서는 ADMIN이 최고 권한
      expect(result.availablePaths.length).toBeLessThan(4);
    });

    test('사용자 선호도 고려 (최근 접속 이력)', () => {
      const lastAccessedDashboard = '/dashboard/worker';
      const result = smartRouter(mockUsers.workerAdmin, undefined, lastAccessedDashboard);
      
      // 멀티 역할 사용자의 경우 최근 접속한 대시보드를 기본값으로
      expect(result.suggestedPath).toBe(lastAccessedDashboard);
    });
  });

  describe('권한 기반 접근 제어', () => {
    test('특정 대시보드 접근 권한 확인', () => {
      const result = smartRouter(mockUsers.simpleWorker);
      
      // 근로자는 관리자 대시보드에 접근할 수 없음
      const canAccessAdmin = result.availablePaths.some(
        path => path.path === '/dashboard/admin'
      );
      expect(canAccessAdmin).toBe(false);
    });

    test('조직별 접근 제어', () => {
      const result = smartRouter(mockUsers.kimCheolSu, 'org999'); // 존재하지 않는 조직
      
      expect(result.defaultPath).toBe('/dashboard'); // 기본 대시보드로 fallback
      expect(result.availablePaths).toHaveLength(0);
    });
  });

  describe('에러 처리', () => {
    test('null 사용자 처리', () => {
      const result = smartRouter(null as any);
      
      expect(result.defaultPath).toBe('/dashboard');
      expect(result.availablePaths).toHaveLength(0);
      expect(result.hasMultipleRoles).toBe(false);
    });

    test('undefined 사용자 처리', () => {
      const result = smartRouter(undefined as any);
      
      expect(result.defaultPath).toBe('/dashboard');
      expect(result.availablePaths).toHaveLength(0);
      expect(result.hasMultipleRoles).toBe(false);
    });

    test('역할 배열이 null인 경우 처리', () => {
      const userWithNullRoles = {
        ...mockUsers.simpleWorker,
        roles: null as any
      };
      
      const result = smartRouter(userWithNullRoles);
      expect(result.defaultPath).toBe('/dashboard');
    });
  });

  describe('성능 최적화', () => {
    test('대량의 역할을 가진 사용자 처리', () => {
      const manyRoles = Array.from({ length: 100 }, (_, i) => ({
        id: `role${i}`,
        employeeId: `emp${i}`,
        organizationId: `org${i}`,
        roleType: RoleType.WORKER,
        isActive: true,
        grantedAt: new Date('2024-01-01')
      }));

      const userWithManyRoles = {
        ...mockUsers.simpleWorker,
        roles: manyRoles
      };

      const startTime = Date.now();
      const result = smartRouter(userWithManyRoles);
      const endTime = Date.now();

      // 100ms 이내에 처리되어야 함
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.defaultPath).toBe('/dashboard/worker');
    });
  });
});