/**
 * User Registration API Test
 * Tests the /api/users/register endpoint with real data
 */

import { describe, test, expect, afterAll } from '@jest/globals'
import { supabase } from '../lib/supabase-config'

describe('User Registration API', () => {
  const testUsers: string[] = []

  afterAll(async () => {
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

  test('Should register new user successfully', async () => {
    console.log('🧪 Testing user registration API...')
    
    const testUser = {
      email: `api-test-${Date.now()}@example.com`,
      password: 'ApiTest123!',
      fullName: 'API Test User',
      phone: '+82-10-5555-6666'
    }
    
    testUsers.push(testUser.email)

    const response = await fetch('http://localhost:3002/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    })

    const responseData = await response.json()
    
    console.log('API Response Status:', response.status)
    console.log('API Response Data:', responseData)

    expect(response.status).toBe(201)
    expect(responseData.success).toBe(true)
    expect(responseData.user).toBeDefined()
    expect(responseData.user.email).toBe(testUser.email)
    expect(responseData.user.fullName).toBe(testUser.fullName)
    
    console.log('✅ User registration API working correctly')
    console.log(`   📧 Email: ${responseData.user.email}`)
    console.log(`   👤 Name: ${responseData.user.fullName}`)
    console.log(`   🆔 ID: ${responseData.user.id}`)
  })

  test('Should validate required fields', async () => {
    console.log('🧪 Testing validation...')
    
    const invalidUser = {
      email: '',
      password: '',
      fullName: ''
    }

    const response = await fetch('http://localhost:3002/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidUser)
    })

    const responseData = await response.json()
    
    expect(response.status).toBe(400)
    expect(responseData.error).toBeDefined()
    
    console.log('✅ Validation working correctly')
    console.log(`   ❌ Error: ${responseData.error}`)
  })

  test('Should prevent duplicate email registration', async () => {
    console.log('🧪 Testing duplicate email prevention...')
    
    const testUser = {
      email: `duplicate-test-${Date.now()}@example.com`,
      password: 'DuplicateTest123!',
      fullName: 'Duplicate Test User',
      phone: '+82-10-7777-8888'
    }
    
    testUsers.push(testUser.email)

    // First registration should succeed
    const firstResponse = await fetch('http://localhost:3002/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    })

    const firstData = await firstResponse.json()
    expect(firstResponse.status).toBe(201)
    expect(firstData.success).toBe(true)
    
    console.log('✅ First registration successful')

    // Second registration with same email should fail
    const secondResponse = await fetch('http://localhost:3002/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...testUser,
        fullName: 'Different Name'
      })
    })

    const secondData = await secondResponse.json()
    expect(secondResponse.status).toBe(400)
    expect(secondData.success).toBeFalsy()
    
    console.log('✅ Duplicate prevention working')
    console.log(`   ❌ Error: ${secondData.error}`)
  })
})