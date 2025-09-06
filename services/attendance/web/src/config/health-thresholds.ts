/**
 * Health Monitoring Thresholds Configuration
 * Phase 3.3.3.3 - System Health Monitoring
 */

import { HealthThresholds, ComponentWeights } from '@/types/health';

export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  // Response time thresholds (milliseconds)
  databaseResponseTime: 100,
  redisResponseTime: 50,
  websocketResponseTime: 100,
  externalApiResponseTime: 200,
  
  // Resource usage thresholds (percentage)
  cpuUsageThreshold: 80,
  memoryUsageThreshold: 85,
  diskUsageThreshold: 90,
  
  // Overall health score threshold
  healthScoreThreshold: 70
};

export const DEFAULT_COMPONENT_WEIGHTS: ComponentWeights = {
  database: 0.30,        // Database is critical
  redis: 0.15,          // Redis is important but not critical
  websocket: 0.20,      // WebSocket affects real-time features
  externalApis: 0.10,   // External APIs are least critical
  systemResources: 0.20, // System resources are important
  application: 0.05     // Application-specific metrics
};

export const CRITICAL_THRESHOLDS = {
  // When to mark components as critically unhealthy
  database: {
    responseTime: 1000,   // > 1 second
    downtime: 30000       // > 30 seconds
  },
  redis: {
    responseTime: 200,    // > 200ms
    downtime: 60000       // > 1 minute (less critical)
  },
  websocket: {
    responseTime: 500,    // > 500ms
    downtime: 30000       // > 30 seconds
  },
  systemResources: {
    cpu: 95,             // > 95%
    memory: 95,          // > 95%
    disk: 95             // > 95%
  }
};

export const DEGRADED_THRESHOLDS = {
  // When to mark components as degraded
  database: {
    responseTime: 200,    // > 200ms
    errorRate: 1         // > 1%
  },
  redis: {
    responseTime: 100,    // > 100ms
    errorRate: 2         // > 2%
  },
  websocket: {
    responseTime: 200,    // > 200ms
    connectionDropRate: 5 // > 5%
  },
  systemResources: {
    cpu: 80,             // > 80%
    memory: 85,          // > 85%
    disk: 90             // > 90%
  }
};

export const MONITORING_CONFIG = {
  // Health check intervals
  checkInterval: 30000,     // 30 seconds
  timeout: 5000,           // 5 seconds
  
  // Data retention
  historicalDataRetention: 30, // 30 days
  metricsBufferSize: 1000,     // Keep last 1000 data points
  
  // Auto cleanup
  enableAutoCleanup: true,
  cleanupInterval: 86400000,   // 24 hours
  
  // Real-time updates
  enableRealtimeUpdates: true,
  websocketReconnectAttempts: 5,
  websocketReconnectInterval: 5000
};

export function getThresholdForComponent(component: string, metric: string): number | undefined {
  const thresholds: Record<string, Record<string, number>> = {
    database: {
      responseTime: DEFAULT_HEALTH_THRESHOLDS.databaseResponseTime,
      ...DEGRADED_THRESHOLDS.database
    },
    redis: {
      responseTime: DEFAULT_HEALTH_THRESHOLDS.redisResponseTime,
      ...DEGRADED_THRESHOLDS.redis
    },
    websocket: {
      responseTime: DEFAULT_HEALTH_THRESHOLDS.websocketResponseTime,
      ...DEGRADED_THRESHOLDS.websocket
    },
    externalApis: {
      responseTime: DEFAULT_HEALTH_THRESHOLDS.externalApiResponseTime
    },
    systemResources: {
      cpu: DEFAULT_HEALTH_THRESHOLDS.cpuUsageThreshold,
      memory: DEFAULT_HEALTH_THRESHOLDS.memoryUsageThreshold,
      disk: DEFAULT_HEALTH_THRESHOLDS.diskUsageThreshold,
      ...DEGRADED_THRESHOLDS.systemResources
    }
  };

  return thresholds[component]?.[metric];
}

export function getComponentWeight(component: string): number {
  const weights: Record<string, number> = {
    database: DEFAULT_COMPONENT_WEIGHTS.database,
    redis: DEFAULT_COMPONENT_WEIGHTS.redis,
    websocket: DEFAULT_COMPONENT_WEIGHTS.websocket,
    externalApis: DEFAULT_COMPONENT_WEIGHTS.externalApis,
    systemResources: DEFAULT_COMPONENT_WEIGHTS.systemResources,
    application: DEFAULT_COMPONENT_WEIGHTS.application
  };

  return weights[component] || 0.1; // Default weight for unknown components
}