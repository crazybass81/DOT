/**
 * Direct SQL Execution Script
 * Attempts to execute the migration using various approaches
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://mljyiuzetchtjudbcfvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function executeStepByStep() {
  console.log('🚀 Executing migration step by step...')
  
  try {
    // Step 1: Try to drop old tables (may fail due to RLS, that's ok)
    console.log('\\n🗑️  Step 1: Attempting to clean old system...')
    
    // We can't directly drop tables with anon key, so let's proceed to creation
    
    // Step 2: Create unified_identities table
    console.log('\\n👥 Step 2: Creating unified_identities table...')
    
    const unifiedIdentitiesSQL = `
      CREATE TABLE IF NOT EXISTS unified_identities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        full_name TEXT NOT NULL,
        birth_date DATE,
        id_type TEXT NOT NULL CHECK (id_type IN ('personal', 'business_owner', 'corporation', 'franchise_hq')) DEFAULT 'personal',
        id_number TEXT,
        business_verification_status TEXT DEFAULT 'pending' CHECK (business_verification_status IN ('pending', 'verified', 'rejected')),
        business_verification_data JSONB DEFAULT '{}',
        auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        profile_data JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // Try direct table creation through insert operation
    try {
      const { data, error } = await supabase
        .from('unified_identities')
        .select('count')
        .limit(1)
      
      if (error && error.message.includes('does not exist')) {
        console.log('❌ unified_identities table needs to be created manually')
        console.log('📋 SQL to execute in Supabase Dashboard:')
        console.log(unifiedIdentitiesSQL)
      } else {
        console.log('✅ unified_identities table already exists')
      }
    } catch (err) {
      console.log('❌ Error checking unified_identities:', err.message)
    }
    
    // Step 3: Manual creation guide
    console.log('\\n📋 MANUAL CREATION REQUIRED:')
    console.log('Since we cannot execute DDL statements directly with the anon key,')
    console.log('you need to create the tables manually in Supabase Dashboard.')
    console.log('\\nHere\\'s the simplified approach:')
    
    console.log('\\n1. UNIFIED IDENTITIES TABLE:')
    console.log(unifiedIdentitiesSQL)
    
    console.log('\\n2. ORGANIZATIONS_V3 TABLE:')
    console.log(\`
      CREATE TABLE IF NOT EXISTS organizations_v3 (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        display_name TEXT,
        org_type TEXT NOT NULL CHECK (org_type IN ('personal', 'business_owner', 'corporation', 'franchise_hq', 'franchise_store')) DEFAULT 'personal',
        parent_org_id UUID REFERENCES organizations_v3(id) ON DELETE SET NULL,
        owner_identity_id UUID NOT NULL REFERENCES unified_identities(id) ON DELETE RESTRICT,
        business_number TEXT,
        business_registration JSONB DEFAULT '{}',
        business_verification_status TEXT DEFAULT 'verified',
        settings JSONB DEFAULT '{"workingHours": {"start": "09:00", "end": "18:00"}, "approvalRequired": true}'::jsonb,
        max_employees INTEGER DEFAULT 10,
        max_locations INTEGER DEFAULT 1,
        subscription_tier TEXT DEFAULT 'basic',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(name)
      )
    `)
    
    console.log('\\n3. ROLE ASSIGNMENTS TABLE:')
    console.log(\`
      CREATE TABLE IF NOT EXISTS role_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identity_id UUID NOT NULL REFERENCES unified_identities(id) ON DELETE CASCADE,
        organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('master', 'admin', 'manager', 'worker', 'franchise_admin')),
        is_active BOOLEAN DEFAULT TRUE,
        is_primary BOOLEAN DEFAULT FALSE,
        custom_permissions JSONB DEFAULT '{}',
        access_restrictions JSONB DEFAULT '{}',
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        assigned_by UUID REFERENCES unified_identities(id),
        revoked_at TIMESTAMP WITH TIME ZONE,
        revoked_by UUID REFERENCES unified_identities(id),
        revocation_reason TEXT,
        metadata JSONB DEFAULT '{}',
        CHECK (CASE WHEN role = 'master' THEN organization_id IS NULL ELSE organization_id IS NOT NULL END),
        UNIQUE(identity_id, organization_id, role)
      )
    `)
    
    console.log('\\n4. Enable RLS on all tables:')
    console.log(\`
      ALTER TABLE unified_identities ENABLE ROW LEVEL SECURITY;
      ALTER TABLE organizations_v3 ENABLE ROW LEVEL SECURITY;
      ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
    \`)
    
    console.log('\\n5. Create basic RLS policies:')
    console.log(\`
      CREATE POLICY "Users can view own identity" ON unified_identities FOR SELECT USING (auth_user_id = auth.uid());
      CREATE POLICY "Users can update own identity" ON unified_identities FOR UPDATE USING (auth_user_id = auth.uid());
      CREATE POLICY "Allow identity creation for authenticated users" ON unified_identities FOR INSERT WITH CHECK (auth_user_id = auth.uid());
    \`)
    
    return true
    
  } catch (error) {
    console.error('❌ Step-by-step execution failed:', error.message)
    return false
  }
}

async function main() {
  console.log('⚡ Direct SQL Execution Attempt')
  console.log('===============================')
  
  await executeStepByStep()
  
  console.log('\\n📝 Next Steps:')
  console.log('1. Copy the SQL statements above')
  console.log('2. Go to Supabase Dashboard > SQL Editor')
  console.log('3. Execute each CREATE TABLE statement')
  console.log('4. Execute the RLS statements')
  console.log('5. Run verification: node scripts/verify-migration.js')
}

main().catch(console.error)