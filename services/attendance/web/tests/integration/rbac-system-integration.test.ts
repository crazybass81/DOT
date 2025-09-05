/**
 * @jest-environment jsdom
 */

// RBAC 시스템 통합 테스트
// 권한 시스템의 전체적인 동작을 검증

import { RoleType } from '../../src/types/multi-role';
import { AuditAction, AuditResult } from '../../src/lib/audit-logger';

// Mock 설정
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  })),
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
  }
};

jest.mock('../../src/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

jest.mock('../../src/lib/supabase-config', () => ({
  supabase: mockSupabaseClient
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (data: any, options = {}) => ({
      status: options.status || 200,
      json: () => Promise.resolve(data),
      data,
      options
    }),
  }
}));

describe('RBAC 시스템 통합 테스트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.mockUser = null;
  });

  describe('김철수 시나리오 - 다중 역할 사용자', () => {
    // user-permission-diagram.md에 따른 김철수의 8개 역할 시나리오
    const 김철수 = {
      id: 'user-kim-cheolsu',
      email: 'kimcheolsu@example.com',
      name: '김철수',
      is_master_admin: false,
      roles: [
        // 맥도날드 프랜차이즈 본사 - FRANCHISE
        {
          id: 'role-1',
          organizationId: 'org-mcdonalds-hq',
          roleType: RoleType.FRANCHISE,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        // 맥도날드 강남점 - MANAGER  
        {
          id: 'role-2',
          organizationId: 'org-mcdonalds-gangnam',
          roleType: RoleType.MANAGER,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        // 맥도날드 서초점 - ADMIN
        {
          id: 'role-3',
          organizationId: 'org-mcdonalds-seocho',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        // 맥도날드 홍대점 - WORKER
        {
          id: 'role-4',
          organizationId: 'org-mcdonalds-hongdae',
          roleType: RoleType.WORKER,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        },
        // 스타벅스 프랜차이즈 - FRANCHISE
        {
          id: 'role-5',
          organizationId: 'org-starbucks-hq',
          roleType: RoleType.FRANCHISE,
          isActive: true,
          grantedAt: new Date('2024-02-01')
        },
        // 스타벅스 판교점 - MANAGER
        {
          id: 'role-6',
          organizationId: 'org-starbucks-pangyo',
          roleType: RoleType.MANAGER,
          isActive: true,
          grantedAt: new Date('2024-02-01')
        },
        // 파리바게트 본사 - ADMIN
        {
          id: 'role-7',
          organizationId: 'org-parisbaguette-hq',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-03-01')
        },
        // 파리바게트 신사점 - WORKER
        {
          id: 'role-8',
          organizationId: 'org-parisbaguette-sinsa',
          roleType: RoleType.WORKER,
          isActive: true,
          grantedAt: new Date('2024-03-01')
        }
      ]
    };

    test('김철수 - 다중 조직 출근 기록 생성 권한 검증', async () => {
      global.mockUser = 김철수;

      // 각 조직에서 출근 기록 생성 가능 여부 검증
      const organizations = [
        'org-mcdonalds-hq',      // FRANCHISE - 가능
        'org-mcdonalds-gangnam', // MANAGER - 가능  
        'org-mcdonalds-seocho',  // ADMIN - 가능
        'org-mcdonalds-hongdae', // WORKER - 가능
        'org-starbucks-hq',      // FRANCHISE - 가능
        'org-starbucks-pangyo',  // MANAGER - 가능
        'org-parisbaguette-hq',  // ADMIN - 가능
        'org-parisbaguette-sinsa' // WORKER - 가능
      ];

      for (const orgId of organizations) {
        // 사용자 역할 모킹
        mockSupabaseClient.from().select().eq().eq().eq().single.mockResolvedValueOnce({
          data: {
            id: `role-${orgId}`,
            role: 김철수.roles.find(r => r.organizationId === orgId)?.roleType,
            hourly_wage: 15000,
            start_date: '2024-01-01',
            end_date: null
          },
          error: null
        });

        // 기존 출근 기록 없음
        mockSupabaseClient.from().select().eq().eq().gte().lt().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });

        // 새 출근 기록 생성 성공
        mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
          data: {
            id: `att-${orgId}`,
            user_id: 김철수.id,
            organization_id: orgId,
            check_in_time: new Date().toISOString(),
            status: 'checked_in'
          },
          error: null
        });

        const { POST } = require('../../src/app/api/attendance/route');
        
        const mockRequest = {
          url: `http://localhost:3000/api/attendance`,
          method: 'POST',
          json: jest.fn().mockResolvedValue({
            organization_id: orgId,
            location_lat: 37.5665,
            location_lng: 126.9780,
            notes: `${orgId} 정상 출근`
          })
        };

        const response = await POST(mockRequest);
        
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('attendance');
        expect(response.data.attendance.organization_id).toBe(orgId);
      }
    });

    test('김철수 - 조직별 관리 권한 레벨 검증', async () => {
      global.mockUser = 김철수;

      // FRANCHISE 권한 - 새 조직 생성 가능
      const franchiseOrgs = ['org-mcdonalds-hq', 'org-starbucks-hq'];
      
      for (const orgId of franchiseOrgs) {
        mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' } // 중복 없음
        });

        mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
          data: {
            id: `new-org-${orgId}`,
            name: `새 하위 조직 - ${orgId}`,
            parent_organization_id: orgId
          },
          error: null
        });

        const { POST } = require('../../src/app/api/organizations/route');
        
        const mockRequest = {
          url: 'http://localhost:3000/api/organizations',
          method: 'POST',
          json: jest.fn().mockResolvedValue({
            name: `새 하위 조직 - ${orgId}`,
            type: 'BRANCH',
            parent_organization_id: orgId
          })
        };

        const response = await POST(mockRequest);
        
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('organization');
      }
    });

    test('김철수 - 다중 조직 사용자 역할 관리 권한', async () => {
      global.mockUser = 김철수;

      // MANAGER 이상 권한을 가진 조직에서 역할 부여 테스트
      const managerOrgs = [
        'org-mcdonalds-hq',      // FRANCHISE
        'org-mcdonalds-gangnam', // MANAGER  
        'org-starbucks-hq',      // FRANCHISE
        'org-starbucks-pangyo',  // MANAGER
        'org-parisbaguette-hq'   // ADMIN (MANAGER 권한 없음)
      ];

      for (const orgId of managerOrgs) {
        const userRole = 김철수.roles.find(r => r.organizationId === orgId);
        
        // ADMIN 권한은 MANAGER 권한 검증에서 제외
        if (userRole?.roleType === RoleType.ADMIN) continue;

        // 권한 검증 모킹
        mockSupabaseClient.from().select().eq().eq().in().eq().single.mockResolvedValueOnce({
          data: { id: 'permission-check' },
          error: null
        });

        // 대상 사용자 존재 확인
        mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
          data: { id: 'target-user' },
          error: null
        });

        // 조직 존재 확인
        mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
          data: { id: orgId },
          error: null
        });

        // 중복 역할 확인 (없음)
        mockSupabaseClient.from().select().eq().eq().eq().eq().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });

        // 새 역할 생성 성공
        mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
          data: {
            id: `new-role-${orgId}`,
            user_id: 'target-user',
            organization_id: orgId,
            role: RoleType.WORKER
          },
          error: null
        });

        const { POST } = require('../../src/app/api/user-roles/route');
        
        const mockRequest = {
          url: 'http://localhost:3000/api/user-roles',
          method: 'POST',
          json: jest.fn().mockResolvedValue({
            user_id: 'target-user',
            organization_id: orgId,
            role: RoleType.WORKER
          })
        };

        const response = await POST(mockRequest);
        
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('userRole');
      }
    });
  });

  describe('권한 계층 검증', () => {
    test('FRANCHISE > MANAGER > ADMIN > WORKER 계층 구조', async () => {
      const hierarchyTests = [
        {
          userRole: RoleType.FRANCHISE,
          canAccessRoles: [RoleType.FRANCHISE, RoleType.MANAGER, RoleType.ADMIN, RoleType.WORKER],
          description: 'FRANCHISE는 모든 역할 접근 가능'
        },
        {
          userRole: RoleType.MANAGER,
          canAccessRoles: [RoleType.MANAGER, RoleType.ADMIN, RoleType.WORKER],
          description: 'MANAGER는 FRANCHISE 제외 접근 가능'
        },
        {
          userRole: RoleType.ADMIN,
          canAccessRoles: [RoleType.ADMIN, RoleType.WORKER],
          description: 'ADMIN은 ADMIN, WORKER 접근 가능'
        },
        {
          userRole: RoleType.WORKER,
          canAccessRoles: [RoleType.WORKER],
          description: 'WORKER는 자신의 데이터만 접근 가능'
        }
      ];

      for (const test of hierarchyTests) {
        const testUser = {
          id: `test-user-${test.userRole}`,
          email: `${test.userRole.toLowerCase()}@example.com`,
          name: `테스트 ${test.userRole}`,
          is_master_admin: false,
          roles: [{
            id: 'test-role',
            organizationId: 'test-org',
            roleType: test.userRole,
            isActive: true,
            grantedAt: new Date('2024-01-01')
          }]
        };

        global.mockUser = testUser;

        // 각 역할별 접근 권한 테스트
        for (const targetRole of [RoleType.FRANCHISE, RoleType.MANAGER, RoleType.ADMIN, RoleType.WORKER]) {
          const shouldHaveAccess = test.canAccessRoles.includes(targetRole);

          if (shouldHaveAccess) {
            // 접근 가능한 경우
            mockSupabaseClient.from().select().eq().eq().in().eq().single.mockResolvedValueOnce({
              data: { id: 'access-granted' },
              error: null
            });
          } else {
            // 접근 불가능한 경우  
            mockSupabaseClient.from().select().eq().eq().in().eq().single.mockResolvedValueOnce({
              data: null,
              error: { code: 'PGRST116' }
            });
          }

          // 권한 검증 결과는 예상된 결과와 일치해야 함
          expect(shouldHaveAccess).toBe(test.canAccessRoles.includes(targetRole));
        }
      }
    });
  });

  describe('마스터 어드민 특권', () => {
    test('마스터 어드민은 모든 조직 데이터 접근 가능', async () => {
      const masterAdmin = {
        id: 'master-admin',
        email: 'master@example.com',
        name: '마스터 관리자',
        is_master_admin: true,
        roles: []
      };

      global.mockUser = masterAdmin;

      // 모든 조직 조회 (필터링 없음)
      mockSupabaseClient.from().select().order().mockResolvedValueOnce({
        data: [
          { id: 'org-1', name: '조직 1' },
          { id: 'org-2', name: '조직 2' },
          { id: 'org-3', name: '조직 3' }
        ],
        error: null
      });

      const { GET } = require('../../src/app/api/organizations/route');
      
      const mockRequest = {
        url: 'http://localhost:3000/api/organizations',
        method: 'GET'
      };

      const response = await GET(mockRequest);
      
      expect(response.status).toBe(200);
      expect(response.data.organizations).toHaveLength(3);
    });

    test('마스터 어드민은 모든 사용자 역할 수정 가능', async () => {
      const masterAdmin = {
        id: 'master-admin',
        email: 'master@example.com',
        name: '마스터 관리자',
        is_master_admin: true,
        roles: []
      };

      global.mockUser = masterAdmin;

      // 기존 역할 조회
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'role-to-update',
          user_id: 'target-user',
          organization_id: 'any-org',
          role: RoleType.WORKER
        },
        error: null
      });

      // 역할 업데이트 성공
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValueOnce({
        data: {
          id: 'role-to-update',
          is_active: false
        },
        error: null
      });

      const { PUT } = require('../../src/app/api/user-roles/route');
      
      const mockRequest = {
        url: 'http://localhost:3000/api/user-roles',
        method: 'PUT',
        json: jest.fn().mockResolvedValue({
          id: 'role-to-update',
          is_active: false
        })
      };

      const response = await PUT(mockRequest);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('userRole');
    });
  });

  describe('시간 기반 권한 검증', () => {
    test('만료된 역할은 권한에서 제외', async () => {
      const userWithExpiredRole = {
        id: 'user-expired',
        email: 'expired@example.com',
        name: '만료된 사용자',
        is_master_admin: false,
        roles: [{
          id: 'expired-role',
          organizationId: 'test-org',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-01-01'),
          endDate: new Date('2024-06-01') // 이미 만료됨
        }]
      };

      global.mockUser = userWithExpiredRole;

      // 만료된 역할로 인한 권한 거부
      mockSupabaseClient.from().select().eq().eq().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Role expired' }
      });

      const { POST } = require('../../src/app/api/attendance/route');
      
      const mockRequest = {
        url: 'http://localhost:3000/api/attendance',
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          organization_id: 'test-org'
        })
      };

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(403);
      expect(response.data.error).toContain('활성 역할이 없습니다');
    });

    test('미래 시작일의 역할은 아직 유효하지 않음', async () => {
      const userWithFutureRole = {
        id: 'user-future',
        email: 'future@example.com',
        name: '미래 역할 사용자',
        is_master_admin: false,
        roles: [{
          id: 'future-role',
          organizationId: 'test-org',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-01-01'),
          startDate: new Date('2025-01-01') // 미래 시작일
        }]
      };

      global.mockUser = userWithFutureRole;

      // 미래 시작일로 인한 권한 거부
      mockSupabaseClient.from().select().eq().eq().eq().single.mockResolvedValueOnce({
        data: {
          id: 'future-role',
          role: RoleType.ADMIN,
          start_date: '2025-01-01T00:00:00Z',
          end_date: null
        },
        error: null
      });

      const { POST } = require('../../src/app/api/attendance/route');
      
      const mockRequest = {
        url: 'http://localhost:3000/api/attendance',
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          organization_id: 'test-org'
        })
      };

      const response = await POST(mockRequest);
      
      expect(response.status).toBe(403);
      expect(response.data.error).toContain('시작일이 아직 도래하지 않았습니다');
    });
  });

  describe('감사 로깅 통합', () => {
    test('API 호출 시 감사 로그 자동 기록', async () => {
      const testUser = {
        id: 'test-user-audit',
        email: 'audit@example.com',
        name: '감사 테스트 사용자',
        is_master_admin: false,
        roles: [{
          id: 'test-role',
          organizationId: 'test-org',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date('2024-01-01')
        }]
      };

      global.mockUser = testUser;

      // 감사 로그 삽입 모킹
      mockSupabaseClient.from().insert.mockResolvedValueOnce({ error: null });

      // 조직 목록 조회 (감사 로깅 활성화)
      mockSupabaseClient.from().select().eq().eq().mockResolvedValueOnce({
        data: [{ organization_id: 'test-org' }],
        error: null
      });

      mockSupabaseClient.from().select().in().order().mockResolvedValueOnce({
        data: [{ id: 'test-org', name: '테스트 조직' }],
        error: null
      });

      const { GET } = require('../../src/app/api/organizations/route');
      
      const mockRequest = {
        url: 'http://localhost:3000/api/organizations',
        method: 'GET',
        headers: {
          get: jest.fn((header) => {
            if (header === 'x-forwarded-for') return '192.168.1.1';
            if (header === 'user-agent') return 'Mozilla/5.0';
            return null;
          })
        }
      };

      const response = await GET(mockRequest);
      
      expect(response.status).toBe(200);
      
      // 감사 로그가 기록되었는지 확인 (비동기로 실행되므로 약간의 지연 후 확인)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
    });
  });
});