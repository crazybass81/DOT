import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useToastNotifications } from '@/hooks/useToastNotifications';
import { ToastProvider } from '@/components/notifications/Toast';

// Mock the realtime manager
const mockSubscribeToNotifications = jest.fn(() => 'notification-channel');
const mockSubscribeToAttendance = jest.fn(() => 'attendance-channel');
const mockSubscribeToApprovals = jest.fn(() => 'approval-channel');
const mockUnsubscribe = jest.fn();

jest.mock('@/lib/realtime', () => ({
  realtimeManager: {
    subscribeToNotifications: mockSubscribeToNotifications,
    subscribeToAttendance: mockSubscribeToAttendance,
    subscribeToApprovals: mockSubscribeToApprovals,
    unsubscribe: mockUnsubscribe
  }
}));

// Test wrapper with ToastProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('useToastNotifications Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('🔵 Refactor Phase - Hook Integration', () => {
    test('should initialize with default options', () => {
      const { result } = renderHook(
        () => useToastNotifications('user-123'),
        { wrapper }
      );

      expect(result.current.showSuccess).toBeInstanceOf(Function);
      expect(result.current.showError).toBeInstanceOf(Function);
      expect(result.current.showWarning).toBeInstanceOf(Function);
      expect(result.current.showInfo).toBeInstanceOf(Function);
      expect(result.current.showAttendanceSuccess).toBeInstanceOf(Function);
      expect(result.current.showAttendanceError).toBeInstanceOf(Function);
      expect(result.current.showApprovalUpdate).toBeInstanceOf(Function);
      expect(result.current.showSystemMessage).toBeInstanceOf(Function);
    });

    test('should setup WebSocket subscriptions when userId provided', () => {
      renderHook(
        () => useToastNotifications('user-123', 'org-456'),
        { wrapper }
      );

      expect(mockSubscribeToNotifications).toHaveBeenCalledWith(
        'user-123',
        expect.any(Function)
      );
      expect(mockSubscribeToAttendance).toHaveBeenCalledWith(
        'org-456',
        expect.any(Function),
        { debounceMs: 300 }
      );
      expect(mockSubscribeToApprovals).toHaveBeenCalledWith(
        'org-456',
        expect.any(Function),
        { debounceMs: 300 }
      );
    });

    test('should not setup WebSocket when realtime integration is disabled', () => {
      renderHook(
        () => useToastNotifications('user-123', 'org-456', { 
          enableRealtimeIntegration: false 
        }),
        { wrapper }
      );

      expect(mockSubscribeToNotifications).not.toHaveBeenCalled();
      expect(mockSubscribeToAttendance).not.toHaveBeenCalled();
      expect(mockSubscribeToApprovals).not.toHaveBeenCalled();
    });

    test('should cleanup subscriptions on unmount', () => {
      const { unmount } = renderHook(
        () => useToastNotifications('user-123', 'org-456'),
        { wrapper }
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledWith('notification-channel');
      expect(mockUnsubscribe).toHaveBeenCalledWith('attendance-channel');
      expect(mockUnsubscribe).toHaveBeenCalledWith('approval-channel');
    });

    test('should use custom debounce settings', () => {
      renderHook(
        () => useToastNotifications('user-123', 'org-456', { 
          debounceMs: 500 
        }),
        { wrapper }
      );

      expect(mockSubscribeToAttendance).toHaveBeenCalledWith(
        'org-456',
        expect.any(Function),
        { debounceMs: 500 }
      );
    });

    test('should indicate realtime connection status', () => {
      const { result: connectedResult } = renderHook(
        () => useToastNotifications('user-123'),
        { wrapper }
      );

      expect(connectedResult.current.isRealtimeConnected).toBe(true);

      const { result: disconnectedResult } = renderHook(
        () => useToastNotifications(undefined),
        { wrapper }
      );

      expect(disconnectedResult.current.isRealtimeConnected).toBe(false);
    });

    test('should handle attendance success notifications', () => {
      const { result } = renderHook(
        () => useToastNotifications('user-123'),
        { wrapper }
      );

      act(() => {
        result.current.showAttendanceSuccess('John Doe', 'check-in');
      });

      // Function should execute without throwing
      expect(result.current.getToasts()).toHaveLength(1);
    });

    test('should handle attendance error notifications', () => {
      const { result } = renderHook(
        () => useToastNotifications('user-123'),
        { wrapper }
      );

      act(() => {
        result.current.showAttendanceError('Jane Doe', 'Network timeout');
      });

      expect(result.current.getToasts()).toHaveLength(1);
    });

    test('should handle approval update notifications', () => {
      const { result } = renderHook(
        () => useToastNotifications('user-123'),
        { wrapper }
      );

      act(() => {
        result.current.showApprovalUpdate('Bob Smith', 'approved');
      });

      expect(result.current.getToasts()).toHaveLength(1);

      act(() => {
        result.current.showApprovalUpdate('Alice Johnson', 'rejected');
      });

      expect(result.current.getToasts()).toHaveLength(2);

      act(() => {
        result.current.showApprovalUpdate('Charlie Brown', 'pending');
      });

      expect(result.current.getToasts()).toHaveLength(3);
    });

    test('should handle system messages with different types', () => {
      const { result } = renderHook(
        () => useToastNotifications('user-123'),
        { wrapper }
      );

      act(() => {
        result.current.showSystemMessage('Info message', 'info');
        result.current.showSystemMessage('Warning message', 'warning');
        result.current.showSystemMessage('Error message', 'error');
      });

      expect(result.current.getToasts()).toHaveLength(3);
    });

    test('should handle WebSocket event callbacks', () => {
      let attendanceCallback: Function | undefined;
      let approvalCallback: Function | undefined;
      let notificationCallback: Function | undefined;

      mockSubscribeToAttendance.mockImplementation((orgId, callback, options) => {
        attendanceCallback = callback;
        return 'attendance-channel';
      });

      mockSubscribeToApprovals.mockImplementation((orgId, callback, options) => {
        approvalCallback = callback;
        return 'approval-channel';
      });

      mockSubscribeToNotifications.mockImplementation((userId, callback) => {
        notificationCallback = callback;
        return 'notification-channel';
      });

      const { result } = renderHook(
        () => useToastNotifications('user-123', 'org-456'),
        { wrapper }
      );

      // Test attendance event callback
      if (attendanceCallback) {
        act(() => {
          attendanceCallback({
            type: 'INSERT',
            table: 'attendance_records',
            record: { employee_name: 'Test User', id: '123' }
          });
        });
      }

      // Test approval event callback
      if (approvalCallback) {
        act(() => {
          approvalCallback({
            type: 'UPDATE',
            table: 'employee_approvals',
            record: { name: 'Test Employee', approval_status: 'approved', id: '456' }
          });
        });
      }

      // Test direct notification callback
      if (notificationCallback) {
        act(() => {
          notificationCallback({
            id: 'notif-789',
            type: 'system_update',
            title: 'Test Notification',
            message: 'Test message',
            timestamp: new Date(),
            priority: 'medium'
          });
        });
      }

      // Should have toasts from WebSocket events
      expect(result.current.getToasts().length).toBeGreaterThan(0);
    });
  });
});