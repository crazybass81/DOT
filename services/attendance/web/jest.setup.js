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
      insert: jest.fn().mockResolvedValue({ error: null }),
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

// Mock Supabase Server Client
jest.mock('./src/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ 
        data: { id: 'test-notification-id' }, 
        error: null 
      }),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { id: 'test-notification-id' }, 
        error: null 
      }),
      maybeSingle: jest.fn(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
    })),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    }
  }))
}));

// Global mocks will be handled in individual test files

// Node.js 환경에서 사용할 수 있는 global 함수들 추가
global.setImmediate = setTimeout;

// Mock Next.js Response
global.NextResponse = {
  json: (data, options = {}) => ({
    status: options.status || 200,
    json: () => Promise.resolve(data)
  }),
  redirect: (url) => ({ status: 302, headers: { Location: url } }),
  rewrite: (url) => ({ status: 200, headers: { 'x-middleware-rewrite': url } }),
  next: () => ({ status: 200 })
};