/**
 * 실시간 세션 무효화 미들웨어 테스트 - TDD RED Phase
 * 정지된 계정의 로그인 차단 및 활성 세션 무효화 테스트
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { sessionInvalidationMiddleware } from '@/middleware/sessionInvalidation';
import { AccountStatus } from '@/types/suspension';

// 모킹 설정
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

jest.mock('@/lib/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    scan: jest.fn(),
    ping: jest.fn()
  }
}));

describe('Session Invalidation Middleware - TDD RED Phase', () => {
  let mockSupabase: any;
  let mockRedis: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        signOut: jest.fn()
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      single: jest.fn()
    };

    mockRedis = require('@/lib/redis').redisClient;
    require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🔴 정지된 계정 로그인 차단 실패 테스트', () => {
    test('7.1.1 정지된 사용자의 API 접근 차단 실패', async () => {
      // Given: 정지된 사용자가 API 접근 시도
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'user@example.com' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          status: AccountStatus.SUSPENDED
        },
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/protected-resource',
        headers: {
          authorization: 'Bearer valid-token',
          'x-forwarded-for': '192.168.1.100'
        }
      });

      // When: 미들웨어 실행
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: 403 차단 응답 반환
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('계정이 정지되어 접근할 수 없습니다.');
      expect(data.suspensionStatus).toBe(AccountStatus.SUSPENDED);
    });

    test('7.1.2 영구 차단된 사용자의 로그인 시도 차단 실패', async () => {
      // Given: 영구 차단된 사용자
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'banned123', email: 'banned@example.com' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'banned123',
          status: AccountStatus.PERMANENTLY_BANNED
        },
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/auth/signin'
      });

      // When: 미들웨어 실행
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: 영구 차단 메시지와 함께 차단
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('계정이 영구 차단되었습니다.');
    });

    test('7.1.3 일시 비활성화된 계정의 접근 차단 실패', async () => {
      // Given: 일시 비활성화된 사용자
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'disabled123' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'disabled123',
          status: AccountStatus.TEMPORARILY_DISABLED
        },
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/user/profile'
      });

      // When: 미들웨어 실행
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: 임시 비활성화 메시지
      expect(response.status).toBe(423);
      const data = await response.json();
      expect(data.error).toBe('계정이 일시적으로 비활성화되었습니다.');
    });
  });

  describe('🔴 활성 세션 즉시 무효화 실패 테스트', () => {
    test('7.2.1 Redis에서 활성 세션 조회 실패', async () => {
      // Given: Redis 연결 실패
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/dashboard'
      });

      // When: 미들웨어 실행
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: Redis 실패 시에도 DB 기반 검증으로 fallback
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    test('7.2.2 세션 토큰과 사용자 ID 불일치 감지 실패', async () => {
      // Given: 토큰의 사용자 ID와 실제 요청 사용자 ID 불일치
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      });

      mockRedis.get.mockResolvedValue(JSON.stringify({
        userId: 'different-user-456', // 다른 사용자 ID
        sessionId: 'session123',
        createdAt: Date.now()
      }));

      const { req } = createMocks({
        method: 'GET',
        url: '/api/sensitive-data',
        headers: {
          authorization: 'Bearer suspicious-token'
        }
      });

      // When: 미들웨어 실행
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: 세션 불일치로 인한 차단
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('유효하지 않은 세션입니다.');
    });

    test('7.2.3 만료된 세션 토큰 감지 실패', async () => {
      // Given: 만료된 세션 토큰
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25시간 전
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      });

      mockRedis.get.mockResolvedValue(JSON.stringify({
        userId: 'user123',
        sessionId: 'session123',
        createdAt: expiredTimestamp,
        expiresAt: expiredTimestamp + (24 * 60 * 60 * 1000) // 24시간 후 만료
      }));

      const { req } = createMocks({
        method: 'POST',
        url: '/api/user/update-profile'
      });

      // When: 미들웨어 실행
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: 만료된 세션 차단
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('세션이 만료되었습니다.');
    });

    test('7.2.4 정지 중인 사용자의 기존 세션 무효화 실패', async () => {
      // Given: 정지된 사용자의 활성 세션이 Redis에 존재
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'suspended123' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'suspended123',
          status: AccountStatus.SUSPENDED
        },
        error: null
      });

      mockRedis.get.mockResolvedValue(JSON.stringify({
        userId: 'suspended123',
        sessionId: 'active-session',
        createdAt: Date.now()
      }));

      // 세션 삭제 실패
      mockRedis.del.mockRejectedValue(new Error('Redis delete failed'));

      const { req } = createMocks({
        method: 'GET',
        url: '/api/user/notifications'
      });

      // When: 미들웨어 실행
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: 세션 삭제 실패해도 접근 차단
      expect(response.status).toBe(403);
      expect(mockRedis.del).toHaveBeenCalledWith('session:suspended123:active-session');
    });
  });

  describe('🔴 Redis 연결 실패 시 Fallback 테스트', () => {
    test('7.3.1 Redis 완전 다운 시 DB 기반 검증으로 fallback', async () => {
      // Given: Redis 완전 다운 상황
      mockRedis.ping.mockRejectedValue(new Error('Redis is down'));
      mockRedis.get.mockRejectedValue(new Error('Connection refused'));

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          status: AccountStatus.ACTIVE
        },
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/user/dashboard'
      });

      // When: 미들웨어 실행
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: Redis 없어도 DB 검증으로 정상 동작
      expect(mockSupabase.single).toHaveBeenCalled();
      // 정상 사용자이므로 요청 통과
      expect(response.status).not.toBe(403);
    });

    test('7.3.2 Redis 응답 지연 시 타임아웃 처리 실패', async () => {
      // Given: Redis 응답이 매우 느린 상황
      mockRedis.get.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(null), 10000); // 10초 지연
        });
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/urgent-request'
      });

      // When: 미들웨어 실행 (타임아웃 3초 설정 가정)
      const startTime = Date.now();
      const response = await sessionInvalidationMiddleware(req as NextRequest);
      const executionTime = Date.now() - startTime;

      // Then: 3초 내에 타임아웃되어야 함
      expect(executionTime).toBeLessThan(5000);
      // 타임아웃 발생으로 fallback 실행
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    test('7.3.3 Redis 메모리 부족으로 세션 저장 실패', async () => {
      // Given: Redis 메모리 부족 상황
      mockRedis.set.mockRejectedValue(new Error('OOM command not allowed'));
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          status: AccountStatus.ACTIVE
        },
        error: null
      });

      const { req } = createMocks({
        method: 'POST',
        url: '/api/auth/new-session'
      });

      // When: 새 세션 생성 시도
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: Redis 저장 실패 시 경고 로그와 함께 계속 진행
      // 실제 구현에서는 로그 확인이 필요하지만 테스트에서는 동작 확인
      expect(response.status).not.toBe(500);
    });
  });

  describe('🔴 동시성 및 경쟁 조건 실패 테스트', () => {
    test('7.3.4 동시에 여러 세션이 같은 사용자로 접근할 때 처리 실패', async () => {
      // Given: 같은 사용자의 여러 동시 요청
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          status: AccountStatus.ACTIVE
        },
        error: null
      });

      // 동시 세션 충돌 시뮬레이션
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({
        userId: 'user123',
        sessionId: 'session1',
        createdAt: Date.now()
      }));

      const requests = Array.from({ length: 5 }, () => 
        createMocks({
          method: 'GET',
          url: '/api/user/concurrent-access'
        }).req
      );

      // When: 동시에 여러 요청 처리
      const responses = await Promise.all(
        requests.map(req => sessionInvalidationMiddleware(req as NextRequest))
      );

      // Then: 모든 요청이 적절히 처리되어야 함 (race condition 없이)
      responses.forEach(response => {
        expect(response.status).not.toBe(500); // 내부 서버 오류 없음
      });
    });

    test('7.3.5 세션 생성과 동시에 정지 처리되는 경우', async () => {
      // Given: 세션 생성 중에 사용자가 정지되는 상황
      let callCount = 0;
      mockSupabase.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 첫 번째 호출: 활성 상태
          return Promise.resolve({
            data: { id: 'user123', status: AccountStatus.ACTIVE },
            error: null
          });
        } else {
          // 두 번째 호출: 정지 상태로 변경됨
          return Promise.resolve({
            data: { id: 'user123', status: AccountStatus.SUSPENDED },
            error: null
          });
        }
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/user/profile'
      });

      // When: 미들웨어 실행 (중간에 상태 변경됨)
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: 최신 상태를 반영하여 차단되어야 함
      expect(response.status).toBe(403);
    });
  });

  describe('🔴 성능 및 리소스 실패 테스트', () => {
    test('7.3.6 대량 세션 스캔 시 성능 저하', async () => {
      // Given: 매우 많은 활성 세션이 있는 상황
      const manySessionKeys = Array.from({ length: 10000 }, (_, i) => 
        `session:user${i}:session${i}`
      );
      
      mockRedis.scan.mockResolvedValue([0, manySessionKeys]);
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/all-sessions' // 모든 세션 조회하는 관리자 기능
      });

      // When: 대량 세션 처리
      const startTime = Date.now();
      const response = await sessionInvalidationMiddleware(req as NextRequest);
      const executionTime = Date.now() - startTime;

      // Then: 합리적인 시간 내에 처리되어야 함 (5초 이내)
      expect(executionTime).toBeLessThan(5000);
    });

    test('7.3.7 메모리 누수로 인한 세션 정리 실패', async () => {
      // Given: 만료된 세션이 정리되지 않고 쌓인 상황
      const expiredSessions = Array.from({ length: 1000 }, (_, i) => 
        JSON.stringify({
          userId: `user${i}`,
          sessionId: `expired${i}`,
          createdAt: Date.now() - (48 * 60 * 60 * 1000), // 48시간 전
          expiresAt: Date.now() - (24 * 60 * 60 * 1000)  // 24시간 전 만료
        })
      );

      // 만료된 세션들이 여전히 Redis에 존재
      mockRedis.get.mockResolvedValue(expiredSessions[0]);

      const { req } = createMocks({
        method: 'GET',
        url: '/api/cleanup-sessions'
      });

      // When: 세션 정리 작업
      const response = await sessionInvalidationMiddleware(req as NextRequest);

      // Then: 만료된 세션은 자동으로 무효화되어야 함
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });
});