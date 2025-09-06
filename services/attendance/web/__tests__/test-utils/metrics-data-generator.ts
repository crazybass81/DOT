/**
 * Metrics Data Generator for Integration Testing
 * 
 * Generates realistic monitoring data for testing dashboard components:
 * - Connection metrics with realistic patterns and fluctuations
 * - API performance data with load correlation and degradation patterns  
 * - System health metrics with resource usage simulation
 * - Alert scenarios with escalation patterns
 * - Load testing data with configurable volume and characteristics
 */

export interface ConnectionMetrics {
  activeConnections: number;
  totalConnections: number;
  connectionRate: number;
  disconnectionRate: number;
  averageSessionDuration: number;
  rejectedConnections: number;
  connectionSetupTime: number;
  timestamp: number;
}

export interface ApiMetrics {
  responseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  successRate: number;
  peakResponseTime: number;
  pendingRequests: number;
  statusCodeDistribution: Record<string, number>;
  slowQueries: number;
  timestamp: number;
}

export interface SystemHealthMetrics {
  healthScore: number;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  database: number;
  uptime: number;
  temperature?: number;
  timestamp: number;
}

export interface DatabaseMetrics {
  connections: number;
  queryTime: number;
  lockWaitTime: number;
  cacheHitRate: number;
  slowQueryCount: number;
  deadlockCount: number;
  poolUsage: number;
  timestamp: number;
}

export interface AlertData {
  id: string;
  type: 'connection' | 'api_performance' | 'system_health' | 'database' | 'integrated';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  message: string;
  source: string;
  timestamp: number;
  data?: any;
  acknowledged?: boolean;
  resolved?: boolean;
}

export interface DataGeneratorConfig {
  baselineConnections: number;
  baselineResponseTime: number;
  volatility: number; // 0-1, how much metrics fluctuate
  trendDirection: 'stable' | 'improving' | 'degrading' | 'oscillating';
  loadProfile: 'normal' | 'peak' | 'low' | 'stress';
  includeAnomalies: boolean;
  alertThresholds: {
    connectionLimit: number;
    responseTimeLimit: number;
    errorRateLimit: number;
    healthScoreLimit: number;
  };
}

export class MetricsDataGenerator {
  private config: DataGeneratorConfig;
  private startTime: number;
  private dataHistory: Array<{
    connections: ConnectionMetrics;
    api: ApiMetrics;
    system: SystemHealthMetrics;
    database: DatabaseMetrics;
  }> = [];
  
  private alertCounter = 0;
  private trendOffset = 0;
  private cyclePosition = 0;

  constructor(config: Partial<DataGeneratorConfig> = {}) {
    this.config = {
      baselineConnections: 500,
      baselineResponseTime: 200,
      volatility: 0.3,
      trendDirection: 'stable',
      loadProfile: 'normal',
      includeAnomalies: false,
      alertThresholds: {
        connectionLimit: 1000,
        responseTimeLimit: 500,
        errorRateLimit: 0.05,
        healthScoreLimit: 70
      },
      ...config
    };

    this.startTime = Date.now();
  }

  generateSnapshot(): {
    connections: ConnectionMetrics;
    api: ApiMetrics;
    system: SystemHealthMetrics;
    database: DatabaseMetrics;
    alerts: AlertData[];
  } {
    const timestamp = Date.now();
    const timeSinceStart = timestamp - this.startTime;
    
    // Apply trend and cycle effects
    this.updateTrendOffset(timeSinceStart);
    this.cyclePosition = (timeSinceStart / 60000) % 1; // 1-minute cycles

    const connections = this.generateConnectionMetrics(timestamp);
    const api = this.generateApiMetrics(timestamp, connections);
    const system = this.generateSystemHealthMetrics(timestamp, connections, api);
    const database = this.generateDatabaseMetrics(timestamp, api);
    const alerts = this.generateAlerts(timestamp, connections, api, system, database);

    // Store in history for correlation
    this.dataHistory.push({ connections, api, system, database });
    
    // Limit history size
    if (this.dataHistory.length > 1000) {
      this.dataHistory = this.dataHistory.slice(-1000);
    }

    return { connections, api, system, database, alerts };
  }

  private updateTrendOffset(timeSinceStart: number) {
    const trendSpeed = 0.0001; // Slow trend changes
    
    switch (this.config.trendDirection) {
      case 'improving':
        this.trendOffset = Math.min(0.5, timeSinceStart * trendSpeed);
        break;
      case 'degrading':
        this.trendOffset = Math.max(-0.5, -timeSinceStart * trendSpeed);
        break;
      case 'oscillating':
        this.trendOffset = Math.sin(timeSinceStart / 300000) * 0.3; // 5-minute waves
        break;
      default:
        this.trendOffset = 0;
    }
  }

  private generateConnectionMetrics(timestamp: number): ConnectionMetrics {
    let baseConnections = this.config.baselineConnections;
    
    // Apply load profile
    baseConnections *= this.getLoadMultiplier();
    
    // Apply trend
    baseConnections *= (1 + this.trendOffset);
    
    // Apply daily/hourly cycles
    const hourOfDay = new Date(timestamp).getHours();
    const dayMultiplier = this.getDayTimeMultiplier(hourOfDay);
    baseConnections *= dayMultiplier;
    
    // Add volatility and anomalies
    const volatilityFactor = 1 + (Math.random() - 0.5) * this.config.volatility;
    const activeConnections = Math.max(0, Math.floor(baseConnections * volatilityFactor));
    
    // Apply anomalies
    let finalConnections = activeConnections;
    if (this.config.includeAnomalies && Math.random() < 0.05) {
      finalConnections *= (Math.random() < 0.5) ? 0.3 : 2.5; // 5% chance of anomaly
    }

    const connectionRate = Math.max(0, 5 + (finalConnections / 100) + (Math.random() - 0.5) * 3);
    const disconnectionRate = connectionRate * 0.7 + Math.random() * 2;
    const avgSessionDuration = 1800 + (Math.random() - 0.5) * 600; // 30 ± 5 minutes

    return {
      activeConnections: Math.floor(finalConnections),
      totalConnections: Math.floor(finalConnections * 2.5),
      connectionRate: Number(connectionRate.toFixed(2)),
      disconnectionRate: Number(disconnectionRate.toFixed(2)),
      averageSessionDuration: Math.floor(avgSessionDuration),
      rejectedConnections: Math.max(0, Math.floor((finalConnections - 1000) / 10)),
      connectionSetupTime: finalConnections > 800 ? 100 + (finalConnections - 800) / 5 : 50,
      timestamp
    };
  }

  private generateApiMetrics(timestamp: number, connections: ConnectionMetrics): ApiMetrics {
    let baseResponseTime = this.config.baselineResponseTime;
    
    // Response time correlates with connection load
    const loadEffect = Math.log(Math.max(1, connections.activeConnections / 100));
    baseResponseTime *= (1 + loadEffect * 0.2);
    
    // Apply trend
    baseResponseTime *= (1 - this.trendOffset * 0.5); // Improving trend reduces response time
    
    // Add volatility
    const volatilityFactor = 1 + (Math.random() - 0.5) * this.config.volatility;
    let responseTime = baseResponseTime * volatilityFactor;
    
    // Apply anomalies
    if (this.config.includeAnomalies && Math.random() < 0.03) {
      responseTime *= 3 + Math.random() * 5; // Occasional very slow responses
    }

    // Calculate other metrics
    const maxCapacity = 100;
    const loadFactor = connections.activeConnections / 500;
    const requestsPerSecond = Math.max(1, maxCapacity - (loadFactor * 30) + (Math.random() - 0.5) * 10);
    
    const baseErrorRate = 0.01;
    const errorRate = Math.min(0.3, baseErrorRate + (loadFactor * 0.05) + (responseTime > 1000 ? 0.02 : 0));
    const successRate = 1 - errorRate;

    const statusCodeDistribution = this.generateStatusCodeDistribution(requestsPerSecond, errorRate);
    const slowQueries = responseTime > 500 ? Math.floor(responseTime / 100) : 0;

    return {
      responseTime: Math.floor(responseTime),
      requestsPerSecond: Number(requestsPerSecond.toFixed(1)),
      errorRate: Number(errorRate.toFixed(4)),
      successRate: Number(successRate.toFixed(4)),
      peakResponseTime: Math.floor(responseTime * (1.5 + Math.random() * 0.5)),
      pendingRequests: Math.floor(responseTime / 50),
      statusCodeDistribution,
      slowQueries,
      timestamp
    };
  }

  private generateSystemHealthMetrics(
    timestamp: number, 
    connections: ConnectionMetrics, 
    api: ApiMetrics
  ): SystemHealthMetrics {
    // CPU correlates with connections and API load
    const connectionLoad = connections.activeConnections / 1000;
    const apiLoad = api.responseTime / 1000;
    let cpu = 30 + (connectionLoad * 40) + (apiLoad * 20) + (Math.random() - 0.5) * 15;
    cpu = Math.max(5, Math.min(100, cpu));

    // Memory has some correlation with connections but also its own patterns
    let memory = 40 + (connectionLoad * 30) + Math.sin(this.cyclePosition * Math.PI * 2) * 10 + (Math.random() - 0.5) * 10;
    memory = Math.max(10, Math.min(100, memory));

    // Disk is less correlated, more stable
    let disk = 25 + Math.sin(this.cyclePosition * Math.PI * 4) * 15 + (Math.random() - 0.5) * 10;
    disk = Math.max(5, Math.min(95, disk));

    // Network correlates with connection activity
    let network = 20 + (connections.connectionRate * 5) + (Math.random() - 0.5) * 20;
    network = Math.max(5, Math.min(100, network));

    // Database health inversely correlates with API response time
    let database = Math.max(30, 100 - (api.responseTime / 10) - (api.errorRate * 200));
    database += (Math.random() - 0.5) * 10;
    database = Math.max(10, Math.min(100, database));

    // Calculate overall health score
    const healthScore = Math.floor(
      (cpu * 0.2 + memory * 0.2 + disk * 0.15 + network * 0.15 + database * 0.3) * 
      (cpu < 80 && memory < 85 ? 1 : 0.8)
    );

    const uptime = timestamp - this.startTime;

    return {
      healthScore: Math.max(10, Math.min(100, healthScore)),
      cpu: Math.floor(cpu),
      memory: Math.floor(memory),
      disk: Math.floor(disk),
      network: Math.floor(network),
      database: Math.floor(database),
      uptime,
      temperature: 35 + (cpu / 5) + (Math.random() - 0.5) * 5,
      timestamp
    };
  }

  private generateDatabaseMetrics(timestamp: number, api: ApiMetrics): DatabaseMetrics {
    // Database metrics correlate with API performance
    const loadFactor = api.responseTime / 200;
    
    let connections = Math.max(10, 50 + (loadFactor * 30) + (Math.random() - 0.5) * 10);
    connections = Math.min(100, connections);

    let queryTime = Math.max(1, 10 + (loadFactor * 20) + (Math.random() - 0.5) * 5);
    let lockWaitTime = queryTime > 25 ? (queryTime - 25) / 10 : Math.random() * 2;
    
    let cacheHitRate = Math.max(0.3, 0.95 - (loadFactor * 0.2) - (Math.random() * 0.1));
    
    const slowQueryCount = queryTime > 30 ? Math.floor(queryTime / 10) : 0;
    const deadlockCount = lockWaitTime > 5 ? Math.floor(Math.random() * 3) : 0;
    const poolUsage = connections / 100;

    return {
      connections: Math.floor(connections),
      queryTime: Number(queryTime.toFixed(2)),
      lockWaitTime: Number(lockWaitTime.toFixed(2)),
      cacheHitRate: Number(cacheHitRate.toFixed(3)),
      slowQueryCount,
      deadlockCount,
      poolUsage: Number(poolUsage.toFixed(3)),
      timestamp
    };
  }

  private generateAlerts(
    timestamp: number,
    connections: ConnectionMetrics,
    api: ApiMetrics,
    system: SystemHealthMetrics,
    database: DatabaseMetrics
  ): AlertData[] {
    const alerts: AlertData[] = [];

    // Connection alerts
    if (connections.activeConnections > this.config.alertThresholds.connectionLimit) {
      alerts.push({
        id: `alert-conn-${++this.alertCounter}`,
        type: 'connection',
        severity: connections.activeConnections > this.config.alertThresholds.connectionLimit * 1.5 ? 'critical' : 'warning',
        message: `High connection count: ${connections.activeConnections} active connections`,
        source: 'connection-monitor',
        timestamp,
        data: { activeConnections: connections.activeConnections }
      });
    }

    // API performance alerts
    if (api.responseTime > this.config.alertThresholds.responseTimeLimit) {
      alerts.push({
        id: `alert-api-${++this.alertCounter}`,
        type: 'api_performance',
        severity: api.responseTime > this.config.alertThresholds.responseTimeLimit * 2 ? 'critical' : 'warning',
        message: `Slow API response time: ${api.responseTime}ms average`,
        source: 'api-monitor',
        timestamp,
        data: { responseTime: api.responseTime, requestsPerSecond: api.requestsPerSecond }
      });
    }

    if (api.errorRate > this.config.alertThresholds.errorRateLimit) {
      alerts.push({
        id: `alert-error-${++this.alertCounter}`,
        type: 'api_performance',
        severity: api.errorRate > this.config.alertThresholds.errorRateLimit * 3 ? 'critical' : 'warning',
        message: `High error rate: ${(api.errorRate * 100).toFixed(2)}% of requests failing`,
        source: 'api-monitor',
        timestamp,
        data: { errorRate: api.errorRate }
      });
    }

    // System health alerts
    if (system.healthScore < this.config.alertThresholds.healthScoreLimit) {
      alerts.push({
        id: `alert-health-${++this.alertCounter}`,
        type: 'system_health',
        severity: system.healthScore < this.config.alertThresholds.healthScoreLimit * 0.7 ? 'critical' : 'warning',
        message: `Low system health score: ${system.healthScore}%`,
        source: 'health-monitor',
        timestamp,
        data: { healthScore: system.healthScore, cpu: system.cpu, memory: system.memory }
      });
    }

    // Resource-specific alerts
    if (system.cpu > 85) {
      alerts.push({
        id: `alert-cpu-${++this.alertCounter}`,
        type: 'system_health',
        severity: system.cpu > 95 ? 'critical' : 'warning',
        message: `High CPU usage: ${system.cpu}%`,
        source: 'system-monitor',
        timestamp,
        data: { cpu: system.cpu }
      });
    }

    if (system.memory > 90) {
      alerts.push({
        id: `alert-memory-${++this.alertCounter}`,
        type: 'system_health',
        severity: system.memory > 95 ? 'critical' : 'warning',
        message: `High memory usage: ${system.memory}%`,
        source: 'system-monitor',
        timestamp,
        data: { memory: system.memory }
      });
    }

    // Database alerts
    if (database.queryTime > 50) {
      alerts.push({
        id: `alert-db-${++this.alertCounter}`,
        type: 'database',
        severity: database.queryTime > 100 ? 'critical' : 'warning',
        message: `Slow database queries: ${database.queryTime}ms average`,
        source: 'database-monitor',
        timestamp,
        data: { queryTime: database.queryTime, slowQueryCount: database.slowQueryCount }
      });
    }

    if (database.poolUsage > 0.9) {
      alerts.push({
        id: `alert-pool-${++this.alertCounter}`,
        type: 'database',
        severity: database.poolUsage > 0.95 ? 'critical' : 'warning',
        message: `Database connection pool nearly exhausted: ${(database.poolUsage * 100).toFixed(1)}% usage`,
        source: 'database-monitor',
        timestamp,
        data: { poolUsage: database.poolUsage, connections: database.connections }
      });
    }

    // Integrated/cascading alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
    
    if (criticalAlerts >= 2 || (criticalAlerts >= 1 && warningAlerts >= 2)) {
      alerts.push({
        id: `alert-cascade-${++this.alertCounter}`,
        type: 'integrated',
        severity: criticalAlerts >= 3 ? 'emergency' : 'critical',
        message: `Multiple system issues detected: ${criticalAlerts} critical, ${warningAlerts} warning alerts`,
        source: 'alert-correlation-engine',
        timestamp,
        data: { 
          criticalAlerts, 
          warningAlerts, 
          affectedSystems: [...new Set(alerts.map(a => a.type))]
        }
      });
    }

    return alerts;
  }

  private getLoadMultiplier(): number {
    switch (this.config.loadProfile) {
      case 'low':
        return 0.3 + Math.random() * 0.2;
      case 'peak':
        return 1.5 + Math.random() * 0.5;
      case 'stress':
        return 2.0 + Math.random() * 1.0;
      default:
        return 0.8 + Math.random() * 0.4;
    }
  }

  private getDayTimeMultiplier(hour: number): number {
    // Simulate daily usage patterns (peak during business hours)
    if (hour >= 9 && hour <= 17) {
      return 1.0 + 0.5 * Math.sin(((hour - 9) / 8) * Math.PI);
    } else if (hour >= 18 && hour <= 22) {
      return 0.7 + 0.3 * Math.cos(((hour - 18) / 4) * Math.PI);
    } else {
      return 0.3 + Math.random() * 0.2;
    }
  }

  private generateStatusCodeDistribution(requestsPerSecond: number, errorRate: number): Record<string, number> {
    const totalRequests = Math.floor(requestsPerSecond * 60); // Per minute
    const errorRequests = Math.floor(totalRequests * errorRate);
    const successRequests = totalRequests - errorRequests;

    return {
      '200': Math.floor(successRequests * 0.85),
      '201': Math.floor(successRequests * 0.05),
      '204': Math.floor(successRequests * 0.10),
      '400': Math.floor(errorRequests * 0.4),
      '401': Math.floor(errorRequests * 0.1),
      '404': Math.floor(errorRequests * 0.2),
      '429': Math.floor(errorRequests * 0.1),
      '500': Math.floor(errorRequests * 0.15),
      '502': Math.floor(errorRequests * 0.03),
      '503': Math.floor(errorRequests * 0.02)
    };
  }

  // Utility methods for testing scenarios

  generateLoadTestingData(duration: number, frequency: number): Array<any> {
    const data: any[] = [];
    const interval = 1000 / frequency; // milliseconds between data points
    const endTime = Date.now() + duration;
    
    let currentTime = Date.now();
    while (currentTime < endTime) {
      const snapshot = this.generateSnapshot();
      data.push({
        ...snapshot,
        timestamp: currentTime
      });
      
      currentTime += interval;
    }
    
    return data;
  }

  generateStressTestingData(): Array<any> {
    const originalProfile = this.config.loadProfile;
    const originalAnomalies = this.config.includeAnomalies;
    
    // Configure for stress testing
    this.config.loadProfile = 'stress';
    this.config.includeAnomalies = true;
    
    const data: any[] = [];
    
    // Generate 5 minutes of stress test data
    for (let i = 0; i < 300; i++) { // 5 minutes of data at 1-second intervals
      const snapshot = this.generateSnapshot();
      data.push({
        ...snapshot,
        timestamp: Date.now() + (i * 1000)
      });
    }
    
    // Restore original configuration
    this.config.loadProfile = originalProfile;
    this.config.includeAnomalies = originalAnomalies;
    
    return data;
  }

  generateRecoveryScenarioData(): Array<any> {
    const data: any[] = [];
    const phases = [
      { profile: 'stress', duration: 30 }, // 30 seconds of stress
      { profile: 'peak', duration: 60 },   // 1 minute of high load
      { profile: 'normal', duration: 60 }, // 1 minute normal
      { profile: 'low', duration: 30 }     // 30 seconds recovery
    ];
    
    let currentTime = Date.now();
    
    for (const phase of phases) {
      const originalProfile = this.config.loadProfile;
      this.config.loadProfile = phase.profile as any;
      
      for (let i = 0; i < phase.duration; i++) {
        const snapshot = this.generateSnapshot();
        data.push({
          ...snapshot,
          timestamp: currentTime + (i * 1000),
          phase: phase.profile
        });
      }
      
      currentTime += phase.duration * 1000;
      this.config.loadProfile = originalProfile;
    }
    
    return data;
  }

  reset() {
    this.startTime = Date.now();
    this.dataHistory = [];
    this.alertCounter = 0;
    this.trendOffset = 0;
    this.cyclePosition = 0;
  }

  getHistoryCount(): number {
    return this.dataHistory.length;
  }

  getLatestSnapshot(): any {
    return this.dataHistory[this.dataHistory.length - 1] || null;
  }
}

// Factory functions for common scenarios
export function createNormalDataGenerator(): MetricsDataGenerator {
  return new MetricsDataGenerator({
    volatility: 0.2,
    trendDirection: 'stable',
    loadProfile: 'normal',
    includeAnomalies: false
  });
}

export function createStressDataGenerator(): MetricsDataGenerator {
  return new MetricsDataGenerator({
    baselineConnections: 1500,
    baselineResponseTime: 800,
    volatility: 0.5,
    trendDirection: 'degrading',
    loadProfile: 'stress',
    includeAnomalies: true,
    alertThresholds: {
      connectionLimit: 800,
      responseTimeLimit: 400,
      errorRateLimit: 0.03,
      healthScoreLimit: 80
    }
  });
}

export function createRecoveryDataGenerator(): MetricsDataGenerator {
  return new MetricsDataGenerator({
    baselineConnections: 1200,
    baselineResponseTime: 600,
    volatility: 0.4,
    trendDirection: 'improving',
    loadProfile: 'peak',
    includeAnomalies: false,
    alertThresholds: {
      connectionLimit: 1000,
      responseTimeLimit: 500,
      errorRateLimit: 0.04,
      healthScoreLimit: 75
    }
  });
}