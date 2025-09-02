/**
 * Script to create test users in Supabase Auth
 * Run: node scripts/create-test-users.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://mljyiuzetchtjudbcfvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test users to create
const testUsers = [
  {
    email: 'master.admin@dot-test.com',
    password: 'MasterAdmin123!@#',
    user_metadata: {
      name: '마스터 관리자',
      role: 'MASTER_ADMIN',
      employee_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    }
  },
  {
    email: 'admin@dot-test.com',
    password: 'Admin123!@#',
    user_metadata: {
      name: '조직 관리자',
      role: 'ADMIN',
      employee_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    }
  },
  {
    email: 'manager@gangnam.dot-test.com',
    password: 'Manager123!@#',
    user_metadata: {
      name: '지점 매니저',
      role: 'MANAGER',
      employee_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    }
  },
  {
    email: 'employee1@dot-test.com',
    password: 'Employee123!@#',
    user_metadata: {
      name: '김직원',
      role: 'EMPLOYEE',
      employee_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd'
    }
  },
  {
    email: 'newuser@dot-test.com',
    password: 'NewUser123!@#',
    user_metadata: {
      name: '박신입',
      role: 'EMPLOYEE',
      employee_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    }
  }
];

async function createTestUsers() {
  console.log('🚀 Starting test user creation...\n');

  for (const user of testUsers) {
    try {
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: user.user_metadata
      });

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  User ${user.email} already exists`);
          
          // Update existing user's metadata
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingUser = users?.users?.find(u => u.email === user.email);
          
          if (existingUser) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              { user_metadata: user.user_metadata }
            );
            
            if (updateError) {
              console.error(`   Failed to update metadata: ${updateError.message}`);
            } else {
              console.log(`   ✅ Updated metadata for existing user`);
            }
          }
        } else {
          console.error(`❌ Failed to create ${user.email}: ${error.message}`);
        }
      } else {
        console.log(`✅ Created user: ${user.email}`);
        
        // Update the employees table with auth_user_id
        if (data.user) {
          const { error: updateError } = await supabase
            .from('employees')
            .update({ auth_user_id: data.user.id })
            .eq('id', user.user_metadata.employee_id);
            
          if (updateError) {
            console.error(`   Failed to link auth user: ${updateError.message}`);
          } else {
            console.log(`   ✅ Linked to employees table`);
          }
        }
      }
    } catch (err) {
      console.error(`❌ Error processing ${user.email}: ${err.message}`);
    }
  }

  console.log('\n✨ Test user creation completed!');
  console.log('\n📋 Test Accounts:');
  console.log('=====================================');
  testUsers.forEach(user => {
    console.log(`${user.user_metadata.role.padEnd(15)} | ${user.email.padEnd(30)} | ${user.password}`);
  });
  console.log('=====================================');
}

// Run the script
createTestUsers().catch(console.error);