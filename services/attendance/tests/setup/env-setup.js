/**
 * Environment Setup for Integration Tests
 * DOT Attendance System
 */

// Load environment variables from .env files
require('dotenv').config({ path: '.env.test' });
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_TELEMETRY_DISABLED = '1';

// Default Supabase configuration for tests
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mljyiuzetchtjudbcfvd.supabase.co';
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';
}

// Test database configuration
if (!process.env.TEST_SUPABASE_URL) {
  process.env.TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}

if (!process.env.TEST_SUPABASE_SERVICE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.TEST_SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// Performance and timeout settings
process.env.JEST_TIMEOUT = '60000';
process.env.TEST_TIMEOUT = '30000';

// Test isolation settings
process.env.TEST_ISOLATION = 'true';
process.env.TEST_CLEANUP = 'true';

// Logging configuration
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

console.log('🔧 Environment setup completed for integration tests');