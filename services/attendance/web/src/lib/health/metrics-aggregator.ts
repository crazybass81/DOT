/**
 * Metrics Aggregator Service
 * Phase 3.3.3.3 - Integration with Phase 3.3.3.1 & 3.3.3.2
 * GREEN Phase: Minimal implementation to pass tests
 */

import { ConnectionStats } from '@/types/monitoring';
import { ApiPerformanceMetrics } from '@/types/performance-metrics';
import { SystemComponent, HealthStatus } from '@/types/health';

export class MetricsAggregator {
  constructor() {}

  // Phase 3.3.3.1 Integration - Real-time Connection Data
  async getConnectionMetrics(): Promise<ConnectionStats> {
    const connectionStats = await this.getConnectionStats();
    return connectionStats;
  }

  async detectConnectionAnomalies(): Promise<any[]> {
    const connectionStats = await this.getConnectionStats();
    const anomalies: any[] = [];

    // Check for high connection count
    if (connectionStats.totalConnections > 1000) {
      anomalies.push({
        type: 'high_connection_count',
        severity: 'high',
        details: {
          currentConnections: connectionStats.totalConnections,
          threshold: 1000
        }
      });
    }

    // Check for organization connection spikes
    for (const [orgId, count] of Object.entries(connectionStats.connectionsByOrg)) {
      if (count > 1000) {
        anomalies.push({
          type: 'organization_connection_spike',
          organizationId: orgId,
          details: {
            connectionCount: count,
            threshold: 1000
          }
        });
      }
    }

    return anomalies;
  }

  async calculateConnectionHealthScore(): Promise<any> {
    const connectionStats = await this.getConnectionStats();
    
    // Calculate authentication rate
    const authRate = connectionStats.authenticatedConnections / connectionStats.totalConnections;
    
    // Calculate channel utilization
    const avgConnectionsPerChannel = connectionStats.totalConnections / Math.max(connectionStats.activeChannels, 1);
    const channelUtilization = Math.min(avgConnectionsPerChannel / 20, 1); // Assume 20 connections per channel is optimal

    // Overall score based on authentication rate and utilization
    const score = Math.round((authRate * 60 + channelUtilization * 40) * 100);
    
    let status: string;
    if (score >= 90) status = 'excellent';
    else if (score >= 80) status = 'good';
    else if (score >= 70) status = 'fair';
    else status = 'poor';

    return {
      score,
      status,
      factors: {
        authenticationRate: authRate,
        channelUtilization: channelUtilization
      }
    };
  }

  async analyzeConnectionTrends(): Promise<any> {
    const historicalData = await this.getConnectionHistory();
    
    if (historicalData.length < 2) {
      return {
        direction: 'stable',
        changeRate: 0,
        prediction: { nextHour: historicalData[0]?.totalConnections || 0 }
      };
    }

    // Calculate trend based on first and last data points
    const first = historicalData[0];
    const last = historicalData[historicalData.length - 1];
    
    const changeRate = ((last.totalConnections - first.totalConnections) / first.totalConnections) * 100;
    
    let direction: string;
    if (changeRate > 10) direction = 'increasing';
    else if (changeRate < -10) direction = 'decreasing';
    else direction = 'stable';

    return {
      direction,
      changeRate,
      prediction: {
        nextHour: Math.round(last.totalConnections * (1 + changeRate / 100))
      }
    };
  }

  // Phase 3.3.3.2 Integration - API Performance Metrics
  async getApiHealthMetrics(): Promise<any> {
    const apiMetrics = await this.getApiMetrics();
    
    const endpointHealth = apiMetrics.endpointStats.map(endpoint => ({
      endpoint: endpoint.endpoint,
      method: endpoint.method,
      healthScore: this.calculateEndpointHealthScore(endpoint),
      status: endpoint.successRate > 95 ? 'healthy' : endpoint.successRate > 90 ? 'degraded' : 'unhealthy'
    }));

    const criticalEndpoints = endpointHealth.filter(ep => ep.status === 'unhealthy');

    return {
      overallPerformance: {
        successRate: apiMetrics.overview.successRate,
        avgResponseTime: apiMetrics.overview.avgResponseTime,
        requestsPerSecond: apiMetrics.overview.requestsPerSecond,
        healthScore: this.calculateApiOverallHealthScore(apiMetrics)
      },
      endpointHealth,
      criticalEndpoints
    };
  }

  async detectApiPerformanceIssues(): Promise<any[]> {
    const apiMetrics = await this.getApiMetrics();
    const issues: any[] = [];

    // Check high response time
    if (apiMetrics.overview.avgResponseTime > 2000) {
      issues.push({
        type: 'high_response_time',
        severity: 'critical',
        details: {
          avgResponseTime: apiMetrics.overview.avgResponseTime,
          threshold: 2000
        }
      });
    }

    // Check high error rate
    if (apiMetrics.overview.errorRate > 10) {
      issues.push({
        type: 'high_error_rate',
        severity: 'high',
        details: {
          errorRate: apiMetrics.overview.errorRate,
          threshold: 10
        }
      });
    }

    // Check low throughput
    if (apiMetrics.overview.requestsPerSecond < 30) {
      issues.push({
        type: 'low_throughput',
        severity: 'medium',
        details: {
          requestsPerSecond: apiMetrics.overview.requestsPerSecond,
          threshold: 30
        }
      });
    }

    return issues;
  }

  async calculateApiHealthScore(): Promise<any> {
    const apiMetrics = await this.getApiMetrics();
    
    // Calculate component scores
    const responseTimeScore = Math.max(0, 100 - (apiMetrics.overview.avgResponseTime / 10)); // 1000ms = 0 score
    const successRateScore = apiMetrics.overview.successRate;
    const throughputScore = Math.min(apiMetrics.overview.requestsPerSecond * 2, 100); // 50 RPS = 100 score

    // Weighted average
    const score = Math.round(
      responseTimeScore * 0.4 + 
      successRateScore * 0.4 + 
      throughputScore * 0.2
    );

    let status: string;
    if (score >= 90) status = 'excellent';
    else if (score >= 80) status = 'good';
    else if (score >= 70) status = 'fair';
    else status = 'poor';

    return {
      score,
      status,
      breakdown: {
        responseTime: responseTimeScore,
        successRate: successRateScore,
        throughput: throughputScore
      }
    };
  }

  // Combined Health Dashboard Metrics
  async generateCombinedHealthReport(): Promise<any> {
    try {
      const [connectionStats, apiMetrics, systemResources] = await Promise.allSettled([
        this.getConnectionStats(),
        this.getApiMetrics(),
        this.getSystemResources()
      ]);

      const connections = connectionStats.status === 'fulfilled' 
        ? { status: 'available', data: connectionStats.value }
        : { status: 'unavailable', error: 'Connection service unavailable', impact: 'Real-time monitoring limited' };

      const api = apiMetrics.status === 'fulfilled'
        ? { status: 'available', data: apiMetrics.value }
        : { status: 'unavailable', error: 'API metrics service down', impact: 'Performance monitoring limited' };

      const infrastructure = systemResources.status === 'fulfilled'
        ? { status: 'available', data: systemResources.value }
        : { status: 'unavailable', error: 'System resource monitoring down', impact: 'Resource monitoring limited' };

      // Calculate overall health score
      let overallScore = 100;
      const alerts: any[] = [];

      if (connections.status === 'unavailable') {
        overallScore -= 25;
        alerts.push({ type: 'partial_metrics_failure', severity: 'medium', component: 'connections' });
      }

      if (api.status === 'unavailable') {
        overallScore -= 30;
        alerts.push({ type: 'partial_metrics_failure', severity: 'medium', component: 'api' });
      }

      if (infrastructure.status === 'unavailable') {
        overallScore -= 20;
        alerts.push({ type: 'partial_metrics_failure', severity: 'medium', component: 'infrastructure' });
      }

      return {
        overall: {
          healthScore: Math.max(0, overallScore),
          status: overallScore >= 80 ? 'healthy' : overallScore >= 60 ? 'degraded' : 'unhealthy'
        },
        connections,
        api,
        infrastructure,
        alerts,
        recommendations: this.generateRecommendations(connections, api, infrastructure),
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        overall: { healthScore: 0, status: 'unknown' },
        connections: { status: 'unavailable', error: 'System error' },
        api: { status: 'unavailable', error: 'System error' },
        infrastructure: { status: 'unavailable', error: 'System error' },
        alerts: [{ type: 'system_failure', severity: 'critical', message: error.message }],
        recommendations: [],
        timestamp: new Date()
      };
    }
  }

  async analyzeSystemCorrelations(): Promise<any[]> {
    const [connectionStats, apiMetrics] = await Promise.all([
      this.getConnectionStats(),
      this.getApiMetrics()
    ]);

    const correlations: any[] = [];

    // Check load-performance correlation
    if (connectionStats.totalConnections > 400 && apiMetrics.overview.avgResponseTime > 500) {
      correlations.push({
        type: 'load_performance_correlation',
        description: 'High connection count correlates with increased API response time',
        strength: 0.8,
        impact: 'Performance degradation under load'
      });
    }

    // Check capacity bottleneck
    if (connectionStats.totalConnections > 600 && apiMetrics.overview.requestsPerSecond > 150) {
      correlations.push({
        type: 'capacity_bottleneck',
        description: 'System approaching capacity limits',
        recommendations: [
          'Consider horizontal scaling',
          'Implement connection pooling',
          'Add load balancing'
        ]
      });
    }

    return correlations;
  }

  async generateScalingRecommendations(): Promise<any[]> {
    const systemMetrics = await this.getAllSystemMetrics();
    const recommendations: any[] = [];

    // Check for high resource usage
    if (systemMetrics.resources.cpuUsage > 80) {
      recommendations.push({
        type: 'cpu_scaling',
        priority: 'high',
        description: 'Consider upgrading CPU or adding more instances',
        metrics: { cpuUsage: systemMetrics.resources.cpuUsage }
      });
    }

    if (systemMetrics.resources.memoryUsage > 85) {
      recommendations.push({
        type: 'memory_upgrade',
        priority: 'critical',
        description: 'Memory usage is critically high',
        metrics: { memoryUsage: systemMetrics.resources.memoryUsage }
      });
    }

    // Check for high connection/API load
    if (systemMetrics.connections.totalConnections > 600) {
      recommendations.push({
        type: 'horizontal_scaling',
        priority: 'high',
        description: 'Consider adding more server instances',
        metrics: { totalConnections: systemMetrics.connections.totalConnections }
      });
    }

    if (systemMetrics.api.overview.activeRequests > 100) {
      recommendations.push({
        type: 'load_balancing',
        priority: 'medium',
        description: 'Implement load balancing to distribute requests',
        metrics: { activeRequests: systemMetrics.api.overview.activeRequests }
      });
    }

    return recommendations;
  }

  // Historical Data and Trends
  async captureHealthSnapshot(): Promise<void> {
    const healthSnapshot = {
      timestamp: new Date(),
      overallHealthScore: await this.calculateCombinedHealthScore(),
      componentScores: await this.getComponentHealthScores(),
      connections: await this.getConnectionSummary(),
      api: await this.getApiSummary()
    };

    await this.storeHistoricalMetrics(healthSnapshot);
  }

  async analyzeHealthTrends(period: string): Promise<any> {
    const historicalData = await this.getHistoricalData();
    
    if (historicalData.length < 2) {
      return {
        period,
        direction: 'stable',
        changeRate: 0,
        significance: 'insufficient_data',
        components: {}
      };
    }

    const first = historicalData[0];
    const last = historicalData[historicalData.length - 1];
    
    const changeRate = ((last.overallHealthScore - first.overallHealthScore) / first.overallHealthScore) * 100;
    
    let direction: string;
    let significance: string;

    if (Math.abs(changeRate) < 5) {
      direction = 'stable';
      significance = 'low';
    } else if (changeRate > 5) {
      direction = 'improving';
      significance = changeRate > 15 ? 'high' : 'medium';
    } else {
      direction = 'declining';
      significance = changeRate < -15 ? 'high' : 'medium';
    }

    return {
      period,
      direction,
      changeRate,
      significance,
      components: {
        database: this.calculateComponentTrend(historicalData, 'database'),
        api: this.calculateComponentTrend(historicalData, 'api'),
        connections: this.calculateComponentTrend(historicalData, 'connections')
      }
    };
  }

  async predictHealthTrends(timeHorizon: string): Promise<any> {
    const historicalData = await this.getHistoricalData();
    
    if (historicalData.length < 3) {
      return {
        timeHorizon,
        predictedScore: historicalData[historicalData.length - 1]?.overallHealthScore || 50,
        confidence: 0.3,
        riskFactors: ['Insufficient historical data'],
        recommendations: ['Collect more data for accurate predictions']
      };
    }

    // Simple linear prediction based on trend
    const scores = historicalData.map(d => d.overallHealthScore);
    const trend = this.calculateLinearTrend(scores);
    
    const hoursAhead = this.parseTimeHorizon(timeHorizon);
    const predictedScore = Math.max(0, Math.min(100, scores[scores.length - 1] + (trend * hoursAhead)));
    
    const confidence = Math.max(0.1, Math.min(0.9, 1 - (Math.abs(trend) / 10))); // Higher confidence for stable trends

    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (predictedScore < 70) {
      riskFactors.push('Predicted health degradation');
      recommendations.push('Proactive monitoring recommended');
    }

    if (trend < -2) {
      riskFactors.push('Declining health trend detected');
      recommendations.push('Investigate root causes');
    }

    return {
      timeHorizon,
      predictedScore: Math.round(predictedScore),
      confidence,
      riskFactors,
      recommendations
    };
  }

  async performDataCleanup(retentionDays: number): Promise<void> {
    const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 3600 * 1000));
    
    await this.cleanupHistoricalData({
      cutoffDate,
      retentionDays
    });
  }

  // Private helper methods
  private async getConnectionStats(): Promise<ConnectionStats> {
    // Mock connection stats - in real implementation, this would fetch from Phase 3.3.3.1
    await this.delay(50);
    return {
      totalConnections: Math.floor(Math.random() * 500) + 50,
      authenticatedConnections: Math.floor(Math.random() * 450) + 40,
      activeChannels: Math.floor(Math.random() * 10) + 5,
      connectionsByOrg: {
        'org1': Math.floor(Math.random() * 200) + 20,
        'org2': Math.floor(Math.random() * 150) + 15,
        'org3': Math.floor(Math.random() * 100) + 10
      },
      lastUpdated: new Date()
    };
  }

  private async getApiMetrics(): Promise<ApiPerformanceMetrics> {
    // Mock API metrics - in real implementation, this would fetch from Phase 3.3.3.2
    await this.delay(80);
    return {
      overview: {
        totalRequests: Math.floor(Math.random() * 20000) + 5000,
        activeRequests: Math.floor(Math.random() * 50) + 10,
        requestsPerSecond: Math.floor(Math.random() * 100) + 30,
        avgResponseTime: Math.floor(Math.random() * 300) + 50,
        successRate: Math.random() * 10 + 90, // 90-100%
        errorRate: Math.random() * 5 // 0-5%
      },
      endpointStats: [
        {
          endpoint: '/api/attendance/check-in',
          method: 'POST',
          totalRequests: 1000,
          successRequests: 980,
          failureRequests: 20,
          avgResponseTime: Math.floor(Math.random() * 200) + 50,
          medianResponseTime: Math.floor(Math.random() * 150) + 40,
          p95ResponseTime: Math.floor(Math.random() * 400) + 100,
          p99ResponseTime: Math.floor(Math.random() * 600) + 200,
          minResponseTime: 20,
          maxResponseTime: 800,
          requestsPerMinute: 50,
          successRate: 98.0,
          lastUpdated: new Date()
        }
      ],
      statusCodeDistribution: {
        '200': 18000,
        '400': 150,
        '500': 100
      },
      timeSeries: {
        requests: [],
        responseTime: [],
        errorRate: []
      },
      recentErrors: [],
      slowestRequests: []
    };
  }

  private async getSystemResources(): Promise<any> {
    await this.delay(30);
    return {
      cpuUsage: Math.floor(Math.random() * 60) + 20,
      memoryUsage: Math.floor(Math.random() * 70) + 20,
      diskUsage: Math.floor(Math.random() * 50) + 30
    };
  }

  private async getConnectionHistory(): Promise<any[]> {
    // Mock historical connection data
    return Array.from({ length: 6 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 1800000), // Every 30 minutes
      totalConnections: Math.floor(Math.random() * 100) + 50 + i * 5 // Slight upward trend
    })).reverse();
  }

  private async getAllSystemMetrics(): Promise<any> {
    const [connections, api, resources] = await Promise.all([
      this.getConnectionStats(),
      this.getApiMetrics(),
      this.getSystemResources()
    ]);

    return { connections, api, resources };
  }

  private calculateEndpointHealthScore(endpoint: any): number {
    const responseTimeScore = Math.max(0, 100 - (endpoint.avgResponseTime / 10));
    const successRateScore = endpoint.successRate;
    return Math.round((responseTimeScore + successRateScore) / 2);
  }

  private calculateApiOverallHealthScore(apiMetrics: ApiPerformanceMetrics): number {
    const responseTimeScore = Math.max(0, 100 - (apiMetrics.overview.avgResponseTime / 10));
    const successRateScore = apiMetrics.overview.successRate;
    const throughputScore = Math.min(apiMetrics.overview.requestsPerSecond * 2, 100);
    
    return Math.round((responseTimeScore * 0.4) + (successRateScore * 0.4) + (throughputScore * 0.2));
  }

  private generateRecommendations(connections: any, api: any, infrastructure: any): string[] {
    const recommendations: string[] = [];
    
    if (connections.status === 'unavailable') {
      recommendations.push('Restore connection monitoring service');
    }
    
    if (api.status === 'unavailable') {
      recommendations.push('Restore API performance monitoring');
    }
    
    if (infrastructure.status === 'unavailable') {
      recommendations.push('Check system resource monitoring');
    }

    return recommendations;
  }

  private async calculateCombinedHealthScore(): Promise<number> {
    // Simplified combined health score calculation
    return Math.floor(Math.random() * 30) + 70; // 70-100
  }

  private async getComponentHealthScores(): Promise<any> {
    return {
      database: Math.floor(Math.random() * 20) + 80,
      redis: Math.floor(Math.random() * 20) + 85,
      websocket: Math.floor(Math.random() * 30) + 70,
      api: Math.floor(Math.random() * 25) + 75
    };
  }

  private async getConnectionSummary(): Promise<any> {
    const stats = await this.getConnectionStats();
    return {
      total: stats.totalConnections,
      authenticated: stats.authenticatedConnections
    };
  }

  private async getApiSummary(): Promise<any> {
    const metrics = await this.getApiMetrics();
    return {
      responseTime: metrics.overview.avgResponseTime,
      successRate: metrics.overview.successRate
    };
  }

  private async storeHistoricalMetrics(snapshot: any): Promise<void> {
    // Mock storage - in real implementation, this would store to database
    await this.delay(20);
  }

  private async getHistoricalData(): Promise<any[]> {
    // Mock historical data
    return Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000),
      overallHealthScore: Math.floor(Math.random() * 20) + 70 - i // Slight decline over time
    })).reverse();
  }

  private calculateComponentTrend(historicalData: any[], component: string): any {
    // Simplified trend calculation
    return {
      direction: 'stable',
      changeRate: Math.random() * 10 - 5 // -5% to +5%
    };
  }

  private calculateLinearTrend(values: number[]): number {
    // Simple trend calculation - difference per time unit
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    return (last - first) / values.length;
  }

  private parseTimeHorizon(timeHorizon: string): number {
    // Parse time horizon string (e.g., "6h", "2d") into hours
    const match = timeHorizon.match(/(\d+)([hd])/);
    if (!match) return 1;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return unit === 'h' ? value : value * 24;
  }

  private async cleanupHistoricalData(options: any): Promise<void> {
    // Mock cleanup
    await this.delay(100);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}