/**
 * useApiMetrics Hook Tests - TDD Phase 1 (RED)
 * React 훅 테스트 - API 메트릭 데이터 관리
 */

import { renderHook, act } from '@testing-library/react';
import { useApiMetrics } from '../../src/hooks/useApiMetrics';
import { 
  ApiPerformanceMetrics, 
  UseApiMetricsOptions,
  PerformanceAlert 
} from '../../src/types/performance-metrics';

// Mock WebSocket
const mockWebSocket = {
  readyState: WebSocket.OPEN,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  send: jest.fn(),
};

// Mock Socket.IO client
const mockSocketIO = {
  connect: jest.fn().mockReturnValue({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  }),
};

// Mock fetch
global.fetch = jest.fn();

jest.mock('socket.io-client', () => mockSocketIO);

describe('useApiMetrics', () => {
  let mockMetrics: ApiPerformanceMetrics;
  let mockAlerts: PerformanceAlert[];

  beforeEach(() => {
    // Setup mock data
    mockMetrics = {
      overview: {
        totalRequests: 1000,
        activeRequests: 5,
        requestsPerSecond: 45,
        avgResponseTime: 250,
        successRate: 0.95,
        errorRate: 0.05,
      },
      endpointStats: [
        {
          endpoint: '/api/users',
          method: 'GET',
          totalRequests: 500,
          successRequests: 480,
          failureRequests: 20,
          avgResponseTime: 150,
          medianResponseTime: 120,
          p95ResponseTime: 300,
          p99ResponseTime: 450,
          minResponseTime: 50,
          maxResponseTime: 800,
          requestsPerMinute: 25,
          successRate: 0.96,
          lastUpdated: new Date(),
        },
      ],
      statusCodeDistribution: {
        '200': 850,
        '404': 30,
        '500': 20,
      },
      timeSeries: {
        requests: [
          { timestamp: new Date(), value: 100 },
          { timestamp: new Date(), value: 120 },
        ],
        responseTime: [
          { timestamp: new Date(), value: 200 },
          { timestamp: new Date(), value: 250 },
        ],
        errorRate: [
          { timestamp: new Date(), value: 0.02 },
          { timestamp: new Date(), value: 0.05 },
        ],
      },
      recentErrors: [],
      slowestRequests: [],
    };

    mockAlerts = [
      {
        id: 'alert-001',
        type: 'high_response_time',
        severity: 'medium',
        message: 'Response time exceeded threshold',
        endpoint: '/api/users',
        metricValue: 1200,
        threshold: 1000,
        timestamp: new Date(),
        status: 'active',
      },
    ];

    // Reset mocks
    jest.clearAllMocks();
    
    // Setup fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ metrics: mockMetrics, alerts: mockAlerts }),
    });
  });

  describe('Basic Hook Functionality', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useApiMetrics());

      expect(result.current.metrics).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.connectionStatus).toBe('connecting');
      expect(result.current.lastUpdated).toBeNull();
      expect(result.current.activeAlerts).toEqual([]);
    });

    test('should load metrics on mount', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics());

      expect(result.current.isLoading).toBe(true);

      await waitForNextUpdate();

      expect(global.fetch).toHaveBeenCalledWith('/api/metrics');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.metrics).toEqual(mockMetrics);
      expect(result.current.activeAlerts).toEqual(mockAlerts);
    });

    test('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics());

      await waitForNextUpdate();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(result.current.metrics).toBeNull();
    });

    test('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics());

      await waitForNextUpdate();

      expect(result.current.error).toContain('500');
      expect(result.current.metrics).toBeNull();
    });
  });

  describe('Configuration Options', () => {
    test('should respect autoRefresh option', async () => {
      const options: UseApiMetricsOptions = {
        autoRefresh: true,
        refreshInterval: 100, // 100ms for testing
      };

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      // Initial load
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Wait for auto-refresh
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should not auto-refresh when disabled', async () => {
      const options: UseApiMetricsOptions = {
        autoRefresh: false,
        refreshInterval: 100,
      };

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      // Initial load
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Wait longer than refresh interval
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Should not refresh
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should apply filters to API request', async () => {
      const options: UseApiMetricsOptions = {
        filters: {
          endpoint: '/api/users',
          method: 'GET',
          statusCode: 200,
          timeRange: [new Date('2023-01-01'), new Date('2023-01-31')],
        },
      };

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/metrics?'),
        expect.any(Object)
      );

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const url = new URL(fetchCall[0], 'http://localhost');
      
      expect(url.searchParams.get('endpoint')).toBe('/api/users');
      expect(url.searchParams.get('method')).toBe('GET');
      expect(url.searchParams.get('statusCode')).toBe('200');
    });
  });

  describe('Real-time Updates', () => {
    test('should enable real-time updates when configured', async () => {
      const options: UseApiMetricsOptions = {
        realTime: true,
      };

      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
      };

      mockSocketIO.connect.mockReturnValue(mockSocket);

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      expect(mockSocketIO.connect).toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('metrics_update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('alert', expect.any(Function));
    });

    test('should handle WebSocket connection status changes', async () => {
      const options: UseApiMetricsOptions = {
        realTime: true,
      };

      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: false,
      };

      mockSocketIO.connect.mockReturnValue(mockSocket);

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      expect(result.current.connectionStatus).toBe('disconnected');

      // Simulate connection
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
        connectHandler();
      });

      expect(result.current.connectionStatus).toBe('connected');
    });

    test('should handle real-time metric updates', async () => {
      const options: UseApiMetricsOptions = {
        realTime: true,
      };

      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
      };

      mockSocketIO.connect.mockReturnValue(mockSocket);

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      const updatedMetrics = {
        ...mockMetrics,
        overview: {
          ...mockMetrics.overview,
          totalRequests: 1100, // Updated value
        },
      };

      // Simulate real-time update
      act(() => {
        const updateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'metrics_update')[1];
        updateHandler({ data: updatedMetrics });
      });

      expect(result.current.metrics?.overview.totalRequests).toBe(1100);
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });

    test('should handle real-time alert updates', async () => {
      const options: UseApiMetricsOptions = {
        realTime: true,
      };

      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
      };

      mockSocketIO.connect.mockReturnValue(mockSocket);

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      const newAlert: PerformanceAlert = {
        id: 'alert-002',
        type: 'high_error_rate',
        severity: 'high',
        message: 'Error rate exceeded threshold',
        metricValue: 0.15,
        threshold: 0.1,
        timestamp: new Date(),
        status: 'active',
      };

      // Simulate real-time alert
      act(() => {
        const alertHandler = mockSocket.on.mock.calls.find(call => call[0] === 'alert')[1];
        alertHandler({ data: newAlert });
      });

      expect(result.current.activeAlerts).toHaveLength(2);
      expect(result.current.activeAlerts.find(alert => alert.id === 'alert-002')).toEqual(newAlert);
    });
  });

  describe('Manual Refresh', () => {
    test('should provide manual refresh function', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics());

      await waitForNextUpdate();

      // Initial load
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Manual refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should handle refresh errors', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics());

      await waitForNextUpdate();

      // Mock fetch to fail on second call
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Refresh failed'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('Refresh failed');
    });

    test('should update loading state during manual refresh', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics());

      await waitForNextUpdate();

      // Start refresh
      const refreshPromise = act(async () => {
        result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);

      await refreshPromise;

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Cleanup and Memory Management', () => {
    test('should cleanup WebSocket connection on unmount', async () => {
      const options: UseApiMetricsOptions = {
        realTime: true,
      };

      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
      };

      mockSocketIO.connect.mockReturnValue(mockSocket);

      const { result, waitForNextUpdate, unmount } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.off).toHaveBeenCalledWith('metrics_update');
      expect(mockSocket.off).toHaveBeenCalledWith('alert');
    });

    test('should cleanup auto-refresh interval on unmount', async () => {
      const options: UseApiMetricsOptions = {
        autoRefresh: true,
        refreshInterval: 1000,
      };

      const { result, waitForNextUpdate, unmount } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('should handle concurrent updates safely', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics());

      await waitForNextUpdate();

      // Start multiple concurrent refreshes
      const promises = [
        act(async () => result.current.refresh()),
        act(async () => result.current.refresh()),
        act(async () => result.current.refresh()),
      ];

      await Promise.all(promises);

      // Should handle concurrent calls without race conditions
      expect(result.current.error).toBeNull();
      expect(result.current.metrics).toEqual(mockMetrics);
    });
  });

  describe('Performance Optimization', () => {
    test('should memoize metric calculations', async () => {
      const { result, waitForNextUpdate, rerender } = renderHook(() => useApiMetrics());

      await waitForNextUpdate();

      const firstMetrics = result.current.metrics;

      // Re-render with same data should return same object reference
      rerender();

      expect(result.current.metrics).toBe(firstMetrics);
    });

    test('should debounce rapid updates', async () => {
      const options: UseApiMetricsOptions = {
        realTime: true,
      };

      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
      };

      mockSocketIO.connect.mockReturnValue(mockSocket);

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      const updateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'metrics_update')[1];

      // Send rapid updates
      act(() => {
        updateHandler({ data: { ...mockMetrics, overview: { ...mockMetrics.overview, totalRequests: 1001 } } });
        updateHandler({ data: { ...mockMetrics, overview: { ...mockMetrics.overview, totalRequests: 1002 } } });
        updateHandler({ data: { ...mockMetrics, overview: { ...mockMetrics.overview, totalRequests: 1003 } } });
      });

      // Should debounce and show final value
      expect(result.current.metrics?.overview.totalRequests).toBe(1003);
    });

    test('should limit alert history size', async () => {
      const options: UseApiMetricsOptions = {
        realTime: true,
      };

      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
      };

      mockSocketIO.connect.mockReturnValue(mockSocket);

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      const alertHandler = mockSocket.on.mock.calls.find(call => call[0] === 'alert')[1];

      // Add many alerts
      act(() => {
        for (let i = 0; i < 15; i++) {
          alertHandler({
            data: {
              id: `alert-${i}`,
              type: 'high_response_time',
              severity: 'medium',
              message: `Alert ${i}`,
              metricValue: 1000,
              threshold: 800,
              timestamp: new Date(),
              status: 'active',
            },
          });
        }
      });

      // Should limit to reasonable number (e.g., 10)
      expect(result.current.activeAlerts.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed WebSocket data', async () => {
      const options: UseApiMetricsOptions = {
        realTime: true,
      };

      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
      };

      mockSocketIO.connect.mockReturnValue(mockSocket);

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      const updateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'metrics_update')[1];

      // Send malformed data
      act(() => {
        updateHandler({ data: null });
        updateHandler({ invalidStructure: true });
        updateHandler(null);
      });

      // Should not crash and maintain previous state
      expect(result.current.metrics).toEqual(mockMetrics);
      expect(result.current.error).toBeNull();
    });

    test('should handle WebSocket reconnection', async () => {
      const options: UseApiMetricsOptions = {
        realTime: true,
      };

      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: false,
      };

      mockSocketIO.connect.mockReturnValue(mockSocket);

      const { result, waitForNextUpdate } = renderHook(() => useApiMetrics(options));

      await waitForNextUpdate();

      expect(result.current.connectionStatus).toBe('disconnected');

      // Simulate disconnect
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
        disconnectHandler();
      });

      expect(result.current.connectionStatus).toBe('disconnected');

      // Simulate reconnect
      act(() => {
        mockSocket.connected = true;
        const reconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
        reconnectHandler();
      });

      expect(result.current.connectionStatus).toBe('connected');
    });
  });
});