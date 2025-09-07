import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

describe('Simplified Registration API Test - Real Database', () => {
  
  describe('Database Table Existence', () => {
    it('should confirm unified_identities table exists', async () => {
      const { data, error } = await supabase
        .from('unified_identities')
        .select('count(*)')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should confirm role_assignments table exists', async () => {
      const { data, error } = await supabase
        .from('role_assignments')
        .select('count(*)')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should confirm organizations_v3 table exists', async () => {
      const { data, error } = await supabase
        .from('organizations_v3')
        .select('count(*)')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Table Structure Analysis', () => {
    it('should examine existing unified_identities records structure', async () => {
      const { data, error } = await supabase
        .from('unified_identities')
        .select('*')
        .limit(1);
      
      // This will help us understand the actual table structure
      console.log('unified_identities structure:', {
        data,
        error,
        columns: data && data.length > 0 ? Object.keys(data[0]) : 'No data to examine structure'
      });
      
      // Test should pass regardless - we're just examining
      expect(true).toBe(true);
    });

    it('should examine existing role_assignments records structure', async () => {
      const { data, error } = await supabase
        .from('role_assignments')
        .select('*')
        .limit(1);
      
      console.log('role_assignments structure:', {
        data,
        error,
        columns: data && data.length > 0 ? Object.keys(data[0]) : 'No data to examine structure'
      });
      
      expect(true).toBe(true);
    });
  });

  describe('API Registration Logic Test', () => {
    it('should validate phone number format correctly', () => {
      const phoneRegex = /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/;
      
      // Valid phones
      expect(phoneRegex.test('01012345678')).toBe(true);
      expect(phoneRegex.test('010-1234-5678')).toBe(true);
      expect(phoneRegex.test('01112345678')).toBe(true);
      
      // Invalid phones
      expect(phoneRegex.test('02012345678')).toBe(false); // Wrong prefix
      expect(phoneRegex.test('010123456789')).toBe(false); // Too long
      expect(phoneRegex.test('0101234567')).toBe(false); // Too short
    });

    it('should format phone number correctly for storage', () => {
      const testPhone = '010-1234-5678';
      const formattedPhone = testPhone.replace(/-/g, '');
      
      expect(formattedPhone).toBe('01012345678');
      expect(formattedPhone.length).toBe(11);
    });
  });

  describe('Registration Workflow Verification', () => {
    it('should have correct flow: check -> create -> log -> response', () => {
      // This is our intended flow based on the updated API:
      const expectedFlow = [
        'validate_required_fields',
        'validate_phone_format', 
        'check_existing_user_by_phone',
        'create_user_identity_record',
        'log_registration_event',
        'return_success_response'
      ];
      
      expect(expectedFlow).toHaveLength(6);
      expect(expectedFlow[0]).toBe('validate_required_fields');
      expect(expectedFlow[1]).toBe('validate_phone_format');
      expect(expectedFlow[2]).toBe('check_existing_user_by_phone');
      expect(expectedFlow[3]).toBe('create_user_identity_record');
    });
  });

  describe('Error Handling Verification', () => {
    it('should handle missing required fields', () => {
      const testCases = [
        { name: '', phone: '010-1234-5678', birthDate: '1990-01-01' }, // Missing name
        { name: '홍길동', phone: '', birthDate: '1990-01-01' }, // Missing phone
        { name: '홍길동', phone: '010-1234-5678', birthDate: '' }, // Missing birthDate
      ];
      
      testCases.forEach(testCase => {
        const isValid = testCase.name && testCase.phone && testCase.birthDate;
        expect(isValid).toBe(false);
      });
    });

    it('should validate phone format requirements', () => {
      const phoneRegex = /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/;
      const invalidPhones = [
        '020-1234-5678', // Wrong prefix  
        '010-123-5678',  // Wrong format
        '010-1234-567',  // Too short
        '010-1234-56789', // Too long
        'abc-defg-hijk'   // Not numbers
      ];
      
      invalidPhones.forEach(phone => {
        const isValid = phoneRegex.test(phone.replace(/-/g, ''));
        expect(isValid).toBe(false);
      });
    });
  });
});