/**
 * Alert Rules Configuration
 * Phase 3.3.3.3 - Alert System
 */

import { 
  AlertRule, 
  AlertType, 
  AlertSeverity, 
  NotificationChannel,
  AlertingConfig,
  RateLimitConfig
} from '@/types/alerts';
import { SystemComponent } from '@/types/health';

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  // Database Health Rules
  {
    id: 'db-connection-lost',
    name: 'Database Connection Lost',
    description: 'Database connection is down or unreachable',
    enabled: true,
    alertType: AlertType.DATABASE_CONNECTION_LOST,
    severity: AlertSeverity.CRITICAL,
    component: SystemComponent.DATABASE,
    condition: {
      metric: 'database_connection_status',
      operator: 'eq',
      value: 0, // 0 = down, 1 = up
      duration: 30 // 30 seconds
    },
    thresholds: {
      critical: 0
    },
    notificationChannels: [
      NotificationChannel.EMAIL,
      NotificationChannel.WEBSOCKET,
      NotificationChannel.PUSH
    ],
    evaluationInterval: 30000, // 30 seconds
    timeWindow: 60000, // 1 minute
    cooldownPeriod: 300000, // 5 minutes
    autoResolve: true,
    autoResolveCondition: {
      metric: 'database_connection_status',
      operator: 'eq',
      value: 1
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },

  {
    id: 'db-high-response-time',
    name: 'Database High Response Time',
    description: 'Database response time is higher than acceptable threshold',
    enabled: true,
    alertType: AlertType.PERFORMANCE_DEGRADATION,
    severity: AlertSeverity.HIGH,
    component: SystemComponent.DATABASE,
    condition: {
      metric: 'database_response_time',
      operator: 'gt',
      value: 500, // 500ms
      duration: 120 // 2 minutes
    },
    thresholds: {
      warning: 200,
      critical: 500,
      recovery: 150
    },
    notificationChannels: [
      NotificationChannel.EMAIL,
      NotificationChannel.WEBSOCKET
    ],
    evaluationInterval: 60000, // 1 minute
    timeWindow: 300000, // 5 minutes
    cooldownPeriod: 600000, // 10 minutes
    autoResolve: true,
    autoResolveCondition: {
      metric: 'database_response_time',
      operator: 'lt',
      value: 150
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },

  // Redis Health Rules
  {
    id: 'redis-connection-lost',
    name: 'Redis Connection Lost',
    description: 'Redis cache connection is down',
    enabled: true,
    alertType: AlertType.REDIS_CONNECTION_LOST,
    severity: AlertSeverity.HIGH,
    component: SystemComponent.REDIS,
    condition: {
      metric: 'redis_connection_status',
      operator: 'eq',
      value: 0
    },
    thresholds: {
      critical: 0
    },
    notificationChannels: [
      NotificationChannel.EMAIL,
      NotificationChannel.WEBSOCKET
    ],
    evaluationInterval: 60000, // 1 minute
    timeWindow: 180000, // 3 minutes
    cooldownPeriod: 600000, // 10 minutes
    autoResolve: true,
    autoResolveCondition: {
      metric: 'redis_connection_status',
      operator: 'eq',
      value: 1
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },

  // System Resource Rules
  {
    id: 'high-cpu-usage',
    name: 'High CPU Usage',
    description: 'CPU usage is higher than acceptable threshold',
    enabled: true,
    alertType: AlertType.HIGH_CPU_USAGE,
    severity: AlertSeverity.MEDIUM,
    component: SystemComponent.SYSTEM_RESOURCES,
    condition: {
      metric: 'cpu_usage',
      operator: 'gt',
      value: 80,
      duration: 300 // 5 minutes
    },
    thresholds: {
      warning: 75,
      critical: 90,
      recovery: 70
    },
    notificationChannels: [
      NotificationChannel.WEBSOCKET
    ],
    evaluationInterval: 60000, // 1 minute
    timeWindow: 600000, // 10 minutes
    cooldownPeriod: 1800000, // 30 minutes
    autoResolve: true,
    autoResolveCondition: {
      metric: 'cpu_usage',
      operator: 'lt',
      value: 70
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },

  {
    id: 'high-memory-usage',
    name: 'High Memory Usage',
    description: 'Memory usage is higher than acceptable threshold',
    enabled: true,
    alertType: AlertType.HIGH_MEMORY_USAGE,
    severity: AlertSeverity.HIGH,
    component: SystemComponent.SYSTEM_RESOURCES,
    condition: {
      metric: 'memory_usage',
      operator: 'gt',
      value: 85,
      duration: 180 // 3 minutes
    },
    thresholds: {
      warning: 80,
      critical: 90,
      recovery: 75
    },
    notificationChannels: [
      NotificationChannel.EMAIL,
      NotificationChannel.WEBSOCKET
    ],
    evaluationInterval: 30000, // 30 seconds
    timeWindow: 300000, // 5 minutes
    cooldownPeriod: 1200000, // 20 minutes
    autoResolve: true,
    autoResolveCondition: {
      metric: 'memory_usage',
      operator: 'lt',
      value: 75
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },

  {
    id: 'disk-space-low',
    name: 'Low Disk Space',
    description: 'Disk usage is approaching capacity limits',
    enabled: true,
    alertType: AlertType.DISK_SPACE_LOW,
    severity: AlertSeverity.HIGH,
    component: SystemComponent.SYSTEM_RESOURCES,
    condition: {
      metric: 'disk_usage',
      operator: 'gt',
      value: 90
    },
    thresholds: {
      warning: 85,
      critical: 95,
      recovery: 80
    },
    notificationChannels: [
      NotificationChannel.EMAIL,
      NotificationChannel.WEBSOCKET,
      NotificationChannel.PUSH
    ],
    evaluationInterval: 300000, // 5 minutes
    timeWindow: 600000, // 10 minutes
    cooldownPeriod: 3600000, // 1 hour
    autoResolve: true,
    autoResolveCondition: {
      metric: 'disk_usage',
      operator: 'lt',
      value: 80
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },

  // WebSocket Rules
  {
    id: 'websocket-server-down',
    name: 'WebSocket Server Down',
    description: 'WebSocket server is not responding',
    enabled: true,
    alertType: AlertType.WEBSOCKET_SERVER_DOWN,
    severity: AlertSeverity.HIGH,
    component: SystemComponent.WEBSOCKET,
    condition: {
      metric: 'websocket_server_status',
      operator: 'eq',
      value: 0
    },
    thresholds: {
      critical: 0
    },
    notificationChannels: [
      NotificationChannel.EMAIL,
      NotificationChannel.WEBSOCKET
    ],
    evaluationInterval: 60000, // 1 minute
    timeWindow: 180000, // 3 minutes
    cooldownPeriod: 600000, // 10 minutes
    autoResolve: true,
    autoResolveCondition: {
      metric: 'websocket_server_status',
      operator: 'eq',
      value: 1
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },

  // Application Performance Rules
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    description: 'Application error rate is higher than acceptable',
    enabled: true,
    alertType: AlertType.HIGH_ERROR_RATE,
    severity: AlertSeverity.HIGH,
    condition: {
      metric: 'error_rate',
      operator: 'gt',
      value: 5, // 5%
      duration: 120 // 2 minutes
    },
    thresholds: {
      warning: 2,
      critical: 10,
      recovery: 1
    },
    notificationChannels: [
      NotificationChannel.EMAIL,
      NotificationChannel.WEBSOCKET
    ],
    evaluationInterval: 60000, // 1 minute
    timeWindow: 300000, // 5 minutes
    cooldownPeriod: 900000, // 15 minutes
    autoResolve: true,
    autoResolveCondition: {
      metric: 'error_rate',
      operator: 'lt',
      value: 1
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  }
];

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  maxNotifications: 10,
  timePeriod: 300000, // 5 minutes
  burstAllowance: 3
};

export const DEFAULT_ALERTING_CONFIG: AlertingConfig = {
  enabled: true,
  defaultChannels: [
    NotificationChannel.EMAIL,
    NotificationChannel.WEBSOCKET
  ],
  rules: DEFAULT_ALERT_RULES,
  notifications: [
    {
      channel: NotificationChannel.EMAIL,
      enabled: true,
      config: {
        smtpHost: 'localhost',
        smtpPort: 587,
        smtpSecure: false,
        smtpAuth: {
          user: 'alerts@example.com',
          pass: 'password'
        },
        from: 'DOT Health Monitor <alerts@example.com>',
        to: ['admin@example.com'],
        cc: ['ops@example.com']
      },
      rateLimiting: DEFAULT_RATE_LIMITS
    },
    {
      channel: NotificationChannel.WEBSOCKET,
      enabled: true,
      config: {
        endpoint: '/api/health/websocket',
        targetGroups: ['administrators', 'operators'],
        realTime: true
      },
      rateLimiting: {
        ...DEFAULT_RATE_LIMITS,
        maxNotifications: 50 // Higher limit for WebSocket
      }
    },
    {
      channel: NotificationChannel.PUSH,
      enabled: false, // Disabled by default
      config: {
        serviceKey: 'your-push-service-key',
        targets: ['admin-device-1', 'admin-device-2'],
        options: {
          title: 'DOT Health Alert',
          icon: '/favicon.ico',
          badge: 1
        }
      },
      rateLimiting: DEFAULT_RATE_LIMITS
    }
  ],
  globalRateLimit: {
    maxNotifications: 100,
    timePeriod: 3600000, // 1 hour
    burstAllowance: 20
  },
  alertRetentionDays: 90,
  enableGrouping: true,
  groupingTimeWindow: 300000 // 5 minutes
};

export function getAlertRuleById(ruleId: string): AlertRule | undefined {
  return DEFAULT_ALERT_RULES.find(rule => rule.id === ruleId);
}

export function getAlertRulesByComponent(component: SystemComponent): AlertRule[] {
  return DEFAULT_ALERT_RULES.filter(rule => rule.component === component);
}

export function getEnabledAlertRules(): AlertRule[] {
  return DEFAULT_ALERT_RULES.filter(rule => rule.enabled);
}

export function getCriticalAlertRules(): AlertRule[] {
  return DEFAULT_ALERT_RULES.filter(rule => 
    rule.severity === AlertSeverity.CRITICAL && rule.enabled
  );
}