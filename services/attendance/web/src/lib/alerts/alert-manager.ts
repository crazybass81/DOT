/**
 * Alert Manager Service
 * Phase 3.3.3.3 - Alert System Implementation
 * GREEN Phase: Minimal implementation to pass tests
 */

import { 
  Alert, 
  AlertManager as IAlertManager,
  AlertType, 
  AlertSeverity, 
  AlertStatus, 
  AlertRule,
  AlertStats,
  UseAlertsOptions,
  NotificationChannel
} from '@/types/alerts';
import { SystemComponent } from '@/types/health';
import { v4 as uuidv4 } from 'uuid';

export class AlertManager implements IAlertManager {
  private alerts: Map<string, Alert> = new Map();
  private rules: AlertRule[] = [];
  private notificationThrottles: Map<string, number> = new Map();
  private cooldowns: Map<string, number> = new Map();

  async createAlert(alertData: Omit<Alert, 'id' | 'createdAt' | 'count' | 'lastOccurrence'>): Promise<Alert> {
    // Validate alert data
    if (!alertData.type || !alertData.severity || !alertData.title || !alertData.message) {
      throw new Error('Invalid alert data: missing required fields');
    }

    // Check for duplicate alert (based on type, component, and source)
    const existingAlertId = this.findDuplicateAlert(alertData);
    if (existingAlertId) {
      const existingAlert = this.alerts.get(existingAlertId)!;
      existingAlert.count += 1;
      existingAlert.lastOccurrence = new Date();
      return existingAlert;
    }

    // Create new alert
    const alert: Alert = {
      id: uuidv4(),
      createdAt: new Date(),
      count: alertData.count || 1,
      lastOccurrence: alertData.lastOccurrence || new Date(),
      ...alertData
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  async updateAlert(alertId: string, updates: Partial<Alert>): Promise<Alert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    Object.assign(alert, updates);
    return alert;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<Alert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.status === AlertStatus.RESOLVED) {
      throw new Error('Cannot acknowledge resolved alert');
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    return alert;
  }

  async resolveAlert(alertId: string, userId: string): Promise<Alert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.status === AlertStatus.RESOLVED) {
      throw new Error('Alert already resolved');
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;

    return alert;
  }

  async suppressAlert(alertId: string, duration: number): Promise<Alert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = AlertStatus.SUPPRESSED;
    alert.expiresAt = new Date(Date.now() + duration);

    return alert;
  }

  async getAlerts(options: UseAlertsOptions = {}): Promise<{ alerts: Alert[]; totalCount: number }> {
    let filteredAlerts = Array.from(this.alerts.values());

    // Apply filters
    if (options.filters) {
      const { severity, status, component, type, dateRange } = options.filters;
      
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => severity.includes(alert.severity));
      }
      
      if (status) {
        filteredAlerts = filteredAlerts.filter(alert => status.includes(alert.status));
      }
      
      if (component) {
        filteredAlerts = filteredAlerts.filter(alert => 
          alert.component && component.includes(alert.component)
        );
      }
      
      if (type) {
        filteredAlerts = filteredAlerts.filter(alert => type.includes(alert.type));
      }
      
      if (dateRange) {
        const [startDate, endDate] = dateRange;
        filteredAlerts = filteredAlerts.filter(alert => 
          alert.createdAt >= startDate && alert.createdAt <= endDate
        );
      }
    }

    // Sort by creation date (newest first)
    filteredAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const totalCount = filteredAlerts.length;

    // Apply pagination
    if (options.pagination) {
      const { page, limit } = options.pagination;
      const offset = (page - 1) * limit;
      filteredAlerts = filteredAlerts.slice(offset, offset + limit);
    }

    return { alerts: filteredAlerts, totalCount };
  }

  async getAlertStats(): Promise<AlertStats> {
    const alerts = Array.from(this.alerts.values());
    
    const activeAlerts = alerts.filter(alert => alert.status === AlertStatus.ACTIVE);
    const resolvedAlerts = alerts.filter(alert => alert.status === AlertStatus.RESOLVED);
    
    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<AlertSeverity, number>);

    const byComponent = alerts.reduce((acc, alert) => {
      if (alert.component) {
        acc[alert.component] = (acc[alert.component] || 0) + 1;
      }
      return acc;
    }, {} as Record<SystemComponent, number>);

    const byType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<AlertType, number>);

    // Calculate average resolution time
    const resolvedAlertsWithTime = resolvedAlerts.filter(alert => alert.resolvedAt);
    const avgResolutionTime = resolvedAlertsWithTime.length > 0 
      ? resolvedAlertsWithTime.reduce((sum, alert) => {
          return sum + (alert.resolvedAt!.getTime() - alert.createdAt.getTime());
        }, 0) / resolvedAlertsWithTime.length
      : 0;

    // Generate trend data (simplified)
    const now = new Date();
    const dailyTrends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayAlerts = alerts.filter(alert => {
        const alertDate = new Date(alert.createdAt);
        return alertDate.toDateString() === date.toDateString();
      });
      return { date, count: dayAlerts.length };
    }).reverse();

    const hourlyTrends = Array.from({ length: 24 }, (_, hour) => {
      const hourAlerts = alerts.filter(alert => {
        const alertHour = alert.createdAt.getHours();
        return alertHour === hour;
      });
      return { hour, count: hourAlerts.length };
    });

    return {
      totalActive: activeAlerts.length,
      totalResolved: resolvedAlerts.length,
      bySeverity,
      byComponent,
      byType,
      avgResolutionTime,
      trends: {
        daily: dailyTrends,
        hourly: hourlyTrends
      }
    };
  }

  async sendNotifications(alert: Alert): Promise<void> {
    // Check throttling to prevent spam
    const throttleKey = `${alert.type}-${alert.component || 'global'}`;
    const lastNotification = this.notificationThrottles.get(throttleKey) || 0;
    const throttleInterval = this.getThrottleInterval(alert.severity);
    
    if (Date.now() - lastNotification < throttleInterval) {
      return; // Skip notification due to throttling
    }

    try {
      // Send to different channels based on severity
      const channels = this.getNotificationChannels(alert);
      
      await Promise.allSettled([
        ...channels.map(async (channel) => {
          switch (channel) {
            case NotificationChannel.EMAIL:
              await this.sendEmailNotification(alert);
              break;
            case NotificationChannel.WEBSOCKET:
              await this.sendWebSocketNotification(alert);
              break;
            case NotificationChannel.SLACK:
              await this.sendSlackNotification(alert);
              break;
            case NotificationChannel.PUSH:
              await this.sendPushNotification(alert);
              break;
          }
        })
      ]);

      // Update throttle timestamp
      this.notificationThrottles.set(throttleKey, Date.now());
    } catch (error) {
      // Log error but don't throw - notification failures shouldn't break alert creation
      console.error(`Failed to send notifications for alert ${alert.id}:`, error);
    }
  }

  async evaluateRules(): Promise<void> {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        const cooldownKey = rule.id;
        const lastEvaluation = this.cooldowns.get(cooldownKey) || 0;
        
        if (Date.now() - lastEvaluation < rule.cooldownPeriod) {
          continue; // Skip due to cooldown
        }

        const metricValue = await this.getCurrentMetric(rule.condition.metric);
        const conditionMet = this.evaluateCondition(rule.condition, metricValue);

        if (conditionMet) {
          // Create alert
          await this.createAlert({
            type: rule.alertType,
            severity: rule.severity,
            status: AlertStatus.ACTIVE,
            title: rule.name,
            message: `${rule.description || rule.name} - Metric: ${metricValue}, Threshold: ${rule.condition.value}`,
            component: rule.component,
            metricValue,
            threshold: rule.condition.value,
            metadata: { ruleId: rule.id },
            source: 'rule-engine'
          });

          this.cooldowns.set(cooldownKey, Date.now());
        } else if (rule.autoResolve && rule.autoResolveCondition) {
          // Check for auto-resolution
          const resolveConditionMet = this.evaluateCondition(rule.autoResolveCondition, metricValue);
          
          if (resolveConditionMet) {
            const activeAlerts = await this.getActiveAlerts();
            const relatedAlerts = activeAlerts.filter(alert => 
              alert.metadata?.ruleId === rule.id && alert.status === AlertStatus.ACTIVE
            );

            for (const alert of relatedAlerts) {
              await this.resolveAlert(alert.id, 'auto-resolver');
            }
          }
        }
      } catch (error) {
        console.error(`Failed to evaluate rule ${rule.id}:`, error);
      }
    }
  }

  startMonitoring(): void {
    // In a real implementation, this would set up periodic evaluation
    console.log('Alert monitoring started');
  }

  stopMonitoring(): void {
    // In a real implementation, this would stop periodic evaluation
    console.log('Alert monitoring stopped');
  }

  // Private helper methods
  private findDuplicateAlert(alertData: Omit<Alert, 'id' | 'createdAt' | 'count' | 'lastOccurrence'>): string | null {
    for (const [id, alert] of this.alerts) {
      if (alert.type === alertData.type &&
          alert.component === alertData.component &&
          alert.source === alertData.source &&
          alert.status === AlertStatus.ACTIVE) {
        return id;
      }
    }
    return null;
  }

  private getThrottleInterval(severity: AlertSeverity): number {
    switch (severity) {
      case AlertSeverity.CRITICAL: return 0; // No throttling for critical alerts
      case AlertSeverity.HIGH: return 60000; // 1 minute
      case AlertSeverity.MEDIUM: return 300000; // 5 minutes
      case AlertSeverity.LOW: return 900000; // 15 minutes
      case AlertSeverity.INFO: return 3600000; // 1 hour
      default: return 300000;
    }
  }

  private getNotificationChannels(alert: Alert): NotificationChannel[] {
    const channels: NotificationChannel[] = [NotificationChannel.WEBSOCKET];
    
    if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.HIGH) {
      channels.push(NotificationChannel.EMAIL);
    }

    if (alert.severity === AlertSeverity.CRITICAL) {
      channels.push(NotificationChannel.SLACK, NotificationChannel.PUSH);
    }

    return channels;
  }

  private async sendEmailNotification(alert: Alert): Promise<void> {
    // Mock email notification
    await this.delay(100);
  }

  private async sendWebSocketNotification(alert: Alert): Promise<void> {
    // Mock WebSocket notification
    await this.delay(50);
  }

  private async sendSlackNotification(alert: Alert): Promise<void> {
    // Mock Slack notification
    await this.delay(200);
  }

  private async sendPushNotification(alert: Alert): Promise<void> {
    // Mock push notification
    await this.delay(150);
  }

  private async getCurrentMetric(metricName: string): Promise<number> {
    // Mock metric retrieval
    switch (metricName) {
      case 'cpu_usage': return Math.random() * 100;
      case 'memory_usage': return Math.random() * 100;
      case 'disk_usage': return Math.random() * 100;
      case 'response_time': return Math.random() * 1000;
      case 'error_rate': return Math.random() * 10;
      default: return Math.random() * 100;
    }
  }

  private evaluateCondition(condition: any, metricValue: number): boolean {
    switch (condition.operator) {
      case 'gt': return metricValue > condition.value;
      case 'gte': return metricValue >= condition.value;
      case 'lt': return metricValue < condition.value;
      case 'lte': return metricValue <= condition.value;
      case 'eq': return metricValue === condition.value;
      case 'neq': return metricValue !== condition.value;
      default: return false;
    }
  }

  private async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.status === AlertStatus.ACTIVE);
  }

  private getRules(): AlertRule[] {
    return this.rules;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}