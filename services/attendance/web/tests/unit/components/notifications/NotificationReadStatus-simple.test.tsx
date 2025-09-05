import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import userEvent from '@testing-library/user-event';

// 테스트용 간단한 NotificationCenter 컴포넌트
interface SimpleNotificationCenterProps {
  notifications: any[];
  onNotificationClick?: (id: string) => void;
  onMarkAllRead?: () => void;
}

const SimpleNotificationCenter: React.FC<SimpleNotificationCenterProps> = ({
  notifications,
  onNotificationClick,
  onMarkAllRead,
}) => {
  const [readNotifications, setReadNotifications] = React.useState<Set<string>>(new Set());
  
  const unreadCount = notifications.filter(n => !n.readAt && !readNotifications.has(n.id)).length;
  const canMarkAllAsRead = unreadCount > 0;

  const handleNotificationClick = (notification: any) => {
    if (!notification.readAt && !readNotifications.has(notification.id)) {
      setReadNotifications(prev => new Set([...prev, notification.id]));
      onNotificationClick?.(notification.id);
    }
  };

  const handleMarkAllRead = () => {
    const unreadIds = notifications
      .filter(n => !n.readAt && !readNotifications.has(n.id))
      .map(n => n.id);
    
    setReadNotifications(prev => {
      const newSet = new Set(prev);
      unreadIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    onMarkAllRead?.();
  };

  return (
    <div>
      <button data-testid="notification-bell">
        Bell
        {unreadCount > 0 && (
          <span data-testid="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      <div data-testid="notification-dropdown">
        <div>
          <h3>알림</h3>
          {canMarkAllAsRead && (
            <button
              data-testid="mark-all-read-button"
              onClick={handleMarkAllRead}
              disabled={!canMarkAllAsRead}
            >
              모두 읽음
            </button>
          )}
        </div>
        
        <div data-testid="notification-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              data-testid={`notification-item-${notification.id}`}
              className={
                notification.readAt || readNotifications.has(notification.id)
                  ? 'notification-read opacity-75'
                  : 'notification-unread'
              }
              onClick={() => handleNotificationClick(notification)}
            >
              <div>
                <h4>{notification.title}</h4>
                {!notification.readAt && !readNotifications.has(notification.id) && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

describe('읽음/안읽음 상태 관리 - 단순화된 테스트', () => {
  const mockNotifications = [
    {
      id: 'notif-1',
      title: '출근 알림',
      message: '홍길동님이 출근했습니다.',
      readAt: null, // 읽지 않음
    },
    {
      id: 'notif-2',
      title: '역할 변경',
      message: '관리자 권한이 부여되었습니다.',
      readAt: '2024-01-15T08:30:00Z', // 이미 읽음
    },
    {
      id: 'notif-3',
      title: '시스템 공지',
      message: '시스템 점검 예정입니다.',
      readAt: null, // 읽지 않음
    }
  ];

  describe('읽지 않은 알림 카운트', () => {
    it('읽지 않은 알림 개수가 정확히 표시되어야 함', () => {
      render(<SimpleNotificationCenter notifications={mockNotifications} />);

      const badge = screen.getByTestId('notification-badge');
      expect(badge).toHaveTextContent('2'); // notif-1, notif-3
    });

    it('99개 이상일 때 "99+"로 표시되어야 함', () => {
      const manyNotifications = Array.from({ length: 100 }, (_, i) => ({
        id: `notif-${i}`,
        title: `알림 ${i}`,
        readAt: null,
      }));

      render(<SimpleNotificationCenter notifications={manyNotifications} />);

      const badge = screen.getByTestId('notification-badge');
      expect(badge).toHaveTextContent('99+');
    });

    it('알림을 읽으면 카운트가 감소해야 함', async () => {
      const user = userEvent.setup();
      
      render(<SimpleNotificationCenter notifications={mockNotifications} />);

      // 초기 카운트 확인
      const badge = screen.getByTestId('notification-badge');
      expect(badge).toHaveTextContent('2');

      // 첫 번째 읽지 않은 알림 클릭
      const unreadNotification = screen.getByTestId('notification-item-notif-1');
      await user.click(unreadNotification);

      // 카운트가 1로 감소
      expect(badge).toHaveTextContent('1');
    });

    it('모든 알림을 읽으면 배지가 사라져야 함', async () => {
      const user = userEvent.setup();
      
      render(<SimpleNotificationCenter notifications={mockNotifications} />);

      // 모두 읽음 버튼 클릭
      const markAllButton = screen.getByTestId('mark-all-read-button');
      await user.click(markAllButton);

      // 배지가 사라짐
      const badge = screen.queryByTestId('notification-badge');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('개별 알림 읽음 처리', () => {
    it('읽지 않은 알림 클릭 시 읽음 상태로 변경되어야 함', async () => {
      const user = userEvent.setup();
      const onNotificationClick = jest.fn();
      
      render(
        <SimpleNotificationCenter 
          notifications={mockNotifications}
          onNotificationClick={onNotificationClick}
        />
      );

      const unreadNotification = screen.getByTestId('notification-item-notif-1');
      
      // 읽지 않은 알림 스타일 확인
      expect(unreadNotification).toHaveClass('notification-unread');
      expect(unreadNotification).not.toHaveClass('notification-read');

      // 알림 클릭
      await user.click(unreadNotification);

      // 콜백 호출 확인
      expect(onNotificationClick).toHaveBeenCalledWith('notif-1');
      
      // UI가 즉시 업데이트됨
      expect(unreadNotification).toHaveClass('notification-read');
      expect(unreadNotification).not.toHaveClass('notification-unread');
    });

    it('이미 읽은 알림 클릭 시 콜백을 호출하지 않아야 함', async () => {
      const user = userEvent.setup();
      const onNotificationClick = jest.fn();
      
      render(
        <SimpleNotificationCenter 
          notifications={mockNotifications}
          onNotificationClick={onNotificationClick}
        />
      );

      const readNotification = screen.getByTestId('notification-item-notif-2');
      
      // 이미 읽은 알림 스타일 확인
      expect(readNotification).toHaveClass('notification-read');

      // 알림 클릭
      await user.click(readNotification);

      // 콜백이 호출되지 않음
      expect(onNotificationClick).not.toHaveBeenCalledWith('notif-2');
    });
  });

  describe('전체 읽음 처리', () => {
    it('모든 읽음 버튼 클릭 시 모든 읽지 않은 알림이 읽음 상태로 변경되어야 함', async () => {
      const user = userEvent.setup();
      const onMarkAllRead = jest.fn();
      
      render(
        <SimpleNotificationCenter 
          notifications={mockNotifications}
          onMarkAllRead={onMarkAllRead}
        />
      );

      const markAllButton = screen.getByTestId('mark-all-read-button');
      await user.click(markAllButton);

      // 콜백 호출 확인
      expect(onMarkAllRead).toHaveBeenCalled();

      // 읽지 않은 알림들이 읽음 상태로 변경됨
      const notification1 = screen.getByTestId('notification-item-notif-1');
      const notification3 = screen.getByTestId('notification-item-notif-3');
      
      expect(notification1).toHaveClass('notification-read');
      expect(notification3).toHaveClass('notification-read');

      // 읽지 않은 알림 카운트가 0이 됨
      const badge = screen.queryByTestId('notification-badge');
      expect(badge).not.toBeInTheDocument();
    });

    it('읽지 않은 알림이 없으면 모든 읽음 버튼이 비활성화되어야 함', () => {
      const allReadNotifications = mockNotifications.map(n => ({
        ...n,
        readAt: '2024-01-15T10:00:00Z'
      }));

      render(<SimpleNotificationCenter notifications={allReadNotifications} />);

      const markAllButton = screen.queryByTestId('mark-all-read-button');
      expect(markAllButton).not.toBeInTheDocument(); // 버튼 자체가 렌더링되지 않음
    });
  });

  describe('UI 상태 반영', () => {
    it('읽지 않은 알림은 파란색 점이 표시되어야 함', () => {
      render(<SimpleNotificationCenter notifications={mockNotifications} />);

      const unreadNotification = screen.getByTestId('notification-item-notif-1');
      
      // 읽지 않은 알림 스타일 확인
      expect(unreadNotification).toHaveClass('notification-unread');
      expect(unreadNotification).not.toHaveClass('opacity-75');

      // 파란색 점 표시 확인
      const unreadDot = unreadNotification.querySelector('.w-2.h-2.bg-blue-500.rounded-full');
      expect(unreadDot).toBeInTheDocument();
    });

    it('읽은 알림은 투명도가 적용되고 파란색 점이 없어야 함', () => {
      render(<SimpleNotificationCenter notifications={mockNotifications} />);

      const readNotification = screen.getByTestId('notification-item-notif-2');

      // 읽은 알림 스타일 확인
      expect(readNotification).toHaveClass('notification-read');
      expect(readNotification).toHaveClass('opacity-75');

      // 파란색 점이 없어야 함
      const unreadDot = readNotification.querySelector('.w-2.h-2.bg-blue-500.rounded-full');
      expect(unreadDot).not.toBeInTheDocument();
    });
  });
});