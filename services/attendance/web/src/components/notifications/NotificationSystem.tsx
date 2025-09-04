import React, { useState, useEffect, useCallback } from 'react';
import { RealtimeNotification } from '@/lib/realtime';

// Notification types
interface ToastNotification extends RealtimeNotification {
  show: boolean;
  autoClose: boolean;
  duration: number;
}

interface NotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  defaultDuration?: number;
  maxNotifications?: number;
  enableSounds?: boolean;
  className?: string;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  position = 'top-right',
  defaultDuration = 5000,
  maxNotifications = 5,
  enableSounds = true,
  className = ''
}) => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  // Add notification
  const addNotification = useCallback((notification: RealtimeNotification) => {
    const duration = notification.priority === 'high' ? 8000 : 
                    notification.priority === 'low' ? 3000 : defaultDuration;

    const toastNotification: ToastNotification = {
      ...notification,
      show: true,
      autoClose: true,
      duration
    };

    setNotifications(prev => {
      const newNotifications = [toastNotification, ...prev].slice(0, maxNotifications);
      return newNotifications;
    });

    // Play notification sound
    if (enableSounds) {
      playNotificationSound(notification.priority);
    }

    // Auto-close notification
    setTimeout(() => {
      removeNotification(notification.id);
    }, duration);
  }, [defaultDuration, maxNotifications, enableSounds]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, show: false } : notif
      ).filter(notif => notif.show || notif.id === id) // Keep for animation
    );

    // Actually remove after animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 300);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Play notification sound based on priority
  const playNotificationSound = useCallback((priority: 'low' | 'medium' | 'high') => {
    try {
      // You can customize these sounds or use actual audio files
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different priorities
      const frequency = priority === 'high' ? 800 : priority === 'medium' ? 600 : 400;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }, []);

  // Get icon based on notification type
  const getNotificationIcon = useCallback((type: string, priority: string) => {
    switch (type) {
      case 'attendance_update':
        return priority === 'high' ? '⚠️' : '👤';
      case 'approval_update':
        return priority === 'high' ? '🔴' : '✅';
      case 'system_update':
        return '🔧';
      default:
        return 'ℹ️';
    }
  }, []);

  // Get notification color classes
  const getNotificationClasses = useCallback((type: string, priority: string) => {
    const baseClasses = 'rounded-lg shadow-lg p-4 mb-3 max-w-sm transition-all duration-300 transform';
    
    if (priority === 'high') {
      return `${baseClasses} bg-red-50 border-l-4 border-red-500`;
    } else if (priority === 'low') {
      return `${baseClasses} bg-gray-50 border-l-4 border-gray-400`;
    } else {
      switch (type) {
        case 'attendance_update':
          return `${baseClasses} bg-blue-50 border-l-4 border-blue-500`;
        case 'approval_update':
          return `${baseClasses} bg-green-50 border-l-4 border-green-500`;
        case 'system_update':
          return `${baseClasses} bg-yellow-50 border-l-4 border-yellow-500`;
        default:
          return `${baseClasses} bg-gray-50 border-l-4 border-gray-400`;
      }
    }
  }, []);

  // Format timestamp
  const formatTime = useCallback((timestamp: Date) => {
    return timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  // Methods are exposed through the component's internal state

  return (
    <>
      {/* Notification Container */}
      <div 
        className={`fixed z-50 ${positionClasses[position]} ${className}`}
        style={{ zIndex: 9999 }}
      >
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`${getNotificationClasses(notification.type, notification.priority)} ${
              notification.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-lg">
                  {getNotificationIcon(notification.type, notification.priority)}
                </span>
              </div>
              
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatTime(notification.timestamp)}
                </p>
              </div>
              
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => removeNotification(notification.id)}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Progress bar for auto-close */}
            {notification.autoClose && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all ease-linear ${
                    notification.priority === 'high' ? 'bg-red-500' : 
                    notification.priority === 'low' ? 'bg-gray-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: '100%',
                    animation: `shrink ${notification.duration}ms linear`
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Clear all button (when there are notifications) */}
      {notifications.length > 1 && (
        <div className={`fixed ${positionClasses[position]} mt-2`} style={{ zIndex: 9998 }}>
          <div style={{ marginTop: `${notifications.length * 100}px` }}>
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-gray-700 underline bg-white px-2 py-1 rounded shadow"
            >
              Clear all ({notifications.length})
            </button>
          </div>
        </div>
      )}

      {/* Keyframes for progress bar animation */}
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </>
  );
};

// Hook for using notifications
export const useNotifications = () => {
  const [notificationSystem, setNotificationSystem] = useState<{
    addNotification: (notification: RealtimeNotification) => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
  } | null>(null);

  const showNotification = useCallback((
    notification: Omit<RealtimeNotification, 'id' | 'timestamp'>
  ) => {
    if (notificationSystem) {
      const fullNotification: RealtimeNotification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };
      notificationSystem.addNotification(fullNotification);
    }
  }, [notificationSystem]);

  const showSuccess = useCallback((title: string, message: string) => {
    showNotification({
      type: 'system_update',
      title,
      message,
      priority: 'low'
    });
  }, [showNotification]);

  const showError = useCallback((title: string, message: string) => {
    showNotification({
      type: 'system_update',
      title,
      message,
      priority: 'high'
    });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string) => {
    showNotification({
      type: 'system_update',
      title,
      message,
      priority: 'medium'
    });
  }, [showNotification]);

  return {
    showNotification,
    showSuccess,
    showError,
    showInfo,
    setNotificationSystem
  };
};

export default NotificationSystem;