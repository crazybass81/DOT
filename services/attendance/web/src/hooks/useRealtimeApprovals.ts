import { useState, useEffect, useCallback, useRef } from 'react';
import {
  realtimeManager,
  AttendanceRealtimeEvent,
  ConnectionState,
  formatRealtimeEvent,
  generateNotificationFromEvent
} from '@/lib/realtime';
import { Employee } from '@/lib/supabase-config';

// Approval-specific types
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface ApprovalEvent extends AttendanceRealtimeEvent {
  employee: Employee;
  oldStatus?: ApprovalStatus;
  newStatus: ApprovalStatus;
  approver?: string;
  reason?: string;
}

// Hook configuration options
interface UseRealtimeApprovalsOptions {
  organizationId: string;
  debounceMs?: number;
  enableNotifications?: boolean;
  onNotification?: (notification: any) => void;
  onApprovalChange?: (event: ApprovalEvent) => void;
  autoReconnect?: boolean;
  statusFilter?: ApprovalStatus[];
}

// Approval statistics
interface ApprovalStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalSuspended: number;
  recentApprovals: number; // Last 24 hours
  recentRejections: number; // Last 24 hours
  averageProcessingTime: number; // In hours
}

// Real-time approvals data structure
interface RealtimeApprovalsData {
  employees: Employee[];
  stats: ApprovalStats;
  recentEvents: ApprovalEvent[];
  lastUpdated: Date;
}

// Hook return type
interface UseRealtimeApprovalsReturn {
  data: RealtimeApprovalsData;
  connectionState: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  recentEvents: ApprovalEvent[];
  // Actions
  refreshData: () => void;
  clearRecentEvents: () => void;
  reconnect: () => void;
  // Utilities
  getPendingEmployees: () => Employee[];
  getEmployeesByStatus: (status: ApprovalStatus) => Employee[];
  getEmployeeById: (employeeId: string) => Employee | null;
}

export const useRealtimeApprovals = (
  options: UseRealtimeApprovalsOptions
): UseRealtimeApprovalsReturn => {
  const {
    organizationId,
    debounceMs = 300,
    enableNotifications = true,
    onNotification,
    onApprovalChange,
    autoReconnect = true,
    statusFilter
  } = options;

  // State management
  const [data, setData] = useState<RealtimeApprovalsData>({
    employees: [],
    stats: {
      totalPending: 0,
      totalApproved: 0,
      totalRejected: 0,
      totalSuspended: 0,
      recentApprovals: 0,
      recentRejections: 0,
      averageProcessingTime: 0
    },
    recentEvents: [],
    lastUpdated: new Date()
  });

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    realtimeManager.getConnectionState()
  );
  
  const [error, setError] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<ApprovalEvent[]>([]);

  // Refs for cleanup and tracking
  const subscriptionIdRef = useRef<string | null>(null);
  const eventHistoryRef = useRef<ApprovalEvent[]>([]);

  // Calculate approval statistics
  const calculateStats = useCallback((employees: Employee[]): ApprovalStats => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const totalPending = employees.filter(emp => emp.approval_status === 'PENDING').length;
    const totalApproved = employees.filter(emp => emp.approval_status === 'APPROVED').length;
    const totalRejected = employees.filter(emp => emp.approval_status === 'REJECTED').length;
    const totalSuspended = employees.filter(emp => emp.approval_status === 'SUSPENDED').length;

    // Recent approvals/rejections (last 24 hours)
    const recentApprovals = employees.filter(emp => 
      emp.approval_status === 'APPROVED' && 
      emp.approved_at && 
      new Date(emp.approved_at) > oneDayAgo
    ).length;

    const recentRejections = employees.filter(emp => 
      emp.approval_status === 'REJECTED' && 
      emp.rejected_at && 
      new Date(emp.rejected_at) > oneDayAgo
    ).length;

    // Calculate average processing time
    const processedEmployees = employees.filter(emp => 
      (emp.approval_status === 'APPROVED' || emp.approval_status === 'REJECTED') &&
      (emp.approved_at || emp.rejected_at)
    );

    let averageProcessingTime = 0;
    if (processedEmployees.length > 0) {
      const totalProcessingTime = processedEmployees.reduce((sum, emp) => {
        const createdAt = new Date(emp.created_at).getTime();
        const processedAt = new Date(emp.approved_at || emp.rejected_at || '').getTime();
        return sum + (processedAt - createdAt);
      }, 0);
      
      averageProcessingTime = Math.round(totalProcessingTime / processedEmployees.length / (1000 * 60 * 60)); // Convert to hours
    }

    return {
      totalPending,
      totalApproved,
      totalRejected,
      totalSuspended,
      recentApprovals,
      recentRejections,
      averageProcessingTime
    };
  }, []);

  // Transform realtime event to approval event
  const transformToApprovalEvent = useCallback((event: AttendanceRealtimeEvent): ApprovalEvent | null => {
    if (event.table !== 'employee_approvals' && event.table !== 'employees') {
      return null;
    }

    const employee = event.record as Employee;
    if (!employee) {
      return null;
    }

    const oldStatus = event.old_record?.approval_status as ApprovalStatus;
    const newStatus = employee.approval_status as ApprovalStatus;

    // Only process if status actually changed
    if (oldStatus === newStatus) {
      return null;
    }

    return {
      ...event,
      employee,
      oldStatus,
      newStatus,
      approver: employee.approved_by || employee.rejected_by || undefined,
      reason: employee.rejection_reason || undefined
    };
  }, []);

  // Handle real-time approval updates
  const handleApprovalUpdate = useCallback((event: AttendanceRealtimeEvent) => {
    console.log('[useRealtimeApprovals] Received event:', event);
    
    try {
      const approvalEvent = transformToApprovalEvent(event);
      if (!approvalEvent) {
        console.log('[useRealtimeApprovals] Event not relevant for approvals, skipping');
        return;
      }

      // Filter by status if specified
      if (statusFilter && statusFilter.length > 0) {
        if (!statusFilter.includes(approvalEvent.newStatus) && 
            !statusFilter.includes(approvalEvent.oldStatus || 'PENDING')) {
          console.log('[useRealtimeApprovals] Event filtered out by status filter');
          return;
        }
      }

      // Add to recent events
      setRecentEvents(prev => {
        const newEvents = [approvalEvent, ...prev].slice(0, 10); // Keep last 10 events
        eventHistoryRef.current = newEvents;
        return newEvents;
      });

      // Update employees data
      setData(prevData => {
        let updatedEmployees = [...prevData.employees];
        
        switch (event.type) {
          case 'INSERT':
            if (approvalEvent.employee) {
              updatedEmployees.push(approvalEvent.employee);
            }
            break;
          
          case 'UPDATE':
            if (approvalEvent.employee) {
              const index = updatedEmployees.findIndex(emp => emp.id === approvalEvent.employee.id);
              if (index >= 0) {
                updatedEmployees[index] = approvalEvent.employee;
              } else {
                updatedEmployees.push(approvalEvent.employee);
              }
            }
            break;
          
          case 'DELETE':
            if (event.old_record) {
              updatedEmployees = updatedEmployees.filter(emp => emp.id !== event.old_record.id);
            }
            break;
        }

        // Recalculate statistics
        const newStats = calculateStats(updatedEmployees);
        
        // Update recent events list
        const newRecentEvents = [approvalEvent, ...prevData.recentEvents].slice(0, 5);

        return {
          employees: updatedEmployees,
          stats: newStats,
          recentEvents: newRecentEvents,
          lastUpdated: new Date()
        };
      });

      // Trigger custom approval change callback
      if (onApprovalChange) {
        onApprovalChange(approvalEvent);
      }

      // Generate and trigger notification
      if (enableNotifications && onNotification) {
        const notification = {
          ...generateNotificationFromEvent(event),
          type: 'approval_update' as const,
          title: 'Approval Status Changed',
          message: `${approvalEvent.employee.name} was ${approvalEvent.newStatus.toLowerCase()}`,
          priority: approvalEvent.newStatus === 'PENDING' ? 'high' as const : 'medium' as const,
          data: {
            ...approvalEvent,
            statusChange: {
              from: approvalEvent.oldStatus,
              to: approvalEvent.newStatus
            }
          }
        };

        onNotification({
          ...notification,
          id: `approval_${Date.now()}`,
          timestamp: new Date()
        });
      }

      setError(null);
    } catch (err) {
      console.error('[useRealtimeApprovals] Error handling approval update:', err);
      setError(`Failed to process approval update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [
    transformToApprovalEvent,
    statusFilter,
    calculateStats,
    onApprovalChange,
    enableNotifications,
    onNotification
  ]);

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
    console.log('[useRealtimeApprovals] Handling reconnection');
    
    if (subscriptionIdRef.current) {
      realtimeManager.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
    }

    // Re-establish subscription
    const subscriptionId = realtimeManager.subscribeToApprovals(
      organizationId,
      handleApprovalUpdate,
      { debounceMs }
    );
    
    subscriptionIdRef.current = subscriptionId;
  }, [organizationId, handleApprovalUpdate, debounceMs]);

  // Initial data fetch
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      // TODO: Implement actual data fetch from API
      // For now, we'll rely on real-time updates
      console.log('[useRealtimeApprovals] Refreshing data for organization:', organizationId);
      
      // In a real implementation, you would fetch initial data here:
      // const initialData = await employeeService.getEmployees(organizationId);
      // setData(prevData => ({ ...prevData, employees: initialData, stats: calculateStats(initialData) }));
    } catch (err) {
      console.error('[useRealtimeApprovals] Error refreshing data:', err);
      setError(`Failed to refresh data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [organizationId]);

  // Setup real-time subscription
  useEffect(() => {
    if (!organizationId) {
      console.warn('[useRealtimeApprovals] No organization ID provided');
      return;
    }

    console.log('[useRealtimeApprovals] Setting up subscription for organization:', organizationId);

    // Subscribe to approval changes
    const subscriptionId = realtimeManager.subscribeToApprovals(
      organizationId,
      handleApprovalUpdate,
      { debounceMs }
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
    };
  }, [
    organizationId,
    handleApprovalUpdate,
    handleConnectionStateChange,
    handleReconnect,
    autoReconnect,
    debounceMs,
    refreshData
  ]);

  // Utility functions
  const getPendingEmployees = useCallback((): Employee[] => {
    return data.employees.filter(emp => emp.approval_status === 'PENDING');
  }, [data.employees]);

  const getEmployeesByStatus = useCallback((status: ApprovalStatus): Employee[] => {
    return data.employees.filter(emp => emp.approval_status === status);
  }, [data.employees]);

  const getEmployeeById = useCallback((employeeId: string): Employee | null => {
    return data.employees.find(emp => emp.id === employeeId) || null;
  }, [data.employees]);

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
    // Utilities
    getPendingEmployees,
    getEmployeesByStatus,
    getEmployeeById
  };
};