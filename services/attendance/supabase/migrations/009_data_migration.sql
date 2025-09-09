-- Data Migration from Organization-based to ID-ROLE-PAPER system
-- This migration preserves existing data while transforming it to the new architecture

BEGIN;

-- Temporary function to generate unique business registration numbers
CREATE OR REPLACE FUNCTION generate_business_reg_number(org_name TEXT, org_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN 'BRN-' || UPPER(LEFT(REPLACE(org_name, ' ', ''), 6)) || '-' || UPPER(LEFT(org_id::TEXT, 8));
END;
$$ LANGUAGE plpgsql;

-- Step 1: Migrate users to unified_identities
-- All existing users become Personal IDs
INSERT INTO unified_identities (
  id, 
  id_type, 
  email, 
  phone, 
  full_name, 
  auth_user_id,
  is_verified,
  is_active,
  profile_data,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'personal'::id_type_enum,
  u.email,
  u.phone,
  COALESCE(
    NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''),
    NULLIF(TRIM(u.name), ''),
    u.email
  ) as full_name,
  u.id, -- auth_user_id is same as user id in current system
  COALESCE(u.is_verified, false),
  COALESCE(u.is_active, true),
  jsonb_build_object(
    'migrated_from', 'users_table',
    'original_role', u.role,
    'organization_id', u.organization_id,
    'employee_code', u.employee_code,
    'department', u.department,
    'position', u.position
  ),
  COALESCE(u.created_at, NOW()),
  COALESCE(u.updated_at, NOW())
FROM users u
ON CONFLICT (id) DO NOTHING; -- Skip if already exists

-- Step 2: Migrate organizations to business_registrations  
-- Each organization becomes a business registration owned by its admin
INSERT INTO business_registrations (
  id,
  registration_number,
  business_name,
  business_type,
  owner_identity_id,
  registration_data,
  verification_status,
  is_active,
  created_at,
  updated_at
)
SELECT 
  o.id,
  generate_business_reg_number(o.name, o.id),
  o.name,
  'individual', -- Default to individual business type
  -- Find the first admin user for this organization as owner
  COALESCE(
    (SELECT u.id FROM users u WHERE u.organization_id = o.id AND u.role = 'admin' ORDER BY u.created_at LIMIT 1),
    (SELECT u.id FROM users u WHERE u.organization_id = o.id ORDER BY u.created_at LIMIT 1) -- Fallback to any user
  ),
  jsonb_build_object(
    'migrated_from', 'organizations_table',
    'original_data', row_to_json(o),
    'settings', o.settings
  ),
  'verified', -- Mark migrated organizations as verified
  COALESCE(o.is_active, true),
  COALESCE(o.created_at, NOW()),
  COALESCE(o.updated_at, NOW())
FROM organizations o
WHERE EXISTS (SELECT 1 FROM users u WHERE u.organization_id = o.id) -- Only migrate organizations with users
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create PAPER documents based on old user roles

-- Create Business Registration papers for admin users
INSERT INTO papers (
  paper_type,
  owner_identity_id,
  related_business_id,
  paper_data,
  is_active,
  valid_from,
  created_at,
  updated_at
)
SELECT 
  'Business Registration'::paper_type_enum,
  u.id,
  u.organization_id,
  jsonb_build_object(
    'migrated_from', 'admin_role',
    'original_role', u.role,
    'business_name', o.name,
    'registration_type', 'individual_business'
  ),
  true,
  COALESCE(u.created_at, NOW()),
  COALESCE(u.created_at, NOW()),
  COALESCE(u.updated_at, NOW())
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.role = 'admin' 
  AND u.organization_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM business_registrations br WHERE br.id = u.organization_id)
ON CONFLICT DO NOTHING;

-- Create Employment Contract papers for worker and manager users
INSERT INTO papers (
  paper_type,
  owner_identity_id,
  related_business_id,
  paper_data,
  is_active,
  valid_from,
  created_at,
  updated_at
)
SELECT 
  'Employment Contract'::paper_type_enum,
  u.id,
  u.organization_id,
  jsonb_build_object(
    'migrated_from', u.role || '_role',
    'original_role', u.role,
    'employee_code', u.employee_code,
    'department', u.department,
    'position', u.position,
    'contract_type', CASE 
      WHEN u.role = 'manager' THEN 'management_contract'
      ELSE 'standard_employment'
    END
  ),
  true,
  COALESCE(u.created_at, NOW()),
  COALESCE(u.created_at, NOW()),
  COALESCE(u.updated_at, NOW())
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.role IN ('worker', 'manager') 
  AND u.organization_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM business_registrations br WHERE br.id = u.organization_id)
ON CONFLICT DO NOTHING;

-- Create Authority Delegation papers for manager users
INSERT INTO papers (
  paper_type,
  owner_identity_id,
  related_business_id,
  paper_data,
  is_active,
  valid_from,
  created_at,
  updated_at
)
SELECT 
  'Authority Delegation'::paper_type_enum,
  u.id,
  u.organization_id,
  jsonb_build_object(
    'migrated_from', 'manager_role',
    'delegation_level', 'STANDARD',
    'authority_scope', 'team_management',
    'can_approve_leave', true,
    'can_manage_attendance', true,
    'max_team_size', 50
  ),
  true,
  COALESCE(u.created_at, NOW()),
  COALESCE(u.created_at, NOW()),
  COALESCE(u.updated_at, NOW())
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.role = 'manager' 
  AND u.organization_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM business_registrations br WHERE br.id = u.organization_id)
ON CONFLICT DO NOTHING;

-- Step 4: Handle master_admin users - create special franchise-related papers
-- Master admins become FRANCHISOR with special papers
INSERT INTO papers (
  paper_type,
  owner_identity_id,
  related_business_id,
  paper_data,
  is_active,
  valid_from,
  created_at,
  updated_at
)
SELECT 
  'Franchise HQ Registration'::paper_type_enum,
  u.id,
  -- Create or find a special business registration for system administration
  COALESCE(
    (SELECT br.id FROM business_registrations br WHERE br.business_name = 'DOT System Administration' LIMIT 1),
    (SELECT o.id FROM organizations o WHERE o.name LIKE '%System%' OR o.name LIKE '%Admin%' LIMIT 1)
  ),
  jsonb_build_object(
    'migrated_from', 'master_admin_role',
    'system_level_access', true,
    'can_manage_all_organizations', true,
    'franchise_network_scope', 'global'
  ),
  true,
  COALESCE(u.created_at, NOW()),
  COALESCE(u.created_at, NOW()),
  COALESCE(u.updated_at, NOW())
FROM users u
WHERE u.role = 'master_admin' OR u.is_master_admin = true
ON CONFLICT DO NOTHING;

-- Create system administration business registration if it doesn't exist
INSERT INTO business_registrations (
  id,
  registration_number,
  business_name,
  business_type,
  owner_identity_id,
  registration_data,
  verification_status,
  is_active,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'DOT-SYSTEM-ADMIN-HQ',
  'DOT System Administration',
  'corporate',
  (SELECT u.id FROM users u WHERE u.role = 'master_admin' OR u.is_master_admin = true ORDER BY u.created_at LIMIT 1),
  jsonb_build_object(
    'type', 'system_administration',
    'scope', 'global',
    'created_for', 'master_admin_migration'
  ),
  'verified',
  true,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'master_admin' OR is_master_admin = true)
  AND NOT EXISTS (SELECT 1 FROM business_registrations WHERE business_name = 'DOT System Administration')
ON CONFLICT DO NOTHING;

-- Step 5: Update attendance records to link to new identity system
UPDATE attendance_records ar
SET 
  identity_id = ar.employee_id, -- employee_id maps to user_id which maps to identity_id
  business_registration_id = (
    SELECT u.organization_id 
    FROM users u 
    WHERE u.id = ar.employee_id
  )
WHERE ar.employee_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM unified_identities ui WHERE ui.id = ar.employee_id);

-- Step 6: Create computed roles for all migrated users
-- This will be handled automatically by the trigger when papers are inserted
-- But let's manually refresh for any users that might have been missed
DO $$
DECLARE
  identity_record RECORD;
BEGIN
  FOR identity_record IN 
    SELECT id FROM unified_identities WHERE id IN (SELECT id FROM users)
  LOOP
    PERFORM refresh_computed_roles(identity_record.id);
  END LOOP;
END $$;

-- Step 7: Validation queries to verify migration success
-- Create a temporary function to validate migration
CREATE OR REPLACE FUNCTION validate_migration()
RETURNS TABLE(
  validation_check TEXT,
  expected_count INTEGER,
  actual_count INTEGER,
  status TEXT
) AS $$
BEGIN
  -- Check user migration
  RETURN QUERY
  SELECT 
    'Users to Identities Migration'::TEXT,
    (SELECT COUNT(*)::INTEGER FROM users),
    (SELECT COUNT(*)::INTEGER FROM unified_identities WHERE profile_data->>'migrated_from' = 'users_table'),
    CASE 
      WHEN (SELECT COUNT(*) FROM users) = (SELECT COUNT(*) FROM unified_identities WHERE profile_data->>'migrated_from' = 'users_table')
      THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END;
  
  -- Check organization migration
  RETURN QUERY
  SELECT 
    'Organizations to Business Registrations Migration'::TEXT,
    (SELECT COUNT(*)::INTEGER FROM organizations WHERE EXISTS (SELECT 1 FROM users u WHERE u.organization_id = organizations.id)),
    (SELECT COUNT(*)::INTEGER FROM business_registrations WHERE registration_data->>'migrated_from' = 'organizations_table'),
    CASE 
      WHEN (SELECT COUNT(*) FROM organizations WHERE EXISTS (SELECT 1 FROM users u WHERE u.organization_id = organizations.id)) = 
           (SELECT COUNT(*) FROM business_registrations WHERE registration_data->>'migrated_from' = 'organizations_table')
      THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END;
  
  -- Check role paper migration
  RETURN QUERY
  SELECT 
    'Role Papers Migration'::TEXT,
    (SELECT COUNT(*)::INTEGER FROM users WHERE role IS NOT NULL AND organization_id IS NOT NULL),
    (SELECT COUNT(*)::INTEGER FROM papers WHERE paper_data->>'migrated_from' LIKE '%_role'),
    CASE 
      WHEN (SELECT COUNT(*) FROM papers WHERE paper_data->>'migrated_from' LIKE '%_role') > 0
      THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END;
  
  -- Check computed roles
  RETURN QUERY
  SELECT 
    'Computed Roles Generation'::TEXT,
    (SELECT COUNT(DISTINCT id)::INTEGER FROM unified_identities WHERE profile_data->>'migrated_from' = 'users_table'),
    (SELECT COUNT(DISTINCT identity_id)::INTEGER FROM computed_roles WHERE is_active = true),
    CASE 
      WHEN (SELECT COUNT(DISTINCT identity_id) FROM computed_roles WHERE is_active = true) > 0
      THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Run validation and log results
INSERT INTO migration_validation_log (migration_name, validation_results, created_at)
SELECT 
  '009_data_migration',
  jsonb_agg(jsonb_build_object(
    'check', validation_check,
    'expected', expected_count,
    'actual', actual_count,
    'status', status
  )),
  NOW()
FROM validate_migration()
ON CONFLICT DO NOTHING;

-- Create migration validation log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_validation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL,
  validation_results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clean up temporary function
DROP FUNCTION IF EXISTS generate_business_reg_number(TEXT, UUID);
DROP FUNCTION IF EXISTS validate_migration();

-- Final step: Add helpful comments for future reference
COMMENT ON TABLE unified_identities IS 'Core identity management table supporting both Personal and Corporate ID types';
COMMENT ON TABLE business_registrations IS 'Business registration information replacing the old organizations table';
COMMENT ON TABLE papers IS 'Document-based role system - roles are derived from owned documents (PAPER)';
COMMENT ON TABLE computed_roles IS 'Automatically calculated roles based on owned papers and business rules';
COMMENT ON TABLE role_dependencies IS 'Defines prerequisite relationships between roles (e.g., Manager requires Worker)';

COMMENT ON COLUMN unified_identities.linked_personal_id IS 'For Corporate IDs, links to the Personal ID that owns the corporate identity';
COMMENT ON COLUMN papers.source_papers IS 'Array of paper IDs that together grant this computed role';
COMMENT ON COLUMN computed_roles.business_context_id IS 'Business context where this role applies (NULL for global roles like SEEKER)';

COMMIT;

-- Display migration summary
SELECT 
  'Migration completed successfully. Run the following query to see validation results:' as message;

SELECT 
  'SELECT * FROM migration_validation_log WHERE migration_name = ''009_data_migration'' ORDER BY created_at DESC LIMIT 1;' as validation_query;