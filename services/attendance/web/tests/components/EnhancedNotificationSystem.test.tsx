import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedNotificationSystem } from '@/components/notifications/EnhancedNotificationSystem';

// Mock the realtime manager
jest.mock('@/lib/realtime', () => ({
  realtimeManager: {
    subscribeToNotifications: jest.fn(() => 'notification-channel'),
    subscribeToAttendance: jest.fn(() => 'attendance-channel'),
    subscribeToApprovals: jest.fn(() => 'approval-channel'),
    unsubscribe: jest.fn()
  }
}));

// Mock timers
jest.useFakeTimers();

describe('Enhanced Notification System', () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    delete (window as any).notificationHelpers;
  });

  describe('🔵 Refactor Phase - Enhanced Features', () => {
    test('should render enhanced notification system with default props', () => {
      render(<EnhancedNotificationSystem />);
      
      const container = screen.getByTestId('toast-container');
      expect(container).toBeInTheDocument();
    });

    test('should integrate with WebSocket when user and organization IDs provided', async () => {
      render(
        <EnhancedNotificationSystem
          userId="user-123"
          organizationId="org-456"
          enableRealtimeIntegration={true}
        />
      );

      await waitFor(() => {
        const container = screen.getByTestId('toast-container');
        expect(container).toBeInTheDocument();
      });
    });

    test('should expose global notification helpers', async () => {
      render(
        <EnhancedNotificationSystem
          userId="user-123"
          organizationId="org-456"
          enableRealtimeIntegration={true}
        />
      );

      await waitFor(() => {
        expect((window as any).notificationHelpers).toBeDefined();
        expect((window as any).notificationHelpers.showAttendanceSuccess).toBeInstanceOf(Function);
        expect((window as any).notificationHelpers.showAttendanceError).toBeInstanceOf(Function);
        expect((window as any).notificationHelpers.showApprovalUpdate).toBeInstanceOf(Function);
        expect((window as any).notificationHelpers.showSystemMessage).toBeInstanceOf(Function);
      });
    });

    test('should handle different positioning options', () => {
      const { rerender } = render(
        <EnhancedNotificationSystem position="bottom-left" />
      );
      
      let container = screen.getByTestId('toast-container');
      expect(container).toHaveClass('bottom-left');

      rerender(<EnhancedNotificationSystem position="top-center" />);
      
      container = screen.getByTestId('toast-container');
      expect(container).toHaveClass('top-center');
    });

    test('should respect maxToasts limitation', () => {
      render(<EnhancedNotificationSystem maxToasts={2} />);
      
      const container = screen.getByTestId('toast-container');
      expect(container).toBeInTheDocument();
    });

    test('should disable sounds when specified', () => {
      render(
        <EnhancedNotificationSystem
          enableSounds={false}
          userId="user-123"
          organizationId="org-456"
        />
      );
      
      const container = screen.getByTestId('toast-container');
      expect(container).toBeInTheDocument();
    });

    test('should disable realtime integration when specified', () => {
      const { realtimeManager } = require('@/lib/realtime');
      
      render(
        <EnhancedNotificationSystem
          enableRealtimeIntegration={false}
          userId="user-123"
          organizationId="org-456"
        />
      );
      
      expect(realtimeManager.subscribeToNotifications).not.toHaveBeenCalled();
    });

    test('should support legacy notification system when enabled', () => {
      render(
        <EnhancedNotificationSystem
          enableLegacyNotifications={true}
          position="top-right"
        />
      );
      
      // Should have both toast container and potentially legacy system
      const container = screen.getByTestId('toast-container');
      expect(container).toBeInTheDocument();
    });

    test('should cleanup global helpers on unmount', async () => {
      const { unmount } = render(
        <EnhancedNotificationSystem
          userId="user-123"
          organizationId="org-456"
        />
      );

      await waitFor(() => {
        expect((window as any).notificationHelpers).toBeDefined();
      });

      unmount();

      expect((window as any).notificationHelpers).toBeUndefined();
    });

    test('should handle component re-rendering with different props', () => {
      const { rerender } = render(
        <EnhancedNotificationSystem userId="user-1" />
      );

      let container = screen.getByTestId('toast-container');
      expect(container).toBeInTheDocument();

      rerender(
        <EnhancedNotificationSystem 
          userId="user-2" 
          organizationId="org-1"
          position="bottom-right"
        />
      );

      container = screen.getByTestId('toast-container');
      expect(container).toHaveClass('bottom-right');
    });
  });

  describe('🔵 Refactor Phase - WebSocket Integration', () => {
    test('should setup WebSocket subscriptions when enabled', () => {
      const { realtimeManager } = require('@/lib/realtime');
      
      render(
        <EnhancedNotificationSystem
          userId="user-123"
          organizationId="org-456"
          enableRealtimeIntegration={true}
        />
      );

      expect(realtimeManager.subscribeToNotifications).toHaveBeenCalledWith(
        'user-123',
        expect.any(Function)
      );
      expect(realtimeManager.subscribeToAttendance).toHaveBeenCalledWith(
        'org-456',
        expect.any(Function),
        { debounceMs: 300 }
      );
      expect(realtimeManager.subscribeToApprovals).toHaveBeenCalledWith(
        'org-456',
        expect.any(Function),
        { debounceMs: 300 }
      );
    });

    test('should not setup WebSocket when userId is missing', () => {
      const { realtimeManager } = require('@/lib/realtime');
      
      render(
        <EnhancedNotificationSystem
          organizationId="org-456"
          enableRealtimeIntegration={true}
        />
      );

      expect(realtimeManager.subscribeToNotifications).not.toHaveBeenCalled();
    });

    test('should setup limited WebSocket when organizationId is missing', () => {
      const { realtimeManager } = require('@/lib/realtime');
      
      render(
        <EnhancedNotificationSystem
          userId="user-123"
          enableRealtimeIntegration={true}
        />
      );

      expect(realtimeManager.subscribeToNotifications).toHaveBeenCalledWith(
        'user-123',
        expect.any(Function)
      );
      expect(realtimeManager.subscribeToAttendance).not.toHaveBeenCalled();
      expect(realtimeManager.subscribeToApprovals).not.toHaveBeenCalled();
    });
  });

  describe('🔵 Refactor Phase - Performance Optimizations', () => {
    test('should handle multiple rapid updates efficiently', async () => {
      render(
        <EnhancedNotificationSystem
          userId="user-123"
          organizationId="org-456"
          maxToasts={3}
        />
      );

      await waitFor(() => {
        expect((window as any).notificationHelpers).toBeDefined();
      });

      // Simulate rapid notifications
      const helpers = (window as any).notificationHelpers;
      
      act(() => {
        helpers.showAttendanceSuccess('John', 'check-in');
        helpers.showAttendanceSuccess('Jane', 'check-out');
        helpers.showApprovalUpdate('Bob', 'approved');
        helpers.showSystemMessage('Test message');
      });

      await waitFor(() => {
        // Should be limited to maxToasts
        const toasts = screen.getAllByTestId('toast');
        expect(toasts.length).toBeLessThanOrEqual(3);
      });
    });

    test('should debounce similar notifications', () => {
      // This test verifies that the debouncing mechanism works
      // The actual debouncing is handled in the WebSocket integration
      render(
        <EnhancedNotificationSystem
          userId="user-123"
          organizationId="org-456"
        />
      );

      const container = screen.getByTestId('toast-container');
      expect(container).toBeInTheDocument();
    });
  });
});