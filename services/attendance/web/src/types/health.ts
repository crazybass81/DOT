/**
 * System Health Monitoring Types
 * Phase 3.3.3.3 - Health and Alerting System
 */

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded', 
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export enum SystemComponent {
  DATABASE = 'database',
  REDIS = 'redis',
  WEBSOCKET = 'websocket',
  EXTERNAL_APIS = 'external_apis',
  SYSTEM_RESOURCES = 'system_resources',
  APPLICATION = 'application'
}

export interface HealthCheckResult {
  /** Component being checked */
  component: SystemComponent;
  /** Current health status */
  status: HealthStatus;
  /** Response time in milliseconds */
  responseTime: number;
  /** Check timestamp */
  timestamp: Date;
  /** Additional details and metrics */
  details: Record<string, any>;
}

export interface SystemHealthReport {
  /** Overall system health score (0-100) */
  overallScore: number;
  /** Overall status */
  overallStatus: HealthStatus;
  /** Component-specific scores */
  componentScores: Record<SystemComponent, number>;
  /** Component health results */
  componentResults: Record<SystemComponent, HealthCheckResult>;
  /** Critical issues requiring immediate attention */
  criticalIssues: string[];
  /** Warning issues */
  warnings: string[];
  /** Report generation timestamp */
  timestamp: Date;
  /** Report duration */
  generationTime: number;
}

export interface HealthThresholds {
  /** Database response time threshold (ms) */
  databaseResponseTime: number;
  /** Redis response time threshold (ms) */
  redisResponseTime: number;
  /** WebSocket response time threshold (ms) */
  websocketResponseTime: number;
  /** External API response time threshold (ms) */
  externalApiResponseTime: number;
  /** CPU usage threshold (%) */
  cpuUsageThreshold: number;
  /** Memory usage threshold (%) */
  memoryUsageThreshold: number;
  /** Disk usage threshold (%) */
  diskUsageThreshold: number;
  /** Overall health score threshold */
  healthScoreThreshold: number;
}

export interface ComponentWeights {
  /** Database weight in overall score calculation */
  database: number;
  /** Redis weight in overall score calculation */
  redis: number;
  /** WebSocket weight in overall score calculation */
  websocket: number;
  /** External APIs weight in overall score calculation */
  externalApis: number;
  /** System resources weight in overall score calculation */
  systemResources: number;
  /** Application weight in overall score calculation */
  application: number;
}

export interface HealthMetrics {
  /** System uptime in seconds */
  uptime: number;
  /** Memory statistics */
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  /** CPU statistics */
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  /** Disk statistics */
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  /** Network statistics */
  network?: {
    bytesIn: number;
    bytesOut: number;
  };
}

export interface DatabaseHealthDetails {
  /** Database version */
  version: string;
  /** Connection pool size */
  poolSize: number;
  /** Active connections */
  activeConnections: number;
  /** Idle connections */
  idleConnections: number;
  /** Query response time */
  queryResponseTime: number;
  /** Error information */
  error?: string;
}

export interface RedisHealthDetails {
  /** Redis version */
  version?: string;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Memory usage percentage */
  memoryPercentage: number;
  /** Connected clients count */
  connectedClients: number;
  /** Keys count */
  keyCount?: number;
  /** Error information */
  error?: string;
}

export interface WebSocketHealthDetails {
  /** Active WebSocket connections */
  activeConnections: number;
  /** Total connections since startup */
  totalConnections: number;
  /** Authenticated connections */
  authenticatedConnections: number;
  /** Server status */
  serverStatus: 'running' | 'stopped' | 'error';
  /** Error information */
  error?: string;
}

export interface ExternalApiHealthDetails {
  /** List of external services being checked */
  services: ExternalServiceHealth[];
  /** Number of failed services */
  failedServices: string[];
  /** Overall external services status */
  overallStatus: HealthStatus;
}

export interface ExternalServiceHealth {
  /** Service name */
  name: string;
  /** Service URL */
  url: string;
  /** Response time */
  responseTime: number;
  /** HTTP status code */
  statusCode?: number;
  /** Service status */
  status: HealthStatus;
  /** Error message if failed */
  error?: string;
}

export interface HistoricalHealthData {
  /** Timestamp of the health check */
  timestamp: Date;
  /** Overall health score at this time */
  overallScore: number;
  /** Component scores at this time */
  componentScores: Record<SystemComponent, number>;
  /** Any critical issues at this time */
  issues: string[];
}

export interface HealthTrend {
  /** Component or overall system */
  target: SystemComponent | 'overall';
  /** Trend direction */
  trend: 'improving' | 'stable' | 'degrading';
  /** Percentage change over time period */
  changePercentage: number;
  /** Time period for trend calculation */
  timePeriod: string;
  /** Historical data points */
  dataPoints: { timestamp: Date; value: number; }[];
}

export interface HealthCheckConfig {
  /** Enable/disable health checks */
  enabled: boolean;
  /** Health check interval in milliseconds */
  checkInterval: number;
  /** Health check timeout in milliseconds */
  timeout: number;
  /** Thresholds configuration */
  thresholds: HealthThresholds;
  /** Component weights for score calculation */
  componentWeights: ComponentWeights;
  /** Enable historical data collection */
  collectHistoricalData: boolean;
  /** Historical data retention period in days */
  historicalDataRetention: number;
}

export interface UseSystemHealthOptions {
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Enable real-time updates */
  realTimeUpdates?: boolean;
  /** Include historical data */
  includeHistory?: boolean;
  /** Components to monitor */
  components?: SystemComponent[];
}

export interface SystemHealthState {
  /** Current health report */
  healthReport: SystemHealthReport | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Last update timestamp */
  lastUpdated: Date | null;
  /** Connection status for real-time updates */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Historical health data */
  historicalData: HistoricalHealthData[];
  /** Health trends */
  trends: HealthTrend[];
}

export interface HealthCheckService {
  /** Check specific component health */
  checkComponentHealth(component: SystemComponent): Promise<HealthCheckResult>;
  /** Get overall system health report */
  getHealthReport(): Promise<SystemHealthReport>;
  /** Get historical health data */
  getHistoricalData(timeRange: [Date, Date]): Promise<HistoricalHealthData[]>;
  /** Start continuous health monitoring */
  startMonitoring(interval?: number): void;
  /** Stop health monitoring */
  stopMonitoring(): void;
  /** Check if monitoring is active */
  isMonitoring(): boolean;
}