import React, { useEffect } from 'react';
import { ToastProvider, useToast } from './Toast';
import { useToastNotifications } from '@/hooks/useToastNotifications';
import { NotificationSystem } from './NotificationSystem';
import { NotificationCenter } from './NotificationCenter';
import { NotificationMessage } from '@/lib/notification-manager';

interface EnhancedNotificationSystemProps {
  userId?: string;
  organizationId?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
  enableSounds?: boolean;
  enableRealtimeIntegration?: boolean;
  enableLegacyNotifications?: boolean;
  enableNotificationCenter?: boolean;
  onNotificationCenterClick?: (notification: NotificationMessage) => void;
  className?: string;
}

/**
 * Enhanced notification system that combines both Toast notifications and legacy NotificationSystem
 * Provides seamless WebSocket integration and backward compatibility
 */
export const EnhancedNotificationSystem: React.FC<EnhancedNotificationSystemProps> = ({
  userId,
  organizationId,
  position = 'top-right',
  maxToasts = 5,
  enableSounds = true,
  enableRealtimeIntegration = true,
  enableLegacyNotifications = false,
  className
}) => {
  return (
    <ToastProvider 
      position={position} 
      maxToasts={maxToasts}
      defaultDuration={5000}
    >
      <NotificationIntegrator
        userId={userId}
        organizationId={organizationId}
        enableSounds={enableSounds}
        enableRealtimeIntegration={enableRealtimeIntegration}
      />
      
      {/* Legacy notification system if needed */}
      {enableLegacyNotifications && (
        <NotificationSystem
          position={position}
          maxNotifications={maxToasts}
          enableSounds={enableSounds}
          className={className}
        />
      )}
    </ToastProvider>
  );
};

// Internal component to handle WebSocket integration
const NotificationIntegrator: React.FC<{
  userId?: string;
  organizationId?: string;
  enableSounds: boolean;
  enableRealtimeIntegration: boolean;
}> = ({ userId, organizationId, enableSounds, enableRealtimeIntegration }) => {
  // Initialize toast notifications with WebSocket integration
  const {
    showAttendanceSuccess,
    showAttendanceError,
    showApprovalUpdate,
    showSystemMessage,
    isRealtimeConnected
  } = useToastNotifications(userId, organizationId, {
    enableRealtimeIntegration,
    enableSounds,
    debounceMs: 300
  });

  // Log connection status
  useEffect(() => {
    if (isRealtimeConnected) {
      console.log('[Enhanced Notifications] WebSocket integration enabled');
      showSystemMessage('Real-time notifications connected', 'info');
    }
  }, [isRealtimeConnected, showSystemMessage]);

  // Expose notification methods globally for backward compatibility
  useEffect(() => {
    (window as any).notificationHelpers = {
      showAttendanceSuccess,
      showAttendanceError,
      showApprovalUpdate,
      showSystemMessage
    };

    return () => {
      delete (window as any).notificationHelpers;
    };
  }, [showAttendanceSuccess, showAttendanceError, showApprovalUpdate, showSystemMessage]);

  return null;
};

export default EnhancedNotificationSystem;