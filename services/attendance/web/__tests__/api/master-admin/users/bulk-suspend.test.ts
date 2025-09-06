/**
 * 벌크 계정 정지 API 테스트 - TDD RED Phase
 * POST /api/master-admin/users/bulk-suspend
 */

import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/master-admin/users/bulk-suspend/route';
import { 
  AccountStatus, 
  SuspensionReason, 
  SuspensionSeverity,
  BulkSuspensionRequest 
} from '@/types/suspension';

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
    BULK_USER_SUSPEND: 'BULK_USER_SUSPEND'
  },
  AuditResult: {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE'
  }
}));

describe('POST /api/master-admin/users/bulk-suspend - TDD RED Phase', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      in: jest.fn(() => mockSupabase),
      maybeSingle: jest.fn(),
      single: jest.fn(),
      insert: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      rpc: jest.fn()
    };
    
    require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase);
  });

  describe('🔴 권한 검증 실패 테스트', () => {
    test('4.1.1 인증되지 않은 사용자 접근 시 401 에러 반환', async () => {
      // Given: 인증되지 않은 사용자
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('인증 실패')
      });

      const bulkRequest: BulkSuspensionRequest = {
        userIds: ['user1', 'user2', 'user3'],
        reason: SuspensionReason.POLICY_VIOLATION,
        severity: SuspensionSeverity.MEDIUM,
        duration: {
          type: 'TEMPORARY',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          autoReactivate: true,
          timezone: 'Asia/Seoul'
        },
        notifyUsers: true
      };

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: bulkRequest
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 401 에러 반환
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('인증이 필요합니다.');
    });

    test('4.1.2 MASTER_ADMIN 권한이 없는 사용자 접근 시 403 에러 반환', async () => {
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
        url: '/api/master-admin/users/bulk-suspend'
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

    test('4.1.3 빈 사용자 배열로 요청 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: [], // 빈 배열
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.MEDIUM
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('최소 1명 이상의 사용자를 선택해야 합니다.');
    });

    test('4.1.4 100명 초과 벌크 정지 시도 (제한 검증)', async () => {
      // Given: 101명의 사용자 ID 배열
      const userIds = Array.from({ length: 101 }, (_, i) => `user${i + 1}`);

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds,
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.LOW
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('한 번에 최대 100명까지만 정지할 수 있습니다.');
    });

    test('4.1.5 중복된 사용자 ID 포함 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: ['user1', 'user2', 'user1', 'user3'], // user1 중복
          reason: SuspensionReason.SECURITY_RISK,
          severity: SuspensionSeverity.HIGH
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('중복된 사용자 ID가 포함되어 있습니다.');
      expect(data.duplicates).toContain('user1');
    });

    test('4.1.6 잘못된 정지 사유로 요청 시 400 에러', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: ['user1', 'user2'],
          reason: 'INVALID_REASON', // 잘못된 열거형 값
          severity: SuspensionSeverity.MEDIUM
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 400 에러 반환
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('잘못된 정지 사유입니다.');
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

    test('4.1.7 존재하지 않는 사용자 ID 포함 시 부분 실패', async () => {
      // Given: 일부 존재하지 않는 사용자 ID 포함
      mockSupabase.in.mockResolvedValue({
        data: [
          { id: 'user1', status: AccountStatus.ACTIVE, email: 'user1@example.com' },
          { id: 'user2', status: AccountStatus.ACTIVE, email: 'user2@example.com' }
          // user3는 존재하지 않음
        ],
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: ['user1', 'user2', 'user3'],
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
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 207 다중 상태 반환 (부분 성공)
      expect(response.status).toBe(207);
      expect(data.success).toBe(false);
      expect(data.result.totalUsers).toBe(3);
      expect(data.result.successCount).toBe(2);
      expect(data.result.failureCount).toBe(1);
      expect(data.result.failures).toHaveLength(1);
      expect(data.result.failures[0].userId).toBe('user3');
      expect(data.result.failures[0].error).toBe('사용자를 찾을 수 없습니다.');
    });

    test('4.1.8 이미 정지된 사용자 포함 시 부분 실패', async () => {
      // Given: 일부 이미 정지된 사용자 포함
      mockSupabase.in.mockResolvedValue({
        data: [
          { id: 'user1', status: AccountStatus.ACTIVE, email: 'user1@example.com' },
          { id: 'user2', status: AccountStatus.SUSPENDED, email: 'user2@example.com' }
        ],
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: ['user1', 'user2'],
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
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 207 다중 상태 반환
      expect(response.status).toBe(207);
      expect(data.result.successCount).toBe(1);
      expect(data.result.failureCount).toBe(1);
      expect(data.result.failures[0].userId).toBe('user2');
      expect(data.result.failures[0].error).toBe('이미 정지된 계정입니다.');
    });

    test('4.1.9 MASTER_ADMIN 사용자 포함 시 에러', async () => {
      // Given: MASTER_ADMIN 사용자 포함
      mockSupabase.in
        .mockResolvedValueOnce({
          data: [
            { id: 'user1', status: AccountStatus.ACTIVE, email: 'user1@example.com' },
            { id: 'masterAdmin456', status: AccountStatus.ACTIVE, email: 'master@example.com' }
          ],
          error: null
        });

      // MASTER_ADMIN 역할 확인
      mockSupabase.eq.mockResolvedValue({
        data: [
          { user_id: 'masterAdmin456', role: 'MASTER_ADMIN' }
        ],
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: ['user1', 'masterAdmin456'],
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.LOW
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 207 다중 상태 반환
      expect(response.status).toBe(207);
      expect(data.result.failures).toContainEqual(
        expect.objectContaining({
          userId: 'masterAdmin456',
          error: 'MASTER_ADMIN 사용자는 정지할 수 없습니다.'
        })
      );
    });

    test('4.1.10 자기 자신 포함하여 정지 시도', async () => {
      // Given: 요청자 자신의 ID 포함
      const adminId = 'admin123';
      
      mockSupabase.in.mockResolvedValue({
        data: [
          { id: 'user1', status: AccountStatus.ACTIVE, email: 'user1@example.com' },
          { id: adminId, status: AccountStatus.ACTIVE, email: 'admin@example.com' }
        ],
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: ['user1', adminId],
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.MEDIUM
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 207 다중 상태 반환
      expect(response.status).toBe(207);
      expect(data.result.failures).toContainEqual(
        expect.objectContaining({
          userId: adminId,
          error: '자신의 계정을 정지할 수 없습니다.'
        })
      );
    });
  });

  describe('🔴 트랜잭션 및 롤백 실패 테스트', () => {
    beforeEach(() => {
      // 기본 권한 및 검증 성공 설정
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin123' } },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { role: 'MASTER_ADMIN' },
        error: null
      });

      mockSupabase.in.mockResolvedValue({
        data: [
          { id: 'user1', status: AccountStatus.ACTIVE, email: 'user1@example.com' },
          { id: 'user2', status: AccountStatus.ACTIVE, email: 'user2@example.com' },
          { id: 'user3', status: AccountStatus.ACTIVE, email: 'user3@example.com' }
        ],
        error: null
      });
    });

    test('4.1.11 벌크 정지 트랜잭션 실패 시 모든 변경사항 롤백', async () => {
      // Given: 트랜잭션 중간에 실패 상황
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { 
          code: 'TRANSACTION_FAILED', 
          message: 'Transaction failed during bulk suspension' 
        }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: ['user1', 'user2', 'user3'],
          reason: SuspensionReason.SYSTEM_MAINTENANCE,
          severity: SuspensionSeverity.LOW,
          duration: {
            type: 'TEMPORARY',
            startDate: new Date(),
            endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            autoReactivate: true,
            timezone: 'Asia/Seoul'
          }
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 500 에러 반환 및 롤백 메시지
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('벌크 정지 트랜잭션이 실패했습니다. 모든 변경사항이 롤백되었습니다.');
    });

    test('4.1.12 부분 실패 시 성공한 작업은 유지하고 실패만 롤백', async () => {
      // Given: 부분 실패 상황에서 롤백 처리
      mockSupabase.rpc.mockResolvedValue({
        data: {
          total_users: 3,
          success_count: 2,
          failure_count: 1,
          successes: [
            { user_id: 'user1', suspension_id: 'susp1', timestamp: new Date() },
            { user_id: 'user2', suspension_id: 'susp2', timestamp: new Date() }
          ],
          failures: [
            { user_id: 'user3', error: 'Database constraint violation', timestamp: new Date() }
          ],
          rollback_available: true
        },
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: ['user1', 'user2', 'user3'],
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.HIGH,
          duration: {
            type: 'TEMPORARY',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            autoReactivate: false,
            timezone: 'Asia/Seoul'
          }
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 부분 성공 상태 반환
      expect(response.status).toBe(207);
      expect(data.success).toBe(false);
      expect(data.result.rollbackAvailable).toBe(true);
      expect(data.result.successCount).toBe(2);
      expect(data.result.failureCount).toBe(1);
    });
  });

  describe('🔴 배치 크기 및 성능 제한 테스트', () => {
    test('4.1.13 과도한 배치 크기로 인한 타임아웃 처리', async () => {
      // Given: 매우 큰 배치 크기 (실제로는 시스템 리소스 부족 상황)
      const largeUserIds = Array.from({ length: 100 }, (_, i) => `user${i + 1}`);
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin123' } },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { role: 'MASTER_ADMIN' },
        error: null
      });

      // 타임아웃 시뮬레이션
      mockSupabase.rpc.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), 1000);
        });
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: largeUserIds,
          reason: SuspensionReason.SYSTEM_MAINTENANCE,
          severity: SuspensionSeverity.LOW,
          batchSize: 10 // 작은 배치 크기로 설정해도 전체적으로 시간 초과
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 504 타임아웃 에러 반환
      expect(response.status).toBe(504);
      expect(data.success).toBe(false);
      expect(data.error).toBe('벌크 정지 처리 시간이 초과되었습니다.');
    });
  });

  describe('🔴 동시성 및 경쟁 조건 테스트', () => {
    test('4.1.14 동시에 같은 사용자를 정지하려는 경우 처리', async () => {
      // Given: 동시성 경쟁 상황 (다른 관리자가 같은 사용자를 정지 중)
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { 
          code: 'CONCURRENT_MODIFICATION', 
          message: 'User is being modified by another process' 
        }
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/master-admin/users/bulk-suspend',
        body: {
          userIds: ['user1', 'user2'],
          reason: SuspensionReason.POLICY_VIOLATION,
          severity: SuspensionSeverity.MEDIUM
        }
      });

      // When: API 호출
      const response = await POST(req as NextRequest);
      const data = await response.json();

      // Then: 409 충돌 에러 반환
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('다른 관리자가 동시에 같은 사용자를 수정하고 있습니다. 잠시 후 다시 시도해주세요.');
    });
  });
});