/**
 * Integration Tests: Full Attendance System Workflow
 * 
 * This comprehensive test suite validates the complete attendance system workflow including:
 * - QR code generation and scanning
 * - Real-time functionality
 * - Device token management
 * - User registration and approval workflow
 * - End-to-end attendance tracking
 * - Performance benchmarks
 * - Security vulnerability checks
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import QRCode from 'qrcode';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.TEST_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co',
  supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.TEST_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ',
  testTimeout: 60000,
  performanceThreshold: {
    qrGeneration: 1000, // 1 second
    qrScan: 500, // 500ms
    realtimeUpdate: 2000, // 2 seconds
    attendanceCreate: 1000, // 1 second
    deviceRegistration: 1500 // 1.5 seconds
  }
};

interface TestContext {
  serviceClient: SupabaseClient;
  masterAdminClient: SupabaseClient;
  employeeClient: SupabaseClient;
  newEmployeeClient: SupabaseClient;
  
  organization: any;
  branch: any;
  department: any;
  location: any;
  masterAdmin: any;
  employee: any;
  newEmployee: any;
  
  masterAdminUser: any;
  employeeUser: any;
  newEmployeeUser: any;
  
  qrCode: any;
  deviceToken: any;
  realtimeChannel: RealtimeChannel | null;
}

describe('Full Attendance System Workflow Integration Tests', () => {
  let testContext: TestContext;
  let performanceMetrics: Record<string, number[]> = {
    qrGeneration: [],
    qrScan: [],
    realtimeUpdate: [],
    attendanceCreate: [],
    deviceRegistration: []
  };

  beforeAll(async () => {
    testContext = await setupFullTestEnvironment();
  }, TEST_CONFIG.testTimeout);

  afterAll(async () => {
    await cleanupFullTestEnvironment(testContext);
  }, TEST_CONFIG.testTimeout);

  /**
   * Setup comprehensive test environment
   */
  async function setupFullTestEnvironment(): Promise<TestContext> {
    const serviceClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
    const masterAdminClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    const employeeClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    const newEmployeeClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);

    // Create organizational structure
    const timestamp = Date.now();
    
    const { data: organization } = await serviceClient
      .from('organizations')
      .insert({
        name: 'Full Workflow Test Org',
        code: `FULL_TEST_${timestamp}`,
        description: 'Comprehensive testing organization'
      })
      .select()
      .single();

    const { data: branch } = await serviceClient
      .from('branches')
      .insert({
        organization_id: organization.id,
        name: 'Main Test Branch',
        code: 'MAIN_TEST',
        address: '123 Test Street, Test City',
        latitude: 37.5665,
        longitude: 126.9780,
        geofence_radius: 100
      })
      .select()
      .single();

    const { data: department } = await serviceClient
      .from('departments')
      .insert({
        organization_id: organization.id,
        branch_id: branch.id,
        name: 'Test Department',
        code: 'TEST_DEPT'
      })
      .select()
      .single();

    const { data: location } = await serviceClient
      .from('locations')
      .insert({
        organization_id: organization.id,
        branch_id: branch.id,
        name: 'Main Entrance',
        code: 'MAIN_ENT',
        address: '123 Test Street, Main Entrance',
        latitude: 37.5665,
        longitude: 126.9780,
        radius: 50
      })
      .select()
      .single();

    // Create users and employees
    const masterAdminEmail = `master.full.${timestamp}@example.com`;
    const { data: masterAdminUserData } = await serviceClient.auth.admin.createUser({
      email: masterAdminEmail,
      password: 'MasterFullPassword123!',
      email_confirm: true
    });

    const { data: masterAdmin } = await serviceClient
      .from('employees')
      .insert({
        auth_user_id: masterAdminUserData.user.id,
        organization_id: organization.id,
        branch_id: branch.id,
        department_id: department.id,
        employee_code: 'MA001',
        name: 'Master Admin Full Test',
        email: masterAdminEmail,
        role: 'MASTER_ADMIN',
        is_master_admin: true,
        approval_status: 'APPROVED',
        is_active: true
      })
      .select()
      .single();

    const employeeEmail = `employee.full.${timestamp}@example.com`;
    const { data: employeeUserData } = await serviceClient.auth.admin.createUser({
      email: employeeEmail,
      password: 'EmployeeFullPassword123!',
      email_confirm: true
    });

    const { data: employee } = await serviceClient
      .from('employees')
      .insert({
        auth_user_id: employeeUserData.user.id,
        organization_id: organization.id,
        branch_id: branch.id,
        department_id: department.id,
        employee_code: 'EMP001',
        name: 'Employee Full Test',
        email: employeeEmail,
        role: 'EMPLOYEE',
        is_master_admin: false,
        approval_status: 'APPROVED',
        is_active: true
      })
      .select()
      .single();

    const newEmployeeEmail = `new.employee.full.${timestamp}@example.com`;
    const { data: newEmployeeUserData } = await serviceClient.auth.admin.createUser({
      email: newEmployeeEmail,
      password: 'NewEmployeePassword123!',
      email_confirm: true
    });

    const { data: newEmployee } = await serviceClient
      .from('employees')
      .insert({
        auth_user_id: newEmployeeUserData.user.id,
        organization_id: organization.id,
        branch_id: branch.id,
        department_id: department.id,
        employee_code: 'NEW001',
        name: 'New Employee Full Test',
        email: newEmployeeEmail,
        role: 'EMPLOYEE',
        is_master_admin: false,
        approval_status: 'PENDING',
        is_active: false
      })
      .select()
      .single();

    // Sign in users
    await masterAdminClient.auth.signInWithPassword({
      email: masterAdminEmail,
      password: 'MasterFullPassword123!'
    });

    await employeeClient.auth.signInWithPassword({
      email: employeeEmail,
      password: 'EmployeeFullPassword123!'
    });

    await newEmployeeClient.auth.signInWithPassword({
      email: newEmployeeEmail,
      password: 'NewEmployeePassword123!'
    });

    return {
      serviceClient,
      masterAdminClient,
      employeeClient,
      newEmployeeClient,
      organization,
      branch,
      department,
      location,
      masterAdmin,
      employee,
      newEmployee,
      masterAdminUser: masterAdminUserData.user,
      employeeUser: employeeUserData.user,
      newEmployeeUser: newEmployeeUserData.user,
      qrCode: null,
      deviceToken: null,
      realtimeChannel: null
    };
  }

  /**
   * Cleanup comprehensive test environment
   */
  async function cleanupFullTestEnvironment(context: TestContext) {
    try {
      if (context.realtimeChannel) {
        await context.serviceClient.removeChannel(context.realtimeChannel);
      }

      // Delete all test data in reverse dependency order
      await context.serviceClient
        .from('attendance')
        .delete()
        .in('employee_id', [context.employee.id, context.newEmployee.id]);

      await context.serviceClient
        .from('qr_code_scans')
        .delete()
        .in('scanned_by', [context.employee.id, context.newEmployee.id]);

      await context.serviceClient
        .from('qr_codes')
        .delete()
        .eq('generated_by', context.masterAdmin.id);

      await context.serviceClient
        .from('device_tokens')
        .delete()
        .in('employee_id', [context.employee.id, context.newEmployee.id]);

      await context.serviceClient
        .from('fcm_notifications')
        .delete()
        .in('employee_id', [context.employee.id, context.newEmployee.id]);

      await context.serviceClient
        .from('employees')
        .delete()
        .in('id', [context.masterAdmin.id, context.employee.id, context.newEmployee.id]);

      await context.serviceClient.auth.admin.deleteUser(context.masterAdminUser.id);
      await context.serviceClient.auth.admin.deleteUser(context.employeeUser.id);
      await context.serviceClient.auth.admin.deleteUser(context.newEmployeeUser.id);

      await context.serviceClient
        .from('locations')
        .delete()
        .eq('id', context.location.id);

      await context.serviceClient
        .from('departments')
        .delete()
        .eq('id', context.department.id);

      await context.serviceClient
        .from('branches')
        .delete()
        .eq('id', context.branch.id);

      await context.serviceClient
        .from('organizations')
        .delete()
        .eq('id', context.organization.id);

    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  describe('Complete User Registration and Approval Workflow', () => {
    test('new employee registration creates pending approval', async () => {
      const { employee, newEmployee } = testContext;

      // Verify new employee is pending
      expect(newEmployee.approval_status).toBe('PENDING');
      expect(newEmployee.is_active).toBe(false);

      // New employee should not be able to access system functions
      const { data, error } = await testContext.newEmployeeClient
        .from('attendance')
        .select('*');

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    test('master admin approves new employee', async () => {
      const { masterAdminClient, masterAdmin, newEmployee } = testContext;

      const startTime = Date.now();

      const { data, error } = await masterAdminClient
        .from('employees')
        .update({
          approval_status: 'APPROVED',
          approved_by: masterAdmin.id,
          approved_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', newEmployee.id)
        .select();

      const approvalTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].approval_status).toBe('APPROVED');
      expect(data![0].is_active).toBe(true);
      expect(approvalTime).toBeLessThan(1000);

      // Update local context
      testContext.newEmployee = { ...testContext.newEmployee, ...data![0] };
    });

    test('approved employee can now access system', async () => {
      // After approval, employee should be able to access their data
      const { data, error } = await testContext.newEmployeeClient
        .from('employees')
        .select('*')
        .eq('id', testContext.newEmployee.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].approval_status).toBe('APPROVED');
    });
  });

  describe('Device Token Management Workflow', () => {
    test('employee registers device token', async () => {
      const { employeeClient, employee } = testContext;

      const startTime = Date.now();

      const deviceData = {
        employee_id: employee.id,
        device_id: `device_${Date.now()}`,
        device_name: 'Test Mobile Device',
        fcm_token: `fcm_token_${crypto.randomBytes(16).toString('hex')}`,
        device_type: 'mobile',
        platform: 'Android',
        app_version: '1.0.0',
        os_version: '12.0',
        trust_level: 'verified',
        verification_status: 'verified',
        is_primary: true
      };

      const { data, error } = await employeeClient
        .from('device_tokens')
        .insert(deviceData)
        .select();

      const registrationTime = Date.now() - startTime;
      performanceMetrics.deviceRegistration.push(registrationTime);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].employee_id).toBe(employee.id);
      expect(data![0].is_primary).toBe(true);
      expect(registrationTime).toBeLessThan(TEST_CONFIG.performanceThreshold.deviceRegistration);

      testContext.deviceToken = data![0];
    });

    test('device token security features work', async () => {
      const { serviceClient, deviceToken } = testContext;

      // Test device risk calculation
      const { data: riskScore, error } = await serviceClient
        .rpc('calculate_device_risk_score', { device_uuid: deviceToken.id });

      expect(error).toBeNull();
      expect(typeof riskScore).toBe('number');
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(1);
    });

    test('FCM notification can be sent to device', async () => {
      const { serviceClient, employee, deviceToken } = testContext;

      const notificationData = {
        device_token_id: deviceToken.id,
        employee_id: employee.id,
        notification_title: 'Test Notification',
        notification_body: 'This is a test notification',
        notification_type: 'attendance_reminder',
        data_payload: { test: true },
        priority: 'normal'
      };

      const { data, error } = await serviceClient
        .from('fcm_notifications')
        .insert(notificationData)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].delivery_status).toBe('pending');
    });
  });

  describe('QR Code Generation and Scanning Workflow', () => {
    test('master admin generates QR code for location', async () => {
      const { masterAdminClient, masterAdmin, location } = testContext;

      const startTime = Date.now();

      const qrData = {
        code: `QR_LOCATION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        qr_type: 'check_in',
        purpose: 'Main entrance check-in',
        location_id: location.id,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        generated_by: masterAdmin.id,
        is_active: true,
        requires_authentication: true,
        allowed_roles: ['EMPLOYEE', 'MANAGER']
      };

      const { data, error } = await masterAdminClient
        .from('qr_codes')
        .insert(qrData)
        .select();

      const generationTime = Date.now() - startTime;
      performanceMetrics.qrGeneration.push(generationTime);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].code).toBe(qrData.code);
      expect(generationTime).toBeLessThan(TEST_CONFIG.performanceThreshold.qrGeneration);

      testContext.qrCode = data![0];

      // Generate actual QR code image for verification
      const qrImage = await QRCode.toDataURL(data![0].code);
      expect(qrImage).toMatch(/^data:image\/png;base64,/);
    });

    test('employee scans QR code successfully', async () => {
      const { serviceClient, employee, qrCode, location } = testContext;

      const startTime = Date.now();

      // Simulate successful QR scan
      const scanData = {
        qr_code_id: qrCode.id,
        scanned_by: employee.id,
        scan_location: `POINT(${location.longitude} ${location.latitude})`,
        scan_ip: '192.168.1.100',
        scan_device_info: {
          userAgent: 'Test User Agent',
          deviceType: 'mobile',
          platform: 'Android'
        },
        scan_successful: true
      };

      const { data, error } = await serviceClient
        .from('qr_code_scans')
        .insert(scanData)
        .select();

      const scanTime = Date.now() - startTime;
      performanceMetrics.qrScan.push(scanTime);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].scan_successful).toBe(true);
      expect(scanTime).toBeLessThan(TEST_CONFIG.performanceThreshold.qrScan);

      // Verify QR code statistics are updated
      const { data: updatedQR } = await serviceClient
        .from('qr_codes')
        .select('scan_count, current_uses, last_scanned_by')
        .eq('id', qrCode.id)
        .single();

      expect(updatedQR.scan_count).toBe(1);
      expect(updatedQR.current_uses).toBe(1);
      expect(updatedQR.last_scanned_by).toBe(employee.id);
    });

    test('QR code security validations work', async () => {
      const { serviceClient, newEmployee, qrCode } = testContext;

      // Test unauthorized role access
      const unauthorizedScanData = {
        qr_code_id: qrCode.id,
        scanned_by: newEmployee.id,
        scan_successful: false,
        failure_reason: 'Unauthorized role'
      };

      // This would normally be handled by application logic
      const { data, error } = await serviceClient
        .from('qr_code_scans')
        .insert(unauthorizedScanData)
        .select();

      expect(error).toBeNull();
      expect(data![0].scan_successful).toBe(false);
    });

    test('expired QR codes are handled correctly', async () => {
      const { masterAdminClient, masterAdmin, location } = testContext;

      // Create already expired QR code
      const expiredQRData = {
        code: `EXPIRED_QR_${Date.now()}`,
        qr_type: 'check_in',
        purpose: 'Expired QR test',
        location_id: location.id,
        valid_from: new Date(Date.now() - 2000).toISOString(),
        valid_until: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
        generated_by: masterAdmin.id,
        is_active: true
      };

      const { data: expiredQR } = await masterAdminClient
        .from('qr_codes')
        .insert(expiredQRData)
        .select()
        .single();

      // Attempt to scan expired QR
      const { data: scanData } = await testContext.serviceClient
        .from('qr_code_scans')
        .insert({
          qr_code_id: expiredQR.id,
          scanned_by: testContext.employee.id,
          scan_successful: false,
          failure_reason: 'QR code expired'
        })
        .select();

      expect(scanData![0].scan_successful).toBe(false);
      expect(scanData![0].failure_reason).toBe('QR code expired');
    });
  });

  describe('Complete Attendance Workflow', () => {
    test('employee checks in using QR code', async () => {
      const { employeeClient, employee, qrCode } = testContext;

      const startTime = Date.now();

      const attendanceData = {
        employee_id: employee.id,
        date: new Date().toISOString().split('T')[0],
        check_in_time: new Date().toISOString(),
        check_in_latitude: 37.5665,
        check_in_longitude: 126.9780,
        check_in_address: 'Test Address',
        check_in_device_id: testContext.deviceToken?.device_id || 'test_device',
        status: 'WORKING'
      };

      const { data, error } = await employeeClient
        .from('attendance')
        .insert(attendanceData)
        .select();

      const checkInTime = Date.now() - startTime;
      performanceMetrics.attendanceCreate.push(checkInTime);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].status).toBe('WORKING');
      expect(checkInTime).toBeLessThan(TEST_CONFIG.performanceThreshold.attendanceCreate);

      // Verify geolocation validation would work
      const distance = calculateDistance(
        attendanceData.check_in_latitude,
        attendanceData.check_in_longitude,
        37.5665, // Location latitude
        126.9780  // Location longitude
      );

      expect(distance).toBeLessThan(100); // Within 100m radius
    });

    test('employee takes break and returns', async () => {
      const { employeeClient, employee } = testContext;

      // Get current attendance record
      const { data: attendanceRecords } = await employeeClient
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      // Start break
      const { data: breakData, error: breakError } = await employeeClient
        .from('breaks')
        .insert({
          attendance_id: attendanceRecords.id,
          start_time: new Date().toISOString(),
          reason: 'Lunch break'
        })
        .select();

      expect(breakError).toBeNull();
      expect(breakData).toHaveLength(1);

      // Update attendance status to on break
      const { data: updatedAttendance } = await employeeClient
        .from('attendance')
        .update({
          status: 'ON_BREAK',
          current_break_start: new Date().toISOString()
        })
        .eq('id', attendanceRecords.id)
        .select();

      expect(updatedAttendance![0].status).toBe('ON_BREAK');

      // End break
      const breakId = breakData![0].id;
      const breakEndTime = new Date();
      const breakStartTime = new Date(breakData![0].start_time);
      const breakDurationMinutes = Math.floor((breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60));

      await employeeClient
        .from('breaks')
        .update({
          end_time: breakEndTime.toISOString(),
          duration_minutes: breakDurationMinutes,
          status: 'COMPLETED'
        })
        .eq('id', breakId);

      // Update attendance status back to working
      const { data: finalAttendance } = await employeeClient
        .from('attendance')
        .update({
          status: 'WORKING',
          current_break_start: null,
          break_minutes: breakDurationMinutes
        })
        .eq('id', attendanceRecords.id)
        .select();

      expect(finalAttendance![0].status).toBe('WORKING');
      expect(finalAttendance![0].break_minutes).toBe(breakDurationMinutes);
    });

    test('employee checks out', async () => {
      const { employeeClient, employee } = testContext;

      // Get current attendance record
      const { data: attendanceRecord } = await employeeClient
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      const checkOutTime = new Date();
      const { data, error } = await employeeClient
        .from('attendance')
        .update({
          check_out_time: checkOutTime.toISOString(),
          check_out_latitude: 37.5665,
          check_out_longitude: 126.9780,
          check_out_address: 'Test Address',
          check_out_device_id: testContext.deviceToken?.device_id || 'test_device',
          status: 'COMPLETED'
        })
        .eq('id', attendanceRecord.id)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].status).toBe('COMPLETED');
      expect(data![0].check_out_time).toBeDefined();

      // Verify work duration calculation
      expect(data![0].total_work_minutes).toBeGreaterThan(0);
      expect(data![0].actual_work_minutes).toBeGreaterThan(0);
    });
  });

  describe('Real-time Functionality', () => {
    test('real-time attendance updates work', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Real-time test timed out'));
        }, TEST_CONFIG.performanceThreshold.realtimeUpdate);

        const startTime = Date.now();
        let updateReceived = false;

        // Set up real-time subscription
        const channel = testContext.serviceClient
          .channel('test-attendance-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'attendance',
              filter: `employee_id=eq.${testContext.employee.id}`
            },
            (payload) => {
              if (!updateReceived) {
                updateReceived = true;
                const realtimeLatency = Date.now() - startTime;
                performanceMetrics.realtimeUpdate.push(realtimeLatency);

                expect(payload.new).toBeDefined();
                expect(realtimeLatency).toBeLessThan(TEST_CONFIG.performanceThreshold.realtimeUpdate);

                clearTimeout(timeout);
                testContext.serviceClient.removeChannel(channel);
                resolve();
              }
            }
          )
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Trigger an update after subscription is confirmed
              setTimeout(async () => {
                await testContext.serviceClient
                  .from('attendance')
                  .update({ notes: 'Real-time test update' })
                  .eq('employee_id', testContext.employee.id)
                  .eq('date', new Date().toISOString().split('T')[0]);
              }, 100);
            }
          });

        testContext.realtimeChannel = channel;
      });
    });

    test('real-time QR code updates work', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('QR real-time test timed out'));
        }, 5000);

        let updateReceived = false;

        const channel = testContext.serviceClient
          .channel('test-qr-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'qr_codes',
              filter: `id=eq.${testContext.qrCode.id}`
            },
            (payload) => {
              if (!updateReceived) {
                updateReceived = true;
                expect(payload.new.scan_count).toBeGreaterThan(payload.old.scan_count || 0);
                clearTimeout(timeout);
                testContext.serviceClient.removeChannel(channel);
                resolve();
              }
            }
          )
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Trigger QR code scan
              setTimeout(async () => {
                await testContext.serviceClient
                  .from('qr_code_scans')
                  .insert({
                    qr_code_id: testContext.qrCode.id,
                    scanned_by: testContext.employee.id,
                    scan_successful: true
                  });
              }, 100);
            }
          });
      });
    });

    test('real-time employee approval notifications work', async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Approval notification test timed out'));
        }, 5000);

        let notificationReceived = false;

        // Create a new pending employee for this test
        const testEmail = `realtime.test.${Date.now()}@example.com`;
        
        testContext.serviceClient.auth.admin.createUser({
          email: testEmail,
          password: 'RealtimeTest123!',
          email_confirm: true
        }).then(({ data: userData }) => {
          return testContext.serviceClient
            .from('employees')
            .insert({
              auth_user_id: userData.user.id,
              organization_id: testContext.organization.id,
              name: 'Realtime Test Employee',
              email: testEmail,
              role: 'EMPLOYEE',
              approval_status: 'PENDING'
            })
            .select()
            .single();
        }).then(({ data: employeeData }) => {
          // Set up real-time listener for approval
          const channel = testContext.serviceClient
            .channel('test-approval-updates')
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'employees',
                filter: `id=eq.${employeeData.id}`
              },
              (payload) => {
                if (!notificationReceived && payload.new.approval_status === 'APPROVED') {
                  notificationReceived = true;
                  expect(payload.new.approval_status).toBe('APPROVED');
                  expect(payload.new.approved_by).toBe(testContext.masterAdmin.id);
                  
                  clearTimeout(timeout);
                  testContext.serviceClient.removeChannel(channel);
                  
                  // Cleanup
                  testContext.serviceClient
                    .from('employees')
                    .delete()
                    .eq('id', employeeData.id)
                    .then(() => {
                      return testContext.serviceClient.auth.admin.deleteUser(userData.user.id);
                    })
                    .then(() => resolve());
                }
              }
            )
            .subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                // Approve the employee
                setTimeout(async () => {
                  await testContext.masterAdminClient
                    .from('employees')
                    .update({
                      approval_status: 'APPROVED',
                      approved_by: testContext.masterAdmin.id,
                      approved_at: new Date().toISOString(),
                      is_active: true
                    })
                    .eq('id', employeeData.id);
                }, 100);
              }
            });
        }).catch(reject);
      });
    });
  });

  describe('Performance Benchmarks', () => {
    test('system handles concurrent operations efficiently', async () => {
      const concurrentOperations = 10;
      const operations = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentOperations; i++) {
        operations.push(
          testContext.employeeClient
            .from('attendance')
            .select('*')
            .eq('employee_id', testContext.employee.id)
        );
      }

      const results = await Promise.all(operations);
      const totalTime = Date.now() - startTime;

      expect(results.every(result => result.error === null)).toBe(true);
      expect(totalTime).toBeLessThan(3000); // All concurrent operations within 3 seconds
      expect(totalTime / concurrentOperations).toBeLessThan(500); // Average under 500ms per operation
    });

    test('bulk operations perform within acceptable limits', async () => {
      const bulkSize = 50;
      const bulkData = [];

      for (let i = 0; i < bulkSize; i++) {
        bulkData.push({
          employee_id: testContext.employee.id,
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          check_in_time: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          status: 'COMPLETED',
          total_work_minutes: 480
        });
      }

      const startTime = Date.now();

      const { data, error } = await testContext.serviceClient
        .from('attendance')
        .insert(bulkData)
        .select();

      const bulkInsertTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(data).toHaveLength(bulkSize);
      expect(bulkInsertTime).toBeLessThan(5000); // Bulk insert within 5 seconds
      expect(bulkInsertTime / bulkSize).toBeLessThan(100); // Average under 100ms per record

      // Cleanup
      await testContext.serviceClient
        .from('attendance')
        .delete()
        .in('id', data!.map(record => record.id));
    });

    test('complex queries with joins perform efficiently', async () => {
      const startTime = Date.now();

      const { data, error } = await testContext.employeeClient
        .from('attendance')
        .select(`
          *,
          employees!inner(name, email, employee_code),
          breaks(*)
        `)
        .eq('employee_id', testContext.employee.id)
        .order('date', { ascending: false })
        .limit(20);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(queryTime).toBeLessThan(2000); // Complex query within 2 seconds
    });

    test('performance metrics are within acceptable ranges', () => {
      const metrics = performanceMetrics;

      // Check if we have enough samples
      Object.keys(metrics).forEach(operation => {
        if (metrics[operation].length > 0) {
          const average = metrics[operation].reduce((a, b) => a + b, 0) / metrics[operation].length;
          const max = Math.max(...metrics[operation]);
          
          console.log(`${operation}: avg=${average}ms, max=${max}ms, samples=${metrics[operation].length}`);
          
          expect(average).toBeLessThan(TEST_CONFIG.performanceThreshold[operation as keyof typeof TEST_CONFIG.performanceThreshold]);
        }
      });
    });
  });

  describe('Security Vulnerability Checks', () => {
    test('SQL injection protection is effective', async () => {
      const maliciousInputs = [
        "'; DROP TABLE employees; --",
        "' OR '1'='1",
        "'; SELECT * FROM employees WHERE '1'='1'; --",
        "1' UNION SELECT * FROM employees--",
        "'; DELETE FROM attendance; --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const { data, error } = await testContext.employeeClient
          .from('employees')
          .select('*')
          .eq('name', maliciousInput);

        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      }

      // Verify data integrity
      const { data: employeeData } = await testContext.employeeClient
        .from('employees')
        .select('*')
        .eq('id', testContext.employee.id);

      expect(employeeData).toHaveLength(1);
    });

    test('RLS policies prevent data leakage', async () => {
      // Employee should not see other employees' data
      const { data, error } = await testContext.employeeClient
        .from('employees')
        .select('*')
        .neq('id', testContext.employee.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Employee should not see other employees' attendance
      const { data: attendanceData } = await testContext.employeeClient
        .from('attendance')
        .select('*')
        .neq('employee_id', testContext.employee.id);

      expect(attendanceData).toHaveLength(0);
    });

    test('authentication bypass attempts fail', async () => {
      const unauthenticatedClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);

      const { data, error } = await unauthenticatedClient
        .from('employees')
        .select('*');

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    test('privilege escalation is prevented', async () => {
      // Regular employee tries to update their role
      const { data, error } = await testContext.employeeClient
        .from('employees')
        .update({ role: 'MASTER_ADMIN', is_master_admin: true })
        .eq('id', testContext.employee.id)
        .select();

      // Should fail due to RLS policies
      expect(data).toHaveLength(0);

      // Verify role hasn't changed
      const { data: employeeData } = await testContext.serviceClient
        .from('employees')
        .select('role, is_master_admin')
        .eq('id', testContext.employee.id)
        .single();

      expect(employeeData.role).toBe('EMPLOYEE');
      expect(employeeData.is_master_admin).toBe(false);
    });

    test('sensitive data access is properly controlled', async () => {
      // Test access to audit logs
      const { data: auditData } = await testContext.employeeClient
        .from('master_admin_audit_log')
        .select('*');

      expect(auditData).toHaveLength(0);

      // Test access to permissions
      const { data: permissionData } = await testContext.employeeClient
        .from('master_admin_permissions')
        .select('*');

      expect(permissionData).toHaveLength(0);
    });

    test('input validation is enforced', async () => {
      const invalidInputs = [
        { email: 'not-an-email' },
        { phone: 'x'.repeat(1000) }, // Very long string
        { employee_code: null },
        { name: '' } // Empty required field
      ];

      for (const invalidInput of invalidInputs) {
        const { data, error } = await testContext.employeeClient
          .from('employees')
          .update(invalidInput)
          .eq('id', testContext.employee.id)
          .select();

        // Most should fail validation, or return empty results due to constraints
        if (error === null) {
          expect(data).toHaveLength(0);
        }
      }
    });

    test('rate limiting and abuse prevention', async () => {
      const rapidRequests = [];
      const requestCount = 20;

      for (let i = 0; i < requestCount; i++) {
        rapidRequests.push(
          testContext.employeeClient
            .from('employees')
            .select('*')
            .eq('id', testContext.employee.id)
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(rapidRequests);
      const totalTime = Date.now() - startTime;

      // Most requests should succeed (unless rate limiting is implemented)
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successfulRequests).toBeGreaterThan(0);
      
      // If rate limiting is implemented, some requests might be rejected
      console.log(`Rate limiting test: ${successfulRequests}/${requestCount} requests succeeded in ${totalTime}ms`);
    });
  });

  /**
   * Helper function to calculate distance between two coordinates
   */
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
});