/**
 * Health Checker Service
 * Phase 3.3.3.3 - System Health Monitoring
 * GREEN Phase: Minimal implementation to pass tests
 */

import { 
  HealthStatus, 
  SystemComponent, 
  HealthCheckResult, 
  SystemHealthReport,
  HealthThresholds,
  ComponentWeights,
  HealthMetrics,
  DatabaseHealthDetails,
  RedisHealthDetails,
  WebSocketHealthDetails,
  ExternalApiHealthDetails
} from '@/types/health';

export class HealthChecker {
  private thresholds: HealthThresholds;
  private componentWeights: ComponentWeights;
  private timeout: number = 5000; // 5 seconds timeout

  constructor() {
    // Default thresholds
    this.thresholds = {
      databaseResponseTime: 100,
      redisResponseTime: 50,
      websocketResponseTime: 100,
      externalApiResponseTime: 200,
      cpuUsageThreshold: 80,
      memoryUsageThreshold: 85,
      diskUsageThreshold: 90,
      healthScoreThreshold: 70
    };

    // Default component weights for score calculation
    this.componentWeights = {
      database: 0.3,
      redis: 0.15,
      websocket: 0.2,
      externalApis: 0.1,
      systemResources: 0.2,
      application: 0.05
    };
  }

  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const connectionDetails = await this.connectToDatabase();
      const responseTime = Date.now() - startTime;
      
      const details: DatabaseHealthDetails = {
        version: connectionDetails.version || 'unknown',
        poolSize: connectionDetails.poolSize || 10,
        activeConnections: connectionDetails.activeConnections || 5,
        idleConnections: connectionDetails.idleConnections || 5,
        queryResponseTime: responseTime
      };

      const status = responseTime > this.thresholds.databaseResponseTime 
        ? HealthStatus.DEGRADED 
        : HealthStatus.HEALTHY;

      return {
        component: SystemComponent.DATABASE,
        status,
        responseTime,
        timestamp: new Date(),
        details
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: SystemComponent.DATABASE,
        status: HealthStatus.UNHEALTHY,
        responseTime,
        timestamp: new Date(),
        details: {
          version: 'unknown',
          poolSize: 0,
          activeConnections: 0,
          idleConnections: 0,
          queryResponseTime: responseTime,
          error: error.message
        }
      };
    }
  }

  async checkRedisHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const pingResult = await this.pingRedis();
      const responseTime = Date.now() - startTime;
      
      const details: RedisHealthDetails = {
        version: pingResult.version,
        memoryUsage: pingResult.memoryUsage || 0,
        memoryPercentage: pingResult.memoryPercentage || 0,
        connectedClients: pingResult.connectedClients || 1,
        keyCount: pingResult.keyCount
      };

      const status = responseTime > this.thresholds.redisResponseTime 
        ? HealthStatus.DEGRADED 
        : HealthStatus.HEALTHY;

      return {
        component: SystemComponent.REDIS,
        status,
        responseTime,
        timestamp: new Date(),
        details
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: SystemComponent.REDIS,
        status: HealthStatus.DEGRADED,
        responseTime,
        timestamp: new Date(),
        details: {
          memoryUsage: 0,
          memoryPercentage: 0,
          connectedClients: 0,
          error: error.message
        }
      };
    }
  }

  async checkWebSocketHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const wsStatus = await this.pingWebSocketServer();
      const responseTime = Date.now() - startTime;
      
      const details: WebSocketHealthDetails = {
        activeConnections: wsStatus.activeConnections || 0,
        totalConnections: wsStatus.totalConnections || 0,
        authenticatedConnections: wsStatus.authenticatedConnections || 0,
        serverStatus: 'running'
      };

      const status = responseTime > this.thresholds.websocketResponseTime 
        ? HealthStatus.DEGRADED 
        : HealthStatus.HEALTHY;

      return {
        component: SystemComponent.WEBSOCKET,
        status,
        responseTime,
        timestamp: new Date(),
        details
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: SystemComponent.WEBSOCKET,
        status: HealthStatus.UNHEALTHY,
        responseTime,
        timestamp: new Date(),
        details: {
          activeConnections: 0,
          totalConnections: 0,
          authenticatedConnections: 0,
          serverStatus: 'error',
          error: error.message
        }
      };
    }
  }

  async checkExternalAPIsHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const apiStatus = await this.checkExternalServices();
      const responseTime = Date.now() - startTime;
      
      const details: ExternalApiHealthDetails = {
        services: apiStatus.services || [],
        failedServices: apiStatus.failedServices || [],
        overallStatus: apiStatus.overallStatus || HealthStatus.HEALTHY
      };

      return {
        component: SystemComponent.EXTERNAL_APIS,
        status: apiStatus.overallStatus || HealthStatus.HEALTHY,
        responseTime,
        timestamp: new Date(),
        details
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: SystemComponent.EXTERNAL_APIS,
        status: HealthStatus.DEGRADED,
        responseTime,
        timestamp: new Date(),
        details: {
          services: [],
          failedServices: ['external-api-check'],
          overallStatus: HealthStatus.DEGRADED
        }
      };
    }
  }

  async checkSystemResourcesHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const systemStats = await this.getSystemStats();
      const responseTime = Date.now() - startTime;
      
      let status = HealthStatus.HEALTHY;
      
      if (systemStats.cpuUsage > this.thresholds.cpuUsageThreshold ||
          systemStats.memoryPercentage > this.thresholds.memoryUsageThreshold ||
          systemStats.diskPercentage > this.thresholds.diskUsageThreshold) {
        status = HealthStatus.DEGRADED;
      }

      if (systemStats.cpuUsage > 95 || 
          systemStats.memoryPercentage > 95 || 
          systemStats.diskPercentage > 95) {
        status = HealthStatus.UNHEALTHY;
      }

      return {
        component: SystemComponent.SYSTEM_RESOURCES,
        status,
        responseTime,
        timestamp: new Date(),
        details: {
          cpuUsage: systemStats.cpuUsage,
          memoryUsage: systemStats.memoryUsage,
          memoryTotal: systemStats.memoryTotal,
          memoryPercentage: systemStats.memoryPercentage,
          diskUsage: systemStats.diskUsage,
          diskTotal: systemStats.diskTotal,
          diskPercentage: systemStats.diskPercentage
        }
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: SystemComponent.SYSTEM_RESOURCES,
        status: HealthStatus.UNKNOWN,
        responseTime,
        timestamp: new Date(),
        details: {
          error: error.message
        }
      };
    }
  }

  async calculateOverallHealthScore(): Promise<number> {
    const healthChecks = await this.getAllHealthChecks();
    
    let totalScore = 0;
    let totalWeight = 0;

    for (const [component, result] of healthChecks) {
      const componentScore = this.getComponentScore(result);
      const weight = this.getComponentWeight(component);
      
      totalScore += componentScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  async getDetailedHealthReport(): Promise<SystemHealthReport> {
    const startTime = Date.now();
    
    try {
      const healthChecks = await this.getAllHealthChecks();
      const overallScore = await this.calculateOverallHealthScore();
      
      const componentScores: Record<SystemComponent, number> = {} as any;
      const componentResults: Record<SystemComponent, HealthCheckResult> = {} as any;
      const criticalIssues: string[] = [];
      const warnings: string[] = [];

      for (const [component, result] of healthChecks) {
        componentScores[component] = this.getComponentScore(result);
        componentResults[component] = result;
        
        if (result.status === HealthStatus.UNHEALTHY) {
          criticalIssues.push(`${component} is unhealthy: ${result.details.error || 'Health check failed'}`);
        } else if (result.status === HealthStatus.DEGRADED) {
          warnings.push(`${component} performance is degraded`);
        }
      }

      const overallStatus = overallScore >= this.thresholds.healthScoreThreshold 
        ? HealthStatus.HEALTHY 
        : overallScore >= 50 
          ? HealthStatus.DEGRADED 
          : HealthStatus.UNHEALTHY;

      return {
        overallScore,
        overallStatus,
        componentScores,
        componentResults,
        criticalIssues,
        warnings,
        timestamp: new Date(),
        generationTime: Date.now() - startTime
      };
    } catch (error: any) {
      // Fallback health report in case of errors
      return {
        overallScore: 0,
        overallStatus: HealthStatus.UNKNOWN,
        componentScores: {} as any,
        componentResults: {} as any,
        criticalIssues: [`Health report generation failed: ${error.message}`],
        warnings: [],
        timestamp: new Date(),
        generationTime: Date.now() - startTime
      };
    }
  }

  // Private helper methods
  private async connectToDatabase(): Promise<any> {
    // Simulate database connection check
    // In real implementation, this would connect to actual database
    await this.delay(Math.random() * 100);
    
    return {
      version: '14.9',
      poolSize: 10,
      activeConnections: Math.floor(Math.random() * 8) + 1,
      idleConnections: Math.floor(Math.random() * 5) + 1
    };
  }

  private async pingRedis(): Promise<any> {
    // Simulate Redis ping
    await this.delay(Math.random() * 50);
    
    return {
      version: '7.0',
      memoryUsage: Math.floor(Math.random() * 1000000000), // Random bytes
      memoryPercentage: Math.floor(Math.random() * 80) + 10,
      connectedClients: Math.floor(Math.random() * 20) + 1,
      keyCount: Math.floor(Math.random() * 10000)
    };
  }

  private async pingWebSocketServer(): Promise<any> {
    // Simulate WebSocket server check
    await this.delay(Math.random() * 80);
    
    return {
      activeConnections: Math.floor(Math.random() * 200) + 10,
      totalConnections: Math.floor(Math.random() * 1000) + 100,
      authenticatedConnections: Math.floor(Math.random() * 180) + 8
    };
  }

  private async checkExternalServices(): Promise<any> {
    // Simulate external API checks
    await this.delay(Math.random() * 150);
    
    const services = [
      { name: 'auth-service', url: 'https://auth.example.com', status: HealthStatus.HEALTHY, responseTime: 50 },
      { name: 'notification-service', url: 'https://notify.example.com', status: HealthStatus.HEALTHY, responseTime: 80 }
    ];

    return {
      services,
      failedServices: [],
      overallStatus: HealthStatus.HEALTHY
    };
  }

  private async getSystemStats(): Promise<any> {
    // Simulate system resource check
    await this.delay(Math.random() * 30);
    
    const memoryUsage = Math.floor(Math.random() * 8000000000); // 8GB max
    const memoryTotal = 16000000000; // 16GB total
    const diskUsage = Math.floor(Math.random() * 500000000000); // 500GB max
    const diskTotal = 1000000000000; // 1TB total

    return {
      cpuUsage: Math.floor(Math.random() * 60) + 20, // 20-80%
      memoryUsage,
      memoryTotal,
      memoryPercentage: Math.floor((memoryUsage / memoryTotal) * 100),
      diskUsage,
      diskTotal,
      diskPercentage: Math.floor((diskUsage / diskTotal) * 100)
    };
  }

  private async getAllHealthChecks(): Promise<Map<SystemComponent, HealthCheckResult>> {
    const checks = new Map<SystemComponent, HealthCheckResult>();
    
    try {
      const [database, redis, websocket, externalApis, systemResources] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkWebSocketHealth(),
        this.checkExternalAPIsHealth(),
        this.checkSystemResourcesHealth()
      ]);

      checks.set(SystemComponent.DATABASE, database);
      checks.set(SystemComponent.REDIS, redis);
      checks.set(SystemComponent.WEBSOCKET, websocket);
      checks.set(SystemComponent.EXTERNAL_APIS, externalApis);
      checks.set(SystemComponent.SYSTEM_RESOURCES, systemResources);
    } catch (error) {
      // Return partial results even if some checks fail
    }
    
    return checks;
  }

  private getComponentScore(result: HealthCheckResult): number {
    switch (result.status) {
      case HealthStatus.HEALTHY: return 100;
      case HealthStatus.DEGRADED: return 60;
      case HealthStatus.UNHEALTHY: return 20;
      case HealthStatus.UNKNOWN: return 0;
      default: return 0;
    }
  }

  private getComponentWeight(component: SystemComponent): number {
    switch (component) {
      case SystemComponent.DATABASE: return this.componentWeights.database;
      case SystemComponent.REDIS: return this.componentWeights.redis;
      case SystemComponent.WEBSOCKET: return this.componentWeights.websocket;
      case SystemComponent.EXTERNAL_APIS: return this.componentWeights.externalApis;
      case SystemComponent.SYSTEM_RESOURCES: return this.componentWeights.systemResources;
      case SystemComponent.APPLICATION: return this.componentWeights.application;
      default: return 0.1;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}