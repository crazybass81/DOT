/**
 * Basic Health System Test
 * Quick verification that our implementations work
 */

import { HealthChecker } from '../src/lib/health/health-checker';
import { AlertManager } from '../src/lib/alerts/alert-manager';
import { MetricsAggregator } from '../src/lib/health/metrics-aggregator';
import { HealthStatus, SystemComponent } from '../src/types/health';
import { AlertType, AlertSeverity, AlertStatus } from '../src/types/alerts';

describe('Health System Basic Tests', () => {
  test('HealthChecker can be instantiated and check database health', async () => {
    const healthChecker = new HealthChecker();
    expect(healthChecker).toBeDefined();
    
    const result = await healthChecker.checkDatabaseHealth();
    expect(result).toHaveProperty('component', SystemComponent.DATABASE);
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('responseTime');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('details');
  });

  test('AlertManager can create and manage alerts', async () => {
    const alertManager = new AlertManager();
    expect(alertManager).toBeDefined();
    
    const alert = await alertManager.createAlert({
      type: AlertType.COMPONENT_FAILURE,
      severity: AlertSeverity.HIGH,
      status: AlertStatus.ACTIVE,
      title: 'Test Alert',
      message: 'Test alert message',
      metadata: {},
      source: 'test'
    });
    
    expect(alert).toHaveProperty('id');
    expect(alert).toHaveProperty('type', AlertType.COMPONENT_FAILURE);
    expect(alert).toHaveProperty('severity', AlertSeverity.HIGH);
    expect(alert).toHaveProperty('createdAt');
  });

  test('MetricsAggregator can fetch connection metrics', async () => {
    const metricsAggregator = new MetricsAggregator();
    expect(metricsAggregator).toBeDefined();
    
    const connectionMetrics = await metricsAggregator.getConnectionMetrics();
    expect(connectionMetrics).toHaveProperty('totalConnections');
    expect(connectionMetrics).toHaveProperty('authenticatedConnections');
    expect(connectionMetrics).toHaveProperty('activeChannels');
    expect(connectionMetrics).toHaveProperty('lastUpdated');
  });

  test('HealthChecker can calculate overall health score', async () => {
    const healthChecker = new HealthChecker();
    
    const score = await healthChecker.calculateOverallHealthScore();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('AlertManager can get alert statistics', async () => {
    const alertManager = new AlertManager();
    
    // Create a few alerts first
    await alertManager.createAlert({
      type: AlertType.HIGH_CPU_USAGE,
      severity: AlertSeverity.MEDIUM,
      status: AlertStatus.ACTIVE,
      title: 'CPU Alert',
      message: 'CPU usage high',
      metadata: {},
      source: 'test'
    });

    const stats = await alertManager.getAlertStats();
    expect(stats).toHaveProperty('totalActive');
    expect(stats).toHaveProperty('totalResolved');
    expect(stats).toHaveProperty('bySeverity');
    expect(stats).toHaveProperty('byComponent');
    expect(stats).toHaveProperty('avgResolutionTime');
  });
});