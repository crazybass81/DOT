import { supabase } from './supabase-config';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Connection states
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

// Event types for attendance updates
export interface AttendanceRealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'attendance_records' | 'employee_approvals';
  record: any;
  old_record?: any;
}

// Notification types
export interface RealtimeNotification {
  id: string;
  type: 'attendance_update' | 'approval_update' | 'system_update';
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
  priority: 'low' | 'medium' | 'high';
}

// Connection manager class
export class RealtimeConnectionManager {
  private static instance: RealtimeConnectionManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout?: NodeJS.Timeout;
  private heartbeatInterval?: NodeJS.Timeout;
  private listeners: Map<string, Set<Function>> = new Map();

  private constructor() {
    this.setupConnectionHandlers();
    this.startHeartbeat();
  }

  static getInstance(): RealtimeConnectionManager {
    if (!RealtimeConnectionManager.instance) {
      RealtimeConnectionManager.instance = new RealtimeConnectionManager();
    }
    return RealtimeConnectionManager.instance;
  }

  // Setup connection event handlers
  private setupConnectionHandlers() {
    // Note: Supabase Realtime v2 handles connection state internally
    // Connection monitoring is handled through channel states
    this.connectionState = ConnectionState.CONNECTED;
    console.log('[Realtime] Connection handlers initialized');
  }

  // Handle reconnection logic with exponential backoff
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Realtime] Max reconnection attempts reached');
      return;
    }

    this.connectionState = ConnectionState.RECONNECTING;
    this.emit('connectionStateChange', ConnectionState.RECONNECTING);

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectChannels();
    }, delay);
  }

  // Reconnect all existing channels
  private reconnectChannels() {
    console.log('[Realtime] Attempting to reconnect channels');
    
    // Remove old channels
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();

    // Emit reconnect event to allow components to resubscribe
    this.emit('reconnect', null);
  }

  // Start heartbeat to monitor connection
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        // Send a ping to check connection health
        this.ping();
      }
    }, 30000); // Every 30 seconds
  }

  // Send ping to check connection
  private ping() {
    // Implementation depends on your backend setup
    // For now, just log the heartbeat
    console.log('[Realtime] Heartbeat ping');
  }

  // Subscribe to attendance changes
  subscribeToAttendance(
    organizationId: string,
    callback: (event: AttendanceRealtimeEvent) => void,
    options: {
      filter?: string;
      debounceMs?: number;
    } = {}
  ): string {
    const channelId = `attendance_${organizationId}`;
    
    if (this.channels.has(channelId)) {
      console.warn(`[Realtime] Already subscribed to ${channelId}`);
      return channelId;
    }

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const event: AttendanceRealtimeEvent = {
            type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            table: 'attendance_records',
            record: payload.new,
            old_record: payload.old
          };

          // Apply debouncing if specified
          if (options.debounceMs) {
            this.debounceCallback(
              `attendance_${(payload.new as any)?.id || (payload.old as any)?.id}`,
              () => callback(event),
              options.debounceMs
            );
          } else {
            callback(event);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Attendance subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          this.emit('subscribed', channelId);
        }
      });

    this.channels.set(channelId, channel);
    return channelId;
  }

  // Subscribe to approval changes
  subscribeToApprovals(
    organizationId: string,
    callback: (event: AttendanceRealtimeEvent) => void,
    options: {
      filter?: string;
      debounceMs?: number;
    } = {}
  ): string {
    const channelId = `approvals_${organizationId}`;
    
    if (this.channels.has(channelId)) {
      console.warn(`[Realtime] Already subscribed to ${channelId}`);
      return channelId;
    }

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Only emit events for approval status changes
          const newStatus = (payload.new as any)?.approval_status;
          const oldStatus = (payload.old as any)?.approval_status;
          
          if (newStatus !== oldStatus) {
            const event: AttendanceRealtimeEvent = {
              type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              table: 'employee_approvals',
              record: payload.new,
              old_record: payload.old
            };

            // Apply debouncing if specified
            if (options.debounceMs) {
              this.debounceCallback(
                `approval_${payload.new?.id || payload.old?.id}`,
                () => callback(event),
                options.debounceMs
              );
            } else {
              callback(event);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Approvals subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          this.emit('subscribed', channelId);
        }
      });

    this.channels.set(channelId, channel);
    return channelId;
  }

  // Subscribe to custom events (for notifications)
  subscribeToNotifications(
    userId: string,
    callback: (notification: RealtimeNotification) => void
  ): string {
    const channelId = `notifications_${userId}`;
    
    if (this.channels.has(channelId)) {
      console.warn(`[Realtime] Already subscribed to ${channelId}`);
      return channelId;
    }

    const channel = supabase
      .channel(channelId)
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification: RealtimeNotification = {
          id: payload.payload.id,
          type: payload.payload.type,
          title: payload.payload.title,
          message: payload.payload.message,
          timestamp: new Date(payload.payload.timestamp),
          data: payload.payload.data,
          priority: payload.payload.priority || 'medium'
        };
        callback(notification);
      })
      .subscribe((status) => {
        console.log(`[Realtime] Notifications subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          this.emit('subscribed', channelId);
        }
      });

    this.channels.set(channelId, channel);
    return channelId;
  }

  // Unsubscribe from channel
  unsubscribe(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelId);
      console.log(`[Realtime] Unsubscribed from ${channelId}`);
      return true;
    }
    return false;
  }

  // Unsubscribe from all channels
  unsubscribeAll(): void {
    this.channels.forEach((channel, channelId) => {
      supabase.removeChannel(channel);
      console.log(`[Realtime] Unsubscribed from ${channelId}`);
    });
    this.channels.clear();
  }

  // Get connection state
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // Get active channels
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  // Event emitter functionality
  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  // Add event listener
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener);
  }

  // Remove event listener
  off(event: string, listener: Function): void {
    this.listeners.get(event)?.delete(listener);
  }

  // Debouncing utility for high-frequency updates
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  private debounceCallback(key: string, callback: Function, delay: number) {
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  // Send notification to other users (admin only)
  async sendNotification(
    targetUserId: string,
    notification: Omit<RealtimeNotification, 'id' | 'timestamp'>
  ): Promise<boolean> {
    try {
      const channel = supabase.channel(`notifications_${targetUserId}`);
      
      const fullNotification: RealtimeNotification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };

      await channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: fullNotification
      });

      return true;
    } catch (error) {
      console.error('[Realtime] Failed to send notification:', error);
      return false;
    }
  }

  // Cleanup on app unmount
  cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.unsubscribeAll();
    this.listeners.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

// Export singleton instance
export const realtimeManager = RealtimeConnectionManager.getInstance();

// Utility functions
export const formatRealtimeEvent = (event: AttendanceRealtimeEvent): string => {
  const { type, table, record } = event;
  
  switch (table) {
    case 'attendance_records':
      const name = record?.employee_name || 'Unknown Employee';
      const action = record?.check_in_time && !record?.check_out_time ? 'checked in' : 
                    record?.check_out_time ? 'checked out' : 'updated attendance';
      return `${name} ${action}`;
    
    case 'employee_approvals':
      const employeeName = record?.name || 'Unknown Employee';
      const status = record?.approval_status?.toLowerCase() || 'updated';
      return `${employeeName} was ${status}`;
    
    default:
      return `${type.toLowerCase()} in ${table}`;
  }
};

// Default notification generator
export const generateNotificationFromEvent = (
  event: AttendanceRealtimeEvent
): Omit<RealtimeNotification, 'id' | 'timestamp'> => {
  const message = formatRealtimeEvent(event);
  
  return {
    type: event.table === 'attendance_records' ? 'attendance_update' : 'approval_update',
    title: 'Real-time Update',
    message,
    data: event,
    priority: event.type === 'INSERT' ? 'medium' : 'low'
  };
};