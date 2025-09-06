/**
 * Circular Buffer Tests - TDD Phase 1 (RED)
 * 순환 버퍼 테스트 - 메모리 효율적인 메트릭 데이터 저장
 */

import { CircularBuffer } from '../../../src/lib/metrics/circular-buffer';
import { ApiMetric, CircularBufferConfig } from '../../../src/types/performance-metrics';

describe('CircularBuffer', () => {
  let buffer: CircularBuffer<ApiMetric>;
  const mockMetric: ApiMetric = {
    requestId: 'req-001',
    method: 'GET',
    endpoint: '/api/users',
    statusCode: 200,
    responseTime: 150,
    timestamp: new Date(),
  };

  beforeEach(() => {
    buffer = new CircularBuffer<ApiMetric>({ maxSize: 5 });
  });

  describe('Basic Operations', () => {
    test('should initialize with empty buffer', () => {
      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.isFull()).toBe(false);
    });

    test('should add items correctly', () => {
      buffer.add(mockMetric);
      
      expect(buffer.size()).toBe(1);
      expect(buffer.isEmpty()).toBe(false);
      expect(buffer.isFull()).toBe(false);
    });

    test('should handle capacity correctly', () => {
      // Fill to capacity
      for (let i = 0; i < 5; i++) {
        buffer.add({ ...mockMetric, requestId: `req-${i}` });
      }
      
      expect(buffer.size()).toBe(5);
      expect(buffer.isFull()).toBe(true);
    });

    test('should overwrite oldest when at capacity', () => {
      // Fill beyond capacity
      for (let i = 0; i < 7; i++) {
        buffer.add({ ...mockMetric, requestId: `req-${i}` });
      }
      
      expect(buffer.size()).toBe(5);
      const items = buffer.getAll();
      expect(items[0].requestId).toBe('req-2'); // oldest should be overwritten
      expect(items[4].requestId).toBe('req-6'); // newest
    });

    test('should get all items in insertion order', () => {
      const metrics: ApiMetric[] = [
        { ...mockMetric, requestId: 'req-1' },
        { ...mockMetric, requestId: 'req-2' },
        { ...mockMetric, requestId: 'req-3' },
      ];
      
      metrics.forEach(metric => buffer.add(metric));
      
      const result = buffer.getAll();
      expect(result).toHaveLength(3);
      expect(result.map(r => r.requestId)).toEqual(['req-1', 'req-2', 'req-3']);
    });

    test('should clear buffer correctly', () => {
      buffer.add(mockMetric);
      buffer.add(mockMetric);
      
      buffer.clear();
      
      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.getAll()).toHaveLength(0);
    });
  });

  describe('Time-based Retention', () => {
    test('should support time-based retention', () => {
      const config: CircularBufferConfig = {
        maxSize: 100,
        retentionTime: 1000, // 1 second
        autoCleanup: true,
        cleanupInterval: 500, // 0.5 seconds
      };
      
      buffer = new CircularBuffer<ApiMetric>(config);
      
      const oldMetric: ApiMetric = {
        ...mockMetric,
        requestId: 'old',
        timestamp: new Date(Date.now() - 2000), // 2 seconds ago
      };
      
      const newMetric: ApiMetric = {
        ...mockMetric,
        requestId: 'new',
        timestamp: new Date(),
      };
      
      buffer.add(oldMetric);
      buffer.add(newMetric);
      
      expect(buffer.size()).toBe(2);
      
      // Manually trigger cleanup
      buffer.cleanup();
      
      const items = buffer.getAll();
      expect(items).toHaveLength(1);
      expect(items[0].requestId).toBe('new');
    });

    test('should auto-cleanup expired items when enabled', (done) => {
      const config: CircularBufferConfig = {
        maxSize: 100,
        retentionTime: 100, // 0.1 second
        autoCleanup: true,
        cleanupInterval: 50, // 0.05 seconds
      };
      
      buffer = new CircularBuffer<ApiMetric>(config);
      
      buffer.add(mockMetric);
      expect(buffer.size()).toBe(1);
      
      // Wait for auto-cleanup to trigger
      setTimeout(() => {
        expect(buffer.size()).toBe(0);
        buffer.stopAutoCleanup();
        done();
      }, 200);
    });
  });

  describe('Advanced Queries', () => {
    beforeEach(() => {
      // Setup test data
      const testMetrics: ApiMetric[] = [
        { ...mockMetric, requestId: 'req-1', endpoint: '/api/users', statusCode: 200, responseTime: 100 },
        { ...mockMetric, requestId: 'req-2', endpoint: '/api/users', statusCode: 404, responseTime: 50 },
        { ...mockMetric, requestId: 'req-3', endpoint: '/api/posts', statusCode: 200, responseTime: 200 },
        { ...mockMetric, requestId: 'req-4', endpoint: '/api/posts', statusCode: 500, responseTime: 300 },
        { ...mockMetric, requestId: 'req-5', endpoint: '/api/users', statusCode: 200, responseTime: 75 },
      ];
      
      testMetrics.forEach(metric => buffer.add(metric));
    });

    test('should filter by predicate', () => {
      const successfulRequests = buffer.filter(metric => metric.statusCode === 200);
      
      expect(successfulRequests).toHaveLength(3);
      expect(successfulRequests.map(r => r.requestId)).toEqual(['req-1', 'req-3', 'req-5']);
    });

    test('should find first matching item', () => {
      const errorRequest = buffer.find(metric => metric.statusCode >= 400);
      
      expect(errorRequest).toBeDefined();
      expect(errorRequest!.requestId).toBe('req-2');
    });

    test('should get items within time range', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      // Update timestamps
      buffer.getAll().forEach((metric, index) => {
        metric.timestamp = new Date(now.getTime() - index * 60 * 1000);
      });
      
      const recentItems = buffer.getItemsInTimeRange(fiveMinutesAgo, now);
      expect(recentItems).toHaveLength(5);
    });

    test('should calculate statistics', () => {
      const stats = buffer.getStatistics(metrics => metrics.map(m => m.responseTime));
      
      expect(stats.count).toBe(5);
      expect(stats.sum).toBe(725); // 100 + 50 + 200 + 300 + 75
      expect(stats.average).toBe(145);
      expect(stats.min).toBe(50);
      expect(stats.max).toBe(300);
    });

    test('should get latest N items', () => {
      const latest = buffer.getLatest(3);
      
      expect(latest).toHaveLength(3);
      expect(latest.map(r => r.requestId)).toEqual(['req-3', 'req-4', 'req-5']);
    });
  });

  describe('Performance', () => {
    test('should handle large number of operations efficiently', () => {
      const largeBuffer = new CircularBuffer<ApiMetric>({ maxSize: 10000 });
      const startTime = Date.now();
      
      // Add 20,000 items (should overwrite)
      for (let i = 0; i < 20000; i++) {
        largeBuffer.add({
          ...mockMetric,
          requestId: `req-${i}`,
          responseTime: Math.random() * 1000,
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(largeBuffer.size()).toBe(10000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should maintain constant memory usage', () => {
      const bufferSize = 1000;
      const testBuffer = new CircularBuffer<ApiMetric>({ maxSize: bufferSize });
      
      // Add items beyond capacity multiple times
      for (let cycle = 0; cycle < 5; cycle++) {
        for (let i = 0; i < bufferSize * 2; i++) {
          testBuffer.add({
            ...mockMetric,
            requestId: `cycle-${cycle}-req-${i}`,
          });
        }
      }
      
      // Buffer size should remain constant
      expect(testBuffer.size()).toBe(bufferSize);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero size buffer', () => {
      const zeroBuffer = new CircularBuffer<ApiMetric>({ maxSize: 0 });
      
      zeroBuffer.add(mockMetric);
      expect(zeroBuffer.size()).toBe(0);
      expect(zeroBuffer.getAll()).toHaveLength(0);
    });

    test('should handle single item buffer', () => {
      const singleBuffer = new CircularBuffer<ApiMetric>({ maxSize: 1 });
      
      singleBuffer.add({ ...mockMetric, requestId: 'first' });
      expect(singleBuffer.size()).toBe(1);
      
      singleBuffer.add({ ...mockMetric, requestId: 'second' });
      expect(singleBuffer.size()).toBe(1);
      expect(singleBuffer.getAll()[0].requestId).toBe('second');
    });

    test('should handle cleanup on empty buffer', () => {
      expect(() => buffer.cleanup()).not.toThrow();
      expect(buffer.size()).toBe(0);
    });

    test('should handle invalid time ranges', () => {
      buffer.add(mockMetric);
      
      const now = new Date();
      const future = new Date(now.getTime() + 60000);
      
      // Invalid range (start > end)
      const result = buffer.getItemsInTimeRange(future, now);
      expect(result).toHaveLength(0);
    });
  });

  afterEach(() => {
    if (buffer && typeof buffer.stopAutoCleanup === 'function') {
      buffer.stopAutoCleanup();
    }
  });
});