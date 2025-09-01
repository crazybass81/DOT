// Test Setup and Configuration
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test timeout
jest.setTimeout(30000);

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  if (global.supabaseClient) {
    await global.supabaseClient.dispose();
  }
  
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global test helpers
global.createTestUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  phone: '010-1234-5678',
  branchId: 'test-branch-id',
  role: 'EMPLOYEE'
});

global.createTestAdmin = () => ({
  id: 'test-admin-id',
  username: 'admin',
  password: 'admin123',
  role: 'MASTER_ADMIN'
});

global.createTestToken = (payload = {}) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      id: 'test-user-id',
      email: 'test@example.com',
      ...payload 
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};