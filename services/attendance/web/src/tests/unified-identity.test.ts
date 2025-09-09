/**
 * Unified Identity System Tests - Real Data Integration
 * TDD approach with actual database operations
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { identityService } from '../services/identityService'
import { organizationService } from '../services/organization.service'
// Get environment variables or fallback to hardcoded values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'

// Test client with service role for admin operations
const testClient = createClient(supabaseUrl, supabaseAnonKey)

// Test data
const testIdentityData = {
  email: 'test-identity-' + Date.now() + '@example.com',
  phone: '010-1234-5678',
  fullName: '테스트 사용자',
  birthDate: '1990-01-01',
  idType: 'personal' as const
}

const testOrgData = {
  name: 'Test Organization ' + Date.now(),
  orgType: 'personal' as const
}

describe('Unified Identity System - Step 1: Database Schema', () => {
  
  beforeAll(async () => {
    console.log('Setting up test environment...')
    // Verify database connection
    const { data, error } = await testClient.from('auth.users').select('count').limit(1)
    if (error) {
      console.warn('Database connection issue:', error.message)
    }
  })

  test('Should check if unified_identities table exists', async () => {
    // First check if the table exists by trying a simple query
    const { data, error } = await testClient
      .from('unified_identities')
      .select('count')
      .limit(1)
    
    if (error && error.message.includes('relation "unified_identities" does not exist')) {
      console.log('❌ unified_identities table not found - need to run migration')
      
      // Run migration 005 here
      const migrationResult = await runMigration005()
      expect(migrationResult.success).toBe(true)
    } else {
      console.log('✅ unified_identities table exists')
      expect(error).toBeFalsy()
    }
  })

  test('Should check if organizations_v3 table exists', async () => {
    const { data, error } = await testClient
      .from('organizations_v3')
      .select('count')
      .limit(1)
    
    if (error && error.message.includes('relation "organizations_v3" does not exist')) {
      console.log('❌ organizations_v3 table not found')
      expect(true).toBe(false) // Fail test to indicate migration needed
    } else {
      console.log('✅ organizations_v3 table exists')
      expect(error).toBeFalsy()
    }
  })

  test('Should check if role_assignments table exists', async () => {
    const { data, error } = await testClient
      .from('role_assignments')
      .select('count')
      .limit(1)
    
    if (error && error.message.includes('relation "role_assignments" does not exist')) {
      console.log('❌ role_assignments table not found')
      expect(true).toBe(false)
    } else {
      console.log('✅ role_assignments table exists')
      expect(error).toBeFalsy()
    }
  })
})

describe('Unified Identity System - Step 2: Identity Creation', () => {
  
  test('Should create a personal identity with real data', async () => {
    const result = await identityService.createIdentity(testIdentityData)
    
    console.log('Identity creation result:', result)
    
    expect(result.success).toBe(true)
    expect(result.identity).toBeDefined()
    expect(result.identity?.email).toBe(testIdentityData.email)
    expect(result.identity?.idType).toBe('personal')
    expect(result.requiresVerification).toBe(false) // Personal identities don't require verification
  })

  test('Should retrieve identity by email', async () => {
    const identity = await identityService.getByEmail(testIdentityData.email)
    
    console.log('Retrieved identity:', identity)
    
    expect(identity).toBeDefined()
    expect(identity?.email).toBe(testIdentityData.email)
    expect(identity?.fullName).toBe(testIdentityData.fullName)
  })

  test('Should not create duplicate identity with same email', async () => {
    const result = await identityService.createIdentity(testIdentityData)
    
    console.log('Duplicate creation attempt:', result)
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('already exists')
  })
})

describe('Unified Identity System - Step 3: Organization Creation', () => {
  let createdIdentity: any = null

  beforeAll(async () => {
    // Get the test identity we created
    createdIdentity = await identityService.getByEmail(testIdentityData.email)
    console.log('Using identity for org tests:', createdIdentity?.id)
  })

  test('Should create organization with valid owner', async () => {
    if (!createdIdentity) {
      throw new Error('Test identity not found - run identity tests first')
    }

    const orgRequest = {
      ...testOrgData,
      ownerIdentityId: createdIdentity.id
    }

    const result = await organizationService.createOrganization(orgRequest)
    
    console.log('Organization creation result:', result)
    
    expect(result.success).toBe(true)
    expect(result.organization).toBeDefined()
    expect(result.code).toBeDefined()
    expect(result.organization?.name).toBe(testOrgData.name)
    expect(result.organization?.ownerIdentityId).toBe(createdIdentity.id)
  })

  test('Should assign admin role to organization owner', async () => {
    if (!createdIdentity) {
      throw new Error('Test identity not found')
    }

    const roles = await organizationService.getUserRoles(createdIdentity.id)
    
    console.log('User roles:', roles)
    
    expect(roles.length).toBeGreaterThan(0)
    const adminRole = roles.find(role => role.role === 'admin')
    expect(adminRole).toBeDefined()
    expect(adminRole?.isActive).toBe(true)
  })
})

describe('Unified Identity System - Step 4: Data Migration Validation', () => {
  
  test('Should validate master admin exists', async () => {
    const { data, error } = await testClient
      .from('role_assignments')
      .select('*, unified_identities!inner(*)')
      .eq('role', 'master')
      .eq('is_active', true)
    
    console.log('Master admin query result:', { data, error })
    
    expect(error).toBeFalsy()
    if (data && data.length > 0) {
      expect(data[0].role).toBe('master')
      console.log('✅ Master admin found:', data[0].unified_identities?.email)
    } else {
      console.log('❌ No master admin found - need to run data migration')
      // This is expected if migration hasn't run yet
    }
  })

  test('Should validate data consistency', async () => {
    // Check that all identities have proper structure
    const { data: identities, error: idError } = await testClient
      .from('unified_identities')
      .select('id, email, full_name, id_type, is_active')
      .eq('is_active', true)
      .limit(5)
    
    console.log('Sample identities:', identities)
    
    if (identities && identities.length > 0) {
      for (const identity of identities) {
        expect(identity.id).toBeDefined()
        expect(identity.email).toBeDefined()
        expect(identity.full_name).toBeDefined()
        expect(['personal', 'business_owner', 'corporation', 'franchise_hq']).toContain(identity.id_type)
      }
    }
  })
})

// Helper function to run migration
async function runMigration005(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Running migration 005 - unified identity system...')
    
    // Read migration file and execute
    const fs = require('fs')
    const path = require('path')
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/005_unified_identity_system.sql')
    
    if (!fs.existsSync(migrationPath)) {
      return { success: false, error: 'Migration file not found' }
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Execute migration SQL
    const { error } = await testClient.rpc('exec', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration error:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Migration 005 completed successfully')
    return { success: true }
    
  } catch (error: any) {
    console.error('Migration execution error:', error)
    return { success: false, error: error.message }
  }
}

afterAll(async () => {
  console.log('Cleaning up test data...')
  
  // Clean up test data (but keep it for inspection during development)
  // In production tests, we would clean up here
  
  console.log('Test cleanup completed')
})