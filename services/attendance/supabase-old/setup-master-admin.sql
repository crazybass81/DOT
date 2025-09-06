-- ================================================
-- archt723@gmail.com을 마스터 관리자로 설정
-- Supabase Dashboard의 SQL Editor에서 이 스크립트를 실행하세요
-- ================================================

-- 1. 먼저 필요한 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geofence_radius INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- Enum types (생성되어 있지 않은 경우만)
DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE employee_role AS ENUM ('EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Employees 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    password_hash TEXT,
    device_id VARCHAR(255) UNIQUE,
    approval_status approval_status DEFAULT 'PENDING',
    role employee_role DEFAULT 'EMPLOYEE',
    is_master_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT false,
    date_of_birth DATE,
    join_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 기본 조직 데이터 생성 (없으면)
INSERT INTO organizations (id, name, code, description) VALUES
    ('00000000-0000-0000-0000-000000000001', 'DOT Inc.', 'DOT', 'Main Organization')
ON CONFLICT (code) DO NOTHING;

INSERT INTO branches (id, organization_id, name, code, address) VALUES
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 
     'Main Office', 'MAIN', 'Seoul, Korea')
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO departments (id, organization_id, branch_id, name, code) VALUES
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000002', 'Management', 'MGMT')
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO positions (id, organization_id, department_id, name, code, level) VALUES
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000003', 'CEO', 'CEO', 10)
ON CONFLICT (organization_id, code) DO NOTHING;

-- 3. archt723@gmail.com의 auth user ID 찾기
DO $$
DECLARE
    v_user_id UUID;
    v_employee_id UUID;
BEGIN
    -- Auth 테이블에서 사용자 ID 찾기
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'archt723@gmail.com'
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '⚠️  archt723@gmail.com 사용자를 auth.users에서 찾을 수 없습니다.';
        RAISE NOTICE '    먼저 Supabase Authentication에서 이 이메일로 계정을 생성하세요.';
    ELSE
        -- 기존 employee 레코드 확인
        SELECT id INTO v_employee_id
        FROM employees
        WHERE email = 'archt723@gmail.com';
        
        IF v_employee_id IS NOT NULL THEN
            -- 기존 레코드 업데이트
            UPDATE employees SET
                auth_user_id = v_user_id,
                role = 'MASTER_ADMIN',
                is_master_admin = true,
                is_active = true,
                approval_status = 'APPROVED',
                organization_id = '00000000-0000-0000-0000-000000000001',
                branch_id = '00000000-0000-0000-0000-000000000002',
                department_id = '00000000-0000-0000-0000-000000000003',
                position_id = '00000000-0000-0000-0000-000000000004',
                updated_at = NOW()
            WHERE id = v_employee_id;
            
            RAISE NOTICE '✅ archt723@gmail.com이 마스터 관리자로 업데이트되었습니다!';
        ELSE
            -- 새 레코드 생성
            INSERT INTO employees (
                id,
                auth_user_id,
                organization_id,
                branch_id,
                department_id,
                position_id,
                employee_code,
                name,
                email,
                phone,
                approval_status,
                role,
                is_master_admin,
                is_active,
                join_date
            ) VALUES (
                uuid_generate_v4(),
                v_user_id,
                '00000000-0000-0000-0000-000000000001',
                '00000000-0000-0000-0000-000000000002',
                '00000000-0000-0000-0000-000000000003',
                '00000000-0000-0000-0000-000000000004',
                'MASTER-001',
                'Master Admin',
                'archt723@gmail.com',
                '010-0000-0000',
                'APPROVED',
                'MASTER_ADMIN',
                true,
                true,
                CURRENT_DATE
            );
            
            RAISE NOTICE '✅ archt723@gmail.com이 마스터 관리자로 생성되었습니다!';
        END IF;
        
        RAISE NOTICE '';
        RAISE NOTICE '🔐 마스터 관리자 설정 완료!';
        RAISE NOTICE '   이메일: archt723@gmail.com';
        RAISE NOTICE '   역할: MASTER_ADMIN (최고 권한)';
        RAISE NOTICE '   상태: 활성화됨';
        RAISE NOTICE '';
        RAISE NOTICE '📱 접속 가능한 페이지:';
        RAISE NOTICE '   - 일반 로그인: /login';
        RAISE NOTICE '   - 마스터 관리자: /master-admin/login';
        RAISE NOTICE '   - 모든 관리 기능에 접근 가능';
    END IF;
END $$;

-- 4. RLS (Row Level Security) 정책 설정
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- 마스터 관리자는 모든 데이터에 접근 가능
CREATE POLICY "Master admin has full access to employees" ON employees
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE auth_user_id = auth.uid()
            AND is_master_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees
            WHERE auth_user_id = auth.uid()
            AND is_master_admin = true
        )
    );

-- 자신의 데이터는 볼 수 있음
CREATE POLICY "Users can view own employee data" ON employees
    FOR SELECT 
    USING (auth.uid() = auth_user_id);

-- 조직, 지점 등은 모두가 읽을 수 있음
CREATE POLICY "Public read for organizations" ON organizations
    FOR SELECT USING (true);

CREATE POLICY "Public read for branches" ON branches
    FOR SELECT USING (true);

CREATE POLICY "Public read for departments" ON departments
    FOR SELECT USING (true);

CREATE POLICY "Public read for positions" ON positions
    FOR SELECT USING (true);

-- 마스터 관리자만 수정 가능
CREATE POLICY "Master admin can modify organizations" ON organizations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE auth_user_id = auth.uid()
            AND is_master_admin = true
        )
    );

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 설정 완료!';
    RAISE NOTICE '========================================';
END $$;