/**
 * Metrics Aggregator Test Suite
 * Phase 3.3.3.3 - Integration with Phase 3.3.3.1 & 3.3.3.2
 * TDD Implementation: RED Phase - Failing Tests
 */

import { MetricsAggregator } from '@/lib/health/metrics-aggregator';
import { SystemHealthReport } from '@/types/health';
import { ConnectionStats } from '@/types/monitoring';
import { ApiPerformanceMetrics } from '@/types/performance-metrics';

describe('MetricsAggregator', () => {
  let metricsAggregator: MetricsAggregator;

  beforeEach(() => {
    metricsAggregator = new MetricsAggregator();
  });

  describe('Phase 3.3.3.1 Integration - Real-time Connection Data', () => {
    test('should integrate real-time connection statistics', async () => {
      const mockConnectionStats: ConnectionStats = {
        totalConnections: 150,
        authenticatedConnections: 142,
        activeChannels: 8,
        connectionsByOrg: {
          'org1': 75,
          'org2': 45,
          'org3': 30
        },
        lastUpdated: new Date()
      };

      jest.spyOn(metricsAggregator as any, 'getConnectionStats')
        .mockResolvedValue(mockConnectionStats);

      const connectionMetrics = await metricsAggregator.getConnectionMetrics();

      expect(connectionMetrics).toMatchObject({
        totalConnections: 150,
        authenticatedConnections: 142,
        activeChannels: 8,
        connectionsByOrg: expect.any(Object)
      });

      expect(connectionMetrics.connectionsByOrg).toHaveProperty('org1');
      expect(connectionMetrics.connectionsByOrg['org1']).toBe(75);
    });

    test('should detect connection anomalies', async () => {
      const mockConnectionStats: ConnectionStats = {
        totalConnections: 1500, // Abnormally high
        authenticatedConnections: 750,
        activeChannels: 2,
        connectionsByOrg: {
          'org1': 1450, // One org with too many connections
          'org2': 30,
          'org3': 20
        },
        lastUpdated: new Date()
      };

      jest.spyOn(metricsAggregator as any, 'getConnectionStats')
        .mockResolvedValue(mockConnectionStats);

      const anomalies = await metricsAggregator.detectConnectionAnomalies();

      expect(anomalies).toContainEqual(
        expect.objectContaining({
          type: 'high_connection_count',
          severity: 'high',
          details: expect.objectContaining({
            currentConnections: 1500,
            threshold: expect.any(Number)
          })
        })
      );

      expect(anomalies).toContainEqual(
        expect.objectContaining({
          type: 'organization_connection_spike',
          organizationId: 'org1'
        })
      );
    });

    test('should calculate connection health score', async () => {
      const mockConnectionStats: ConnectionStats = {
        totalConnections: 100,
        authenticatedConnections: 95,
        activeChannels: 5,
        connectionsByOrg: {
          'org1': 50,
          'org2': 30,
          'org3': 20
        },
        lastUpdated: new Date()
      };

      jest.spyOn(metricsAggregator as any, 'getConnectionStats')
        .mockResolvedValue(mockConnectionStats);

      const connectionHealth = await metricsAggregator.calculateConnectionHealthScore();

      expect(connectionHealth).toMatchObject({
        score: expect.any(Number),
        status: expect.any(String),
        factors: expect.any(Object)
      });

      expect(connectionHealth.score).toBeGreaterThanOrEqual(0);
      expect(connectionHealth.score).toBeLessThanOrEqual(100);
      expect(connectionHealth.factors).toHaveProperty('authenticationRate');
      expect(connectionHealth.factors).toHaveProperty('channelUtilization');
    });

    test('should track connection trends over time', async () => {
      const historicalData = [
        { timestamp: new Date(Date.now() - 3600000), totalConnections: 80 },
        { timestamp: new Date(Date.now() - 1800000), totalConnections: 90 },
        { timestamp: new Date(Date.now()), totalConnections: 100 }
      ];

      jest.spyOn(metricsAggregator as any, 'getConnectionHistory')
        .mockResolvedValue(historicalData);

      const trends = await metricsAggregator.analyzeConnectionTrends();

      expect(trends).toMatchObject({
        direction: expect.any(String), // 'increasing', 'decreasing', 'stable'
        changeRate: expect.any(Number),
        prediction: expect.any(Object)
      });

      expect(trends.direction).toBe('increasing');
      expect(trends.changeRate).toBeGreaterThan(0);
    });
  });

  describe('Phase 3.3.3.2 Integration - API Performance Metrics', () => {
    test('should integrate API performance metrics', async () => {
      const mockApiMetrics: ApiPerformanceMetrics = {
        overview: {
          totalRequests: 10000,
          activeRequests: 25,
          requestsPerSecond: 50,
          avgResponseTime: 120,
          successRate: 99.2,
          errorRate: 0.8
        },
        endpointStats: [
          {
            endpoint: '/api/attendance/check-in',
            method: 'POST',
            totalRequests: 2500,
            successRequests: 2485,
            failureRequests: 15,
            avgResponseTime: 95,
            medianResponseTime: 80,
            p95ResponseTime: 180,
            p99ResponseTime: 250,
            minResponseTime: 45,
            maxResponseTime: 500,
            requestsPerMinute: 125,
            successRate: 99.4,
            lastUpdated: new Date()
          }
        ],
        statusCodeDistribution: {
          '200': 9920,
          '400': 45,
          '500': 35
        },
        timeSeries: {
          requests: [],
          responseTime: [],
          errorRate: []
        },
        recentErrors: [],
        slowestRequests: []
      };

      jest.spyOn(metricsAggregator as any, 'getApiMetrics')
        .mockResolvedValue(mockApiMetrics);

      const apiHealth = await metricsAggregator.getApiHealthMetrics();

      expect(apiHealth).toMatchObject({
        overallPerformance: expect.any(Object),
        endpointHealth: expect.any(Array),
        criticalEndpoints: expect.any(Array)
      });

      expect(apiHealth.overallPerformance.successRate).toBe(99.2);
      expect(apiHealth.endpointHealth).toHaveLength(1);
    });

    test('should detect API performance degradation', async () => {
      const mockSlowApiMetrics: ApiPerformanceMetrics = {
        overview: {
          totalRequests: 5000,
          activeRequests: 100, // High concurrent requests
          requestsPerSecond: 20, // Low throughput
          avgResponseTime: 2500, // High response time
          successRate: 85.0, // Low success rate
          errorRate: 15.0 // High error rate
        },
        endpointStats: [
          {
            endpoint: '/api/attendance/bulk-update',
            method: 'POST',
            totalRequests: 500,
            successRequests: 400,
            failureRequests: 100,
            avgResponseTime: 5000, // Very slow
            medianResponseTime: 4500,
            p95ResponseTime: 8000,
            p99ResponseTime: 12000,
            minResponseTime: 2000,
            maxResponseTime: 15000,
            requestsPerMinute: 10, // Low throughput
            successRate: 80.0, // Low success rate
            lastUpdated: new Date()
          }
        ],
        statusCodeDistribution: {
          '200': 4250,
          '400': 300,
          '500': 450
        },
        timeSeries: {
          requests: [],
          responseTime: [],
          errorRate: []
        },
        recentErrors: [],
        slowestRequests: []
      };

      jest.spyOn(metricsAggregator as any, 'getApiMetrics')
        .mockResolvedValue(mockSlowApiMetrics);

      const performanceIssues = await metricsAggregator.detectApiPerformanceIssues();

      expect(performanceIssues).toContainEqual(
        expect.objectContaining({
          type: 'high_response_time',
          severity: 'critical',
          details: expect.objectContaining({
            avgResponseTime: 2500,
            threshold: expect.any(Number)
          })
        })
      );

      expect(performanceIssues).toContainEqual(
        expect.objectContaining({
          type: 'high_error_rate',
          details: expect.objectContaining({
            errorRate: 15.0
          })
        })
      );

      expect(performanceIssues).toContainEqual(
        expect.objectContaining({
          type: 'low_throughput',
          details: expect.objectContaining({
            requestsPerSecond: 20
          })
        })
      );
    });

    test('should calculate API health score', async () => {
      const mockApiMetrics: ApiPerformanceMetrics = {
        overview: {
          totalRequests: 8000,
          activeRequests: 15,
          requestsPerSecond: 75,
          avgResponseTime: 150,
          successRate: 98.5,
          errorRate: 1.5
        },
        endpointStats: [
          {
            endpoint: '/api/users/profile',
            method: 'GET',
            totalRequests: 3000,
            successRequests: 2970,
            failureRequests: 30,
            avgResponseTime: 50,
            medianResponseTime: 45,
            p95ResponseTime: 85,
            p99ResponseTime: 120,
            minResponseTime: 20,
            maxResponseTime: 200,
            requestsPerMinute: 150,
            successRate: 99.0,
            lastUpdated: new Date()
          }
        ],
        statusCodeDistribution: {
          '200': 7880,
          '400': 80,
          '500': 40
        },
        timeSeries: {
          requests: [],
          responseTime: [],
          errorRate: []
        },
        recentErrors: [],
        slowestRequests: []
      };

      jest.spyOn(metricsAggregator as any, 'getApiMetrics')
        .mockResolvedValue(mockApiMetrics);

      const apiHealthScore = await metricsAggregator.calculateApiHealthScore();

      expect(apiHealthScore).toMatchObject({
        score: expect.any(Number),
        status: expect.any(String),
        breakdown: expect.any(Object)
      });

      expect(apiHealthScore.score).toBeGreaterThan(80); // Should be high due to good metrics
      expect(apiHealthScore.breakdown).toHaveProperty('responseTime');
      expect(apiHealthScore.breakdown).toHaveProperty('successRate');
      expect(apiHealthScore.breakdown).toHaveProperty('throughput');
    });
  });

  describe('Combined Health Dashboard Metrics', () => {
    test('should generate comprehensive system health report', async () => {
      const mockConnectionStats: ConnectionStats = {
        totalConnections: 200,
        authenticatedConnections: 190,
        activeChannels: 10,
        connectionsByOrg: { 'org1': 100, 'org2': 100 },
        lastUpdated: new Date()
      };

      const mockApiMetrics: ApiPerformanceMetrics = {
        overview: {
          totalRequests: 15000,
          activeRequests: 30,
          requestsPerSecond: 100,
          avgResponseTime: 100,
          successRate: 99.0,
          errorRate: 1.0
        },
        endpointStats: [],
        statusCodeDistribution: { '200': 14850, '400': 75, '500': 75 },
        timeSeries: { requests: [], responseTime: [], errorRate: [] },
        recentErrors: [],
        slowestRequests: []
      };

      jest.spyOn(metricsAggregator as any, 'getConnectionStats')
        .mockResolvedValue(mockConnectionStats);
      jest.spyOn(metricsAggregator as any, 'getApiMetrics')
        .mockResolvedValue(mockApiMetrics);

      const combinedReport = await metricsAggregator.generateCombinedHealthReport();

      expect(combinedReport).toMatchObject({
        overall: expect.any(Object),
        connections: expect.any(Object),
        api: expect.any(Object),
        infrastructure: expect.any(Object),
        alerts: expect.any(Array),
        recommendations: expect.any(Array),
        timestamp: expect.any(Date)
      });

      expect(combinedReport.overall).toHaveProperty('healthScore');
      expect(combinedReport.overall).toHaveProperty('status');
      expect(combinedReport.overall.healthScore).toBeGreaterThanOrEqual(0);
      expect(combinedReport.overall.healthScore).toBeLessThanOrEqual(100);
    });

    test('should identify cross-system correlations', async () => {
      // High connections but poor API performance
      const mockConnectionStats: ConnectionStats = {
        totalConnections: 500, // High load
        authenticatedConnections: 480,
        activeChannels: 15,
        connectionsByOrg: { 'org1': 300, 'org2': 200 },
        lastUpdated: new Date()
      };

      const mockApiMetrics: ApiPerformanceMetrics = {
        overview: {
          totalRequests: 25000,
          activeRequests: 150, // High concurrent load
          requestsPerSecond: 200,
          avgResponseTime: 800, // Slow due to high load
          successRate: 94.0, // Lower success rate
          errorRate: 6.0
        },
        endpointStats: [],
        statusCodeDistribution: { '200': 23500, '400': 750, '500': 750 },
        timeSeries: { requests: [], responseTime: [], errorRate: [] },
        recentErrors: [],
        slowestRequests: []
      };

      jest.spyOn(metricsAggregator as any, 'getConnectionStats')
        .mockResolvedValue(mockConnectionStats);
      jest.spyOn(metricsAggregator as any, 'getApiMetrics')
        .mockResolvedValue(mockApiMetrics);

      const correlations = await metricsAggregator.analyzeSystemCorrelations();

      expect(correlations).toContainEqual(
        expect.objectContaining({
          type: 'load_performance_correlation',
          description: expect.stringContaining('High connection count correlates with increased API response time'),
          strength: expect.any(Number), // Correlation strength
          impact: expect.any(String)
        })
      );

      expect(correlations).toContainEqual(
        expect.objectContaining({
          type: 'capacity_bottleneck',
          description: expect.stringContaining('System approaching capacity limits'),
          recommendations: expect.any(Array)
        })
      );
    });

    test('should provide system scaling recommendations', async () => {
      const mockHighLoadMetrics = {
        connections: {
          totalConnections: 800,
          authenticatedConnections: 750,
          activeChannels: 25,
          connectionsByOrg: { 'org1': 400, 'org2': 250, 'org3': 150 },
          lastUpdated: new Date()
        },
        api: {
          overview: {
            totalRequests: 50000,
            activeRequests: 200,
            requestsPerSecond: 300,
            avgResponseTime: 1200,
            successRate: 92.0,
            errorRate: 8.0
          },
          endpointStats: [],
          statusCodeDistribution: { '200': 46000, '400': 2000, '500': 2000 },
          timeSeries: { requests: [], responseTime: [], errorRate: [] },
          recentErrors: [],
          slowestRequests: []
        },
        resources: {
          cpuUsage: 85,
          memoryUsage: 90,
          diskUsage: 70
        }
      };

      jest.spyOn(metricsAggregator as any, 'getAllSystemMetrics')
        .mockResolvedValue(mockHighLoadMetrics);

      const recommendations = await metricsAggregator.generateScalingRecommendations();

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'horizontal_scaling',
          priority: 'high',
          description: expect.stringContaining('Consider adding more server instances'),
          metrics: expect.any(Object)
        })
      );

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'memory_upgrade',
          priority: 'critical',
          description: expect.stringContaining('Memory usage is critically high')
        })
      );

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'load_balancing',
          description: expect.stringContaining('Implement load balancing')
        })
      );
    });
  });

  describe('Historical Data Storage and Trends', () => {
    test('should store historical health metrics', async () => {
      const healthSnapshot = {
        timestamp: new Date(),
        overallHealthScore: 85,
        componentScores: {
          database: 90,
          redis: 95,
          websocket: 80,
          externalApis: 75,
          systemResources: 85
        },
        connections: {
          total: 150,
          authenticated: 140
        },
        api: {
          responseTime: 120,
          successRate: 98.5
        }
      };

      const storeHistoricalSpy = jest.spyOn(metricsAggregator as any, 'storeHistoricalMetrics');
      
      await metricsAggregator.captureHealthSnapshot();

      expect(storeHistoricalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
          overallHealthScore: expect.any(Number),
          componentScores: expect.any(Object)
        })
      );
    });

    test('should analyze health trends over time', async () => {
      const mockHistoricalData = [
        { timestamp: new Date(Date.now() - 7200000), overallHealthScore: 90 }, // 2 hours ago
        { timestamp: new Date(Date.now() - 3600000), overallHealthScore: 85 }, // 1 hour ago
        { timestamp: new Date(Date.now()), overallHealthScore: 78 } // now
      ];

      jest.spyOn(metricsAggregator as any, 'getHistoricalData')
        .mockResolvedValue(mockHistoricalData);

      const trends = await metricsAggregator.analyzeHealthTrends('2h');

      expect(trends).toMatchObject({
        period: '2h',
        direction: 'declining',
        changeRate: expect.any(Number),
        significance: expect.any(String),
        components: expect.any(Object)
      });

      expect(trends.direction).toBe('declining');
      expect(trends.changeRate).toBeLessThan(0); // Negative change rate
    });

    test('should predict future health trends', async () => {
      const mockTimeSeriesData = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 3600000),
        overallHealthScore: 90 - (i * 0.5) // Gradual decline
      }));

      jest.spyOn(metricsAggregator as any, 'getHistoricalData')
        .mockResolvedValue(mockTimeSeriesData);

      const prediction = await metricsAggregator.predictHealthTrends('6h');

      expect(prediction).toMatchObject({
        timeHorizon: '6h',
        predictedScore: expect.any(Number),
        confidence: expect.any(Number),
        riskFactors: expect.any(Array),
        recommendations: expect.any(Array)
      });

      expect(prediction.predictedScore).toBeLessThan(90); // Should predict continued decline
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    test('should clean up old historical data', async () => {
      const retentionPeriod = 30; // days
      const cutoffDate = new Date(Date.now() - (retentionPeriod * 24 * 3600 * 1000));

      const cleanupSpy = jest.spyOn(metricsAggregator as any, 'cleanupHistoricalData');
      
      await metricsAggregator.performDataCleanup(retentionPeriod);

      expect(cleanupSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cutoffDate: expect.any(Date),
          retentionDays: retentionPeriod
        })
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle Phase 3.3.3.1 connection data unavailability', async () => {
      jest.spyOn(metricsAggregator as any, 'getConnectionStats')
        .mockRejectedValue(new Error('Connection service unavailable'));

      const healthReport = await metricsAggregator.generateCombinedHealthReport();

      expect(healthReport.connections).toMatchObject({
        status: 'unavailable',
        error: 'Connection service unavailable',
        impact: expect.any(String)
      });

      // Overall health should still be calculable with degraded data
      expect(healthReport.overall.healthScore).toBeGreaterThanOrEqual(0);
    });

    test('should handle Phase 3.3.3.2 API metrics unavailability', async () => {
      jest.spyOn(metricsAggregator as any, 'getApiMetrics')
        .mockRejectedValue(new Error('API metrics service down'));

      const healthReport = await metricsAggregator.generateCombinedHealthReport();

      expect(healthReport.api).toMatchObject({
        status: 'unavailable',
        error: 'API metrics service down',
        impact: expect.any(String)
      });

      // Should provide fallback metrics or graceful degradation
      expect(healthReport.overall.healthScore).toBeDefined();
    });

    test('should handle partial metric collection failures', async () => {
      // Mock mixed success/failure scenario
      jest.spyOn(metricsAggregator as any, 'getConnectionStats')
        .mockResolvedValue({ totalConnections: 100, authenticatedConnections: 95 });
      jest.spyOn(metricsAggregator as any, 'getApiMetrics')
        .mockRejectedValue(new Error('API timeout'));
      jest.spyOn(metricsAggregator as any, 'getSystemResources')
        .mockResolvedValue({ cpuUsage: 45, memoryUsage: 60 });

      const healthReport = await metricsAggregator.generateCombinedHealthReport();

      expect(healthReport.connections.status).not.toBe('unavailable');
      expect(healthReport.api.status).toBe('unavailable');
      expect(healthReport.infrastructure.status).not.toBe('unavailable');
      
      // Overall health should reflect partial availability
      expect(healthReport.overall.healthScore).toBeLessThan(100);
      expect(healthReport.alerts).toContainEqual(
        expect.objectContaining({
          type: 'partial_metrics_failure',
          severity: 'medium'
        })
      );
    });
  });
});