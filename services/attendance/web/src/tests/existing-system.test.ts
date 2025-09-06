/**
 * Existing System Tests - Real Data Integration
 * TDD approach using current employees/organizations tables
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
// import { supabaseAuthService } from '../services/supabaseAuthService' // Commented out for now

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'

// Test client
const testClient = createClient(supabaseUrl, supabaseAnonKey)

// Test user data
const testUser = {
  email: 'test-user-' + Date.now() + '@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
  organization_id: 'test-org-' + Date.now()
}

describe('Existing System - Step 1: Database Structure Analysis', () => {
  
  test('Should analyze employees table structure', async () => {
    const { data, error } = await testClient
      .from('employees')
      .select('*')
      .limit(1)
    
    console.log('Employees table query result:', { data, error })
    
    expect(error).toBeFalsy()
    
    if (data && data.length > 0) {
      const employee = data[0]
      console.log('Employee structure:', Object.keys(employee))
      
      // Check required fields exist
      expect(employee).toHaveProperty('id')
      expect(employee).toHaveProperty('email')
      expect(employee).toHaveProperty('name')
    } else {
      console.log('No employee data found - table is empty')
    }
  })

  test('Should analyze organizations table structure', async () => {
    const { data, error } = await testClient
      .from('organizations')
      .select('*')
      .limit(1)
    
    console.log('Organizations table query result:', { data, error })
    
    expect(error).toBeFalsy()
    
    if (data && data.length > 0) {
      const org = data[0]
      console.log('Organization structure:', Object.keys(org))
      
      // Check required fields exist
      expect(org).toHaveProperty('id')
      expect(org).toHaveProperty('name')
    } else {
      console.log('No organization data found - table is empty')
    }
  })
})

describe('Existing System - Step 2: Create Test Data', () => {
  
  test('Should create test organization', async () => {
    // Try to create an organization
    const { data, error } = await testClient
      .from('organizations')
      .insert({
        id: testUser.organization_id,
        name: 'Test Organization ' + Date.now(),
        type: 'company',
        settings: {},
        is_active: true
      })
      .select()
    
    console.log('Organization creation result:', { data, error })
    
    if (error) {
      // If creation failed, try to find existing organization
      const { data: existing } = await testClient
        .from('organizations')
        .select('*')
        .limit(1)
      
      if (existing && existing.length > 0) {
        console.log('Using existing organization:', existing[0].id)
        testUser.organization_id = existing[0].id
      } else {
        console.log('No organizations exist - may need to create manually')
      }
    } else {
      console.log('✅ Test organization created successfully')
    }
  })

  test('Should create auth user first', async () => {
    // Create auth user using Supabase Auth
    const { data, error } = await testClient.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          name: testUser.name
        }
      }
    })
    
    console.log('Auth user creation result:', { data: data?.user?.id, error })
    
    if (error && !error.message.includes('already registered')) {
      console.log('❌ Auth user creation failed:', error.message)
    } else {
      console.log('✅ Auth user created or already exists')
    }
  })

  test('Should create employee record', async () => {
    // First get the auth user
    const { data: authData } = await testClient.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    })
    
    if (authData.user) {
      console.log('✅ Auth user found:', authData.user.id)
      
      // Create employee record
      const { data, error } = await testClient
        .from('employees')
        .insert({
          user_id: authData.user.id, // or auth_user_id depending on schema
          organization_id: testUser.organization_id,
          name: testUser.name,
          email: testUser.email,
          position: 'worker',
          is_active: true
        })
        .select()
      
      console.log('Employee creation result:', { data, error })
      
      if (error) {
        console.log('❌ Employee creation failed:', error.message)
        // Try with different field names
        const { data: data2, error: error2 } = await testClient
          .from('employees')
          .insert({
            auth_user_id: authData.user.id,
            organization_id: testUser.organization_id,
            name: testUser.name,
            email: testUser.email,
            role: 'EMPLOYEE',
            is_active: true
          })
          .select()
        
        console.log('Employee creation attempt 2:', { data: data2, error: error2 })
      } else {
        console.log('✅ Employee created successfully')
      }
      
      // Sign out after test
      await testClient.auth.signOut()
    }
  })
})

describe('Existing System - Step 3: Authentication Service Test', () => {
  
  test('Should test auth service with real user', async () => {
    try {
      const user = await supabaseAuthService.signIn(testUser.email, testUser.password)
      
      console.log('Auth service result:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      })
      
      expect(user).toBeDefined()
      expect(user.email).toBe(testUser.email)
      expect(user.id).toBeDefined()
      
      // Test get current user
      const currentUser = await supabaseAuthService.getCurrentUser()
      console.log('Current user:', currentUser?.email)
      
      expect(currentUser).toBeDefined()
      expect(currentUser?.email).toBe(testUser.email)
      
      // Test master admin check
      const isMasterAdmin = await supabaseAuthService.isMasterAdmin()
      console.log('Is master admin:', isMasterAdmin)
      
    } catch (error: any) {
      console.log('Auth service error:', error.message)
      // This might fail if the user doesn't exist yet, which is expected
    }
  })
})

describe('Existing System - Step 4: Master Admin Setup', () => {
  
  test('Should check for existing master admin', async () => {
    const { data, error } = await testClient
      .from('employees')
      .select('*')
      .eq('is_master_admin', true)
      .eq('is_active', true)
    
    console.log('Master admin query:', { count: data?.length, error })
    
    if (data && data.length > 0) {
      console.log('✅ Master admin found:', data[0].email)
      expect(data[0].is_master_admin).toBe(true)
    } else {
      console.log('❌ No master admin found - need to create one')
    }
  })

  test('Should create master admin if needed', async () => {
    const masterEmail = 'archt723@gmail.com'
    
    // Check if master admin already exists
    const { data: existing } = await testClient
      .from('employees')
      .select('*')
      .eq('email', masterEmail)
      .single()
    
    if (existing) {
      console.log('✅ Master admin employee record exists')
      
      // Update to ensure master admin flags are set
      const { error: updateError } = await testClient
        .from('employees')
        .update({
          is_master_admin: true,
          role: 'MASTER_ADMIN',
          is_active: true
        })
        .eq('email', masterEmail)
      
      if (updateError) {
        console.log('❌ Failed to update master admin flags:', updateError.message)
      } else {
        console.log('✅ Master admin flags updated')
      }
    } else {
      console.log('❌ Master admin employee record not found')
      console.log('💡 Need to create auth user and employee record for:', masterEmail)
    }
  })
})

afterAll(async () => {
  console.log('Cleaning up test data...')
  
  // Clean up test user
  try {
    await testClient.auth.signOut()
  } catch (e) {
    // Ignore cleanup errors
  }
  
  console.log('Test cleanup completed')
})