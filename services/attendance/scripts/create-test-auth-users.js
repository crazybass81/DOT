/**
 * Script to create test users using Supabase Auth signUp
 * Run: node scripts/create-test-auth-users.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://mljyiuzetchtjudbcfvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test users to create
const testUsers = [
  {
    email: 'master.admin@dot-test.com',
    password: 'MasterAdmin123!@#',
    options: {
      data: {
        name: '마스터 관리자',
        role: 'MASTER_ADMIN',
        employee_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      }
    }
  },
  {
    email: 'admin@dot-test.com',
    password: 'Admin123!@#',
    options: {
      data: {
        name: '조직 관리자',
        role: 'ADMIN',
        employee_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      }
    }
  },
  {
    email: 'manager@gangnam.dot-test.com',
    password: 'Manager123!@#',
    options: {
      data: {
        name: '지점 매니저',
        role: 'MANAGER',
        employee_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc'
      }
    }
  },
  {
    email: 'employee1@dot-test.com',
    password: 'Employee123!@#',
    options: {
      data: {
        name: '김직원',
        role: 'EMPLOYEE',
        employee_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd'
      }
    }
  },
  {
    email: 'newuser@dot-test.com',
    password: 'NewUser123!@#',
    options: {
      data: {
        name: '박신입',
        role: 'EMPLOYEE',
        employee_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
      }
    }
  }
];

async function createTestUsers() {
  console.log('🚀 Starting test user creation via signUp...\n');

  for (const user of testUsers) {
    try {
      // Try to sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: user.options
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          console.log(`⚠️  User ${user.email} already exists`);
          
          // Try to sign in to verify the account works
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: user.password
          });
          
          if (!signInError) {
            console.log(`   ✅ Verified: Can sign in successfully`);
          } else {
            console.log(`   ❌ Cannot sign in: ${signInError.message}`);
          }
        } else {
          console.error(`❌ Failed to create ${user.email}: ${error.message}`);
        }
      } else {
        console.log(`✅ Created user: ${user.email}`);
        if (data.user) {
          console.log(`   User ID: ${data.user.id}`);
          
          // Now update the employees table to link auth_user_id
          const { error: updateError } = await supabase
            .from('employees')
            .update({ auth_user_id: data.user.id })
            .eq('email', user.email);
            
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
    console.log(`${user.options.data.role.padEnd(15)} | ${user.email.padEnd(30)} | ${user.password}`);
  });
  console.log('=====================================');
  console.log('\n🔐 You can now log in with these credentials at http://localhost:3002');
}

// Run the script
createTestUsers().catch(console.error);