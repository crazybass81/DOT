-- =====================================================
-- Phase 1: Schema Consolidation Migration
-- Integrates old and new schema with proper migration path
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. Create consolidated enums
-- =====================================================

-- Unified ID types (replacing mixed terminology)
DO $$ BEGIN
    CREATE TYPE id_type AS ENUM (
        'personal',         -- 개인 (기본 신원)
        'business_owner',   -- 개인사업자 
        'corporation',      -- 법인
        'franchise_hq',     -- 프랜차이즈 본사
        'franchise_store'   -- 프랜차이즈 가맹점
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Unified role types (consolidating multiple role enums)
DO $$ BEGIN
    CREATE TYPE unified_role AS ENUM (
        'master',           -- 시스템 관리자
        'admin',           -- 사업장 관리자 (개인/법인)
        'manager',         -- 매니저
        'worker',          -- 일반 직원
        'franchise_admin'  -- 프랜차이즈 본사 관리자
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Business verification status
DO $$ BEGIN
    CREATE TYPE business_status AS ENUM (
        'unverified',
        'pending',
        'verified',
        'suspended',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. Create unified identity table
-- =====================================================

CREATE TABLE IF NOT EXISTS unified_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core identity (immutable)
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    
    -- Identity type and verification
    id_type id_type NOT NULL DEFAULT 'personal',
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verification_method VARCHAR(50),
    
    -- Age and teen status (computed)
    age INTEGER GENERATED ALWAYS AS (
        EXTRACT(YEAR FROM age(birth_date))
    ) STORED,
    is_teen BOOLEAN GENERATED ALWAYS AS (
        EXTRACT(YEAR FROM age(birth_date)) BETWEEN 15 AND 17
    ) STORED,
    
    -- Teen-specific data
    parent_consent_data JSONB,
    parent_verified_at TIMESTAMPTZ,
    
    -- Supabase auth integration
    auth_user_id UUID UNIQUE,
    
    -- Business-specific data (for business owners)
    business_number VARCHAR(20) UNIQUE,
    business_name VARCHAR(255),
    business_verification_status business_status DEFAULT 'unverified',
    business_verified_at TIMESTAMPTZ,
    business_verification_data JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT valid_phone CHECK (
        phone ~ '^[0-9-]+$'
    ),
    CONSTRAINT valid_age CHECK (
        birth_date <= CURRENT_DATE - INTERVAL '15 years'
    ),
    CONSTRAINT business_data_consistency CHECK (
        (id_type IN ('business_owner', 'corporation') AND business_number IS NOT NULL) OR
        (id_type NOT IN ('business_owner', 'corporation') AND business_number IS NULL)
    )
);

-- =====================================================
-- 3. Create organizations table (v3)
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations_v3 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(12) UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text), 1, 12)),
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    logo_url TEXT,
    
    -- Organization type and hierarchy
    org_type id_type NOT NULL,
    parent_org_id UUID REFERENCES organizations_v3(id),
    
    -- Ownership (must be personal or business identity)
    owner_identity_id UUID NOT NULL REFERENCES unified_identities(id),
    
    -- Business registration data
    business_registration JSONB DEFAULT '{}',
    business_verification_status business_status DEFAULT 'unverified',
    
    -- Settings and limits
    settings JSONB DEFAULT '{
        "workingHours": {"start": "09:00", "end": "18:00"},
        "overtimePolicy": {"enabled": true, "threshold": 480},
        "gpsTracking": {"enabled": true, "radius": 100},
        "approvalRequired": true
    }',
    max_employees INTEGER DEFAULT 50,
    max_locations INTEGER DEFAULT 10,
    
    -- Subscription and billing
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMPTZ,
    billing_data JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    suspended_at TIMESTAMPTZ,
    suspension_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT franchise_hierarchy CHECK (
        (org_type = 'franchise_store' AND parent_org_id IS NOT NULL) OR
        (org_type != 'franchise_store')
    ),
    CONSTRAINT owner_business_consistency CHECK (
        (org_type IN ('business_owner', 'corporation') AND 
         EXISTS(SELECT 1 FROM unified_identities ui 
                WHERE ui.id = owner_identity_id AND ui.id_type = org_type)) OR
        (org_type NOT IN ('business_owner', 'corporation'))
    )
);

-- =====================================================
-- 4. Create role assignments table
-- =====================================================

CREATE TABLE IF NOT EXISTS role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identity and organization
    identity_id UUID NOT NULL REFERENCES unified_identities(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
    
    -- Role definition
    role unified_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false, -- Primary role for login
    
    -- Permissions (role-specific overrides)
    custom_permissions JSONB DEFAULT '{}',
    access_restrictions JSONB DEFAULT '{}',
    
    -- Assignment tracking
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES unified_identities(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES unified_identities(id),
    revocation_reason TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT unique_active_role UNIQUE (identity_id, organization_id, role, is_active),
    CONSTRAINT master_role_no_org CHECK (
        (role = 'master' AND organization_id IS NULL) OR
        (role != 'master' AND organization_id IS NOT NULL)
    ),
    CONSTRAINT franchise_admin_hierarchy CHECK (
        (role = 'franchise_admin' AND 
         EXISTS(SELECT 1 FROM organizations_v3 o 
                WHERE o.id = organization_id AND o.org_type = 'franchise_hq')) OR
        (role != 'franchise_admin')
    )
);

-- =====================================================
-- 5. Create employment contracts table (v2)
-- =====================================================

CREATE TABLE IF NOT EXISTS employment_contracts_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(100) UNIQUE NOT NULL DEFAULT 'EMP-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('contract_seq')::text, 6, '0'),
    
    -- Parties
    employee_id UUID NOT NULL REFERENCES unified_identities(id),
    employer_org_id UUID NOT NULL REFERENCES organizations_v3(id),
    
    -- Position details
    position_title VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    reporting_manager_id UUID REFERENCES unified_identities(id),
    
    -- Employment terms
    employment_type VARCHAR(50) NOT NULL CHECK (employment_type IN ('permanent', 'fixed_term', 'part_time', 'internship')),
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for permanent
    probation_period_months INTEGER DEFAULT 0,
    
    -- Compensation
    salary_type VARCHAR(20) NOT NULL CHECK (salary_type IN ('hourly', 'daily', 'monthly', 'annual')),
    salary_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KRW',
    
    -- Working conditions
    weekly_work_hours INTEGER NOT NULL DEFAULT 40,
    work_schedule JSONB DEFAULT '{"days": [1,2,3,4,5], "start": "09:00", "end": "18:00"}',
    break_minutes INTEGER DEFAULT 60,
    
    -- Contract status
    status VARCHAR(20) DEFAULT 'draft' CHECK (
        status IN ('draft', 'pending_approval', 'active', 'suspended', 'terminated', 'expired')
    ),
    
    -- Signature and approval
    employee_signed_at TIMESTAMPTZ,
    employer_signed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES unified_identities(id),
    approved_at TIMESTAMPTZ,
    
    -- Teen employment compliance
    teen_work_permit_data JSONB,
    parent_guardian_consent JSONB,
    
    -- Document management
    contract_documents JSONB DEFAULT '[]',
    
    -- Termination data
    terminated_at TIMESTAMPTZ,
    termination_reason TEXT,
    termination_type VARCHAR(50), -- voluntary, involuntary, mutual, expiry
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT teen_compliance CHECK (
        (SELECT is_teen FROM unified_identities WHERE id = employee_id) = false OR
        (parent_guardian_consent IS NOT NULL AND teen_work_permit_data IS NOT NULL)
    ),
    CONSTRAINT salary_positive CHECK (salary_amount > 0),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- Create contract number sequence
CREATE SEQUENCE IF NOT EXISTS contract_seq;

-- =====================================================
-- 6. Migration functions
-- =====================================================

-- Function to migrate existing data
CREATE OR REPLACE FUNCTION migrate_existing_data()
RETURNS VOID AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Migrate users to unified_identities
    INSERT INTO unified_identities (
        auth_user_id, email, full_name, birth_date, phone, id_type, is_active, created_at, updated_at
    )
    SELECT 
        id, email, 'Migrated User', '1990-01-01'::date, 
        COALESCE(phone, '010-0000-' || lpad((ROW_NUMBER() OVER())::text, 4, '0')),
        'personal'::id_type, is_active, created_at, updated_at
    FROM users
    WHERE NOT EXISTS (SELECT 1 FROM unified_identities WHERE auth_user_id = users.id)
    ON CONFLICT (email) DO NOTHING;

    -- Migrate organizations
    INSERT INTO organizations_v3 (
        id, name, code, org_type, owner_identity_id, settings, is_active, created_at, updated_at
    )
    SELECT 
        o.id, o.name, 
        COALESCE(o.code, upper(substring(md5(random()::text), 1, 12))),
        'personal'::id_type,
        ui.id,
        COALESCE(o.settings, '{}'::jsonb),
        o.is_active, o.created_at, o.updated_at
    FROM organizations o
    JOIN unified_identities ui ON ui.auth_user_id = (
        SELECT u.id FROM users u WHERE u.organization_id = o.id AND u.role = 'admin' LIMIT 1
    )
    WHERE NOT EXISTS (SELECT 1 FROM organizations_v3 WHERE id = o.id)
    ON CONFLICT (id) DO NOTHING;

    -- Migrate user roles
    INSERT INTO role_assignments (
        identity_id, organization_id, role, is_active, assigned_at
    )
    SELECT 
        ui.id, u.organization_id,
        CASE u.role
            WHEN 'master_admin' THEN 'master'::unified_role
            WHEN 'admin' THEN 'admin'::unified_role
            WHEN 'manager' THEN 'manager'::unified_role
            ELSE 'worker'::unified_role
        END,
        u.is_active, u.created_at
    FROM users u
    JOIN unified_identities ui ON ui.auth_user_id = u.id
    WHERE NOT EXISTS (
        SELECT 1 FROM role_assignments ra 
        WHERE ra.identity_id = ui.id AND ra.organization_id = u.organization_id
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Data migration completed successfully';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Business logic functions
-- =====================================================

-- Function to validate business ownership
CREATE OR REPLACE FUNCTION validate_business_ownership()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure business organizations are owned by business identities
    IF NEW.org_type IN ('business_owner', 'corporation') THEN
        IF NOT EXISTS (
            SELECT 1 FROM unified_identities ui 
            WHERE ui.id = NEW.owner_identity_id 
            AND ui.id_type = NEW.org_type
            AND ui.business_verification_status = 'verified'
        ) THEN
            RAISE EXCEPTION 'Business organization must be owned by verified business identity of same type';
        END IF;
    END IF;
    
    -- Ensure franchise stores have franchise HQ parent
    IF NEW.org_type = 'franchise_store' THEN
        IF NEW.parent_org_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM organizations_v3 
            WHERE id = NEW.parent_org_id AND org_type = 'franchise_hq'
        ) THEN
            RAISE EXCEPTION 'Franchise store must have franchise HQ as parent';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to enforce teen work restrictions
CREATE OR REPLACE FUNCTION enforce_teen_restrictions()
RETURNS TRIGGER AS $$
DECLARE
    is_teen_worker BOOLEAN;
BEGIN
    -- Check if employee is a teen
    SELECT ui.is_teen INTO is_teen_worker
    FROM unified_identities ui
    WHERE ui.id = NEW.employee_id;
    
    IF is_teen_worker THEN
        -- Validate work hours
        IF NEW.weekly_work_hours > 35 THEN
            RAISE EXCEPTION 'Teen workers cannot work more than 35 hours per week';
        END IF;
        
        -- Require parent consent
        IF NEW.parent_guardian_consent IS NULL THEN
            RAISE EXCEPTION 'Teen workers require parent/guardian consent';
        END IF;
        
        -- Require work permit
        IF NEW.teen_work_permit_data IS NULL THEN
            RAISE EXCEPTION 'Teen workers require work permit data';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. Create triggers
-- =====================================================

-- Business ownership validation trigger
CREATE TRIGGER validate_business_ownership_trigger
    BEFORE INSERT OR UPDATE ON organizations_v3
    FOR EACH ROW
    EXECUTE FUNCTION validate_business_ownership();

-- Teen work restrictions trigger
CREATE TRIGGER enforce_teen_restrictions_trigger
    BEFORE INSERT OR UPDATE ON employment_contracts_v2
    FOR EACH ROW
    EXECUTE FUNCTION enforce_teen_restrictions();

-- Updated timestamp triggers
CREATE TRIGGER update_unified_identities_updated_at
    BEFORE UPDATE ON unified_identities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_v3_updated_at
    BEFORE UPDATE ON organizations_v3
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employment_contracts_v2_updated_at
    BEFORE UPDATE ON employment_contracts_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. Create indexes
-- =====================================================

-- Unified identities indexes
CREATE INDEX IF NOT EXISTS idx_unified_identities_email ON unified_identities(email);
CREATE INDEX IF NOT EXISTS idx_unified_identities_phone ON unified_identities(phone);
CREATE INDEX IF NOT EXISTS idx_unified_identities_auth_user ON unified_identities(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_unified_identities_business_number ON unified_identities(business_number) WHERE business_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_identities_type ON unified_identities(id_type);
CREATE INDEX IF NOT EXISTS idx_unified_identities_teens ON unified_identities(is_teen) WHERE is_teen = true;

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_v3_code ON organizations_v3(code);
CREATE INDEX IF NOT EXISTS idx_organizations_v3_owner ON organizations_v3(owner_identity_id);
CREATE INDEX IF NOT EXISTS idx_organizations_v3_parent ON organizations_v3(parent_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_v3_type ON organizations_v3(org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_v3_active ON organizations_v3(is_active);

-- Role assignments indexes
CREATE INDEX IF NOT EXISTS idx_role_assignments_identity ON role_assignments(identity_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_organization ON role_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_active ON role_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_role_assignments_primary ON role_assignments(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON role_assignments(role);

-- Employment contracts indexes
CREATE INDEX IF NOT EXISTS idx_contracts_v2_employee ON employment_contracts_v2(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_v2_employer ON employment_contracts_v2(employer_org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_v2_status ON employment_contracts_v2(status);
CREATE INDEX IF NOT EXISTS idx_contracts_v2_dates ON employment_contracts_v2(start_date, end_date);

-- =====================================================
-- 10. RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE unified_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_contracts_v2 ENABLE ROW LEVEL SECURITY;

-- Unified identities policies
CREATE POLICY "Users can view their own identity"
    ON unified_identities FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own identity"
    ON unified_identities FOR UPDATE
    USING (auth.uid() = auth_user_id);

-- Organizations policies
CREATE POLICY "Organization members can view organization"
    ON organizations_v3 FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN unified_identities ui ON ra.identity_id = ui.id
            WHERE ui.auth_user_id = auth.uid()
            AND ra.organization_id = organizations_v3.id
            AND ra.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN unified_identities ui ON ra.identity_id = ui.id
            WHERE ui.auth_user_id = auth.uid()
            AND ra.role = 'master'
            AND ra.is_active = true
        )
    );

-- Role assignments policies
CREATE POLICY "Users can view their own roles"
    ON role_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM unified_identities ui
            WHERE ui.auth_user_id = auth.uid()
            AND ui.id = role_assignments.identity_id
        )
    );

-- Employment contracts policies
CREATE POLICY "Contract parties can view contracts"
    ON employment_contracts_v2 FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM unified_identities ui
            WHERE ui.auth_user_id = auth.uid()
            AND ui.id = employment_contracts_v2.employee_id
        )
        OR
        EXISTS (
            SELECT 1 FROM role_assignments ra
            JOIN unified_identities ui ON ra.identity_id = ui.id
            WHERE ui.auth_user_id = auth.uid()
            AND ra.organization_id = employment_contracts_v2.employer_org_id
            AND ra.role IN ('admin', 'manager')
            AND ra.is_active = true
        )
    );

-- =====================================================
-- 11. Comments and documentation
-- =====================================================

COMMENT ON TABLE unified_identities IS 'Single source of truth for all user identities (personal, business, corporate)';
COMMENT ON TABLE organizations_v3 IS 'All business entities with proper hierarchy and ownership validation';
COMMENT ON TABLE role_assignments IS 'Many-to-many role assignments with full audit trail';
COMMENT ON TABLE employment_contracts_v2 IS 'Legal employment contracts with teen compliance and business rules';

COMMENT ON COLUMN unified_identities.id_type IS 'Identity type: personal, business_owner, corporation, franchise_hq, franchise_store';
COMMENT ON COLUMN organizations_v3.org_type IS 'Organization type must match owner identity type for business entities';
COMMENT ON COLUMN role_assignments.role IS 'Unified role: master, admin, manager, worker, franchise_admin';