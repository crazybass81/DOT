/**
 * Script to test login functionality
 * Run: node scripts/test-login.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://mljyiuzetchtjudbcfvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test accounts to verify
const testAccounts = [
  { email: 'master.admin@gmail.com', password: 'MasterAdmin123!@#', role: 'MASTER_ADMIN' },
  { email: 'manager.gangnam@gmail.com', password: 'Manager123!@#', role: 'MANAGER' },
  { email: 'employee.kim2025@gmail.com', password: 'Employee123!@#', role: 'EMPLOYEE' },
];

async function testLogin() {
  console.log('🔐 Testing login functionality...\n');

  for (const account of testAccounts) {
    try {
      console.log(`Testing ${account.role}: ${account.email}`);
      
      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password
      });

      if (error) {
        console.error(`   ❌ Login failed: ${error.message}`);
      } else if (data.user) {
        console.log(`   ✅ Login successful!`);
        console.log(`      User ID: ${data.user.id}`);
        console.log(`      Email: ${data.user.email}`);
        console.log(`      Created: ${new Date(data.user.created_at).toLocaleDateString()}`);
        
        // Check if we have a session token
        if (data.session) {
          console.log(`      Session: Valid (expires in ${Math.round((new Date(data.session.expires_at) - new Date()) / 3600000)} hours)`);
        }
        
        // Sign out for next test
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
    
    console.log('');
  }

  console.log('✨ Login testing completed!');
  console.log('\n📱 You can now use these accounts to log in at:');
  console.log('   Web App: http://localhost:3002/login');
  console.log('   Master Admin: http://localhost:3002/master-admin/login');
}

// Run the test
testLogin().catch(console.error);