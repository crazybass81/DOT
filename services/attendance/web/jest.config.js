const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,ts,tsx}',
    '<rootDir>/src/**/*.test.{js,ts,tsx}'
  ],
  collectCoverageFrom: [
    'app/**/*.{js,ts,tsx}',
    'components/**/*.{js,ts,tsx}',
    'hooks/**/*.{js,ts,tsx}',
    'lib/**/*.{js,ts,tsx}',
    'services/**/*.{js,ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{js,ts,tsx}',
    '!**/node_modules/**',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/database/', // SQL 테스트는 제외
  ],
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  }
};

module.exports = createJestConfig(customJestConfig);