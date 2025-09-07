import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

describe('Real Database Structure Inspection', () => {
  
  describe('Check Actual Tables and Permissions', () => {
    it('should list all available tables', async () => {
      // Try to access different table variations to see what exists
      const tablesToCheck = [
        'unified_identities',
        'role_assignments', 
        'organizations_v3',
        'profiles',
        'users',
        'employees'
      ];
      
      for (const tableName of tablesToCheck) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        console.log(`Table ${tableName}:`, {
          exists: !error,
          error: error?.message,
          hasData: data && data.length > 0
        });
      }
      
      expect(true).toBe(true); // Always pass, we're just inspecting
    });
    
    it('should try to insert into unified_identities with minimal data', async () => {
      const testData = {
        email: 'test-unique@example.com',
        full_name: 'Database Test User'
      };
      
      const { data, error } = await supabase
        .from('unified_identities')
        .insert(testData)
        .select();
        
      console.log('Minimal insert test:', {
        success: !error,
        error: error?.message,
        data: data
      });
      
      // Cleanup if successful
      if (data && data.length > 0) {
        await supabase
          .from('unified_identities')
          .delete()
          .eq('id', data[0].id);
      }
      
      expect(true).toBe(true);
    });
    
    it('should check auth.users table accessibility', async () => {
      // Check if we can access the auth schema
      const { data, error } = await supabase
        .from('auth.users')
        .select('*')
        .limit(1);
        
      console.log('auth.users access:', {
        accessible: !error,
        error: error?.message
      });
      
      expect(true).toBe(true);
    });
  });
  
  describe('Test Auth Flow', () => {
    it('should test Supabase Auth user creation', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!';
      
      // Try to create a user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Auth Test User',
            phone: '01012345678'
          }
        }
      });
      
      console.log('Auth signup test:', {
        success: !error,
        error: error?.message,
        user: data?.user ? {
          id: data.user.id,
          email: data.user.email,
          confirmed: data.user.email_confirmed_at !== null
        } : null
      });
      
      // Cleanup if successful
      if (data?.user?.id) {
        try {
          await supabase.auth.admin.deleteUser(data.user.id);
        } catch (cleanupError) {
          console.log('Cleanup error (expected):', cleanupError);
        }
      }
      
      expect(true).toBe(true);
    });
  });
});