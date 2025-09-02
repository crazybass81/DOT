/**
 * Realtime Integration Utilities
 * 
 * This file provides utility functions to integrate Supabase Realtime
 * with the existing attendance system architecture.
 */

import { realtimeManager, RealtimeNotification } from './realtime';
import { supabase } from './supabase-config';

// Integration with existing authentication system
export const initializeRealtimeForUser = async (userId: string, organizationId: string) => {
  try {
    // Check if user is authenticated with Supabase
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.warn('[Realtime] User not authenticated with Supabase, using anonymous connection');
    }

    // Subscribe to user-specific notifications
    const notificationChannelId = realtimeManager.subscribeToNotifications(
      userId,
      (notification: RealtimeNotification) => {
        console.log('[Realtime] User notification received:', notification);
        
        // Emit global notification event for UI components to listen
        window.dispatchEvent(new CustomEvent('realtime-notification', {
          detail: notification
        }));
      }
    );

    console.log('[Realtime] Initialized realtime for user:', userId);
    return { notificationChannelId };
  } catch (error) {
    console.error('[Realtime] Failed to initialize realtime for user:', error);
    return null;
  }
};

// Cleanup realtime connections on logout
export const cleanupRealtimeForUser = () => {
  try {
    realtimeManager.cleanup();
    console.log('[Realtime] Cleaned up realtime connections');
  } catch (error) {
    console.error('[Realtime] Error during cleanup:', error);
  }
};

// Send admin notification to specific user
export const sendAdminNotification = async (
  targetUserId: string,
  title: string,
  message: string,
  priority: 'low' | 'medium' | 'high' = 'medium',
  data?: any
) => {
  try {
    const notification: Omit<RealtimeNotification, 'id' | 'timestamp'> = {
      type: 'system_update',
      title,
      message,
      priority,
      data
    };

    const success = await realtimeManager.sendNotification(targetUserId, notification);
    
    if (success) {
      console.log('[Realtime] Admin notification sent to user:', targetUserId);
    } else {
      console.warn('[Realtime] Failed to send admin notification');
    }

    return success;
  } catch (error) {
    console.error('[Realtime] Error sending admin notification:', error);
    return false;
  }
};

// Global notification event listener for components
export const addGlobalNotificationListener = (
  callback: (notification: RealtimeNotification) => void
) => {
  const handler = (event: CustomEvent) => {
    callback(event.detail);
  };

  window.addEventListener('realtime-notification', handler as EventListener);

  return () => {
    window.removeEventListener('realtime-notification', handler as EventListener);
  };
};

// Connection state utilities for UI components
export const getRealtimeConnectionInfo = () => {
  return {
    state: realtimeManager.getConnectionState(),
    activeChannels: realtimeManager.getActiveChannels(),
    isHealthy: realtimeManager.getConnectionState() === 'CONNECTED'
  };
};

// Health check function for monitoring
export const performRealtimeHealthCheck = (): Promise<{
  healthy: boolean;
  details: {
    connection: string;
    channels: number;
    lastCheck: string;
  };
}> => {
  return new Promise((resolve) => {
    const connectionState = realtimeManager.getConnectionState();
    const activeChannels = realtimeManager.getActiveChannels();

    const result = {
      healthy: connectionState === 'CONNECTED',
      details: {
        connection: connectionState,
        channels: activeChannels.length,
        lastCheck: new Date().toISOString()
      }
    };

    resolve(result);
  });
};

// Attendance-specific helper functions
export const subscribeToOrganizationAttendance = (
  organizationId: string,
  onUpdate: (event: any) => void,
  options: {
    debounceMs?: number;
    enableNotifications?: boolean;
  } = {}
) => {
  return realtimeManager.subscribeToAttendance(
    organizationId,
    onUpdate,
    options
  );
};

export const subscribeToOrganizationApprovals = (
  organizationId: string,
  onUpdate: (event: any) => void,
  options: {
    debounceMs?: number;
    statusFilter?: string[];
  } = {}
) => {
  return realtimeManager.subscribeToApprovals(
    organizationId,
    onUpdate,
    options
  );
};

// Batch operations for admin actions
export const batchApprovalNotifications = async (
  approvals: Array<{
    userId: string;
    employeeName: string;
    status: 'approved' | 'rejected';
    reason?: string;
  }>
) => {
  const notifications = approvals.map(approval => ({
    userId: approval.userId,
    notification: {
      type: 'approval_update' as const,
      title: '승인 상태 변경',
      message: `${approval.employeeName}님이 ${approval.status === 'approved' ? '승인' : '거부'}되었습니다`,
      priority: 'high' as const,
      data: {
        status: approval.status,
        reason: approval.reason
      }
    }
  }));

  const results = await Promise.allSettled(
    notifications.map(({ userId, notification }) => 
      realtimeManager.sendNotification(userId, notification)
    )
  );

  const successful = results.filter(result => 
    result.status === 'fulfilled' && result.value
  ).length;

  console.log(`[Realtime] Sent ${successful}/${notifications.length} batch approval notifications`);
  
  return {
    total: notifications.length,
    successful,
    failed: notifications.length - successful
  };
};

// Error recovery utilities
export const recoverFromConnectionError = async (
  organizationId: string,
  subscriptions: Array<{
    type: 'attendance' | 'approvals';
    callback: Function;
    options?: any;
  }>
) => {
  try {
    console.log('[Realtime] Attempting connection recovery...');
    
    // Clear all existing subscriptions
    realtimeManager.unsubscribeAll();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Re-establish subscriptions
    const newChannelIds = subscriptions.map(sub => {
      if (sub.type === 'attendance') {
        return realtimeManager.subscribeToAttendance(
          organizationId,
          sub.callback,
          sub.options
        );
      } else {
        return realtimeManager.subscribeToApprovals(
          organizationId,
          sub.callback,
          sub.options
        );
      }
    });

    console.log('[Realtime] Connection recovery completed, new channels:', newChannelIds);
    return newChannelIds;
  } catch (error) {
    console.error('[Realtime] Connection recovery failed:', error);
    throw error;
  }
};

// Development and debugging utilities
export const debugRealtimeState = () => {
  if (process.env.NODE_ENV !== 'development') return;

  console.group('[Realtime Debug]');
  console.log('Connection State:', realtimeManager.getConnectionState());
  console.log('Active Channels:', realtimeManager.getActiveChannels());
  console.log('Supabase Client:', supabase);
  console.groupEnd();
};

// Middleware for logging realtime events
export const logRealtimeEvent = (event: any, context: string) => {
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_REALTIME) {
    console.log(`[Realtime ${context}]`, {
      timestamp: new Date().toISOString(),
      event,
      connectionState: realtimeManager.getConnectionState()
    });
  }
};

export default {
  initializeRealtimeForUser,
  cleanupRealtimeForUser,
  sendAdminNotification,
  addGlobalNotificationListener,
  getRealtimeConnectionInfo,
  performRealtimeHealthCheck,
  subscribeToOrganizationAttendance,
  subscribeToOrganizationApprovals,
  batchApprovalNotifications,
  recoverFromConnectionError,
  debugRealtimeState,
  logRealtimeEvent
};