import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

// 실제 NotificationManager를 모킹하되 실제와 유사한 동작 구현
const mockNotificationManager = {
  getUserNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markMultipleAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
};

jest.mock('@/lib/notification-manager', () => ({
  notificationManager: mockNotificationManager,
}));

// useNotificationBatch 훅도 모킹
const mockBatchHook = {
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  pendingReads: new Set(),
  isProcessing: false,
};

jest.mock('@/hooks/useNotificationBatch', () => ({
  useNotificationBatch: jest.fn(() => mockBatchHook),
}));

describe('NotificationCenter - 읽음/안읽음 상태 통합 테스트', () => {
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
    
    // NotificationManager 기본 응답 설정
    mockNotificationManager.getUserNotifications.mockResolvedValue({
      success: true,
      notifications: mockNotifications,
      totalCount: 3,
    });

    mockNotificationManager.markAsRead.mockResolvedValue({ success: true });
    mockNotificationManager.markMultipleAsRead.mockResolvedValue({ success: true });
    mockNotificationManager.markAllAsRead.mockResolvedValue({ success: true, markedCount: 2 });

    // 배치 훅 기본 설정
    mockBatchHook.pendingReads = new Set();
    mockBatchHook.isProcessing = false;
    mockBatchHook.markAsRead.mockClear();
    mockBatchHook.markAllAsRead.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('기본 알림 표시', () => {
    it('읽지 않은 알림 개수가 배지에 표시되어야 함', async () => {
      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge');
        expect(badge).toHaveTextContent('2'); // notif-1, notif-3
      });
    });

    it('알림 센터를 열면 모든 알림이 표시되어야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 배지가 나타날 때까지 기다리기
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      });

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      // 모든 알림 표시 확인
      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
        expect(screen.getByTestId('notification-item-notif-2')).toBeInTheDocument();
        expect(screen.getByTestId('notification-item-notif-3')).toBeInTheDocument();
      });
    });
  });

  describe('개별 알림 읽음 처리', () => {
    it('읽지 않은 알림 클릭 시 배치 처리가 호출되어야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 로딩 대기
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      });

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      // 읽지 않은 알림 클릭
      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
      });

      const unreadNotification = screen.getByTestId('notification-item-notif-1');
      await user.click(unreadNotification);

      // 배치 처리 호출 확인
      expect(mockBatchHook.markAsRead).toHaveBeenCalledWith('notif-1');
    });

    it('이미 읽은 알림 클릭 시 배치 처리가 호출되지 않아야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 로딩 대기
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      });

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      // 이미 읽은 알림 클릭
      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-2')).toBeInTheDocument();
      });

      const readNotification = screen.getByTestId('notification-item-notif-2');
      await user.click(readNotification);

      // 배치 처리가 호출되지 않아야 함
      expect(mockBatchHook.markAsRead).not.toHaveBeenCalledWith('notif-2');
    });
  });

  describe('전체 읽음 처리', () => {
    it('모든 읽음 버튼 클릭 시 배치 처리가 호출되어야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 로딩 대기
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      });

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      // 모든 읽음 버튼 클릭
      await waitFor(() => {
        expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
      });

      const markAllButton = screen.getByTestId('mark-all-read-button');
      await user.click(markAllButton);

      // 배치 처리 호출 확인
      expect(mockBatchHook.markAllAsRead).toHaveBeenCalled();
    });

    it('처리 중일 때 버튼이 비활성화되어야 함', async () => {
      // isProcessing을 true로 설정
      mockBatchHook.isProcessing = true;
      
      const user = userEvent.setup();
      
      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 로딩 대기
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      });

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      // 모든 읽음 버튼 확인
      await waitFor(() => {
        const markAllButton = screen.getByTestId('mark-all-read-button');
        expect(markAllButton).toBeDisabled();
        expect(markAllButton).toHaveTextContent('처리중...');
      });
    });
  });

  describe('UI 상태 반영', () => {
    it('읽지 않은 알림은 올바른 스타일이 적용되어야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 로딩 대기
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      });

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      await waitFor(() => {
        const unreadNotification = screen.getByTestId('notification-item-notif-1');
        expect(unreadNotification).toHaveClass('notification-unread');
        expect(unreadNotification).not.toHaveClass('notification-read');
        expect(unreadNotification).not.toHaveClass('opacity-75');
      });
    });

    it('읽은 알림은 올바른 스타일이 적용되어야 함', async () => {
      const user = userEvent.setup();
      
      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
        />
      );

      // 알림 로딩 대기
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      });

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      await waitFor(() => {
        const readNotification = screen.getByTestId('notification-item-notif-2');
        expect(readNotification).toHaveClass('notification-read');
        expect(readNotification).toHaveClass('opacity-75');
      });
    });
  });

  describe('콜백 처리', () => {
    it('알림 클릭 시 제공된 콜백이 호출되어야 함', async () => {
      const onNotificationClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <NotificationCenter
          userId={mockUserId}
          organizationId={mockOrgId}
          onNotificationClick={onNotificationClick}
        />
      );

      // 알림 로딩 대기
      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
      });

      // 알림 센터 열기
      const bellButton = screen.getByTestId('notification-bell');
      await user.click(bellButton);

      // 알림 클릭
      await waitFor(() => {
        expect(screen.getByTestId('notification-item-notif-1')).toBeInTheDocument();
      });

      const notification = screen.getByTestId('notification-item-notif-1');
      await user.click(notification);

      // 콜백 호출 확인
      expect(onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
    });
  });
});