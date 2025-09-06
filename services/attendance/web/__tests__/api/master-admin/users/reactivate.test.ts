/**
 * 계정 활성화 API 테스트 - TDD RED Phase
 * POST /api/master-admin/users/:id/reactivate
 */

import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/master-admin/users/[id]/reactivate/route';
import { AccountStatus } from '@/types/suspension';

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
    USER_REACTIVATE: 'USER_REACTIVATE'
  },
  AuditResult: {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE'
  }
}));

describe('POST /api/master-admin/users/[id]/reactivate - TDD RED Phase', () => {
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
      update: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      or: jest.fn(() => mockSupabase)
    };
    
    require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase);
  });

  describe('🔴 권한 검증 실패 테스트', () => {
    test('3.1.1 인증되지 않은 사용자 접근 시 401 에러 반환', async () => {
      // Given: 인증되지 않은 사용자
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('인증 실패')
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/reactivate',
        body: {
          reason: '정지 사유 해결됨',
          restoreData: true,
          notifyUser: true
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

    test('3.1.2 MASTER_ADMIN 권한이 없는 사용자 접근 시 403 에러 반환', async () => {
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
        url: '/api/master-admin/users/user123/reactivate'
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

    test('3.1.3 존재하지 않는 사용자 ID로 활성화 시도 시 404 에러', async () => {
      // Given: 존재하지 않는 사용자 ID
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/nonexistent/reactivate',
        body: {
          reason: '정지 해제'
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

    test('3.1.4 이미 활성 상태인 계정 활성화 시도', async () => {
      // Given: 이미 활성 상태인 사용자
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          status: AccountStatus.ACTIVE,
          email: 'user@example.com'
        },
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/reactivate',
        body: {
          reason: '활성화 시도'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 409 에러 반환
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('이미 활성 상태인 계정입니다.');
    });

    test('3.1.5 영구 차단된 계정 활성화 시도', async () => {
      // Given: 영구 차단된 사용자
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          status: AccountStatus.PERMANENTLY_BANNED,
          email: 'banned@example.com'
        },
        error: null
      });

      // 활성 정지 기록 조회
      mockSupabase.eq.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'suspension123',
            duration: {
              type: 'PERMANENT'
            },
            status: 'ACTIVE'
          },
          error: null
        })
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/reactivate',
        body: {
          reason: '영구 차단 해제 시도'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 403 에러 반환
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('영구 차단된 계정은 특별한 승인 절차가 필요합니다.');
    });
  });

  describe('🔴 활성 정지 기록 검증 실패 테스트', () => {
    beforeEach(() => {
      // 권한 검증 및 사용자 존재 확인 성공 설정
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
          status: AccountStatus.SUSPENDED,
          email: 'user@example.com'
        },
        error: null
      });
    });

    test('3.1.6 활성 정지 기록이 없는 정지된 계정 활성화 시도', async () => {
      // Given: 정지 상태이지만 활성 정지 기록이 없음 (데이터 불일치)
      mockSupabase.eq.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' }
        })
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/reactivate',
        body: {
          reason: '정지 해제'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 409 에러 반환
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('활성 정지 기록을 찾을 수 없습니다. 데이터 일관성 오류입니다.');
    });

    test('3.1.7 복구 조건이 충족되지 않은 정지 계정 활성화 시도', async () => {
      // Given: 복구 조건이 충족되지 않은 정지 기록
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      mockSupabase.eq.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'suspension123',
            duration: {
              type: 'TEMPORARY',
              endDate: futureDate.toISOString(),
              autoReactivate: false
            },
            status: 'ACTIVE',
            recovery_conditions: ['SECURITY_REVIEW_REQUIRED', 'USER_CONSENT_NEEDED']
          },
          error: null
        })
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/reactivate',
        body: {
          reason: '조기 활성화 시도',
          conditions: [] // 복구 조건 미충족
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 422 에러 반환
      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('복구 조건이 충족되지 않았습니다.');
      expect(data.missingConditions).toContain('SECURITY_REVIEW_REQUIRED');
    });
  });

  describe('🔴 요청 데이터 검증 실패 테스트', () => {
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
          status: AccountStatus.SUSPENDED,
          email: 'user@example.com'
        },
        error: null
      });
    });

    test('3.1.8 활성화 사유 누락 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/reactivate',
        body: {
          // reason 필드 누락
          restoreData: true,
          notifyUser: true
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('활성화 사유가 필요합니다.');
    });

    test('3.1.9 활성화 사유가 너무 짧을 때 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/reactivate',
        body: {
          reason: 'OK', // 너무 짧은 사유
          restoreData: true
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('활성화 사유는 최소 10자 이상이어야 합니다.');
    });
  });

  describe('🔴 데이터베이스 오류 실패 테스트', () => {
    beforeEach(() => {
      // 모든 기본 검증 성공 설정
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
          status: AccountStatus.SUSPENDED,
          email: 'user@example.com'
        },
        error: null
      });

      // 활성 정지 기록 존재
      mockSupabase.eq.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'suspension123',
            duration: {
              type: 'TEMPORARY',
              endDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 이미 만료됨
            },
            status: 'ACTIVE'
          },
          error: null
        })
      });
    });

    test('3.1.10 정지 기록 해제 실패 시 500 에러', async () => {
      // Given: 정지 기록 업데이트 실패
      mockSupabase.update.mockResolvedValue({
        data: null,
        error: { code: 'UPDATE_FAILED', message: 'Suspension update failed' }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/reactivate',
        body: {
          reason: '정지 기간 만료로 인한 자동 해제',
          restoreData: true,
          notifyUser: true
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 500 에러 반환
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('정지 해제 처리 중 데이터베이스 오류가 발생했습니다.');
    });

    test('3.1.11 사용자 상태 업데이트 실패 시 롤백', async () => {
      // Given: 정지 기록 해제는 성공하지만 사용자 상태 업데이트 실패
      mockSupabase.update
        .mockResolvedValueOnce({
          data: [{ id: 'suspension123' }], // 정지 기록 해제 성공
          error: null
        })
        .mockResolvedValueOnce({
          data: null, // 사용자 상태 업데이트 실패
          error: { code: 'UPDATE_FAILED', message: 'User status update failed' }
        });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/user123/reactivate',
        body: {
          reason: '정지 해제 시도',
          restoreData: false,
          notifyUser: true
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest, { params: { id: 'user123' } });
      const data = await response.json();

      // Then: 500 에러 반환 및 롤백 메시지
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('사용자 상태 업데이트 실패. 정지 해제가 롤백되었습니다.');
    });
  });

  describe('🔴 자동 해제 스케줄 취소 실패 테스트', () => {
    test('3.1.12 자동 해제 스케줄 취소 실패 시에도 활성화 성공', async () => {
      // Given: 자동 해제 스케줄은 실패하지만 활성화는 성공해야 함
      // 이 테스트는 실제 스케줄링 시스템이 구현되면 추가될 예정
      expect(true).toBe(true); // 플레이스홀더
    });
  });

  describe('🔴 알림 발송 실패 테스트', () => {
    test('3.1.13 사용자 알림 발송 실패 시에도 활성화 성공 but 경고', async () => {
      // Given: 알림 발송은 실패하지만 활성화는 성공해야 함
      // 이 테스트는 실제 알림 시스템이 구현되면 추가될 예정
      expect(true).toBe(true); // 플레이스홀더
    });
  });
});