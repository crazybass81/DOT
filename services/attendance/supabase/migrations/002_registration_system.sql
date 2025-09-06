-- =====================================================
-- Registration System Migration
-- Version: 2.0.0
-- Description: Implements multi-role registration system
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- DROP existing constraints that will be modified
-- =====================================================

-- Drop existing user constraints if they exist
ALTER TABLE IF EXISTS users 
    DROP CONSTRAINT IF EXISTS master_admin_no_org;

-- =====================================================
-- Create new enum types
-- =====================================================

-- Organization types
DO $$ BEGIN
    CREATE TYPE org_type AS ENUM (
        'personal_business', 
        'corporation', 
        'franchise_hq', 
        'franchise_store'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Role types (more granular than before)
DO $$ BEGIN
    CREATE TYPE role_type AS ENUM (
        'master', 
        'admin', 
        'manager', 
        'worker', 
        'franchise_staff'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Contract status
DO $$ BEGIN
    CREATE TYPE contract_status AS ENUM (
        'draft',
        'pending_signature', 
        'active', 
        'suspended',
        'terminated',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Verification status
DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM (
        'pending',
        'in_progress',
        'verified',
        'failed',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- Core Identity Tables
-- =====================================================

-- Personal accounts (Single Sign-On identity)
CREATE TABLE IF NOT EXISTS personal_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE, -- Supabase Auth ID (set after auth creation)
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    
    -- Age verification
    age_verified_at TIMESTAMPTZ,
    age_verification_method VARCHAR(50), -- 'nice_api', 'manual', 'parent_consent'
    
    -- Identity verification (encrypted)
    resident_id_hash VARCHAR(255), -- One-way hash
    
    -- Teen status (computed via function, not generated column due to immutability)
    is_teen BOOLEAN DEFAULT false,
    
    -- Teen-specific data
    parent_consent JSONB, -- {parent_name, parent_phone, consented_at, consent_document}
    
    -- Account status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_age CHECK (
        birth_date <= CURRENT_DATE - INTERVAL '15 years'
    ),
    CONSTRAINT email_format CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT phone_format CHECK (
        phone ~ '^[0-9-]+$'
    )
);

-- Organizations (All types of business entities)
CREATE TABLE IF NOT EXISTS organizations_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Unique identifier for easy sharing
    name VARCHAR(255) NOT NULL,
    type org_type NOT NULL,
    
    -- Business information
    business_number VARCHAR(20) UNIQUE,
    business_name VARCHAR(255), -- Official business name
    business_verified_at TIMESTAMPTZ,
    business_verification_data JSONB,
    
    -- Ownership
    owner_account_id UUID REFERENCES personal_accounts(id),
    
    -- Hierarchy (for franchises)
    parent_org_id UUID REFERENCES organizations_v2(id),
    
    -- Settings and configuration
    settings JSONB DEFAULT '{
        "workingHours": {"start": "09:00", "end": "18:00"},
        "overtimeThreshold": 480,
        "requiresGPS": true,
        "gpsRadius": 100
    }',
    
    -- Limits
    max_employees INTEGER DEFAULT 50,
    max_branches INTEGER DEFAULT 5,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT business_number_required_for_business CHECK (
        type = 'personal_business' AND business_number IS NOT NULL OR
        type != 'personal_business'
    )
);

-- User roles (Many-to-many relationship between accounts and organizations)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES personal_accounts(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations_v2(id) ON DELETE CASCADE,
    role role_type NOT NULL,
    
    -- Role management
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false, -- Primary role for quick access
    
    -- Permissions (role-specific)
    permissions JSONB DEFAULT '{}',
    
    -- Assignment tracking
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES personal_accounts(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES personal_accounts(id),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Unique constraint: One active role per organization per user
    CONSTRAINT unique_active_role UNIQUE (account_id, organization_id, role),
    
    -- Master role doesn't belong to any organization
    CONSTRAINT master_role_no_org CHECK (
        (role = 'master' AND organization_id IS NULL) OR
        (role != 'master' AND organization_id IS NOT NULL)
    )
);

-- Create partial unique index for one admin per organization
CREATE UNIQUE INDEX idx_one_admin_per_org 
ON user_roles(organization_id) 
WHERE role = 'admin' AND is_active = true;

-- Employment contracts
CREATE TABLE IF NOT EXISTS employment_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(100) UNIQUE NOT NULL DEFAULT 'CONTRACT-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    
    -- Parties
    employee_id UUID NOT NULL REFERENCES personal_accounts(id),
    organization_id UUID NOT NULL REFERENCES organizations_v2(id),
    
    -- Contract details
    position VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    employment_type VARCHAR(50) NOT NULL, -- 'full_time', 'part_time', 'temporary', 'internship'
    
    -- Duration
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for permanent contracts
    probation_end_date DATE,
    
    -- Compensation
    wage_type VARCHAR(20) NOT NULL, -- 'hourly', 'monthly', 'annual'
    wage_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KRW',
    
    -- Working conditions
    work_hours_per_week INTEGER NOT NULL,
    work_days VARCHAR(7) DEFAULT '1111100', -- Binary string for Mon-Sun
    break_minutes INTEGER DEFAULT 60,
    
    -- Contract status
    status contract_status DEFAULT 'draft',
    signed_at TIMESTAMPTZ,
    terminated_at TIMESTAMPTZ,
    termination_reason TEXT,
    
    -- Documents
    contract_document_url TEXT,
    signed_document_url TEXT,
    
    -- Teen-specific
    teen_work_permit JSONB, -- Work permit details for teens
    parent_consent_id UUID, -- Reference to parent consent record
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints for teen workers
    CONSTRAINT teen_work_hours CHECK (
        NOT EXISTS (
            SELECT 1 FROM personal_accounts 
            WHERE id = employee_id AND is_teen = true
        ) OR work_hours_per_week <= 35
    ),
    
    -- Prevent duplicate active contracts
    CONSTRAINT unique_active_contract UNIQUE (employee_id, organization_id, status)
);

-- =====================================================
-- Registration Flow Tables
-- =====================================================

-- Registration flow tracking
CREATE TABLE IF NOT EXISTS registration_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL DEFAULT 'REG-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    
    -- Account being created/modified
    account_id UUID REFERENCES personal_accounts(id),
    email VARCHAR(255) NOT NULL,
    
    -- Flow information
    flow_type VARCHAR(50) NOT NULL, -- 'new_user', 'add_role', 'create_org', 'join_org'
    current_step VARCHAR(50) NOT NULL,
    completed_steps TEXT[] DEFAULT '{}',
    
    -- Flow data (stores temporary data between steps)
    flow_data JSONB NOT NULL DEFAULT '{}',
    
    -- Completion tracking
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Age verification records
CREATE TABLE IF NOT EXISTS age_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES personal_accounts(id),
    
    -- Verification details
    verification_type VARCHAR(50) NOT NULL, -- 'nice_api', 'parent_consent', 'document'
    verification_status verification_status DEFAULT 'pending',
    
    -- Verification data
    request_data JSONB NOT NULL DEFAULT '{}',
    response_data JSONB,
    
    -- Parent consent specific
    parent_name VARCHAR(255),
    parent_phone VARCHAR(20),
    parent_verified_at TIMESTAMPTZ,
    
    -- Results
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verification_code VARCHAR(100), -- External verification code
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Business verification records
CREATE TABLE IF NOT EXISTS business_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations_v2(id),
    
    -- Business details
    business_number VARCHAR(20) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    representative_name VARCHAR(255),
    
    -- Verification
    verification_method VARCHAR(50), -- 'nts_api', 'manual', 'document'
    verification_status verification_status DEFAULT 'pending',
    
    -- API response
    api_request_data JSONB,
    api_response_data JSONB,
    
    -- Results
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES personal_accounts(id),
    
    -- Document verification
    document_urls TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Audit and Compliance Tables
-- =====================================================

-- Registration audit logs
CREATE TABLE IF NOT EXISTS registration_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Actor
    account_id UUID REFERENCES personal_accounts(id),
    session_id VARCHAR(255),
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    action_category VARCHAR(50), -- 'registration', 'verification', 'role_change'
    action_data JSONB NOT NULL DEFAULT '{}',
    
    -- Results
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp (immutable)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to generate unique organization code
CREATE OR REPLACE FUNCTION generate_org_code()
RETURNS VARCHAR AS $$
DECLARE
    new_code VARCHAR;
    done BOOLEAN DEFAULT false;
BEGIN
    WHILE NOT done LOOP
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FOR 8));
        done := NOT EXISTS(SELECT 1 FROM organizations_v2 WHERE code = new_code);
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to validate teen work restrictions
CREATE OR REPLACE FUNCTION check_teen_work_restrictions()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if employee is a teen
    IF EXISTS (
        SELECT 1 FROM personal_accounts 
        WHERE id = NEW.employee_id AND is_teen = true
    ) THEN
        -- Validate work hours
        IF NEW.work_hours_per_week > 35 THEN
            RAISE EXCEPTION 'Teen workers cannot work more than 35 hours per week';
        END IF;
        
        -- Require parent consent
        IF NEW.parent_consent_id IS NULL THEN
            RAISE EXCEPTION 'Teen workers require parent consent';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for teen work restrictions
CREATE TRIGGER enforce_teen_work_restrictions
BEFORE INSERT OR UPDATE ON employment_contracts
FOR EACH ROW
EXECUTE FUNCTION check_teen_work_restrictions();

-- Function to handle role changes
CREATE OR REPLACE FUNCTION handle_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log role change
    INSERT INTO registration_audit_logs (
        account_id,
        action,
        action_category,
        action_data
    ) VALUES (
        NEW.account_id,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'role_granted'
            WHEN NEW.is_active = false THEN 'role_revoked'
            ELSE 'role_modified'
        END,
        'role_change',
        jsonb_build_object(
            'organization_id', NEW.organization_id,
            'role', NEW.role,
            'granted_by', NEW.granted_by
        )
    );
    
    -- If making someone an admin, ensure no other admin exists
    IF NEW.role = 'admin' AND NEW.is_active = true THEN
        UPDATE user_roles 
        SET is_active = false, revoked_at = NOW()
        WHERE organization_id = NEW.organization_id 
        AND role = 'admin' 
        AND id != NEW.id
        AND is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role changes
CREATE TRIGGER audit_role_changes
AFTER INSERT OR UPDATE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION handle_role_change();

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Personal accounts
CREATE INDEX IF NOT EXISTS idx_personal_accounts_email ON personal_accounts(email);
CREATE INDEX IF NOT EXISTS idx_personal_accounts_phone ON personal_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_personal_accounts_auth_user ON personal_accounts(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_personal_accounts_teen ON personal_accounts(is_teen) WHERE is_teen = true;

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations_v2(code);
CREATE INDEX IF NOT EXISTS idx_organizations_business_number ON organizations_v2(business_number);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations_v2(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations_v2(parent_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations_v2(is_active);

-- User roles
CREATE INDEX IF NOT EXISTS idx_user_roles_account ON user_roles(account_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_primary ON user_roles(is_primary) WHERE is_primary = true;

-- Employment contracts
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON employment_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_organization ON employment_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON employment_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON employment_contracts(start_date, end_date);

-- Registration flows
CREATE INDEX IF NOT EXISTS idx_registration_flows_session ON registration_flows(session_id);
CREATE INDEX IF NOT EXISTS idx_registration_flows_email ON registration_flows(email);
CREATE INDEX IF NOT EXISTS idx_registration_flows_expires ON registration_flows(expires_at);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_account ON registration_audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON registration_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON registration_audit_logs(created_at);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE personal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_audit_logs ENABLE ROW LEVEL SECURITY;

-- Personal accounts: Users can only see their own account
CREATE POLICY personal_accounts_self_view 
ON personal_accounts FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY personal_accounts_self_update 
ON personal_accounts FOR UPDATE 
USING (auth.uid() = auth_user_id);

-- Organizations: Users can see organizations they belong to
CREATE POLICY organizations_member_view 
ON organizations_v2 FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN personal_accounts pa ON ur.account_id = pa.id
        WHERE pa.auth_user_id = auth.uid()
        AND ur.organization_id = organizations_v2.id
        AND ur.is_active = true
    )
    OR
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN personal_accounts pa ON ur.account_id = pa.id
        WHERE pa.auth_user_id = auth.uid()
        AND ur.role = 'master'
    )
);

-- User roles: Users can see their own roles
CREATE POLICY user_roles_self_view 
ON user_roles FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM personal_accounts pa
        WHERE pa.auth_user_id = auth.uid()
        AND pa.id = user_roles.account_id
    )
);

-- Employment contracts: Workers see own, managers/admins see organization's
CREATE POLICY employment_contracts_access 
ON employment_contracts FOR ALL 
USING (
    -- Workers see their own contracts
    EXISTS (
        SELECT 1 FROM personal_accounts pa
        WHERE pa.auth_user_id = auth.uid()
        AND pa.id = employment_contracts.employee_id
    )
    OR
    -- Admins and managers see organization contracts
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN personal_accounts pa ON ur.account_id = pa.id
        WHERE pa.auth_user_id = auth.uid()
        AND ur.organization_id = employment_contracts.organization_id
        AND ur.role IN ('admin', 'manager')
        AND ur.is_active = true
    )
);

-- =====================================================
-- Initial Data
-- =====================================================

-- Insert master admin account (password: MasterAdmin123!)
INSERT INTO personal_accounts (
    email,
    phone,
    full_name,
    birth_date,
    is_verified,
    age_verified_at
) VALUES (
    'archt723@gmail.com',
    '010-0000-0000',
    'System Administrator',
    '1990-01-01',
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create master admin role
INSERT INTO user_roles (
    account_id,
    role,
    organization_id
) 
SELECT 
    id,
    'master'::role_type,
    NULL
FROM personal_accounts 
WHERE email = 'archt723@gmail.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE personal_accounts IS 'Core identity table for all users in the system';
COMMENT ON TABLE organizations_v2 IS 'All types of business entities (personal, corporate, franchise)';
COMMENT ON TABLE user_roles IS 'Many-to-many relationship between accounts and organizations with specific roles';
COMMENT ON TABLE employment_contracts IS 'Legal employment contracts between workers and organizations';
COMMENT ON TABLE registration_flows IS 'Tracks multi-step registration process state';
COMMENT ON TABLE age_verifications IS 'Age and identity verification records for compliance';
COMMENT ON TABLE business_verifications IS 'Business registration verification for business owners';
COMMENT ON TABLE registration_audit_logs IS 'Immutable audit trail for all registration-related actions';