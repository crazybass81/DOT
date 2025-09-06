/**
 * API Metrics Middleware Tests - TDD Phase 1 (RED)
 * Express.js 미들웨어 테스트 - API 호출 메트릭 수집
 */

import { Request, Response, NextFunction } from 'express';
import { createRequest, createResponse } from 'node-mocks-http';
import { apiMetricsMiddleware, ApiMetricsMiddleware } from '../../src/middleware/api-metrics';
import { PerformanceCollector } from '../../src/lib/metrics/performance-collector';
import { MetricsCollectorConfig } from '../../src/types/performance-metrics';

// Mock PerformanceCollector
jest.mock('../../src/lib/metrics/performance-collector');

describe('API Metrics Middleware', () => {
  let middleware: ApiMetricsMiddleware;
  let mockCollector: jest.Mocked<PerformanceCollector>;
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    // Setup mock collector
    mockCollector = {
      collectMetric: jest.fn(),
      isEnabled: jest.fn().mockReturnValue(true),
      getConfig: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    } as any;

    (PerformanceCollector as jest.MockedClass<typeof PerformanceCollector>).mockImplementation(() => mockCollector);

    middleware = new ApiMetricsMiddleware();
    next = jest.fn();

    // Create mock request and response
    req = createRequest({
      method: 'GET',
      url: '/api/users',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '192.168.1.1',
      },
      body: { test: 'data' },
    });

    res = createResponse({
      eventEmitter: require('events').EventEmitter,
    });

    // Mock response methods
    res.json = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
  });

  describe('Middleware Creation', () => {
    test('should create middleware instance with default config', () => {
      expect(middleware).toBeDefined();
      expect(middleware.getMiddleware).toBeDefined();
      expect(typeof middleware.getMiddleware()).toBe('function');
    });

    test('should accept custom configuration', () => {
      const customConfig: Partial<MetricsCollectorConfig> = {
        samplingRate: 0.5,
        thresholds: {
          responseTimeThreshold: 500,
          errorRateThreshold: 0.1,
          maxConcurrentRequests: 50,
          maxRequestsPerSecond: 500,
        },
      };

      const customMiddleware = new ApiMetricsMiddleware(customConfig);
      expect(customMiddleware).toBeDefined();
    });

    test('should use factory function', () => {
      const middlewareFunction = apiMetricsMiddleware({
        enabled: true,
        samplingRate: 0.8,
      });

      expect(typeof middlewareFunction).toBe('function');
    });
  });

  describe('Request Tracking', () => {
    test('should track basic request information', () => {
      const middlewareFunction = middleware.getMiddleware();
      
      middlewareFunction(req, res, next);
      
      // Simulate response end
      res.statusCode = 200;
      res.emit('finish');

      expect(mockCollector.collectMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: '/api/users',
          statusCode: 200,
          requestId: expect.any(String),
          timestamp: expect.any(Date),
          responseTime: expect.any(Number),
          clientIp: '192.168.1.1',
        })
      );
    });

    test('should generate unique request IDs', () => {
      const middlewareFunction = middleware.getMiddleware();
      const requestIds: string[] = [];

      // Process multiple requests
      for (let i = 0; i < 5; i++) {
        const newReq = createRequest({
          method: 'GET',
          url: `/api/test-${i}`,
        });
        const newRes = createResponse({
          eventEmitter: require('events').EventEmitter,
        });

        middlewareFunction(newReq, newRes, next);
        newRes.statusCode = 200;
        newRes.emit('finish');

        const lastCall = mockCollector.collectMetric.mock.calls[i];
        requestIds.push(lastCall[0].requestId);
      }

      // All request IDs should be unique
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(5);
    });

    test('should measure response time accurately', (done) => {
      const middlewareFunction = middleware.getMiddleware();
      const startTime = Date.now();

      middlewareFunction(req, res, next);

      // Simulate delayed response
      setTimeout(() => {
        res.statusCode = 200;
        res.emit('finish');

        const endTime = Date.now();
        const expectedDuration = endTime - startTime;

        expect(mockCollector.collectMetric).toHaveBeenCalledWith(
          expect.objectContaining({
            responseTime: expect.any(Number),
          })
        );

        const actualResponseTime = mockCollector.collectMetric.mock.calls[0][0].responseTime;
        expect(actualResponseTime).toBeGreaterThanOrEqual(90); // Allow some timing variance
        expect(actualResponseTime).toBeLessThan(expectedDuration + 50); // Upper bound check

        done();
      }, 100);
    });

    test('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const middlewareFunction = middleware.getMiddleware();

      methods.forEach((method) => {
        const methodReq = createRequest({
          method,
          url: '/api/test',
        });
        const methodRes = createResponse({
          eventEmitter: require('events').EventEmitter,
        });

        middlewareFunction(methodReq, methodRes, next);
        methodRes.statusCode = 200;
        methodRes.emit('finish');
      });

      expect(mockCollector.collectMetric).toHaveBeenCalledTimes(5);
      
      // Check each method was recorded
      methods.forEach((method, index) => {
        expect(mockCollector.collectMetric.mock.calls[index][0].method).toBe(method);
      });
    });

    test('should track various status codes', () => {
      const statusCodes = [200, 201, 400, 401, 404, 500, 503];
      const middlewareFunction = middleware.getMiddleware();

      statusCodes.forEach((statusCode) => {
        const statusReq = createRequest({
          method: 'GET',
          url: '/api/test',
        });
        const statusRes = createResponse({
          eventEmitter: require('events').EventEmitter,
        });

        middlewareFunction(statusReq, statusRes, next);
        statusRes.statusCode = statusCode;
        statusRes.emit('finish');
      });

      expect(mockCollector.collectMetric).toHaveBeenCalledTimes(7);
      
      statusCodes.forEach((statusCode, index) => {
        expect(mockCollector.collectMetric.mock.calls[index][0].statusCode).toBe(statusCode);
      });
    });
  });

  describe('Request/Response Size Tracking', () => {
    test('should track request body size', () => {
      const middlewareFunction = middleware.getMiddleware();
      
      req.body = { 
        largeData: 'x'.repeat(1000), // 1KB of data
        nested: { data: 'test' }
      };

      middlewareFunction(req, res, next);
      res.statusCode = 200;
      res.emit('finish');

      expect(mockCollector.collectMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          requestSize: expect.any(Number),
        })
      );

      const requestSize = mockCollector.collectMetric.mock.calls[0][0].requestSize;
      expect(requestSize).toBeGreaterThan(1000); // Should be at least 1KB
    });

    test('should track response size', () => {
      const middlewareFunction = middleware.getMiddleware();
      const responseData = { message: 'success', data: 'x'.repeat(500) };

      middlewareFunction(req, res, next);
      
      // Mock response data
      res._getData = jest.fn().mockReturnValue(JSON.stringify(responseData));
      res.statusCode = 200;
      res.emit('finish');

      expect(mockCollector.collectMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          responseSize: expect.any(Number),
        })
      );

      const responseSize = mockCollector.collectMetric.mock.calls[0][0].responseSize;
      expect(responseSize).toBeGreaterThan(500);
    });

    test('should handle missing request body', () => {
      const middlewareFunction = middleware.getMiddleware();
      
      delete req.body; // No body

      middlewareFunction(req, res, next);
      res.statusCode = 200;
      res.emit('finish');

      expect(mockCollector.collectMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          requestSize: 0,
        })
      );
    });
  });

  describe('Client Information Extraction', () => {
    test('should extract client IP from various headers', () => {
      const middlewareFunction = middleware.getMiddleware();
      const testCases = [
        { headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' }, expected: '203.0.113.1' },
        { headers: { 'x-real-ip': '203.0.113.2' }, expected: '203.0.113.2' },
        { headers: { 'x-client-ip': '203.0.113.3' }, expected: '203.0.113.3' },
        { headers: {}, remoteAddress: '192.168.1.100', expected: '192.168.1.100' },
      ];

      testCases.forEach(({ headers, remoteAddress, expected }, index) => {
        const testReq = createRequest({
          method: 'GET',
          url: '/api/test',
          headers,
          connection: { remoteAddress },
        });
        const testRes = createResponse({
          eventEmitter: require('events').EventEmitter,
        });

        middlewareFunction(testReq, testRes, next);
        testRes.statusCode = 200;
        testRes.emit('finish');

        expect(mockCollector.collectMetric.mock.calls[index][0].clientIp).toBe(expected);
      });
    });

    test('should extract user information from request', () => {
      const middlewareFunction = middleware.getMiddleware();
      
      // Mock authenticated request
      req.user = { id: 'user-123', organizationId: 'org-456' };

      middlewareFunction(req, res, next);
      res.statusCode = 200;
      res.emit('finish');

      expect(mockCollector.collectMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          organizationId: 'org-456',
        })
      );
    });

    test('should handle unauthenticated requests', () => {
      const middlewareFunction = middleware.getMiddleware();
      
      // No user info
      delete req.user;

      middlewareFunction(req, res, next);
      res.statusCode = 200;
      res.emit('finish');

      expect(mockCollector.collectMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
          organizationId: undefined,
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle response errors gracefully', () => {
      const middlewareFunction = middleware.getMiddleware();

      middlewareFunction(req, res, next);
      
      // Simulate response error
      res.statusCode = 500;
      const error = new Error('Internal Server Error');
      res.emit('error', error);

      // Should still collect metric even on error
      expect(mockCollector.collectMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          errorMessage: 'Internal Server Error',
        })
      );
    });

    test('should handle collector errors gracefully', () => {
      const middlewareFunction = middleware.getMiddleware();
      
      // Mock collector to throw error
      mockCollector.collectMetric.mockImplementation(() => {
        throw new Error('Collector error');
      });

      expect(() => {
        middlewareFunction(req, res, next);
        res.statusCode = 200;
        res.emit('finish');
      }).not.toThrow();

      expect(next).toHaveBeenCalled(); // Should continue with request
    });

    test('should handle multiple response events', () => {
      const middlewareFunction = middleware.getMiddleware();

      middlewareFunction(req, res, next);
      
      res.statusCode = 200;
      res.emit('finish');
      res.emit('finish'); // Duplicate event
      res.emit('close');

      // Should only collect metric once
      expect(mockCollector.collectMetric).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sampling and Filtering', () => {
    test('should respect disabled collector', () => {
      mockCollector.isEnabled.mockReturnValue(false);
      
      const middlewareFunction = middleware.getMiddleware();

      middlewareFunction(req, res, next);
      res.statusCode = 200;
      res.emit('finish');

      expect(mockCollector.collectMetric).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled(); // Should continue with request
    });

    test('should filter health check endpoints', () => {
      const middlewareFunction = middleware.getMiddleware({ 
        excludeEndpoints: ['/health', '/metrics'] 
      });

      const healthReq = createRequest({
        method: 'GET',
        url: '/health',
      });
      const healthRes = createResponse({
        eventEmitter: require('events').EventEmitter,
      });

      middlewareFunction(healthReq, healthRes, next);
      healthRes.statusCode = 200;
      healthRes.emit('finish');

      expect(mockCollector.collectMetric).not.toHaveBeenCalled();
    });

    test('should handle path parameter normalization', () => {
      const middlewareFunction = middleware.getMiddleware();
      
      const paramReq = createRequest({
        method: 'GET',
        url: '/api/users/123/posts/456',
        route: { path: '/api/users/:userId/posts/:postId' }, // Express route info
      });
      const paramRes = createResponse({
        eventEmitter: require('events').EventEmitter,
      });

      middlewareFunction(paramReq, paramRes, next);
      paramRes.statusCode = 200;
      paramRes.emit('finish');

      expect(mockCollector.collectMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/api/users/:userId/posts/:postId', // Normalized path
        })
      );
    });
  });

  describe('Performance Impact', () => {
    test('should have minimal performance overhead', () => {
      const middlewareFunction = middleware.getMiddleware();
      const startTime = process.hrtime();

      // Process 100 requests to measure overhead
      for (let i = 0; i < 100; i++) {
        const testReq = createRequest({
          method: 'GET',
          url: `/api/test-${i}`,
        });
        const testRes = createResponse({
          eventEmitter: require('events').EventEmitter,
        });

        middlewareFunction(testReq, testRes, next);
        testRes.statusCode = 200;
        testRes.emit('finish');
      }

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const totalMs = seconds * 1000 + nanoseconds / 1000000;
      const avgOverheadMs = totalMs / 100;

      // Should be less than 1ms overhead per request
      expect(avgOverheadMs).toBeLessThan(1);
    });

    test('should not block request processing', () => {
      const middlewareFunction = middleware.getMiddleware();

      middlewareFunction(req, res, next);

      // next() should be called immediately
      expect(next).toHaveBeenCalled();
      
      res.statusCode = 200;
      res.emit('finish');

      expect(mockCollector.collectMetric).toHaveBeenCalled();
    });
  });

  describe('Integration with Express.js', () => {
    test('should work with Express router', () => {
      const middlewareFunction = middleware.getMiddleware();
      
      req.baseUrl = '/api/v1';
      req.route = { path: '/users/:id' };

      middlewareFunction(req, res, next);
      res.statusCode = 200;
      res.emit('finish');

      expect(mockCollector.collectMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/users'),
        })
      );
    });

    test('should handle query parameters', () => {
      const middlewareFunction = middleware.getMiddleware();
      
      req.url = '/api/users?page=1&limit=10&sort=name';
      req.query = { page: '1', limit: '10', sort: 'name' };

      middlewareFunction(req, res, next);
      res.statusCode = 200;
      res.emit('finish');

      // Should normalize by removing query parameters
      expect(mockCollector.collectMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/api/users', // Query params removed
        })
      );
    });
  });
});