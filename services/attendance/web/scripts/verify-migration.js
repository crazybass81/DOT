/**
 * Migration Verification Script
 * Checks if the unified identity system has been properly migrated
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1)
    
    if (error) {
      if (error.message.includes('does not exist')) {
        return { exists: false, error: error.message }
      }
      return { exists: false, error: error.message }
    }
    
    return { exists: true, error: null }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

async function checkViewExists(viewName) {
  try {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1)
    
    if (error) {
      if (error.message.includes('does not exist')) {
        return { exists: false, error: error.message }
      }
      return { exists: false, error: error.message }
    }
    
    return { exists: true, error: null }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

async function main() {
  console.log('🔍 Verifying unified identity system migration...')
  console.log('='.repeat(50))

  // Check new tables
  const newTables = [
    'unified_identities',
    'organizations_v3', 
    'role_assignments'
  ]

  console.log('\n📊 New Tables Status:')
  let allNewTablesExist = true
  
  for (const table of newTables) {
    const result = await checkTableExists(table)
    const status = result.exists ? '✅ exists' : '❌ missing'
    console.log(`  ${table}: ${status}`)
    
    if (!result.exists) {
      allNewTablesExist = false
      if (result.error && !result.error.includes('does not exist')) {
        console.log(`    Error: ${result.error}`)
      }
    }
  }

  // Check old tables (should not exist after migration)
  const oldTables = ['employees', 'organizations']
  
  console.log('\n🗑️ Old Tables Status (should be removed):')
  let allOldTablesRemoved = true
  
  for (const table of oldTables) {
    const result = await checkTableExists(table)
    const status = result.exists ? '❌ still exists (should be removed)' : '✅ removed'
    console.log(`  ${table}: ${status}`)
    
    if (result.exists) {
      allOldTablesRemoved = false
    }
  }

  // Check helper views
  const views = [
    'user_roles_view',
    'organization_hierarchy_view'
  ]

  console.log('\n👁️ Helper Views Status:')
  let allViewsExist = true
  
  for (const view of views) {
    const result = await checkViewExists(view)
    const status = result.exists ? '✅ exists' : '❌ missing'
    console.log(`  ${view}: ${status}`)
    
    if (!result.exists) {
      allViewsExist = false
      if (result.error && !result.error.includes('does not exist')) {
        console.log(`    Error: ${result.error}`)
      }
    }
  }

  // Overall status
  console.log('\n📋 Migration Status Summary:')
  console.log('='.repeat(30))
  
  if (allNewTablesExist) {
    console.log('✅ All new tables created successfully')
  } else {
    console.log('❌ Some new tables are missing')
  }

  if (allOldTablesRemoved) {
    console.log('✅ Old tables removed successfully')
  } else {
    console.log('⚠️  Some old tables still exist')
  }

  if (allViewsExist) {
    console.log('✅ Helper views created successfully')
  } else {
    console.log('⚠️  Some helper views are missing')
  }

  const overallSuccess = allNewTablesExist && allOldTablesRemoved && allViewsExist
  
  console.log('\n🎯 Overall Result:')
  if (overallSuccess) {
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!')
    console.log('    Your unified identity system is ready to use.')
    console.log('    Next steps:')
    console.log('    1. Update services to use new tables')
    console.log('    2. Test authentication flow')
    console.log('    3. Create master admin user')
  } else {
    console.log('❌ MIGRATION INCOMPLETE')
    console.log('    Please execute the SQL script manually:')
    console.log('    scripts/complete-migration-manual.sql')
    console.log('    in Supabase Dashboard > SQL Editor')
  }
}

main().catch(console.error)