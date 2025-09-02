/**
 * Global Setup for Integration Tests
 * DOT Attendance System
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const TEST_CONFIG = {
  supabaseUrl: process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co',
  supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  testDatabasePrefix: 'test_integration',
  testTimeout: 120000
};

export default async function globalSetup() {
  console.log('🔧 Setting up global test environment...');
  
  try {
    if (!TEST_CONFIG.supabaseServiceKey) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set - some integration tests may fail');
      return;
    }

    const serviceClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
    
    // Verify database connection
    await verifyDatabaseConnection(serviceClient);
    
    // Setup test data isolation
    await setupTestDataIsolation(serviceClient);
    
    // Prepare test environment
    await prepareTestEnvironment(serviceClient);
    
    console.log('✅ Global test setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}

async function verifyDatabaseConnection(client: any) {
  console.log('🔍 Verifying database connection...');
  
  try {
    const { data, error } = await client
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function setupTestDataIsolation(client: any) {
  console.log('🔒 Setting up test data isolation...');
  
  try {
    // Create a test organization prefix to isolate test data
    const testOrgId = uuidv4();
    
    // Store test identifiers for cleanup
    process.env.TEST_ORG_PREFIX = `TEST_${Date.now()}`;
    process.env.TEST_SESSION_ID = testOrgId;
    
    console.log('✅ Test data isolation configured');
  } catch (error) {
    console.error('❌ Test data isolation setup failed:', error);
    throw error;
  }
}

async function prepareTestEnvironment(client: any) {
  console.log('🛠️ Preparing test environment...');
  
  try {
    // Clean up any existing test data
    await cleanupTestData(client);
    
    // Verify required tables exist
    await verifyRequiredTables(client);
    
    // Check RLS policies are in place
    await verifyRLSPolicies(client);
    
    console.log('✅ Test environment prepared');
  } catch (error) {
    console.error('❌ Test environment preparation failed:', error);
    throw error;
  }
}

async function cleanupTestData(client: any) {
  const testPrefix = process.env.TEST_ORG_PREFIX || 'TEST_';
  
  try {
    // Clean up organizations with test prefix
    await client
      .from('organizations')
      .delete()
      .like('code', `${testPrefix}%`);
    
    console.log('🧹 Existing test data cleaned up');
  } catch (error) {
    console.warn('⚠️ Test data cleanup warning:', error.message);
  }
}

async function verifyRequiredTables(client: any) {
  const requiredTables = [
    'organizations',
    'branches',
    'departments',
    'employees',
    'attendance',
    'qr_codes',
    'device_tokens'
  ];
  
  for (const tableName of requiredTables) {
    try {
      const { error } = await client
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        throw new Error(`Table ${tableName} is not accessible: ${error.message}`);
      }
    } catch (error) {
      console.error(`❌ Table verification failed for ${tableName}:`, error);
      throw error;
    }
  }
  
  console.log('✅ All required tables verified');
}

async function verifyRLSPolicies(client: any) {
  try {
    // Test RLS by trying to access data without authentication
    const anonClient = createClient(TEST_CONFIG.supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    
    const { data, error } = await anonClient
      .from('employees')
      .select('*')
      .limit(1);
    
    // Should return empty data due to RLS
    if (error === null && data?.length === 0) {
      console.log('✅ RLS policies are active');
    } else {
      console.warn('⚠️ RLS policies may not be properly configured');
    }
  } catch (error) {
    console.warn('⚠️ RLS verification warning:', error);
  }
}