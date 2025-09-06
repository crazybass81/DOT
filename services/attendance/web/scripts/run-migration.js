/**
 * Migration Runner Script
 * Executes SQL migrations directly on Supabase database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase configuration
const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runMigration(migrationFile) {
  console.log(`🚀 Running migration: ${migrationFile}`)
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../../supabase/migrations', migrationFile)
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log(`📄 Migration file size: ${migrationSQL.length} characters`)
    
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📋 Found ${statements.length} SQL statements`)
    
    // Execute each statement
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      if (statement.toLowerCase().includes('begin') || 
          statement.toLowerCase().includes('commit') ||
          statement.length < 10) {
        continue // Skip transaction control statements for now
      }
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        
        // Use rpc to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        })
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message)
          console.error(`SQL:`, statement.substring(0, 200) + '...')
          errorCount++
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
          successCount++
        }
        
        // Small delay between statements
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message)
        console.error(`SQL:`, statement.substring(0, 200) + '...')
        errorCount++
      }
    }
    
    console.log(`\n📊 Migration Results:`)
    console.log(`✅ Successful statements: ${successCount}`)
    console.log(`❌ Failed statements: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log(`🎉 Migration completed successfully!`)
      return true
    } else {
      console.log(`⚠️  Migration completed with errors`)
      return false
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    return false
  }
}

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1)
    
    if (error) {
      if (error.message.includes('does not exist')) {
        return false
      }
      console.error(`Error checking table ${tableName}:`, error.message)
      return false
    }
    
    return true
  } catch (err) {
    return false
  }
}

async function main() {
  console.log('🔍 Checking current database state...')
  
  // Check if unified tables exist
  const unifiedIdentitiesExists = await checkTableExists('unified_identities')
  const organizationsV3Exists = await checkTableExists('organizations_v3')
  const roleAssignmentsExists = await checkTableExists('role_assignments')
  
  console.log(`📋 Current table status:`)
  console.log(`- unified_identities: ${unifiedIdentitiesExists ? '✅ exists' : '❌ missing'}`)
  console.log(`- organizations_v3: ${organizationsV3Exists ? '✅ exists' : '❌ missing'}`)
  console.log(`- role_assignments: ${roleAssignmentsExists ? '✅ exists' : '❌ missing'}`)
  
  // Run migration 005 if tables don't exist
  if (!unifiedIdentitiesExists || !organizationsV3Exists || !roleAssignmentsExists) {
    console.log('\n🚀 Running migration 005 - unified identity system...')
    const success = await runMigration('005_unified_identity_system.sql')
    
    if (success) {
      console.log('\n🚀 Running migration 006 - data migration...')
      await runMigration('006_data_migration.sql')
    }
  } else {
    console.log('\n✅ All tables exist, no migration needed')
  }
  
  console.log('\n🏁 Migration process completed')
}

// Run the migration
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { runMigration, checkTableExists }