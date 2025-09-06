/**
 * Alert Manager Test Suite  
 * Phase 3.3.3.3 - Alert System Testing
 * TDD Implementation: RED Phase - Failing Tests
 */

import { AlertManager } from '@/lib/alerts/alert-manager';
import { 
  Alert, 
  AlertType, 
  AlertSeverity, 
  AlertStatus, 
  NotificationChannel,
  AlertRule,
  AlertCondition
} from '@/types/alerts';
import { SystemComponent } from '@/types/health';

describe('AlertManager', () => {
  let alertManager: AlertManager;

  beforeEach(() => {
    alertManager = new AlertManager();
  });

  describe('Alert Creation and Management', () => {
    test('should create a new alert', async () => {
      const alertData = {
        type: AlertType.COMPONENT_FAILURE,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        title: 'Database Connection Failed',
        message: 'Database connection lost - unable to connect to PostgreSQL',
        component: SystemComponent.DATABASE,
        metricValue: 0,
        threshold: 1,
        metadata: { endpoint: 'postgresql://localhost:5432' },
        source: 'health-checker',
        count: 1,
        lastOccurrence: new Date()
      };

      const alert = await alertManager.createAlert(alertData);

      expect(alert).toMatchObject({
        id: expect.any(String),
        createdAt: expect.any(Date),
        ...alertData
      });
      expect(alert.id).toHaveLength(36); // UUID length
    });

    test('should handle duplicate alert creation with count increment', async () => {
      const alertData = {
        type: AlertType.HIGH_CPU_USAGE,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACTIVE,
        title: 'High CPU Usage',
        message: 'CPU usage exceeded threshold',
        component: SystemComponent.SYSTEM_RESOURCES,
        metricValue: 85,
        threshold: 80,
        metadata: {},
        source: 'health-checker',
        count: 1,
        lastOccurrence: new Date()
      };

      const alert1 = await alertManager.createAlert(alertData);
      const alert2 = await alertManager.createAlert(alertData);

      expect(alert1.id).toBe(alert2.id);
      expect(alert2.count).toBe(2);
      expect(alert2.lastOccurrence).not.toBe(alert1.lastOccurrence);
    });

    test('should acknowledge an alert', async () => {
      const alert = await alertManager.createAlert({
        type: AlertType.COMPONENT_FAILURE,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        title: 'Test Alert',
        message: 'Test alert message',
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      });

      const acknowledgedAlert = await alertManager.acknowledgeAlert(alert.id, 'user123');

      expect(acknowledgedAlert.status).toBe(AlertStatus.ACKNOWLEDGED);
      expect(acknowledgedAlert.acknowledgedAt).toBeDefined();
      expect(acknowledgedAlert.acknowledgedBy).toBe('user123');
    });

    test('should resolve an alert', async () => {
      const alert = await alertManager.createAlert({
        type: AlertType.COMPONENT_FAILURE,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACTIVE,
        title: 'Test Alert',
        message: 'Test alert message',
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      });

      const resolvedAlert = await alertManager.resolveAlert(alert.id, 'user456');

      expect(resolvedAlert.status).toBe(AlertStatus.RESOLVED);
      expect(resolvedAlert.resolvedAt).toBeDefined();
      expect(resolvedAlert.resolvedBy).toBe('user456');
    });

    test('should suppress an alert for specified duration', async () => {
      const alert = await alertManager.createAlert({
        type: AlertType.HIGH_MEMORY_USAGE,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        title: 'High Memory Usage',
        message: 'Memory usage exceeded threshold',
        metadata: {},
        source: 'health-checker',
        count: 1,
        lastOccurrence: new Date()
      });

      const suppressDuration = 3600000; // 1 hour
      const suppressedAlert = await alertManager.suppressAlert(alert.id, suppressDuration);

      expect(suppressedAlert.status).toBe(AlertStatus.SUPPRESSED);
      expect(suppressedAlert.expiresAt).toBeDefined();
      expect(suppressedAlert.expiresAt!.getTime()).toBeCloseTo(
        Date.now() + suppressDuration, 1000
      );
    });
  });

  describe('Alert Retrieval and Filtering', () => {
    test('should retrieve alerts with pagination', async () => {
      // Create multiple alerts
      for (let i = 0; i < 15; i++) {
        await alertManager.createAlert({
          type: AlertType.COMPONENT_FAILURE,
          severity: AlertSeverity.MEDIUM,
          status: AlertStatus.ACTIVE,
          title: `Test Alert ${i}`,
          message: `Test alert message ${i}`,
          metadata: {},
          source: 'test',
          count: 1,
          lastOccurrence: new Date()
        });
      }

      const result = await alertManager.getAlerts({
        pagination: { page: 1, limit: 10 }
      });

      expect(result.alerts).toHaveLength(10);
      expect(result.totalCount).toBe(15);
    });

    test('should filter alerts by severity', async () => {
      await alertManager.createAlert({
        type: AlertType.COMPONENT_FAILURE,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        title: 'Critical Alert',
        message: 'Critical alert message',
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      });

      await alertManager.createAlert({
        type: AlertType.HIGH_CPU_USAGE,
        severity: AlertSeverity.LOW,
        status: AlertStatus.ACTIVE,
        title: 'Low Priority Alert',
        message: 'Low priority alert message',
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      });

      const result = await alertManager.getAlerts({
        filters: { severity: [AlertSeverity.CRITICAL] }
      });

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].severity).toBe(AlertSeverity.CRITICAL);
    });

    test('should filter alerts by component', async () => {
      await alertManager.createAlert({
        type: AlertType.DATABASE_CONNECTION_LOST,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        title: 'Database Alert',
        message: 'Database alert message',
        component: SystemComponent.DATABASE,
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      });

      await alertManager.createAlert({
        type: AlertType.REDIS_CONNECTION_LOST,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACTIVE,
        title: 'Redis Alert',
        message: 'Redis alert message',
        component: SystemComponent.REDIS,
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      });

      const result = await alertManager.getAlerts({
        filters: { component: [SystemComponent.DATABASE] }
      });

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].component).toBe(SystemComponent.DATABASE);
    });

    test('should filter alerts by date range', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const tomorrow = new Date(Date.now() + 86400000);

      await alertManager.createAlert({
        type: AlertType.COMPONENT_FAILURE,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        title: 'Recent Alert',
        message: 'Recent alert message',
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      });

      const result = await alertManager.getAlerts({
        filters: { dateRange: [yesterday, tomorrow] }
      });

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Notification System', () => {
    test('should send notifications for high severity alerts', async () => {
      const sendNotificationSpy = jest.spyOn(alertManager as any, 'sendNotification');
      
      const alert = await alertManager.createAlert({
        type: AlertType.SYSTEM_DOWN,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        title: 'System Down',
        message: 'System is completely down',
        metadata: {},
        source: 'health-checker',
        count: 1,
        lastOccurrence: new Date()
      });

      await alertManager.sendNotifications(alert);

      expect(sendNotificationSpy).toHaveBeenCalled();
    });

    test('should throttle notifications for repeated alerts', async () => {
      const sendNotificationSpy = jest.spyOn(alertManager as any, 'sendNotification');
      
      const alertData = {
        type: AlertType.HIGH_CPU_USAGE,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        title: 'High CPU',
        message: 'CPU usage high',
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      };

      // Create same alert multiple times quickly
      const alert1 = await alertManager.createAlert(alertData);
      const alert2 = await alertManager.createAlert(alertData);
      const alert3 = await alertManager.createAlert(alertData);

      await alertManager.sendNotifications(alert1);
      await alertManager.sendNotifications(alert2);
      await alertManager.sendNotifications(alert3);

      // Should be throttled - not called 3 times
      expect(sendNotificationSpy.mock.calls.length).toBeLessThan(3);
    });

    test('should support multiple notification channels', async () => {
      const alert = await alertManager.createAlert({
        type: AlertType.DATABASE_CONNECTION_LOST,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        title: 'Database Down',
        message: 'Database connection lost',
        metadata: { channels: ['email', 'websocket', 'slack'] },
        source: 'health-checker',
        count: 1,
        lastOccurrence: new Date()
      });

      const emailSpy = jest.spyOn(alertManager as any, 'sendEmailNotification');
      const websocketSpy = jest.spyOn(alertManager as any, 'sendWebSocketNotification');
      const slackSpy = jest.spyOn(alertManager as any, 'sendSlackNotification');

      await alertManager.sendNotifications(alert);

      expect(emailSpy).toHaveBeenCalled();
      expect(websocketSpy).toHaveBeenCalled();
      expect(slackSpy).toHaveBeenCalled();
    });
  });

  describe('Alert Rule Engine', () => {
    test('should evaluate alert rules and create alerts', async () => {
      const rule: AlertRule = {
        id: 'cpu-high-rule',
        name: 'High CPU Usage Rule',
        enabled: true,
        alertType: AlertType.HIGH_CPU_USAGE,
        severity: AlertSeverity.HIGH,
        component: SystemComponent.SYSTEM_RESOURCES,
        condition: {
          metric: 'cpu_usage',
          operator: 'gt',
          value: 80,
          duration: 300
        },
        thresholds: { critical: 90, warning: 80 },
        notificationChannels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
        evaluationInterval: 60000,
        timeWindow: 300000,
        cooldownPeriod: 3600000,
        autoResolve: true,
        autoResolveCondition: {
          metric: 'cpu_usage',
          operator: 'lt',
          value: 75
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      };

      // Mock high CPU usage
      jest.spyOn(alertManager as any, 'getCurrentMetric').mockResolvedValue(85);
      jest.spyOn(alertManager as any, 'getRules').mockResolvedValue([rule]);

      const createAlertSpy = jest.spyOn(alertManager, 'createAlert');

      await alertManager.evaluateRules();

      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: AlertType.HIGH_CPU_USAGE,
        severity: AlertSeverity.HIGH,
        component: SystemComponent.SYSTEM_RESOURCES
      }));
    });

    test('should auto-resolve alerts when conditions are met', async () => {
      // Create an active alert
      const alert = await alertManager.createAlert({
        type: AlertType.HIGH_CPU_USAGE,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACTIVE,
        title: 'High CPU Usage',
        message: 'CPU usage exceeded threshold',
        component: SystemComponent.SYSTEM_RESOURCES,
        metricValue: 85,
        threshold: 80,
        metadata: { ruleId: 'cpu-high-rule' },
        source: 'rule-engine',
        count: 1,
        lastOccurrence: new Date()
      });

      const rule: AlertRule = {
        id: 'cpu-high-rule',
        name: 'High CPU Usage Rule',
        enabled: true,
        alertType: AlertType.HIGH_CPU_USAGE,
        severity: AlertSeverity.HIGH,
        component: SystemComponent.SYSTEM_RESOURCES,
        condition: { metric: 'cpu_usage', operator: 'gt', value: 80 },
        thresholds: { critical: 90, warning: 80, recovery: 75 },
        notificationChannels: [NotificationChannel.EMAIL],
        evaluationInterval: 60000,
        timeWindow: 300000,
        cooldownPeriod: 3600000,
        autoResolve: true,
        autoResolveCondition: { metric: 'cpu_usage', operator: 'lt', value: 75 },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      };

      // Mock CPU usage back to normal
      jest.spyOn(alertManager as any, 'getCurrentMetric').mockResolvedValue(70);
      jest.spyOn(alertManager as any, 'getRules').mockResolvedValue([rule]);
      jest.spyOn(alertManager as any, 'getActiveAlerts').mockResolvedValue([alert]);

      const resolveAlertSpy = jest.spyOn(alertManager, 'resolveAlert');

      await alertManager.evaluateRules();

      expect(resolveAlertSpy).toHaveBeenCalledWith(alert.id, 'auto-resolver');
    });

    test('should respect cooldown periods between alerts', async () => {
      const rule: AlertRule = {
        id: 'memory-high-rule',
        name: 'High Memory Usage Rule',
        enabled: true,
        alertType: AlertType.HIGH_MEMORY_USAGE,
        severity: AlertSeverity.MEDIUM,
        component: SystemComponent.SYSTEM_RESOURCES,
        condition: { metric: 'memory_usage', operator: 'gt', value: 85 },
        thresholds: { warning: 85 },
        notificationChannels: [NotificationChannel.WEBSOCKET],
        evaluationInterval: 60000,
        timeWindow: 300000,
        cooldownPeriod: 1800000, // 30 minutes
        autoResolve: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system'
      };

      // Mock high memory usage
      jest.spyOn(alertManager as any, 'getCurrentMetric').mockResolvedValue(90);
      jest.spyOn(alertManager as any, 'getRules').mockResolvedValue([rule]);
      
      const createAlertSpy = jest.spyOn(alertManager, 'createAlert');

      // First evaluation - should create alert
      await alertManager.evaluateRules();
      expect(createAlertSpy).toHaveBeenCalled();

      createAlertSpy.mockClear();

      // Second evaluation immediately after - should be in cooldown
      await alertManager.evaluateRules();
      expect(createAlertSpy).not.toHaveBeenCalled();
    });
  });

  describe('Alert Statistics', () => {
    test('should calculate alert statistics', async () => {
      // Create alerts with different severities
      await alertManager.createAlert({
        type: AlertType.SYSTEM_DOWN,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        title: 'Critical Alert',
        message: 'Critical message',
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      });

      await alertManager.createAlert({
        type: AlertType.HIGH_CPU_USAGE,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.RESOLVED,
        title: 'High Alert',
        message: 'High message',
        resolvedAt: new Date(),
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      });

      const stats = await alertManager.getAlertStats();

      expect(stats).toMatchObject({
        totalActive: expect.any(Number),
        totalResolved: expect.any(Number),
        bySeverity: expect.any(Object),
        byComponent: expect.any(Object),
        byType: expect.any(Object),
        avgResolutionTime: expect.any(Number),
        trends: expect.any(Object)
      });

      expect(stats.bySeverity[AlertSeverity.CRITICAL]).toBeGreaterThan(0);
    });

    test('should track alert resolution time', async () => {
      const alertCreatedAt = new Date(Date.now() - 300000); // 5 minutes ago
      const alert = await alertManager.createAlert({
        type: AlertType.COMPONENT_FAILURE,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        title: 'Component Failure',
        message: 'Component failed',
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: alertCreatedAt
      });

      // Modify createdAt to simulate alert created earlier
      (alert as any).createdAt = alertCreatedAt;

      await alertManager.resolveAlert(alert.id, 'user123');

      const stats = await alertManager.getAlertStats();
      
      expect(stats.avgResolutionTime).toBeGreaterThan(0);
      expect(stats.avgResolutionTime).toBeLessThanOrEqual(300000); // Should be around 5 minutes
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle alert creation with invalid data', async () => {
      const invalidAlertData = {
        type: 'invalid_type' as any,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        title: '',
        message: '',
        metadata: {},
        source: '',
        count: 1,
        lastOccurrence: new Date()
      };

      await expect(alertManager.createAlert(invalidAlertData)).rejects.toThrow();
    });

    test('should handle acknowledgment of non-existent alert', async () => {
      await expect(alertManager.acknowledgeAlert('non-existent-id', 'user123'))
        .rejects.toThrow('Alert not found');
    });

    test('should handle resolution of already resolved alert', async () => {
      const alert = await alertManager.createAlert({
        type: AlertType.COMPONENT_FAILURE,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.RESOLVED,
        title: 'Already Resolved',
        message: 'Already resolved message',
        resolvedAt: new Date(),
        resolvedBy: 'user456',
        metadata: {},
        source: 'test',
        count: 1,
        lastOccurrence: new Date()
      });

      await expect(alertManager.resolveAlert(alert.id, 'user789'))
        .rejects.toThrow('Alert already resolved');
    });

    test('should handle notification failures gracefully', async () => {
      const alert = await alertManager.createAlert({
        type: AlertType.EXTERNAL_API_FAILURE,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACTIVE,
        title: 'API Failure',
        message: 'External API failed',
        metadata: {},
        source: 'health-checker',
        count: 1,
        lastOccurrence: new Date()
      });

      // Mock notification failure
      jest.spyOn(alertManager as any, 'sendEmailNotification')
        .mockRejectedValueOnce(new Error('SMTP server unavailable'));

      // Should not throw, but should log error
      await expect(alertManager.sendNotifications(alert)).resolves.toBeUndefined();
    });
  });
});