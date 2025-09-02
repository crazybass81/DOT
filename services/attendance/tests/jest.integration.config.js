/**
 * Jest Configuration for Integration Tests
 * DOT Attendance System
 */

const path = require('path');

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test directory
  rootDir: path.resolve(__dirname, '..'),
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/web/src/$1',
    '^@lib/(.*)$': '<rootDir>/web/src/lib/$1',
    '^@services/(.*)$': '<rootDir>/web/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/web/src/utils/$1'
  },
  
  // TypeScript support
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          lib: ['es2020', 'dom'],
          allowJs: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx'
        }
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Setup and teardown
  globalSetup: '<rootDir>/tests/setup/global-setup.ts',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/integration-setup.ts'
  ],
  
  // Test execution
  testTimeout: 60000, // 60 seconds for integration tests
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  
  // Coverage settings
  collectCoverage: false, // Disable for integration tests by default
  collectCoverageFrom: [
    'web/src/**/*.{js,ts,tsx}',
    '!web/src/**/*.test.{js,ts,tsx}',
    '!web/src/**/*.spec.{js,ts,tsx}',
    '!web/src/test/**/*',
    '!web/src/types/**/*',
    '!web/src/**/*.d.ts'
  ],
  
  // Reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/tests/reports',
      outputName: 'integration-test-results.xml',
      suiteName: 'DOT Attendance Integration Tests'
    }],
    ['jest-html-reporter', {
      outputPath: '<rootDir>/tests/reports/integration-test-report.html',
      pageTitle: 'DOT Attendance Integration Test Report',
      includeFailureMsg: true,
      includeSuiteFailure: true,
      sort: 'status'
    }]
  ],
  
  // Environment variables
  setupFiles: ['<rootDir>/tests/setup/env-setup.js'],
  
  // Module handling
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@supabase/.*|uuid|nanoid))'
  ],
  
  // Error handling
  bail: false, // Don't stop on first failure
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Cache
  cache: false, // Disable cache for integration tests
  
  // Test categorization
  testNamePattern: process.env.TEST_NAME_PATTERN,
  testPathPattern: process.env.TEST_PATH_PATTERN
};