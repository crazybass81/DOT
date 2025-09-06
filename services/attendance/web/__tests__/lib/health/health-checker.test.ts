/**
 * Health Checker Service Test Suite
 * Phase 3.3.3.3 - System Health Monitoring
 * TDD Implementation: RED Phase - Failing Tests
 */

import { HealthChecker } from '@/lib/health/health-checker';
import { HealthStatus, SystemComponent, HealthCheckResult } from '@/types/health';

describe('HealthChecker', () => {
  let healthChecker: HealthChecker;

  beforeEach(() => {
    healthChecker = new HealthChecker();
  });

  describe('Database Health Checks', () => {
    test('should check database connection health', async () => {
      const result = await healthChecker.checkDatabaseHealth();
      
      expect(result).toMatchObject({
        component: SystemComponent.DATABASE,
        status: expect.any(String),
        responseTime: expect.any(Number),
        timestamp: expect.any(Date),
        details: expect.any(Object)
      });
    });

    test('should detect database connection failure', async () => {
      // Mock database connection failure
      const mockError = new Error('Connection refused');
      jest.spyOn(healthChecker as any, 'connectToDatabase').mockRejectedValueOnce(mockError);
      
      const result = await healthChecker.checkDatabaseHealth();
      
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.details.error).toBe('Connection refused');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    test('should measure database response time accurately', async () => {
      const startTime = Date.now();
      const result = await healthChecker.checkDatabaseHealth();
      const endTime = Date.now();
      
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeLessThanOrEqual(endTime - startTime + 10); // 10ms tolerance
    });

    test('should provide detailed database connection info', async () => {
      const result = await healthChecker.checkDatabaseHealth();
      
      expect(result.details).toHaveProperty('poolSize');
      expect(result.details).toHaveProperty('activeConnections');
      expect(result.details).toHaveProperty('idleConnections');
      expect(result.details).toHaveProperty('version');
    });
  });

  describe('Redis Cache Health Checks', () => {
    test('should check Redis connection health', async () => {
      const result = await healthChecker.checkRedisHealth();
      
      expect(result).toMatchObject({
        component: SystemComponent.REDIS,
        status: expect.any(String),
        responseTime: expect.any(Number),
        timestamp: expect.any(Date),
        details: expect.any(Object)
      });
    });

    test('should handle Redis unavailability gracefully', async () => {
      const mockError = new Error('Redis connection timeout');
      jest.spyOn(healthChecker as any, 'pingRedis').mockRejectedValueOnce(mockError);
      
      const result = await healthChecker.checkRedisHealth();
      
      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.details.error).toBe('Redis connection timeout');
    });

    test('should verify Redis memory usage', async () => {
      const result = await healthChecker.checkRedisHealth();
      
      if (result.status === HealthStatus.HEALTHY) {
        expect(result.details).toHaveProperty('memoryUsage');
        expect(result.details).toHaveProperty('memoryPercentage');
        expect(result.details.memoryPercentage).toBeGreaterThanOrEqual(0);
        expect(result.details.memoryPercentage).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('WebSocket Connection Pool Health', () => {
    test('should check WebSocket server health', async () => {
      const result = await healthChecker.checkWebSocketHealth();
      
      expect(result).toMatchObject({
        component: SystemComponent.WEBSOCKET,
        status: expect.any(String),
        responseTime: expect.any(Number),
        timestamp: expect.any(Date),
        details: expect.any(Object)
      });
    });

    test('should report active WebSocket connections', async () => {
      const result = await healthChecker.checkWebSocketHealth();
      
      expect(result.details).toHaveProperty('activeConnections');
      expect(result.details).toHaveProperty('totalConnections');
      expect(result.details).toHaveProperty('authenticatedConnections');
      expect(result.details.activeConnections).toBeGreaterThanOrEqual(0);
    });

    test('should detect WebSocket server down status', async () => {
      const mockError = new Error('WebSocket server not responding');
      jest.spyOn(healthChecker as any, 'pingWebSocketServer').mockRejectedValueOnce(mockError);
      
      const result = await healthChecker.checkWebSocketHealth();
      
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.details.error).toBe('WebSocket server not responding');
    });
  });

  describe('External API Dependencies Health', () => {
    test('should check external API dependencies', async () => {
      const result = await healthChecker.checkExternalAPIsHealth();
      
      expect(result).toMatchObject({
        component: SystemComponent.EXTERNAL_APIS,
        status: expect.any(String),
        responseTime: expect.any(Number),
        timestamp: expect.any(Date),
        details: expect.any(Object)
      });
    });

    test('should handle external API failures', async () => {
      const mockError = new Error('External service unavailable');
      jest.spyOn(healthChecker as any, 'checkExternalServices').mockRejectedValueOnce(mockError);
      
      const result = await healthChecker.checkExternalAPIsHealth();
      
      expect([HealthStatus.DEGRADED, HealthStatus.UNHEALTHY]).toContain(result.status);
      expect(result.details.failedServices).toBeDefined();
    });
  });

  describe('System Resources Health', () => {
    test('should check system CPU usage', async () => {
      const result = await healthChecker.checkSystemResourcesHealth();
      
      expect(result.details).toHaveProperty('cpuUsage');
      expect(result.details.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(result.details.cpuUsage).toBeLessThanOrEqual(100);
    });

    test('should check system memory usage', async () => {
      const result = await healthChecker.checkSystemResourcesHealth();
      
      expect(result.details).toHaveProperty('memoryUsage');
      expect(result.details).toHaveProperty('memoryTotal');
      expect(result.details).toHaveProperty('memoryPercentage');
      expect(result.details.memoryPercentage).toBeGreaterThanOrEqual(0);
      expect(result.details.memoryPercentage).toBeLessThanOrEqual(100);
    });

    test('should check disk space usage', async () => {
      const result = await healthChecker.checkSystemResourcesHealth();
      
      expect(result.details).toHaveProperty('diskUsage');
      expect(result.details).toHaveProperty('diskTotal');
      expect(result.details).toHaveProperty('diskPercentage');
      expect(result.details.diskPercentage).toBeGreaterThanOrEqual(0);
      expect(result.details.diskPercentage).toBeLessThanOrEqual(100);
    });

    test('should mark system unhealthy when resources exceed thresholds', async () => {
      // Mock high resource usage
      jest.spyOn(healthChecker as any, 'getSystemStats').mockResolvedValueOnce({
        cpuUsage: 95,
        memoryPercentage: 92,
        diskPercentage: 88
      });
      
      const result = await healthChecker.checkSystemResourcesHealth();
      
      expect([HealthStatus.DEGRADED, HealthStatus.UNHEALTHY]).toContain(result.status);
    });
  });

  describe('Overall Health Score Calculation', () => {
    test('should calculate overall system health score', async () => {
      const healthScore = await healthChecker.calculateOverallHealthScore();
      
      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(100);
    });

    test('should provide component breakdown in health score', async () => {
      const healthReport = await healthChecker.getDetailedHealthReport();
      
      expect(healthReport).toHaveProperty('overallScore');
      expect(healthReport).toHaveProperty('componentScores');
      expect(healthReport).toHaveProperty('criticalIssues');
      expect(healthReport.componentScores).toHaveProperty(SystemComponent.DATABASE);
      expect(healthReport.componentScores).toHaveProperty(SystemComponent.REDIS);
    });

    test('should identify critical system issues', async () => {
      // Mock critical failures
      jest.spyOn(healthChecker, 'checkDatabaseHealth').mockResolvedValueOnce({
        component: SystemComponent.DATABASE,
        status: HealthStatus.UNHEALTHY,
        responseTime: 5000,
        timestamp: new Date(),
        details: { error: 'Critical database failure' }
      });
      
      const healthReport = await healthChecker.getDetailedHealthReport();
      
      expect(healthReport.criticalIssues).toHaveLength(1);
      expect(healthReport.criticalIssues[0]).toContain('database');
      expect(healthReport.overallScore).toBeLessThan(50);
    });

    test('should weight critical components higher in score calculation', async () => {
      // Mock different component statuses
      const mockResults = new Map();
      mockResults.set(SystemComponent.DATABASE, { status: HealthStatus.UNHEALTHY, responseTime: 1000 });
      mockResults.set(SystemComponent.REDIS, { status: HealthStatus.HEALTHY, responseTime: 10 });
      
      jest.spyOn(healthChecker as any, 'getAllHealthChecks').mockResolvedValueOnce(mockResults);
      
      const healthScore = await healthChecker.calculateOverallHealthScore();
      
      // Database failure should significantly impact overall score
      expect(healthScore).toBeLessThan(60);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle partial health check failures gracefully', async () => {
      // Mock one component failing
      jest.spyOn(healthChecker, 'checkDatabaseHealth').mockRejectedValueOnce(new Error('Database check failed'));
      
      const healthReport = await healthChecker.getDetailedHealthReport();
      
      expect(healthReport).toBeDefined();
      expect(healthReport.overallScore).toBeGreaterThanOrEqual(0);
      expect(healthReport.criticalIssues.length).toBeGreaterThan(0);
    });

    test('should timeout long-running health checks', async () => {
      // Mock a slow health check
      jest.spyOn(healthChecker as any, 'connectToDatabase').mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );
      
      const startTime = Date.now();
      const result = await healthChecker.checkDatabaseHealth();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(6000); // Should timeout before 6 seconds
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
    });
  });
});