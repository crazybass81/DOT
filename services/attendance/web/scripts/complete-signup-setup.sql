-- Complete Real Email Signup Setup
-- Execute this SQL in Supabase Dashboard > SQL Editor

-- 1. Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'worker',
  employee_code TEXT,
  department TEXT,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create unified_identities table (if not exists)
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
);

-- 3. Create organizations_v3 table (if not exists)
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
);

-- 4. Create role_assignments table (if not exists)
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
  employee_code TEXT,
  department TEXT,
  position TEXT,
  CHECK (CASE WHEN role = 'master' THEN organization_id IS NULL ELSE organization_id IS NOT NULL END),
  UNIQUE(identity_id, organization_id, role)
);

-- 5. Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Create RLS policies for unified_identities
DROP POLICY IF EXISTS "Users can view own identity" ON unified_identities;
DROP POLICY IF EXISTS "Users can update own identity" ON unified_identities;
DROP POLICY IF EXISTS "Allow identity creation for authenticated users" ON unified_identities;

CREATE POLICY "Users can view own identity" ON unified_identities FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "Users can update own identity" ON unified_identities FOR UPDATE USING (auth_user_id = auth.uid());
CREATE POLICY "Allow identity creation for authenticated users" ON unified_identities FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- 8. Create RLS policies for organizations_v3
DROP POLICY IF EXISTS "Users can view own organizations" ON organizations_v3;
DROP POLICY IF EXISTS "Users can update own organizations" ON organizations_v3;

CREATE POLICY "Users can view own organizations" ON organizations_v3 FOR SELECT USING (
  owner_identity_id IN (SELECT id FROM unified_identities WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can update own organizations" ON organizations_v3 FOR UPDATE USING (
  owner_identity_id IN (SELECT id FROM unified_identities WHERE auth_user_id = auth.uid())
);

-- 9. Create RLS policies for role_assignments
DROP POLICY IF EXISTS "Users can view own role assignments" ON role_assignments;
DROP POLICY IF EXISTS "Users can update own role assignments" ON role_assignments;

CREATE POLICY "Users can view own role assignments" ON role_assignments FOR SELECT USING (
  identity_id IN (SELECT id FROM unified_identities WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can update own role assignments" ON role_assignments FOR UPDATE USING (
  identity_id IN (SELECT id FROM unified_identities WHERE auth_user_id = auth.uid())
);

-- 10. Create automatic profile creation function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'worker'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create automatic unified_identities creation function
CREATE OR REPLACE FUNCTION handle_new_user_identity()
RETURNS TRIGGER AS $$
DECLARE
  new_identity_id UUID;
  default_org_id UUID;
BEGIN
  -- Create unified identity
  INSERT INTO unified_identities (
    auth_user_id,
    email,
    full_name,
    id_type,
    is_verified,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'personal',
    true,
    true
  )
  RETURNING id INTO new_identity_id;

  -- Get or create default organization
  SELECT id INTO default_org_id FROM organizations_v3 WHERE code = 'default' LIMIT 1;
  
  IF default_org_id IS NULL THEN
    INSERT INTO organizations_v3 (
      code,
      name,
      display_name,
      org_type,
      owner_identity_id,
      is_active
    )
    VALUES (
      'default',
      'Default Organization',
      'DOT 출석 관리 시스템',
      'business_owner',
      new_identity_id,
      true
    )
    RETURNING id INTO default_org_id;
  END IF;

  -- Create default role assignment
  INSERT INTO role_assignments (
    identity_id,
    organization_id,
    role,
    is_active,
    is_primary,
    employee_code,
    department,
    position
  )
  VALUES (
    new_identity_id,
    default_org_id,
    'worker',
    true,
    true,
    NULL,
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create triggers for automatic user setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_identity ON auth.users;
CREATE TRIGGER on_auth_user_created_identity
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_identity();

-- 13. Create or update default organization if it doesn't exist
DO $$
DECLARE
  system_identity_id UUID;
  default_org_id UUID;
BEGIN
  -- Check if default organization exists
  SELECT id INTO default_org_id FROM organizations_v3 WHERE code = 'default' LIMIT 1;
  
  IF default_org_id IS NULL THEN
    -- Create system admin identity if it doesn't exist
    SELECT id INTO system_identity_id FROM unified_identities WHERE email = 'system@admin.com' LIMIT 1;
    
    IF system_identity_id IS NULL THEN
      INSERT INTO unified_identities (
        email,
        full_name,
        id_type,
        is_verified,
        is_active
      )
      VALUES (
        'system@admin.com',
        'System Admin',
        'personal',
        true,
        true
      )
      RETURNING id INTO system_identity_id;
    END IF;

    -- Create default organization
    INSERT INTO organizations_v3 (
      code,
      name,
      display_name,
      org_type,
      owner_identity_id,
      is_active
    )
    VALUES (
      'default',
      'Default Organization',
      'DOT 출석 관리 시스템',
      'business_owner',
      system_identity_id,
      true
    );
  END IF;
END $$;

-- 14. Grant necessary permissions (run as service role)
-- Note: These might need to be run separately with service role key

-- Final verification queries
SELECT 'Setup completed successfully!' as status;
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as identities_count FROM unified_identities;
SELECT COUNT(*) as organizations_count FROM organizations_v3;
SELECT COUNT(*) as role_assignments_count FROM role_assignments;