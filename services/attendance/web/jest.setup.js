import '@testing-library/jest-dom';

// Load environment variables from .env.local for real connection tests
require('dotenv').config({ path: '.env.local' });

// Set up test environment variables if not already set
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';

// Extend test timeout for real database operations
jest.setTimeout(30000);

// Next.js 환경 모킹
global.Request = class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Headers(options.headers || {});
  }
};

global.NextRequest = class MockNextRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Headers(options.headers || {});
    this.nextUrl = new URL(url);
    this.ip = options.ip || '127.0.0.1';
    this.cookies = {
      get: (name) => null,
      getAll: () => [],
      set: () => {},
      delete: () => {}
    };
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
  constructor(init) {
    super();
    if (init) {
      if (typeof init === 'object' && !Array.isArray(init)) {
        Object.entries(init).forEach(([key, value]) => {
          this.set(key, value);
        });
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => {
          this.set(key, value);
        });
      }
    }
  }
  
  get(key) {
    return super.get(key.toLowerCase());
  }
  
  set(key, value) {
    return super.set(key.toLowerCase(), value);
  }
  
  has(key) {
    return super.has(key.toLowerCase());
  }
  
  forEach(callback) {
    super.forEach((value, key) => callback(value, key, this));
  }
};

// Conditionally mock Supabase - skip for real connection tests
if (!process.env.REAL_SUPABASE_TEST) {
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
  createClient: jest.fn(() => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
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
    };

    // insert().select() 체이닝을 위한 특별 처리
    mockQuery.insert.mockReturnValue({
      ...mockQuery,
      select: jest.fn().mockReturnValue({
        ...mockQuery,
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'test-notification-id' }, 
          error: null 
        })
      })
    });

    return {
      from: jest.fn(() => mockQuery),
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
      }
    };
  })
}));
}

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