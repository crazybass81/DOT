import { useEffect, useCallback } from 'react';
import { useToast } from '@/components/notifications/Toast';
import { realtimeManager, RealtimeNotification } from '@/lib/realtime';

/**
 * Hook for integrating toast notifications with WebSocket real-time updates
 * Automatically handles attendance and approval notifications from WebSocket
 */
export const useToastNotifications = (
  userId?: string,
  organizationId?: string,
  options: {
    enableRealtimeIntegration?: boolean;
    enableSounds?: boolean;
    debounceMs?: number;
  } = {}
) => {
  const {
    enableRealtimeIntegration = true,
    enableSounds = true,
    debounceMs = 300
  } = options;

  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
    clearAll,
    removeToast,
    getToasts
  } = useToast();

  // WebSocket notification handler
  const handleRealtimeNotification = useCallback((notification: RealtimeNotification) => {
    showNotification(notification);
    
    // Play sound if enabled
    if (enableSounds) {
      playNotificationSound(notification.priority);
    }
  }, [showNotification, enableSounds]);

  // Setup WebSocket integration
  useEffect(() => {
    if (!enableRealtimeIntegration || !userId) {
      return;
    }

    // Subscribe to user notifications
    const notificationChannelId = realtimeManager.subscribeToNotifications(
      userId,
      handleRealtimeNotification
    );

    // Subscribe to attendance updates if organization is provided
    let attendanceChannelId: string | undefined;
    let approvalChannelId: string | undefined;

    if (organizationId) {
      attendanceChannelId = realtimeManager.subscribeToAttendance(
        organizationId,
        (event) => {
          const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
            type: 'attendance_update',
            title: 'Attendance Update',
            message: `Employee ${event.record?.employee_name || 'Unknown'} ${
              event.type === 'INSERT' ? 'checked in' : 
              event.type === 'UPDATE' ? 'updated attendance' : 'deleted record'
            }`,
            priority: event.type === 'DELETE' ? 'high' : 'medium',
            data: event
          };
          
          showNotification({
            ...notification,
            id: `att_${Date.now()}`,
            timestamp: new Date()
          });
        },
        { debounceMs }
      );

      approvalChannelId = realtimeManager.subscribeToApprovals(
        organizationId,
        (event) => {
          const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
            type: 'approval_update',
            title: 'Approval Update',
            message: `Employee ${event.record?.name || 'Unknown'} approval status: ${
              event.record?.approval_status || 'updated'
            }`,
            priority: event.record?.approval_status === 'rejected' ? 'high' : 'medium',
            data: event
          };
          
          showNotification({
            ...notification,
            id: `app_${Date.now()}`,
            timestamp: new Date()
          });
        },
        { debounceMs }
      );
    }

    // Cleanup function
    return () => {
      realtimeManager.unsubscribe(notificationChannelId);
      if (attendanceChannelId) {
        realtimeManager.unsubscribe(attendanceChannelId);
      }
      if (approvalChannelId) {
        realtimeManager.unsubscribe(approvalChannelId);
      }
    };
  }, [
    userId,
    organizationId,
    enableRealtimeIntegration,
    debounceMs,
    handleRealtimeNotification,
    showNotification
  ]);

  // Helper functions for common notification types
  const showAttendanceSuccess = useCallback((employeeName: string, action: 'check-in' | 'check-out') => {
    showSuccess(
      'Attendance Recorded',
      `${employeeName} successfully ${action === 'check-in' ? 'checked in' : 'checked out'}`
    );
  }, [showSuccess]);

  const showAttendanceError = useCallback((employeeName: string, reason: string) => {
    showError(
      'Attendance Error',
      `Failed to record attendance for ${employeeName}: ${reason}`
    );
  }, [showError]);

  const showApprovalUpdate = useCallback((employeeName: string, status: 'approved' | 'rejected' | 'pending') => {
    const type = status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info';
    const show = status === 'approved' ? showSuccess : status === 'rejected' ? showError : showInfo;
    
    show(
      'Employee Status Update',
      `${employeeName} has been ${status}`
    );
  }, [showSuccess, showError, showInfo]);

  const showSystemMessage = useCallback((message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const show = type === 'warning' ? showWarning : type === 'error' ? showError : showInfo;
    show('System Notification', message);
  }, [showInfo, showWarning, showError]);

  return {
    // Basic toast methods
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
    clearAll,
    removeToast,
    getToasts,
    
    // Attendance-specific helpers
    showAttendanceSuccess,
    showAttendanceError,
    showApprovalUpdate,
    showSystemMessage,
    
    // WebSocket integration status
    isRealtimeConnected: enableRealtimeIntegration && !!userId
  };
};

// Sound utility function
const playNotificationSound = (priority: 'low' | 'medium' | 'high') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies and durations for different priorities
    const config = {
      low: { frequency: 400, duration: 200 },
      medium: { frequency: 600, duration: 300 },
      high: { frequency: 800, duration: 500 }
    };

    const { frequency, duration } = config[priority];

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
};