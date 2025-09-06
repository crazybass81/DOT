module.exports = {
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/__tests__/integration/**/*.test.ts',
    '<rootDir>/__tests__/integration/**/*.test.tsx'
  ],
  
  // Test environment configuration
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/integration-test-setup.ts'
  ],
  
  // TypeScript configuration
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }]
  },
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/components/monitoring/**/*.{ts,tsx}',
    'src/lib/metrics/**/*.ts',
    'src/lib/health/**/*.ts',
    'src/middleware/api-metrics.ts',
    '!**/*.d.ts',
    '!**/*.stories.*',
    '!**/node_modules/**',
    '!**/__tests__/**'
  ],
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageDirectory: '<rootDir>/coverage/integration',
  
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/components/monitoring/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/lib/metrics/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Test timeout configuration
  testTimeout: 30000, // 30 seconds for integration tests
  
  // Performance configuration
  maxWorkers: '50%',
  
  // Verbose output for debugging
  verbose: true,
  
  // Error handling
  bail: false, // Continue running tests after first failure
  errorOnDeprecated: true,
  
  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  },
  
  // Test patterns to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/'
  ],
  
  // Module paths to ignore
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/.next/'
  ],
  
  // Performance and memory settings
  forceExit: true,
  detectOpenHandles: true,
  workerIdleMemoryLimit: '1GB',
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/integration/html',
        filename: 'integration-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Monitoring System Integration Test Report'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage/integration',
        outputName: 'integration-test-results.xml',
        suiteName: 'Monitoring System Integration Tests',
        titleTemplate: '{classname} › {title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Snapshot configuration
  updateSnapshot: process.env.UPDATE_SNAPSHOTS === 'true',
  
  // Watch mode configuration (for development)
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/.next/'
  ],
  
  // Fail tests on console errors/warnings in CI
  ...(process.env.CI && {
    silent: false,
    verbose: false
  })
};