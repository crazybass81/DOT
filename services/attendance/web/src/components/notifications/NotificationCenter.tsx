import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, AlertCircle, CheckCircle, Clock, Settings, Users, Megaphone } from 'lucide-react';
import { notificationManager, NotificationMessage, NotificationType, NotificationPriority } from '@/lib/notification-manager';

// Notification Center Props
interface NotificationCenterProps {
  userId: string;
  organizationId?: string;
  maxNotifications?: number;
  onNotificationClick?: (notification: NotificationMessage) => void;
  className?: string;
}

// Individual notification item props
interface NotificationItemProps {
  notification: NotificationMessage;
  onClick: (notification: NotificationMessage) => void;
  isRead: boolean;
}

// Notification type to icon mapping
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.ATTENDANCE_CHECK_IN:
    case NotificationType.ATTENDANCE_CHECK_OUT:
      return <Clock className="w-4 h-4" />;
    case NotificationType.ROLE_CHANGED:
    case NotificationType.ROLE_ASSIGNED:
      return <Settings className="w-4 h-4" />;
    case NotificationType.ORGANIZATION_INVITED:
    case NotificationType.ORGANIZATION_APPROVED:
      return <Users className="w-4 h-4" />;
    case NotificationType.SYSTEM_ANNOUNCEMENT:
    case NotificationType.ORGANIZATION_ANNOUNCEMENT:
      return <Megaphone className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

// Get priority classes
const getPriorityClasses = (priority: NotificationPriority) => {
  switch (priority) {
    case NotificationPriority.URGENT:
      return 'notification-priority-urgent border-l-4 border-red-500 bg-red-50';
    case NotificationPriority.HIGH:
      return 'notification-priority-high border-l-4 border-orange-500 bg-orange-50';
    case NotificationPriority.MEDIUM:
      return 'notification-priority-medium border-l-4 border-yellow-500 bg-yellow-50';
    case NotificationPriority.LOW:
    default:
      return 'notification-priority-low border-l-4 border-blue-500 bg-blue-50';
  }
};

// Format relative time
const formatRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric'
  });
};

// Individual notification item component
const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onClick, 
  isRead 
}) => {
  const handleClick = () => {
    onClick(notification);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(notification);
    }
  };

  return (
    <div
      data-testid={`notification-item-${notification.id}`}
      className={`
        p-4 cursor-pointer transition-colors duration-200 hover:bg-gray-100
        ${getPriorityClasses(notification.priority)}
        ${isRead ? 'notification-read opacity-75' : 'notification-unread'}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="menuitem"
      tabIndex={0}
    >
      <div className="flex items-start space-x-3">
        <div 
          data-testid={`notification-icon-${notification.type}`}
          className="flex-shrink-0 mt-1"
        >
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {notification.title}
            </h4>
            {!isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
            )}
          </div>
          
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          <p className="text-xs text-gray-500 mt-2">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Main Notification Center Component
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  organizationId,
  maxNotifications = 20,
  onNotificationClick,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Load notifications
  const loadNotifications = useCallback(async (reset = false) => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      const result = await notificationManager.getUserNotifications(userId, {
        limit: maxNotifications,
        offset: currentOffset,
        organizationId
      });

      if (result.success && result.notifications) {
        if (reset) {
          setNotifications(result.notifications);
          setOffset(result.notifications.length);
        } else {
          setNotifications(prev => [...prev, ...result.notifications!]);
          setOffset(prev => prev + result.notifications!.length);
        }

        // Calculate unread count only from new notifications
        const unread = result.notifications.filter(n => !n.readAt && !readNotifications.has(n.id!));
        if (reset) {
          setUnreadCount(unread.length);
        } else {
          setUnreadCount(prev => prev + unread.length);
        }

        // Check if there are more notifications
        setHasMore(result.notifications.length === maxNotifications);
      } else {
        throw new Error(result.error || 'Failed to load notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, organizationId, maxNotifications, offset, readNotifications]);

  // Load notifications when component mounts
  useEffect(() => {
    if (userId) {
      loadNotifications(true);
    }
  }, [userId]);

  // Load notifications when dropdown opens and no data
  useEffect(() => {
    if (isOpen && notifications.length === 0 && !isLoading) {
      loadNotifications(true);
    }
  }, [isOpen, notifications.length, isLoading]);

  // Handle notification click
  const handleNotificationClick = async (notification: NotificationMessage) => {
    if (!notification.readAt && !readNotifications.has(notification.id!)) {
      // Mark as read locally first for immediate feedback
      setReadNotifications(prev => new Set([...prev, notification.id!]));
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Mark as read in the database
      try {
        await notificationManager.markAsRead(notification.id!, userId);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        // Revert local changes on error
        setReadNotifications(prev => {
          const newSet = new Set(prev);
          newSet.delete(notification.id!);
          return newSet;
        });
        setUnreadCount(prev => prev + 1);
      }
    }

    // Call the provided callback
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  // Handle bell icon click
  const handleBellClick = () => {
    setIsOpen(prev => !prev);
  };

  // Handle keyboard events
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleBellClick();
    }
  };

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        bellRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        bellRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle scroll for infinite loading
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10;

    if (isScrolledToBottom && !isLoading && hasMore) {
      loadNotifications(false);
    }
  };

  // Retry function for error state
  const handleRetry = () => {
    loadNotifications(true);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Icon Button */}
      <button
        ref={bellRef}
        data-testid="notification-bell"
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md transition-colors"
        onClick={handleBellClick}
        onKeyDown={handleKeyDown}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-6 h-6" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          data-testid="notification-dropdown"
          className="absolute right-0 mt-2 w-80 max-h-96 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 overflow-hidden"
          role="menu"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">알림</h3>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount}개의 읽지 않은 알림
              </p>
            )}
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto" onScroll={handleScroll}>
            {isLoading && notifications.length === 0 ? (
              <div 
                data-testid="notifications-loading" 
                className="flex items-center justify-center py-8"
              >
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">로딩 중...</span>
              </div>
            ) : error ? (
              <div 
                data-testid="notifications-error" 
                className="p-4 text-center"
              >
                <p className="text-red-600 mb-2">알림을 불러오는데 실패했습니다</p>
                <button
                  data-testid="notifications-retry"
                  onClick={handleRetry}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  다시 시도
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div 
                data-testid="notifications-empty-state" 
                className="p-8 text-center text-gray-500"
              >
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>알림이 없습니다</p>
              </div>
            ) : (
              <div data-testid="notification-list">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                    isRead={!!notification.readAt || readNotifications.has(notification.id!)}
                  />
                ))}
                
                {/* Loading indicator for infinite scroll */}
                {isLoading && notifications.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-sm text-gray-600">더 불러오는 중...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;