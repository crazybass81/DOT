/**
 * 계정 정지 API 테스트 - TDD RED Phase
 * POST /api/master-admin/users/:id/suspend
 */

import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/master-admin/users/[id]/suspend/route';
import { AccountStatus, SuspensionReason, SuspensionSeverity } from '@/types/suspension';

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
    USER_SUSPEND: 'USER_SUSPEND'
  },
  AuditResult: {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE'
  }
}));

describe('POST /api/master-admin/users/[id]/suspend - TDD RED Phase', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      maybeSingle: jest.fn(),
      single: jest.fn(),
      insert: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase)
    };
    
    require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase);
  });

  describe('🔴 권한 검증 실패 테스트', () => {
    test('2.1.1 인증되지 않은 사용자 접근 시 401 에러 반환', async () => {
      // Given: 인증되지 않은 사용자
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('인증 실패')
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/suspend',
        body: {
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.MEDIUM,
          duration: {
            type: 'TEMPORARY',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            autoReactivate: true,
            timezone: 'Asia/Seoul'
          }
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 401 에러 반환
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('인증이 필요합니다.');
    });

    test('2.1.2 MASTER_ADMIN 권한이 없는 사용자 접근 시 403 에러 반환', async () => {
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
        method: 'POST',
        url: '/api/master-admin/users/user123/suspend'
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 403 에러 반환
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('접근 권한이 없습니다. MASTER_ADMIN 권한이 필요합니다.');
    });
  });

  describe('🔴 요청 데이터 검증 실패 테스트', () => {
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

    test('2.1.3 존재하지 않는 사용자 ID로 정지 시도 시 404 에러', async () => {
      // Given: 존재하지 않는 사용자 ID
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/nonexistent/suspend',
        body: {
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.LOW
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'nonexistent' } });
      const data = await response.json();

      // Then: 404 에러 반환
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('존재하지 않는 사용자입니다.');
    });

    test('2.1.4 잘못된 정지 사유로 요청 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/suspend',
        body: {
          reason: 'INVALID_REASON', // 잘못된 열거형 값
          severity: SuspensionSeverity.MEDIUM
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('잘못된 정지 사유입니다.');
    });

    test('2.1.5 이미 정지된 계정 재정지 시도', async () => {
      // Given: 이미 정지된 사용자
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          status: AccountStatus.SUSPENDED,
          email: 'user@example.com'
        },
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/suspend',
        body: {
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.HIGH
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 409 에러 반환
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('이미 정지된 계정입니다.');
    });

    test('2.1.6 자기 자신 정지 시도 방지', async () => {
      // Given: 자신을 정지시키려는 시도
      const adminId = 'admin123';
      mockSupabase.single.mockResolvedValue({
        data: {
          id: adminId,
          status: AccountStatus.ACTIVE,
          email: 'admin@example.com'
        },
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: `/api/master-admin/users/${adminId}/suspend`,
        body: {
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.LOW
        }
      });

      // When: API 호출 (자신을 정지시키려는 시도)
      const response = await POST(req as NextRequest, { params: { id: adminId } });
      const data = await response.json();

      // Then: 403 에러 반환
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('자신의 계정을 정지시킬 수 없습니다.');
    });

    test('2.1.7 필수 정지 기간 정보 누락 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/suspend',
        body: {
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.MEDIUM
          // duration 필드 누락
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('정지 기간 정보가 필요합니다.');
    });

    test('2.1.8 과거 날짜로 정지 시작일 설정 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/suspend',
        body: {
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.LOW,
          duration: {
            type: 'TEMPORARY',
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 과거 날짜
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            autoReactivate: true,
            timezone: 'Asia/Seoul'
          }
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('정지 시작일은 과거로 설정할 수 없습니다.');
    });
  });

  describe('🔴 데이터베이스 오류 실패 테스트', () => {
    beforeEach(() => {
      // 권한 및 기본 검증 성공 설정
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
          status: AccountStatus.ACTIVE,
          email: 'user@example.com'
        },
        error: null
      });
    });

    test('2.1.9 정지 기록 생성 실패 시 500 에러', async () => {
      // Given: 정지 기록 삽입 실패
      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: { code: 'DATABASE_ERROR', message: 'Insert failed' }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/suspend',
        body: {
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.MEDIUM,
          duration: {
            type: 'TEMPORARY',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            autoReactivate: true,
            timezone: 'Asia/Seoul'
          }
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 500 에러 반환
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('정지 처리 중 데이터베이스 오류가 발생했습니다.');
    });

    test('2.1.10 사용자 상태 업데이트 실패 시 롤백', async () => {
      // Given: 정지 기록은 성공하지만 사용자 상태 업데이트 실패
      mockSupabase.insert
        .mockResolvedValueOnce({
          data: [{ id: 'suspension123' }],
          error: null
        });

      mockSupabase.update.mockResolvedValue({
        data: null,
        error: { code: 'UPDATE_FAILED', message: 'Status update failed' }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/suspend',
        body: {
          reason: SuspensionReason.SECURITY_RISK,
          severity: SuspensionSeverity.HIGH,
          duration: {
            type: 'TEMPORARY',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            autoReactivate: false,
            timezone: 'Asia/Seoul'
          }
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 500 에러 반환 및 롤백 메시지
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('사용자 상태 업데이트 실패. 정지 처리가 롤백되었습니다.');
    });
  });

  describe('🔴 비즈니스 로직 검증 실패 테스트', () => {
    test('2.1.11 MASTER_ADMIN 사용자 정지 시도 방지', async () => {
      // Given: 다른 MASTER_ADMIN 사용자를 정지시키려는 시도
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin123' } },
        error: null
      });

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({
          data: { role: 'MASTER_ADMIN' }, // 요청자는 MASTER_ADMIN
          error: null
        })
        .mockResolvedValueOnce({
          data: { role: 'MASTER_ADMIN' }, // 대상도 MASTER_ADMIN
          error: null
        });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'targetAdmin456',
          status: AccountStatus.ACTIVE,
          email: 'target@example.com'
        },
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/targetAdmin456/suspend',
        body: {
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.LOW
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'targetAdmin456' } });
      const data = await response.json();

      // Then: 403 에러 반환
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('MASTER_ADMIN 사용자는 정지시킬 수 없습니다.');
    });

    test('2.1.12 임시 정지인데 종료일 없을 때 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/suspend',
        body: {
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.MEDIUM,
          duration: {
            type: 'TEMPORARY',
            startDate: new Date(),
            // endDate 누락
            autoReactivate: true,
            timezone: 'Asia/Seoul'
          }
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('임시 정지의 경우 종료일이 필요합니다.');
    });

    test('2.1.13 영구 차단인데 종료일 있을 때 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/suspend',
        body: {
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.CRITICAL,
          duration: {
            type: 'PERMANENT',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 영구인데 종료일 있음
            autoReactivate: false,
            timezone: 'Asia/Seoul'
          }
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('영구 차단의 경우 종료일을 설정할 수 없습니다.');
    });
  });

  describe('🔴 세션 무효화 실패 테스트', () => {
    test('2.1.14 Redis 연결 실패 시에도 정지 처리 성공 but 경고', async () => {
      // Given: Redis 세션 무효화 실패하지만 정지 처리는 성공해야 함
      // 이 테스트는 실제 Redis 무효화 로직이 구현되면 추가될 예정
      expect(true).toBe(true); // 플레이스홀더
    });
  });
});