/**
 * Global Teardown for Integration Tests
 * DOT Attendance System
 */

import { createClient } from '@supabase/supabase-js';

const TEST_CONFIG = {
  supabaseUrl: process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co',
  supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  cleanupTimeout: 30000
};

export default async function globalTeardown() {
  console.log('🧹 Starting global test cleanup...');
  
  try {
    if (!TEST_CONFIG.supabaseServiceKey) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set - skipping cleanup');
      return;
    }

    const serviceClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
    
    // Clean up test data
    await cleanupTestData(serviceClient);
    
    // Clean up test users
    await cleanupTestUsers(serviceClient);
    
    // Generate cleanup report
    await generateCleanupReport();
    
    console.log('✅ Global test cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Global test cleanup failed:', error);
    // Don't throw to avoid masking test failures
  }
}

async function cleanupTestData(client: any) {
  console.log('🗑️ Cleaning up test data...');
  
  const testPrefix = process.env.TEST_ORG_PREFIX || 'TEST_';
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      // Clean up in reverse dependency order
      
      // 1. Clean up attendance records
      await cleanupTableWithPrefix(client, 'attendance', 'employee_id', testPrefix);
      
      // 2. Clean up breaks
      await cleanupTableWithPrefix(client, 'breaks', 'attendance_id', testPrefix);
      
      // 3. Clean up QR code scans
      await cleanupTableWithPrefix(client, 'qr_code_scans', 'qr_code_id', testPrefix);
      
      // 4. Clean up QR codes
      await cleanupTableWithPrefix(client, 'qr_codes', 'generated_by', testPrefix);
      
      // 5. Clean up device tokens
      await cleanupTableWithPrefix(client, 'device_tokens', 'employee_id', testPrefix);
      
      // 6. Clean up FCM notifications
      await cleanupTableWithPrefix(client, 'fcm_notifications', 'employee_id', testPrefix);
      
      // 7. Clean up employee permissions
      await cleanupTableWithPrefix(client, 'employee_permissions', 'employee_id', testPrefix);
      
      // 8. Clean up approval history
      await cleanupTableWithPrefix(client, 'approval_history', 'employee_id', testPrefix);
      
      // 9. Clean up audit logs
      await cleanupTableWithPrefix(client, 'master_admin_audit_log', 'actor_id', testPrefix);
      
      // 10. Clean up employees
      await cleanupEmployeesWithTestPrefix(client, testPrefix);
      
      // 11. Clean up locations
      await cleanupTableWithOrgPrefix(client, 'locations', 'organization_id', testPrefix);
      
      // 12. Clean up departments
      await cleanupTableWithOrgPrefix(client, 'departments', 'organization_id', testPrefix);
      
      // 13. Clean up branches
      await cleanupTableWithOrgPrefix(client, 'branches', 'organization_id', testPrefix);
      
      // 14. Clean up organizations
      await client
        .from('organizations')
        .delete()
        .like('code', `${testPrefix}%`);
      
      console.log('✅ Test data cleanup completed');
      break;
      
    } catch (error) {
      retryCount++;
      console.warn(`⚠️ Cleanup attempt ${retryCount} failed:`, error.message);
      
      if (retryCount >= maxRetries) {
        console.error('❌ All cleanup attempts failed');
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function cleanupTableWithPrefix(client: any, tableName: string, filterColumn: string, testPrefix: string) {
  try {
    // Get test organization IDs first
    const { data: testOrgs } = await client
      .from('organizations')
      .select('id')
      .like('code', `${testPrefix}%`);
    
    if (!testOrgs || testOrgs.length === 0) {
      return;
    }
    
    const testOrgIds = testOrgs.map((org: any) => org.id);
    
    // Get employees from test organizations
    const { data: testEmployees } = await client
      .from('employees')
      .select('id')
      .in('organization_id', testOrgIds);
    
    if (testEmployees && testEmployees.length > 0) {
      const testEmployeeIds = testEmployees.map((emp: any) => emp.id);
      
      // Delete records for test employees
      await client
        .from(tableName)
        .delete()
        .in(filterColumn, testEmployeeIds);
    }
    
  } catch (error) {
    console.warn(`⚠️ Warning cleaning up ${tableName}:`, error.message);
  }
}

async function cleanupTableWithOrgPrefix(client: any, tableName: string, orgColumn: string, testPrefix: string) {
  try {
    const { data: testOrgs } = await client
      .from('organizations')
      .select('id')
      .like('code', `${testPrefix}%`);
    
    if (testOrgs && testOrgs.length > 0) {
      const testOrgIds = testOrgs.map((org: any) => org.id);
      
      await client
        .from(tableName)
        .delete()
        .in(orgColumn, testOrgIds);
    }
    
  } catch (error) {
    console.warn(`⚠️ Warning cleaning up ${tableName}:`, error.message);
  }
}

async function cleanupEmployeesWithTestPrefix(client: any, testPrefix: string) {
  try {
    // Clean up employees from test organizations
    const { data: testOrgs } = await client
      .from('organizations')
      .select('id')
      .like('code', `${testPrefix}%`);
    
    if (testOrgs && testOrgs.length > 0) {
      const testOrgIds = testOrgs.map((org: any) => org.id);
      
      await client
        .from('employees')
        .delete()
        .in('organization_id', testOrgIds);
    }
    
    // Also clean up employees with test email patterns
    await client
      .from('employees')
      .delete()
      .like('email', '%@example.com');
      
  } catch (error) {
    console.warn('⚠️ Warning cleaning up employees:', error.message);
  }
}

async function cleanupTestUsers(client: any) {
  console.log('👤 Cleaning up test users...');
  
  try {
    // Get all test users (those with @example.com emails)
    const { data: users, error } = await client.auth.admin.listUsers();
    
    if (error) {
      console.warn('⚠️ Could not list users for cleanup:', error.message);
      return;
    }
    
    if (!users || users.users.length === 0) {
      console.log('ℹ️ No users to clean up');
      return;
    }
    
    let cleanedCount = 0;
    for (const user of users.users) {
      if (user.email && (
        user.email.includes('@example.com') ||
        user.email.includes('test.') ||
        user.email.includes('integration.') ||
        user.email.includes('master.full.') ||
        user.email.includes('employee.full.') ||
        user.email.includes('new.employee.full.')
      )) {
        try {
          await client.auth.admin.deleteUser(user.id);
          cleanedCount++;
        } catch (deleteError) {
          console.warn(`⚠️ Could not delete user ${user.email}:`, deleteError);
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} test users`);
    } else {
      console.log('ℹ️ No test users found to clean up');
    }
    
  } catch (error) {
    console.warn('⚠️ User cleanup warning:', error.message);
  }
}

async function generateCleanupReport() {
  console.log('📊 Generating cleanup report...');
  
  try {
    const report = {
      timestamp: new Date().toISOString(),
      testSession: process.env.TEST_SESSION_ID || 'unknown',
      testPrefix: process.env.TEST_ORG_PREFIX || 'TEST_',
      cleanup: {
        status: 'completed',
        duration: Date.now() - (parseInt(process.env.TEST_START_TIME || '0') || Date.now())
      }
    };
    
    // In a real environment, you might want to store this report
    console.log('📋 Cleanup Report:', JSON.stringify(report, null, 2));
    
  } catch (error) {
    console.warn('⚠️ Could not generate cleanup report:', error.message);
  }
}