/**
 * Alert System Types
 * Phase 3.3.3.3 - System Health and Alerting
 */

import { SystemComponent, HealthStatus } from './health';

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high', 
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum AlertType {
  // System Health Alerts
  SYSTEM_DOWN = 'system_down',
  COMPONENT_FAILURE = 'component_failure', 
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  
  // Infrastructure Alerts
  DATABASE_CONNECTION_LOST = 'database_connection_lost',
  REDIS_CONNECTION_LOST = 'redis_connection_lost',
  WEBSOCKET_SERVER_DOWN = 'websocket_server_down',
  EXTERNAL_API_FAILURE = 'external_api_failure',
  
  // Resource Alerts
  HIGH_CPU_USAGE = 'high_cpu_usage',
  HIGH_MEMORY_USAGE = 'high_memory_usage', 
  DISK_SPACE_LOW = 'disk_space_low',
  
  // Application Alerts
  HIGH_ERROR_RATE = 'high_error_rate',
  HIGH_RESPONSE_TIME = 'high_response_time',
  TOO_MANY_CONCURRENT_USERS = 'too_many_concurrent_users',
  
  // Recovery Alerts
  SYSTEM_RECOVERED = 'system_recovered',
  COMPONENT_RECOVERED = 'component_recovered'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged', 
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
  EXPIRED = 'expired'
}

export enum NotificationChannel {
  EMAIL = 'email',
  WEBSOCKET = 'websocket',
  PUSH = 'push',
  SLACK = 'slack',
  SMS = 'sms',
  WEBHOOK = 'webhook'
}

export interface Alert {
  /** Unique alert ID */
  id: string;
  /** Alert type */
  type: AlertType;
  /** Alert severity */
  severity: AlertSeverity;
  /** Alert status */
  status: AlertStatus;
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Affected system component */
  component?: SystemComponent;
  /** Metric value that triggered the alert */
  metricValue?: number;
  /** Threshold value that was breached */
  threshold?: number;
  /** Alert creation timestamp */
  createdAt: Date;
  /** Alert acknowledgment timestamp */
  acknowledgedAt?: Date;
  /** Alert resolution timestamp */
  resolvedAt?: Date;
  /** Alert expiration timestamp */
  expiresAt?: Date;
  /** User who acknowledged the alert */
  acknowledgedBy?: string;
  /** User who resolved the alert */
  resolvedBy?: string;
  /** Additional alert metadata */
  metadata: Record<string, any>;
  /** Related alerts (for grouping) */
  relatedAlerts?: string[];
  /** Alert source/origin */
  source: string;
  /** Alert count (for recurring alerts) */
  count: number;
  /** Last occurrence timestamp */
  lastOccurrence: Date;
}

export interface AlertRule {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description?: string;
  /** Rule enabled/disabled */
  enabled: boolean;
  /** Alert type this rule generates */
  alertType: AlertType;
  /** Alert severity for this rule */
  severity: AlertSeverity;
  /** System component this rule monitors */
  component?: SystemComponent;
  /** Condition that triggers the alert */
  condition: AlertCondition;
  /** Threshold configuration */
  thresholds: AlertThresholds;
  /** Notification channels for this rule */
  notificationChannels: NotificationChannel[];
  /** Rule evaluation interval in milliseconds */
  evaluationInterval: number;
  /** Time window for condition evaluation */
  timeWindow: number;
  /** Cooldown period to prevent alert spam */
  cooldownPeriod: number;
  /** Auto-resolution enabled */
  autoResolve: boolean;
  /** Auto-resolution condition */
  autoResolveCondition?: AlertCondition;
  /** Rule creation timestamp */
  createdAt: Date;
  /** Rule last update timestamp */
  updatedAt: Date;
  /** Rule creator */
  createdBy: string;
}

export interface AlertCondition {
  /** Metric to evaluate */
  metric: string;
  /** Comparison operator */
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  /** Value to compare against */
  value: number;
  /** Duration condition must be true (seconds) */
  duration?: number;
}

export interface AlertThresholds {
  /** Warning threshold */
  warning?: number;
  /** Critical threshold */
  critical?: number;
  /** Recovery threshold (for auto-resolution) */
  recovery?: number;
}

export interface NotificationConfig {
  /** Channel type */
  channel: NotificationChannel;
  /** Channel enabled/disabled */
  enabled: boolean;
  /** Channel-specific configuration */
  config: EmailConfig | WebSocketConfig | PushConfig | SlackConfig | SmsConfig | WebhookConfig;
  /** Notification template */
  template?: NotificationTemplate;
  /** Rate limiting configuration */
  rateLimiting?: RateLimitConfig;
}

export interface EmailConfig {
  /** SMTP server configuration */
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpAuth: {
    user: string;
    pass: string;
  };
  /** Email addresses */
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
}

export interface WebSocketConfig {
  /** WebSocket endpoint */
  endpoint?: string;
  /** Target user groups */
  targetGroups: string[];
  /** Real-time notification enabled */
  realTime: boolean;
}

export interface PushConfig {
  /** Push service configuration */
  serviceKey: string;
  /** Target devices/users */
  targets: string[];
  /** Push notification options */
  options: {
    title?: string;
    icon?: string;
    badge?: number;
  };
}

export interface SlackConfig {
  /** Slack webhook URL */
  webhookUrl: string;
  /** Target channel */
  channel: string;
  /** Bot username */
  username?: string;
  /** Bot icon */
  icon?: string;
}

export interface SmsConfig {
  /** SMS service provider */
  provider: string;
  /** Service API key */
  apiKey: string;
  /** Phone numbers */
  phoneNumbers: string[];
}

export interface WebhookConfig {
  /** Webhook URL */
  url: string;
  /** HTTP method */
  method: 'POST' | 'PUT';
  /** Request headers */
  headers?: Record<string, string>;
  /** Authentication */
  auth?: {
    type: 'bearer' | 'basic';
    token: string;
  };
}

export interface NotificationTemplate {
  /** Template subject */
  subject: string;
  /** Template body */
  body: string;
  /** Template format */
  format: 'text' | 'html' | 'markdown';
}

export interface RateLimitConfig {
  /** Max notifications per time period */
  maxNotifications: number;
  /** Time period in milliseconds */
  timePeriod: number;
  /** Burst allowance */
  burstAllowance?: number;
}

export interface AlertingConfig {
  /** Global alerting enabled/disabled */
  enabled: boolean;
  /** Default notification channels */
  defaultChannels: NotificationChannel[];
  /** Alert rules */
  rules: AlertRule[];
  /** Notification configurations */
  notifications: NotificationConfig[];
  /** Global rate limiting */
  globalRateLimit?: RateLimitConfig;
  /** Alert retention period in days */
  alertRetentionDays: number;
  /** Enable alert grouping */
  enableGrouping: boolean;
  /** Grouping time window in milliseconds */
  groupingTimeWindow: number;
}

export interface AlertStats {
  /** Total active alerts */
  totalActive: number;
  /** Total resolved alerts */
  totalResolved: number;
  /** Alerts by severity */
  bySeverity: Record<AlertSeverity, number>;
  /** Alerts by component */
  byComponent: Record<SystemComponent, number>;
  /** Alerts by type */
  byType: Record<AlertType, number>;
  /** Average resolution time */
  avgResolutionTime: number;
  /** Alert trends */
  trends: {
    daily: { date: Date; count: number }[];
    hourly: { hour: number; count: number }[];
  };
}

export interface AlertHistoryItem {
  /** Alert ID */
  alertId: string;
  /** Action taken */
  action: 'created' | 'acknowledged' | 'resolved' | 'suppressed' | 'expired';
  /** Action timestamp */
  timestamp: Date;
  /** User who performed the action */
  user?: string;
  /** Action details */
  details?: Record<string, any>;
}

export interface UseAlertsOptions {
  /** Auto-refresh interval */
  refreshInterval?: number;
  /** Real-time updates */
  realTime?: boolean;
  /** Alert filters */
  filters?: {
    severity?: AlertSeverity[];
    status?: AlertStatus[];
    component?: SystemComponent[];
    type?: AlertType[];
    dateRange?: [Date, Date];
  };
  /** Pagination */
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface AlertsState {
  /** List of alerts */
  alerts: Alert[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Total alert count */
  totalCount: number;
  /** Alert statistics */
  stats: AlertStats | null;
  /** Last update timestamp */
  lastUpdated: Date | null;
  /** WebSocket connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export interface AlertManager {
  /** Create a new alert */
  createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'count' | 'lastOccurrence'>): Promise<Alert>;
  /** Update an existing alert */
  updateAlert(alertId: string, updates: Partial<Alert>): Promise<Alert>;
  /** Acknowledge an alert */
  acknowledgeAlert(alertId: string, userId: string): Promise<Alert>;
  /** Resolve an alert */
  resolveAlert(alertId: string, userId: string): Promise<Alert>;
  /** Suppress an alert */
  suppressAlert(alertId: string, duration: number): Promise<Alert>;
  /** Get alerts with filters */
  getAlerts(options: UseAlertsOptions): Promise<{ alerts: Alert[]; totalCount: number }>;
  /** Get alert statistics */
  getAlertStats(): Promise<AlertStats>;
  /** Send notifications for an alert */
  sendNotifications(alert: Alert): Promise<void>;
  /** Evaluate alert rules */
  evaluateRules(): Promise<void>;
  /** Start alert monitoring */
  startMonitoring(): void;
  /** Stop alert monitoring */
  stopMonitoring(): void;
}