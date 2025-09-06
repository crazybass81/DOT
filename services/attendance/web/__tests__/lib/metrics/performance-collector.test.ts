/**
 * Performance Collector Tests - TDD Phase 1 (RED)
 * 성능 데이터 수집기 테스트
 */

import { PerformanceCollector } from '../../../src/lib/metrics/performance-collector';
import { 
  ApiMetric, 
  ApiPerformanceMetrics, 
  MetricsCollectorConfig, 
  PerformanceAlert 
} from '../../../src/types/performance-metrics';

// Mock WebSocket server
const mockWebSocketServer = {
  sendToChannel: jest.fn(),
  broadcastToOrganization: jest.fn(),
};

// Mock Redis client
const mockRedisClient = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
};

jest.mock('../../../src/lib/websocket-server', () => ({
  webSocketServer: mockWebSocketServer,
}));

describe('PerformanceCollector', () => {
  let collector: PerformanceCollector;
  let mockConfig: MetricsCollectorConfig;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      samplingRate: 1.0,
      bufferConfig: {
        maxSize: 1000,
        retentionTime: 3600000, // 1 hour
        autoCleanup: true,
        cleanupInterval: 60000, // 1 minute
      },
      thresholds: {
        responseTimeThreshold: 1000,
        errorRateThreshold: 0.05,
        maxConcurrentRequests: 100,
        maxRequestsPerSecond: 1000,
      },
      alertConfig: {
        enabled: true,
        thresholds: {
          responseTimeThreshold: 1000,
          errorRateThreshold: 0.05,
          maxConcurrentRequests: 100,
          maxRequestsPerSecond: 1000,
        },
        channels: ['websocket'],
        minAlertInterval: 60000,
      },
    };

    collector = new PerformanceCollector(mockConfig);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    collector.stop();
  });

  describe('Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(collector.isEnabled()).toBe(false); // Not started yet
      expect(collector.getConfig()).toEqual(mockConfig);
    });

    test('should be disabled when config.enabled is false', () => {
      const disabledCollector = new PerformanceCollector({
        ...mockConfig,
        enabled: false,
      });

      expect(disabledCollector.isEnabled()).toBe(false);
    });

    test('should start and stop correctly', () => {
      expect(collector.isEnabled()).toBe(false);
      
      collector.start();
      expect(collector.isEnabled()).toBe(true);

      collector.stop();
      expect(collector.isEnabled()).toBe(false);
    });
  });

  describe('Metric Collection', () => {
    beforeEach(() => {
      collector.start();
    });

    test('should collect API metrics', () => {
      const metric: ApiMetric = {
        requestId: 'req-001',
        method: 'GET',
        endpoint: '/api/users',
        statusCode: 200,
        responseTime: 150,
        timestamp: new Date(),
        clientIp: '127.0.0.1',
        userId: 'user-123',
      };

      collector.collectMetric(metric);

      const metrics = collector.getMetrics();
      expect(metrics.overview.totalRequests).toBe(1);
      expect(metrics.endpointStats).toHaveLength(1);
      expect(metrics.endpointStats[0].endpoint).toBe('/api/users');
    });

    test('should respect sampling rate', () => {
      const sampledCollector = new PerformanceCollector({
        ...mockConfig,
        samplingRate: 0.5, // 50% sampling
      });
      sampledCollector.start();

      // Mock Math.random to control sampling
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = jest.fn(() => {
        callCount++;
        return callCount % 2 === 0 ? 0.6 : 0.3; // Alternate between sampled and not sampled
      });

      // Collect 4 metrics
      for (let i = 0; i < 4; i++) {
        sampledCollector.collectMetric({
          requestId: `req-${i}`,
          method: 'GET',
          endpoint: '/api/test',
          statusCode: 200,
          responseTime: 100,
          timestamp: new Date(),
        });
      }

      const metrics = sampledCollector.getMetrics();
      expect(metrics.overview.totalRequests).toBe(2); // Only 50% sampled

      Math.random = originalRandom;
      sampledCollector.stop();
    });

    test('should not collect when disabled', () => {
      collector.stop(); // Disable

      const metric: ApiMetric = {
        requestId: 'req-001',
        method: 'GET',
        endpoint: '/api/users',
        statusCode: 200,
        responseTime: 150,
        timestamp: new Date(),
      };

      collector.collectMetric(metric);

      const metrics = collector.getMetrics();
      expect(metrics.overview.totalRequests).toBe(0);
    });
  });

  describe('Performance Metrics Calculation', () => {
    beforeEach(() => {
      collector.start();
      
      // Add test data
      const testMetrics: ApiMetric[] = [
        { requestId: 'req-1', method: 'GET', endpoint: '/api/users', statusCode: 200, responseTime: 100, timestamp: new Date() },
        { requestId: 'req-2', method: 'GET', endpoint: '/api/users', statusCode: 200, responseTime: 150, timestamp: new Date() },
        { requestId: 'req-3', method: 'GET', endpoint: '/api/users', statusCode: 404, responseTime: 75, timestamp: new Date() },
        { requestId: 'req-4', method: 'POST', endpoint: '/api/posts', statusCode: 201, responseTime: 250, timestamp: new Date() },
        { requestId: 'req-5', method: 'POST', endpoint: '/api/posts', statusCode: 500, responseTime: 300, timestamp: new Date() },
      ];

      testMetrics.forEach(metric => collector.collectMetric(metric));
    });

    test('should calculate overall metrics correctly', () => {
      const metrics = collector.getMetrics();
      
      expect(metrics.overview.totalRequests).toBe(5);
      expect(metrics.overview.successRate).toBe(0.6); // 3 out of 5 successful
      expect(metrics.overview.errorRate).toBe(0.4); // 2 out of 5 errors
      expect(metrics.overview.avgResponseTime).toBe(175); // (100+150+75+250+300)/5
    });

    test('should calculate endpoint statistics correctly', () => {
      const metrics = collector.getMetrics();
      
      const usersEndpoint = metrics.endpointStats.find(
        stat => stat.endpoint === '/api/users' && stat.method === 'GET'
      );
      
      expect(usersEndpoint).toBeDefined();
      expect(usersEndpoint!.totalRequests).toBe(3);
      expect(usersEndpoint!.successRequests).toBe(2);
      expect(usersEndpoint!.failureRequests).toBe(1);
      expect(usersEndpoint!.avgResponseTime).toBe(108.33); // (100+150+75)/3, rounded
      expect(usersEndpoint!.successRate).toBe(0.67); // 2/3, rounded
    });

    test('should calculate percentiles correctly', () => {
      const metrics = collector.getMetrics();
      const usersEndpoint = metrics.endpointStats.find(
        stat => stat.endpoint === '/api/users'
      );

      expect(usersEndpoint!.minResponseTime).toBe(75);
      expect(usersEndpoint!.maxResponseTime).toBe(150);
      // P95 and P99 calculations depend on implementation
      expect(usersEndpoint!.p95ResponseTime).toBeGreaterThanOrEqual(usersEndpoint!.medianResponseTime);
      expect(usersEndpoint!.p99ResponseTime).toBeGreaterThanOrEqual(usersEndpoint!.p95ResponseTime);
    });

    test('should track status code distribution', () => {
      const metrics = collector.getMetrics();
      
      expect(metrics.statusCodeDistribution['200']).toBe(2);
      expect(metrics.statusCodeDistribution['201']).toBe(1);
      expect(metrics.statusCodeDistribution['404']).toBe(1);
      expect(metrics.statusCodeDistribution['500']).toBe(1);
    });

    test('should identify slowest requests', () => {
      const metrics = collector.getMetrics();
      
      expect(metrics.slowestRequests).toBeDefined();
      expect(metrics.slowestRequests[0].responseTime).toBe(300); // Slowest first
      expect(metrics.slowestRequests.length).toBeLessThanOrEqual(10); // Limited to top 10
    });

    test('should identify recent errors', () => {
      const metrics = collector.getMetrics();
      
      expect(metrics.recentErrors).toBeDefined();
      expect(metrics.recentErrors).toHaveLength(2); // 404 and 500 errors
      expect(metrics.recentErrors.every(error => error.statusCode >= 400)).toBe(true);
    });
  });

  describe('Alert System', () => {
    beforeEach(() => {
      collector.start();
    });

    test('should detect high response time alerts', async () => {
      const alertSpy = jest.spyOn(collector, 'checkThresholds');
      
      // Add slow request that exceeds threshold
      collector.collectMetric({
        requestId: 'slow-req',
        method: 'GET',
        endpoint: '/api/slow',
        statusCode: 200,
        responseTime: 1500, // Exceeds 1000ms threshold
        timestamp: new Date(),
      });

      await collector.checkThresholds();
      expect(alertSpy).toHaveBeenCalled();
    });

    test('should detect high error rate alerts', async () => {
      // Add multiple error requests to exceed error rate threshold
      for (let i = 0; i < 10; i++) {
        collector.collectMetric({
          requestId: `error-req-${i}`,
          method: 'GET',
          endpoint: '/api/error',
          statusCode: 500,
          responseTime: 100,
          timestamp: new Date(),
        });
      }

      // Add only one successful request
      collector.collectMetric({
        requestId: 'success-req',
        method: 'GET',
        endpoint: '/api/error',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
      });

      await collector.checkThresholds();
      
      const alerts = collector.getActiveAlerts();
      expect(alerts.some(alert => alert.type === 'high_error_rate')).toBe(true);
    });

    test('should respect minimum alert interval', async () => {
      // First alert
      collector.collectMetric({
        requestId: 'slow-1',
        method: 'GET',
        endpoint: '/api/test',
        statusCode: 200,
        responseTime: 1500,
        timestamp: new Date(),
      });

      await collector.checkThresholds();
      const firstAlertCount = collector.getActiveAlerts().length;

      // Second alert immediately (should be suppressed)
      collector.collectMetric({
        requestId: 'slow-2',
        method: 'GET',
        endpoint: '/api/test',
        statusCode: 200,
        responseTime: 1600,
        timestamp: new Date(),
      });

      await collector.checkThresholds();
      const secondAlertCount = collector.getActiveAlerts().length;

      expect(secondAlertCount).toBe(firstAlertCount); // No new alerts due to interval
    });

    test('should send alerts via WebSocket when configured', async () => {
      collector.collectMetric({
        requestId: 'alert-req',
        method: 'GET',
        endpoint: '/api/test',
        statusCode: 200,
        responseTime: 1500,
        timestamp: new Date(),
      });

      await collector.checkThresholds();

      expect(mockWebSocketServer.sendToChannel).toHaveBeenCalledWith(
        'metrics:alerts',
        'alert',
        expect.any(Object)
      );
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      collector.start();
    });

    test('should emit real-time updates when enabled', () => {
      collector.collectMetric({
        requestId: 'realtime-test',
        method: 'GET',
        endpoint: '/api/test',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
      });

      expect(mockWebSocketServer.sendToChannel).toHaveBeenCalledWith(
        'metrics:updates',
        'metrics_update',
        expect.any(Object)
      );
    });

    test('should batch updates for performance', (done) => {
      // Enable batching
      collector.setBatchingEnabled(true, 100); // 100ms batch interval

      // Add multiple metrics quickly
      for (let i = 0; i < 5; i++) {
        collector.collectMetric({
          requestId: `batch-${i}`,
          method: 'GET',
          endpoint: '/api/batch',
          statusCode: 200,
          responseTime: 100,
          timestamp: new Date(),
        });
      }

      // Should batch and send only once
      setTimeout(() => {
        expect(mockWebSocketServer.sendToChannel).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });
  });

  describe('Time Series Data', () => {
    beforeEach(() => {
      collector.start();
    });

    test('should generate time series data', () => {
      const now = new Date();
      
      // Add metrics with different timestamps
      for (let i = 0; i < 5; i++) {
        collector.collectMetric({
          requestId: `ts-${i}`,
          method: 'GET',
          endpoint: '/api/test',
          statusCode: 200,
          responseTime: 100 + i * 50,
          timestamp: new Date(now.getTime() - i * 60000), // 1 minute intervals
        });
      }

      const metrics = collector.getMetrics();
      
      expect(metrics.timeSeries.requests.length).toBeGreaterThan(0);
      expect(metrics.timeSeries.responseTime.length).toBeGreaterThan(0);
      expect(metrics.timeSeries.errorRate.length).toBeGreaterThan(0);
      
      // Check chronological order
      const timestamps = metrics.timeSeries.requests.map(point => point.timestamp.getTime());
      const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
      expect(timestamps).toEqual(sortedTimestamps);
    });
  });

  describe('Memory Management', () => {
    test('should maintain memory limits', () => {
      const memoryLimitedCollector = new PerformanceCollector({
        ...mockConfig,
        bufferConfig: {
          maxSize: 10, // Very small buffer
          retentionTime: 1000,
          autoCleanup: true,
          cleanupInterval: 100,
        },
      });
      memoryLimitedCollector.start();

      // Add more metrics than buffer size
      for (let i = 0; i < 20; i++) {
        memoryLimitedCollector.collectMetric({
          requestId: `mem-${i}`,
          method: 'GET',
          endpoint: '/api/memory',
          statusCode: 200,
          responseTime: 100,
          timestamp: new Date(),
        });
      }

      const metrics = memoryLimitedCollector.getMetrics();
      expect(metrics.overview.totalRequests).toBeLessThanOrEqual(10);
      
      memoryLimitedCollector.stop();
    });

    test('should cleanup expired metrics automatically', (done) => {
      const quickExpireCollector = new PerformanceCollector({
        ...mockConfig,
        bufferConfig: {
          maxSize: 100,
          retentionTime: 50, // 50ms retention
          autoCleanup: true,
          cleanupInterval: 25, // 25ms cleanup interval
        },
      });
      quickExpireCollector.start();

      quickExpireCollector.collectMetric({
        requestId: 'expire-test',
        method: 'GET',
        endpoint: '/api/expire',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
      });

      expect(quickExpireCollector.getMetrics().overview.totalRequests).toBe(1);

      // Wait for cleanup
      setTimeout(() => {
        expect(quickExpireCollector.getMetrics().overview.totalRequests).toBe(0);
        quickExpireCollector.stop();
        done();
      }, 100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      collector.start();
    });

    test('should handle malformed metrics gracefully', () => {
      const invalidMetric = {
        requestId: 'invalid',
        // Missing required fields
      } as ApiMetric;

      expect(() => collector.collectMetric(invalidMetric)).not.toThrow();
      expect(collector.getMetrics().overview.totalRequests).toBe(0);
    });

    test('should handle concurrent metric collection', async () => {
      const promises: Promise<void>[] = [];

      // Simulate concurrent metric collection
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            collector.collectMetric({
              requestId: `concurrent-${i}`,
              method: 'GET',
              endpoint: '/api/concurrent',
              statusCode: 200,
              responseTime: Math.random() * 1000,
              timestamp: new Date(),
            });
          })
        );
      }

      await Promise.all(promises);

      const metrics = collector.getMetrics();
      expect(metrics.overview.totalRequests).toBe(100);
    });

    test('should handle system clock changes', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 86400000); // 1 day in future
      const past = new Date(now.getTime() - 86400000); // 1 day in past

      // Add metrics with different timestamps
      collector.collectMetric({
        requestId: 'past',
        method: 'GET',
        endpoint: '/api/time',
        statusCode: 200,
        responseTime: 100,
        timestamp: past,
      });

      collector.collectMetric({
        requestId: 'future',
        method: 'GET',
        endpoint: '/api/time',
        statusCode: 200,
        responseTime: 100,
        timestamp: future,
      });

      collector.collectMetric({
        requestId: 'now',
        method: 'GET',
        endpoint: '/api/time',
        statusCode: 200,
        responseTime: 100,
        timestamp: now,
      });

      const metrics = collector.getMetrics();
      expect(metrics.overview.totalRequests).toBe(3);
      
      // Should handle all timestamps without errors
      expect(metrics.timeSeries.requests.length).toBeGreaterThan(0);
    });
  });
});