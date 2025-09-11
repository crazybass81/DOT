'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  duration?: number;
  timestamp: Date;
  isRead: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    style?: 'primary' | 'secondary';
  }>;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  showSuccess: (title: string, message: string, actions?: Notification['actions']) => void;
  showError: (title: string, message: string, actions?: Notification['actions']) => void;
  showWarning: (title: string, message: string, actions?: Notification['actions']) => void;
  showInfo: (title: string, message: string, actions?: Notification['actions']) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  setNotificationSystem: (ref: any) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    // Fallback implementation when used outside provider
    return {
      notifications: [],
      showNotification: () => {},
      showSuccess: () => {},
      showError: () => {},
      showWarning: () => {},
      showInfo: () => {},
      removeNotification: () => {},
      markAsRead: () => {},
      clearAll: () => {},
      setNotificationSystem: () => {}
    };
  }
  return context;
};

interface NotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  maxNotifications?: number;
  defaultDuration?: number;
  enableSounds?: boolean;
  children?: React.ReactNode;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationSystem, setNotificationSystem] = useState<any>(null);

  const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const showNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
      isRead: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50 notifications
    
    // Auto-remove after duration
    if (notification.duration !== 0) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, duration);
    }
  }, []);

  const showSuccess = useCallback((title: string, message: string, actions?: Notification['actions']) => {
    showNotification({
      type: 'success',
      title,
      message,
      priority: 'normal',
      actions
    });
  }, [showNotification]);

  const showError = useCallback((title: string, message: string, actions?: Notification['actions']) => {
    showNotification({
      type: 'error',
      title,
      message,
      priority: 'high',
      duration: 0, // Don't auto-remove error notifications
      actions
    });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string, actions?: Notification['actions']) => {
    showNotification({
      type: 'warning',
      title,
      message,
      priority: 'normal',
      actions
    });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string, actions?: Notification['actions']) => {
    showNotification({
      type: 'info',
      title,
      message,
      priority: 'low',
      actions
    });
  }, [showNotification]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    markAsRead,
    clearAll,
    setNotificationSystem
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export default function NotificationSystem({
  position = 'top-right',
  maxNotifications = 5,
  defaultDuration = 5000,
  enableSounds = true
}: NotificationSystemProps) {
  const {
    notifications,
    removeNotification,
    markAsRead,
    clearAll
  } = useNotifications();

  const [soundsEnabled, setSoundsEnabled] = useState(enableSounds);

  useEffect(() => {
    // Play sound for new notifications
    if (soundsEnabled && notifications.length > 0) {
      const latestNotification = notifications[0];
      if (!latestNotification.isRead) {
        playNotificationSound(latestNotification.type);
      }
    }
  }, [notifications, soundsEnabled]);

  const playNotificationSound = (type: Notification['type']) => {
    try {
      const audio = new Audio();
      switch (type) {
        case 'success':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+nYxmpjGgU4jdbm06oUF1up6OKqWBQNTabq6n1kJQhEjs/f3HYjBSyLyNe0lm0iCCOI2fi1iDMJKHe/7Ml9KgU+ltntxoM8CzKe4fm8llg...'; // Base64 encoded notification sound
          break;
        case 'error':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+nYxmpjGgU4jdbm06oUF1up6OKqWBQNTabq6n1kJQhEjs/f3HYjBSyLyNe0lm0iCCOI2fi1iDMJKHe/7Ml9KgU+ltntxoM8CzKe4fm8llg...';
          break;
        default:
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+nYxmpjGgU4jdbm06oUF1up6OKqWBQNTabq6n1kJQhEjs/f3HYjBSyLyNe0lm0iCCOI2fi1iDMJKHe/7Ml9KgU+ltntxoM8CzKe4fm8llg...';
      }
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore errors if audio can't play
    } catch (error) {
      // Silently ignore audio errors
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getNotificationClasses = (type: Notification['type']) => {
    const baseClasses = 'mb-4 max-w-sm w-full bg-white rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden';
    
    switch (type) {
      case 'success':
        return `${baseClasses} border-l-4 border-green-500`;
      case 'error':
        return `${baseClasses} border-l-4 border-red-500`;
      case 'warning':
        return `${baseClasses} border-l-4 border-yellow-500`;
      case 'info':
        return `${baseClasses} border-l-4 border-blue-500`;
      default:
        return `${baseClasses} border-l-4 border-gray-500`;
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  const visibleNotifications = notifications.slice(0, maxNotifications);
  const hiddenCount = notifications.length - maxNotifications;

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Main notification display */}
      <div className={`fixed ${getPositionClasses()} z-50 space-y-4`}>
        {visibleNotifications.map((notification) => (
          <div
            key={notification.id}
            className={getNotificationClasses(notification.type)}
            style={{
              animation: 'slideInRight 0.3s ease-out'
            }}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-lg">{getIcon(notification.type)}</span>
                </div>
                <div className="ml-3 w-0 flex-1">
                  {notification.title && (
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                  )}
                  <p className={`text-sm text-gray-600 ${notification.title ? 'mt-1' : ''}`}>
                    {notification.message}
                  </p>
                  {notification.actions && notification.actions.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {notification.actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            action.onClick();
                            removeNotification(notification.id);
                          }}
                          className={`px-3 py-1 text-xs font-medium rounded ${
                            action.style === 'primary'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <span className="sr-only">닫기</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {hiddenCount > 0 && (
          <div className="max-w-sm w-full bg-gray-800 text-white rounded-lg shadow-lg p-3 text-center">
            <p className="text-sm">
              +{hiddenCount}개의 추가 알림
            </p>
            <button
              onClick={clearAll}
              className="text-xs text-gray-300 hover:text-white mt-1"
            >
              모두 지우기
            </button>
          </div>
        )}
      </div>

      {/* Sound toggle button */}
      <button
        onClick={() => setSoundsEnabled(!soundsEnabled)}
        className="fixed bottom-4 left-4 z-40 p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title={soundsEnabled ? '알림 소리 끄기' : '알림 소리 켜기'}
      >
        {soundsEnabled ? '🔊' : '🔇'}
      </button>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}