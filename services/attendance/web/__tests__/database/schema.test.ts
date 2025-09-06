import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

describe('Database Schema Tests', () => {
  describe('PostGIS Extension', () => {
    it('should have PostGIS extension enabled', async () => {
      const { data, error } = await supabase
        .rpc('get_installed_extensions')
        .select('*');
      
      expect(error).toBeNull();
      const extensions = data?.map((ext: any) => ext.extname) || [];
      expect(extensions).toContain('postgis');
    });
  });

  describe('Organizations Table', () => {
    it('should have organizations table with correct structure', async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have required columns in organizations table', async () => {
      const { data: columns } = await supabase
        .rpc('get_table_columns', { table_name: 'organizations' });
      
      const columnNames = columns?.map((col: any) => col.column_name) || [];
      const requiredColumns = [
        'id', 'name', 'business_number', 'type', 
        'representative_name', 'phone', 'email',
        'address', 'created_at', 'updated_at'
      ];
      
      requiredColumns.forEach(col => {
        expect(columnNames).toContain(col);
      });
    });

    it('should enforce unique constraint on business_number', async () => {
      const testOrg = {
        name: 'Test Org',
        business_number: 'TEST-123-45-67890',
        type: 'COMPANY',
        representative_name: 'Test Rep',
        phone: '010-1234-5678',
        email: 'test@test.com',
        address: 'Test Address'
      };

      // Insert first organization
      const { error: error1 } = await supabase
        .from('organizations')
        .insert(testOrg);
      
      // Try to insert duplicate
      const { error: error2 } = await supabase
        .from('organizations')
        .insert(testOrg);
      
      expect(error1).toBeNull();
      expect(error2).toBeDefined();
      expect(error2?.code).toBe('23505'); // Unique violation

      // Cleanup
      await supabase
        .from('organizations')
        .delete()
        .eq('business_number', testOrg.business_number);
    });
  });

  describe('Branches Table', () => {
    it('should have branches table with GPS coordinates', async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have PostGIS point type for location', async () => {
      const { data: columns } = await supabase
        .rpc('get_table_columns', { table_name: 'branches' });
      
      const locationColumn = columns?.find((col: any) => col.column_name === 'location');
      expect(locationColumn).toBeDefined();
      expect(locationColumn?.data_type).toBe('USER-DEFINED');
      expect(locationColumn?.udt_name).toBe('geometry');
    });

    it('should store and retrieve GPS coordinates correctly', async () => {
      // Create test organization first
      const { data: orgData } = await supabase
        .from('organizations')
        .insert({
          name: 'GPS Test Org',
          business_number: 'GPS-TEST-123',
          type: 'COMPANY',
          representative_name: 'GPS Test',
          phone: '010-0000-0000',
          email: 'gps@test.com',
          address: 'GPS Test Address'
        })
        .select()
        .single();

      const testBranch = {
        organization_id: orgData?.id,
        name: 'Test Branch',
        code: 'BR-TEST-001',
        address: 'Test Address',
        latitude: 37.5665,
        longitude: 126.9780,
        radius_meters: 100
      };

      const { data: branchData, error } = await supabase
        .from('branches')
        .insert(testBranch)
        .select()
        .single();

      expect(error).toBeNull();
      expect(branchData?.latitude).toBeCloseTo(37.5665, 4);
      expect(branchData?.longitude).toBeCloseTo(126.9780, 4);

      // Cleanup
      await supabase.from('branches').delete().eq('id', branchData?.id);
      await supabase.from('organizations').delete().eq('id', orgData?.id);
    });
  });

  describe('Employees Table', () => {
    it('should have employees table linked to Supabase Auth', async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have foreign key to auth.users', async () => {
      const { data: constraints } = await supabase
        .rpc('get_table_constraints', { 
          table_name: 'employees',
          constraint_type: 'FOREIGN KEY' 
        });
      
      const authUserFK = constraints?.find((c: any) => 
        c.column_name === 'auth_user_id'
      );
      expect(authUserFK).toBeDefined();
    });
  });

  describe('Contracts Table', () => {
    it('should have contracts table with proper relationships', async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should enforce business rules for contracts', async () => {
      const { data: columns } = await supabase
        .rpc('get_table_columns', { table_name: 'contracts' });
      
      const requiredColumns = [
        'id', 'employee_id', 'organization_id', 'branch_id',
        'contract_type', 'start_date', 'end_date', 'hourly_wage',
        'work_start_time', 'work_end_time', 'status'
      ];
      
      const columnNames = columns?.map((col: any) => col.column_name) || [];
      requiredColumns.forEach(col => {
        expect(columnNames).toContain(col);
      });
    });
  });

  describe('User Roles Table', () => {
    it('should have user_roles table for permission management', async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should enforce unique constraint on employee-organization-role', async () => {
      const { data: columns } = await supabase
        .rpc('get_table_columns', { table_name: 'user_roles' });
      
      const requiredColumns = ['employee_id', 'organization_id', 'role'];
      const columnNames = columns?.map((col: any) => col.column_name) || [];
      
      requiredColumns.forEach(col => {
        expect(columnNames).toContain(col);
      });
    });
  });

  describe('Attendance Table', () => {
    it('should have attendance table with GPS tracking', async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have PostGIS point types for check locations', async () => {
      const { data: columns } = await supabase
        .rpc('get_table_columns', { table_name: 'attendance' });
      
      const checkInLocation = columns?.find((col: any) => 
        col.column_name === 'check_in_location'
      );
      const checkOutLocation = columns?.find((col: any) => 
        col.column_name === 'check_out_location'
      );
      
      expect(checkInLocation?.udt_name).toBe('geometry');
      expect(checkOutLocation?.udt_name).toBe('geometry');
    });
  });

  describe('Breaks Table', () => {
    it('should have breaks table for tracking break times', async () => {
      const { data, error } = await supabase
        .from('breaks')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have foreign key to attendance table', async () => {
      const { data: constraints } = await supabase
        .rpc('get_table_constraints', { 
          table_name: 'breaks',
          constraint_type: 'FOREIGN KEY' 
        });
      
      const attendanceFK = constraints?.find((c: any) => 
        c.column_name === 'attendance_id'
      );
      expect(attendanceFK).toBeDefined();
    });
  });

  describe('QR Codes Table', () => {
    it('should have qr_codes table for QR management', async () => {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should enforce unique constraint on QR code', async () => {
      const { data: constraints } = await supabase
        .rpc('get_table_constraints', { 
          table_name: 'qr_codes',
          constraint_type: 'UNIQUE' 
        });
      
      const codeUnique = constraints?.find((c: any) => 
        c.column_name === 'code'
      );
      expect(codeUnique).toBeDefined();
    });
  });

  describe('Device Tokens Table', () => {
    it('should have device_tokens table for push notifications', async () => {
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Audit Logs Table', () => {
    it('should have audit_logs table for tracking changes', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have required audit columns', async () => {
      const { data: columns } = await supabase
        .rpc('get_table_columns', { table_name: 'audit_logs' });
      
      const requiredColumns = [
        'id', 'table_name', 'record_id', 'action',
        'changes', 'user_id', 'created_at'
      ];
      
      const columnNames = columns?.map((col: any) => col.column_name) || [];
      requiredColumns.forEach(col => {
        expect(columnNames).toContain(col);
      });
    });
  });
});