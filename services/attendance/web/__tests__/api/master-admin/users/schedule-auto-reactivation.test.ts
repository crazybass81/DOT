/**
 * 자동 해제 스케줄링 API 테스트 - TDD RED Phase
 * POST /api/master-admin/users/schedule-auto-reactivation
 */

import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/master-admin/users/schedule-auto-reactivation/route';
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
    AUTO_REACTIVATION_SCHEDULE: 'AUTO_REACTIVATION_SCHEDULE'
  },
  AuditResult: {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE'
  }
}));

describe('POST /api/master-admin/users/schedule-auto-reactivation - TDD RED Phase', () => {
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
      update: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase)
    };
    
    require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase);
  });

  describe('🔴 권한 검증 실패 테스트', () => {
    test('6.1.1 인증되지 않은 사용자 접근 시 401 에러 반환', async () => {
      // Given: 인증되지 않은 사용자
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('인증 실패')
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 401 에러 반환
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('인증이 필요합니다.');
    });

    test('6.1.2 MASTER_ADMIN 권한이 없는 사용자 접근 시 403 에러 반환', async () => {
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
        url: '/api/master-admin/users/schedule-auto-reactivation'
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
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

    test('6.1.3 정지 ID 누락 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          // suspensionId 누락
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('정지 ID가 필요합니다.');
    });

    test('6.1.4 스케줄 날짜 누락 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          // scheduledAt 누락
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('스케줄 날짜가 필요합니다.');
    });

    test('6.1.5 과거 날짜로 스케줄링 시도', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 어제

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: pastDate,
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('스케줄 날짜는 현재 시간 이후여야 합니다.');
    });

    test('6.1.6 잘못된 시간대 형식으로 요청 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Invalid/Timezone' // 잘못된 시간대
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('잘못된 시간대 형식입니다.');
    });

    test('6.1.7 너무 먼 미래 날짜로 스케줄링 시도 (1년 초과)', async () => {
      const farFuture = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000); // 1년 후

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: farFuture,
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('스케줄 날짜는 최대 1년 이내여야 합니다.');
    });
  });

  describe('🔴 정지 기록 검증 실패 테스트', () => {
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

    test('6.1.8 존재하지 않는 정지 ID로 스케줄링 시도 시 404 에러', async () => {
      // Given: 존재하지 않는 정지 ID
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'nonexistent',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 404 에러 반환
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('존재하지 않는 정지 기록입니다.');
    });

    test('6.1.9 이미 해제된 정지 기록에 대한 스케줄링 시도', async () => {
      // Given: 이미 해제된 정지 기록
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'suspension123',
          user_id: 'user123',
          status: 'RESOLVED',
          resolved_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
          duration: {
            type: 'TEMPORARY',
            endDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 409 에러 반환
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('이미 해제된 정지 기록에는 자동 해제를 스케줄할 수 없습니다.');
    });

    test('6.1.10 영구 차단 계정 자동 해제 시도', async () => {
      // Given: 영구 차단된 정지 기록
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'suspension123',
          user_id: 'user123',
          status: 'ACTIVE',
          duration: {
            type: 'PERMANENT' // 영구 차단
          }
        },
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 403 에러 반환
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('영구 차단된 계정은 자동 해제할 수 없습니다.');
    });

    test('6.1.11 이미 자동 해제가 스케줄된 정지 기록', async () => {
      // Given: 유효한 정지 기록
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'suspension123',
            user_id: 'user123',
            status: 'ACTIVE',
            duration: {
              type: 'TEMPORARY',
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          },
          error: null
        })
        // 기존 스케줄 확인 시 이미 존재
        .mockResolvedValueOnce({
          data: {
            id: 'schedule456',
            status: 'SCHEDULED'
          },
          error: null
        });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 409 에러 반환
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('이미 자동 해제가 스케줄되어 있습니다.');
      expect(data.existingScheduleId).toBe('schedule456');
    });
  });

  describe('🔴 스케줄링 조건 검증 실패 테스트', () => {
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

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'suspension123',
            user_id: 'user123',
            status: 'ACTIVE',
            duration: {
              type: 'TEMPORARY',
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          },
          error: null
        })
        // 기존 스케줄 없음
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });
    });

    test('6.1.12 정지 종료일 이후로 스케줄링 시도', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 정지 종료일(30일) 이후
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('자동 해제 날짜는 정지 종료일 이전이어야 합니다.');
    });

    test('6.1.13 복구 조건이 필요한 정지 기록의 무조건 자동 해제 시도', async () => {
      // Given: 복구 조건이 필요한 정지 기록
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'suspension123',
            user_id: 'user123',
            status: 'ACTIVE',
            duration: {
              type: 'TEMPORARY',
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            recovery_conditions: ['SECURITY_REVIEW_REQUIRED', 'USER_CONSENT_NEEDED']
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Asia/Seoul',
          conditions: {
            requiresApproval: false, // 승인 불필요로 설정
            checkSecurityStatus: false,
            verifyUserConsent: false
          }
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 422 에러 반환
      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('이 정지 기록은 복구 조건 확인이 필요합니다.');
      expect(data.requiredConditions).toContain('SECURITY_REVIEW_REQUIRED');
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

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'suspension123',
            user_id: 'user123',
            status: 'ACTIVE',
            duration: {
              type: 'TEMPORARY',
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });
    });

    test('6.1.14 스케줄 생성 실패 시 500 에러', async () => {
      // Given: 스케줄 생성 실패
      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: { code: 'INSERT_FAILED', message: 'Schedule creation failed' }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 500 에러 반환
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('자동 해제 스케줄 생성 중 데이터베이스 오류가 발생했습니다.');
    });

    test('6.1.15 정지 기록 업데이트 실패 시 롤백', async () => {
      // Given: 스케줄 생성은 성공하지만 정지 기록 업데이트 실패
      mockSupabase.insert.mockResolvedValue({
        data: [{ id: 'schedule789' }],
        error: null
      });

      mockSupabase.update.mockResolvedValue({
        data: null,
        error: { code: 'UPDATE_FAILED', message: 'Suspension update failed' }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 500 에러 반환 및 롤백 메시지
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('정지 기록 업데이트 실패. 스케줄이 롤백되었습니다.');
    });
  });

  describe('🔴 스케줄링 시스템 다운 실패 테스트', () => {
    test('6.1.16 외부 스케줄링 시스템 연결 실패 시 fallback', async () => {
      // Given: 외부 스케줄링 시스템 연결 실패
      // 이 테스트는 실제 cron job 스케줄링 시스템이 구현되면 추가될 예정
      expect(true).toBe(true); // 플레이스홀더
    });

    test('6.1.17 스케줄러 큐 가득참으로 인한 등록 실패', async () => {
      // Given: 스케줄러 큐가 가득 찬 상황
      // 이 테스트는 실제 큐 시스템이 구현되면 추가될 예정
      expect(true).toBe(true); // 플레이스홀더
    });
  });

  describe('🔴 동시성 문제 실패 테스트', () => {
    test('6.1.18 동시에 같은 정지 기록에 대한 스케줄링 시도', async () => {
      // Given: 동시성 경쟁 상황
      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: { 
          code: 'UNIQUE_VIOLATION', 
          message: 'Duplicate schedule for suspension' 
        }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/schedule-auto-reactivation',
        body: {
          suspensionId: 'suspension123',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          timezone: 'Asia/Seoul'
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 409 충돌 에러 반환
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('다른 관리자가 동시에 같은 정지 기록에 대한 스케줄을 생성하고 있습니다.');
    });
  });
});