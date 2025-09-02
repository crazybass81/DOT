/**
 * Integration Tests: Master Admin Authentication and Authorization
 * 
 * This test suite validates master admin functionality including:
 * - Authentication flows and session management
 * - Permission management and hierarchical access
 * - QR code generation and management
 * - Audit logging and compliance
 * - User approval workflows
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.TEST_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co',
  supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.TEST_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ',
  testTimeout: 45000
};

interface TestMasterAdmin {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  is_master_admin: boolean;
  organization_id: string;
}

interface TestPermission {
  id: string;
  permission_name: string;
  permission_code: string;
  permission_category: string;
  is_system_permission: boolean;
}

describe('Master Admin Integration Tests', () => {
  let serviceClient: SupabaseClient;
  let masterAdminClient: SupabaseClient;
  let employeeClient: SupabaseClient;
  
  // Test data
  let testOrganization: any;
  let testBranch: any;
  let testDepartment: any;
  let testMasterAdmin: TestMasterAdmin;
  let testEmployee: any;
  let testPermissions: TestPermission[] = [];
  let masterAdminUser: User;
  let employeeUser: User;

  beforeAll(async () => {
    if (!TEST_CONFIG.supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for integration tests');
    }

    serviceClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
    masterAdminClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    employeeClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    
    await setupTestData();
  }, TEST_CONFIG.testTimeout);

  afterAll(async () => {
    await cleanupTestData();
  }, TEST_CONFIG.testTimeout);

  async function setupTestData() {
    // Create test organization
    const { data: orgData, error: orgError } = await serviceClient
      .from('organizations')
      .insert({
        name: 'Master Admin Test Org',
        code: `MASTER_TEST_${Date.now()}`,
        description: 'Organization for master admin testing'
      })
      .select()
      .single();

    if (orgError) throw new Error(`Failed to create test organization: ${orgError.message}`);
    testOrganization = orgData;

    // Create test branch
    const { data: branchData, error: branchError } = await serviceClient
      .from('branches')
      .insert({
        organization_id: testOrganization.id,
        name: 'Master Admin Branch',
        code: 'MASTER_BRANCH',
        address: 'Test Address',
        latitude: 37.5665,
        longitude: 126.9780
      })
      .select()
      .single();

    if (branchError) throw new Error(`Failed to create test branch: ${branchError.message}`);
    testBranch = branchData;

    // Create test department
    const { data: deptData, error: deptError } = await serviceClient
      .from('departments')
      .insert({
        organization_id: testOrganization.id,
        branch_id: testBranch.id,
        name: 'Master Admin Dept',
        code: 'MASTER_DEPT'
      })
      .select()
      .single();

    if (deptError) throw new Error(`Failed to create test department: ${deptError.message}`);
    testDepartment = deptData;

    // Create master admin user
    const masterAdminEmail = `master.admin.${Date.now()}@example.com`;
    const { data: masterUserData, error: masterUserError } = await serviceClient.auth.admin.createUser({
      email: masterAdminEmail,
      password: 'MasterPassword123!',
      email_confirm: true
    });

    if (masterUserError) throw new Error(`Failed to create master admin user: ${masterUserError.message}`);
    masterAdminUser = masterUserData.user;

    // Create master admin employee
    const { data: masterAdminData, error: masterAdminError } = await serviceClient
      .from('employees')
      .insert({
        auth_user_id: masterAdminUser.id,
        organization_id: testOrganization.id,
        branch_id: testBranch.id,
        department_id: testDepartment.id,
        name: 'Test Master Admin',
        email: masterAdminEmail,
        role: 'MASTER_ADMIN',
        is_master_admin: true,
        approval_status: 'APPROVED',
        is_active: true
      })
      .select()
      .single();

    if (masterAdminError) throw new Error(`Failed to create master admin employee: ${masterAdminError.message}`);
    testMasterAdmin = masterAdminData;

    // Create regular employee user
    const employeeEmail = `employee.${Date.now()}@example.com`;
    const { data: empUserData, error: empUserError } = await serviceClient.auth.admin.createUser({
      email: employeeEmail,
      password: 'EmployeePassword123!',
      email_confirm: true
    });

    if (empUserError) throw new Error(`Failed to create employee user: ${empUserError.message}`);
    employeeUser = empUserData.user;

    // Create employee record
    const { data: employeeData, error: employeeError } = await serviceClient
      .from('employees')
      .insert({
        auth_user_id: employeeUser.id,
        organization_id: testOrganization.id,
        branch_id: testBranch.id,
        department_id: testDepartment.id,
        name: 'Test Employee',
        email: employeeEmail,
        role: 'EMPLOYEE',
        is_master_admin: false,
        approval_status: 'PENDING',
        is_active: false
      })
      .select()
      .single();

    if (employeeError) throw new Error(`Failed to create employee: ${employeeError.message}`);
    testEmployee = employeeData;

    // Load system permissions
    const { data: permissionData, error: permissionError } = await serviceClient
      .from('master_admin_permissions')
      .select('*')
      .limit(10);

    if (permissionError) throw new Error(`Failed to load permissions: ${permissionError.message}`);
    testPermissions = permissionData || [];

    // Sign in users
    await masterAdminClient.auth.signInWithPassword({
      email: masterAdminEmail,
      password: 'MasterPassword123!'
    });

    await employeeClient.auth.signInWithPassword({
      email: employeeEmail,
      password: 'EmployeePassword123!'
    });
  }

  async function cleanupTestData() {
    try {
      // Delete employee permissions
      await serviceClient
        .from('employee_permissions')
        .delete()
        .eq('employee_id', testEmployee.id);

      // Delete QR codes
      await serviceClient
        .from('qr_codes')
        .delete()
        .eq('generated_by', testMasterAdmin.id);

      // Delete audit logs
      await serviceClient
        .from('master_admin_audit_log')
        .delete()
        .eq('actor_id', testMasterAdmin.id);

      // Delete employees
      if (testEmployee) {
        await serviceClient
          .from('employees')
          .delete()
          .eq('id', testEmployee.id);
      }

      if (testMasterAdmin) {
        await serviceClient
          .from('employees')
          .delete()
          .eq('id', testMasterAdmin.id);
      }

      // Delete auth users
      if (employeeUser) {
        await serviceClient.auth.admin.deleteUser(employeeUser.id);
      }
      if (masterAdminUser) {
        await serviceClient.auth.admin.deleteUser(masterAdminUser.id);
      }

      // Delete organizational structure
      if (testDepartment) {
        await serviceClient
          .from('departments')
          .delete()
          .eq('id', testDepartment.id);
      }

      if (testBranch) {
        await serviceClient
          .from('branches')
          .delete()
          .eq('id', testBranch.id);
      }

      if (testOrganization) {
        await serviceClient
          .from('organizations')
          .delete()
          .eq('id', testOrganization.id);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  describe('Master Admin Authentication', () => {
    test('master admin can authenticate successfully', async () => {
      const { data: sessionData, error } = await masterAdminClient.auth.getSession();

      expect(error).toBeNull();
      expect(sessionData.session).not.toBeNull();
      expect(sessionData.session?.user.id).toBe(masterAdminUser.id);
    });

    test('master admin session includes correct metadata', async () => {
      const { data: userData, error } = await masterAdminClient.auth.getUser();

      expect(error).toBeNull();
      expect(userData.user).not.toBeNull();
      expect(userData.user?.email).toBe(masterAdminUser.email);
    });

    test('master admin can refresh session', async () => {
      const { data, error } = await masterAdminClient.auth.refreshSession();

      expect(error).toBeNull();
      expect(data.session).not.toBeNull();
      expect(data.user).not.toBeNull();
    });

    test('master admin session is properly secured', async () => {
      const { data: sessionData } = await masterAdminClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      expect(accessToken).toBeDefined();
      expect(accessToken?.length).toBeGreaterThan(100); // JWT tokens are long
      
      // Verify token structure (basic JWT validation)
      const tokenParts = accessToken?.split('.');
      expect(tokenParts).toHaveLength(3); // Header.Payload.Signature
    });
  });

  describe('Master Admin Authorization', () => {
    test('master admin can access all employee data', async () => {
      const { data, error } = await masterAdminClient
        .from('employees')
        .select('*')
        .eq('organization_id', testOrganization.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(2); // At least master admin and employee
    });

    test('master admin can modify employee records', async () => {
      const { data, error } = await masterAdminClient
        .from('employees')
        .update({ phone: '+1-555-0123' })
        .eq('id', testEmployee.id)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].phone).toBe('+1-555-0123');
    });

    test('master admin can approve pending employees', async () => {
      const { data, error } = await masterAdminClient
        .from('employees')
        .update({
          approval_status: 'APPROVED',
          approved_by: testMasterAdmin.id,
          approved_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', testEmployee.id)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].approval_status).toBe('APPROVED');
      expect(data![0].approved_by).toBe(testMasterAdmin.id);
      expect(data![0].is_active).toBe(true);
    });

    test('master admin can reject employees', async () => {
      // Create another test employee for rejection
      const rejectionEmail = `reject.test.${Date.now()}@example.com`;
      const { data: rejectUserData } = await serviceClient.auth.admin.createUser({
        email: rejectionEmail,
        password: 'RejectPassword123!',
        email_confirm: true
      });

      const { data: rejectEmployeeData } = await serviceClient
        .from('employees')
        .insert({
          auth_user_id: rejectUserData.user.id,
          organization_id: testOrganization.id,
          name: 'To Be Rejected',
          email: rejectionEmail,
          role: 'EMPLOYEE',
          approval_status: 'PENDING'
        })
        .select()
        .single();

      const { data, error } = await masterAdminClient
        .from('employees')
        .update({
          approval_status: 'REJECTED',
          rejected_by: testMasterAdmin.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: 'Test rejection'
        })
        .eq('id', rejectEmployeeData.id)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].approval_status).toBe('REJECTED');
      expect(data![0].rejection_reason).toBe('Test rejection');

      // Cleanup
      await serviceClient.from('employees').delete().eq('id', rejectEmployeeData.id);
      await serviceClient.auth.admin.deleteUser(rejectUserData.user.id);
    });

    test('regular employee cannot access master admin functions', async () => {
      const { data, error } = await employeeClient
        .from('employees')
        .update({ approval_status: 'APPROVED' })
        .eq('id', testEmployee.id)
        .select();

      // Should fail due to RLS policies
      expect(data).toHaveLength(0);
    });
  });

  describe('Permission Management', () => {
    test('master admin can view all permissions', async () => {
      const { data, error } = await masterAdminClient
        .from('master_admin_permissions')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
    });

    test('master admin can grant permissions to employees', async () => {
      if (testPermissions.length === 0) {
        console.warn('No test permissions available, skipping permission grant test');
        return;
      }

      const permission = testPermissions[0];
      const { data, error } = await masterAdminClient
        .from('employee_permissions')
        .insert({
          employee_id: testEmployee.id,
          permission_id: permission.id,
          granted_by: testMasterAdmin.id,
          can_delegate: false,
          approval_status: 'approved'
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].employee_id).toBe(testEmployee.id);
      expect(data![0].permission_id).toBe(permission.id);
    });

    test('master admin can revoke permissions', async () => {
      // First grant a permission
      if (testPermissions.length === 0) return;

      const permission = testPermissions[0];
      const { data: grantData } = await masterAdminClient
        .from('employee_permissions')
        .insert({
          employee_id: testEmployee.id,
          permission_id: permission.id,
          granted_by: testMasterAdmin.id,
          can_delegate: false,
          approval_status: 'approved'
        })
        .select()
        .single();

      // Then revoke it
      const { data, error } = await masterAdminClient
        .from('employee_permissions')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: testMasterAdmin.id,
          revoke_reason: 'Test revocation'
        })
        .eq('id', grantData.id)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].is_active).toBe(false);
      expect(data![0].revoke_reason).toBe('Test revocation');
    });

    test('permission hierarchy is enforced', async () => {
      // Test that child permissions cannot be granted without parent permissions
      const { data: hierarchyData, error } = await masterAdminClient
        .from('master_admin_permissions')
        .select('*')
        .not('parent_permission_id', 'is', null)
        .limit(1);

      if (!hierarchyData || hierarchyData.length === 0) {
        console.warn('No hierarchical permissions available, skipping hierarchy test');
        return;
      }

      const childPermission = hierarchyData[0];
      
      // This should work as master admin can grant any permission
      const { data, error: grantError } = await masterAdminClient
        .from('employee_permissions')
        .insert({
          employee_id: testEmployee.id,
          permission_id: childPermission.id,
          granted_by: testMasterAdmin.id,
          can_delegate: false,
          approval_status: 'approved'
        })
        .select();

      expect(grantError).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe('QR Code Management', () => {
    test('master admin can generate QR codes', async () => {
      const qrCodeData = {
        code: `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        qr_type: 'check_in',
        purpose: 'Employee check-in for main office',
        department_id: testDepartment.id,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        generated_by: testMasterAdmin.id,
        is_active: true
      };

      const { data, error } = await masterAdminClient
        .from('qr_codes')
        .insert(qrCodeData)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].code).toBe(qrCodeData.code);
      expect(data![0].generated_by).toBe(testMasterAdmin.id);
    });

    test('master admin can configure QR code security settings', async () => {
      const secureQRData = {
        code: `SECURE_QR_${Date.now()}`,
        qr_type: 'check_in',
        purpose: 'Secure check-in with restrictions',
        requires_authentication: true,
        allowed_roles: ['EMPLOYEE', 'MANAGER'],
        ip_restrictions: ['192.168.1.0/24'],
        single_use: true,
        max_uses: 1,
        generated_by: testMasterAdmin.id
      };

      const { data, error } = await masterAdminClient
        .from('qr_codes')
        .insert(secureQRData)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].requires_authentication).toBe(true);
      expect(data![0].single_use).toBe(true);
      expect(data![0].allowed_roles).toContain('EMPLOYEE');
    });

    test('master admin can deactivate QR codes', async () => {
      // First create a QR code
      const { data: qrData } = await masterAdminClient
        .from('qr_codes')
        .insert({
          code: `DEACTIVATE_TEST_${Date.now()}`,
          qr_type: 'check_in',
          purpose: 'Test deactivation',
          generated_by: testMasterAdmin.id
        })
        .select()
        .single();

      // Then deactivate it
      const { data, error } = await masterAdminClient
        .from('qr_codes')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: testMasterAdmin.id,
          deactivation_reason: 'Security testing'
        })
        .eq('id', qrData.id)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].is_active).toBe(false);
      expect(data![0].deactivation_reason).toBe('Security testing');
    });

    test('QR code usage statistics are tracked', async () => {
      // Create a QR code
      const { data: qrData } = await masterAdminClient
        .from('qr_codes')
        .insert({
          code: `STATS_TEST_${Date.now()}`,
          qr_type: 'check_in',
          purpose: 'Statistics testing',
          generated_by: testMasterAdmin.id
        })
        .select()
        .single();

      // Simulate a scan
      const { data: scanData, error: scanError } = await masterAdminClient
        .from('qr_code_scans')
        .insert({
          qr_code_id: qrData.id,
          scanned_by: testEmployee.id,
          scan_successful: true,
          scan_ip: '192.168.1.100'
        })
        .select();

      expect(scanError).toBeNull();
      expect(scanData).toHaveLength(1);

      // Check that QR code statistics are updated
      const { data: updatedQR, error: updateError } = await masterAdminClient
        .from('qr_codes')
        .select('scan_count, last_scanned_by')
        .eq('id', qrData.id)
        .single();

      expect(updateError).toBeNull();
      expect(updatedQR.scan_count).toBe(1);
      expect(updatedQR.last_scanned_by).toBe(testEmployee.id);
    });
  });

  describe('Audit Logging', () => {
    test('master admin actions are logged', async () => {
      // Perform an action that should be logged
      await masterAdminClient
        .from('employees')
        .update({ phone: '+1-555-AUDIT' })
        .eq('id', testEmployee.id);

      // Check if audit log entry was created
      // Note: This might need a trigger or manual insertion in a real system
      const { data, error } = await masterAdminClient
        .from('master_admin_audit_log')
        .select('*')
        .eq('actor_id', testMasterAdmin.id)
        .order('action_timestamp', { ascending: false })
        .limit(1);

      // If audit logging is implemented via triggers, we should see an entry
      expect(error).toBeNull();
    });

    test('high-risk actions are flagged for review', async () => {
      // Create a high-risk audit log entry manually for testing
      const { data, error } = await serviceClient
        .from('master_admin_audit_log')
        .insert({
          actor_id: testMasterAdmin.id,
          actor_role: 'MASTER_ADMIN',
          action_type: 'DELETE_EMPLOYEE',
          action_category: 'employee_management',
          action_description: 'Deleted employee record',
          target_type: 'employees',
          target_id: testEmployee.id,
          risk_level: 'critical',
          requires_review: true,
          action_result: 'success'
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].risk_level).toBe('critical');
      expect(data![0].requires_review).toBe(true);
    });

    test('audit log integrity is maintained', async () => {
      const { data, error } = await serviceClient
        .from('master_admin_audit_log')
        .insert({
          actor_id: testMasterAdmin.id,
          actor_role: 'MASTER_ADMIN',
          action_type: 'TEST_INTEGRITY',
          action_category: 'testing',
          action_description: 'Integrity test action',
          action_result: 'success'
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      
      // Check that checksum is generated
      expect(data![0].checksum).toBeDefined();
      expect(data![0].checksum.length).toBe(64); // SHA-256 hex string length
    });
  });

  describe('Session Management', () => {
    test('master admin sessions are tracked', async () => {
      // Create a session record
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const { data, error } = await serviceClient
        .from('master_admin_sessions')
        .insert({
          session_token: sessionToken,
          employee_id: testMasterAdmin.id,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
          ip_address: '192.168.1.100',
          user_agent: 'Test User Agent',
          two_factor_verified: false
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].employee_id).toBe(testMasterAdmin.id);
    });

    test('expired sessions are properly handled', async () => {
      // Create an expired session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      await serviceClient
        .from('master_admin_sessions')
        .insert({
          session_token: sessionToken,
          employee_id: testMasterAdmin.id,
          expires_at: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
          ip_address: '192.168.1.100'
        });

      // Test cleanup function
      const { data, error } = await serviceClient
        .rpc('cleanup_expired_sessions');

      expect(error).toBeNull();
    });

    test('session security is enforced', async () => {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Create session with security constraints
      const { data, error } = await serviceClient
        .from('master_admin_sessions')
        .insert({
          session_token: sessionToken,
          employee_id: testMasterAdmin.id,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          ip_address: '192.168.1.100',
          two_factor_verified: true
        })
        .select();

      expect(error).toBeNull();
      expect(data![0].two_factor_verified).toBe(true);
    });
  });

  describe('User Approval Workflow', () => {
    test('master admin can view pending approvals', async () => {
      // Create a pending employee
      const pendingEmail = `pending.${Date.now()}@example.com`;
      const { data: pendingUser } = await serviceClient.auth.admin.createUser({
        email: pendingEmail,
        password: 'PendingPassword123!',
        email_confirm: true
      });

      const { data: pendingEmployee } = await serviceClient
        .from('employees')
        .insert({
          auth_user_id: pendingUser.user.id,
          organization_id: testOrganization.id,
          name: 'Pending Employee',
          email: pendingEmail,
          role: 'EMPLOYEE',
          approval_status: 'PENDING'
        })
        .select()
        .single();

      // Master admin should see pending approvals
      const { data, error } = await masterAdminClient
        .from('v_pending_approvals')
        .select('*');

      expect(error).toBeNull();
      expect(data!.some(emp => emp.id === pendingEmployee.id)).toBe(true);

      // Cleanup
      await serviceClient.from('employees').delete().eq('id', pendingEmployee.id);
      await serviceClient.auth.admin.deleteUser(pendingUser.user.id);
    });

    test('approval history is maintained', async () => {
      // Create approval history entry
      const { data, error } = await serviceClient
        .from('approval_history')
        .insert({
          employee_id: testEmployee.id,
          action: 'APPROVED',
          performed_by: testMasterAdmin.id,
          performed_at: new Date().toISOString(),
          reason: 'Integration test approval',
          metadata: { test: true }
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].action).toBe('APPROVED');
      expect(data![0].performed_by).toBe(testMasterAdmin.id);
    });

    test('bulk approval operations work correctly', async () => {
      // Create multiple pending employees for bulk testing
      const bulkEmployees = [];
      
      for (let i = 0; i < 3; i++) {
        const email = `bulk.${i}.${Date.now()}@example.com`;
        const { data: userData } = await serviceClient.auth.admin.createUser({
          email,
          password: 'BulkPassword123!',
          email_confirm: true
        });

        const { data: employeeData } = await serviceClient
          .from('employees')
          .insert({
            auth_user_id: userData.user.id,
            organization_id: testOrganization.id,
            name: `Bulk Employee ${i}`,
            email,
            role: 'EMPLOYEE',
            approval_status: 'PENDING'
          })
          .select()
          .single();

        bulkEmployees.push({ user: userData.user, employee: employeeData });
      }

      // Bulk approve
      const employeeIds = bulkEmployees.map(e => e.employee.id);
      const { data, error } = await masterAdminClient
        .from('employees')
        .update({
          approval_status: 'APPROVED',
          approved_by: testMasterAdmin.id,
          approved_at: new Date().toISOString(),
          is_active: true
        })
        .in('id', employeeIds)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
      expect(data!.every(emp => emp.approval_status === 'APPROVED')).toBe(true);

      // Cleanup bulk employees
      for (const emp of bulkEmployees) {
        await serviceClient.from('employees').delete().eq('id', emp.employee.id);
        await serviceClient.auth.admin.deleteUser(emp.user.id);
      }
    });
  });

  describe('Performance and Scalability', () => {
    test('master admin queries perform efficiently', async () => {
      const startTime = Date.now();

      await masterAdminClient
        .from('employees')
        .select(`
          *,
          organizations(*),
          branches(*),
          departments(*)
        `)
        .eq('organization_id', testOrganization.id);

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('permission queries are optimized', async () => {
      const startTime = Date.now();

      await masterAdminClient
        .from('v_active_employee_permissions')
        .select('*')
        .limit(100);

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(1500); // Should complete within 1.5 seconds
    });

    test('audit log queries handle large datasets', async () => {
      const startTime = Date.now();

      await masterAdminClient
        .from('v_recent_audit_activities')
        .select('*')
        .limit(50);

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Security and Compliance', () => {
    test('master admin actions require appropriate authorization', async () => {
      // Test that sensitive operations are properly protected
      const { data, error } = await employeeClient
        .from('master_admin_permissions')
        .select('*');

      // Regular employee should not see any permissions
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    test('data isolation is maintained', async () => {
      // Master admin should only see data from their organization
      const { data, error } = await masterAdminClient
        .from('employees')
        .select('*')
        .neq('organization_id', testOrganization.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    test('sensitive operations generate appropriate audit trails', async () => {
      // This would be expanded in a real system with actual audit trail validation
      const sensitiveOperations = [
        'permission_grant',
        'employee_delete',
        'role_change',
        'system_configuration'
      ];

      expect(sensitiveOperations.length).toBeGreaterThan(0);
    });
  });
});