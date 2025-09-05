import '@testing-library/jest-dom';

// Next.js 환경 모킹
global.Request = class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Headers(options.headers || {});
  }
};

global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.headers = new Headers(options.headers || {});
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
};

global.Headers = class MockHeaders extends Map {
  get(key) {
    return super.get(key.toLowerCase());
  }
  
  set(key, value) {
    return super.set(key.toLowerCase(), value);
  }
  
  has(key) {
    return super.has(key.toLowerCase());
  }
};

// Mock Supabase
jest.mock('./src/lib/supabase-config', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    })),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    }
  }
}));