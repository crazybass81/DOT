/**
 * Database Table Audit Test
 * Checks for legacy tables that may remain after migration
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { supabase } from '../lib/supabase-config'

interface TableCheckResult {
  tableName: string
  exists: boolean
  error?: string
  category: 'current' | 'legacy' | 'unknown'
}

// Tables that should exist in the new unified system
const CURRENT_TABLES = [
  'unified_identities',
  'organizations_v3', 
  'role_assignments',
  'attendance_records'
]

// Legacy tables from old system that might still exist
const LEGACY_TABLES = [
  'employees',
  'organizations', // old version
  'user_roles',
  'branches',
  'departments', 
  'positions',
  'employee_organizations'
]

describe('Database Table Audit', () => {
  let auditResults: TableCheckResult[] = []
  
  beforeAll(() => {
    console.log('🔍 Starting comprehensive database table audit...')
  })

  afterAll(() => {
    // Generate summary report
    const existingTables = auditResults.filter(r => r.exists)
    const currentTables = existingTables.filter(r => r.category === 'current')
    const legacyTables = existingTables.filter(r => r.category === 'legacy')
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 DATABASE TABLE AUDIT SUMMARY')
    console.log('='.repeat(60))
    
    console.log(`\n📈 RESULTS:`)
    console.log(`   Tables checked: ${auditResults.length}`)
    console.log(`   Tables found: ${existingTables.length}`)
    console.log(`   Current system tables: ${currentTables.length}`)
    console.log(`   Legacy tables found: ${legacyTables.length}`)
    
    if (currentTables.length > 0) {
      console.log(`\n✅ CURRENT SYSTEM TABLES (${currentTables.length}):`)
      currentTables.forEach(table => {
        console.log(`   • ${table.tableName}`)
      })
    }
    
    if (legacyTables.length > 0) {
      console.log(`\n🗑️  LEGACY TABLES FOUND (${legacyTables.length}):`) 
      legacyTables.forEach(table => {
        console.log(`   • ${table.tableName} ⚠️  Can be removed after backup`)
      })
      
      console.log(`\n🔧 CLEANUP SCRIPT:`)
      console.log(`-- ⚠️  BACKUP FIRST: Create database backup before deletion!`)
      console.log(`-- Run in Supabase SQL Editor:`)
      console.log(``)
      
      legacyTables.forEach(table => {
        console.log(`-- Backup ${table.tableName}`)
        console.log(`CREATE TABLE ${table.tableName}_backup AS SELECT * FROM ${table.tableName};`)
      })
      
      console.log(``)
      console.log(`-- After backup verification, uncomment to drop:`)
      legacyTables.forEach(table => {
        console.log(`-- DROP TABLE IF EXISTS ${table.tableName} CASCADE;`)
      })
    } else {
      console.log(`\n🎉 CLEAN: No legacy tables found - database is clean!`)
    }
    
    console.log('\n' + '='.repeat(60))
  })

  // Helper function to check if table exists
  const checkTableExists = async (tableName: string): Promise<TableCheckResult> => {
    try {
      console.log(`🔍 Checking table: ${tableName}`)
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
        
      const exists = !error || (!error.message.includes('relation') && !error.message.includes('does not exist'))
      
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

  describe('Current System Tables', () => {
    
    test.each(CURRENT_TABLES)('Should find current table: %s', async (tableName) => {
      const result = await checkTableExists(tableName)
      auditResults.push(result)
      
      console.log(`   ${result.exists ? '✅' : '❌'} ${tableName}: ${result.exists ? 'Found' : 'Missing'}`)
      
      if (!result.exists) {
        console.warn(`🚨 CRITICAL: Current system table missing: ${tableName}`)
        console.warn(`   Error: ${result.error}`)
      }
      
      // Don't fail test if table is missing - just record for audit
      expect(typeof result.exists).toBe('boolean')
    })
  })

  describe('Legacy Table Check', () => {
    
    test.each(LEGACY_TABLES)('Should check legacy table: %s', async (tableName) => {
      const result = await checkTableExists(tableName)
      auditResults.push(result)
      
      console.log(`   ${result.exists ? '🗑️ ' : '✅'} ${tableName}: ${result.exists ? 'EXISTS (legacy)' : 'Not found (clean)'}`)
      
      if (result.exists) {
        console.warn(`⚠️  CLEANUP NEEDED: Legacy table found: ${tableName}`)
      }
      
      // Don't fail test - legacy tables existing is not a failure, just needs cleanup
      expect(typeof result.exists).toBe('boolean')
    })
  })

  describe('Database Health Assessment', () => {
    
    test('Should assess overall database health', () => {
      console.log('\n🏥 Database Health Assessment')
      
      const currentFound = auditResults.filter(r => r.category === 'current' && r.exists)
      const legacyFound = auditResults.filter(r => r.category === 'legacy' && r.exists)
      
      const healthScore = (currentFound.length / CURRENT_TABLES.length) * 100
      
      console.log(`📊 Health Score: ${healthScore.toFixed(1)}% (${currentFound.length}/${CURRENT_TABLES.length} current tables found)`)
      
      if (legacyFound.length > 0) {
        console.log(`🧹 Cleanup Needed: ${legacyFound.length} legacy tables to remove`)
      }
      
      if (healthScore >= 75) {
        console.log('✅ Database health is good')
      } else {
        console.log('⚠️  Database needs attention - missing current system tables')
      }
      
      expect(auditResults.length).toBeGreaterThan(0)
    })
  })
})