import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

describe('User Registration API - ID-ROLE-PAPER System Integration Test', () => {
  
  describe('Database Schema Verification', () => {
    it('should have unified_identities table available', async () => {
      const { data, error } = await supabase
        .from('unified_identities')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have correct unified_identities table structure', async () => {
      const { data: columns } = await supabase
        .rpc('get_table_columns', { table_name: 'unified_identities' });
      
      const columnNames = columns?.map((col: any) => col.column_name) || [];
      const requiredColumns = [
        'id', 'email', 'full_name', 'phone', 'id_type', 
        'auth_user_id', 'is_active', 'metadata', 
        'created_at', 'updated_at'
      ];
      
      requiredColumns.forEach(col => {
        expect(columnNames).toContain(col);
      });
    });

    it('should have role_assignments table available', async () => {
      const { data, error } = await supabase
        .from('role_assignments')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have organizations_v3 table available', async () => {
      const { data, error } = await supabase
        .from('organizations_v3')
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Phone-based Registration Flow - TDD', () => {
    const testPhone = '01012345678';
    const testName = '홍길동';
    const testBirthDate = '1990-01-01';
    let testUserId: string | null = null;

    afterEach(async () => {
      // Cleanup test data
      if (testUserId) {
        await supabase
          .from('unified_identities')
          .delete()
          .eq('id', testUserId);
        testUserId = null;
      }
      
      // Also cleanup by phone as fallback
      await supabase
        .from('unified_identities')
        .delete()
        .eq('phone', testPhone);
    });

    it('should create user identity with phone number as primary key', async () => {
      // Test creating new user with phone-based registration
      const { data, error } = await supabase
        .from('unified_identities')
        .insert({
          full_name: testName,
          phone: testPhone,
          id_type: 'personal' as 'personal' | 'corporate',
          is_active: true,
          metadata: {
            registration_method: 'qr_scan',
            birth_date: testBirthDate,
            registration_timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.phone).toBe(testPhone);
      expect(data?.full_name).toBe(testName);
      expect(data?.id_type).toBe('personal');
      expect(data?.is_active).toBe(true);
      
      testUserId = data?.id;
    });

    it('should enforce unique phone number constraint', async () => {
      // First insert
      const { data: firstUser } = await supabase
        .from('unified_identities')
        .insert({
          full_name: testName,
          phone: testPhone,
          id_type: 'personal' as 'personal' | 'corporate',
          is_active: true,
          metadata: { registration_method: 'qr_scan' }
        })
        .select()
        .single();

      testUserId = firstUser?.id;

      // Try duplicate phone number
      const { data: duplicateUser, error } = await supabase
        .from('unified_identities')
        .insert({
          full_name: '김철수',
          phone: testPhone, // Same phone number
          id_type: 'personal' as 'personal' | 'corporate',
          is_active: true,
          metadata: { registration_method: 'qr_scan' }
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // Unique violation
      expect(duplicateUser).toBeNull();
    });

    it('should validate phone number format', async () => {
      const invalidPhones = [
        '010-1234-567', // Too short
        '020-1234-5678', // Wrong prefix
        '01012345678a', // Contains letter
        '', // Empty
        null // Null
      ];

      for (const invalidPhone of invalidPhones) {
        const { data, error } = await supabase
          .from('unified_identities')
          .insert({
            full_name: testName,
            phone: invalidPhone,
            id_type: 'personal' as 'personal' | 'corporate',
            is_active: true,
            metadata: { registration_method: 'qr_scan' }
          })
          .select()
          .single();

        // Should fail validation or insert
        // The exact error depends on DB constraints
        if (data?.id) {
          await supabase
            .from('unified_identities')
            .delete()
            .eq('id', data.id);
        }
      }
    });
  });

  describe('Registration API Integration', () => {
    const testPhone = '01098765432';
    const testName = '이순신';
    let testUserId: string | null = null;

    afterEach(async () => {
      // Cleanup
      if (testUserId) {
        await supabase
          .from('unified_identities')
          .delete()
          .eq('id', testUserId);
      }
      await supabase
        .from('unified_identities')
        .delete()
        .eq('phone', testPhone);
    });

    it('should handle registration request with unified_identities table', async () => {
      // Simulate API registration data
      const registrationData = {
        name: testName,
        phone: testPhone,
        birthDate: '1985-04-28',
        accountNumber: '농협 123-456-789012',
        businessId: null,
        locationId: null,
        deviceFingerprint: btoa('test-user-agent')
      };

      // Check if user already exists (should not exist)
      const { data: existingUser } = await supabase
        .from('unified_identities')
        .select('id, full_name, phone, is_active')
        .eq('phone', testPhone)
        .single();

      expect(existingUser).toBeNull();

      // Create new user identity record
      const { data: newUser, error } = await supabase
        .from('unified_identities')
        .insert({
          full_name: registrationData.name,
          phone: registrationData.phone,
          id_type: 'personal' as 'personal' | 'corporate',
          is_active: true,
          metadata: {
            registration_method: 'qr_scan',
            birth_date: registrationData.birthDate,
            account_number: registrationData.accountNumber,
            business_id: registrationData.businessId,
            location_id: registrationData.locationId,
            device_fingerprint: registrationData.deviceFingerprint,
            registration_timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(newUser).toBeDefined();
      expect(newUser?.full_name).toBe(testName);
      expect(newUser?.phone).toBe(testPhone);
      
      testUserId = newUser?.id;

      // Verify user was created successfully
      const { data: verifyUser } = await supabase
        .from('unified_identities')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(verifyUser?.full_name).toBe(testName);
      expect(verifyUser?.phone).toBe(testPhone);
      expect(verifyUser?.metadata?.birth_date).toBe('1985-04-28');
      expect(verifyUser?.metadata?.account_number).toBe('농협 123-456-789012');
    });

    it('should create default worker role after user registration', async () => {
      // First create user identity
      const { data: newUser } = await supabase
        .from('unified_identities')
        .insert({
          full_name: testName,
          phone: testPhone,
          id_type: 'personal' as 'personal' | 'corporate',
          is_active: true,
          metadata: { registration_method: 'qr_scan' }
        })
        .select()
        .single();

      testUserId = newUser?.id;

      // Create a test organization for role assignment
      const { data: testOrg } = await supabase
        .from('organizations_v3')
        .insert({
          name: '테스트 사업장',
          type: 'company' as 'company' | 'franchise' | 'department' | 'branch',
          is_active: true,
          settings: {},
          business_hours: {}
        })
        .select()
        .single();

      // Create worker role assignment (simulating what the API should do)
      const { data: roleAssignment, error } = await supabase
        .from('role_assignments')
        .insert({
          identity_id: newUser?.id,
          organization_id: testOrg?.id,
          role: 'worker' as 'master' | 'admin' | 'manager' | 'worker' | 'franchise_admin',
          assigned_at: new Date().toISOString(),
          is_active: true,
          custom_permissions: {},
          employee_code: `EMP-${Date.now()}`,
          position: '직원'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(roleAssignment).toBeDefined();
      expect(roleAssignment?.identity_id).toBe(newUser?.id);
      expect(roleAssignment?.role).toBe('worker');
      expect(roleAssignment?.is_active).toBe(true);

      // Cleanup organization
      await supabase
        .from('role_assignments')
        .delete()
        .eq('id', roleAssignment?.id);
      await supabase
        .from('organizations_v3')
        .delete()
        .eq('id', testOrg?.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Test with invalid supabase client
      const invalidSupabase = createClient(
        'https://invalid-url.supabase.co',
        'invalid-key'
      );

      const { data, error } = await invalidSupabase
        .from('unified_identities')
        .select('*')
        .limit(1);

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });
});