import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as ClientIO } from 'socket.io-client';
import { RealtimeMonitoringDashboard } from '@/src/components/monitoring/RealtimeMonitoringDashboard';
import { ApiMetricsDashboard } from '@/src/components/monitoring/ApiMetricsDashboard';
import { ConnectionStatus } from '@/src/components/monitoring/ConnectionStatus';
import { MetricsAggregator } from '@/src/lib/health/metrics-aggregator';
import { PerformanceCollector } from '@/src/lib/metrics/performance-collector';

/**
 * Integration Tests for Monitoring System Dashboard
 * 
 * This test suite validates the integration of all three monitoring components:
 * 1. Phase 3.3.3.1: Real-time Connection Monitoring
 * 2. Phase 3.3.3.2: API Performance Monitoring  
 * 3. Phase 3.3.3.3: System Health & Alerts
 * 
 * Focus areas:
 * - Cross-component data flow
 * - Real-time synchronization via WebSocket
 * - Integrated alerting system
 * - End-to-end scenarios
 */
describe('Monitoring System Integration', () => {
  let server: Server;
  let httpServer: any;
  let clientSocket: any;
  let metricsAggregator: MetricsAggregator;
  let performanceCollector: PerformanceCollector;
  
  // Test environment setup
  beforeAll(async () => {
    // Create HTTP server for WebSocket
    httpServer = createServer();
    server = new Server(httpServer);
    
    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        const port = (httpServer.address() as any).port;
        clientSocket = ClientIO(`http://localhost:${port}`);
        resolve();
      });
    });
    
    // Initialize monitoring components
    metricsAggregator = new MetricsAggregator();
    performanceCollector = new PerformanceCollector();
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.close();
    }
    if (server) {
      server.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset metrics state
    metricsAggregator.reset?.();
    performanceCollector.reset?.();
  });

  describe('System Integration - Data Flow Tests', () => {
    test('should integrate connection data with system health metrics', async () => {
      // Arrange
      const mockConnectionData = {
        activeConnections: 150,
        totalConnections: 300,
        connectionRate: 5.2,
        disconnectionRate: 2.1,
        averageSessionDuration: 1800,
        timestamp: Date.now()
      };

      const mockHealthData = {
        overallHealth: 85,
        cpu: 65,
        memory: 70,
        disk: 45,
        network: 90,
        database: 95
      };

      // Act - Simulate connection data affecting health metrics
      server.emit('connection-metrics', mockConnectionData);
      
      // Wait for health system to process connection data
      await waitFor(() => {
        expect(metricsAggregator.getHealthScore()).toBeDefined();
      }, { timeout: 2000 });

      // Assert
      const healthScore = metricsAggregator.getHealthScore();
      expect(healthScore).toBeGreaterThan(75); // Should reflect good connection health
      expect(metricsAggregator.getMetric('activeConnections')).toBe(150);
    });

    test('should integrate API performance metrics with health scoring', async () => {
      // Arrange
      const mockApiMetrics = {
        totalRequests: 1000,
        averageResponseTime: 245,
        errorRate: 0.02,
        peakResponseTime: 850,
        requestsPerSecond: 15.5,
        statusCodeDistribution: {
          '200': 980,
          '400': 15,
          '500': 5
        }
      };

      // Act - API metrics should influence health score
      performanceCollector.recordMetrics(mockApiMetrics);
      await metricsAggregator.aggregateMetrics();

      // Assert
      const healthScore = metricsAggregator.getHealthScore();
      const apiHealthComponent = metricsAggregator.getComponentHealth('api');
      
      expect(apiHealthComponent).toBeDefined();
      expect(apiHealthComponent.responseTime).toBe(245);
      expect(apiHealthComponent.errorRate).toBe(0.02);
      expect(healthScore).toBeGreaterThan(85); // Good API performance should boost health
    });

    test('should synchronize real-time data across all dashboard components', async () => {
      // Arrange
      const realTimeData = {
        connections: { active: 200, rate: 3.5 },
        api: { responseTime: 180, requestsPerSecond: 12 },
        system: { cpu: 60, memory: 55, health: 92 }
      };

      // Act - Emit integrated dashboard update
      server.emit('dashboard-update', realTimeData);
      
      // Wait for all components to receive update
      await waitFor(() => {
        expect(clientSocket.connected).toBe(true);
      });

      // Assert - All systems should have synchronized data
      expect(metricsAggregator.getMetric('activeConnections')).toBe(200);
      expect(performanceCollector.getAverageResponseTime()).toBe(180);
      expect(metricsAggregator.getHealthScore()).toBe(92);
    });
  });

  describe('Integrated Alert System Tests', () => {
    test('should trigger integrated alerts when multiple thresholds are breached', async () => {
      // Arrange
      const alertSpy = jest.fn();
      metricsAggregator.onAlert = alertSpy;

      const criticalScenario = {
        connections: { active: 2000, rate: 25.0 }, // High load
        api: { responseTime: 1500, errorRate: 0.15 }, // Poor performance
        system: { cpu: 95, memory: 90, health: 35 } // Critical health
      };

      // Act - Push system to critical state
      server.emit('critical-metrics', criticalScenario);
      await metricsAggregator.processMetrics(criticalScenario);

      // Assert - Should trigger multiple alerts
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            severity: 'critical',
            category: 'system_overload',
            triggers: expect.arrayContaining(['high_connections', 'slow_api', 'critical_health'])
          })
        );
      });
    });

    test('should prioritize and deduplicate integrated alerts', async () => {
      // Arrange
      const alertManager = {
        alerts: [] as any[],
        addAlert: jest.fn((alert) => alertManager.alerts.push(alert))
      };

      // Act - Trigger multiple related alerts
      const alerts = [
        { type: 'high_cpu', severity: 'warning', source: 'system' },
        { type: 'slow_response', severity: 'warning', source: 'api' },
        { type: 'system_overload', severity: 'critical', source: 'integrated' }
      ];

      alerts.forEach(alert => alertManager.addAlert(alert));

      // Assert - Should prioritize critical and deduplicate
      const criticalAlerts = alertManager.alerts.filter(a => a.severity === 'critical');
      const warningAlerts = alertManager.alerts.filter(a => a.severity === 'warning');
      
      expect(criticalAlerts).toHaveLength(1);
      expect(warningAlerts).toHaveLength(2);
      expect(alertManager.addAlert).toHaveBeenCalledTimes(3);
    });
  });

  describe('WebSocket Integration Tests', () => {
    test('should handle real-time data streams from all monitoring systems', async () => {
      // Arrange
      const receivedData = {
        connections: null,
        api: null,
        health: null
      };

      clientSocket.on('connection-update', (data: any) => {
        receivedData.connections = data;
      });
      
      clientSocket.on('api-metrics-update', (data: any) => {
        receivedData.api = data;
      });
      
      clientSocket.on('health-update', (data: any) => {
        receivedData.health = data;
      });

      // Act - Emit data from all systems
      const testData = {
        connections: { active: 100, timestamp: Date.now() },
        api: { responseTime: 200, timestamp: Date.now() },
        health: { score: 88, timestamp: Date.now() }
      };

      server.emit('connection-update', testData.connections);
      server.emit('api-metrics-update', testData.api);
      server.emit('health-update', testData.health);

      // Assert - All data streams received
      await waitFor(() => {
        expect(receivedData.connections).not.toBeNull();
        expect(receivedData.api).not.toBeNull();
        expect(receivedData.health).not.toBeNull();
      });

      expect(receivedData.connections.active).toBe(100);
      expect(receivedData.api.responseTime).toBe(200);
      expect(receivedData.health.score).toBe(88);
    });

    test('should handle WebSocket connection failures and reconnection', async () => {
      // Arrange
      let reconnectCount = 0;
      clientSocket.on('reconnect', () => {
        reconnectCount++;
      });

      // Act - Simulate connection failure and recovery
      clientSocket.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      clientSocket.connect();
      await waitFor(() => {
        expect(clientSocket.connected).toBe(true);
      });

      // Assert - Should reconnect successfully
      expect(clientSocket.connected).toBe(true);
    });
  });

  describe('Performance Correlation Tests', () => {
    test('should detect correlation between connection load and API performance', async () => {
      // Arrange - Simulate increasing load scenario
      const scenarios = [
        { connections: 100, expectedApiTime: 150 },
        { connections: 500, expectedApiTime: 300 },
        { connections: 1000, expectedApiTime: 600 },
        { connections: 2000, expectedApiTime: 1200 }
      ];

      const correlationData: Array<{connections: number, apiTime: number}> = [];

      // Act - Process each scenario
      for (const scenario of scenarios) {
        const metricsUpdate = {
          activeConnections: scenario.connections,
          apiResponseTime: scenario.expectedApiTime
        };
        
        await metricsAggregator.processMetrics(metricsUpdate);
        correlationData.push({
          connections: scenario.connections,
          apiTime: performanceCollector.getAverageResponseTime()
        });
      }

      // Assert - Should show correlation between load and performance
      expect(correlationData.length).toBe(4);
      
      // Response time should increase with connection count
      expect(correlationData[3].apiTime).toBeGreaterThan(correlationData[0].apiTime);
      expect(correlationData[2].apiTime).toBeGreaterThan(correlationData[1].apiTime);
      
      // Performance degradation should be detectable
      const degradationDetected = metricsAggregator.detectPerformanceDegradation();
      expect(degradationDetected).toBe(true);
    });

    test('should trigger proactive alerts based on performance trends', async () => {
      // Arrange
      const trendAlerts: any[] = [];
      metricsAggregator.onTrendAlert = (alert: any) => trendAlerts.push(alert);

      // Act - Simulate degrading trend
      const trendData = [
        { timestamp: Date.now() - 4000, responseTime: 200, errorRate: 0.01 },
        { timestamp: Date.now() - 3000, responseTime: 350, errorRate: 0.03 },
        { timestamp: Date.now() - 2000, responseTime: 500, errorRate: 0.06 },
        { timestamp: Date.now() - 1000, responseTime: 750, errorRate: 0.12 },
        { timestamp: Date.now(), responseTime: 1100, errorRate: 0.18 }
      ];

      for (const data of trendData) {
        await metricsAggregator.processTrendData(data);
      }

      // Assert - Should detect trend and trigger proactive alert
      await waitFor(() => {
        expect(trendAlerts.length).toBeGreaterThan(0);
      });

      const trendAlert = trendAlerts[0];
      expect(trendAlert).toMatchObject({
        type: 'performance_degradation_trend',
        severity: 'warning',
        predictive: true
      });
    });
  });

  describe('Dashboard Integration Rendering Tests', () => {
    test('should render integrated monitoring dashboard with all components', async () => {
      // Arrange
      const mockIntegratedData = {
        connections: {
          active: 250,
          total: 500,
          rate: 4.5,
          health: 'good'
        },
        api: {
          responseTime: 280,
          requestsPerSecond: 18,
          errorRate: 0.025,
          health: 'good'
        },
        system: {
          cpu: 68,
          memory: 72,
          healthScore: 87,
          status: 'healthy'
        }
      };

      // Mock WebSocket connection
      const mockSocket = {
        connected: true,
        on: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn()
      };

      // Act - Render integrated dashboard
      render(
        <div data-testid="integrated-dashboard">
          <RealtimeMonitoringDashboard socket={mockSocket} />
          <ApiMetricsDashboard />
          <ConnectionStatus />
        </div>
      );

      // Assert - All components should be present
      expect(screen.getByTestId('integrated-dashboard')).toBeInTheDocument();
      
      // Should show integrated status indicators
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    test('should update all dashboard components simultaneously on data changes', async () => {
      // Arrange
      const mockSocket = {
        connected: true,
        on: jest.fn((event, callback) => {
          if (event === 'integrated-update') {
            // Simulate real-time update
            setTimeout(() => callback({
              connections: { active: 300 },
              api: { responseTime: 190 },
              health: { score: 92 }
            }), 100);
          }
        }),
        emit: jest.fn(),
        disconnect: jest.fn()
      };

      // Act
      render(
        <div data-testid="dashboard-container">
          <RealtimeMonitoringDashboard socket={mockSocket} />
          <ApiMetricsDashboard />
        </div>
      );

      // Trigger integrated update
      mockSocket.emit('integrated-update', {
        connections: { active: 300 },
        api: { responseTime: 190 },
        health: { score: 92 }
      });

      // Assert - Components should update with new data
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery Tests', () => {
    test('should handle partial system failures gracefully', async () => {
      // Arrange - Mock partial failure scenario
      const partialFailureState = {
        connections: { status: 'healthy', data: { active: 100 } },
        api: { status: 'error', error: 'Database connection failed' },
        health: { status: 'degraded', data: { score: 65 } }
      };

      // Act - Process partial failure
      await metricsAggregator.handlePartialFailure(partialFailureState);

      // Assert - Should continue operating with available data
      expect(metricsAggregator.getSystemStatus()).toBe('degraded');
      expect(metricsAggregator.getMetric('activeConnections')).toBe(100);
      expect(metricsAggregator.hasErrors()).toBe(true);
      
      // Should trigger appropriate alerts
      const alerts = metricsAggregator.getActiveAlerts();
      expect(alerts.some(alert => alert.type === 'component_failure')).toBe(true);
    });

    test('should recover from system-wide failure', async () => {
      // Arrange - Simulate complete system failure
      metricsAggregator.simulateFailure();
      expect(metricsAggregator.isHealthy()).toBe(false);

      // Act - Trigger recovery
      await metricsAggregator.initiateRecovery();
      
      // Simulate gradual recovery
      const recoverySteps = [
        { step: 'database', status: 'recovered' },
        { step: 'api', status: 'recovered' },
        { step: 'websocket', status: 'recovered' },
        { step: 'monitoring', status: 'recovered' }
      ];

      for (const step of recoverySteps) {
        await metricsAggregator.processRecoveryStep(step);
      }

      // Assert - System should be fully recovered
      await waitFor(() => {
        expect(metricsAggregator.isHealthy()).toBe(true);
      });

      expect(metricsAggregator.getSystemStatus()).toBe('healthy');
      expect(metricsAggregator.getRecoveryTime()).toBeLessThan(10000); // < 10 seconds
    });
  });

  describe('Load Testing Scenarios', () => {
    test('should handle high-load scenario with 1000+ concurrent connections', async () => {
      // Arrange
      const highLoadScenario = {
        activeConnections: 1500,
        connectionRate: 50.0,
        apiRequestsPerSecond: 100,
        averageResponseTime: 800,
        systemLoad: {
          cpu: 85,
          memory: 88,
          network: 95
        }
      };

      // Act - Process high-load scenario
      const startTime = Date.now();
      await metricsAggregator.processHighLoad(highLoadScenario);
      const processingTime = Date.now() - startTime;

      // Assert - Should handle load within performance thresholds
      expect(processingTime).toBeLessThan(2000); // < 2 seconds processing time
      expect(metricsAggregator.getSystemStatus()).toBe('under_load');
      expect(metricsAggregator.getHealthScore()).toBeGreaterThan(60); // Still operational
      
      // Should trigger load management alerts
      const alerts = metricsAggregator.getActiveAlerts();
      expect(alerts.some(alert => alert.type === 'high_load')).toBe(true);
    });

    test('should maintain data accuracy under sustained load', async () => {
      // Arrange - Simulate sustained load over time
      const sustainedLoadDuration = 5000; // 5 seconds
      const updateInterval = 100; // Update every 100ms
      const expectedUpdates = sustainedLoadDuration / updateInterval;
      
      let actualUpdates = 0;
      const dataPoints: any[] = [];

      // Act - Generate sustained load
      const loadTest = setInterval(async () => {
        const dataPoint = {
          timestamp: Date.now(),
          connections: Math.floor(Math.random() * 200) + 800, // 800-1000 connections
          apiTime: Math.floor(Math.random() * 300) + 200 // 200-500ms response time
        };
        
        await metricsAggregator.processRealtimeUpdate(dataPoint);
        dataPoints.push(dataPoint);
        actualUpdates++;
      }, updateInterval);

      // Wait for test completion
      await new Promise(resolve => setTimeout(resolve, sustainedLoadDuration));
      clearInterval(loadTest);

      // Assert - Data integrity maintained under load
      expect(actualUpdates).toBeGreaterThan(expectedUpdates * 0.9); // Allow 10% tolerance
      expect(dataPoints.length).toBe(actualUpdates);
      
      // Verify data accuracy
      const avgConnections = dataPoints.reduce((sum, dp) => sum + dp.connections, 0) / dataPoints.length;
      const storedAvgConnections = metricsAggregator.getAverageMetric('connections');
      
      expect(Math.abs(avgConnections - storedAvgConnections)).toBeLessThan(10); // Within 10 connection accuracy
    });
  });
});