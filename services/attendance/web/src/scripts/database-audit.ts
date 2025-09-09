/**
 * Database Audit Script - Identify unused tables in Supabase
 * Checks for legacy tables that may remain after migration to unified identity system
 */

import { supabase } from '../lib/supabase-config'

interface TableInfo {
  table_name: string
  table_schema: string
  is_insertable_into: string
}

interface AuditResult {
  allTables: string[]
  currentTables: string[]
  legacyTables: string[]
  unknownTables: string[]
  recommendations: string[]
}

// Current tables used by the unified system
const CURRENT_TABLES = [
  'unified_identities',
  'organizations_v3', 
  'role_assignments',
  'attendance_records',
  'auth.users', // Supabase auth table
  'auth.sessions', // Supabase auth table
]

// Legacy tables from old system that should be safe to remove
const LEGACY_TABLES = [
  'employees',
  'organizations', // old version
  'user_roles',
  'branches',
  'departments',
  'positions',
  'employee_organizations', // junction table
]

export class DatabaseAuditor {
  
  async getAllTables(): Promise<string[]> {
    try {
      console.log('🔍 Querying all tables from information_schema...')
      
      const { data, error } = await supabase
        .rpc('get_all_tables', {})
        .catch(async () => {
          // Fallback: try direct query to information_schema
          return await supabase
            .from('information_schema.tables')
            .select('table_name, table_schema, is_insertable_into')
            .eq('table_schema', 'public')
            .order('table_name')
        })

      if (error) {
        console.error('❌ Error querying tables:', error.message)
        
        // Final fallback: try SQL query directly
        const { data: sqlData, error: sqlError } = await supabase
          .rpc('exec_sql', {
            query: `
              SELECT table_name, table_schema, is_insertable_into 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              ORDER BY table_name;
            `
          })
          .catch(() => ({ data: null, error: { message: 'SQL query failed' } }))
          
        if (sqlError || !sqlData) {
          console.error('❌ Fallback SQL query also failed:', sqlError?.message)
          return []
        }
        
        return sqlData.map((table: TableInfo) => table.table_name)
      }

      const tableNames = Array.isArray(data) 
        ? data.map((table: TableInfo) => table.table_name)
        : []
        
      console.log(`📋 Found ${tableNames.length} tables in database`)
      return tableNames.sort()
      
    } catch (error: any) {
      console.error('🚨 Critical error in getAllTables:', error.message)
      return []
    }
  }

  async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
        
      return !error
    } catch {
      return false
    }
  }

  async checkTableUsageInCode(): Promise<{ [tableName: string]: string[] }> {
    // This would be implemented to scan code files for table references
    // For now, return manual mapping
    return {
      'unified_identities': [
        'src/services/unified-identity.service.ts',
        'src/services/supabaseAuthService.ts',
        'src/lib/registration/api.ts'
      ],
      'organizations_v3': [
        'src/services/organization.service.ts',
        'src/services/role-management.service.ts'
      ],
      'role_assignments': [
        'src/services/organization.service.ts', 
        'src/services/role-management.service.ts'
      ],
      'attendance_records': [
        'src/services/api.service.ts'
      ],
      'employees': ['LEGACY - Not used in current code'],
      'organizations': ['LEGACY - Replaced by organizations_v3'],
      'user_roles': ['LEGACY - Replaced by role_assignments']
    }
  }

  async performAudit(): Promise<AuditResult> {
    console.log('🏁 Starting comprehensive database audit...')
    
    const allTables = await this.getAllTables()
    const usage = await this.checkTableUsageInCode()
    
    const currentTables = allTables.filter(table => 
      CURRENT_TABLES.some(current => 
        table === current || table.includes(current.split('.')[1] || current)
      )
    )
    
    const legacyTables = allTables.filter(table => 
      LEGACY_TABLES.includes(table)
    )
    
    const unknownTables = allTables.filter(table => 
      !currentTables.includes(table) && 
      !legacyTables.includes(table) &&
      !table.startsWith('auth.') && // Supabase system tables
      !table.startsWith('storage.') && // Supabase storage tables
      !table.startsWith('realtime.') && // Supabase realtime tables
      !table.startsWith('extensions.') && // Postgres extensions
      !table.startsWith('graphql') && // GraphQL tables
      !table.startsWith('pgsodium') && // Encryption extension
      !table.startsWith('vault') // Vault extension
    )

    const recommendations: string[] = []

    // Generate recommendations
    if (legacyTables.length > 0) {
      recommendations.push(`🧹 CLEANUP NEEDED: Found ${legacyTables.length} legacy tables that can likely be removed`)
      recommendations.push(`   Legacy tables: ${legacyTables.join(', ')}`)
      recommendations.push(`   ⚠️  BACKUP FIRST: Create database backup before deletion`)
      recommendations.push(`   📋 VERIFY: Check these tables are truly unused before deletion`)
    }

    if (unknownTables.length > 0) {
      recommendations.push(`🔍 INVESTIGATION NEEDED: Found ${unknownTables.length} unknown tables`)
      recommendations.push(`   Unknown tables: ${unknownTables.join(', ')}`)
      recommendations.push(`   📖 RESEARCH: Determine purpose and usage of these tables`)
    }

    if (currentTables.length > 0) {
      recommendations.push(`✅ ACTIVE: Found ${currentTables.length} tables in current use`)
      recommendations.push(`   Active tables: ${currentTables.join(', ')}`)
    }

    const result: AuditResult = {
      allTables,
      currentTables,
      legacyTables, 
      unknownTables,
      recommendations
    }

    this.printAuditReport(result)
    return result
  }

  private printAuditReport(result: AuditResult) {
    console.log('\n' + '='.repeat(60))
    console.log('📊 DATABASE AUDIT REPORT')
    console.log('='.repeat(60))
    
    console.log(`\n📈 SUMMARY:`)
    console.log(`   Total tables: ${result.allTables.length}`)
    console.log(`   Active tables: ${result.currentTables.length}`)
    console.log(`   Legacy tables: ${result.legacyTables.length}`)
    console.log(`   Unknown tables: ${result.unknownTables.length}`)

    if (result.currentTables.length > 0) {
      console.log(`\n✅ ACTIVE TABLES (${result.currentTables.length}):`)
      result.currentTables.forEach(table => console.log(`   • ${table}`))
    }

    if (result.legacyTables.length > 0) {
      console.log(`\n🗑️  LEGACY TABLES (${result.legacyTables.length}):`)
      result.legacyTables.forEach(table => console.log(`   • ${table} - Safe to remove after backup`))
    }

    if (result.unknownTables.length > 0) {
      console.log(`\n❓ UNKNOWN TABLES (${result.unknownTables.length}):`)
      result.unknownTables.forEach(table => console.log(`   • ${table} - Needs investigation`))
    }

    console.log(`\n💡 RECOMMENDATIONS:`)
    result.recommendations.forEach(rec => console.log(`   ${rec}`))
    
    console.log('\n' + '='.repeat(60))
  }

  async generateCleanupScript(): Promise<string[]> {
    const result = await this.performAudit()
    const cleanupSQL: string[] = []

    if (result.legacyTables.length > 0) {
      cleanupSQL.push('-- Database Cleanup Script')
      cleanupSQL.push('-- ⚠️  IMPORTANT: Create backup before running this script!')
      cleanupSQL.push('')
      cleanupSQL.push('-- Step 1: Backup legacy tables (run these first)')
      
      result.legacyTables.forEach(table => {
        cleanupSQL.push(`CREATE TABLE ${table}_backup AS SELECT * FROM ${table};`)
      })

      cleanupSQL.push('')
      cleanupSQL.push('-- Step 2: Drop legacy tables (run after backup verification)')
      
      result.legacyTables.forEach(table => {
        cleanupSQL.push(`-- DROP TABLE IF EXISTS ${table} CASCADE;`)
      })

      cleanupSQL.push('')
      cleanupSQL.push('-- Step 3: Clean up backup tables (run after confirming system works)')
      result.legacyTables.forEach(table => {
        cleanupSQL.push(`-- DROP TABLE IF EXISTS ${table}_backup;`)
      })
    }

    return cleanupSQL
  }
}

// CLI execution
if (require.main === module) {
  const auditor = new DatabaseAuditor()
  
  auditor.performAudit()
    .then(async (result) => {
      console.log('\n🔧 Generating cleanup script...')
      const cleanupScript = await auditor.generateCleanupScript()
      
      if (cleanupScript.length > 0) {
        console.log('\n📝 CLEANUP SCRIPT:')
        cleanupScript.forEach(line => console.log(line))
      }
      
      process.exit(0)
    })
    .catch((error) => {
      console.error('🚨 Audit failed:', error)
      process.exit(1)
    })
}

export default DatabaseAuditor