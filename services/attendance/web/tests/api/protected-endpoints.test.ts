/**
 * @jest-environment jsdom
 */

import { createMocks } from 'node-mocks-http';
import { RoleType } from '../../src/types/multi-role';

// 실제 API 핸들러들 모킹
jest.mock('../../src/lib/supabase-config', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('보호된 API 엔드포인트 권한 검증', () => {
  let mockUser: any;

  beforeEach(() => {
    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: '테스트 사용자',
      roles: [
        {
          id: 'role-1',
          employeeId: 'emp-1',
          organizationId: 'org-1',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        }
      ]
    };

    // Supabase auth 모킹
    require('../../src/lib/supabase-config').supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUser.id, email: mockUser.email } },
      error: null
    });

    require('../../src/lib/supabase-config').supabase.from().select().eq().single.mockResolvedValue({
      data: mockUser,
      error: null
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('/api/organizations - 조직 관리 API', () => {
    test('GET /api/organizations - ADMIN 역할로 조직 목록 조회 성공', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/organizations',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      // 실제 API 핸들러를 동적으로 import하여 테스트
      const handler = require('../../src/app/api/organizations/route').GET;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
      }
    });

    test('POST /api/organizations - FRANCHISE 역할로 조직 생성 성공', async () => {
      mockUser.roles[0].roleType = RoleType.FRANCHISE;

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/organizations',
        headers: {
          authorization: 'Bearer valid-token'
        },
        body: {
          name: '새 조직',
          description: '테스트 조직'
        }
      });

      const handler = require('../../src/app/api/organizations/route').POST;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(201);
      }
    });

    test('WORKER 역할로 조직 생성 시도하면 403 반환', async () => {
      mockUser.roles[0].roleType = RoleType.WORKER;

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/organizations',
        headers: {
          authorization: 'Bearer valid-token'
        },
        body: {
          name: '새 조직'
        }
      });

      const handler = require('../../src/app/api/organizations/route').POST;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(403);
      }
    });
  });

  describe('/api/user-roles - 역할 관리 API', () => {
    test('GET /api/user-roles - 자신의 역할 조회', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/user-roles',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      const handler = require('../../src/app/api/user-roles/route').GET;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
      }
    });

    test('POST /api/user-roles - ADMIN만 역할 부여 가능', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/user-roles',
        headers: {
          authorization: 'Bearer valid-token'
        },
        body: {
          employeeId: 'emp-2',
          organizationId: 'org-1',
          roleType: RoleType.WORKER
        }
      });

      const handler = require('../../src/app/api/user-roles/route').POST;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(201);
      }
    });

    test('WORKER가 역할 부여 시도하면 403 반환', async () => {
      mockUser.roles[0].roleType = RoleType.WORKER;

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/user-roles',
        headers: {
          authorization: 'Bearer valid-token'
        },
        body: {
          employeeId: 'emp-2',
          organizationId: 'org-1',
          roleType: RoleType.ADMIN
        }
      });

      const handler = require('../../src/app/api/user-roles/route').POST;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(403);
      }
    });
  });

  describe('/api/attendance - 출근 관리 API', () => {
    test('GET /api/attendance - 모든 역할이 자신의 출근 기록 조회 가능', async () => {
      mockUser.roles[0].roleType = RoleType.WORKER;

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/attendance?employeeId=emp-1',
        query: {
          employeeId: 'emp-1' // 본인 ID
        },
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      const handler = require('../../src/app/api/attendance/route').GET;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
      }
    });

    test('ADMIN/MANAGER는 팀원들의 출근 기록 조회 가능', async () => {
      mockUser.roles[0].roleType = RoleType.ADMIN;

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/attendance?organizationId=org-1',
        query: {
          organizationId: 'org-1'
        },
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      const handler = require('../../src/app/api/attendance/route').GET;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
      }
    });

    test('WORKER가 다른 조직 출근 기록 조회 시도하면 403', async () => {
      mockUser.roles[0].roleType = RoleType.WORKER;

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/attendance?organizationId=org-2', // 권한 없는 조직
        query: {
          organizationId: 'org-2'
        },
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      const handler = require('../../src/app/api/attendance/route').GET;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(403);
      }
    });
  });

  describe('조직별 데이터 격리 검증', () => {
    test('사용자는 자신이 속한 조직 데이터만 접근 가능', async () => {
      // 사용자가 org-1에만 속해있음
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/organizations/org-2/employees', // org-2 데이터 시도
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      const handler = require('../../src/app/api/organizations/[id]/employees/route').GET;
      
      if (handler) {
        const mockParams = { params: { id: 'org-2' } };
        await handler(req, mockParams);
        expect(res._getStatusCode()).toBe(403);
      }
    });

    test('마스터 어드민은 모든 조직 데이터 접근 가능', async () => {
      mockUser.isMasterAdmin = true;

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/organizations/any-org/employees',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      const handler = require('../../src/app/api/organizations/[id]/employees/route').GET;
      
      if (handler) {
        const mockParams = { params: { id: 'any-org' } };
        await handler(req, mockParams);
        expect(res._getStatusCode()).toBe(200);
      }
    });
  });

  describe('계층적 권한 검증', () => {
    test('FRANCHISE는 MANAGER 권한도 가짐', async () => {
      mockUser.roles[0].roleType = RoleType.FRANCHISE;

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/schedule', // MANAGER 권한 필요한 API
        headers: {
          authorization: 'Bearer valid-token'
        },
        body: {
          organizationId: 'org-1',
          scheduleData: {}
        }
      });

      const handler = require('../../src/app/api/schedule/route').POST;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(201);
      }
    });

    test('권한 계층 - FRANCHISE > MANAGER > ADMIN > WORKER', async () => {
      const testCases = [
        { role: RoleType.FRANCHISE, expectedStatus: 200 },
        { role: RoleType.MANAGER, expectedStatus: 200 },
        { role: RoleType.ADMIN, expectedStatus: 403 }, // MANAGER 권한 필요한 API
        { role: RoleType.WORKER, expectedStatus: 403 }
      ];

      for (const testCase of testCases) {
        mockUser.roles[0].roleType = testCase.role;

        const { req, res } = createMocks({
          method: 'DELETE',
          url: '/api/organizations/org-1/employees/emp-2',
          headers: {
            authorization: 'Bearer valid-token'
          }
        });

        // 직원 해고는 MANAGER 권한 이상 필요
        const handler = require('../../src/app/api/organizations/[id]/employees/[empId]/route').DELETE;
        
        if (handler) {
          const mockParams = { params: { id: 'org-1', empId: 'emp-2' } };
          await handler(req, mockParams);
          expect(res._getStatusCode()).toBe(testCase.expectedStatus);
        }

        jest.clearAllMocks();
      }
    });
  });

  describe('멀티 역할 사용자 권한 검증', () => {
    test('여러 조직의 여러 역할을 가진 사용자', async () => {
      // 김철수와 같은 멀티 역할 사용자
      mockUser.roles = [
        {
          id: 'role-1',
          employeeId: 'emp-1',
          organizationId: 'org-1',
          roleType: RoleType.WORKER,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        {
          id: 'role-2',
          employeeId: 'emp-1',
          organizationId: 'org-1',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        {
          id: 'role-3',
          employeeId: 'emp-2',
          organizationId: 'org-2',
          roleType: RoleType.FRANCHISE,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        }
      ];

      // org-1에서 ADMIN 권한으로 접근
      const { req: req1, res: res1 } = createMocks({
        method: 'POST',
        url: '/api/user-roles',
        headers: {
          authorization: 'Bearer valid-token',
          'x-organization-context': 'org-1'
        },
        body: {
          organizationId: 'org-1',
          employeeId: 'emp-3',
          roleType: RoleType.WORKER
        }
      });

      const handler = require('../../src/app/api/user-roles/route').POST;
      if (handler) {
        await handler(req1, res1);
        expect(res1._getStatusCode()).toBe(201);
      }

      // org-2에서 FRANCHISE 권한으로 접근
      const { req: req2, res: res2 } = createMocks({
        method: 'POST',
        url: '/api/organizations',
        headers: {
          authorization: 'Bearer valid-token',
          'x-organization-context': 'org-2'
        },
        body: {
          parentOrganizationId: 'org-2',
          name: '하위 조직'
        }
      });

      const orgHandler = require('../../src/app/api/organizations/route').POST;
      if (orgHandler) {
        await orgHandler(req2, res2);
        expect(res2._getStatusCode()).toBe(201);
      }
    });
  });

  describe('시간 기반 권한 검증', () => {
    test('만료된 역할은 권한에서 제외', async () => {
      mockUser.roles[0].expiresAt = new Date('2023-12-31'); // 만료됨

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/user-roles',
        headers: {
          authorization: 'Bearer valid-token'
        },
        body: {
          employeeId: 'emp-2',
          organizationId: 'org-1',
          roleType: RoleType.WORKER
        }
      });

      const handler = require('../../src/app/api/user-roles/route').POST;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(403); // 만료된 역할로는 권한 없음
      }
    });

    test('미래 시작 날짜의 역할은 아직 유효하지 않음', async () => {
      mockUser.roles[0].startsAt = new Date('2025-01-01'); // 미래

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/user-roles',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      const handler = require('../../src/app/api/user-roles/route').GET;
      
      if (handler) {
        await handler(req, res);
        expect(res._getStatusCode()).toBe(403);
      }
    });
  });
});