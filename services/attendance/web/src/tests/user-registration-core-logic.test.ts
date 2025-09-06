/**
 * User Registration Core Logic Test
 * Tests the actual user registration logic with Supabase
 */

import { describe, test, expect, afterEach } from '@jest/globals'
import { supabase } from '../lib/supabase-config'

describe('User Registration Core Logic (Real Data)', () => {
  const testUsers: string[] = []

  afterEach(async () => {
    console.log('🧹 Cleaning up test users...')
    
    // Clean up all created test users
    for (const email of testUsers) {
      try {
        // Find and delete from unified_identities
        const { data: identities } = await supabase
          .from('unified_identities')
          .select('*')
          .eq('email', email)
        
        if (identities && identities.length > 0) {
          // Also clean up auth users if they exist
          for (const identity of identities) {
            if (identity.auth_user_id) {
              try {
                await supabase.auth.admin.deleteUser(identity.auth_user_id)
                console.log(`✅ Cleaned up auth user for ${email}`)
              } catch (authError) {
                console.log(`⚠️ Auth cleanup warning for ${email}:`, authError)
              }
            }
          }
          
          await supabase
            .from('unified_identities')
            .delete()
            .eq('email', email)
          
          console.log(`✅ Cleaned up identity for ${email}`)
        }
      } catch (error: any) {
        console.log(`⚠️ Cleanup warning for ${email}:`, error.message)
      }
    }
  })

  test('Should create user with unified identity system', async () => {
    console.log('🧪 Testing unified identity user creation...')
    
    const testUser = {
      email: `unified-test-${Date.now()}@example.com`,
      password: 'UnifiedTest123!',
      fullName: 'Unified Test User',
      phone: '+82-10-1111-2222'
    }
    
    testUsers.push(testUser.email)

    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.fullName,
          phone: testUser.phone
        }
      }
    })

    expect(authError).toBeNull()
    expect(authData.user).toBeTruthy()
    
    console.log('✅ Auth user created:', authData.user?.id)

    // Step 2: Create unified identity record
    const { data: identityData, error: identityError } = await supabase
      .from('unified_identities')
      .insert({
        email: testUser.email,
        full_name: testUser.fullName,
        phone: testUser.phone,
        id_type: 'personal',
        auth_user_id: authData.user!.id,
        is_active: true,
        metadata: {
          registration_method: 'test',
          created_at: new Date().toISOString()
        },
        login_count: 0
      })
      .select()
      .single()

    expect(identityError).toBeNull()
    expect(identityData).toBeTruthy()
    expect(identityData.email).toBe(testUser.email)
    expect(identityData.full_name).toBe(testUser.fullName)
    expect(identityData.auth_user_id).toBe(authData.user!.id)
    
    console.log('✅ Unified identity created successfully')
    console.log(`   📧 Email: ${identityData.email}`)
    console.log(`   👤 Name: ${identityData.full_name}`)
    console.log(`   🆔 Identity ID: ${identityData.id}`)
    console.log(`   🔑 Auth User ID: ${identityData.auth_user_id}`)
  })

  test('Should prevent duplicate email registration', async () => {
    console.log('🧪 Testing duplicate email prevention...')
    
    const testUser = {
      email: `duplicate-unified-test-${Date.now()}@example.com`,
      password: 'DuplicateUnified123!',
      fullName: 'Duplicate Unified Test',
      phone: '+82-10-3333-4444'
    }
    
    testUsers.push(testUser.email)

    // First registration
    const { data: firstAuthData, error: firstAuthError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.fullName,
          phone: testUser.phone
        }
      }
    })

    expect(firstAuthError).toBeNull()
    expect(firstAuthData.user).toBeTruthy()
    
    const { data: firstIdentityData, error: firstIdentityError } = await supabase
      .from('unified_identities')
      .insert({
        email: testUser.email,
        full_name: testUser.fullName,
        phone: testUser.phone,
        id_type: 'personal',
        auth_user_id: firstAuthData.user!.id,
        is_active: true,
        metadata: {
          registration_method: 'test',
          created_at: new Date().toISOString()
        },
        login_count: 0
      })
      .select()
      .single()

    expect(firstIdentityError).toBeNull()
    console.log('✅ First registration successful')

    // Second registration attempt should fail
    const { data: secondAuthData, error: secondAuthError } = await supabase.auth.signUp({
      email: testUser.email,
      password: 'DifferentPassword123!',
      options: {
        data: {
          full_name: 'Different Name',
          phone: '+82-10-5555-6666'
        }
      }
    })

    // Supabase should prevent duplicate auth user creation
    expect(secondAuthError).toBeTruthy()
    console.log('✅ Duplicate prevention working')
    console.log(`   ❌ Auth Error: ${secondAuthError?.message}`)
  })

  test('Should validate email format and required fields', async () => {
    console.log('🧪 Testing validation logic...')

    // Test invalid email
    const invalidEmailUser = {
      email: 'invalid-email',
      password: 'ValidPass123!',
      fullName: 'Valid Name',
      phone: '+82-10-7777-8888'
    }

    const { data: invalidEmailData, error: invalidEmailError } = await supabase.auth.signUp({
      email: invalidEmailUser.email,
      password: invalidEmailUser.password,
      options: {
        data: {
          full_name: invalidEmailUser.fullName,
          phone: invalidEmailUser.phone
        }
      }
    })

    expect(invalidEmailError).toBeTruthy()
    console.log('✅ Email validation working')
    console.log(`   ❌ Invalid email error: ${invalidEmailError?.message}`)

    // Test weak password
    const weakPasswordUser = {
      email: `weak-pass-test-${Date.now()}@example.com`,
      password: '123',
      fullName: 'Weak Password User',
      phone: '+82-10-9999-0000'
    }

    const { data: weakPassData, error: weakPassError } = await supabase.auth.signUp({
      email: weakPasswordUser.email,
      password: weakPasswordUser.password,
      options: {
        data: {
          full_name: weakPasswordUser.fullName,
          phone: weakPasswordUser.phone
        }
      }
    })

    expect(weakPassError).toBeTruthy()
    console.log('✅ Password validation working')
    console.log(`   ❌ Weak password error: ${weakPassError?.message}`)
  })
})