-- =====================================================
-- Phase 3: Zero-Downtime Migration Strategy
-- Gradual migration from old to new schema
-- =====================================================

-- =====================================================
-- 1. Create migration control table
-- =====================================================

CREATE TABLE IF NOT EXISTS migration_control (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(100) NOT NULL,
    phase VARCHAR(20) NOT NULL, -- 'planning', 'dual_write', 'migration', 'validation', 'cleanup'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. Create data synchronization views
-- =====================================================

-- View for unified identity data (combines old and new)
CREATE OR REPLACE VIEW v_unified_identities AS
SELECT 
    ui.id,
    ui.email,
    ui.phone,
    ui.full_name,
    ui.birth_date,
    ui.id_type,
    ui.is_verified,
    ui.verified_at,
    ui.verification_method,
    ui.age,
    ui.is_teen,
    ui.parent_consent_data,
    ui.parent_verified_at,
    ui.auth_user_id,
    ui.business_number,
    ui.business_name,
    ui.business_verification_status,
    ui.business_verified_at,
    ui.business_verification_data,
    ui.is_active,
    ui.created_at,
    ui.updated_at,
    'new' as source_table
FROM unified_identities ui
WHERE ui.is_active = true

UNION ALL

SELECT 
    u.id,
    u.email,
    COALESCE(e.phone, '010-0000-0000') as phone,
    COALESCE(e.name, 'Legacy User') as full_name,
    COALESCE(e.date_of_birth, '1990-01-01') as birth_date,
    'personal'::id_type as id_type,
    false as is_verified,
    null as verified_at,
    null as verification_method,
    EXTRACT(YEAR FROM age(COALESCE(e.date_of_birth, '1990-01-01'::date)))::integer as age,
    (EXTRACT(YEAR FROM age(COALESCE(e.date_of_birth, '1990-01-01'::date))) BETWEEN 15 AND 17) as is_teen,
    null as parent_consent_data,
    null as parent_verified_at,
    u.id as auth_user_id,
    null as business_number,
    null as business_name,
    'verified'::business_status as business_verification_status,
    null as business_verified_at,
    null as business_verification_data,
    u.is_active,
    u.created_at,
    u.updated_at,
    'legacy' as source_table
FROM users u
LEFT JOIN employees e ON e.auth_user_id = u.id
WHERE u.is_active = true
AND NOT EXISTS (SELECT 1 FROM unified_identities ui WHERE ui.auth_user_id = u.id);

-- View for unified organizations (combines old and new)
CREATE OR REPLACE VIEW v_unified_organizations AS
SELECT 
    o.id,
    o.code,
    o.name,
    o.display_name,
    o.description,
    o.logo_url,
    o.org_type as id_type,
    o.parent_org_id,
    o.owner_identity_id,
    o.business_registration,
    o.business_verification_status,
    o.settings,
    o.max_employees,
    o.max_locations,
    o.subscription_tier,
    o.subscription_expires_at,
    o.billing_data,
    o.is_active,
    o.suspended_at,
    o.suspension_reason,
    o.created_at,
    o.updated_at,
    'new' as source_table
FROM organizations_v3 o
WHERE o.is_active = true

UNION ALL

SELECT 
    org.id,
    COALESCE(org.code, upper(substring(md5(random()::text), 1, 12))) as code,
    org.name,
    org.name as display_name,
    org.description,
    org.logo_url,
    'personal'::id_type as id_type,
    null as parent_org_id,
    ui.id as owner_identity_id,
    '{}'::jsonb as business_registration,
    'verified'::business_status as business_verification_status,
    COALESCE(org.settings, '{}'::jsonb) as settings,
    COALESCE(org.max_employees, 50) as max_employees,
    10 as max_locations,
    'basic' as subscription_tier,
    null as subscription_expires_at,
    '{}'::jsonb as billing_data,
    org.is_active,
    null as suspended_at,
    null as suspension_reason,
    org.created_at,
    org.updated_at,
    'legacy' as source_table
FROM organizations org
JOIN users u ON u.organization_id = org.id AND u.role = 'admin'
JOIN unified_identities ui ON ui.auth_user_id = u.id
WHERE org.is_active = true
AND NOT EXISTS (SELECT 1 FROM organizations_v3 o WHERE o.id = org.id);

-- =====================================================
-- 3. Create dual-write triggers
-- =====================================================

-- Function to sync role changes to new table
CREATE OR REPLACE FUNCTION sync_role_to_new_table()
RETURNS TRIGGER AS $$
DECLARE
    identity_id UUID;
    org_id UUID;
    mapped_role unified_role;
BEGIN
    -- Skip if migration is complete
    IF EXISTS (SELECT 1 FROM migration_control WHERE migration_name = 'role_migration' AND status = 'completed') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Get identity ID
    SELECT ui.id INTO identity_id 
    FROM unified_identities ui 
    WHERE ui.auth_user_id = COALESCE(NEW.id, OLD.id);
    
    IF identity_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Map role
    mapped_role := CASE COALESCE(NEW.role, OLD.role)
        WHEN 'master_admin' THEN 'master'::unified_role
        WHEN 'admin' THEN 'admin'::unified_role
        WHEN 'manager' THEN 'manager'::unified_role
        ELSE 'worker'::unified_role
    END;

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Insert or update role assignment
        INSERT INTO role_assignments (
            identity_id,
            organization_id,
            role,
            is_active,
            assigned_at,
            assigned_by
        ) VALUES (
            identity_id,
            NEW.organization_id,
            mapped_role,
            NEW.is_active,
            NOW(),
            identity_id
        )
        ON CONFLICT (identity_id, organization_id, role) 
        DO UPDATE SET 
            is_active = EXCLUDED.is_active,
            revoked_at = CASE 
                WHEN EXCLUDED.is_active = false AND role_assignments.is_active = true 
                THEN NOW() 
                ELSE null 
            END;
    END IF;

    IF TG_OP = 'DELETE' THEN
        -- Deactivate role assignment
        UPDATE role_assignments 
        SET 
            is_active = false,
            revoked_at = NOW()
        WHERE identity_id = identity_id 
        AND organization_id = OLD.organization_id
        AND role = mapped_role;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table changes (legacy)
CREATE OR REPLACE TRIGGER sync_users_to_roles
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_role_to_new_table();

-- =====================================================
-- 4. Migration functions
-- =====================================================

-- Function to start migration phase
CREATE OR REPLACE FUNCTION start_migration_phase(
    p_migration_name VARCHAR,
    p_phase VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO migration_control (migration_name, phase, status, started_at)
    VALUES (p_migration_name, p_phase, 'in_progress', NOW())
    ON CONFLICT (migration_name, phase) 
    DO UPDATE SET 
        status = 'in_progress',
        started_at = NOW(),
        error_message = null;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to complete migration phase
CREATE OR REPLACE FUNCTION complete_migration_phase(
    p_migration_name VARCHAR,
    p_phase VARCHAR,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    final_status VARCHAR := CASE WHEN p_error_message IS NULL THEN 'completed' ELSE 'failed' END;
BEGIN
    UPDATE migration_control 
    SET 
        status = final_status,
        completed_at = NOW(),
        error_message = p_error_message
    WHERE migration_name = p_migration_name 
    AND phase = p_phase;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate specific user to new system
CREATE OR REPLACE FUNCTION migrate_user_to_unified(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
    employee_record RECORD;
    identity_id UUID;
    org_record RECORD;
BEGIN
    -- Get user data
    SELECT * INTO user_record FROM users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Get employee data if exists
    SELECT * INTO employee_record FROM employees WHERE auth_user_id = p_user_id;

    -- Check if already migrated
    IF EXISTS (SELECT 1 FROM unified_identities WHERE auth_user_id = p_user_id) THEN
        RETURN true;
    END IF;

    -- Create unified identity
    INSERT INTO unified_identities (
        auth_user_id,
        email,
        phone,
        full_name,
        birth_date,
        id_type,
        is_verified,
        is_active
    ) VALUES (
        user_record.id,
        user_record.email,
        COALESCE(employee_record.phone, '010-0000-' || lpad((random() * 10000)::int::text, 4, '0')),
        COALESCE(employee_record.name, 'Migrated User'),
        COALESCE(employee_record.date_of_birth, '1990-01-01'),
        'personal'::id_type,
        true,
        user_record.is_active
    )
    RETURNING id INTO identity_id;

    -- Migrate organization if user is admin and org doesn't exist in new table
    IF user_record.role = 'admin' AND user_record.organization_id IS NOT NULL THEN
        SELECT * INTO org_record FROM organizations WHERE id = user_record.organization_id;
        
        IF FOUND AND NOT EXISTS (SELECT 1 FROM organizations_v3 WHERE id = org_record.id) THEN
            INSERT INTO organizations_v3 (
                id,
                code,
                name,
                org_type,
                owner_identity_id,
                settings,
                max_employees,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                org_record.id,
                COALESCE(org_record.code, upper(substring(md5(random()::text), 1, 12))),
                org_record.name,
                'personal'::id_type,
                identity_id,
                COALESCE(org_record.settings, '{}'::jsonb),
                COALESCE(org_record.max_employees, 50),
                org_record.is_active,
                org_record.created_at,
                org_record.updated_at
            );
        END IF;
    END IF;

    -- Create role assignment
    IF user_record.organization_id IS NOT NULL THEN
        INSERT INTO role_assignments (
            identity_id,
            organization_id,
            role,
            is_active,
            assigned_at,
            assigned_by
        ) VALUES (
            identity_id,
            user_record.organization_id,
            CASE user_record.role
                WHEN 'master_admin' THEN 'master'::unified_role
                WHEN 'admin' THEN 'admin'::unified_role
                WHEN 'manager' THEN 'manager'::unified_role
                ELSE 'worker'::unified_role
            END,
            user_record.is_active,
            user_record.created_at,
            identity_id
        );
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate all users in batches
CREATE OR REPLACE FUNCTION migrate_all_users_to_unified(p_batch_size INTEGER DEFAULT 100)
RETURNS TABLE(
    total_processed INTEGER,
    successful_migrations INTEGER,
    failed_migrations INTEGER,
    error_details TEXT[]
) AS $$
DECLARE
    user_cursor CURSOR FOR 
        SELECT id FROM users 
        WHERE is_active = true 
        AND NOT EXISTS (SELECT 1 FROM unified_identities WHERE auth_user_id = users.id)
        ORDER BY created_at;
    
    current_user_id UUID;
    batch_count INTEGER := 0;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    error_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR user_record IN user_cursor LOOP
        BEGIN
            IF migrate_user_to_unified(user_record.id) THEN
                success_count := success_count + 1;
            ELSE
                error_count := error_count + 1;
                error_list := array_append(error_list, 'Failed to migrate user: ' || user_record.id);
            END IF;
            
            batch_count := batch_count + 1;
            
            -- Commit batch and pause briefly
            IF batch_count % p_batch_size = 0 THEN
                COMMIT;
                PERFORM pg_sleep(0.1); -- 100ms pause between batches
            END IF;
            
        EXCEPTION WHEN others THEN
            error_count := error_count + 1;
            error_list := array_append(error_list, 
                'Exception migrating user ' || user_record.id || ': ' || SQLERRM);
        END;
    END LOOP;

    RETURN QUERY SELECT batch_count, success_count, error_count, error_list;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. Data validation functions
-- =====================================================

-- Function to validate migration completeness
CREATE OR REPLACE FUNCTION validate_migration_completeness()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    expected_count INTEGER,
    actual_count INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Check identity migration
    RETURN QUERY
    SELECT 
        'Identity Migration'::TEXT as check_name,
        CASE 
            WHEN legacy_count = migrated_count THEN 'PASS'
            ELSE 'FAIL'
        END as status,
        legacy_count as expected_count,
        migrated_count as actual_count,
        CASE 
            WHEN legacy_count = migrated_count THEN 'All users migrated successfully'
            ELSE 'Missing ' || (legacy_count - migrated_count)::TEXT || ' user migrations'
        END as details
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM users WHERE is_active = true) as legacy_count,
            (SELECT COUNT(*) FROM unified_identities WHERE auth_user_id IS NOT NULL) as migrated_count
    ) counts;

    -- Check organization migration
    RETURN QUERY
    SELECT 
        'Organization Migration'::TEXT as check_name,
        CASE 
            WHEN legacy_count = migrated_count THEN 'PASS'
            ELSE 'FAIL'
        END as status,
        legacy_count as expected_count,
        migrated_count as actual_count,
        CASE 
            WHEN legacy_count = migrated_count THEN 'All organizations migrated successfully'
            ELSE 'Missing ' || (legacy_count - migrated_count)::TEXT || ' organization migrations'
        END as details
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM organizations WHERE is_active = true) as legacy_count,
            (SELECT COUNT(*) FROM organizations_v3 WHERE id IN (SELECT id FROM organizations)) as migrated_count
    ) counts;

    -- Check role migration
    RETURN QUERY
    SELECT 
        'Role Migration'::TEXT as check_name,
        CASE 
            WHEN legacy_count = migrated_count THEN 'PASS'
            ELSE 'FAIL'
        END as status,
        legacy_count as expected_count,
        migrated_count as actual_count,
        CASE 
            WHEN legacy_count = migrated_count THEN 'All roles migrated successfully'
            ELSE 'Missing ' || (legacy_count - migrated_count)::TEXT || ' role migrations'
        END as details
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM users WHERE is_active = true AND organization_id IS NOT NULL) as legacy_count,
            (SELECT COUNT(*) FROM role_assignments WHERE is_active = true) as migrated_count
    ) counts;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Rollback functions
-- =====================================================

-- Function to rollback migration
CREATE OR REPLACE FUNCTION rollback_migration(p_migration_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- Disable triggers
    ALTER TABLE users DISABLE TRIGGER sync_users_to_roles;
    
    -- Remove migrated data (keep only data that was created in new system)
    DELETE FROM role_assignments 
    WHERE identity_id IN (
        SELECT id FROM unified_identities WHERE auth_user_id IS NOT NULL
    );
    
    DELETE FROM organizations_v3 
    WHERE id IN (SELECT id FROM organizations);
    
    DELETE FROM unified_identities 
    WHERE auth_user_id IS NOT NULL;
    
    -- Mark migration as failed
    UPDATE migration_control 
    SET status = 'failed', error_message = 'Manual rollback executed'
    WHERE migration_name = p_migration_name;
    
    -- Re-enable triggers
    ALTER TABLE users ENABLE TRIGGER sync_users_to_roles;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Create indexes for migration views
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_migration_control_name_phase ON migration_control(migration_name, phase);
CREATE INDEX IF NOT EXISTS idx_users_migration_status ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_organizations_migration_status ON organizations(is_active) WHERE is_active = true;

-- =====================================================
-- 8. Initial migration state
-- =====================================================

-- Insert initial migration control records
INSERT INTO migration_control (migration_name, phase, status) VALUES
('identity_migration', 'planning', 'pending'),
('organization_migration', 'planning', 'pending'),
('role_migration', 'planning', 'pending')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. Comments and documentation
-- =====================================================

COMMENT ON TABLE migration_control IS 'Controls zero-downtime migration phases and status';
COMMENT ON VIEW v_unified_identities IS 'Unified view of identities from both old and new tables during migration';
COMMENT ON VIEW v_unified_organizations IS 'Unified view of organizations from both old and new tables during migration';
COMMENT ON FUNCTION migrate_user_to_unified IS 'Migrates a single user from legacy to unified system';
COMMENT ON FUNCTION migrate_all_users_to_unified IS 'Batch migration of all users with error handling';
COMMENT ON FUNCTION validate_migration_completeness IS 'Validates that migration was completed successfully';
COMMENT ON FUNCTION rollback_migration IS 'Rolls back migration in case of critical issues';