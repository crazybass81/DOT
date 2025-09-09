/**
 * Jest Setup File for ID-ROLE-PAPER System Tests
 * Global test configuration and mocks
 */

import '@testing-library/jest-dom';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }) => {
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (fn) => {
    const Component = fn();
    Component.displayName = 'DynamicComponent';
    return Component;
  },
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }
  
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Setup console error/warn suppression for testing
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: `ReactDOMTestUtils.act`') ||
       args[0].includes('Warning: An invalid form control'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillMount'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
global.createMockIdentity = (overrides = {}) => ({
  identity: {
    id: 'test-identity-id',
    fullName: '테스트 사용자',
    identityType: 'personal',
    personalInfo: {
      phone: '010-1234-5678',
      address: '서울시 테스트구'
    },
    ...overrides.identity
  },
  primaryRole: 'WORKER',
  availableRoles: ['WORKER'],
  permissions: [],
  businessContext: null,
  ...overrides
});

global.createMockBusiness = (overrides = {}) => ({
  id: 'test-business-id',
  name: '테스트 회사',
  businessType: 'individual',
  businessNumber: '123-45-67890',
  verificationStatus: 'verified',
  ownerIdentityId: 'test-identity-id',
  ...overrides
});

global.createMockPaper = (overrides = {}) => ({
  id: 'test-paper-id',
  paperType: 'BUSINESS_REGISTRATION',
  title: '테스트 문서',
  validFrom: '2024-01-01',
  validUntil: '2024-12-31',
  isValid: true,
  businessId: 'test-business-id',
  ...overrides
});

// Helper for API mocking
global.setupSuccessfulApiMocks = (mockFetch) => {
  mockFetch.mockImplementation((url) => {
    const response = { ok: true, json: async () => ({ data: [] }) };
    
    if (url.includes('/api/identity')) {
      response.json = async () => ({ data: [global.createMockIdentity()] });
    } else if (url.includes('/api/business')) {
      response.json = async () => ({ data: [global.createMockBusiness()] });
    } else if (url.includes('/api/papers')) {
      response.json = async () => ({ data: [global.createMockPaper()] });
    } else if (url.includes('/api/permissions')) {
      response.json = async () => ({ 
        data: { 
          hasPermission: true, 
          permissions: { 'identity:read': true } 
        } 
      });
    }
    
    return Promise.resolve(response);
  });
};