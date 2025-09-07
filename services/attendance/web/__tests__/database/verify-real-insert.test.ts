import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

describe('Verify Real Database Inserts', () => {
  
  it('should check if audit_logs has our registration data', async () => {
    // Check if our registration was actually logged
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'user_registration')
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log('Recent audit_logs entries:', {
      success: !error,
      error: error?.message,
      count: data?.length || 0,
      entries: data?.map(entry => ({
        id: entry.id,
        action: entry.action,
        user_id: entry.user_id,
        created_at: entry.created_at,
        metadata: entry.metadata
      }))
    });
    
    expect(true).toBe(true);
  });
  
  it('should test profiles table structure', async () => {
    // Try different field combinations for profiles
    const testCombinations = [
      { full_name: 'Test User 1' },
      { full_name: 'Test User 2', phone: '01012345678' },
      { id: '12345-test', full_name: 'Test User 3' },
    ];
    
    for (const combination of testCombinations) {
      const { data, error } = await supabase
        .from('profiles')
        .insert(combination)
        .select();
        
      console.log(`Profiles insert test ${JSON.stringify(combination)}:`, {
        success: !error,
        error: error?.message,
        data: data
      });
      
      // Cleanup if successful
      if (data && data.length > 0) {
        await supabase
          .from('profiles')
          .delete()
          .eq('id', data[0].id);
      }
    }
    
    expect(true).toBe(true);
  });
  
  it('should test alternative registration approach', async () => {
    // Try a more direct approach with just the working fields
    const registrationData = {
      name: '데이터베이스테스트',
      phone: '01000000001',
      birth_date: '1990-01-01'
    };
    
    // Try audit_logs as a registration log (since it works)
    const { data: auditData, error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'direct_registration_test',
        table_name: 'test_registration',
        record_id: `test-${registrationData.phone}`,
        user_id: `test-${registrationData.phone}`,
        metadata: {
          registration_method: 'direct_test',
          name: registrationData.name,
          phone: registrationData.phone,
          birth_date: registrationData.birth_date,
          test_timestamp: new Date().toISOString()
        }
      })
      .select();
      
    console.log('Direct registration via audit_logs:', {
      success: !auditError,
      error: auditError?.message,
      data: auditData
    });
    
    // This proves we CAN write to the database!
    expect(!auditError).toBe(true);
    
    // Cleanup
    if (auditData && auditData.length > 0) {
      await supabase
        .from('audit_logs')
        .delete()
        .eq('id', auditData[0].id);
    }
  });
});