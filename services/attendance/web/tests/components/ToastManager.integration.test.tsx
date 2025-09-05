import React, { useEffect } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from '@/components/notifications/Toast';

// Mock timers
jest.useFakeTimers();

// Test component that uses the toast hook
const TestComponent: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo, clearAll, getToasts } = useToast();

  const handleShowToasts = () => {
    showSuccess('Success!', 'Operation completed successfully');
    showError('Error!', 'Something went wrong');
    showWarning('Warning!', 'Please check your input');
    showInfo('Info', 'Just so you know');
  };

  return (
    <div>
      <button onClick={handleShowToasts} data-testid="show-toasts">
        Show Toasts
      </button>
      <button onClick={clearAll} data-testid="clear-all">
        Clear All
      </button>
      <div data-testid="toast-count">{getToasts().length}</div>
    </div>
  );
};

// Component to test WebSocket integration
const WebSocketTestComponent: React.FC = () => {
  const { showNotification } = useToast();

  useEffect(() => {
    // Simulate WebSocket notification
    const mockNotification = {
      id: 'ws-1',
      type: 'attendance_update' as const,
      title: 'Attendance Update',
      message: 'John Doe checked in',
      timestamp: new Date(),
      priority: 'medium' as const
    };

    showNotification(mockNotification);
  }, [showNotification]);

  return <div data-testid="websocket-test">WebSocket Test</div>;
};

describe('Toast Integration Tests', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('🔴 Red Phase - Integration Failing Tests', () => {
    test('should provide toast context to child components', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.getByTestId('show-toasts')).toBeInTheDocument();
      expect(screen.getByTestId('clear-all')).toBeInTheDocument();
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });

    test('should show different types of toasts', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const showButton = screen.getByTestId('show-toasts');
      fireEvent.click(showButton);

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument();
        expect(screen.getByText('Error!')).toBeInTheDocument();
        expect(screen.getByText('Warning!')).toBeInTheDocument();
        expect(screen.getByText('Info')).toBeInTheDocument();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('4');
    });

    test('should clear all toasts when clearAll is called', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const showButton = screen.getByTestId('show-toasts');
      const clearButton = screen.getByTestId('clear-all');

      fireEvent.click(showButton);

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('4');
      });

      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
      });
    });

    test('should respect maximum toast limit', async () => {
      render(
        <ToastProvider maxToasts={2}>
          <TestComponent />
        </ToastProvider>
      );

      const showButton = screen.getByTestId('show-toasts');
      fireEvent.click(showButton);

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
      });
    });

    test('should handle WebSocket notifications', async () => {
      render(
        <ToastProvider>
          <WebSocketTestComponent />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Attendance Update')).toBeInTheDocument();
        expect(screen.getByText('John Doe checked in')).toBeInTheDocument();
      });
    });

    test('should auto-remove toasts after duration', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const showButton = screen.getByTestId('show-toasts');
      fireEvent.click(showButton);

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('4');
      });

      // Fast-forward past all durations (error toast is 7.5s, others 5s)
      act(() => {
        jest.advanceTimersByTime(8000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
      });
    });

    test('should handle toast positioning correctly', () => {
      render(
        <ToastProvider position="bottom-left">
          <TestComponent />
        </ToastProvider>
      );

      const container = screen.getByTestId('toast-container');
      expect(container).toHaveClass('bottom-left');
    });

    test('should allow custom toast durations', async () => {
      // This test will need custom toast creation with specific duration
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Test will be implemented once custom duration support is added
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });

    test('should prevent duplicate toasts with same ID', async () => {
      render(
        <ToastProvider>
          <WebSocketTestComponent />
        </ToastProvider>
      );

      // Wait for first notification
      await waitFor(() => {
        expect(screen.getByText('Attendance Update')).toBeInTheDocument();
      });

      // This test will verify duplicate prevention once implemented
      expect(screen.getAllByText('Attendance Update')).toHaveLength(1);
    });

    test('should handle toast queue when exceeding maximum', async () => {
      render(
        <ToastProvider maxToasts={2}>
          <TestComponent />
        </ToastProvider>
      );

      const showButton = screen.getByTestId('show-toasts');
      
      // Show first batch
      fireEvent.click(showButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
      });

      // Show second batch - should replace oldest toasts
      fireEvent.click(showButton);

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
      });
    });
  });
});