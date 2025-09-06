/**
 * 계정 정지 이력 조회 API 테스트 - TDD RED Phase
 * GET /api/master-admin/users/:id/suspension-history
 */

import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { GET } from '@/app/api/master-admin/users/[id]/suspension-history/route';
import { AccountStatus, SuspensionReason } from '@/types/suspension';

// 모킹 설정
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

jest.mock('@/lib/audit-logger', () => ({
  auditLogger: {
    log: jest.fn(),
    logPermissionDenied: jest.fn()
  },
  AuditAction: {
    SUSPENSION_HISTORY_ACCESS: 'SUSPENSION_HISTORY_ACCESS'
  },
  AuditResult: {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE'
  }
}));

describe('GET /api/master-admin/users/[id]/suspension-history - TDD RED Phase', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      order: jest.fn(() => mockSupabase),
      range: jest.fn(() => mockSupabase),
      maybeSingle: jest.fn(),
      single: jest.fn(),
      count: jest.fn()
    };
    
    require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase);
  });

  describe('🔴 권한 검증 실패 테스트', () => {
    test('5.1.1 인증되지 않은 사용자 접근 시 401 에러 반환', async () => {
      // Given: 인증되지 않은 사용자
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('인증 실패')
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 401 에러 반환
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('인증이 필요합니다.');
    });

    test('5.1.2 MASTER_ADMIN 권한이 없는 사용자 접근 시 403 에러 반환', async () => {
      // Given: 인증된 사용자이지만 MASTER_ADMIN 권한 없음
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin123' } },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: null, // MASTER_ADMIN 역할 없음
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 403 에러 반환
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('접근 권한이 없습니다. MASTER_ADMIN 권한이 필요합니다.');
    });
  });

  describe('🔴 대상 사용자 검증 실패 테스트', () => {
    beforeEach(() => {
      // 권한 검증 성공 설정
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin123' } },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { role: 'MASTER_ADMIN' },
        error: null
      });
    });

    test('5.1.3 존재하지 않는 사용자 ID로 이력 조회 시 404 에러', async () => {
      // Given: 존재하지 않는 사용자 ID
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/nonexistent/suspension-history'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'nonexistent' } });
      const data = await response.json();

      // Then: 404 에러 반환
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('존재하지 않는 사용자입니다.');
    });

    test('5.1.4 잘못된 사용자 ID 형식으로 요청 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/invalid-uuid-format/suspension-history'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'invalid-uuid-format' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('잘못된 사용자 ID 형식입니다.');
    });
  });

  describe('🔴 쿼리 파라미터 검증 실패 테스트', () => {
    beforeEach(() => {
      // 기본 권한 및 사용자 검증 성공 설정
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin123' } },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { role: 'MASTER_ADMIN' },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          email: 'user@example.com',
          status: AccountStatus.ACTIVE
        },
        error: null
      });
    });

    test('5.1.5 잘못된 페이지 번호로 요청 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history?page=-1'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('페이지 번호는 1 이상이어야 합니다.');
    });

    test('5.1.6 잘못된 한계값으로 요청 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history?limit=101' // 최대 100 초과
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('한 번에 조회할 수 있는 최대 기록은 100개입니다.');
    });

    test('5.1.7 잘못된 날짜 범위로 요청 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history?startDate=invalid-date'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('잘못된 시작 날짜 형식입니다.');
    });

    test('5.1.8 시작 날짜가 종료 날짜보다 늦을 때 400 에러', async () => {
      const startDate = '2024-12-31';
      const endDate = '2024-01-01';
      
      const { req } = createMocks({
        method: 'GET',
        url: `/api/master-admin/users/user123/suspension-history?startDate=${startDate}&endDate=${endDate}`
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('시작 날짜는 종료 날짜보다 이전이어야 합니다.');
    });

    test('5.1.9 잘못된 정지 상태 필터로 요청 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history?status=INVALID_STATUS'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('잘못된 정지 상태 필터입니다.');
    });
  });

  describe('🔴 데이터베이스 조회 실패 테스트', () => {
    beforeEach(() => {
      // 기본 검증 성공 설정
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin123' } },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { role: 'MASTER_ADMIN' },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          email: 'user@example.com',
          status: AccountStatus.SUSPENDED
        },
        error: null
      });
    });

    test('5.1.10 정지 이력 조회 실패 시 500 에러', async () => {
      // Given: 정지 이력 조회 실패
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: { code: 'DATABASE_ERROR', message: 'Query failed' }
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 500 에러 반환
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('정지 이력 조회 중 데이터베이스 오류가 발생했습니다.');
    });

    test('5.1.11 전체 카운트 조회 실패 시에도 이력은 반환', async () => {
      // Given: 전체 카운트 조회는 실패하지만 이력 데이터는 성공
      const mockSuspensions = [
        {
          id: 'susp1',
          reason: SuspensionReason.POLICY_VIOLATION,
          created_at: '2024-01-01T00:00:00Z',
          resolved_at: '2024-01-08T00:00:00Z'
        }
      ];

      mockSupabase.range.mockResolvedValue({
        data: mockSuspensions,
        error: null
      });

      mockSupabase.count.mockResolvedValue({
        count: null,
        error: { code: 'COUNT_ERROR', message: 'Count query failed' }
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 200 성공 반환하지만 카운트는 unknown
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.history.suspensions).toHaveLength(1);
      expect(data.history.totalCount).toBe(-1); // 카운트 실패 시 기본값
      expect(data.warnings).toContain('전체 카운트 조회에 실패했습니다.');
    });
  });

  describe('🔴 빈 결과 처리 테스트', () => {
    beforeEach(() => {
      // 기본 검증 성공 설정
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin123' } },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { role: 'MASTER_ADMIN' },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          email: 'user@example.com',
          status: AccountStatus.ACTIVE
        },
        error: null
      });
    });

    test('5.1.12 정지 이력이 없는 사용자 조회 시 빈 배열 반환', async () => {
      // Given: 정지 이력이 없는 사용자
      mockSupabase.range.mockResolvedValue({
        data: [], // 빈 배열
        error: null
      });

      mockSupabase.count.mockResolvedValue({
        count: 0,
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 200 성공 반환 및 빈 이력
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.history.suspensions).toEqual([]);
      expect(data.history.totalCount).toBe(0);
      expect(data.history.activeSuspensions).toBe(0);
      expect(data.history.lastSuspension).toBeUndefined();
    });

    test('5.1.13 날짜 필터링으로 결과가 없을 때 빈 배열 반환', async () => {
      // Given: 날짜 필터링으로 인한 빈 결과
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null
      });

      mockSupabase.count.mockResolvedValue({
        count: 0,
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history?startDate=2025-01-01&endDate=2025-01-31'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 200 성공 반환 및 필터링된 빈 결과
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.history.suspensions).toEqual([]);
      expect(data.appliedFilters).toEqual({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });
    });
  });

  describe('🔴 대용량 데이터 처리 실패 테스트', () => {
    test('5.1.14 매우 많은 정지 이력으로 인한 성능 문제', async () => {
      // Given: 매우 많은 정지 이력을 가진 사용자 (성능 테스트)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin123' } },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { role: 'MASTER_ADMIN' },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          email: 'user@example.com',
          status: AccountStatus.ACTIVE
        },
        error: null
      });

      mockSupabase.count.mockResolvedValue({
        count: 10000, // 매우 많은 기록
        error: null
      });

      // 대용량 데이터로 인한 타임아웃 시뮬레이션
      mockSupabase.range.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), 1000);
        });
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 504 타임아웃 에러 반환
      expect(response.status).toBe(504);
      expect(data.success).toBe(false);
      expect(data.error).toBe('정지 이력 조회 시간이 초과되었습니다. 필터를 사용하여 범위를 줄여주세요.');
    });
  });

  describe('🔴 정지 패턴 분석 실패 테스트', () => {
    test('5.1.15 정지 패턴 분석 실패 시에도 기본 이력은 반환', async () => {
      // Given: 이력은 조회되지만 패턴 분석 실패
      const mockSuspensions = [
        {
          id: 'susp1',
          reason: SuspensionReason.POLICY_VIOLATION,
          created_at: '2024-01-01T00:00:00Z',
          resolved_at: '2024-01-08T00:00:00Z',
          duration: { type: 'TEMPORARY' }
        }
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin123' } },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { role: 'MASTER_ADMIN' },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          email: 'user@example.com',
          status: AccountStatus.ACTIVE
        },
        error: null
      });

      mockSupabase.range.mockResolvedValue({
        data: mockSuspensions,
        error: null
      });

      mockSupabase.count.mockResolvedValue({
        count: 1,
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/master-admin/users/user123/suspension-history?includePatterns=true'
      });

      // When: API 호출
      const response = await GET(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 200 성공하지만 패턴 분석 없음
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.history.suspensions).toHaveLength(1);
      expect(data.history.recurringPatterns).toBeUndefined();
      expect(data.warnings).toContain('패턴 분석에 실패했습니다.');
    });
  });
});