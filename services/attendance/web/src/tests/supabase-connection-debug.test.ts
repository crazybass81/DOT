/**
 * Supabase Connection Debug Test
 * Debug what's happening with the Supabase client in tests
 */

import { describe, test, expect } from '@jest/globals'
import { supabase } from '../lib/supabase-config'

describe('Supabase Connection Debug', () => {
  test('Should debug supabase client structure', () => {
    console.log('🔍 Supabase client:', typeof supabase)
    console.log('🔍 Supabase auth:', typeof supabase.auth)
    console.log('🔍 Supabase auth.signUp:', typeof supabase.auth.signUp)
    console.log('🔍 Supabase from method:', typeof supabase.from)
    
    expect(supabase).toBeTruthy()
    expect(supabase.auth).toBeTruthy()
    expect(typeof supabase.auth.signUp).toBe('function')
  })

  test('Should test basic from query', async () => {
    console.log('🧪 Testing basic database query...')
    
    const { data, error } = await supabase
      .from('unified_identities')
      .select('count')
      .limit(1)
    
    console.log('📊 Query result - data:', data)
    console.log('📊 Query result - error:', error)
    
    // This should work even if there are no records
    expect(error).toBeNull()
  })
})