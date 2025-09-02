/**
 * Integration Test Setup
 * DOT Attendance System
 */

import { jest } from '@jest/globals';

// Set longer timeout for integration tests
jest.setTimeout(60000);

// Store test start time for cleanup report
process.env.TEST_START_TIME = Date.now().toString();

// Enhanced console logging for integration tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args: any[]) => {
  const timestamp = new Date().toISOString();
  originalConsoleLog(`[${timestamp}] [INFO]`, ...args);
};

console.error = (...args: any[]) => {
  const timestamp = new Date().toISOString();
  originalConsoleError(`[${timestamp}] [ERROR]`, ...args);
};

console.warn = (...args: any[]) => {
  const timestamp = new Date().toISOString();
  originalConsoleWarn(`[${timestamp}] [WARN]`, ...args);
};

// Global test utilities
declare global {
  var testUtils: {
    waitFor: (condition: () => Promise<boolean>, timeout?: number) => Promise<void>;
    delay: (ms: number) => Promise<void>;
    generateTestId: () => string;
  };
}

global.testUtils = {
  // Wait for a condition to be true
  waitFor: async (condition: () => Promise<boolean>, timeout: number = 10000): Promise<void> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  // Simple delay utility
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Generate unique test ID
  generateTestId: (): string => {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Error handling improvements
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Set up test environment variables if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mljyiuzetchtjudbcfvd.supabase.co';
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';
}

console.log('🧪 Integration test setup completed');
console.log('📋 Test Environment:');
console.log(`   - Node.js: ${process.version}`);
console.log(`   - Environment: ${process.env.NODE_ENV}`);
console.log(`   - Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not Set'}`);
console.log(`   - Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not Set'}`);
console.log(`   - Test Timeout: ${jest.getTimeout()}ms`);