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

// Mock Supabase server client
jest.mock('./src/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    })),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    }
  }))
}));

// Mock RBAC middleware
jest.mock('./src/middleware/rbac-middleware', () => ({
  withRBAC: jest.fn((handler, options) => (request) => {
    // 테스트에서 사용할 mock user를 request에 추가
    return handler(request, global.mockUser || { id: 'test-user', is_master_admin: false });
  })
}));

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