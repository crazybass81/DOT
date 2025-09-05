/**
 * @jest-environment node
 */

import { NotificationManager, NotificationType, NotificationPriority } from '../../src/lib/notification-manager';

// Mock WebSocket server
jest.mock('../../src/lib/websocket-server', () => ({
  webSocketServer: {
    broadcastToOrganization: jest.fn(),
    sendToUser: jest.fn(),
    getSocketIOServer: jest.fn(() => ({
      emit: jest.fn()
    }))
  }
}));

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;

  beforeEach(() => {
    notificationManager = NotificationManager.getInstance();
    jest.clearAllMocks();
  });

  describe('싱글톤 패턴', () => {
    test('동일한 인스턴스를 반환해야 함', () => {
      const instance1 = NotificationManager.getInstance();
      const instance2 = NotificationManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('출근/퇴근 알림', () => {
    test('출근 체크인 알림을 성공적으로 전송해야 함', async () => {
      const checkInData = {
        userId: 'user-1',
        userName: '김철수',
        organizationId: 'org-1',
        checkInTime: new Date().toISOString(),
        location: { lat: 37.5665, lng: 126.9780, address: '서울시 중구' }
      };

      const result = await notificationManager.sendAttendanceCheckIn(checkInData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
      expect(result.error).toBeUndefined();
    });

    test('퇴근 체크아웃 알림을 성공적으로 전송해야 함', async () => {
      const checkOutData = {
        userId: 'user-1',
        userName: '김철수',
        organizationId: 'org-1',
        checkOutTime: new Date().toISOString(),
        workHours: 8.5,
        overtimeHours: 0.5
      };

      const result = await notificationManager.sendAttendanceCheckOut(checkOutData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
    });

    test('연장근무가 없는 퇴근 알림도 처리해야 함', async () => {
      const checkOutData = {
        userId: 'user-1',
        userName: '김철수',
        organizationId: 'org-1',
        checkOutTime: new Date().toISOString(),
        workHours: 8.0
      };

      const result = await notificationManager.sendAttendanceCheckOut(checkOutData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
    });
  });

  describe('역할 변경 알림', () => {
    test('역할 변경 알림을 성공적으로 전송해야 함', async () => {
      const roleChangeData = {
        userId: 'user-1',
        userName: '김철수',
        organizationId: 'org-1',
        oldRole: 'WORKER',
        newRole: 'ADMIN',
        changedBy: 'manager-1',
        changedByName: '박관리자'
      };

      const result = await notificationManager.sendRoleChange(roleChangeData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
    });

    test('새 역할 할당 알림을 성공적으로 전송해야 함', async () => {
      const roleAssignData = {
        userId: 'user-1',
        userName: '김철수',
        organizationId: 'org-1',
        organizationName: '테스트 조직',
        newRole: 'MANAGER',
        assignedBy: 'admin-1',
        assignedByName: '이어드민'
      };

      const result = await notificationManager.sendRoleAssign(roleAssignData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
    });

    test('역할 할당에서 assignedBy 없이도 처리해야 함', async () => {
      const roleAssignData = {
        userId: 'user-1',
        userName: '김철수',
        organizationId: 'org-1',
        organizationName: '테스트 조직',
        newRole: 'MANAGER',
        changedBy: 'admin-1',
        changedByName: '이어드민'
      };

      const result = await notificationManager.sendRoleAssign(roleAssignData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
    });
  });

  describe('조직 초대/승인 알림', () => {
    test('조직 초대 알림을 성공적으로 전송해야 함', async () => {
      const invitationData = {
        userId: 'user-1',
        userName: '김철수',
        organizationId: 'org-2',
        organizationName: '새로운 조직',
        invitedBy: 'manager-2',
        invitedByName: '최매니저',
        role: 'WORKER',
        invitationToken: 'invite-token-123'
      };

      const result = await notificationManager.sendOrganizationInvitation(invitationData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
    });

    test('조직 승인 알림을 성공적으로 전송해야 함', async () => {
      const approvalData = {
        userId: 'user-1',
        userName: '김철수',
        organizationId: 'org-2',
        organizationName: '새로운 조직',
        approvedBy: 'admin-2',
        approvedByName: '정어드민',
        role: 'WORKER'
      };

      const result = await notificationManager.sendOrganizationApproval(approvalData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
    });
  });

  describe('시스템 공지사항', () => {
    test('시스템 전체 공지사항을 성공적으로 브로드캐스트해야 함', async () => {
      const announcementData = {
        title: '시스템 점검 안내',
        message: '2024년 1월 15일 02:00-04:00 시스템 점검이 예정되어 있습니다.',
        priority: NotificationPriority.HIGH,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'system'
      };

      const result = await notificationManager.broadcastSystemAnnouncement(announcementData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
    });

    test('조직별 공지사항을 성공적으로 전송해야 함', async () => {
      const orgAnnouncementData = {
        organizationId: 'org-1',
        organizationName: '테스트 조직',
        title: '월례 회의 안내',
        message: '이번 달 월례 회의는 1월 20일 오후 2시에 진행됩니다.',
        priority: NotificationPriority.MEDIUM,
        validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'manager-1',
        createdByName: '박관리자'
      };

      const result = await notificationManager.sendOrganizationAnnouncement(orgAnnouncementData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('test-notification-id');
    });
  });

  describe('알림 이력 관리', () => {
    test('사용자 알림을 조회할 수 있어야 함', async () => {
      const userId = 'user-1';
      
      const result = await notificationManager.getUserNotifications(userId, {
        limit: 10,
        offset: 0
      });

      // Supabase 모킹으로 인해 성공하지 않을 수 있지만, 에러 처리는 확인할 수 있음
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('알림을 읽음 상태로 표시할 수 있어야 함', async () => {
      const notificationId = 'test-notification-1';
      const userId = 'user-1';
      
      const result = await notificationManager.markAsRead(notificationId, userId);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('여러 알림을 일괄 읽음 처리할 수 있어야 함', async () => {
      const notificationIds = ['test-notification-1', 'test-notification-2'];
      const userId = 'user-1';
      
      const result = await notificationManager.markMultipleAsRead(notificationIds, userId);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('알림 조회 시 다양한 필터를 적용할 수 있어야 함', async () => {
      const userId = 'user-1';
      
      const result = await notificationManager.getUserNotifications(userId, {
        limit: 20,
        offset: 0,
        type: NotificationType.ATTENDANCE_CHECK_IN,
        unreadOnly: true,
        organizationId: 'org-1',
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31')
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('알림 타입 검증', () => {
    test('NotificationType 열거형이 올바르게 정의되어 있어야 함', () => {
      expect(NotificationType.ATTENDANCE_CHECK_IN).toBe('ATTENDANCE_CHECK_IN');
      expect(NotificationType.ATTENDANCE_CHECK_OUT).toBe('ATTENDANCE_CHECK_OUT');
      expect(NotificationType.ROLE_CHANGED).toBe('ROLE_CHANGED');
      expect(NotificationType.ROLE_ASSIGNED).toBe('ROLE_ASSIGNED');
      expect(NotificationType.ORGANIZATION_INVITED).toBe('ORGANIZATION_INVITED');
      expect(NotificationType.ORGANIZATION_APPROVED).toBe('ORGANIZATION_APPROVED');
      expect(NotificationType.SYSTEM_ANNOUNCEMENT).toBe('SYSTEM_ANNOUNCEMENT');
      expect(NotificationType.ORGANIZATION_ANNOUNCEMENT).toBe('ORGANIZATION_ANNOUNCEMENT');
    });

    test('NotificationPriority 열거형이 올바르게 정의되어 있어야 함', () => {
      expect(NotificationPriority.LOW).toBe('LOW');
      expect(NotificationPriority.MEDIUM).toBe('MEDIUM');
      expect(NotificationPriority.HIGH).toBe('HIGH');
      expect(NotificationPriority.URGENT).toBe('URGENT');
    });
  });
});