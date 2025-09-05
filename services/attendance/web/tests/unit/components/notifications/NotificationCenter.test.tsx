import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { NotificationMessage, NotificationType, NotificationPriority } from '@/lib/notification-manager';

// Mock notification manager
const mockNotificationManager = {
  getUserNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markMultipleAsRead: jest.fn(),
};

jest.mock('@/lib/notification-manager', () => ({
  notificationManager: mockNotificationManager,
  NotificationType: {
    ATTENDANCE_CHECK_IN: 'ATTENDANCE_CHECK_IN',
    ATTENDANCE_CHECK_OUT: 'ATTENDANCE_CHECK_OUT',
    ROLE_CHANGED: 'ROLE_CHANGED',
    ORGANIZATION_INVITED: 'ORGANIZATION_INVITED',
    SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  },
  NotificationPriority: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  },
}));

// Sample notification data
const mockNotifications: NotificationMessage[] = [
  {
    id: '1',
    type: NotificationType.ATTENDANCE_CHECK_IN,
    title: '출근 알림',
    message: '김철수님이 출근했습니다.',
    data: { userId: '1', userName: '김철수' },
    priority: NotificationPriority.LOW,
    createdAt: '2025-09-05T09:00:00.000Z',
    createdBy: '1',
    createdByName: '김철수',
  },
  {
    id: '2',
    type: NotificationType.ROLE_CHANGED,
    title: '역할 변경',
    message: '관리자 권한이 부여되었습니다.',
    data: { userId: '1', newRole: 'admin' },
    priority: NotificationPriority.HIGH,
    createdAt: '2025-09-05T08:30:00.000Z',
    readAt: '2025-09-05T08:35:00.000Z',
    createdBy: 'admin',
  },
  {
    id: '3',
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    title: '시스템 공지',
    message: '시스템 점검이 예정되어 있습니다.',
    data: {},
    priority: NotificationPriority.URGENT,
    createdAt: '2025-09-05T08:00:00.000Z',
    createdBy: 'system',
  },
];

describe('NotificationCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationManager.getUserNotifications.mockResolvedValue({
      success: true,
      notifications: mockNotifications,
      totalCount: 3,
    });
    mockNotificationManager.markAsRead.mockResolvedValue({ success: true });
    mockNotificationManager.markMultipleAsRead.mockResolvedValue({ success: true });
  });

  describe('🔴 RED: Bell Icon and Badge Tests', () => {
    test('should render notification bell icon', () => {
      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      expect(bellIcon).toBeInTheDocument();
    });

    test('should display unread notification count badge', async () => {
      render(<NotificationCenter userId="1" />);
      
      // Wait for the notification manager to be called and data to load
      await waitFor(() => {
        expect(mockNotificationManager.getUserNotifications).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        const badge = screen.getByTestId('notification-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('2'); // 2 unread notifications
      });
    });

    test('should not display badge when no unread notifications', async () => {
      const readNotifications = mockNotifications.map(n => ({ ...n, readAt: '2025-09-05T09:00:00.000Z' }));
      mockNotificationManager.getUserNotifications.mockResolvedValue({
        success: true,
        notifications: readNotifications,
        totalCount: 3,
      });

      render(<NotificationCenter userId="1" />);
      
      await waitFor(() => {
        const badge = screen.queryByTestId('notification-badge');
        expect(badge).not.toBeInTheDocument();
      });
    });

    test('should handle bell icon click to toggle dropdown', async () => {
      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      
      // Initially dropdown should be closed
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      
      // Click to open
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Click again to close
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });
  });

  describe('🔴 RED: Dropdown Tests', () => {
    test('should render notification list when dropdown is open', async () => {
      render(<NotificationCenter userId="1" />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockNotificationManager.getUserNotifications).toHaveBeenCalled();
      });
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
        expect(screen.getAllByTestId(/^notification-item-/)).toHaveLength(3);
      });
    });

    test('should display notification items with correct content', async () => {
      render(<NotificationCenter userId="1" />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockNotificationManager.getUserNotifications).toHaveBeenCalled();
      });
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        expect(screen.getByText('출근 알림')).toBeInTheDocument();
        expect(screen.getByText('김철수님이 출근했습니다.')).toBeInTheDocument();
        expect(screen.getByText('역할 변경')).toBeInTheDocument();
        expect(screen.getByText('시스템 공지')).toBeInTheDocument();
      });
    });

    test('should show empty state when no notifications', async () => {
      mockNotificationManager.getUserNotifications.mockResolvedValue({
        success: true,
        notifications: [],
        totalCount: 0,
      });

      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-empty-state')).toBeInTheDocument();
        expect(screen.getByText('알림이 없습니다')).toBeInTheDocument();
      });
    });

    test('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <div data-testid="outside-element">Outside</div>
          <NotificationCenter userId="1" />
        </div>
      );
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Click outside
      const outsideElement = screen.getByTestId('outside-element');
      await act(async () => {
        fireEvent.mouseDown(outsideElement);
      });
      
      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });
  });

  describe('🔴 RED: Notification Types and Icons Tests', () => {
    test('should display correct icon for each notification type', async () => {
      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        // Check for attendance check-in icon
        const attendanceIcon = screen.getByTestId('notification-icon-ATTENDANCE_CHECK_IN');
        expect(attendanceIcon).toBeInTheDocument();
        
        // Check for role change icon
        const roleIcon = screen.getByTestId('notification-icon-ROLE_CHANGED');
        expect(roleIcon).toBeInTheDocument();
        
        // Check for system announcement icon
        const systemIcon = screen.getByTestId('notification-icon-SYSTEM_ANNOUNCEMENT');
        expect(systemIcon).toBeInTheDocument();
      });
    });

    test('should display priority indicators correctly', async () => {
      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        const urgentNotification = screen.getByTestId('notification-item-3');
        expect(urgentNotification).toHaveClass('notification-priority-urgent');
        
        const highNotification = screen.getByTestId('notification-item-2');
        expect(highNotification).toHaveClass('notification-priority-high');
        
        const lowNotification = screen.getByTestId('notification-item-1');
        expect(lowNotification).toHaveClass('notification-priority-low');
      });
    });

    test('should distinguish read and unread notifications visually', async () => {
      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        // Unread notifications should have unread styling
        const unreadNotification = screen.getByTestId('notification-item-1');
        expect(unreadNotification).toHaveClass('notification-unread');
        
        // Read notifications should have read styling
        const readNotification = screen.getByTestId('notification-item-2');
        expect(readNotification).toHaveClass('notification-read');
      });
    });
  });

  describe('🔴 RED: Click Handling Tests', () => {
    test('should mark notification as read when clicked', async () => {
      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        const unreadNotification = screen.getByTestId('notification-item-1');
        fireEvent.click(unreadNotification);
      });
      
      await waitFor(() => {
        expect(mockNotificationManager.markAsRead).toHaveBeenCalledWith('1', '1');
      });
    });

    test('should handle notification click with callback', async () => {
      const onNotificationClick = jest.fn();
      
      render(<NotificationCenter userId="1" onNotificationClick={onNotificationClick} />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        const notification = screen.getByTestId('notification-item-1');
        fireEvent.click(notification);
      });
      
      await waitFor(() => {
        expect(onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
      });
    });
  });

  describe('🔴 RED: Pagination Tests', () => {
    test('should load more notifications when scrolling to bottom', async () => {
      // Mock API to return more data on subsequent calls
      mockNotificationManager.getUserNotifications
        .mockResolvedValueOnce({
          success: true,
          notifications: mockNotifications,
          totalCount: 10,
        })
        .mockResolvedValueOnce({
          success: true,
          notifications: [
            {
              id: '4',
              type: NotificationType.ATTENDANCE_CHECK_OUT,
              title: '퇴근 알림',
              message: '김철수님이 퇴근했습니다.',
              data: {},
              priority: NotificationPriority.LOW,
              createdAt: '2025-09-05T18:00:00.000Z',
              createdBy: '1',
            },
          ],
          totalCount: 10,
        });

      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        const notificationList = screen.getByTestId('notification-list');
        expect(notificationList).toBeInTheDocument();
      });
      
      // Scroll to bottom to trigger load more
      const notificationList = screen.getByTestId('notification-list');
      await act(async () => {
        fireEvent.scroll(notificationList, { target: { scrollTop: 1000 } });
      });
      
      await waitFor(() => {
        expect(mockNotificationManager.getUserNotifications).toHaveBeenCalledTimes(2);
        expect(screen.getByText('퇴근 알림')).toBeInTheDocument();
      });
    });

    test('should show loading indicator while fetching more notifications', async () => {
      const slowResponse = new Promise((resolve) => {
        setTimeout(() => resolve({
          success: true,
          notifications: [],
          totalCount: 3,
        }), 100);
      });
      
      mockNotificationManager.getUserNotifications.mockReturnValue(slowResponse);

      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      // Should show loading
      expect(screen.getByTestId('notifications-loading')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByTestId('notifications-loading')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('🔴 RED: Accessibility Tests', () => {
    test('should have proper ARIA attributes', async () => {
      render(<NotificationCenter userId="1" />);
      
      const bellButton = screen.getByTestId('notification-bell');
      expect(bellButton).toHaveAttribute('aria-label', 'Open notifications');
      expect(bellButton).toHaveAttribute('aria-expanded', 'false');
      
      await act(async () => {
        fireEvent.click(bellButton);
      });
      
      await waitFor(() => {
        expect(bellButton).toHaveAttribute('aria-expanded', 'true');
        
        const dropdown = screen.getByTestId('notification-dropdown');
        expect(dropdown).toHaveAttribute('role', 'menu');
        expect(dropdown).toHaveAttribute('aria-label', 'Notifications');
      });
    });

    test('should support keyboard navigation', async () => {
      render(<NotificationCenter userId="1" />);
      
      const bellButton = screen.getByTestId('notification-bell');
      
      // Open with Enter key
      await act(async () => {
        fireEvent.keyDown(bellButton, { key: 'Enter', code: 'Enter' });
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Close with Escape key
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      });
      
      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });

    test('should navigate through notifications with arrow keys', async () => {
      render(<NotificationCenter userId="1" />);
      
      const bellButton = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellButton);
      });
      
      await waitFor(() => {
        const firstNotification = screen.getByTestId('notification-item-1');
        expect(firstNotification).toHaveAttribute('tabindex', '0');
      });
      
      // Navigate with arrow keys
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });
      });
      
      await waitFor(() => {
        const secondNotification = screen.getByTestId('notification-item-2');
        expect(secondNotification).toHaveAttribute('tabindex', '0');
      });
    });
  });

  describe('🔴 RED: Error Handling Tests', () => {
    test('should handle API errors gracefully', async () => {
      mockNotificationManager.getUserNotifications.mockRejectedValue(
        new Error('Network error')
      );

      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-error')).toBeInTheDocument();
        expect(screen.getByText(/알림을 불러오는데 실패했습니다/)).toBeInTheDocument();
      });
    });

    test('should retry loading notifications on error', async () => {
      mockNotificationManager.getUserNotifications
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          notifications: mockNotifications,
          totalCount: 3,
        });

      render(<NotificationCenter userId="1" />);
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        const retryButton = screen.getByTestId('notifications-retry');
        expect(retryButton).toBeInTheDocument();
      });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('notifications-retry'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
        expect(mockNotificationManager.getUserNotifications).toHaveBeenCalledTimes(2);
      });
    });
  });
});