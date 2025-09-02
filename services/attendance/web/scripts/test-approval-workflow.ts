#!/usr/bin/env npx tsx
/**
 * Test script for approval workflow
 * Tests the core approval workflow functionality
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TestEmployee {
  id?: string;
  name: string;
  email: string;
  phone: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

async function testApprovalWorkflow() {
  console.log('🧪 Testing Approval Workflow...\n');

  try {
    // Test 1: Create a test employee with PENDING status
    console.log('📝 Test 1: Creating test employee with PENDING status...');
    const testEmployee = {
      organization_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000002',
      department_id: '00000000-0000-0000-0000-000000000003',
      position_id: '00000000-0000-0000-0000-000000000004',
      name: 'Test Employee ' + Date.now(),
      email: `test${Date.now()}@example.com`,
      phone: '010-1234-5678',
      date_of_birth: '1990-01-01',
      approval_status: 'PENDING',
      role: 'EMPLOYEE',
      is_master_admin: false,
      is_active: false,
      device_id: 'test-device'
    };

    const { data: createdEmployee, error: createError } = await supabase
      .from('employees')
      .insert(testEmployee)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create employee: ${createError.message}`);
    }

    console.log('✅ Employee created successfully:', {
      id: createdEmployee.id,
      name: createdEmployee.name,
      status: createdEmployee.approval_status
    });

    // Test 2: Verify PENDING status query
    console.log('\n🔍 Test 2: Querying PENDING employees...');
    const { data: pendingEmployees, error: queryError } = await supabase
      .from('employees')
      .select('id, name, approval_status')
      .eq('approval_status', 'PENDING')
      .limit(5);

    if (queryError) {
      throw new Error(`Failed to query pending employees: ${queryError.message}`);
    }

    console.log('✅ Found', pendingEmployees?.length || 0, 'pending employees');
    if (pendingEmployees && pendingEmployees.length > 0) {
      pendingEmployees.forEach((emp, idx) => {
        console.log(`   ${idx + 1}. ${emp.name} (${emp.id}) - ${emp.approval_status}`);
      });
    }

    // Test 3: Approve the test employee
    console.log('\n✅ Test 3: Approving test employee...');
    const { data: approvedEmployee, error: approveError } = await supabase
      .from('employees')
      .update({
        approval_status: 'APPROVED',
        is_active: true,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', createdEmployee.id)
      .select()
      .single();

    if (approveError) {
      throw new Error(`Failed to approve employee: ${approveError.message}`);
    }

    console.log('✅ Employee approved successfully:', {
      id: approvedEmployee.id,
      name: approvedEmployee.name,
      status: approvedEmployee.approval_status,
      active: approvedEmployee.is_active
    });

    // Test 4: Test rejection workflow
    console.log('\n❌ Test 4: Testing rejection workflow...');
    
    // Create another test employee
    const testEmployee2 = {
      ...testEmployee,
      name: 'Test Reject Employee ' + Date.now(),
      email: `testreject${Date.now()}@example.com`
    };

    const { data: createdEmployee2, error: createError2 } = await supabase
      .from('employees')
      .insert(testEmployee2)
      .select()
      .single();

    if (createError2) {
      throw new Error(`Failed to create second employee: ${createError2.message}`);
    }

    // Reject the employee
    const { data: rejectedEmployee, error: rejectError } = await supabase
      .from('employees')
      .update({
        approval_status: 'REJECTED',
        is_active: false,
        rejected_at: new Date().toISOString(),
        rejection_reason: 'Test rejection - duplicate entry',
        updated_at: new Date().toISOString()
      })
      .eq('id', createdEmployee2.id)
      .select()
      .single();

    if (rejectError) {
      throw new Error(`Failed to reject employee: ${rejectError.message}`);
    }

    console.log('✅ Employee rejected successfully:', {
      id: rejectedEmployee.id,
      name: rejectedEmployee.name,
      status: rejectedEmployee.approval_status,
      reason: rejectedEmployee.rejection_reason
    });

    // Test 5: Query by approval status
    console.log('\n📊 Test 5: Status summary...');
    const { data: statusCounts } = await supabase
      .from('employees')
      .select('approval_status');

    if (statusCounts) {
      const counts = statusCounts.reduce((acc, emp) => {
        acc[emp.approval_status] = (acc[emp.approval_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📈 Approval Status Summary:');
      Object.entries(counts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} employees`);
      });
    }

    // Cleanup: Remove test employees
    console.log('\n🧹 Cleanup: Removing test employees...');
    const { error: cleanupError } = await supabase
      .from('employees')
      .delete()
      .in('id', [createdEmployee.id, createdEmployee2.id]);

    if (cleanupError) {
      console.warn('⚠️  Warning: Failed to cleanup test employees:', cleanupError.message);
    } else {
      console.log('✅ Test employees cleaned up successfully');
    }

    console.log('\n🎉 All tests passed! Approval workflow is working correctly.');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function testDatabaseConnection() {
  console.log('🔌 Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('count(*)', { count: 'exact' })
      .limit(1);

    if (error) {
      throw error;
    }

    console.log('✅ Database connection successful');
    console.log(`📊 Total employees in database: ${data?.[0]?.count || 0}`);
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  DOT Attendance - Approval Workflow Test');
  console.log('='.repeat(60));
  
  const isConnected = await testDatabaseConnection();
  
  if (!isConnected) {
    console.log('❌ Skipping workflow tests due to connection failure');
    process.exit(1);
  }
  
  console.log('');
  await testApprovalWorkflow();
  
  console.log('\n' + '='.repeat(60));
  console.log('  Test Complete');
  console.log('='.repeat(60));
}

// Run the test
main().catch(console.error);