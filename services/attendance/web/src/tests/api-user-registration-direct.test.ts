/**
 * Direct User Registration API Handler Test
 * Tests the API handler directly without HTTP routing
 */

import { describe, test, expect, afterEach } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { POST } from '../app/api/users/register/route'
import { supabase } from '../lib/supabase-config'

describe('User Registration API Handler (Direct)', () => {
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

  test('Should register new user successfully via direct handler', async () => {
    console.log('🧪 Testing direct user registration handler...')
    
    const testUser = {
      email: `direct-test-${Date.now()}@example.com`,
      password: 'DirectTest123!',
      fullName: 'Direct Test User',
      phone: '+82-10-9999-0000'
    }
    
    testUsers.push(testUser.email)

    // Create NextRequest mock
    const mockRequest = {
      json: async () => testUser,
      url: 'http://localhost:3002/api/users/register'
    } as NextRequest

    // Call the handler directly
    const response = await POST(mockRequest)
    const responseData = await response.json()
    
    console.log('Direct Handler Response Status:', response.status)
    console.log('Direct Handler Response Data:', responseData)

    expect(response.status).toBe(201)
    expect(responseData.success).toBe(true)
    expect(responseData.user).toBeDefined()
    expect(responseData.user.email).toBe(testUser.email)
    expect(responseData.user.fullName).toBe(testUser.fullName)
    
    console.log('✅ Direct user registration handler working correctly')
    console.log(`   📧 Email: ${responseData.user.email}`)
    console.log(`   👤 Name: ${responseData.user.fullName}`)
    console.log(`   🆔 ID: ${responseData.user.id}`)
  })

  test('Should validate required fields via direct handler', async () => {
    console.log('🧪 Testing direct validation...')
    
    const invalidUser = {
      email: '',
      password: '',
      fullName: ''
    }

    // Create NextRequest mock
    const mockRequest = {
      json: async () => invalidUser,
      url: 'http://localhost:3002/api/users/register'
    } as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()
    
    expect(response.status).toBe(400)
    expect(responseData.error).toBeDefined()
    
    console.log('✅ Direct validation working correctly')
    console.log(`   ❌ Error: ${responseData.error}`)
  })

  test('Should prevent duplicate email registration via direct handler', async () => {
    console.log('🧪 Testing direct duplicate email prevention...')
    
    const testUser = {
      email: `direct-duplicate-test-${Date.now()}@example.com`,
      password: 'DirectDuplicateTest123!',
      fullName: 'Direct Duplicate Test User',
      phone: '+82-10-8888-9999'
    }
    
    testUsers.push(testUser.email)

    // Create NextRequest mocks
    const mockRequest1 = {
      json: async () => testUser,
      url: 'http://localhost:3002/api/users/register'
    } as NextRequest
    
    const mockRequest2 = {
      json: async () => ({...testUser, fullName: 'Different Name'}),
      url: 'http://localhost:3002/api/users/register'
    } as NextRequest

    // First registration should succeed
    const firstResponse = await POST(mockRequest1)
    const firstData = await firstResponse.json()
    expect(firstResponse.status).toBe(201)
    expect(firstData.success).toBe(true)
    
    console.log('✅ First direct registration successful')

    // Second registration with same email should fail
    const secondResponse = await POST(mockRequest2)
    const secondData = await secondResponse.json()
    expect(secondResponse.status).toBe(400)
    expect(secondData.success).toBeFalsy()
    
    console.log('✅ Direct duplicate prevention working')
    console.log(`   ❌ Error: ${secondData.error}`)
  })
})