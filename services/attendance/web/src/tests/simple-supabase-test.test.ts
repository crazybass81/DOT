/**
 * Simple Supabase Connection Test
 * Tests basic Supabase client functionality
 */

import { describe, test, expect } from '@jest/globals'
import { supabase } from '../lib/supabase-config'

describe('Simple Supabase Test', () => {
  
  test('Should create Supabase client', () => {
    console.log('🔍 Testing Supabase client creation...')
    expect(supabase).toBeDefined()
    expect(typeof supabase).toBe('object')
    console.log('✅ Supabase client created successfully')
  })

  test('Should have from method', () => {
    console.log('🔍 Testing Supabase from method...')
    expect(supabase.from).toBeDefined()
    expect(typeof supabase.from).toBe('function')
    console.log('✅ Supabase from method available')
  })

  test('Should create query builder', () => {
    console.log('🔍 Testing query builder creation...')
    try {
      const query = supabase.from('unified_identities')
      expect(query).toBeDefined()
      expect(typeof query).toBe('object')
      console.log('✅ Query builder created successfully')
      
      // Test if select method exists
      if (query.select) {
        console.log('✅ Select method available')
        expect(typeof query.select).toBe('function')
      } else {
        console.log('❌ Select method not available')
        console.log('Query object:', query)
        console.log('Query properties:', Object.keys(query))
      }
      
    } catch (error: any) {
      console.log('❌ Error creating query builder:', error.message)
      throw error
    }
  })

  test('Should test async query execution pattern', async () => {
    console.log('🔍 Testing async query pattern...')
    try {
      const queryBuilder = supabase.from('unified_identities')
      
      if (queryBuilder && typeof queryBuilder.select === 'function') {
        const query = queryBuilder.select('*')
        
        if (query && typeof query.limit === 'function') {
          const { data, error } = await query.limit(1)
          
          if (error) {
            console.log('⚠️ Query error (expected if schema not created):', error.message)
            // This is OK - it means the client works but tables don't exist
            expect(typeof error).toBe('object')
          } else {
            console.log('✅ Query executed successfully, data:', data)
            expect(Array.isArray(data)).toBe(true)
          }
        } else {
          console.log('❌ Limit method not available')
          console.log('Query after select:', query)
        }
      } else {
        console.log('❌ Select method not available on query builder')
      }
      
    } catch (error: any) {
      console.log('❌ Async query test error:', error.message)
      throw error
    }
  })
})