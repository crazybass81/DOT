-- =====================================================
-- EMPLOYEES TABLE SCHEMA
-- =====================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS employee_departments CASCADE;
DROP TABLE IF EXISTS employee_positions CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- =====================================================
-- 1. ORGANIZATIONS TABLE (회사/조직)
-- =====================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- 조직 코드
    description TEXT,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. BRANCHES TABLE (지점/지사)
-- =====================================================
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    radius_meters INTEGER DEFAULT 100, -- 출퇴근 허용 반경
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- =====================================================
-- 3. DEPARTMENTS TABLE (부서)
-- =====================================================
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- =====================================================
-- 4. POSITIONS TABLE (직급/직책)
-- =====================================================
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1, -- 직급 레벨 (1이 가장 높음)
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- =====================================================
-- 5. EMPLOYEES TABLE (직원)
-- =====================================================
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    employee_code VARCHAR(50) UNIQUE NOT NULL, -- 사번
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    
    -- Contact Information
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    emergency_contact VARCHAR(50),
    address TEXT,
    
    -- Organization Information
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    
    -- Employment Information
    hire_date DATE NOT NULL,
    resignation_date DATE,
    employee_type VARCHAR(50) DEFAULT 'FULL_TIME', -- FULL_TIME, PART_TIME, CONTRACT, INTERN
    
    -- Authentication Information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Supabase Auth 연결
    pin_code VARCHAR(255), -- 해시된 PIN 코드
    face_id_data JSONB, -- 얼굴 인식 데이터
    fingerprint_data JSONB, -- 지문 데이터
    
    -- QR Registration
    qr_registered BOOLEAN DEFAULT false,
    qr_registered_at TIMESTAMPTZ,
    qr_registered_device_id VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    role VARCHAR(50) DEFAULT 'USER', -- USER, ADMIN, SUPER_ADMIN, MASTER_ADMIN
    
    -- Metadata
    profile_image_url TEXT,
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 6. EMPLOYEE_DEPARTMENTS TABLE (직원-부서 연결, 겸직 지원)
-- =====================================================
CREATE TABLE employee_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, department_id, start_date)
);

-- =====================================================
-- 7. EMPLOYEE_POSITIONS TABLE (직원-직급 이력)
-- =====================================================
CREATE TABLE employee_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, position_id, start_date)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_employees_organization ON employees(organization_id);
CREATE INDEX idx_employees_branch ON employees(branch_id);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_position ON employees(position_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_employee_code ON employees(employee_code);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_qr_registered ON employees(qr_registered);
CREATE INDEX idx_employees_is_active ON employees(is_active);

CREATE INDEX idx_branches_organization ON branches(organization_id);
CREATE INDEX idx_departments_organization ON departments(organization_id);
CREATE INDEX idx_departments_branch ON departments(branch_id);
CREATE INDEX idx_positions_organization ON positions(organization_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_positions ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Organizations viewable by authenticated users" ON organizations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Organizations manageable by admins" ON organizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.user_id = auth.uid() 
            AND employees.role IN ('ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- Branches policies
CREATE POLICY "Branches viewable by organization members" ON branches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.user_id = auth.uid() 
            AND employees.organization_id = branches.organization_id
        )
    );

CREATE POLICY "Branches manageable by admins" ON branches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.user_id = auth.uid() 
            AND employees.organization_id = branches.organization_id
            AND employees.role IN ('ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- Employees policies
CREATE POLICY "Employees viewable by same organization" ON employees
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Employees can view own record" ON employees
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Employees can update own profile" ON employees
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage employees" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.user_id = auth.uid() 
            AND e.organization_id = employees.organization_id
            AND e.role IN ('ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- Departments policies
CREATE POLICY "Departments viewable by organization members" ON departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.user_id = auth.uid() 
            AND employees.organization_id = departments.organization_id
        )
    );

CREATE POLICY "Departments manageable by admins" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.user_id = auth.uid() 
            AND employees.organization_id = departments.organization_id
            AND employees.role IN ('ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- Positions policies
CREATE POLICY "Positions viewable by organization members" ON positions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.user_id = auth.uid() 
            AND employees.organization_id = positions.organization_id
        )
    );

CREATE POLICY "Positions manageable by admins" ON positions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.user_id = auth.uid() 
            AND employees.organization_id = positions.organization_id
            AND employees.role IN ('ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN')
        )
    );

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample organization
INSERT INTO organizations (name, code, description, email)
VALUES ('DOT Company', 'DOT001', 'DOT Main Organization', 'admin@dot.com');

-- Get the organization ID for further inserts
DO $$
DECLARE
    org_id UUID;
    branch_id UUID;
    dept_id UUID;
    pos_id UUID;
BEGIN
    SELECT id INTO org_id FROM organizations WHERE code = 'DOT001';
    
    -- Insert sample branch
    INSERT INTO branches (organization_id, name, code, address, latitude, longitude)
    VALUES (org_id, '본사', 'HQ001', '서울시 강남구', 37.4979, 127.0276)
    RETURNING id INTO branch_id;
    
    -- Insert sample departments
    INSERT INTO departments (organization_id, branch_id, name, code)
    VALUES 
        (org_id, branch_id, '개발팀', 'DEV001'),
        (org_id, branch_id, '인사팀', 'HR001'),
        (org_id, branch_id, '영업팀', 'SALES001');
    
    -- Insert sample positions
    INSERT INTO positions (organization_id, name, code, level)
    VALUES 
        (org_id, '대표이사', 'CEO', 1),
        (org_id, '부장', 'DIR', 2),
        (org_id, '과장', 'MGR', 3),
        (org_id, '대리', 'ASST', 4),
        (org_id, '사원', 'STAFF', 5);
END $$;

-- =====================================================
-- FUNCTIONS FOR EMPLOYEE REGISTRATION
-- =====================================================

-- Function to register employee via QR scan
CREATE OR REPLACE FUNCTION register_employee_via_qr(
    p_email VARCHAR,
    p_first_name VARCHAR,
    p_last_name VARCHAR,
    p_phone VARCHAR,
    p_employee_code VARCHAR,
    p_branch_id UUID,
    p_device_id VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_employee_id UUID;
    v_organization_id UUID;
BEGIN
    -- Get organization from branch
    SELECT organization_id INTO v_organization_id
    FROM branches WHERE id = p_branch_id;
    
    -- Check if employee already exists
    SELECT id INTO v_employee_id
    FROM employees 
    WHERE email = p_email OR employee_code = p_employee_code;
    
    IF v_employee_id IS NOT NULL THEN
        -- Update existing employee
        UPDATE employees 
        SET 
            qr_registered = true,
            qr_registered_at = NOW(),
            qr_registered_device_id = p_device_id,
            updated_at = NOW()
        WHERE id = v_employee_id;
    ELSE
        -- Create new employee
        INSERT INTO employees (
            employee_code,
            first_name,
            last_name,
            email,
            phone,
            organization_id,
            branch_id,
            hire_date,
            qr_registered,
            qr_registered_at,
            qr_registered_device_id
        ) VALUES (
            p_employee_code,
            p_first_name,
            p_last_name,
            p_email,
            p_phone,
            v_organization_id,
            p_branch_id,
            CURRENT_DATE,
            true,
            NOW(),
            p_device_id
        ) RETURNING id INTO v_employee_id;
    END IF;
    
    RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if employee is registered
CREATE OR REPLACE FUNCTION check_employee_registration(
    p_email VARCHAR DEFAULT NULL,
    p_device_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    is_registered BOOLEAN,
    employee_id UUID,
    organization_name VARCHAR,
    branch_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.qr_registered,
        e.id,
        o.name,
        b.name
    FROM employees e
    LEFT JOIN organizations o ON e.organization_id = o.id
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE (p_email IS NOT NULL AND e.email = p_email)
       OR (p_device_id IS NOT NULL AND e.qr_registered_device_id = p_device_id)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE employees IS '직원 정보 테이블';
COMMENT ON COLUMN employees.employee_code IS '사번 - 고유한 직원 식별 코드';
COMMENT ON COLUMN employees.qr_registered IS 'QR 코드로 등록 완료 여부';
COMMENT ON COLUMN employees.role IS '시스템 권한: USER(일반), ADMIN(관리자), SUPER_ADMIN(상위관리자), MASTER_ADMIN(최고관리자)';