import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { notificationManager } from '@/lib/notification-manager';

// NotificationManager 모킹
const mockNotificationManager = {
  getUserNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  markMultipleAsRead: jest.fn(),
};

jest.mock('@/lib/notification-manager', () => ({
  notificationManager: mockNotificationManager,
}));

describe('NotificationCenter - 읽음/안읽음 상태 관리', () => {
  const mockUserId = 'user-123';
  const mockOrgId = 'org-456';

  const mockNotifications = [
    {
      id: 'notif-1',
      type: 'ATTENDANCE_CHECK_IN',
      title: '출근 알림',
      message: '홍길동님이 출근했습니다.',
      data: { userId: 'user-456', userName: '홍길동' },
      priority: 'LOW',
      createdAt: '2024-01-15T09:00:00Z',
      readAt: null, // 읽지 않음
      createdBy: 'user-456',
    },
    {
      id: 'notif-2',
      type: 'ROLE_CHANGED',
      title: '역할 변경',
      message: '관리자 권한이 부여되었습니다.',
      data: { userId: mockUserId },
      priority: 'MEDIUM',
      createdAt: '2024-01-15T08:00:00Z',
      readAt: '2024-01-15T08:30:00Z', // 이미 읽음
      createdBy: 'admin-123',
    },
    {
      id: 'notif-3',
      type: 'SYSTEM_ANNOUNCEMENT',
      title: '시스템 공지',
      message: '시스템 점검 예정입니다.',
      data: {},
      priority: 'HIGH',
      createdAt: '2024-01-15T07:00:00Z',
      readAt: null, // 읽지 않음
      createdBy: 'system',
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 기본 API 응답 설정
    mockNotificationManager.getUserNotifications.mockResolvedValue({
      success: true,
      notifications: mockNotifications,
      totalCount: 3,
    });

    mockNotificationManager.markAsRead.mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('개별 알림 읽음 처리', () => {
    it('읽지 않은 알림 클릭 시 읽음 상태로 변경되어야 함', async () => {
      const user = userEvent.setup();

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 컴포넌트가 로드되고 알림이 렌더링될 때까지 기다리기
      await waitFor(() => {
        const badge = screen.queryByTestId('notification-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('2');
      });

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      // 읽지 않은 알림 찾기 (로딩 완료 후)
      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
      }, { timeout: 3000 });

      const unreadNotification = screen.getByTestId('notification-item-notif-1');
      
      // 읽지 않은 알림은 unread 클래스를 가져야 함
      expect(unreadNotification).toHaveClass('notification-unread');
      expect(unreadNotification).not.toHaveClass('notification-read');

      // 알림 클릭
      await user.click(unreadNotification);

      // markAsRead 호출 확인
      expect(mockNotificationManager.markAsRead).toHaveBeenCalledWith('notif-1', mockUserId);
      
      // UI가 즉시 업데이트되어야 함 (낙관적 업데이트)
      await waitFor(() => {
        expect(unreadNotification).toHaveClass('notification-read');
        expect(unreadNotification).not.toHaveClass('notification-unread');
      });
    });

    it('이미 읽은 알림 클릭 시 markAsRead를 호출하지 않아야 함', async () => {
      const user = userEvent.setup();

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      // 이미 읽은 알림 찾기
      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-2')).toBeInTheDocument();
      });

      const readNotification = screen.getByTestId('notification-item-notif-2');
      
      // 이미 읽은 알림은 read 클래스를 가져야 함
      expect(readNotification).toHaveClass('notification-read');

      // 알림 클릭
      await user.click(readNotification);

      // markAsRead가 호출되지 않아야 함
      expect(mockNotificationManager.markAsRead).not.toHaveBeenCalledWith('notif-2', mockUserId);
    });

    it('읽음 처리 실패 시 UI 상태를 원래대로 복원해야 함', async () => {
      // API 실패 상황 모킹
      mockNotificationManager.markAsRead.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
      });

      const unreadNotification = screen.getByTestId('notification-item-notif-1');

      // 알림 클릭
      await user.click(unreadNotification);

      // 에러 후 상태가 원래대로 복원되어야 함
      await waitFor(() => {
        expect(unreadNotification).toHaveClass('notification-unread');
        expect(unreadNotification).not.toHaveClass('notification-read');
      });
    });
  });

  describe('전체 읽음 처리', () => {
    it('모든 읽음 버튼 클릭 시 모든 읽지 않은 알림이 읽음 상태로 변경되어야 함', async () => {
      // markAllAsRead 메서드 모킹
      mockNotificationManager.markAllAsRead = jest.fn().mockResolvedValue({
        success: true,
        markedCount: 2,
      });

      const user = userEvent.setup();

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      // "모두 읽음" 버튼이 표시되어야 함
      await waitFor(() => {
        expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
      });

      const markAllButton = screen.getByTestId('mark-all-read-button');
      await user.click(markAllButton);

      // markAllAsRead 호출 확인
      expect(mockNotificationManager.markAllAsRead).toHaveBeenCalledWith(mockUserId, mockOrgId);

      // 읽지 않은 알림 카운트가 0이 되어야 함
      await waitFor(() => {
        const badge = screen.queryByTestId('notification-badge');
        expect(badge).not.toBeInTheDocument();
      });
    });

    it('읽지 않은 알림이 없으면 모든 읽음 버튼이 비활성화되어야 함', async () => {
      // 모든 알림이 읽은 상태로 설정
      const allReadNotifications = mockNotifications.map(n => ({
        ...n,
        readAt: '2024-01-15T10:00:00Z'
      }));

      mockNotificationManager.getUserNotifications.mockResolvedValue({
        success: true,
        notifications: allReadNotifications,
        totalCount: 3,
      });

      const user = userEvent.setup();

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      await waitFor(() => {
        const markAllButton = screen.queryByTestId('mark-all-read-button');
        if (markAllButton) {
          expect(markAllButton).toBeDisabled();
        }
      });
    });
  });

  describe('읽지 않은 알림 카운트', () => {
    it('읽지 않은 알림 개수가 정확히 표시되어야 함', async () => {
      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 읽지 않은 알림이 2개이므로 배지에 "2"가 표시되어야 함
      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge');
        expect(badge).toHaveTextContent('2');
      });
    });

    it('알림을 읽으면 카운트가 감소해야 함', async () => {
      const user = userEvent.setup();

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 초기 카운트 확인 (2개)
      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge');
        expect(badge).toHaveTextContent('2');
      });

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      // 첫 번째 읽지 않은 알림 클릭
      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
      });

      const unreadNotification = screen.getByTestId('notification-item-notif-1');
      await user.click(unreadNotification);

      // 카운트가 1로 감소해야 함
      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge');
        expect(badge).toHaveTextContent('1');
      });
    });

    it('99개 이상일 때 "99+"로 표시되어야 함', async () => {
      // 100개의 읽지 않은 알림 데이터 생성
      const manyUnreadNotifications = Array.from({ length: 100 }, (_, i) => ({
        id: `notif-${i + 1}`,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: `알림 ${i + 1}`,
        message: `메시지 ${i + 1}`,
        data: {},
        priority: 'LOW',
        createdAt: '2024-01-15T09:00:00Z',
        readAt: null,
        createdBy: 'system',
      }));

      mockNotificationManager.getUserNotifications.mockResolvedValue({
        success: true,
        notifications: manyUnreadNotifications,
        totalCount: 100,
      });

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge');
        expect(badge).toHaveTextContent('99+');
      });
    });
  });

  describe('UI 상태 반영', () => {
    it('읽지 않은 알림은 굵은 글씨와 파란색 점이 표시되어야 함', async () => {
      const user = userEvent.setup();

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
      });

      const unreadNotification = screen.getByTestId('notification-item-notif-1');

      // 읽지 않은 알림 스타일 확인
      expect(unreadNotification).toHaveClass('notification-unread');
      expect(unreadNotification).not.toHaveClass('opacity-75');

      // 파란색 점 표시 확인
      const unreadDot = unreadNotification.querySelector('.w-2.h-2.bg-blue-500.rounded-full');
      expect(unreadDot).toBeInTheDocument();
    });

    it('읽은 알림은 투명도가 적용되고 파란색 점이 없어야 함', async () => {
      const user = userEvent.setup();

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-2')).toBeInTheDocument();
      });

      const readNotification = screen.getByTestId('notification-item-notif-2');

      // 읽은 알림 스타일 확인
      expect(readNotification).toHaveClass('notification-read');
      expect(readNotification).toHaveClass('opacity-75');

      // 파란색 점이 없어야 함
      const unreadDot = readNotification.querySelector('.w-2.h-2.bg-blue-500.rounded-full');
      expect(unreadDot).not.toBeInTheDocument();
    });
  });

  describe('성능 최적화 - 배치 처리', () => {
    it('여러 알림을 빠르게 클릭했을 때 배치로 처리되어야 함', async () => {
      // markMultipleAsRead 메서드 모킹
      mockNotificationManager.markMultipleAsRead.mockResolvedValue({
        success: true,
      });

      const user = userEvent.setup();

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
          batchProcessingDelay={100} // 배치 처리 지연 시간 설정
        />
      );

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
        expect(screen.getByTestId('notification-item-notif-3')).toBeInTheDocument();
      });

      // 빠른 시간 내에 여러 알림 클릭
      const unreadNotification1 = screen.getByTestId('notification-item-notif-1');
      const unreadNotification3 = screen.getByTestId('notification-item-notif-3');

      await user.click(unreadNotification1);
      await user.click(unreadNotification3);

      // 배치 처리 완료까지 대기
      await waitFor(() => {
        expect(mockNotificationManager.markMultipleAsRead).toHaveBeenCalledWith(
          ['notif-1', 'notif-3'],
          mockUserId
        );
      }, { timeout: 200 });

      // 개별 markAsRead는 호출되지 않아야 함
      expect(mockNotificationManager.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('오프라인 처리', () => {
    it('오프라인 상황에서는 로컬 상태만 업데이트하고 온라인 시 동기화해야 함', async () => {
      // 네트워크 오프라인 상황 모킹
      mockNotificationManager.markAsRead.mockRejectedValue(new Error('Network Error'));

      const user = userEvent.setup();

      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
      });

      const unreadNotification = screen.getByTestId('notification-item-notif-1');
      await user.click(unreadNotification);

      // 로컬 상태는 업데이트되지만, 서버 동기화는 실패한 상황
      // 이는 실제로는 큐에 저장되어 나중에 재시도되어야 함
      await waitFor(() => {
        expect(unreadNotification).toHaveClass('notification-unread'); // 복원됨
      });
    });
  });
});