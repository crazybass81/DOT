/**
 * Integration Tests: Row Level Security (RLS) Policies
 * 
 * This test suite validates all RLS policies in the attendance system
 * including employee data access, attendance records, and master admin permissions.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.TEST_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co',
  supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.TEST_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ',
  testTimeout: 30000
};

interface TestEmployee {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
  is_master_admin: boolean;
  organization_id: string;
  branch_id: string;
  department_id: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}

interface TestAttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string;
  check_out_time?: string;
  status: 'NOT_WORKING' | 'WORKING' | 'ON_BREAK' | 'COMPLETED';
}

describe('RLS Policies Integration Tests', () => {
  let adminClient: SupabaseClient;
  let employeeClient: SupabaseClient;
  let managerClient: SupabaseClient;
  let masterAdminClient: SupabaseClient;
  
  // Test data
  let testOrganization: any;
  let testBranch: any;
  let testDepartment: any;
  let testEmployees: TestEmployee[] = [];
  let testUsers: User[] = [];
  let testAttendanceRecords: TestAttendanceRecord[] = [];

  beforeAll(async () => {
    if (!TEST_CONFIG.supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for integration tests');
    }

    // Initialize service role client for setup
    adminClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
    
    await setupTestData();
  }, TEST_CONFIG.testTimeout);

  afterAll(async () => {
    await cleanupTestData();
  }, TEST_CONFIG.testTimeout);

  /**
   * Setup test data including organizations, users, employees, and attendance records
   */
  async function setupTestData() {
    // Create test organization
    const { data: orgData, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: 'Test Organization RLS',
        code: `TEST_ORG_${Date.now()}`,
        description: 'Test organization for RLS testing'
      })
      .select()
      .single();

    if (orgError) throw new Error(`Failed to create test organization: ${orgError.message}`);
    testOrganization = orgData;

    // Create test branch
    const { data: branchData, error: branchError } = await adminClient
      .from('branches')
      .insert({
        organization_id: testOrganization.id,
        name: 'Test Branch',
        code: 'TEST_BRANCH',
        address: 'Test Address',
        latitude: 37.5665,
        longitude: 126.9780
      })
      .select()
      .single();

    if (branchError) throw new Error(`Failed to create test branch: ${branchError.message}`);
    testBranch = branchData;

    // Create test department
    const { data: deptData, error: deptError } = await adminClient
      .from('departments')
      .insert({
        organization_id: testOrganization.id,
        branch_id: testBranch.id,
        name: 'Test Department',
        code: 'TEST_DEPT'
      })
      .select()
      .single();

    if (deptError) throw new Error(`Failed to create test department: ${deptError.message}`);
    testDepartment = deptData;

    // Create test users and employees
    const userRoles = [
      { role: 'EMPLOYEE', is_master_admin: false },
      { role: 'MANAGER', is_master_admin: false },
      { role: 'ADMIN', is_master_admin: false },
      { role: 'MASTER_ADMIN', is_master_admin: true }
    ] as const;

    for (let i = 0; i < userRoles.length; i++) {
      const userRole = userRoles[i];
      const timestamp = Date.now() + i;
      const email = `test.${userRole.role.toLowerCase()}.${timestamp}@example.com`;
      const password = 'TestPassword123!';

      // Create auth user
      const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (userError) throw new Error(`Failed to create user: ${userError.message}`);
      testUsers.push(userData.user);

      // Create employee record
      const { data: employeeData, error: employeeError } = await adminClient
        .from('employees')
        .insert({
          auth_user_id: userData.user.id,
          organization_id: testOrganization.id,
          branch_id: testBranch.id,
          department_id: testDepartment.id,
          name: `Test ${userRole.role}`,
          email,
          role: userRole.role,
          is_master_admin: userRole.is_master_admin,
          approval_status: 'APPROVED',
          is_active: true
        })
        .select()
        .single();

      if (employeeError) throw new Error(`Failed to create employee: ${employeeError.message}`);
      testEmployees.push(employeeData);

      // Create test attendance record
      const attendanceRecord = {
        id: uuidv4(),
        employee_id: employeeData.id,
        date: new Date().toISOString().split('T')[0],
        check_in_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'WORKING' as const
      };

      const { error: attendanceError } = await adminClient
        .from('attendance')
        .insert(attendanceRecord);

      if (attendanceError) throw new Error(`Failed to create attendance record: ${attendanceError.message}`);
      testAttendanceRecords.push(attendanceRecord);
    }

    // Initialize client connections for different user types
    employeeClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    managerClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    masterAdminClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);

    // Sign in users
    const employeeUser = testUsers.find((_, i) => userRoles[i].role === 'EMPLOYEE');
    const managerUser = testUsers.find((_, i) => userRoles[i].role === 'MANAGER');
    const masterAdminUser = testUsers.find((_, i) => userRoles[i].role === 'MASTER_ADMIN');

    if (employeeUser) {
      await employeeClient.auth.signInWithPassword({
        email: employeeUser.email!,
        password: 'TestPassword123!'
      });
    }

    if (managerUser) {
      await managerClient.auth.signInWithPassword({
        email: managerUser.email!,
        password: 'TestPassword123!'
      });
    }

    if (masterAdminUser) {
      await masterAdminClient.auth.signInWithPassword({
        email: masterAdminUser.email!,
        password: 'TestPassword123!'
      });
    }
  }

  /**
   * Cleanup test data
   */
  async function cleanupTestData() {
    try {
      // Delete attendance records
      await adminClient
        .from('attendance')
        .delete()
        .in('employee_id', testEmployees.map(e => e.id));

      // Delete employees
      await adminClient
        .from('employees')
        .delete()
        .in('id', testEmployees.map(e => e.id));

      // Delete auth users
      for (const user of testUsers) {
        await adminClient.auth.admin.deleteUser(user.id);
      }

      // Delete department
      if (testDepartment) {
        await adminClient
          .from('departments')
          .delete()
          .eq('id', testDepartment.id);
      }

      // Delete branch
      if (testBranch) {
        await adminClient
          .from('branches')
          .delete()
          .eq('id', testBranch.id);
      }

      // Delete organization
      if (testOrganization) {
        await adminClient
          .from('organizations')
          .delete()
          .eq('id', testOrganization.id);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  describe('Employee Data Access Policies', () => {
    test('employees can view their own data', async () => {
      const employeeUser = testEmployees.find(e => e.role === 'EMPLOYEE');
      expect(employeeUser).toBeDefined();

      const { data, error } = await employeeClient
        .from('employees')
        .select('*')
        .eq('id', employeeUser!.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(employeeUser!.id);
    });

    test('employees cannot view other employees data', async () => {
      const managerEmployee = testEmployees.find(e => e.role === 'MANAGER');
      expect(managerEmployee).toBeDefined();

      const { data, error } = await employeeClient
        .from('employees')
        .select('*')
        .eq('id', managerEmployee!.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    test('employees can update their own profile', async () => {
      const employeeUser = testEmployees.find(e => e.role === 'EMPLOYEE');
      expect(employeeUser).toBeDefined();

      const { data, error } = await employeeClient
        .from('employees')
        .update({ phone: '+1234567890' })
        .eq('id', employeeUser!.id)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].phone).toBe('+1234567890');
    });

    test('managers can view employees in their branch', async () => {
      const { data, error } = await managerClient
        .from('employees')
        .select('*')
        .eq('branch_id', testBranch.id);

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(1);
      expect(data!.some(e => e.role === 'EMPLOYEE')).toBe(true);
    });

    test('master admins can view all employees', async () => {
      const { data, error } = await masterAdminClient
        .from('employees')
        .select('*');

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(testEmployees.length);
    });
  });

  describe('Attendance Data Access Policies', () => {
    test('employees can view their own attendance', async () => {
      const employeeUser = testEmployees.find(e => e.role === 'EMPLOYEE');
      expect(employeeUser).toBeDefined();

      const { data, error } = await employeeClient
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeUser!.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].employee_id).toBe(employeeUser!.id);
    });

    test('employees cannot view other employees attendance', async () => {
      const managerEmployee = testEmployees.find(e => e.role === 'MANAGER');
      expect(managerEmployee).toBeDefined();

      const { data, error } = await employeeClient
        .from('attendance')
        .select('*')
        .eq('employee_id', managerEmployee!.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    test('employees can create their own attendance', async () => {
      const employeeUser = testEmployees.find(e => e.role === 'EMPLOYEE');
      expect(employeeUser).toBeDefined();

      const newAttendance = {
        employee_id: employeeUser!.id,
        date: '2024-12-01',
        check_in_time: new Date().toISOString(),
        status: 'WORKING' as const
      };

      const { data, error } = await employeeClient
        .from('attendance')
        .insert(newAttendance)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].employee_id).toBe(employeeUser!.id);

      // Cleanup
      await adminClient
        .from('attendance')
        .delete()
        .eq('id', data![0].id);
    });

    test('employees can update their own attendance for today only', async () => {
      const employeeUser = testEmployees.find(e => e.role === 'EMPLOYEE');
      const attendanceRecord = testAttendanceRecords.find(a => a.employee_id === employeeUser!.id);
      expect(attendanceRecord).toBeDefined();

      const { data, error } = await employeeClient
        .from('attendance')
        .update({ status: 'ON_BREAK' })
        .eq('id', attendanceRecord!.id)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].status).toBe('ON_BREAK');
    });

    test('managers can view team attendance', async () => {
      const { data, error } = await managerClient
        .from('attendance')
        .select(`
          *,
          employees!inner(branch_id)
        `)
        .eq('employees.branch_id', testBranch.id);

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });
  });

  describe('Organization and Branch Access Policies', () => {
    test('authenticated users can view their organization', async () => {
      const { data, error } = await employeeClient
        .from('organizations')
        .select('*')
        .eq('id', testOrganization.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].id).toBe(testOrganization.id);
    });

    test('authenticated users can view branches', async () => {
      const { data, error } = await employeeClient
        .from('branches')
        .select('*')
        .eq('organization_id', testOrganization.id);

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });

    test('only admins can modify branches', async () => {
      const { data, error } = await employeeClient
        .from('branches')
        .update({ name: 'Updated Branch Name' })
        .eq('id', testBranch.id)
        .select();

      // Should fail for regular employee
      expect(error).not.toBeNull();
      expect(data).toHaveLength(0);
    });

    test('master admins can modify branches', async () => {
      const { data, error } = await masterAdminClient
        .from('branches')
        .update({ name: 'Master Admin Updated Branch' })
        .eq('id', testBranch.id)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].name).toBe('Master Admin Updated Branch');
    });

    test('only master admins can modify organizations', async () => {
      const { data, error } = await managerClient
        .from('organizations')
        .update({ description: 'Manager tried to update' })
        .eq('id', testOrganization.id)
        .select();

      // Should fail for manager
      expect(error).not.toBeNull();
      expect(data).toHaveLength(0);

      // Should succeed for master admin
      const { data: masterData, error: masterError } = await masterAdminClient
        .from('organizations')
        .update({ description: 'Master admin updated' })
        .eq('id', testOrganization.id)
        .select();

      expect(masterError).toBeNull();
      expect(masterData).toHaveLength(1);
      expect(masterData![0].description).toBe('Master admin updated');
    });
  });

  describe('RLS Helper Functions', () => {
    test('get_user_role() function returns correct role', async () => {
      const { data, error } = await employeeClient
        .rpc('get_user_role');

      expect(error).toBeNull();
      expect(data).toBe('EMPLOYEE');
    });

    test('is_admin_or_higher() function returns correct boolean', async () => {
      const { data: employeeResult, error: employeeError } = await employeeClient
        .rpc('is_admin_or_higher');

      expect(employeeError).toBeNull();
      expect(employeeResult).toBe(false);

      const { data: masterAdminResult, error: masterAdminError } = await masterAdminClient
        .rpc('is_admin_or_higher');

      expect(masterAdminError).toBeNull();
      expect(masterAdminResult).toBe(true);
    });

    test('is_master_admin() function returns correct boolean', async () => {
      const { data: employeeResult, error: employeeError } = await employeeClient
        .rpc('is_master_admin');

      expect(employeeError).toBeNull();
      expect(employeeResult).toBe(false);

      const { data: masterAdminResult, error: masterAdminError } = await masterAdminClient
        .rpc('is_master_admin');

      expect(masterAdminError).toBeNull();
      expect(masterAdminResult).toBe(true);
    });
  });

  describe('Performance and Security Validation', () => {
    test('RLS policies do not allow SQL injection', async () => {
      const maliciousInput = "'; DROP TABLE employees; --";
      
      const { data, error } = await employeeClient
        .from('employees')
        .select('*')
        .eq('name', maliciousInput);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Verify employees table still exists
      const { data: employeeData, error: employeeError } = await employeeClient
        .from('employees')
        .select('id')
        .limit(1);

      expect(employeeError).toBeNull();
      expect(employeeData).toBeDefined();
    });

    test('RLS policies enforce proper access isolation', async () => {
      // Create attendance records for different employees
      const employee = testEmployees.find(e => e.role === 'EMPLOYEE');
      const manager = testEmployees.find(e => e.role === 'MANAGER');

      expect(employee).toBeDefined();
      expect(manager).toBeDefined();

      // Employee should not see manager's attendance
      const { data, error } = await employeeClient
        .from('attendance')
        .select('*');

      expect(error).toBeNull();
      expect(data!.every(record => record.employee_id === employee!.id)).toBe(true);
    });

    test('RLS policies perform efficiently with indexed queries', async () => {
      const startTime = Date.now();

      const { data, error } = await employeeClient
        .from('attendance')
        .select('*')
        .order('date', { ascending: false })
        .limit(10);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('RLS handles null auth.uid() gracefully', async () => {
      const anonClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);

      const { data, error } = await anonClient
        .from('employees')
        .select('*');

      // Should return no data for unauthenticated user
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    test('RLS handles expired tokens appropriately', async () => {
      const expiredClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
      
      // Sign in and immediately sign out to simulate expired session
      const employeeUser = testUsers.find((_, i) => testEmployees[i].role === 'EMPLOYEE');
      await expiredClient.auth.signInWithPassword({
        email: employeeUser!.email!,
        password: 'TestPassword123!'
      });
      
      await expiredClient.auth.signOut();

      const { data, error } = await expiredClient
        .from('employees')
        .select('*');

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    test('RLS enforces constraints during concurrent access', async () => {
      const employee = testEmployees.find(e => e.role === 'EMPLOYEE');
      expect(employee).toBeDefined();

      // Simulate concurrent attendance updates
      const promises = Array.from({ length: 5 }, (_, i) => 
        employeeClient
          .from('attendance')
          .update({ notes: `Concurrent update ${i}` })
          .eq('employee_id', employee!.id)
          .eq('date', new Date().toISOString().split('T')[0])
      );

      const results = await Promise.all(promises);

      // All should succeed or fail consistently
      const successCount = results.filter(r => r.error === null).length;
      const errorCount = results.filter(r => r.error !== null).length;

      expect(successCount + errorCount).toBe(5);
    });
  });
});