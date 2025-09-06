/**
 * Quick Table Existence Checker
 * Tests for existence of known legacy and current tables
 */

import { supabase } from '../lib/supabase-config'

interface TableCheckResult {
  tableName: string
  exists: boolean
  error?: string
  category: 'current' | 'legacy' | 'unknown'
}

// Tables we know should exist in the new system
const CURRENT_TABLES = [
  'unified_identities',
  'organizations_v3', 
  'role_assignments',
  'attendance_records'
]

// Legacy tables that might still exist from old system  
const LEGACY_TABLES = [
  'employees',
  'organizations', // old version
  'user_roles',
  'branches',
  'departments', 
  'positions',
  'employee_organizations'
]

async function checkTableExists(tableName: string): Promise<TableCheckResult> {
  try {
    console.log(`🔍 Checking table: ${tableName}`)
    
    // Try to query the table with minimal data
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
      
    const exists = !error || !error.message.includes('relation') && !error.message.includes('does not exist')
    
    const category: 'current' | 'legacy' | 'unknown' = 
      CURRENT_TABLES.includes(tableName) ? 'current' :
      LEGACY_TABLES.includes(tableName) ? 'legacy' : 
      'unknown'
    
    return {
      tableName,
      exists,
      error: error?.message,
      category
    }
    
  } catch (error: any) {
    return {
      tableName,
      exists: false,
      error: error.message,
      category: CURRENT_TABLES.includes(tableName) ? 'current' : 
                LEGACY_TABLES.includes(tableName) ? 'legacy' : 'unknown'
    }
  }
}

async function auditDatabase(): Promise<void> {
  console.log('🏁 Starting database table audit...\n')
  
  const allTablesToCheck = [...CURRENT_TABLES, ...LEGACY_TABLES]
  const results: TableCheckResult[] = []
  
  // Check each table
  for (const tableName of allTablesToCheck) {
    const result = await checkTableExists(tableName)
    results.push(result)
  }
  
  // Categorize results
  const existingTables = results.filter(r => r.exists)
  const missingTables = results.filter(r => !r.exists)
  const currentTables = existingTables.filter(r => r.category === 'current')
  const legacyTables = existingTables.filter(r => r.category === 'legacy')
  
  // Print report
  console.log('='.repeat(60))
  console.log('📊 DATABASE TABLE AUDIT REPORT')  
  console.log('='.repeat(60))
  
  console.log(`\n📈 SUMMARY:`)
  console.log(`   Tables checked: ${results.length}`)
  console.log(`   Tables found: ${existingTables.length}`)
  console.log(`   Tables missing: ${missingTables.length}`)
  console.log(`   Current system tables: ${currentTables.length}`)
  console.log(`   Legacy tables found: ${legacyTables.length}`)
  
  if (currentTables.length > 0) {
    console.log(`\n✅ CURRENT SYSTEM TABLES (${currentTables.length}):`)
    currentTables.forEach(table => {
      console.log(`   • ${table.tableName} - Active`)
    })
  }
  
  if (legacyTables.length > 0) {
    console.log(`\n🗑️  LEGACY TABLES FOUND (${legacyTables.length}):`) 
    legacyTables.forEach(table => {
      console.log(`   • ${table.tableName} - ⚠️  Can be removed after backup`)
    })
  }
  
  if (missingTables.length > 0) {
    console.log(`\n❌ MISSING TABLES (${missingTables.length}):`)
    missingTables.forEach(table => {
      console.log(`   • ${table.tableName} (${table.category}) - ${table.error || 'Not found'}`)
    })
  }
  
  // Provide recommendations
  console.log(`\n💡 RECOMMENDATIONS:`)
  
  if (legacyTables.length > 0) {
    console.log(`   🧹 CLEANUP NEEDED: Found ${legacyTables.length} legacy tables`)
    console.log(`   📋 ACTION: Create backup script for: ${legacyTables.map(t => t.tableName).join(', ')}`)
    console.log(`   ⚠️  WARNING: Always backup before deletion!`)
  }
  
  if (currentTables.length < CURRENT_TABLES.length) {
    const missingCurrent = CURRENT_TABLES.filter(name => 
      !currentTables.some(t => t.tableName === name)
    )
    console.log(`   🚨 CRITICAL: Missing current system tables: ${missingCurrent.join(', ')}`)
    console.log(`   📝 ACTION: Run database migration scripts`)
  }
  
  if (legacyTables.length === 0 && currentTables.length === CURRENT_TABLES.length) {
    console.log(`   🎉 GOOD: Database is clean - no legacy tables found`)
  }
  
  console.log('\n' + '='.repeat(60))
  
  // Generate cleanup script if needed
  if (legacyTables.length > 0) {
    console.log('\n🔧 CLEANUP SCRIPT:')
    console.log('-- ⚠️  BACKUP FIRST: pg_dump your database before running!')
    console.log('-- Run these commands in Supabase SQL Editor:')
    console.log('')
    
    legacyTables.forEach(table => {
      console.log(`-- Backup ${table.tableName}`)
      console.log(`CREATE TABLE ${table.tableName}_backup AS SELECT * FROM ${table.tableName};`)
    })
    
    console.log('')
    console.log('-- After backup verification, uncomment and run:')
    legacyTables.forEach(table => {
      console.log(`-- DROP TABLE IF EXISTS ${table.tableName} CASCADE;`)
    })
  }
}

// Run the audit
if (require.main === module) {
  auditDatabase()
    .then(() => {
      console.log('\n✅ Audit completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('🚨 Audit failed:', error)
      process.exit(1)
    })
}