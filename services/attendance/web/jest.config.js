const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

// Next.js 기본 설정을 가져온 후 우리 설정으로 덮어씀
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // 순서가 중요함: 더 구체적인 패턴을 먼저 배치
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/(.*)$': '<rootDir>/$1',
    // CSS와 이미지 파일 무시
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,ts,tsx}',
    '<rootDir>/src/**/*.test.{js,ts,tsx}',
    '<rootDir>/__tests__/**/*.test.{js,ts,tsx}'
  ],
  collectCoverageFrom: [
    'app/**/*.{js,ts,tsx}',
    'components/**/*.{js,ts,tsx}',
    'hooks/**/*.{js,ts,tsx}',
    'src/**/*.{js,ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{js,ts,tsx}',
    '!**/node_modules/**',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/database/',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.(mjs|jsx?|tsx?)$))'
  ]
};

// createJestConfig를 사용하되, 특정 설정은 우리 것을 우선시
module.exports = async () => {
  const nextJestConfig = await createJestConfig(customJestConfig)();
  
  // moduleNameMapper를 완전히 재정의
  nextJestConfig.moduleNameMapper = {
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/(.*)$': '<rootDir>/$1',
    ...nextJestConfig.moduleNameMapper
  };
  
  return nextJestConfig;
};