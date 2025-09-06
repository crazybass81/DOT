import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

/**
 * Integration Test Environment Setup
 * 
 * This file configures the test environment for integration tests:
 * - Mock browser APIs and WebSocket connections
 * - Setup performance monitoring utilities
 * - Configure test timeouts and error handling
 * - Initialize shared test utilities and helpers
 */

// Extend Jest matchers with Testing Library
expect.extend(require('@testing-library/jest-dom/matchers'));

// Global test configuration
beforeAll(async () => {
  // Set longer timeout for integration tests
  jest.setTimeout(30000);
  
  // Suppress console warnings during tests unless explicitly needed
  if (!process.env.TEST_VERBOSE) {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  }
  
  // Mock global performance API if not available
  if (!global.performance) {
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByName: jest.fn(() => []),
      getEntriesByType: jest.fn(() => []),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      timing: {},
      navigation: {}
    } as any;
  }
  
  // Mock memory API for memory usage tests
  if (!(global.performance as any).memory) {
    (global.performance as any).memory = {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB baseline
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB total
      jsHeapSizeLimit: 2048 * 1024 * 1024 // 2GB limit
    };
  }
  
  // Mock PerformanceObserver for performance monitoring tests
  if (!global.PerformanceObserver) {
    global.PerformanceObserver = class MockPerformanceObserver {
      private callback: PerformanceObserverCallback;
      
      constructor(callback: PerformanceObserverCallback) {
        this.callback = callback;
      }
      
      observe() {
        // Mock implementation - can be enhanced for specific tests
      }
      
      disconnect() {
        // Mock implementation
      }
    } as any;
  }
  
  // Mock IntersectionObserver for component visibility tests
  if (!global.IntersectionObserver) {
    global.IntersectionObserver = class MockIntersectionObserver {
      observe = jest.fn();
      disconnect = jest.fn();
      unobserve = jest.fn();
    } as any;
  }
  
  // Mock ResizeObserver for responsive dashboard tests
  if (!global.ResizeObserver) {
    global.ResizeObserver = class MockResizeObserver {
      observe = jest.fn();
      disconnect = jest.fn();
      unobserve = jest.fn();
    } as any;
  }
  
  // Mock WebSocket for real-time connection tests
  if (!global.WebSocket) {
    global.WebSocket = class MockWebSocket extends EventTarget {
      public readyState = 1; // OPEN
      public url: string;
      public protocol: string;
      
      constructor(url: string, protocols?: string | string[]) {
        super();
        this.url = url;
        this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || '';
        
        // Simulate connection open
        setTimeout(() => {
          this.dispatchEvent(new Event('open'));
        }, 10);
      }
      
      send(data: string | ArrayBuffer | Blob | ArrayBufferView) {
        // Mock send implementation
        setTimeout(() => {
          // Echo back for testing
          this.dispatchEvent(new MessageEvent('message', { 
            data: typeof data === 'string' ? data : 'binary-data'
          }));
        }, 10);
      }
      
      close(code?: number, reason?: string) {
        this.readyState = 3; // CLOSED
        this.dispatchEvent(new CloseEvent('close', { code, reason }));
      }
      
      // WebSocket constants
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;
    } as any;
  }
  
  // Mock requestAnimationFrame for animation tests
  if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (callback: FrameRequestCallback) => {
      return setTimeout(() => callback(Date.now()), 16); // ~60fps
    };
  }
  
  if (!global.cancelAnimationFrame) {
    global.cancelAnimationFrame = (id: number) => {
      clearTimeout(id);
    };
  }
  
  // Mock fetch for API integration tests
  if (!global.fetch) {
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  }
  
  // Setup default localStorage mock
  if (!global.localStorage) {
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn()
    };
  }
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset performance memory to baseline
  if ((global.performance as any).memory) {
    (global.performance as any).memory.usedJSHeapSize = 50 * 1024 * 1024;
  }
  
  // Clear localStorage
  if (global.localStorage && global.localStorage.clear) {
    global.localStorage.clear();
  }
  
  // Reset fetch mock
  if (global.fetch && jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockClear();
  }
});

// Cleanup after each test
afterEach(async () => {
  // Force garbage collection if available (for memory tests)
  if ((global as any).gc) {
    (global as any).gc();
  }
  
  // Wait for any pending timers
  await new Promise(resolve => setTimeout(resolve, 10));
});

// Global cleanup
afterAll(() => {
  // Restore console methods
  if (jest.spyOn(console, 'warn').mockRestore) {
    jest.spyOn(console, 'warn').mockRestore();
  }
  if (jest.spyOn(console, 'error').mockRestore) {
    jest.spyOn(console, 'error').mockRestore();
  }
  
  // Clear all timers
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Custom test utilities for integration tests
export const integrationTestUtils = {
  // Wait for async operations to complete
  waitForAsyncOperations: async (timeout = 5000) => {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  },
  
  // Simulate high CPU usage for performance tests
  simulateHighCPU: () => {
    if ((global.performance as any).memory) {
      (global.performance as any).memory.usedJSHeapSize *= 1.5;
    }
  },
  
  // Simulate memory pressure
  simulateMemoryPressure: (multiplier = 2) => {
    if ((global.performance as any).memory) {
      (global.performance as any).memory.usedJSHeapSize *= multiplier;
    }
  },
  
  // Create realistic WebSocket mock
  createMockWebSocket: (options: { 
    latency?: number; 
    failureRate?: number; 
    maxConnections?: number 
  } = {}) => {
    const { latency = 0, failureRate = 0, maxConnections = 1000 } = options;
    let connectionCount = 0;
    
    return class TestWebSocket extends EventTarget {
      public readyState = 0; // CONNECTING
      public url: string;
      
      constructor(url: string) {
        super();
        this.url = url;
        
        if (connectionCount >= maxConnections) {
          setTimeout(() => {
            this.dispatchEvent(new Event('error'));
            this.readyState = 3; // CLOSED
          }, 10);
          return;
        }
        
        if (Math.random() < failureRate) {
          setTimeout(() => {
            this.dispatchEvent(new Event('error'));
            this.readyState = 3; // CLOSED
          }, 100);
          return;
        }
        
        connectionCount++;
        
        setTimeout(() => {
          this.readyState = 1; // OPEN
          this.dispatchEvent(new Event('open'));
        }, latency + 10);
      }
      
      send(data: any) {
        if (this.readyState !== 1) return;
        
        setTimeout(() => {
          if (Math.random() < failureRate) {
            this.dispatchEvent(new Event('error'));
          } else {
            this.dispatchEvent(new MessageEvent('message', { data }));
          }
        }, latency);
      }
      
      close() {
        connectionCount = Math.max(0, connectionCount - 1);
        this.readyState = 3; // CLOSED
        this.dispatchEvent(new CloseEvent('close'));
      }
    } as any;
  },
  
  // Mock performance timing for load tests
  mockPerformanceTiming: (responseTime = 200) => {
    const mockTiming = {
      navigationStart: Date.now() - responseTime - 100,
      domContentLoadedEventStart: Date.now() - responseTime,
      loadEventStart: Date.now() - 50,
      loadEventEnd: Date.now()
    };
    
    if ((global.performance as any).timing) {
      Object.assign((global.performance as any).timing, mockTiming);
    }
  },
  
  // Generate test metrics data
  generateTestMetrics: (overrides: any = {}) => ({
    connections: {
      active: 150,
      total: 300,
      rate: 3.5,
      ...overrides.connections
    },
    api: {
      responseTime: 245,
      requestsPerSecond: 12.8,
      errorRate: 0.02,
      ...overrides.api
    },
    system: {
      cpu: 65,
      memory: 58,
      healthScore: 87,
      ...overrides.system
    },
    timestamp: Date.now(),
    ...overrides
  })
};

// Error handling for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  if (process.env.TEST_VERBOSE) {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
  // Don't exit process during tests
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  if (process.env.TEST_VERBOSE) {
    console.error('Uncaught Exception:', error);
  }
  // Don't exit process during tests
});

// Export test utilities for use in test files
export default integrationTestUtils;