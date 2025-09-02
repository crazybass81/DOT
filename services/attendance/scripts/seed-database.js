/**
 * Script to seed database with test data
 * Run: node scripts/seed-database.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = 'https://mljyiuzetchtjudbcfvd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY0ODcwNSwiZXhwIjoyMDcyMjI0NzA1fQ.tX-kdlNi0iR4i0Y7VbS6rL8vzmY8wqhQ3LYrb0QmLYg';

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLFile(filePath) {
  try {
    // Read SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split SQL statements by semicolon (simple approach)
    // Note: This won't work for complex SQL with semicolons in strings
    const statements = sql
      .split(/;\s*$/gm)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📄 Executing ${statements.length} SQL statements from ${path.basename(filePath)}...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim().length <= 1) {
        continue;
      }

      // Execute statement
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement }).single();
      
      if (error) {
        // Try direct execution if RPC fails
        console.log(`   Statement ${i + 1}: Using direct execution...`);
        // For now, we'll skip errors as we can't execute raw SQL without RPC
        console.log(`   ⚠️  Skipping: Cannot execute raw SQL without RPC function`);
      } else {
        console.log(`   ✅ Statement ${i + 1} executed successfully`);
      }
    }
  } catch (error) {
    console.error(`❌ Error executing SQL file: ${error.message}`);
  }
}

async function seedDatabase() {
  console.log('🚀 Starting database seeding...\n');

  // Since we can't execute raw SQL directly, let's insert data using Supabase client
  console.log('📊 Creating test data using Supabase client...\n');

  try {
    // 1. Create test organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'DOT 테스트 회사',
        code: 'DOT-TEST',
        description: '테스트용 조직',
        is_active: true
      })
      .select()
      .single();

    if (orgError && !orgError.message.includes('duplicate')) {
      console.error('❌ Failed to create organization:', orgError.message);
    } else {
      console.log('✅ Test organization created/exists');
    }

    // 2. Create test branches
    const branches = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        organization_id: '11111111-1111-1111-1111-111111111111',
        name: '강남본사',
        code: 'TEST-GANGNAM',
        address: '서울시 강남구 테헤란로 123',
        latitude: 37.5665,
        longitude: 126.9780,
        geofence_radius: 100,
        is_active: true
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        organization_id: '11111111-1111-1111-1111-111111111111',
        name: '판교점',
        code: 'TEST-PANGYO',
        address: '경기도 성남시 판교역로 456',
        latitude: 37.3947,
        longitude: 127.1108,
        geofence_radius: 100,
        is_active: true
      }
    ];

    for (const branch of branches) {
      const { error } = await supabase.from('branches').upsert(branch);
      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ Failed to create branch ${branch.name}:`, error.message);
      }
    }
    console.log('✅ Test branches created/exist');

    // 3. Create test departments
    const departments = [
      {
        id: '55555555-5555-5555-5555-555555555555',
        organization_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222222',
        name: '영업팀',
        code: 'SALES',
        description: '영업 부서',
        is_active: true
      },
      {
        id: '66666666-6666-6666-6666-666666666666',
        organization_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222222',
        name: '관리팀',
        code: 'ADMIN',
        description: '관리 부서',
        is_active: true
      }
    ];

    for (const dept of departments) {
      const { error } = await supabase.from('departments').upsert(dept);
      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ Failed to create department ${dept.name}:`, error.message);
      }
    }
    console.log('✅ Test departments created/exist');

    // 4. Create test positions
    const positions = [
      {
        id: '77777777-7777-7777-7777-777777777777',
        organization_id: '11111111-1111-1111-1111-111111111111',
        department_id: '66666666-6666-6666-6666-666666666666',
        name: '대표이사',
        code: 'CEO',
        level: 10,
        description: '최고 경영자',
        is_active: true
      },
      {
        id: '88888888-8888-8888-8888-888888888888',
        organization_id: '11111111-1111-1111-1111-111111111111',
        department_id: '66666666-6666-6666-6666-666666666666',
        name: '팀장',
        code: 'MANAGER',
        level: 5,
        description: '팀 관리자',
        is_active: true
      },
      {
        id: '99999999-9999-9999-9999-999999999999',
        organization_id: '11111111-1111-1111-1111-111111111111',
        department_id: '55555555-5555-5555-5555-555555555555',
        name: '직원',
        code: 'EMPLOYEE',
        level: 1,
        description: '일반 직원',
        is_active: true
      }
    ];

    for (const position of positions) {
      const { error } = await supabase.from('positions').upsert(position);
      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ Failed to create position ${position.name}:`, error.message);
      }
    }
    console.log('✅ Test positions created/exist');

    // 5. Create test employees
    const employees = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        organization_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222222',
        department_id: '66666666-6666-6666-6666-666666666666',
        position_id: '77777777-7777-7777-7777-777777777777',
        employee_code: 'EMP-MASTER-001',
        name: '마스터 관리자',
        email: 'master.admin@dot-test.com',
        phone: '010-1111-1111',
        password_hash: '$2a$10$YourHashedPasswordHere',
        device_id: 'TEST-DEVICE-MASTER',
        approval_status: 'APPROVED',
        role: 'MASTER_ADMIN',
        is_master_admin: true,
        is_active: true,
        date_of_birth: '1980-01-01',
        join_date: '2024-01-01'
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        organization_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222222',
        department_id: '66666666-6666-6666-6666-666666666666',
        position_id: '88888888-8888-8888-8888-888888888888',
        employee_code: 'EMP-ADMIN-001',
        name: '조직 관리자',
        email: 'admin@dot-test.com',
        phone: '010-2222-2222',
        password_hash: '$2a$10$YourHashedPasswordHere',
        device_id: 'TEST-DEVICE-ADMIN',
        approval_status: 'APPROVED',
        role: 'ADMIN',
        is_master_admin: false,
        is_active: true,
        date_of_birth: '1985-05-15',
        join_date: '2024-01-15'
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        organization_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222222',
        department_id: '55555555-5555-5555-5555-555555555555',
        position_id: '88888888-8888-8888-8888-888888888888',
        employee_code: 'EMP-MGR-001',
        name: '지점 매니저',
        email: 'manager@gangnam.dot-test.com',
        phone: '010-3333-3333',
        password_hash: '$2a$10$YourHashedPasswordHere',
        device_id: 'TEST-DEVICE-MANAGER',
        approval_status: 'APPROVED',
        role: 'MANAGER',
        is_master_admin: false,
        is_active: true,
        date_of_birth: '1990-03-20',
        join_date: '2024-02-01'
      },
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        organization_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222222',
        department_id: '55555555-5555-5555-5555-555555555555',
        position_id: '99999999-9999-9999-9999-999999999999',
        employee_code: 'EMP-001',
        name: '김직원',
        email: 'employee1@dot-test.com',
        phone: '010-4444-4444',
        password_hash: '$2a$10$YourHashedPasswordHere',
        device_id: 'TEST-DEVICE-EMP1',
        approval_status: 'APPROVED',
        role: 'EMPLOYEE',
        is_master_admin: false,
        is_active: true,
        date_of_birth: '1995-07-10',
        join_date: '2024-03-01'
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        organization_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222222',
        department_id: '55555555-5555-5555-5555-555555555555',
        position_id: '99999999-9999-9999-9999-999999999999',
        employee_code: 'EMP-NEW-001',
        name: '박신입',
        email: 'newuser@dot-test.com',
        phone: '010-5555-5555',
        password_hash: '$2a$10$YourHashedPasswordHere',
        device_id: 'TEST-DEVICE-NEW',
        approval_status: 'PENDING',
        role: 'EMPLOYEE',
        is_master_admin: false,
        is_active: false,
        date_of_birth: '2000-12-25',
        join_date: null
      }
    ];

    for (const employee of employees) {
      const { error } = await supabase.from('employees').upsert(employee);
      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ Failed to create employee ${employee.name}:`, error.message);
      }
    }
    console.log('✅ Test employees created/exist');

    console.log('\n✨ Database seeding completed!');
    console.log('\n📋 Next step: Run create-test-users.js to create Supabase Auth users');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  }
}

// Run the seeding
seedDatabase().catch(console.error);