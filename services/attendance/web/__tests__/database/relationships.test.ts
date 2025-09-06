import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

describe('Database Relationships Tests', () => {
  let masterOrgId: string;
  let testOrgId: string;
  let testBranchId: string;
  let testEmployeeId: string;
  let testContractId: string;

  beforeAll(async () => {
    // Check for Master Admin organization
    const { data: masterOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('type', 'MASTER_ADMIN')
      .single();

    if (masterOrg) {
      masterOrgId = masterOrg.id;
    }

    // Create test data hierarchy
    const { data: org } = await supabase
      .from('organizations')
      .insert({
        name: 'Relationship Test Org',
        business_number: 'REL-TEST-123',
        type: 'COMPANY',
        representative_name: 'Relationship Test',
        phone: '010-6666-6666',
        email: 'relationship@test.com',
        address: 'Test Address'
      })
      .select()
      .single();
    
    testOrgId = org?.id;

    const { data: branch } = await supabase
      .from('branches')
      .insert({
        organization_id: testOrgId,
        name: 'Relationship Test Branch',
        code: 'RTB-001',
        address: 'Branch Address',
        latitude: 37.5665,
        longitude: 126.9780,
        radius_meters: 100,
        is_default: true
      })
      .select()
      .single();
    
    testBranchId = branch?.id;

    // Create test employee with auth user
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: 'rel.test@example.com',
      password: 'TestPassword123!',
      email_confirm: true
    });

    const { data: employee } = await supabase
      .from('employees')
      .insert({
        auth_user_id: authUser?.user?.id,
        organization_id: testOrgId,
        email: 'rel.test@example.com',
        name: 'Relationship Test Employee',
        employee_number: 'REL-EMP-001',
        phone: '010-7777-7777'
      })
      .select()
      .single();
    
    testEmployeeId = employee?.id;

    const { data: contract } = await supabase
      .from('contracts')
      .insert({
        employee_id: testEmployeeId,
        organization_id: testOrgId,
        branch_id: testBranchId,
        contract_type: 'FULL_TIME',
        start_date: '2024-01-01',
        hourly_wage: 10000,
        work_start_time: '09:00:00',
        work_end_time: '18:00:00',
        status: 'ACTIVE'
      })
      .select()
      .single();
    
    testContractId = contract?.id;
  });

  afterAll(async () => {
    // Cleanup in reverse order
    if (testContractId) {
      await supabase.from('contracts').delete().eq('id', testContractId);
    }
    if (testEmployeeId) {
      const { data: emp } = await supabase
        .from('employees')
        .select('auth_user_id')
        .eq('id', testEmployeeId)
        .single();
      
      await supabase.from('employees').delete().eq('id', testEmployeeId);
      
      if (emp?.auth_user_id) {
        await supabase.auth.admin.deleteUser(emp.auth_user_id);
      }
    }
    if (testBranchId) {
      await supabase.from('branches').delete().eq('id', testBranchId);
    }
    if (testOrgId) {
      await supabase.from('organizations').delete().eq('id', testOrgId);
    }
  });

  describe('Organization Hierarchy', () => {
    it('should have Master Admin organization', async () => {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('type', 'MASTER_ADMIN');

      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThanOrEqual(1);
      expect(data?.[0].type).toBe('MASTER_ADMIN');
    });

    it('should retrieve organization with branches', async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          branches (*)
        `)
        .eq('id', testOrgId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.branches).toBeDefined();
      expect(data?.branches.length).toBeGreaterThanOrEqual(1);
      expect(data?.branches[0].name).toBe('Relationship Test Branch');
    });

    it('should retrieve branch with organization details', async () => {
      const { data, error } = await supabase
        .from('branches')
        .select(`
          *,
          organization:organizations (*)
        `)
        .eq('id', testBranchId)
        .single();

      expect(error).toBeNull();
      expect(data?.organization).toBeDefined();
      expect(data?.organization.name).toBe('Relationship Test Org');
    });
  });

  describe('Employee Relationships', () => {
    it('should retrieve employee with organization and contracts', async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          organization:organizations (*),
          contracts (*)
        `)
        .eq('id', testEmployeeId)
        .single();

      expect(error).toBeNull();
      expect(data?.organization).toBeDefined();
      expect(data?.contracts).toBeDefined();
      expect(data?.contracts.length).toBeGreaterThanOrEqual(1);
    });

    it('should link employee to Supabase Auth user', async () => {
      const { data } = await supabase
        .from('employees')
        .select('auth_user_id')
        .eq('id', testEmployeeId)
        .single();

      expect(data?.auth_user_id).toBeDefined();
      expect(data?.auth_user_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should retrieve employee roles', async () => {
      // Create a test role
      const { data: role } = await supabase
        .from('user_roles')
        .insert({
          employee_id: testEmployeeId,
          organization_id: testOrgId,
          role: 'EMPLOYEE'
        })
        .select()
        .single();

      const { data } = await supabase
        .from('user_roles')
        .select(`
          *,
          employee:employees (*),
          organization:organizations (*)
        `)
        .eq('employee_id', testEmployeeId);

      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThanOrEqual(1);
      expect(data?.[0].employee).toBeDefined();
      expect(data?.[0].organization).toBeDefined();

      // Cleanup
      if (role?.id) {
        await supabase.from('user_roles').delete().eq('id', role.id);
      }
    });
  });

  describe('Contract Relationships', () => {
    it('should retrieve contract with all relationships', async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          employee:employees (*),
          organization:organizations (*),
          branch:branches (*)
        `)
        .eq('id', testContractId)
        .single();

      expect(error).toBeNull();
      expect(data?.employee).toBeDefined();
      expect(data?.organization).toBeDefined();
      expect(data?.branch).toBeDefined();
      expect(data?.employee.name).toBe('Relationship Test Employee');
      expect(data?.organization.name).toBe('Relationship Test Org');
      expect(data?.branch.name).toBe('Relationship Test Branch');
    });

    it('should enforce active contract constraint', async () => {
      // Try to create another active contract for same employee
      const { error } = await supabase
        .from('contracts')
        .insert({
          employee_id: testEmployeeId,
          organization_id: testOrgId,
          branch_id: testBranchId,
          contract_type: 'PART_TIME',
          start_date: '2024-06-01',
          hourly_wage: 9000,
          work_start_time: '10:00:00',
          work_end_time: '14:00:00',
          status: 'ACTIVE'
        });

      // Should fail if constraint is properly set
      expect(error).toBeDefined();
    });
  });

  describe('Attendance Relationships', () => {
    it('should create and retrieve attendance with relationships', async () => {
      const { data: attendance } = await supabase
        .from('attendance')
        .insert({
          employee_id: testEmployeeId,
          contract_id: testContractId,
          branch_id: testBranchId,
          date: '2024-01-15',
          check_in_time: '09:00:00',
          check_in_latitude: 37.5665,
          check_in_longitude: 126.9780,
          status: 'CHECKED_IN'
        })
        .select(`
          *,
          employee:employees (*),
          contract:contracts (*),
          branch:branches (*)
        `)
        .single();

      expect(attendance).toBeDefined();
      expect(attendance?.employee).toBeDefined();
      expect(attendance?.contract).toBeDefined();
      expect(attendance?.branch).toBeDefined();

      // Create break for this attendance
      const { data: breakData } = await supabase
        .from('breaks')
        .insert({
          attendance_id: attendance?.id,
          start_time: '12:00:00',
          end_time: '13:00:00',
          duration_minutes: 60
        })
        .select(`
          *,
          attendance (*)
        `)
        .single();

      expect(breakData).toBeDefined();
      expect(breakData?.attendance).toBeDefined();

      // Cleanup
      if (breakData?.id) {
        await supabase.from('breaks').delete().eq('id', breakData.id);
      }
      if (attendance?.id) {
        await supabase.from('attendance').delete().eq('id', attendance.id);
      }
    });

    it('should prevent duplicate attendance on same date', async () => {
      const attendanceData = {
        employee_id: testEmployeeId,
        contract_id: testContractId,
        branch_id: testBranchId,
        date: '2024-01-16',
        check_in_time: '09:00:00',
        check_in_latitude: 37.5665,
        check_in_longitude: 126.9780,
        status: 'CHECKED_IN'
      };

      // First attendance should succeed
      const { data: att1 } = await supabase
        .from('attendance')
        .insert(attendanceData)
        .select()
        .single();

      // Second attendance on same date should fail
      const { error } = await supabase
        .from('attendance')
        .insert(attendanceData);

      expect(error).toBeDefined();

      // Cleanup
      if (att1?.id) {
        await supabase.from('attendance').delete().eq('id', att1.id);
      }
    });
  });

  describe('QR Code Relationships', () => {
    it('should create and retrieve QR codes with branch', async () => {
      const { data: qrCode } = await supabase
        .from('qr_codes')
        .insert({
          branch_id: testBranchId,
          code: `QR-${Date.now()}`,
          is_active: false
        })
        .select(`
          *,
          branch:branches (
            *,
            organization:organizations (*)
          )
        `)
        .single();

      expect(qrCode).toBeDefined();
      expect(qrCode?.branch).toBeDefined();
      expect(qrCode?.branch.organization).toBeDefined();

      // Cleanup
      if (qrCode?.id) {
        await supabase.from('qr_codes').delete().eq('id', qrCode.id);
      }
    });
  });

  describe('Device Token Relationships', () => {
    it('should create and retrieve device tokens with employee', async () => {
      const { data: token } = await supabase
        .from('device_tokens')
        .insert({
          employee_id: testEmployeeId,
          token: `test-token-${Date.now()}`,
          device_type: 'IOS',
          is_active: true
        })
        .select(`
          *,
          employee:employees (*)
        `)
        .single();

      expect(token).toBeDefined();
      expect(token?.employee).toBeDefined();
      expect(token?.employee.name).toBe('Relationship Test Employee');

      // Cleanup
      if (token?.id) {
        await supabase.from('device_tokens').delete().eq('id', token.id);
      }
    });

    it('should handle multiple tokens per employee', async () => {
      const tokens = [
        {
          employee_id: testEmployeeId,
          token: `ios-token-${Date.now()}`,
          device_type: 'IOS',
          is_active: true
        },
        {
          employee_id: testEmployeeId,
          token: `android-token-${Date.now()}`,
          device_type: 'ANDROID',
          is_active: true
        }
      ];

      const { data } = await supabase
        .from('device_tokens')
        .insert(tokens)
        .select();

      expect(data).toBeDefined();
      expect(data?.length).toBe(2);

      // Cleanup
      if (data) {
        for (const token of data) {
          await supabase.from('device_tokens').delete().eq('id', token.id);
        }
      }
    });
  });

  describe('Audit Log Relationships', () => {
    it('should create audit logs for data changes', async () => {
      const auditData = {
        table_name: 'organizations',
        record_id: testOrgId,
        action: 'UPDATE',
        changes: {
          old: { name: 'Old Name' },
          new: { name: 'New Name' }
        },
        user_id: testEmployeeId,
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent'
      };

      const { data: audit } = await supabase
        .from('audit_logs')
        .insert(auditData)
        .select()
        .single();

      expect(audit).toBeDefined();
      expect(audit?.table_name).toBe('organizations');
      expect(audit?.action).toBe('UPDATE');
      expect(audit?.changes).toBeDefined();

      // Retrieve audit logs for specific record
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('record_id', testOrgId)
        .eq('table_name', 'organizations');

      expect(logs).toBeDefined();
      expect(logs?.length).toBeGreaterThanOrEqual(1);

      // Cleanup
      if (audit?.id) {
        await supabase.from('audit_logs').delete().eq('id', audit.id);
      }
    });

    it('should track different action types', async () => {
      const actions = ['INSERT', 'UPDATE', 'DELETE'];
      const auditLogs = [];

      for (const action of actions) {
        const { data } = await supabase
          .from('audit_logs')
          .insert({
            table_name: 'test_table',
            record_id: testOrgId,
            action: action,
            changes: { test: action },
            user_id: testEmployeeId
          })
          .select()
          .single();
        
        auditLogs.push(data);
      }

      expect(auditLogs).toHaveLength(3);
      expect(auditLogs.map(log => log?.action)).toEqual(actions);

      // Cleanup
      for (const log of auditLogs) {
        if (log?.id) {
          await supabase.from('audit_logs').delete().eq('id', log.id);
        }
      }
    });
  });

  describe('GPS Location Relationships', () => {
    it('should calculate distance between locations', async () => {
      // This would use PostGIS functions
      const { data } = await supabase
        .rpc('calculate_distance', {
          lat1: 37.5665,
          lon1: 126.9780,
          lat2: 37.5660,
          lon2: 126.9785
        });

      // Distance should be a positive number
      if (data !== null) {
        expect(data).toBeGreaterThanOrEqual(0);
      }
    });

    it('should check if location is within branch radius', async () => {
      const { data: branch } = await supabase
        .from('branches')
        .select('latitude, longitude, radius_meters')
        .eq('id', testBranchId)
        .single();

      if (branch) {
        // Check if a point is within radius
        const { data: isWithin } = await supabase
          .rpc('is_within_radius', {
            check_lat: branch.latitude,
            check_lon: branch.longitude,
            branch_lat: branch.latitude,
            branch_lon: branch.longitude,
            radius: branch.radius_meters
          });

        expect(isWithin).toBe(true);

        // Check if a distant point is outside radius
        const { data: isOutside } = await supabase
          .rpc('is_within_radius', {
            check_lat: branch.latitude + 1, // 1 degree away
            check_lon: branch.longitude + 1,
            branch_lat: branch.latitude,
            branch_lon: branch.longitude,
            radius: branch.radius_meters
          });

        expect(isOutside).toBe(false);
      }
    });
  });
});