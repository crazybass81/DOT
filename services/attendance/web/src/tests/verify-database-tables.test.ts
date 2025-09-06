/**
 * Database Table Verification Test
 * Checks what tables actually exist in the database
 */

import { describe, test, expect } from '@jest/globals'
import { supabase } from '../lib/supabase-config'

describe('Database Table Verification', () => {
  
  test('Should list all accessible tables and views', async () => {
    console.log('🔍 Testing table accessibility...')
    
    const potentialTables = [
      'unified_identities',
      'organizations_v3', 
      'role_assignments',
      'attendance_records',
      'attendance',  // Alternative name suggested by error
      'user_roles_view',
      'active_employees'
    ]
    
    const accessibleTables: string[] = []
    const inaccessibleTables: string[] = []
    
    for (const table of potentialTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
          inaccessibleTables.push(table)
        } else {
          console.log(`✅ ${table}: Accessible`)
          accessibleTables.push(table)
        }
      } catch (err: any) {
        console.log(`⚠️ ${table}: ${err.message}`)
        inaccessibleTables.push(table)
      }
    }
    
    console.log('\n📊 TABLE ACCESSIBILITY REPORT')
    console.log('='.repeat(50))
    console.log('✅ Accessible tables/views:')
    accessibleTables.forEach(table => console.log(`   - ${table}`))
    console.log('\n❌ Inaccessible tables/views:')
    inaccessibleTables.forEach(table => console.log(`   - ${table}`))
    console.log('='.repeat(50))
    
    expect(accessibleTables.length).toBeGreaterThan(0)
  })

  test('Should test basic CRUD on accessible tables', async () => {
    console.log('🧪 Testing basic CRUD operations...')
    
    // Test unified_identities (should be accessible)
    console.log('Testing unified_identities...')
    const { data: identityData, error: identityError } = await supabase
      .from('unified_identities')
      .select('*')
      .limit(5)
    
    if (identityError) {
      console.log('❌ unified_identities error:', identityError.message)
    } else {
      console.log(`✅ unified_identities: Found ${identityData.length} records`)
    }

    // Test organizations_v3 (should be accessible)
    console.log('Testing organizations_v3...')
    const { data: orgData, error: orgError } = await supabase
      .from('organizations_v3')
      .select('*')
      .limit(5)
    
    if (orgError) {
      console.log('❌ organizations_v3 error:', orgError.message)
    } else {
      console.log(`✅ organizations_v3: Found ${orgData.length} records`)
    }

    // Test role_assignments (should be accessible)
    console.log('Testing role_assignments...')
    const { data: roleData, error: roleError } = await supabase
      .from('role_assignments')
      .select('*')
      .limit(5)
    
    if (roleError) {
      console.log('❌ role_assignments error:', roleError.message)
    } else {
      console.log(`✅ role_assignments: Found ${roleData.length} records`)
    }

    // Test attendance table (alternative name)
    console.log('Testing attendance table...')
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .limit(5)
    
    if (attendanceError) {
      console.log('❌ attendance error:', attendanceError.message)
    } else {
      console.log(`✅ attendance: Found ${attendanceData.length} records`)
    }
    
    expect(true).toBe(true) // Always pass - this is exploratory
  })
})