/**
 * Script to confirm test users and test login
 * Since we can't auto-confirm without service role key,
 * we'll create new users with a different approach
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://mljyiuzetchtjudbcfvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('📧 Email Confirmation Required');
console.log('================================\n');
console.log('The test users have been created but require email confirmation.');
console.log('Since we cannot auto-confirm without the service role key,');
console.log('you have two options:\n');
console.log('Option 1: Check the email addresses for confirmation links');
console.log('Option 2: Use the Supabase Dashboard to manually confirm users\n');
console.log('Created Test Accounts:');
console.log('---------------------');
console.log('1. master.admin@gmail.com (Password: MasterAdmin123!@#)');
console.log('2. manager.gangnam@gmail.com (Password: Manager123!@#)');
console.log('3. employee.kim2025@gmail.com (Password: Employee123!@#)');
console.log('4. newuser.park2025@gmail.com (Password: NewUser123!@#)\n');
console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/mljyiuzetchtjudbcfvd');
console.log('   Go to: Authentication → Users → Click on user → Confirm Email\n');

// Alternative: Try to create a magic link for passwordless login
async function createMagicLinks() {
  console.log('🔮 Attempting to create magic links for testing...\n');
  
  const testEmails = [
    'master.admin@gmail.com',
    'manager.gangnam@gmail.com',
    'employee.kim2025@gmail.com'
  ];
  
  for (const email of testEmails) {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        }
      });
      
      if (error) {
        console.log(`❌ Could not create magic link for ${email}: ${error.message}`);
      } else {
        console.log(`📧 Magic link sent to ${email} (check email)`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }
}

// For testing purposes, let's also create a simple test user that might work
async function createSimpleTestUser() {
  console.log('\n🧪 Creating a simple test user for immediate testing...\n');
  
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Test User',
          role: 'EMPLOYEE',
          skip_confirmation: true // This might work depending on Supabase settings
        }
      }
    });
    
    if (error) {
      console.log(`❌ Could not create test user: ${error.message}`);
    } else {
      console.log(`✅ Test user created:`);
      console.log(`   Email: ${testEmail}`);
      console.log(`   Password: ${testPassword}`);
      console.log(`   Try logging in with these credentials\n`);
      
      // Try to login immediately
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (loginError) {
        console.log(`   ⚠️  Login test: ${loginError.message}`);
      } else {
        console.log(`   ✅ Login successful! User can login immediately.`);
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

// Run functions
(async () => {
  await createMagicLinks();
  await createSimpleTestUser();
})();