-- ============================================================
-- DOT 근태관리 서비스 - 통합 데이터베이스 스키마
-- Unified Identity System with Organizations V3
-- ============================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS role_assignments CASCADE; 
DROP TABLE IF EXISTS organizations_v3 CASCADE;
DROP TABLE IF EXISTS unified_identities CASCADE;

-- ============================================================
-- 1. UNIFIED IDENTITIES TABLE
-- ============================================================
CREATE TABLE unified_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Core Identity Fields
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    
    -- Identity Type Classification
    id_type TEXT CHECK (id_type IN ('personal', 'corporate')) NOT NULL DEFAULT 'personal',
    
    -- Auth Integration
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Status and Metadata
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    
    -- Audit Fields
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0
);

-- Indexes for unified_identities
CREATE INDEX idx_unified_identities_email ON unified_identities(email);
CREATE INDEX idx_unified_identities_auth_user_id ON unified_identities(auth_user_id);
CREATE INDEX idx_unified_identities_active ON unified_identities(is_active);

-- ============================================================
-- 2. ORGANIZATIONS V3 TABLE
-- ============================================================ 
CREATE TABLE organizations_v3 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Organization Details
    name TEXT NOT NULL,
    description TEXT,
    
    -- Organization Type and Hierarchy
    type TEXT CHECK (type IN ('company', 'franchise', 'department', 'branch')) NOT NULL DEFAULT 'company',
    parent_organization_id UUID REFERENCES organizations_v3(id),
    
    -- Location and Contact
    address TEXT,
    phone TEXT,
    email TEXT,
    
    -- Business Configuration
    settings JSONB DEFAULT '{}',
    business_hours JSONB DEFAULT '{}', -- {mon: {start: "09:00", end: "18:00"}, ...}
    location JSONB, -- {lat: number, lng: number, radius: number}
    
    -- Status
    is_active BOOLEAN DEFAULT true
);

-- Indexes for organizations_v3
CREATE INDEX idx_organizations_v3_type ON organizations_v3(type);
CREATE INDEX idx_organizations_v3_parent ON organizations_v3(parent_organization_id);
CREATE INDEX idx_organizations_v3_active ON organizations_v3(is_active);

-- ============================================================
-- 3. ROLE ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Role Assignment Core
    identity_id UUID REFERENCES unified_identities(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('master', 'admin', 'manager', 'worker', 'franchise_admin')) NOT NULL,
    
    -- Assignment Audit Trail
    assigned_by UUID REFERENCES unified_identities(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_by UUID REFERENCES unified_identities(id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and Permissions
    is_active BOOLEAN DEFAULT true,
    custom_permissions JSONB DEFAULT '{}',
    
    -- Role-specific data
    employee_code TEXT,
    department TEXT,
    position TEXT
);

-- Indexes for role_assignments
CREATE INDEX idx_role_assignments_identity ON role_assignments(identity_id);
CREATE INDEX idx_role_assignments_organization ON role_assignments(organization_id);
CREATE INDEX idx_role_assignments_role ON role_assignments(role);
CREATE INDEX idx_role_assignments_active ON role_assignments(is_active);
CREATE UNIQUE INDEX idx_role_assignments_unique_active 
    ON role_assignments(identity_id, organization_id, role) 
    WHERE is_active = true;

-- ============================================================
-- 4. ATTENDANCE RECORDS TABLE
-- ============================================================
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Employee and Business Reference
    employee_id UUID REFERENCES unified_identities(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE NOT NULL,
    
    -- Attendance Timing
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    work_date DATE GENERATED ALWAYS AS (DATE(COALESCE(check_in_time, check_out_time))) STORED,
    
    -- Location Tracking
    check_in_location JSONB, -- {lat: number, lng: number, address?: string}
    check_out_location JSONB,
    
    -- Verification and Status
    verification_method TEXT CHECK (verification_method IN ('gps', 'qr', 'manual')) NOT NULL,
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled', 'pending')) DEFAULT 'active',
    
    -- Additional Information
    notes TEXT,
    break_time_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0
);

-- Indexes for attendance_records
CREATE INDEX idx_attendance_records_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_records_business ON attendance_records(business_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(work_date);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);
CREATE INDEX idx_attendance_records_check_in ON attendance_records(check_in_time);

-- ============================================================
-- 5. USEFUL VIEWS
-- ============================================================

-- User Roles View (for compatibility and easier querying)
CREATE OR REPLACE VIEW user_roles_view AS
SELECT 
    ui.id as user_id,
    ui.email,
    ui.full_name,
    ui.auth_user_id,
    ra.id as role_assignment_id,
    ra.role,
    ra.organization_id,
    org.name as organization_name,
    org.type as organization_type,
    ra.is_active as role_active,
    ra.assigned_at,
    ra.employee_code,
    ra.department,
    ra.position
FROM unified_identities ui
LEFT JOIN role_assignments ra ON ui.id = ra.identity_id AND ra.is_active = true
LEFT JOIN organizations_v3 org ON ra.organization_id = org.id
WHERE ui.is_active = true;

-- Active Employees View
CREATE OR REPLACE VIEW active_employees AS
SELECT 
    ui.id,
    ui.email,
    ui.full_name,
    ui.phone,
    ui.auth_user_id,
    ra.role,
    ra.organization_id,
    ra.employee_code,
    ra.department,
    ra.position,
    org.name as organization_name
FROM unified_identities ui
JOIN role_assignments ra ON ui.id = ra.identity_id 
JOIN organizations_v3 org ON ra.organization_id = org.id
WHERE ui.is_active = true 
  AND ra.is_active = true 
  AND org.is_active = true
  AND ra.role IN ('worker', 'manager', 'admin');

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE unified_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Unified Identities Policies
CREATE POLICY "Users can view their own identity" ON unified_identities
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own identity" ON unified_identities
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Organizations Policies
CREATE POLICY "Users can view organizations they belong to" ON organizations_v3
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM unified_identities ui 
            JOIN role_assignments ra ON ui.id = ra.identity_id 
            WHERE ui.auth_user_id = auth.uid() 
              AND ra.organization_id = organizations_v3.id 
              AND ra.is_active = true
        )
    );

-- Role Assignments Policies  
CREATE POLICY "Users can view their own role assignments" ON role_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM unified_identities ui 
            WHERE ui.auth_user_id = auth.uid() 
              AND ui.id = role_assignments.identity_id
        )
    );

-- Attendance Records Policies
CREATE POLICY "Users can view their own attendance records" ON attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM unified_identities ui 
            WHERE ui.auth_user_id = auth.uid() 
              AND ui.id = attendance_records.employee_id
        )
    );

CREATE POLICY "Users can insert their own attendance records" ON attendance_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM unified_identities ui 
            WHERE ui.auth_user_id = auth.uid() 
              AND ui.id = attendance_records.employee_id
        )
    );

-- ============================================================
-- 7. INITIAL DATA SETUP
-- ============================================================

-- Create Master Admin Organization (for system administration)
INSERT INTO organizations_v3 (id, name, type, description, is_active) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'DOT 시스템 관리', 'company', 'DOT 플랫폼 시스템 관리 조직', true);

-- ============================================================
-- 8. FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================

-- Function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(user_auth_id UUID)
RETURNS TABLE (
    role TEXT,
    organization_id UUID,
    organization_name TEXT,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ra.role,
        ra.organization_id,
        org.name as organization_name,
        ra.is_active
    FROM unified_identities ui
    JOIN role_assignments ra ON ui.id = ra.identity_id
    JOIN organizations_v3 org ON ra.organization_id = org.id
    WHERE ui.auth_user_id = user_auth_id
      AND ra.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(user_auth_id UUID, check_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM unified_identities ui
        JOIN role_assignments ra ON ui.id = ra.identity_id
        WHERE ui.auth_user_id = user_auth_id
          AND ra.role = check_role
          AND ra.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ DOT 통합 데이터베이스 스키마 생성 완료!';
    RAISE NOTICE '📋 생성된 테이블: unified_identities, organizations_v3, role_assignments, attendance_records';
    RAISE NOTICE '👀 생성된 뷰: user_roles_view, active_employees';
    RAISE NOTICE '🛡️ RLS 정책 적용 완료';
    RAISE NOTICE '🔧 헬퍼 함수 생성 완료';
END $$;