/**
 * Simple Table Creation Script
 * Creates unified identity tables one by one
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createTablesViaAPI() {
  console.log('🚀 Creating unified identity tables via API...')
  
  try {
    // Create unified_identities table
    console.log('📋 Creating unified_identities table...')
    const { data: identityData, error: identityError } = await supabase
      .from('unified_identities')
      .insert({
        email: 'test@example.com',
        full_name: 'Test User',
        id_type: 'personal',
        is_verified: false,
        is_active: true
      })
      .select()
    
    if (identityError && !identityError.message.includes('already exists')) {
      console.log('❌ unified_identities table does not exist, need to create via SQL')
    } else {
      console.log('✅ unified_identities table exists or created')
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
}

// Since we can't execute raw SQL through the API, let's manually create test data
// to see if the system works with existing tables first
async function testWithExistingTables() {
  console.log('🧪 Testing with existing employees/organizations tables...')
  
  try {
    // Check employees table structure
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .limit(1)
    
    if (empError) {
      console.log('❌ Error accessing employees:', empError.message)
    } else {
      console.log('✅ Employees table accessible')
      console.log('📋 Sample employee:', employees[0] ? Object.keys(employees[0]) : 'No data')
    }
    
    // Check organizations table structure
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
    
    if (orgError) {
      console.log('❌ Error accessing organizations:', orgError.message)
    } else {
      console.log('✅ Organizations table accessible')
      console.log('📋 Sample organization:', orgs[0] ? Object.keys(orgs[0]) : 'No data')
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
}

async function main() {
  console.log('🔍 Testing database access...')
  
  await testWithExistingTables()
  await createTablesViaAPI()
  
  console.log('\\n💡 Next Steps:')
  console.log('1. We need to create the new tables via Supabase SQL Editor')
  console.log('2. Copy the CREATE TABLE statements from 005_unified_identity_system.sql')
  console.log('3. Execute them manually in Supabase Dashboard')
  console.log('4. Then we can run our tests successfully')
}

main().catch(console.error)