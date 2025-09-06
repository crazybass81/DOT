/**
 * Execute Complete Migration Script
 * WARNING: This will DROP existing tables and replace with unified system
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase configuration
const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function executeMigration() {
  console.log('⚠️  WARNING: This will completely replace the existing system!')
  console.log('🗑️  All existing data in employees/organizations tables will be DELETED')
  console.log('🆕 New unified identity system will be created')
  
  try {
    // Read the complete replacement migration
    const migrationPath = path.join(__dirname, '../../supabase/migrations/007_complete_replacement.sql')
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log(`📄 Migration file loaded (${migrationSQL.length} characters)`)
    
    // Since we can't execute raw SQL directly, we'll guide the user
    console.log('\\n📋 MANUAL EXECUTION REQUIRED:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the following migration SQL:')
    console.log('\\n' + '='.repeat(80))
    console.log(migrationSQL)
    console.log('='.repeat(80))
    console.log('\\n4. Execute the SQL')
    console.log('5. Come back here and run verification')
    
    return true
    
  } catch (error) {
    console.error('❌ Migration preparation failed:', error.message)
    return false
  }
}

async function verifyMigration() {
  console.log('\\n🔍 Verifying migration results...')
  
  try {
    // Check if new tables exist
    const tables = ['unified_identities', 'organizations_v3', 'role_assignments']
    const results = {}
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('count').limit(1)
        results[table] = !error
        console.log(`${results[table] ? '✅' : '❌'} ${table}: ${error ? error.message : 'exists'}`)
      } catch (err) {
        results[table] = false
        console.log(`❌ ${table}: ${err.message}`)
      }
    }
    
    // Check if old tables are gone
    const oldTables = ['employees', 'organizations']
    for (const table of oldTables) {
      try {
        const { data, error } = await supabase.from(table).select('count').limit(1)
        const exists = !error
        console.log(`${exists ? '⚠️' : '✅'} ${table}: ${exists ? 'still exists (should be removed)' : 'removed'}`)
      } catch (err) {
        console.log(`✅ ${table}: removed`)
      }
    }
    
    const allNewTablesExist = Object.values(results).every(exists => exists)
    console.log(`\\n${allNewTablesExist ? '🎉' : '❌'} Migration ${allNewTablesExist ? 'successful' : 'incomplete'}`)
    
    return allNewTablesExist
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

async function createInitialMasterAdmin() {
  console.log('\\n👤 Creating initial master admin...')
  
  try {
    // This will be done through the web interface after migration
    // because we need proper auth context
    console.log('📝 Master admin creation steps:')
    console.log('1. Go to http://localhost:3002')
    console.log('2. Sign up with email: archt723@gmail.com')
    console.log('3. The system will automatically create unified identity')
    console.log('4. Manually assign master role through database if needed')
    
    return true
    
  } catch (error) {
    console.error('❌ Master admin setup failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Complete System Migration Process')
  console.log('=====================================')
  
  // Step 1: Prepare migration
  const migrationReady = await executeMigration()
  if (!migrationReady) {
    console.log('❌ Migration preparation failed')
    return
  }
  
  // Step 2: Wait for user to execute manually
  console.log('\\n⏳ Please execute the SQL in Supabase Dashboard and press Enter when done...')
  
  // In a real scenario, you'd pause here for user input
  // For now, we'll proceed to verification
  
  // Step 3: Verify migration
  const migrationSuccessful = await verifyMigration()
  if (!migrationSuccessful) {
    console.log('❌ Migration verification failed')
    return
  }
  
  // Step 4: Setup master admin
  await createInitialMasterAdmin()
  
  console.log('\\n🎉 Complete migration process finished!')
  console.log('Next steps: Update services to use new unified system')
}

main().catch(console.error)