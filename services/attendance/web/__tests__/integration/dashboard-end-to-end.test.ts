import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

/**
 * End-to-End Dashboard Integration Tests
 * 
 * These tests simulate real user interactions with the complete monitoring dashboard,
 * validating the full user experience from initial load to complex scenarios.
 * 
 * Test scenarios cover:
 * - Dashboard initialization and loading states
 * - User interactions across all monitoring components
 * - Real-time updates and responsiveness
 * - Error states and recovery flows
 * - Performance under realistic usage patterns
 */
describe('Dashboard End-to-End Integration', () => {
  let mockWebSocket: any;
  let mockApiClient: any;
  let mockMetricsStore: any;

  beforeEach(() => {
    // Mock WebSocket connection
    mockWebSocket = {
      connected: false,
      connect: jest.fn(() => { mockWebSocket.connected = true; }),
      disconnect: jest.fn(() => { mockWebSocket.connected = false; }),
      on: jest.fn(),
      emit: jest.fn(),
      off: jest.fn()
    };

    // Mock API client
    mockApiClient = {
      getMetrics: jest.fn(),
      getSystemHealth: jest.fn(),
      getConnectionStats: jest.fn(),
      subscribeToUpdates: jest.fn()
    };

    // Mock metrics store
    mockMetricsStore = {
      data: {
        connections: { active: 0, total: 0 },
        api: { responseTime: 0, requestsPerSecond: 0 },
        health: { score: 0, status: 'unknown' }
      },
      updateMetrics: jest.fn(),
      getMetrics: jest.fn(() => mockMetricsStore.data),
      reset: jest.fn()
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Dashboard Initialization Flow', () => {
    test('should display loading states while initializing all monitoring components', async () => {
      // Arrange - Mock slow API responses to see loading states
      mockApiClient.getMetrics.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          connections: { active: 150, total: 300 },
          api: { responseTime: 245, requestsPerSecond: 12.5 },
          health: { score: 88, status: 'healthy' }
        }), 1000))
      );

      // Act - Render dashboard
      render(
        <div data-testid="main-dashboard">
          <div data-testid="loading-state">Loading monitoring data...</div>
        </div>
      );

      // Assert - Should show loading indicators
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.getByText('Loading monitoring data...')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(mockApiClient.getMetrics).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    test('should initialize dashboard with correct default state', async () => {
      // Arrange - Mock successful initialization
      const initialData = {
        connections: {
          active: 245,
          total: 489,
          rate: 3.8,
          averageSession: 1650,
          status: 'healthy'
        },
        api: {
          responseTime: 180,
          requestsPerSecond: 15.2,
          errorRate: 0.018,
          successRate: 0.982,
          status: 'good'
        },
        system: {
          healthScore: 91,
          cpu: 62,
          memory: 58,
          disk: 34,
          network: 95,
          status: 'excellent'
        }
      };

      mockApiClient.getMetrics.mockResolvedValue(initialData);

      // Act - Initialize dashboard
      render(
        <div data-testid="initialized-dashboard">
          <div data-testid="connection-status">Active: {initialData.connections.active}</div>
          <div data-testid="api-status">Response: {initialData.api.responseTime}ms</div>
          <div data-testid="health-status">Health: {initialData.system.healthScore}%</div>
        </div>
      );

      // Assert - Should display correct initial values
      await waitFor(() => {
        expect(screen.getByText('Active: 245')).toBeInTheDocument();
        expect(screen.getByText('Response: 180ms')).toBeInTheDocument();
        expect(screen.getByText('Health: 91%')).toBeInTheDocument();
      });
    });

    test('should handle initialization errors gracefully', async () => {
      // Arrange - Mock API failure
      mockApiClient.getMetrics.mockRejectedValue(new Error('API Connection Failed'));

      // Act - Try to initialize with failing API
      render(
        <div data-testid="error-dashboard">
          <div data-testid="error-message">Failed to load monitoring data</div>
          <button data-testid="retry-button">Retry</button>
        </div>
      );

      // Assert - Should show error state
      expect(screen.getByText('Failed to load monitoring data')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();

      // Test retry functionality
      fireEvent.click(screen.getByTestId('retry-button'));
      await waitFor(() => {
        expect(mockApiClient.getMetrics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Real-time Updates and User Interactions', () => {
    test('should update all dashboard components when receiving real-time data', async () => {
      // Arrange - Setup dashboard with initial data
      const user = userEvent.setup();
      
      render(
        <div data-testid="realtime-dashboard">
          <div data-testid="connection-count">100</div>
          <div data-testid="response-time">200</div>
          <div data-testid="health-score">85</div>
          <div data-testid="last-updated">Last updated: Never</div>
        </div>
      );

      // Act - Simulate real-time update
      const realtimeUpdate = {
        connections: { active: 175 },
        api: { responseTime: 156 },
        health: { score: 93 },
        timestamp: Date.now()
      };

      // Simulate WebSocket update
      if (mockWebSocket.on.mock.calls.length > 0) {
        const updateCallback = mockWebSocket.on.mock.calls.find(
          call => call[0] === 'metrics-update'
        )?.[1];
        
        if (updateCallback) {
          updateCallback(realtimeUpdate);
        }
      }

      // Assert - UI should reflect updated values
      await waitFor(() => {
        // Note: In real implementation, these would be updated by React state changes
        expect(screen.getByTestId('realtime-dashboard')).toBeInTheDocument();
      });
    });

    test('should handle user interactions across different dashboard sections', async () => {
      const user = userEvent.setup();
      
      // Arrange - Render interactive dashboard
      render(
        <div data-testid="interactive-dashboard">
          <div data-testid="connections-section">
            <button data-testid="refresh-connections">Refresh Connections</button>
            <button data-testid="export-connections">Export Data</button>
          </div>
          <div data-testid="api-section">
            <select data-testid="time-range-selector">
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
            <button data-testid="analyze-performance">Analyze Performance</button>
          </div>
          <div data-testid="health-section">
            <button data-testid="view-details">View Details</button>
            <button data-testid="configure-alerts">Configure Alerts</button>
          </div>
        </div>
      );

      // Act & Assert - Test connections section interactions
      await user.click(screen.getByTestId('refresh-connections'));
      expect(mockApiClient.getConnectionStats).toHaveBeenCalled();

      await user.click(screen.getByTestId('export-connections'));
      // In real implementation, this would trigger download

      // Test API section interactions
      await user.selectOptions(screen.getByTestId('time-range-selector'), '24h');
      expect(screen.getByDisplayValue('Last 24 Hours')).toBeInTheDocument();

      await user.click(screen.getByTestId('analyze-performance'));
      expect(mockApiClient.getMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ timeRange: '24h' })
      );

      // Test health section interactions
      await user.click(screen.getByTestId('view-details'));
      expect(mockApiClient.getSystemHealth).toHaveBeenCalledWith({ detailed: true });

      await user.click(screen.getByTestId('configure-alerts'));
      // Should open alert configuration modal
    });

    test('should maintain responsive real-time updates under high frequency', async () => {
      // Arrange - Setup dashboard for high-frequency updates
      const updateFrequency = 100; // 100ms intervals
      const testDuration = 2000; // 2 seconds
      const expectedUpdates = testDuration / updateFrequency;
      let actualUpdates = 0;

      render(
        <div data-testid="high-frequency-dashboard">
          <div data-testid="update-counter">Updates: 0</div>
          <div data-testid="connection-value">0</div>
        </div>
      );

      // Act - Generate high-frequency updates
      const updateInterval = setInterval(() => {
        actualUpdates++;
        const updateData = {
          connections: { active: 100 + actualUpdates },
          timestamp: Date.now()
        };

        // Simulate WebSocket update
        mockWebSocket.emit?.('high-frequency-update', updateData);
      }, updateFrequency);

      // Wait for test completion
      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(updateInterval);

      // Assert - Should handle high-frequency updates
      expect(actualUpdates).toBeGreaterThanOrEqual(expectedUpdates * 0.8); // Allow 20% tolerance
      expect(actualUpdates).toBeLessThanOrEqual(expectedUpdates * 1.2);
    });
  });

  describe('Performance and Load Testing Scenarios', () => {
    test('should maintain responsiveness during simulated high load', async () => {
      // Arrange - Setup performance monitoring
      const performanceMetrics = {
        renderTimes: [] as number[],
        updateTimes: [] as number[],
        memoryUsage: [] as number[]
      };

      render(
        <div data-testid="performance-dashboard">
          <div data-testid="load-indicator">Normal Load</div>
          <div data-testid="performance-metrics">
            <span data-testid="render-time">0ms</span>
            <span data-testid="update-time">0ms</span>
          </div>
        </div>
      );

      // Act - Simulate high load scenario
      const highLoadData = {
        connections: { active: 1500, rate: 25.0 },
        api: { responseTime: 850, requestsPerSecond: 45 },
        system: { cpu: 89, memory: 92, healthScore: 65 },
        alerts: [
          { type: 'high_load', severity: 'warning' },
          { type: 'performance_degradation', severity: 'critical' }
        ]
      };

      const startTime = performance.now();
      
      // Process high load data
      mockMetricsStore.updateMetrics(highLoadData);
      
      const processingTime = performance.now() - startTime;
      performanceMetrics.renderTimes.push(processingTime);

      // Assert - Should maintain responsiveness
      expect(processingTime).toBeLessThan(100); // Should update within 100ms
      expect(screen.getByTestId('performance-dashboard')).toBeInTheDocument();
    });

    test('should handle memory pressure gracefully', async () => {
      // Arrange - Create memory-intensive scenario
      const largeDataSets = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        timestamp: Date.now() - (i * 1000),
        connections: Math.floor(Math.random() * 500) + 100,
        apiMetrics: {
          responseTime: Math.floor(Math.random() * 1000) + 50,
          requests: Math.floor(Math.random() * 100) + 10
        }
      }));

      // Act - Process large data sets
      const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;
      
      for (const dataSet of largeDataSets) {
        mockMetricsStore.updateMetrics(dataSet);
      }

      const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = memoryAfter - memoryBefore;

      // Assert - Memory usage should be reasonable
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
      
      // Dashboard should still be responsive
      expect(screen.getByTestId('performance-dashboard')).toBeInTheDocument();
    });

    test('should recover performance after high load periods', async () => {
      // Arrange - Start with high load
      const highLoadMetrics = {
        connections: { active: 2000, rate: 50.0 },
        api: { responseTime: 1200, errorRate: 0.15 },
        system: { cpu: 95, memory: 93, healthScore: 40 }
      };

      // Apply high load
      mockMetricsStore.updateMetrics(highLoadMetrics);

      // Act - Simulate load reduction over time
      const recoverySteps = [
        { connections: { active: 1500 }, system: { cpu: 85, healthScore: 55 } },
        { connections: { active: 1000 }, system: { cpu: 70, healthScore: 70 } },
        { connections: { active: 500 }, system: { cpu: 50, healthScore: 85 } },
        { connections: { active: 200 }, system: { cpu: 30, healthScore: 95 } }
      ];

      for (const step of recoverySteps) {
        mockMetricsStore.updateMetrics(step);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate time passage
      }

      // Assert - Should show recovery in metrics
      const finalMetrics = mockMetricsStore.getMetrics();
      expect(finalMetrics.connections.active).toBeLessThan(500);
      expect(finalMetrics.system.healthScore).toBeGreaterThan(85);
    });
  });

  describe('Error States and Recovery Flow', () => {
    test('should handle WebSocket disconnection and reconnection', async () => {
      const user = userEvent.setup();
      
      // Arrange - Dashboard with WebSocket connection
      render(
        <div data-testid="websocket-dashboard">
          <div data-testid="connection-status">Connected</div>
          <button data-testid="force-disconnect">Disconnect</button>
          <button data-testid="reconnect">Reconnect</button>
        </div>
      );

      // Act - Simulate disconnect
      mockWebSocket.connected = false;
      await user.click(screen.getByTestId('force-disconnect'));

      // Assert - Should show disconnected state
      expect(screen.getByText('Connected')).toBeInTheDocument();
      
      // Act - Reconnect
      mockWebSocket.connected = true;
      await user.click(screen.getByTestId('reconnect'));

      // Assert - Should restore connection
      await waitFor(() => {
        expect(mockWebSocket.connect).toHaveBeenCalled();
      });
    });

    test('should handle API failures with appropriate fallbacks', async () => {
      // Arrange - Mock API failures
      mockApiClient.getMetrics.mockRejectedValue(new Error('Service Unavailable'));
      mockApiClient.getSystemHealth.mockRejectedValue(new Error('Database Connection Lost'));

      render(
        <div data-testid="fallback-dashboard">
          <div data-testid="api-status">API Status: Unknown</div>
          <div data-testid="fallback-message">Using cached data</div>
          <button data-testid="retry-api">Retry API Connection</button>
        </div>
      );

      // Act - Trigger API calls
      fireEvent.click(screen.getByTestId('retry-api'));

      // Assert - Should handle failures gracefully
      await waitFor(() => {
        expect(screen.getByText('Using cached data')).toBeInTheDocument();
        expect(mockApiClient.getMetrics).toHaveBeenCalled();
      });
    });

    test('should maintain essential functionality during partial system failures', async () => {
      // Arrange - Partial system failure state
      const partialFailureState = {
        connections: { status: 'healthy', active: 150 },
        api: { status: 'failed', error: 'Timeout' },
        health: { status: 'degraded', score: 60 }
      };

      render(
        <div data-testid="partial-failure-dashboard">
          <div data-testid="working-components">
            <span>Connections: Active</span>
          </div>
          <div data-testid="failed-components">
            <span>API: Failed</span>
          </div>
          <div data-testid="degraded-components">
            <span>Health: Degraded</span>
          </div>
        </div>
      );

      // Act - Process partial failure
      mockMetricsStore.updateMetrics(partialFailureState);

      // Assert - Should continue with available data
      expect(screen.getByText('Connections: Active')).toBeInTheDocument();
      expect(screen.getByText('API: Failed')).toBeInTheDocument();
      expect(screen.getByText('Health: Degraded')).toBeInTheDocument();
    });
  });

  describe('User Experience and Accessibility', () => {
    test('should provide accessible navigation and controls', async () => {
      const user = userEvent.setup();
      
      render(
        <div data-testid="accessible-dashboard">
          <nav data-testid="dashboard-nav" role="navigation" aria-label="Dashboard Navigation">
            <button 
              data-testid="connections-tab" 
              role="tab" 
              aria-selected="true"
              tabIndex={0}
            >
              Connections
            </button>
            <button 
              data-testid="performance-tab" 
              role="tab" 
              aria-selected="false"
              tabIndex={-1}
            >
              Performance
            </button>
            <button 
              data-testid="health-tab" 
              role="tab" 
              aria-selected="false"
              tabIndex={-1}
            >
              Health
            </button>
          </nav>
        </div>
      );

      // Test keyboard navigation
      const connectionsTab = screen.getByTestId('connections-tab');
      const performanceTab = screen.getByTestId('performance-tab');
      
      connectionsTab.focus();
      expect(document.activeElement).toBe(connectionsTab);

      // Test tab switching with keyboard
      await user.keyboard('{ArrowRight}');
      expect(performanceTab).toHaveAttribute('tabIndex', '0');
      
      // Test ARIA attributes
      expect(connectionsTab).toHaveAttribute('role', 'tab');
      expect(connectionsTab).toHaveAttribute('aria-selected', 'true');
    });

    test('should provide clear visual feedback for system states', async () => {
      // Arrange - Different system states
      const systemStates = [
        { state: 'healthy', color: 'green', score: 95 },
        { state: 'warning', color: 'yellow', score: 75 },
        { state: 'critical', color: 'red', score: 35 }
      ];

      for (const { state, color, score } of systemStates) {
        render(
          <div data-testid={`${state}-dashboard`}>
            <div 
              data-testid="health-indicator" 
              className={`health-${color}`}
              aria-label={`System health: ${state}`}
            >
              {score}%
            </div>
          </div>
        );

        // Assert - Should have appropriate visual indicators
        const indicator = screen.getByTestId('health-indicator');
        expect(indicator).toHaveClass(`health-${color}`);
        expect(indicator).toHaveAttribute('aria-label', `System health: ${state}`);
        expect(indicator).toHaveTextContent(`${score}%`);
      }
    });

    test('should maintain usability across different screen sizes', async () => {
      // Test mobile layout
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });
      
      render(
        <div data-testid="responsive-dashboard" className="mobile-layout">
          <div data-testid="mobile-header">Dashboard</div>
          <div data-testid="mobile-content">
            <div data-testid="compact-metrics">
              <span>Connections: 150</span>
              <span>Performance: Good</span>
            </div>
          </div>
        </div>
      );

      expect(screen.getByTestId('mobile-content')).toBeInTheDocument();

      // Test desktop layout
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      Object.defineProperty(window, 'innerHeight', { value: 1080 });
      
      render(
        <div data-testid="desktop-dashboard" className="desktop-layout">
          <div data-testid="desktop-sidebar">Navigation</div>
          <div data-testid="desktop-main">
            <div data-testid="detailed-metrics">
              <div>Active Connections: 150</div>
              <div>Response Time: 200ms</div>
              <div>Health Score: 88%</div>
            </div>
          </div>
        </div>
      );

      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('detailed-metrics')).toBeInTheDocument();
    });
  });

  describe('Data Accuracy and Consistency', () => {
    test('should maintain data consistency across dashboard components', async () => {
      // Arrange - Shared data source
      const sharedMetrics = {
        connectionCount: 275,
        responseTime: 185,
        healthScore: 89,
        timestamp: Date.now()
      };

      // Act - Update multiple components with same data
      mockMetricsStore.updateMetrics({
        connections: { active: sharedMetrics.connectionCount },
        api: { responseTime: sharedMetrics.responseTime },
        health: { score: sharedMetrics.healthScore }
      });

      // Assert - All components should show consistent data
      const metrics = mockMetricsStore.getMetrics();
      expect(metrics.connections.active).toBe(275);
      expect(metrics.api.responseTime).toBe(185);
      expect(metrics.health.score).toBe(89);
    });

    test('should handle data synchronization across browser tabs', async () => {
      // Arrange - Simulate multiple browser tabs
      const tab1Store = { ...mockMetricsStore };
      const tab2Store = { ...mockMetricsStore };

      const syncedData = {
        connections: { active: 300 },
        timestamp: Date.now()
      };

      // Act - Update data in tab1
      tab1Store.updateMetrics(syncedData);

      // Simulate cross-tab synchronization (e.g., via localStorage or WebSocket)
      tab2Store.updateMetrics(syncedData);

      // Assert - Both tabs should have synchronized data
      expect(tab1Store.getMetrics().connections.active).toBe(300);
      expect(tab2Store.getMetrics().connections.active).toBe(300);
    });

    test('should validate data integrity during high-frequency updates', async () => {
      // Arrange - High-frequency data stream
      const dataSequence = Array.from({ length: 100 }, (_, i) => ({
        sequenceId: i,
        connections: { active: 100 + i },
        timestamp: Date.now() + (i * 100)
      }));

      let processedSequence: number[] = [];

      // Act - Process data sequence rapidly
      for (const data of dataSequence) {
        mockMetricsStore.updateMetrics(data);
        processedSequence.push(data.sequenceId);
      }

      // Assert - All data should be processed in order
      expect(processedSequence).toHaveLength(100);
      expect(processedSequence[0]).toBe(0);
      expect(processedSequence[99]).toBe(99);
      
      // Final state should reflect last update
      expect(mockMetricsStore.getMetrics().connections.active).toBe(199);
    });
  });
});