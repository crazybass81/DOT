// Test setup file
import '@testing-library/jest-dom';

// Mock environment variables
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:54322/postgres';

// Mock Web APIs for Node environment
global.crypto = {
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  subtle: {
    importKey: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
    digest: jest.fn()
  }
} as any;

global.navigator = {
  onLine: true,
  credentials: {
    create: jest.fn(),
    get: jest.fn()
  }
} as any;

global.PublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(true)
} as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

global.localStorage = localStorageMock as Storage;

// Mock IndexedDB
global.indexedDB = {
  open: jest.fn().mockReturnValue({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          put: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          get: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          getAll: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          delete: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          clear: jest.fn().mockReturnValue({ onsuccess: null, onerror: null })
        })
      })
    }
  })
} as any;