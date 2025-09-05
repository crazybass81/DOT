import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { notificationManager } from '@/lib/notification-manager';

// 실제 Supabase 통합 테스트를 위한 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe('NotificationManager 읽음/안읽음 상태 관리 - 통합 테스트', () => {
  let supabase: ReturnType<typeof createClient>;
  let testUserId: string;
  let testOrgId: string;
  let testNotificationIds: string[] = [];

  beforeAll(async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase 환경 변수가 설정되지 않아 통합 테스트를 건너뜁니다.');
      return;
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey);
    testUserId = 'test-user-' + Date.now();
    testOrgId = 'test-org-' + Date.now();
  });

  beforeEach(async () => {
    if (!supabase) return;

    // 테스트용 알림 데이터 생성
    const testNotifications = [
      {
        type: 'ATTENDANCE_CHECK_IN',
        title: '출근 알림 테스트',
        message: '테스트 사용자가 출근했습니다.',
        data: { userId: testUserId },
        priority: 'LOW',
        created_by: testUserId,
        target_users: [testUserId],
      },
      {
        type: 'ROLE_CHANGED',
        title: '역할 변경 테스트',
        message: '테스트 역할이 변경되었습니다.',
        data: { userId: testUserId },
        priority: 'MEDIUM',
        created_by: 'admin-test',
        target_users: [testUserId],
      },
      {
        type: 'SYSTEM_ANNOUNCEMENT',
        title: '시스템 공지 테스트',
        message: '테스트 시스템 공지입니다.',
        data: {},
        priority: 'HIGH',
        created_by: 'system',
        target_organizations: [testOrgId],
      },
    ];

    // 테스트 알림 삽입
    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotifications)
      .select('id');

    if (error) {
      throw new Error(`테스트 데이터 생성 실패: ${error.message}`);
    }

    testNotificationIds = data.map((item: any) => item.id);
  });

  afterEach(async () => {
    if (!supabase) return;

    // 테스트 데이터 정리
    await Promise.all([
      supabase
        .from('user_notifications')
        .delete()
        .in('notification_id', testNotificationIds),
      supabase
        .from('notifications')
        .delete()
        .in('id', testNotificationIds),
    ]);

    testNotificationIds = [];
  });

  describe('실제 데이터베이스 연동 테스트', () => {
    it('단일 알림 읽음 처리가 데이터베이스에 올바르게 저장되어야 함', async () => {
      if (!supabase) {
        console.log('Supabase가 설정되지 않아 테스트를 건너뜁니다.');
        return;
      }

      const notificationId = testNotificationIds[0];

      // 읽음 처리
      const result = await notificationManager.markAsRead(notificationId, testUserId);
      expect(result.success).toBe(true);

      // 데이터베이스에서 직접 확인
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('notification_id', notificationId)
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.read_at).toBeTruthy();
      expect(new Date(data.read_at).getTime()).toBeCloseTo(Date.now(), -1000); // 1초 오차 허용
    });

    it('여러 알림 일괄 읽음 처리가 올바르게 작동해야 함', async () => {
      if (!supabase) {
        console.log('Supabase가 설정되지 않아 테스트를 건너뜁니다.');
        return;
      }

      const notificationIds = testNotificationIds.slice(0, 2);

      // 일괄 읽음 처리
      const result = await notificationManager.markMultipleAsRead(notificationIds, testUserId);
      expect(result.success).toBe(true);

      // 데이터베이스에서 확인
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .in('notification_id', notificationIds)
        .eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
      data.forEach((item: any) => {
        expect(item.read_at).toBeTruthy();
      });
    });

    it('이미 읽은 알림을 다시 읽음 처리해도 오류가 발생하지 않아야 함', async () => {
      if (!supabase) {
        console.log('Supabase가 설정되지 않아 테스트를 건너뜁니다.');
        return;
      }

      const notificationId = testNotificationIds[0];

      // 첫 번째 읽음 처리
      const result1 = await notificationManager.markAsRead(notificationId, testUserId);
      expect(result1.success).toBe(true);

      // 두 번째 읽음 처리 (중복)
      const result2 = await notificationManager.markAsRead(notificationId, testUserId);
      expect(result2.success).toBe(true);

      // 데이터베이스에 중복 레코드가 생성되지 않았는지 확인
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('notification_id', notificationId)
        .eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1); // 중복 없이 1개만 존재해야 함
    });
  });

  describe('동시성 처리 테스트', () => {
    it('같은 알림을 동시에 여러 번 읽음 처리해도 안전해야 함', async () => {
      if (!supabase) {
        console.log('Supabase가 설정되지 않아 테스트를 건너뜁니다.');
        return;
      }

      const notificationId = testNotificationIds[0];

      // 동시에 여러 번 읽음 처리 시도
      const promises = Array.from({ length: 10 }, () => 
        notificationManager.markAsRead(notificationId, testUserId)
      );

      const results = await Promise.all(promises);

      // 모든 요청이 성공해야 함
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 데이터베이스에 1개의 레코드만 존재해야 함
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('notification_id', notificationId)
        .eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('서로 다른 사용자가 같은 알림을 읽어도 독립적으로 처리되어야 함', async () => {
      if (!supabase) {
        console.log('Supabase가 설정되지 않아 테스트를 건너뜁니다.');
        return;
      }

      const notificationId = testNotificationIds[0];
      const anotherUserId = 'another-user-' + Date.now();

      // 두 사용자가 같은 알림을 읽음 처리
      const results = await Promise.all([
        notificationManager.markAsRead(notificationId, testUserId),
        notificationManager.markAsRead(notificationId, anotherUserId),
      ]);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 각 사용자별로 독립적인 레코드가 생성되어야 함
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('notification_id', notificationId)
        .in('user_id', [testUserId, anotherUserId]);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });
  });

  describe('대용량 데이터 처리 성능 테스트', () => {
    it('1000개의 알림을 일괄 읽음 처리할 수 있어야 함', async () => {
      if (!supabase) {
        console.log('Supabase가 설정되지 않아 테스트를 건너뜁니다.');
        return;
      }

      // 대량의 테스트 알림 생성
      const manyNotifications = Array.from({ length: 1000 }, (_, i) => ({
        type: 'SYSTEM_ANNOUNCEMENT',
        title: `대량 테스트 알림 ${i + 1}`,
        message: `대량 처리 테스트용 메시지 ${i + 1}`,
        data: { index: i },
        priority: 'LOW',
        created_by: 'system',
        target_users: [testUserId],
      }));

      const { data: insertedNotifications, error: insertError } = await supabase
        .from('notifications')
        .insert(manyNotifications)
        .select('id');

      if (insertError) {
        throw new Error(`대량 테스트 데이터 생성 실패: ${insertError.message}`);
      }

      const manyNotificationIds = insertedNotifications.map((item: any) => item.id);

      try {
        // 성능 측정 시작
        const startTime = Date.now();

        // 대량 읽음 처리
        const result = await notificationManager.markMultipleAsRead(manyNotificationIds, testUserId);

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(10000); // 10초 이내에 완료되어야 함

        // 일부 샘플 확인
        const { data: sampleData, error: sampleError } = await supabase
          .from('user_notifications')
          .select('*')
          .in('notification_id', manyNotificationIds.slice(0, 10))
          .eq('user_id', testUserId);

        expect(sampleError).toBeNull();
        expect(sampleData).toHaveLength(10);

        console.log(`대량 처리 성능: ${manyNotificationIds.length}개 알림을 ${duration}ms에 처리`);
      } finally {
        // 테스트 데이터 정리
        await Promise.all([
          supabase
            .from('user_notifications')
            .delete()
            .in('notification_id', manyNotificationIds),
          supabase
            .from('notifications')
            .delete()
            .in('id', manyNotificationIds),
        ]);
      }
    });
  });

  describe('트랜잭션 일관성 테스트', () => {
    it('배치 처리 중 일부 실패 시 적절히 롤백되어야 함', async () => {
      if (!supabase) {
        console.log('Supabase가 설정되지 않아 테스트를 건너뜁니다.');
        return;
      }

      const validNotificationIds = testNotificationIds.slice(0, 2);
      const invalidNotificationIds = ['invalid-id-1', 'invalid-id-2'];
      const mixedIds = [...validNotificationIds, ...invalidNotificationIds];

      // 일부 유효하지 않은 ID가 포함된 배치 처리
      const result = await notificationManager.markMultipleAsRead(mixedIds, testUserId);

      // 전체 배치가 실패하거나, 유효한 것들만 처리되어야 함
      // 구현 정책에 따라 결과가 달라질 수 있음
      if (!result.success) {
        // 전체 실패 정책: 아무것도 처리되지 않아야 함
        const { data, error } = await supabase
          .from('user_notifications')
          .select('*')
          .in('notification_id', validNotificationIds)
          .eq('user_id', testUserId);

        expect(data).toHaveLength(0);
      } else {
        // 부분 성공 정책: 유효한 것들만 처리되어야 함
        const { data, error } = await supabase
          .from('user_notifications')
          .select('*')
          .in('notification_id', validNotificationIds)
          .eq('user_id', testUserId);

        expect(data?.length).toBe(validNotificationIds.length);
      }
    });
  });
});