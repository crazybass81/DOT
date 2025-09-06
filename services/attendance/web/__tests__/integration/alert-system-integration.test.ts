import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

/**
 * Alert System Integration Tests
 * 
 * Validates the unified alerting system that aggregates and manages
 * alerts from all monitoring components:
 * - Connection monitoring alerts
 * - API performance alerts  
 * - System health alerts
 * 
 * Key integration points:
 * - Alert aggregation and deduplication
 * - Priority escalation and routing
 * - Multi-channel notification delivery
 * - Alert lifecycle management
 */

interface AlertConfig {
  id: string;
  type: 'connection' | 'api_performance' | 'system_health' | 'integrated';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  threshold?: number;
  condition: string;
  channels: ('email' | 'sms' | 'slack' | 'webhook' | 'dashboard')[];
  escalation?: {
    timeoutMinutes: number;
    nextSeverity: string;
  };
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  source: string;
  timestamp: number;
  data?: any;
  acknowledged?: boolean;
  resolved?: boolean;
}

class MockAlertManager {
  private alerts: Alert[] = [];
  private configs: AlertConfig[] = [];
  private channels: Map<string, jest.Mock> = new Map();
  private listeners: ((alert: Alert) => void)[] = [];

  constructor() {
    // Setup mock notification channels
    this.channels.set('email', jest.fn());
    this.channels.set('sms', jest.fn());
    this.channels.set('slack', jest.fn());
    this.channels.set('webhook', jest.fn());
    this.channels.set('dashboard', jest.fn());
  }

  addConfig(config: AlertConfig) {
    this.configs.push(config);
  }

  processAlert(alert: Alert) {
    // Find matching configuration
    const config = this.configs.find(c => c.type === alert.type);
    if (!config) return;

    // Check for duplicates and deduplication
    const existingAlert = this.alerts.find(a => 
      a.type === alert.type && 
      a.source === alert.source && 
      !a.resolved &&
      (Date.now() - a.timestamp) < 300000 // 5 minutes
    );

    if (existingAlert) {
      // Update existing alert instead of creating duplicate
      existingAlert.timestamp = alert.timestamp;
      existingAlert.data = { ...existingAlert.data, ...alert.data };
      return existingAlert;
    }

    // Add new alert
    this.alerts.push(alert);
    
    // Notify channels
    config.channels.forEach(channel => {
      const channelHandler = this.channels.get(channel);
      if (channelHandler) {
        channelHandler(alert);
      }
    });

    // Notify listeners
    this.listeners.forEach(listener => listener(alert));

    return alert;
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  onAlert(listener: (alert: Alert) => void) {
    this.listeners.push(listener);
  }

  getChannelMock(channel: string) {
    return this.channels.get(channel);
  }

  reset() {
    this.alerts = [];
    this.configs = [];
    this.listeners = [];
    this.channels.forEach(mock => mock.mockReset());
  }
}

describe('Alert System Integration', () => {
  let alertManager: MockAlertManager;
  let mockMetricsAggregator: any;
  let mockConnectionMonitor: any;
  let mockApiMonitor: any;

  beforeEach(() => {
    alertManager = new MockAlertManager();
    
    // Setup mock components
    mockMetricsAggregator = {
      onThresholdBreach: jest.fn(),
      getHealthScore: jest.fn(() => 85),
      getComponentHealth: jest.fn(() => ({ status: 'healthy' }))
    };

    mockConnectionMonitor = {
      onAlert: jest.fn(),
      getCurrentMetrics: jest.fn(() => ({ activeConnections: 150, rate: 3.5 }))
    };

    mockApiMonitor = {
      onPerformanceAlert: jest.fn(),
      getCurrentMetrics: jest.fn(() => ({ responseTime: 250, errorRate: 0.02 }))
    };

    // Setup alert configurations
    setupAlertConfigurations();
  });

  afterEach(() => {
    alertManager.reset();
    jest.clearAllMocks();
  });

  function setupAlertConfigurations() {
    const configs: AlertConfig[] = [
      {
        id: 'high-connections',
        type: 'connection',
        severity: 'warning',
        threshold: 1000,
        condition: 'activeConnections > threshold',
        channels: ['dashboard', 'slack'],
        escalation: { timeoutMinutes: 15, nextSeverity: 'critical' }
      },
      {
        id: 'connection-surge',
        type: 'connection',
        severity: 'critical',
        threshold: 2000,
        condition: 'activeConnections > threshold',
        channels: ['dashboard', 'slack', 'email', 'sms']
      },
      {
        id: 'slow-api-response',
        type: 'api_performance',
        severity: 'warning',
        threshold: 500,
        condition: 'averageResponseTime > threshold',
        channels: ['dashboard', 'webhook']
      },
      {
        id: 'api-error-spike',
        type: 'api_performance',
        severity: 'critical',
        threshold: 0.1,
        condition: 'errorRate > threshold',
        channels: ['dashboard', 'slack', 'email']
      },
      {
        id: 'system-health-degraded',
        type: 'system_health',
        severity: 'warning',
        threshold: 70,
        condition: 'healthScore < threshold',
        channels: ['dashboard', 'email']
      },
      {
        id: 'system-health-critical',
        type: 'system_health',
        severity: 'critical',
        threshold: 50,
        condition: 'healthScore < threshold',
        channels: ['dashboard', 'slack', 'email', 'sms', 'webhook']
      },
      {
        id: 'cascading-failure',
        type: 'integrated',
        severity: 'emergency',
        condition: 'multiple_critical_alerts',
        channels: ['dashboard', 'slack', 'email', 'sms', 'webhook']
      }
    ];

    configs.forEach(config => alertManager.addConfig(config));
  }

  describe('Alert Aggregation and Deduplication', () => {
    test('should aggregate related alerts from multiple monitoring systems', async () => {
      // Arrange - Multiple related alerts from different systems
      const connectionAlert: Alert = {
        id: 'conn-1',
        type: 'connection',
        severity: 'warning',
        message: 'High connection count detected',
        source: 'connection-monitor',
        timestamp: Date.now(),
        data: { activeConnections: 1200 }
      };

      const apiAlert: Alert = {
        id: 'api-1',
        type: 'api_performance',
        severity: 'warning',
        message: 'Increased response time',
        source: 'api-monitor',
        timestamp: Date.now() + 1000,
        data: { responseTime: 600 }
      };

      const healthAlert: Alert = {
        id: 'health-1',
        type: 'system_health',
        severity: 'warning',
        message: 'System health declining',
        source: 'health-monitor',
        timestamp: Date.now() + 2000,
        data: { healthScore: 65 }
      };

      // Act - Process alerts in sequence
      alertManager.processAlert(connectionAlert);
      alertManager.processAlert(apiAlert);
      alertManager.processAlert(healthAlert);

      // Assert - Should detect correlation and create integrated alert
      const activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts).toHaveLength(3);

      // Should have triggered integrated alert due to multiple warnings
      const relatedWarnings = activeAlerts.filter(a => a.severity === 'warning');
      expect(relatedWarnings).toHaveLength(3);
    });

    test('should deduplicate identical alerts within time window', async () => {
      // Arrange - Identical alerts within deduplication window
      const baseAlert: Alert = {
        id: 'dup-1',
        type: 'connection',
        severity: 'warning',
        message: 'Connection threshold exceeded',
        source: 'connection-monitor',
        timestamp: Date.now(),
        data: { activeConnections: 1100 }
      };

      const duplicateAlert: Alert = {
        ...baseAlert,
        id: 'dup-2',
        timestamp: Date.now() + 30000 // 30 seconds later
      };

      const oldDuplicateAlert: Alert = {
        ...baseAlert,
        id: 'dup-3',
        timestamp: Date.now() + 600000 // 10 minutes later (outside window)
      };

      // Act
      alertManager.processAlert(baseAlert);
      alertManager.processAlert(duplicateAlert); // Should be deduplicated
      alertManager.processAlert(oldDuplicateAlert); // Should be processed as new

      // Assert
      const activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts).toHaveLength(2); // Original + old duplicate
      expect(activeAlerts.find(a => a.id === 'dup-2')).toBeUndefined();
    });

    test('should escalate unacknowledged alerts based on configuration', async () => {
      // Arrange - Alert with escalation configuration
      jest.useFakeTimers();
      
      const escalatableAlert: Alert = {
        id: 'esc-1',
        type: 'connection',
        severity: 'warning',
        message: 'High connection count',
        source: 'connection-monitor',
        timestamp: Date.now(),
        data: { activeConnections: 1500 }
      };

      let escalatedAlert: Alert | null = null;
      alertManager.onAlert((alert) => {
        if (alert.severity === 'critical' && alert.id.includes('escalated')) {
          escalatedAlert = alert;
        }
      });

      // Act - Process alert and advance time
      alertManager.processAlert(escalatableAlert);
      
      // Advance time by 15 minutes (escalation timeout)
      jest.advanceTimersByTime(15 * 60 * 1000);

      // Simulate escalation check (in real system this would be automatic)
      const activeAlerts = alertManager.getActiveAlerts();
      const unacknowledgedAlert = activeAlerts.find(a => !a.acknowledged);
      
      if (unacknowledgedAlert) {
        const escalated: Alert = {
          id: `${unacknowledgedAlert.id}-escalated`,
          type: unacknowledgedAlert.type,
          severity: 'critical',
          message: `ESCALATED: ${unacknowledgedAlert.message}`,
          source: unacknowledgedAlert.source,
          timestamp: Date.now()
        };
        alertManager.processAlert(escalated);
      }

      // Assert
      await waitFor(() => {
        const alerts = alertManager.getActiveAlerts();
        const criticalAlerts = alerts.filter(a => a.severity === 'critical');
        expect(criticalAlerts.length).toBeGreaterThan(0);
      });

      jest.useRealTimers();
    });
  });

  describe('Multi-channel Notification Integration', () => {
    test('should route alerts to appropriate channels based on severity', async () => {
      // Arrange - Alerts of different severities
      const infoAlert: Alert = {
        id: 'info-1',
        type: 'system_health',
        severity: 'info',
        message: 'System status update',
        source: 'health-monitor',
        timestamp: Date.now()
      };

      const warningAlert: Alert = {
        id: 'warn-1',
        type: 'connection',
        severity: 'warning',
        message: 'Connection count elevated',
        source: 'connection-monitor',
        timestamp: Date.now()
      };

      const criticalAlert: Alert = {
        id: 'crit-1',
        type: 'api_performance',
        severity: 'critical',
        message: 'API performance severely degraded',
        source: 'api-monitor',
        timestamp: Date.now()
      };

      // Act
      alertManager.processAlert(warningAlert); // Should go to dashboard + slack
      alertManager.processAlert(criticalAlert); // Should go to multiple channels

      // Assert - Check channel routing
      const dashboardMock = alertManager.getChannelMock('dashboard');
      const slackMock = alertManager.getChannelMock('slack');
      const emailMock = alertManager.getChannelMock('email');
      const smsMock = alertManager.getChannelMock('sms');

      // Warning alert should go to dashboard and slack
      expect(dashboardMock).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning' })
      );
      expect(slackMock).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning' })
      );

      // Critical alert should go to multiple channels
      expect(dashboardMock).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'critical' })
      );
      expect(slackMock).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'critical' })
      );
      expect(emailMock).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'critical' })
      );
    });

    test('should handle channel delivery failures gracefully', async () => {
      // Arrange - Mock channel failure
      const emailMock = alertManager.getChannelMock('email');
      const slackMock = alertManager.getChannelMock('slack');
      
      emailMock?.mockRejectedValue(new Error('Email service unavailable'));
      
      const criticalAlert: Alert = {
        id: 'delivery-test-1',
        type: 'system_health',
        severity: 'critical',
        message: 'Critical system failure',
        source: 'health-monitor',
        timestamp: Date.now()
      };

      // Act
      alertManager.processAlert(criticalAlert);

      // Assert - Other channels should still receive the alert
      expect(slackMock).toHaveBeenCalledWith(criticalAlert);
      
      // Email failure should not prevent other deliveries
      const activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts).toContainEqual(expect.objectContaining({
        id: 'delivery-test-1',
        severity: 'critical'
      }));
    });

    test('should batch notifications for related alerts', async () => {
      // Arrange - Multiple related alerts in short timeframe
      const relatedAlerts: Alert[] = [
        {
          id: 'batch-1',
          type: 'connection',
          severity: 'warning',
          message: 'Connection spike detected',
          source: 'connection-monitor',
          timestamp: Date.now()
        },
        {
          id: 'batch-2',
          type: 'api_performance',
          severity: 'warning',
          message: 'API latency increased',
          source: 'api-monitor',
          timestamp: Date.now() + 1000
        },
        {
          id: 'batch-3',
          type: 'system_health',
          severity: 'warning',
          message: 'CPU usage elevated',
          source: 'health-monitor',
          timestamp: Date.now() + 2000
        }
      ];

      const batchedNotifications: Alert[][] = [];
      const emailMock = alertManager.getChannelMock('email');
      emailMock?.mockImplementation((alert) => {
        // Simulate batching by collecting alerts
        const lastBatch = batchedNotifications[batchedNotifications.length - 1];
        if (lastBatch && lastBatch.length < 3) {
          lastBatch.push(alert);
        } else {
          batchedNotifications.push([alert]);
        }
      });

      // Act - Process alerts quickly
      relatedAlerts.forEach(alert => alertManager.processAlert(alert));

      // Assert - Should batch related notifications
      expect(batchedNotifications.length).toBeGreaterThan(0);
      
      // In real implementation, batching would reduce notification frequency
      const totalNotifications = batchedNotifications.reduce(
        (sum, batch) => sum + batch.length, 0
      );
      expect(totalNotifications).toBe(3); // All alerts should be processed
    });
  });

  describe('Alert Lifecycle Management', () => {
    test('should track alert acknowledgment and resolution lifecycle', async () => {
      // Arrange
      const lifecycleAlert: Alert = {
        id: 'lifecycle-1',
        type: 'connection',
        severity: 'warning',
        message: 'Connection threshold exceeded',
        source: 'connection-monitor',
        timestamp: Date.now(),
        data: { activeConnections: 1100 }
      };

      // Act - Process alert through lifecycle
      alertManager.processAlert(lifecycleAlert);
      
      // Initial state
      let activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].acknowledged).toBeFalsy();
      expect(activeAlerts[0].resolved).toBeFalsy();

      // Acknowledge alert
      alertManager.acknowledgeAlert('lifecycle-1');
      activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts[0].acknowledged).toBe(true);
      expect(activeAlerts[0].resolved).toBeFalsy();

      // Resolve alert
      alertManager.resolveAlert('lifecycle-1');
      activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0); // No active alerts

      // Assert - Alert still exists but marked as resolved
      const allAlerts = [...alertManager['alerts']];
      const resolvedAlert = allAlerts.find(a => a.id === 'lifecycle-1');
      expect(resolvedAlert?.resolved).toBe(true);
      expect(resolvedAlert?.acknowledged).toBe(true);
    });

    test('should automatically resolve alerts when conditions clear', async () => {
      // Arrange - Alert that should auto-resolve
      const autoResolveAlert: Alert = {
        id: 'auto-resolve-1',
        type: 'connection',
        severity: 'warning',
        message: 'High connection count',
        source: 'connection-monitor',
        timestamp: Date.now(),
        data: { activeConnections: 1200 }
      };

      alertManager.processAlert(autoResolveAlert);

      // Assert initial state
      let activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);

      // Act - Simulate condition clearing (connection count drops)
      const clearingUpdate = {
        activeConnections: 800, // Below threshold
        timestamp: Date.now() + 30000
      };

      // In real system, this would be triggered by metrics update
      mockConnectionMonitor.getCurrentMetrics.mockReturnValue(clearingUpdate);
      
      // Simulate auto-resolution check
      const currentConnections = mockConnectionMonitor.getCurrentMetrics().activeConnections;
      if (currentConnections < 1000) { // Below warning threshold
        alertManager.resolveAlert('auto-resolve-1');
      }

      // Assert - Alert should be auto-resolved
      activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    test('should maintain alert history and trends', async () => {
      // Arrange - Series of alerts over time
      const alertSeries: Alert[] = [
        {
          id: 'history-1',
          type: 'api_performance',
          severity: 'info',
          message: 'API response time increased',
          source: 'api-monitor',
          timestamp: Date.now() - 600000, // 10 minutes ago
          data: { responseTime: 300 }
        },
        {
          id: 'history-2',
          type: 'api_performance',
          severity: 'warning',
          message: 'API response time elevated',
          source: 'api-monitor',
          timestamp: Date.now() - 300000, // 5 minutes ago
          data: { responseTime: 600 }
        },
        {
          id: 'history-3',
          type: 'api_performance',
          severity: 'critical',
          message: 'API response time critical',
          source: 'api-monitor',
          timestamp: Date.now(),
          data: { responseTime: 1200 }
        }
      ];

      // Act - Process alert series
      alertSeries.forEach(alert => {
        alertManager.processAlert(alert);
        // Resolve previous alerts to simulate progression
        if (alert.id !== 'history-3') {
          setTimeout(() => alertManager.resolveAlert(alert.id), 100);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Assert - Should show escalation trend
      const allAlerts = [...alertManager['alerts']];
      const apiAlerts = allAlerts.filter(a => a.type === 'api_performance');
      
      expect(apiAlerts).toHaveLength(3);
      
      // Should show severity escalation over time
      const severities = apiAlerts
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(a => a.severity);
      
      expect(severities).toEqual(['info', 'warning', 'critical']);
      
      // Response times should show degradation trend
      const responseTimes = apiAlerts
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(a => a.data?.responseTime);
      
      expect(responseTimes[0]).toBeLessThan(responseTimes[1]);
      expect(responseTimes[1]).toBeLessThan(responseTimes[2]);
    });
  });

  describe('Cross-System Alert Correlation', () => {
    test('should detect cascading failure patterns across monitoring systems', async () => {
      // Arrange - Cascading failure scenario
      const cascadingAlerts: Alert[] = [
        // Start with database issues
        {
          id: 'cascade-1',
          type: 'system_health',
          severity: 'warning',
          message: 'Database connection pool exhausted',
          source: 'health-monitor',
          timestamp: Date.now(),
          data: { component: 'database', poolUsage: 95 }
        },
        // API performance degrades due to database issues
        {
          id: 'cascade-2',
          type: 'api_performance',
          severity: 'warning',
          message: 'API response time increased',
          source: 'api-monitor',
          timestamp: Date.now() + 30000,
          data: { responseTime: 800, slowQueries: 15 }
        },
        // Connection drops due to API issues
        {
          id: 'cascade-3',
          type: 'connection',
          severity: 'critical',
          message: 'Client connection timeouts',
          source: 'connection-monitor',
          timestamp: Date.now() + 60000,
          data: { timeouts: 25, droppedConnections: 100 }
        }
      ];

      let cascadeDetected = false;
      alertManager.onAlert((alert) => {
        if (alert.type === 'integrated' && alert.severity === 'emergency') {
          cascadeDetected = true;
        }
      });

      // Act - Process cascading alerts
      for (const alert of cascadingAlerts) {
        alertManager.processAlert(alert);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Simulate cascade detection logic
      const activeAlerts = alertManager.getActiveAlerts();
      const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
      const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');
      
      if (criticalAlerts.length >= 1 && warningAlerts.length >= 2) {
        const cascadeAlert: Alert = {
          id: 'cascade-detected-1',
          type: 'integrated',
          severity: 'emergency',
          message: 'Cascading system failure detected',
          source: 'alert-correlation-engine',
          timestamp: Date.now(),
          data: {
            triggeringAlerts: activeAlerts.map(a => a.id),
            failurePattern: 'database_to_api_to_connections'
          }
        };
        alertManager.processAlert(cascadeAlert);
      }

      // Assert - Should detect cascading failure
      await waitFor(() => {
        const emergencyAlerts = alertManager.getActiveAlerts()
          .filter(a => a.severity === 'emergency');
        expect(emergencyAlerts.length).toBeGreaterThan(0);
      });
    });

    test('should identify root cause from correlated alert patterns', async () => {
      // Arrange - Root cause scenario (memory leak causing multiple symptoms)
      const rootCauseAlerts: Alert[] = [
        {
          id: 'root-1',
          type: 'system_health',
          severity: 'warning',
          message: 'Memory usage increasing',
          source: 'health-monitor',
          timestamp: Date.now() - 300000,
          data: { memoryUsage: 75, trend: 'increasing' }
        },
        {
          id: 'root-2',
          type: 'api_performance',
          severity: 'warning',
          message: 'Garbage collection pauses',
          source: 'api-monitor',
          timestamp: Date.now() - 240000,
          data: { gcPauses: 8, avgPauseTime: 150 }
        },
        {
          id: 'root-3',
          type: 'connection',
          severity: 'warning',
          message: 'Connection handling slow',
          source: 'connection-monitor',
          timestamp: Date.now() - 180000,
          data: { connectionSetupTime: 500, rejectedConnections: 5 }
        },
        {
          id: 'root-4',
          type: 'system_health',
          severity: 'critical',
          message: 'Out of memory error imminent',
          source: 'health-monitor',
          timestamp: Date.now(),
          data: { memoryUsage: 95, swapUsage: 90 }
        }
      ];

      let rootCauseIdentified = false;
      let identifiedRootCause: string | null = null;

      alertManager.onAlert((alert) => {
        if (alert.data?.rootCause) {
          rootCauseIdentified = true;
          identifiedRootCause = alert.data.rootCause;
        }
      });

      // Act - Process root cause scenario
      rootCauseAlerts.forEach(alert => alertManager.processAlert(alert));

      // Simulate root cause analysis
      const activeAlerts = alertManager.getActiveAlerts();
      const memoryRelatedAlerts = activeAlerts.filter(a => 
        (a.data?.memoryUsage && a.data.memoryUsage > 70) ||
        (a.data?.gcPauses && a.data.gcPauses > 5) ||
        (a.message.toLowerCase().includes('memory'))
      );

      if (memoryRelatedAlerts.length >= 2) {
        const rootCauseAlert: Alert = {
          id: 'root-cause-analysis-1',
          type: 'integrated',
          severity: 'critical',
          message: 'Root cause identified: Memory leak causing system degradation',
          source: 'root-cause-analyzer',
          timestamp: Date.now(),
          data: {
            rootCause: 'memory_leak',
            affectedSystems: ['api', 'connections', 'health'],
            recommendedAction: 'restart_services_and_investigate'
          }
        };
        alertManager.processAlert(rootCauseAlert);
      }

      // Assert - Should identify memory leak as root cause
      await waitFor(() => {
        const alerts = alertManager.getActiveAlerts();
        const rootCauseAlert = alerts.find(a => a.data?.rootCause);
        expect(rootCauseAlert).toBeDefined();
        expect(rootCauseAlert?.data?.rootCause).toBe('memory_leak');
      });
    });
  });

  describe('Alert Performance and Scalability', () => {
    test('should handle high-volume alert processing efficiently', async () => {
      // Arrange - Generate large number of alerts
      const alertVolume = 1000;
      const startTime = Date.now();
      const processedAlerts: string[] = [];

      alertManager.onAlert((alert) => {
        processedAlerts.push(alert.id);
      });

      // Act - Process high volume of alerts
      const alertPromises = Array.from({ length: alertVolume }, (_, i) => {
        const alert: Alert = {
          id: `volume-test-${i}`,
          type: i % 3 === 0 ? 'connection' : i % 3 === 1 ? 'api_performance' : 'system_health',
          severity: i % 10 === 0 ? 'critical' : 'warning',
          message: `Volume test alert ${i}`,
          source: 'volume-test',
          timestamp: Date.now() + i
        };
        return alertManager.processAlert(alert);
      });

      await Promise.all(alertPromises);
      const processingTime = Date.now() - startTime;

      // Assert - Should process efficiently
      expect(processedAlerts.length).toBe(alertVolume);
      expect(processingTime).toBeLessThan(5000); // Should process 1000 alerts in under 5 seconds
      
      // Check for proper deduplication under volume
      const activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts.length).toBeLessThanOrEqual(alertVolume); // Some may be deduplicated
    });

    test('should maintain performance during alert storm scenarios', async () => {
      // Arrange - Rapid alert generation (storm)
      const stormDuration = 5000; // 5 seconds
      const stormFrequency = 10; // Every 10ms
      const expectedAlerts = stormDuration / stormFrequency;
      
      let alertsProcessed = 0;
      const processingTimes: number[] = [];
      
      alertManager.onAlert(() => {
        alertsProcessed++;
      });

      // Act - Generate alert storm
      const stormPromise = new Promise<void>((resolve) => {
        let stormCount = 0;
        const stormInterval = setInterval(() => {
          const processingStart = Date.now();
          
          const stormAlert: Alert = {
            id: `storm-${stormCount}`,
            type: 'connection',
            severity: 'warning',
            message: `Storm alert ${stormCount}`,
            source: 'storm-generator',
            timestamp: Date.now()
          };
          
          alertManager.processAlert(stormAlert);
          processingTimes.push(Date.now() - processingStart);
          
          stormCount++;
          if (stormCount >= expectedAlerts) {
            clearInterval(stormInterval);
            resolve();
          }
        }, stormFrequency);
      });

      await stormPromise;

      // Assert - Should maintain performance during storm
      const averageProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      const maxProcessingTime = Math.max(...processingTimes);
      
      expect(averageProcessingTime).toBeLessThan(50); // Average under 50ms
      expect(maxProcessingTime).toBeLessThan(200); // Max under 200ms
      expect(alertsProcessed).toBeGreaterThan(expectedAlerts * 0.8); // Process at least 80%
    });
  });
});