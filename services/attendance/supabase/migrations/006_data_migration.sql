-- Data Migration from Legacy Tables to Unified System
-- This script migrates existing data to the new unified identity system

BEGIN;

-- =================================
-- 1. MIGRATE EXISTING AUTH USERS TO UNIFIED_IDENTITIES
-- =================================

-- Insert existing auth users into unified_identities
-- Default to 'personal' type for existing users
INSERT INTO unified_identities (
  id,
  email,
  phone,
  full_name,
  id_type,
  auth_user_id,
  is_verified,
  is_active,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  COALESCE(au.email, 'unknown@example.com') as email,
  au.phone as phone,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ) as full_name,
  'personal' as id_type, -- Default to personal for existing users
  au.id as auth_user_id,
  au.email_confirmed_at IS NOT NULL as is_verified,
  true as is_active,
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM unified_identities ui WHERE ui.auth_user_id = au.id
)
ON CONFLICT (auth_user_id) DO NOTHING;

-- =================================
-- 2. CREATE DEFAULT ORGANIZATION FOR EXISTING USERS
-- =================================

-- Function to generate unique org codes
CREATE OR REPLACE FUNCTION generate_org_code() RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  WHILE attempts < max_attempts LOOP
    result := '';
    FOR i IN 1..4 LOOP
      result := result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM organizations_v3 WHERE code = result) THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
  END LOOP;
  
  -- If we can't generate a unique code, raise an error
  RAISE EXCEPTION 'Unable to generate unique organization code after % attempts', max_attempts;
END;
$$ LANGUAGE plpgsql;

-- Create default organizations for existing users who don't have one
-- This creates a personal organization for each user
INSERT INTO organizations_v3 (
  id,
  code,
  name,
  display_name,
  org_type,
  owner_identity_id,
  business_verification_status,
  is_active,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  generate_org_code() as code,
  ui.full_name || '''s Organization' as name,
  ui.full_name || '''s Workspace' as display_name,
  'personal' as org_type,
  ui.id as owner_identity_id,
  'verified' as business_verification_status, -- Auto-verify personal orgs
  true as is_active,
  ui.created_at,
  NOW() as updated_at
FROM unified_identities ui
WHERE NOT EXISTS (
  SELECT 1 FROM organizations_v3 o WHERE o.owner_identity_id = ui.id
)
AND ui.id_type = 'personal';

-- =================================
-- 3. MIGRATE EXISTING ROLE ASSIGNMENTS
-- =================================

-- First, check if we have existing user roles or permissions tables
-- This is a placeholder - adjust based on your actual legacy schema

-- Create admin role for organization owners
INSERT INTO role_assignments (
  id,
  identity_id,
  organization_id,
  role,
  is_active,
  is_primary,
  assigned_at,
  assigned_by
)
SELECT 
  gen_random_uuid() as id,
  o.owner_identity_id,
  o.id as organization_id,
  'admin' as role,
  true as is_active,
  true as is_primary,
  o.created_at as assigned_at,
  o.owner_identity_id as assigned_by -- Self-assigned
FROM organizations_v3 o
WHERE NOT EXISTS (
  SELECT 1 FROM role_assignments ra 
  WHERE ra.identity_id = o.owner_identity_id 
    AND ra.organization_id = o.id 
    AND ra.role = 'admin'
);

-- =================================
-- 4. CREATE MASTER ADMIN ROLE
-- =================================

-- Ensure master admin exists
-- Look for existing master admin by email
DO $$
DECLARE
  master_identity_id UUID;
  master_auth_id UUID;
BEGIN
  -- Try to find existing master admin by email
  SELECT auth_user_id INTO master_auth_id 
  FROM auth.users 
  WHERE email = 'archt723@gmail.com';
  
  IF master_auth_id IS NOT NULL THEN
    -- Get or create unified identity for master admin
    SELECT id INTO master_identity_id 
    FROM unified_identities 
    WHERE auth_user_id = master_auth_id;
    
    IF master_identity_id IS NULL THEN
      -- Create unified identity for master admin
      INSERT INTO unified_identities (
        email,
        full_name,
        id_type,
        auth_user_id,
        is_verified,
        is_active
      ) VALUES (
        'archt723@gmail.com',
        'Master Administrator',
        'personal',
        master_auth_id,
        true,
        true
      ) RETURNING id INTO master_identity_id;
    END IF;
    
    -- Create master role assignment
    INSERT INTO role_assignments (
      identity_id,
      organization_id,
      role,
      is_active,
      is_primary,
      assigned_by
    ) VALUES (
      master_identity_id,
      NULL, -- Master role has no organization
      'master',
      true,
      true,
      master_identity_id -- Self-assigned
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Master admin role assigned to existing user: %', master_identity_id;
  ELSE
    RAISE NOTICE 'Master admin user not found in auth.users table';
  END IF;
END $$;

-- =================================
-- 5. DATA VALIDATION AND CLEANUP
-- =================================

-- Verify data integrity
DO $$
DECLARE
  identity_count INTEGER;
  org_count INTEGER;
  role_count INTEGER;
  master_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO identity_count FROM unified_identities;
  SELECT COUNT(*) INTO org_count FROM organizations_v3;
  SELECT COUNT(*) INTO role_count FROM role_assignments;
  SELECT COUNT(*) INTO master_count FROM role_assignments WHERE role = 'master';
  
  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '- Unified identities: %', identity_count;
  RAISE NOTICE '- Organizations: %', org_count;
  RAISE NOTICE '- Role assignments: %', role_count;
  RAISE NOTICE '- Master admins: %', master_count;
  
  -- Basic validation
  IF identity_count = 0 THEN
    RAISE EXCEPTION 'No identities were migrated - check auth.users table';
  END IF;
  
  IF master_count = 0 THEN
    RAISE WARNING 'No master admin found - system may not be accessible';
  END IF;
END $$;

-- =================================
-- 6. CREATE HELPER VIEWS
-- =================================

-- View for user roles with organization info
CREATE OR REPLACE VIEW user_roles_view AS
SELECT 
  ui.id as identity_id,
  ui.email,
  ui.full_name,
  ui.id_type,
  ra.role,
  o.id as organization_id,
  o.name as organization_name,
  o.code as organization_code,
  o.org_type as organization_type,
  ra.is_active,
  ra.is_primary,
  ra.assigned_at
FROM unified_identities ui
LEFT JOIN role_assignments ra ON ui.id = ra.identity_id AND ra.is_active = true
LEFT JOIN organizations_v3 o ON ra.organization_id = o.id AND o.is_active = true
ORDER BY ui.email, ra.is_primary DESC, ra.assigned_at DESC;

-- View for organization hierarchy
CREATE OR REPLACE VIEW organization_hierarchy_view AS
WITH RECURSIVE org_tree AS (
  -- Base case: root organizations (no parent)
  SELECT 
    id,
    code,
    name,
    org_type,
    parent_org_id,
    owner_identity_id,
    0 as level,
    ARRAY[name] as path,
    name as root_name
  FROM organizations_v3 
  WHERE parent_org_id IS NULL AND is_active = true
  
  UNION ALL
  
  -- Recursive case: child organizations
  SELECT 
    o.id,
    o.code,
    o.name,
    o.org_type,
    o.parent_org_id,
    o.owner_identity_id,
    ot.level + 1,
    ot.path || o.name,
    ot.root_name
  FROM organizations_v3 o
  JOIN org_tree ot ON o.parent_org_id = ot.id
  WHERE o.is_active = true
)
SELECT * FROM org_tree ORDER BY root_name, level, name;

-- Clean up temporary function
DROP FUNCTION IF EXISTS generate_org_code();

COMMIT;

-- Final verification queries (run manually if needed)
-- SELECT 'Identities' as table_name, count(*) as count FROM unified_identities
-- UNION ALL
-- SELECT 'Organizations', count(*) FROM organizations_v3  
-- UNION ALL
-- SELECT 'Role Assignments', count(*) FROM role_assignments
-- UNION ALL  
-- SELECT 'Master Admins', count(*) FROM role_assignments WHERE role = 'master';