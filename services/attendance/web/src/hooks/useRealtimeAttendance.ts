import { useState, useEffect, useCallback, useRef } from 'react';
import {
  realtimeManager,
  AttendanceRealtimeEvent,
  ConnectionState,
  formatRealtimeEvent,
  generateNotificationFromEvent
} from '@/lib/realtime';
import { AttendanceRecord, AttendanceStatus } from '@/lib/database/models/attendance.model';

// Hook configuration options
interface UseRealtimeAttendanceOptions {
  organizationId: string;
  debounceMs?: number;
  enableNotifications?: boolean;
  onNotification?: (notification: any) => void;
  autoReconnect?: boolean;
  filter?: string;
}

// Attendance statistics for real-time updates
interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  checkInsToday: number;
  checkOutsToday: number;
  attendanceRate: number;
}

// Real-time attendance data structure
interface RealtimeAttendanceData {
  records: AttendanceRecord[];
  stats: AttendanceStats;
  recentUpdates: AttendanceRealtimeEvent[];
  lastUpdated: Date;
}

// Hook return type
interface UseRealtimeAttendanceReturn {
  data: RealtimeAttendanceData;
  connectionState: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  recentEvents: AttendanceRealtimeEvent[];
  // Actions
  refreshData: () => void;
  clearRecentEvents: () => void;
  reconnect: () => void;
  // Statistics
  getEmployeeStatus: (employeeId: string) => AttendanceStatus | null;
  getTodayRecord: (employeeId: string) => AttendanceRecord | null;
}

export const useRealtimeAttendance = (
  options: UseRealtimeAttendanceOptions
): UseRealtimeAttendanceReturn => {
  const {
    organizationId,
    debounceMs = 500,
    enableNotifications = true,
    onNotification,
    autoReconnect = true,
    filter
  } = options;

  // State management
  const [data, setData] = useState<RealtimeAttendanceData>({
    records: [],
    stats: {
      totalEmployees: 0,
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
      checkInsToday: 0,
      checkOutsToday: 0,
      attendanceRate: 0
    },
    recentUpdates: [],
    lastUpdated: new Date()
  });

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    realtimeManager.getConnectionState()
  );
  
  const [error, setError] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<AttendanceRealtimeEvent[]>([]);

  // Refs for cleanup and debouncing
  const subscriptionIdRef = useRef<string | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHistoryRef = useRef<AttendanceRealtimeEvent[]>([]);

  // Calculate statistics from records
  const calculateStats = useCallback((records: AttendanceRecord[]): AttendanceStats => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(record => record.date === today);
    
    const totalEmployees = new Set(records.map(r => r.employeeId)).size;
    const presentToday = todayRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
    const absentToday = todayRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
    const lateToday = todayRecords.filter(r => r.status === AttendanceStatus.LATE).length;
    const checkInsToday = todayRecords.filter(r => r.checkInTime).length;
    const checkOutsToday = todayRecords.filter(r => r.checkOutTime).length;
    
    const attendanceRate = totalEmployees > 0 
      ? Math.round(((presentToday + lateToday) / totalEmployees) * 100)
      : 0;

    return {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      checkInsToday,
      checkOutsToday,
      attendanceRate
    };
  }, []);

  // Handle real-time attendance updates
  const handleAttendanceUpdate = useCallback((event: AttendanceRealtimeEvent) => {
    console.log('[useRealtimeAttendance] Received event:', event);
    
    try {
      // Add to recent events
      setRecentEvents(prev => {
        const newEvents = [event, ...prev].slice(0, 10); // Keep last 10 events
        eventHistoryRef.current = newEvents;
        return newEvents;
      });

      // Update attendance data
      setData(prevData => {
        let updatedRecords = [...prevData.records];
        
        switch (event.type) {
          case 'INSERT':
            if (event.record) {
              updatedRecords.push(event.record);
            }
            break;
          
          case 'UPDATE':
            if (event.record) {
              const index = updatedRecords.findIndex(r => r.attendanceId === event.record.attendanceId);
              if (index >= 0) {
                updatedRecords[index] = event.record;
              } else {
                updatedRecords.push(event.record);
              }
            }
            break;
          
          case 'DELETE':
            if (event.old_record) {
              updatedRecords = updatedRecords.filter(r => r.attendanceId !== event.old_record.attendanceId);
            }
            break;
        }

        // Recalculate statistics
        const newStats = calculateStats(updatedRecords);
        
        // Update recent updates list
        const newRecentUpdates = [event, ...prevData.recentUpdates].slice(0, 5);

        return {
          records: updatedRecords,
          stats: newStats,
          recentUpdates: newRecentUpdates,
          lastUpdated: new Date()
        };
      });

      // Generate and trigger notification
      if (enableNotifications && onNotification) {
        const notification = generateNotificationFromEvent(event);
        onNotification({
          ...notification,
          id: `notif_${Date.now()}`,
          timestamp: new Date()
        });
      }

      setError(null);
    } catch (err) {
      console.error('[useRealtimeAttendance] Error handling update:', err);
      setError(`Failed to process attendance update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [calculateStats, enableNotifications, onNotification]);

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((newState: ConnectionState) => {
    setConnectionState(newState);
    
    if (newState === ConnectionState.ERROR) {
      setError('Real-time connection error occurred');
    } else if (newState === ConnectionState.CONNECTED) {
      setError(null);
    }
  }, []);

  // Handle reconnection
  const handleReconnect = useCallback(() => {
    console.log('[useRealtimeAttendance] Handling reconnection');
    
    if (subscriptionIdRef.current) {
      realtimeManager.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
    }

    // Re-establish subscription
    const subscriptionId = realtimeManager.subscribeToAttendance(
      organizationId,
      handleAttendanceUpdate,
      { debounceMs, filter }
    );
    
    subscriptionIdRef.current = subscriptionId;
  }, [organizationId, handleAttendanceUpdate, debounceMs, filter]);

  // Initial data fetch
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      // Fetch initial data from API
      console.log('[useRealtimeAttendance] Refreshing data for organization:', organizationId);
      
      const response = await fetch(`/api/attendance/records?organizationId=${organizationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const initialData = await response.json();
        setData(prevData => ({ 
          ...prevData, 
          records: initialData.records || [],
          stats: calculateStats(initialData.records || [])
        }));
      } else {
        throw new Error('Failed to fetch attendance records');
      }
    } catch (err) {
      console.error('[useRealtimeAttendance] Error refreshing data:', err);
      setError(`Failed to refresh data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [organizationId]);

  // Setup real-time subscription
  useEffect(() => {
    if (!organizationId) {
      console.warn('[useRealtimeAttendance] No organization ID provided');
      return;
    }

    console.log('[useRealtimeAttendance] Setting up subscription for organization:', organizationId);

    // Subscribe to attendance changes
    const subscriptionId = realtimeManager.subscribeToAttendance(
      organizationId,
      handleAttendanceUpdate,
      { debounceMs, filter }
    );
    
    subscriptionIdRef.current = subscriptionId;

    // Listen for connection state changes
    realtimeManager.on('connectionStateChange', handleConnectionStateChange);
    
    // Listen for reconnection events
    if (autoReconnect) {
      realtimeManager.on('reconnect', handleReconnect);
    }

    // Initial data fetch
    refreshData();

    return () => {
      if (subscriptionIdRef.current) {
        realtimeManager.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
      
      realtimeManager.off('connectionStateChange', handleConnectionStateChange);
      if (autoReconnect) {
        realtimeManager.off('reconnect', handleReconnect);
      }

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [
    organizationId,
    handleAttendanceUpdate,
    handleConnectionStateChange,
    handleReconnect,
    autoReconnect,
    debounceMs,
    filter,
    refreshData
  ]);

  // Utility functions
  const getEmployeeStatus = useCallback((employeeId: string): AttendanceStatus | null => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = data.records.find(
      record => record.employeeId === employeeId && record.date === today
    );
    return todayRecord?.status || null;
  }, [data.records]);

  const getTodayRecord = useCallback((employeeId: string): AttendanceRecord | null => {
    const today = new Date().toISOString().split('T')[0];
    return data.records.find(
      record => record.employeeId === employeeId && record.date === today
    ) || null;
  }, [data.records]);

  const clearRecentEvents = useCallback(() => {
    setRecentEvents([]);
    eventHistoryRef.current = [];
  }, []);

  const reconnect = useCallback(() => {
    handleReconnect();
  }, [handleReconnect]);

  return {
    data,
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isReconnecting: connectionState === ConnectionState.RECONNECTING,
    error,
    recentEvents,
    // Actions
    refreshData,
    clearRecentEvents,
    reconnect,
    // Statistics
    getEmployeeStatus,
    getTodayRecord
  };
};