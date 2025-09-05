/**
 * @jest-environment jsdom
 */

import { createMocks } from 'node-mocks-http';
import { RoleType } from '../../src/types/multi-role';

// Supabase 클라이언트 모킹
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

// Mock 함수들
jest.mock('../../src/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
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

// RBAC 미들웨어 모킹
jest.mock('../../src/middleware/rbac-middleware', () => ({
  withRBAC: jest.fn((handler, options) => (request: any) => {
    // 테스트용 mock user 설정
    const mockUser = global.mockUser || {
      id: 'test-user',
      is_master_admin: false,
      email: 'test@example.com',
      name: '테스트 사용자'
    };
    
    return handler(request, mockUser);
  })
}));

describe('보호된 API 엔드포인트 권한 검증', () => {
  let mockUser: any;

  beforeEach(() => {
    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: '테스트 사용자',
      is_master_admin: false
    };

    // global mock user 설정
    global.mockUser = mockUser;

    // Supabase 쿼리 결과 모킹
    mockSupabaseClient.from().select().eq().single.mockResolvedValue({
      data: { id: 'org-1', name: '테스트 조직' },
      error: null
    });

    mockSupabaseClient.from().select().order().mockResolvedValue({
      data: [{ id: 'org-1', name: '테스트 조직' }],
      error: null
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.mockUser = null;
  });

  describe('/api/organizations - 조직 관리 API', () => {
    test('GET /api/organizations - 조직 목록 조회 성공', async () => {
      // 사용자 역할 쿼리 모킹
      mockSupabaseClient.from().select().eq().eq().mockResolvedValue({
        data: [{ organization_id: 'org-1' }],
        error: null
      });

      const mockRequest = {
        url: 'http://localhost:3000/api/organizations',
        method: 'GET'
      };

      const { GET } = require('../../src/app/api/organizations/route');
      
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('organizations');
    });

    test('POST /api/organizations - 조직 생성 성공', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // 중복 없음을 의미
      });

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: { id: 'new-org', name: '새 조직' },
        error: null
      });

      const mockRequest = {
        url: 'http://localhost:3000/api/organizations',
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          name: '새 조직',
          type: 'FRANCHISE',
          business_registration_number: '123-45-67890'
        })
      };

      const { POST } = require('../../src/app/api/organizations/route');
      
      const response = await POST(mockRequest);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('organization');
    });
  });

  describe('/api/user-roles - 역할 관리 API', () => {
    test('GET /api/user-roles - 역할 목록 조회 성공', async () => {
      mockSupabaseClient.from().select().eq().eq().in.mockResolvedValue({
        data: [{ organization_id: 'org-1', role: RoleType.ADMIN }],
        error: null
      });

      mockSupabaseClient.from().select().in().order().mockResolvedValue({
        data: [
          {
            id: 'role-1',
            user_id: 'user-1',
            organization_id: 'org-1',
            role: RoleType.ADMIN,
            is_active: true
          }
        ],
        error: null
      });

      const mockRequest = {
        url: 'http://localhost:3000/api/user-roles',
        method: 'GET'
      };

      const { GET } = require('../../src/app/api/user-roles/route');
      
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('userRoles');
    });
  });

  describe('/api/attendance - 출근 관리 API', () => {
    test('GET /api/attendance - 출근 기록 조회 성공', async () => {
      mockSupabaseClient.from().select().eq().eq().mockResolvedValue({
        data: [{ organization_id: 'org-1', role: RoleType.ADMIN }],
        error: null
      });

      mockSupabaseClient.from().select().or().range().order().mockResolvedValue({
        data: [
          {
            id: 'att-1',
            user_id: 'user-1',
            organization_id: 'org-1',
            check_in_time: new Date().toISOString(),
            status: 'checked_in'
          }
        ],
        error: null
      });

      // Count 쿼리 모킹
      mockSupabaseClient.from().select.mockReturnValueOnce({
        or: jest.fn().mockResolvedValue({ count: 1, error: null })
      });

      const mockRequest = {
        url: 'http://localhost:3000/api/attendance',
        method: 'GET'
      };

      const { GET } = require('../../src/app/api/attendance/route');
      
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('attendanceRecords');
      expect(response.data).toHaveProperty('totalCount');
    });

    test('POST /api/attendance - 출근 체크인 성공', async () => {
      // 사용자 역할 확인 모킹
      mockSupabaseClient.from().select().eq().eq().eq().single.mockResolvedValue({
        data: {
          id: 'role-1',
          role: RoleType.WORKER,
          hourly_wage: 10000,
          start_date: '2024-01-01',
          end_date: null
        },
        error: null
      });

      // 기존 출근 기록 확인 모킹 (없음)
      mockSupabaseClient.from().select().eq().eq().gte().lt().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      // 새 출근 기록 생성 모킹
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'att-new',
          user_id: 'user-1',
          organization_id: 'org-1',
          check_in_time: new Date().toISOString(),
          status: 'checked_in'
        },
        error: null
      });

      const mockRequest = {
        url: 'http://localhost:3000/api/attendance',
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          organization_id: 'org-1',
          location_lat: 37.5665,
          location_lng: 126.9780,
          notes: '정상 출근'
        })
      };

      const { POST } = require('../../src/app/api/attendance/route');
      
      const response = await POST(mockRequest);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('attendance');
    });
  });

  describe('권한 계층 검증', () => {
    test('마스터 어드민은 모든 데이터에 접근 가능', async () => {
      // 마스터 어드민으로 설정
      global.mockUser = {
        id: 'master-admin',
        is_master_admin: true,
        email: 'admin@example.com',
        name: '마스터 관리자'
      };

      mockSupabaseClient.from().select().order().mockResolvedValue({
        data: [
          { id: 'org-1', name: '조직 1' },
          { id: 'org-2', name: '조직 2' }
        ],
        error: null
      });

      const mockRequest = {
        url: 'http://localhost:3000/api/organizations',
        method: 'GET'
      };

      const { GET } = require('../../src/app/api/organizations/route');
      
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(200);
      expect(response.data.organizations).toHaveLength(2);
    });

    test('일반 사용자는 자신이 속한 조직만 접근 가능', async () => {
      // 일반 사용자로 설정
      global.mockUser = {
        id: 'regular-user',
        is_master_admin: false,
        email: 'user@example.com',
        name: '일반 사용자'
      };

      // 사용자가 속한 조직 1개만 반환
      mockSupabaseClient.from().select().eq().eq().mockResolvedValue({
        data: [{ organization_id: 'org-1' }],
        error: null
      });

      mockSupabaseClient.from().select().in().order().mockResolvedValue({
        data: [{ id: 'org-1', name: '조직 1' }],
        error: null
      });

      const mockRequest = {
        url: 'http://localhost:3000/api/organizations',
        method: 'GET'
      };

      const { GET } = require('../../src/app/api/organizations/route');
      
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(200);
      expect(response.data.organizations).toHaveLength(1);
    });
  });

  describe('에러 처리 검증', () => {
    test('데이터베이스 오류 시 500 에러 반환', async () => {
      mockSupabaseClient.from().select().eq().eq().mockRejectedValue(
        new Error('Database connection failed')
      );

      const mockRequest = {
        url: 'http://localhost:3000/api/organizations',
        method: 'GET'
      };

      const { GET } = require('../../src/app/api/organizations/route');
      
      const response = await GET(mockRequest);
      
      expect(response.status).toBe(500);
      expect(response.data).toHaveProperty('error');
    });

    test('필수 필드 누락 시 400 에러 반환', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/organizations',
        method: 'POST',
        json: jest.fn().mockResolvedValue({
          // name 필드 누락
          type: 'FRANCHISE'
        })
      };

      const { POST } = require('../../src/app/api/organizations/route');
      
      const response = await POST(mockRequest);
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('필수');
    });
  });
});