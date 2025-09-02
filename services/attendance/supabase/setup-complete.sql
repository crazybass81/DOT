-- ================================================
-- Complete Supabase Setup Script
-- 이 SQL을 Supabase Dashboard의 SQL Editor에서 실행하세요
-- ================================================

-- 1. Extensions 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums 생성
DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('NOT_WORKING', 'WORKING', 'ON_BREAK', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE employee_role AS ENUM ('EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Organizations 테이블
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Branches 테이블
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

-- 5. Departments 테이블
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

-- 6. Positions 테이블
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

-- 7. Employees 테이블
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

-- 8. Attendance 테이블
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_out_time TIMESTAMPTZ,
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    status attendance_status DEFAULT 'NOT_WORKING',
    total_work_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 9. 테스트 데이터 삽입
-- 조직
INSERT INTO organizations (id, name, code, description) VALUES
    ('11111111-1111-1111-1111-111111111111', 'DOT 테스트 회사', 'DOT-TEST', '테스트용 조직')
ON CONFLICT (code) DO NOTHING;

-- 지점
INSERT INTO branches (id, organization_id, name, code, address, latitude, longitude) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 
     '강남본사', 'TEST-GANGNAM', '서울시 강남구 테헤란로 123', 37.5665, 126.9780)
ON CONFLICT (organization_id, code) DO NOTHING;

-- 부서
INSERT INTO departments (id, organization_id, branch_id, name, code) VALUES
    ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222', '영업팀', 'SALES'),
    ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222', '관리팀', 'ADMIN')
ON CONFLICT (organization_id, code) DO NOTHING;

-- 직급
INSERT INTO positions (id, organization_id, name, code, level) VALUES
    ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '대표이사', 'CEO', 10),
    ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '팀장', 'MANAGER', 5),
    ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '직원', 'EMPLOYEE', 1)
ON CONFLICT (organization_id, code) DO NOTHING;

-- 직원 (auth_user_id는 나중에 업데이트)
INSERT INTO employees (
    id, organization_id, branch_id, department_id, position_id,
    employee_code, name, email, phone, 
    approval_status, role, is_master_admin, is_active
) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666',
     '77777777-7777-7777-7777-777777777777', 'EMP-MASTER-001', '마스터 관리자',
     'master.admin@gmail.com', '010-1111-1111', 'APPROVED', 'MASTER_ADMIN', true, true),
    
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555',
     '88888888-8888-8888-8888-888888888888', 'EMP-MGR-001', '지점 매니저',
     'manager.gangnam@gmail.com', '010-3333-3333', 'APPROVED', 'MANAGER', false, true),
    
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555',
     '99999999-9999-9999-9999-999999999999', 'EMP-001', '김직원',
     'employee.kim2025@gmail.com', '010-4444-4444', 'APPROVED', 'EMPLOYEE', false, true)
ON CONFLICT (email) DO NOTHING;

-- 10. RLS 정책 설정
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- 직원이 자신의 데이터만 볼 수 있도록
CREATE POLICY "Users can view own employee data" ON employees
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Public read for organizations" ON organizations
    FOR SELECT USING (true);

CREATE POLICY "Public read for branches" ON branches
    FOR SELECT USING (true);

-- 11. Auth 사용자 연결 (수동으로 업데이트 필요)
-- Supabase Dashboard에서 생성한 사용자의 ID를 확인한 후 실행:
-- UPDATE employees SET auth_user_id = 'USER_ID_HERE' WHERE email = 'master.admin@gmail.com';

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Supabase 설정 완료!';
    RAISE NOTICE '다음 단계:';
    RAISE NOTICE '1. Authentication → Providers → Email에서 "Confirm email" 비활성화';
    RAISE NOTICE '2. Authentication → Users에서 테스트 계정 생성 또는 확인';
    RAISE NOTICE '3. 생성된 사용자 ID로 employees 테이블의 auth_user_id 업데이트';
END $$;