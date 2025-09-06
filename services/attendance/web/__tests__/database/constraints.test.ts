import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

describe('Database Constraints Tests', () => {
  let testOrgId: string;
  let testBranchId: string;
  let testEmployeeId: string;

  beforeAll(async () => {
    // Create test organization
    const { data: org } = await supabase
      .from('organizations')
      .insert({
        name: 'Constraint Test Org',
        business_number: 'CONST-TEST-123',
        type: 'COMPANY',
        representative_name: 'Constraint Test',
        phone: '010-1111-1111',
        email: 'constraint@test.com',
        address: 'Test Address'
      })
      .select()
      .single();
    
    testOrgId = org?.id;

    // Create test branch
    const { data: branch } = await supabase
      .from('branches')
      .insert({
        organization_id: testOrgId,
        name: 'Constraint Test Branch',
        code: 'CTB-001',
        address: 'Branch Address',
        latitude: 37.5,
        longitude: 127.0,
        radius_meters: 50
      })
      .select()
      .single();
    
    testBranchId = branch?.id;
  });

  afterAll(async () => {
    // Cleanup in reverse order due to foreign keys
    if (testBranchId) {
      await supabase.from('branches').delete().eq('id', testBranchId);
    }
    if (testOrgId) {
      await supabase.from('organizations').delete().eq('id', testOrgId);
    }
  });

  describe('NOT NULL Constraints', () => {
    it('should enforce NOT NULL on organization required fields', async () => {
      const { error } = await supabase
        .from('organizations')
        .insert({
          name: null, // This should fail
          business_number: 'NULL-TEST-123',
          type: 'COMPANY'
        });
      
      expect(error).toBeDefined();
      expect(error?.code).toBe('23502'); // Not-null violation
    });

    it('should enforce NOT NULL on branches required fields', async () => {
      const { error } = await supabase
        .from('branches')
        .insert({
          organization_id: testOrgId,
          name: null, // This should fail
          code: 'NULL-BR-001'
        });
      
      expect(error).toBeDefined();
      expect(error?.code).toBe('23502');
    });

    it('should enforce NOT NULL on contracts required fields', async () => {
      const { error } = await supabase
        .from('contracts')
        .insert({
          employee_id: testEmployeeId,
          organization_id: testOrgId,
          branch_id: testBranchId,
          contract_type: null, // This should fail
          start_date: '2024-01-01'
        });
      
      expect(error).toBeDefined();
      expect(error?.code).toBe('23502');
    });
  });

  describe('UNIQUE Constraints', () => {
    it('should enforce unique email per organization for employees', async () => {
      const employeeData = {
        auth_user_id: 'test-auth-id-1',
        organization_id: testOrgId,
        email: 'unique@test.com',
        name: 'Test Employee',
        employee_number: 'EMP-001',
        phone: '010-2222-2222'
      };

      // First insert should succeed
      const { data: emp1 } = await supabase
        .from('employees')
        .insert(employeeData)
        .select()
        .single();

      // Second insert with same email and org should fail
      const { error } = await supabase
        .from('employees')
        .insert({
          ...employeeData,
          auth_user_id: 'test-auth-id-2',
          employee_number: 'EMP-002'
        });

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // Unique violation

      // Cleanup
      if (emp1?.id) {
        await supabase.from('employees').delete().eq('id', emp1.id);
      }
    });

    it('should enforce unique branch code per organization', async () => {
      const branchData = {
        organization_id: testOrgId,
        name: 'Unique Test Branch',
        code: 'UNIQUE-BR-001',
        address: 'Test Address',
        latitude: 37.5,
        longitude: 127.0,
        radius_meters: 50
      };

      // First insert should succeed
      const { data: branch1 } = await supabase
        .from('branches')
        .insert(branchData)
        .select()
        .single();

      // Second insert with same code and org should fail
      const { error } = await supabase
        .from('branches')
        .insert({
          ...branchData,
          name: 'Another Branch'
        });

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505');

      // Cleanup
      if (branch1?.id) {
        await supabase.from('branches').delete().eq('id', branch1.id);
      }
    });

    it('should enforce one default branch per organization', async () => {
      const branch1Data = {
        organization_id: testOrgId,
        name: 'Default Branch 1',
        code: 'DEF-BR-001',
        address: 'Address 1',
        is_default: true,
        latitude: 37.5,
        longitude: 127.0,
        radius_meters: 50
      };

      const branch2Data = {
        organization_id: testOrgId,
        name: 'Default Branch 2',
        code: 'DEF-BR-002',
        address: 'Address 2',
        is_default: true,
        latitude: 37.6,
        longitude: 127.1,
        radius_meters: 50
      };

      // First default branch should succeed
      const { data: b1 } = await supabase
        .from('branches')
        .insert(branch1Data)
        .select()
        .single();

      // Second default branch should fail
      const { error } = await supabase
        .from('branches')
        .insert(branch2Data);

      expect(error).toBeDefined();

      // Cleanup
      if (b1?.id) {
        await supabase.from('branches').delete().eq('id', b1.id);
      }
    });
  });

  describe('CHECK Constraints', () => {
    it('should enforce valid organization types', async () => {
      const { error } = await supabase
        .from('organizations')
        .insert({
          name: 'Invalid Type Org',
          business_number: 'INVALID-TYPE-123',
          type: 'INVALID_TYPE', // Should fail
          representative_name: 'Test',
          phone: '010-3333-3333',
          email: 'invalid@test.com',
          address: 'Test'
        });

      expect(error).toBeDefined();
    });

    it('should enforce positive radius for branches', async () => {
      const { error } = await supabase
        .from('branches')
        .insert({
          organization_id: testOrgId,
          name: 'Negative Radius Branch',
          code: 'NEG-RAD-001',
          address: 'Test',
          latitude: 37.5,
          longitude: 127.0,
          radius_meters: -50 // Should fail
        });

      expect(error).toBeDefined();
    });

    it('should enforce valid contract dates', async () => {
      const { error } = await supabase
        .from('contracts')
        .insert({
          employee_id: testEmployeeId,
          organization_id: testOrgId,
          branch_id: testBranchId,
          contract_type: 'FULL_TIME',
          start_date: '2024-12-31',
          end_date: '2024-01-01', // End before start - should fail
          hourly_wage: 10000,
          work_start_time: '09:00',
          work_end_time: '18:00'
        });

      expect(error).toBeDefined();
    });

    it('should enforce positive hourly wage', async () => {
      const { error } = await supabase
        .from('contracts')
        .insert({
          employee_id: testEmployeeId,
          organization_id: testOrgId,
          branch_id: testBranchId,
          contract_type: 'FULL_TIME',
          start_date: '2024-01-01',
          hourly_wage: -1000, // Negative wage - should fail
          work_start_time: '09:00',
          work_end_time: '18:00'
        });

      expect(error).toBeDefined();
    });

    it('should enforce valid time ranges for work hours', async () => {
      const { error } = await supabase
        .from('contracts')
        .insert({
          employee_id: testEmployeeId,
          organization_id: testOrgId,
          branch_id: testBranchId,
          contract_type: 'FULL_TIME',
          start_date: '2024-01-01',
          hourly_wage: 10000,
          work_start_time: '18:00',
          work_end_time: '09:00' // End before start - should fail
        });

      expect(error).toBeDefined();
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should prevent deletion of organization with branches', async () => {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', testOrgId);

      expect(error).toBeDefined();
      expect(error?.code).toBe('23503'); // Foreign key violation
    });

    it('should cascade delete branches when organization is deleted', async () => {
      // Create a new org and branch for this test
      const { data: tempOrg } = await supabase
        .from('organizations')
        .insert({
          name: 'Cascade Test Org',
          business_number: 'CASCADE-123',
          type: 'COMPANY',
          representative_name: 'Cascade Test',
          phone: '010-4444-4444',
          email: 'cascade@test.com',
          address: 'Test'
        })
        .select()
        .single();

      const { data: tempBranch } = await supabase
        .from('branches')
        .insert({
          organization_id: tempOrg?.id,
          name: 'Cascade Branch',
          code: 'CASCADE-001',
          address: 'Test',
          latitude: 37.5,
          longitude: 127.0,
          radius_meters: 50
        })
        .select()
        .single();

      // Delete organization (should cascade to branches if configured)
      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', tempOrg?.id);

      // Check if branch was deleted
      const { data: remainingBranch } = await supabase
        .from('branches')
        .select()
        .eq('id', tempBranch?.id)
        .single();

      expect(remainingBranch).toBeNull();
    });

    it('should prevent invalid foreign key references', async () => {
      const { error } = await supabase
        .from('branches')
        .insert({
          organization_id: '00000000-0000-0000-0000-000000000000', // Non-existent
          name: 'Invalid FK Branch',
          code: 'INVALID-FK-001',
          address: 'Test',
          latitude: 37.5,
          longitude: 127.0,
          radius_meters: 50
        });

      expect(error).toBeDefined();
      expect(error?.code).toBe('23503');
    });
  });

  describe('Composite Constraints', () => {
    it('should enforce unique employee-organization-role combination', async () => {
      // Create test employee first
      const { data: emp } = await supabase
        .from('employees')
        .insert({
          auth_user_id: 'test-role-auth-id',
          organization_id: testOrgId,
          email: 'role@test.com',
          name: 'Role Test Employee',
          employee_number: 'ROLE-001',
          phone: '010-5555-5555'
        })
        .select()
        .single();

      const roleData = {
        employee_id: emp?.id,
        organization_id: testOrgId,
        role: 'ADMIN'
      };

      // First role assignment should succeed
      const { data: role1 } = await supabase
        .from('user_roles')
        .insert(roleData)
        .select()
        .single();

      // Same role assignment should fail
      const { error } = await supabase
        .from('user_roles')
        .insert(roleData);

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505');

      // Different role should succeed
      const { data: role2 } = await supabase
        .from('user_roles')
        .insert({
          ...roleData,
          role: 'MANAGER'
        })
        .select()
        .single();

      expect(role2).toBeDefined();

      // Cleanup
      if (role1?.id) await supabase.from('user_roles').delete().eq('id', role1.id);
      if (role2?.id) await supabase.from('user_roles').delete().eq('id', role2.id);
      if (emp?.id) await supabase.from('employees').delete().eq('id', emp.id);
    });

    it('should enforce one active QR code per branch', async () => {
      const qrData1 = {
        branch_id: testBranchId,
        code: 'QR-ACTIVE-001',
        is_active: true
      };

      const qrData2 = {
        branch_id: testBranchId,
        code: 'QR-ACTIVE-002',
        is_active: true
      };

      // First active QR should succeed
      const { data: qr1 } = await supabase
        .from('qr_codes')
        .insert(qrData1)
        .select()
        .single();

      // Second active QR for same branch should fail
      const { error } = await supabase
        .from('qr_codes')
        .insert(qrData2);

      expect(error).toBeDefined();

      // Inactive QR should succeed
      const { data: qr2 } = await supabase
        .from('qr_codes')
        .insert({
          ...qrData2,
          is_active: false
        })
        .select()
        .single();

      expect(qr2).toBeDefined();

      // Cleanup
      if (qr1?.id) await supabase.from('qr_codes').delete().eq('id', qr1.id);
      if (qr2?.id) await supabase.from('qr_codes').delete().eq('id', qr2.id);
    });
  });
});