/**
 * @jest-environment jsdom
 */

import { rbacMiddleware, createRBACHandler, PermissionCheck } from '../../src/middleware/rbac-middleware';
import { RoleType } from '../../src/types/multi-role';

// Next.js 모킹
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new Map();
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }
  },
  NextResponse: {
    json: (data, options = {}) => ({
      json: () => Promise.resolve(data),
      status: options.status || 200
    }),
    next: (options = {}) => ({
      json: () => Promise.resolve({ success: true }),
      status: 200,
      ...options
    })
  }
}));

// Mock Supabase
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

describe('RBAC 미들웨어', () => {
  let mockRequest: any;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = {
      url: 'http://localhost:3000/api/test',
      method: 'GET',
      headers: new Headers({
        'authorization': 'Bearer test-token'
      }),
    };

    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
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

    // Mock Supabase auth response
    require('../../src/lib/supabase-config').supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUser.id, email: mockUser.email } },
      error: null
    });

    // Mock user roles query
    require('../../src/lib/supabase-config').supabase.from().select().eq().single.mockResolvedValue({
      data: mockUser,
      error: null
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('기본 인증 검증', () => {
    test('토큰이 없으면 401 반환', async () => {
      const requestWithoutToken = {
        ...mockRequest,
        headers: new Headers()
      } as NextRequest;

      const response = await rbacMiddleware(requestWithoutToken);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    });

    test('유효하지 않은 토큰이면 401 반환', async () => {
      // Mock invalid token
      require('../../src/lib/supabase-config').supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token')
      });

      const response = await rbacMiddleware(mockRequest as NextRequest);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    });

    test('유효한 토큰이면 사용자 정보를 요청 헤더에 추가', async () => {
      const mockNext = jest.fn(() => NextResponse.next());
      
      const response = await rbacMiddleware(mockRequest as NextRequest, mockNext);

      expect(mockNext).toHaveBeenCalledWith({
        request: {
          headers: expect.objectContaining({
            'x-user-id': mockUser.id,
            'x-user-roles': JSON.stringify(mockUser.roles)
          })
        }
      });
    });
  });

  describe('권한 기반 접근 제어', () => {
    test('필요한 역할이 있으면 접근 허용', async () => {
      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.ADMIN],
        organizationId: 'org-1'
      };

      const handler = createRBACHandler(permissionCheck);
      const response = await handler(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });

    test('필요한 역할이 없으면 403 반환', async () => {
      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.FRANCHISE], // 사용자는 ADMIN만 가지고 있음
        organizationId: 'org-1'
      };

      const handler = createRBACHandler(permissionCheck);
      const response = await handler(mockRequest as NextRequest);

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: [RoleType.FRANCHISE],
        actual: [RoleType.ADMIN]
      });
    });

    test('조직 ID가 다르면 403 반환', async () => {
      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.ADMIN],
        organizationId: 'org-2' // 사용자는 org-1에만 ADMIN 역할
      };

      const handler = createRBACHandler(permissionCheck);
      const response = await handler(mockRequest as NextRequest);

      expect(response.status).toBe(403);
    });

    test('여러 역할 중 하나라도 있으면 접근 허용', async () => {
      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.MANAGER, RoleType.ADMIN], // OR 조건
        organizationId: 'org-1'
      };

      const handler = createRBACHandler(permissionCheck);
      const response = await handler(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });

    test('AND 조건으로 여러 역할 모두 필요한 경우', async () => {
      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.ADMIN],
        requiredAllRoles: true, // AND 조건
        organizationId: 'org-1'
      };

      const handler = createRBACHandler(permissionCheck);
      const response = await handler(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });

    test('비활성 역할은 권한 검증에서 제외', async () => {
      // 사용자에게 비활성 FRANCHISE 역할 추가
      mockUser.roles.push({
        id: 'role-2',
        employeeId: 'emp-1',
        organizationId: 'org-1',
        roleType: RoleType.FRANCHISE,
        isActive: false, // 비활성
        grantedAt: new Date('2024-01-01')
      });

      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.FRANCHISE],
        organizationId: 'org-1'
      };

      const handler = createRBACHandler(permissionCheck);
      const response = await handler(mockRequest as NextRequest);

      expect(response.status).toBe(403); // 비활성 역할로는 접근 불가
    });
  });

  describe('특별한 권한 시나리오', () => {
    test('마스터 어드민은 모든 조직에 접근 가능', async () => {
      mockUser.isMasterAdmin = true;

      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.ADMIN],
        organizationId: 'any-org' // 마스터 어드민은 어떤 조직이든 접근 가능
      };

      const handler = createRBACHandler(permissionCheck);
      const response = await handler(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });

    test('자원 소유자는 특별 권한 적용', async () => {
      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.ADMIN],
        organizationId: 'org-1',
        resourceOwnerId: mockUser.id // 사용자 본인이 소유한 자원
      };

      // 사용자가 WORKER 역할만 가지고 있어도 본인 자원에는 접근 가능
      mockUser.roles = [{
        id: 'role-1',
        employeeId: 'emp-1',
        organizationId: 'org-1',
        roleType: RoleType.WORKER,
        isActive: true,
        grantedAt: new Date('2024-01-01')
      }];

      const handler = createRBACHandler(permissionCheck);
      const response = await handler(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });

    test('읽기 전용 권한과 쓰기 권한 구분', async () => {
      const readPermissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.WORKER],
        organizationId: 'org-1',
        action: 'read'
      };

      const writePermissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.ADMIN],
        organizationId: 'org-1',
        action: 'write'
      };

      // WORKER는 읽기만 가능
      mockUser.roles = [{
        id: 'role-1',
        employeeId: 'emp-1',
        organizationId: 'org-1',
        roleType: RoleType.WORKER,
        isActive: true,
        grantedAt: new Date('2024-01-01')
      }];

      const readHandler = createRBACHandler(readPermissionCheck);
      const writeHandler = createRBACHandler(writePermissionCheck);

      const readResponse = await readHandler(mockRequest as NextRequest);
      const writeResponse = await writeHandler(mockRequest as NextRequest);

      expect(readResponse.status).toBe(200);
      expect(writeResponse.status).toBe(403);
    });
  });

  describe('에러 처리', () => {
    test('데이터베이스 연결 오류 시 500 반환', async () => {
      require('../../src/lib/supabase-config').supabase.from().select().eq().single.mockRejectedValue(
        new Error('Database connection error')
      );

      const response = await rbacMiddleware(mockRequest as NextRequest);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    });

    test('권한 검증 중 오류 발생 시 적절한 에러 반환', async () => {
      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.ADMIN],
        organizationId: 'org-1'
      };

      // Mock error during permission check
      require('../../src/lib/supabase-config').supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: new Error('User not found')
      });

      const handler = createRBACHandler(permissionCheck);
      const response = await handler(mockRequest as NextRequest);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    });
  });

  describe('성능 최적화', () => {
    test('권한 정보 캐싱', async () => {
      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.ADMIN],
        organizationId: 'org-1',
        enableCache: true
      };

      const handler = createRBACHandler(permissionCheck);
      
      // 첫 번째 요청
      await handler(mockRequest as NextRequest);
      
      // 두 번째 요청 (캐시 사용)
      await handler(mockRequest as NextRequest);

      // 데이터베이스 쿼리는 한 번만 실행되어야 함
      expect(require('../../src/lib/supabase-config').supabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('감사 로그 통합', () => {
    test('권한 검증 결과를 감사 로그에 기록', async () => {
      const permissionCheck: PermissionCheck = {
        requiredRoles: [RoleType.ADMIN],
        organizationId: 'org-1',
        enableAuditLog: true
      };

      const mockAuditLog = jest.fn();
      
      const handler = createRBACHandler(permissionCheck, { auditLogger: mockAuditLog });
      await handler(mockRequest as NextRequest);

      expect(mockAuditLog).toHaveBeenCalledWith({
        action: 'PERMISSION_CHECK',
        userId: mockUser.id,
        resource: 'http://localhost:3000/api/test',
        requiredRoles: [RoleType.ADMIN],
        userRoles: [RoleType.ADMIN],
        organizationId: 'org-1',
        result: 'GRANTED',
        timestamp: expect.any(Date)
      });
    });
  });
});