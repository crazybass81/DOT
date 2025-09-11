const { createClient } = require('@supabase/supabase-js');
const client = createClient('https://mljyiuzetchtjudbcfvd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ');

async function testSignUp() {
  console.log('🔍 Testing Supabase auth signup...');
  
  const testEmail = 'test@gmail.com';
  const testPassword = 'Test123!@#';
  
  console.log('📧 Testing with email:', testEmail);
  
  const { data, error } = await client.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { name: 'Test User' }
    }
  });
  
  if (error) {
    console.error('❌ Signup error:', error.message);
  } else {
    console.log('✅ Signup result:', {
      user: data.user?.id,
      session: Boolean(data.session),
      needsVerification: !data.session
    });
    
    // 계정이 생성된 후 바로 다시 확인
    if (data.user) {
      console.log('🔍 Checking if user was created in database...');
      
      // 잠시 기다린 후 확인
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: profiles } = await client.from('profiles').select('*').eq('id', data.user.id);
      const { data: identities } = await client.from('unified_identities').select('*').eq('auth_user_id', data.user.id);
      
      console.log('📋 Profiles found:', profiles?.length || 0);
      console.log('📋 Unified identities found:', identities?.length || 0);
    }
  }
}

testSignUp().catch(console.error);