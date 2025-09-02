-- ================================================
-- Test Data Seed Script for DOT Attendance System
-- Version: 1.0.0
-- Date: 2025-01-02
-- ================================================

-- Clean up existing test data first
DELETE FROM attendance WHERE employee_id IN (
    SELECT id FROM employees WHERE email LIKE '%@dot-test.com'
);
DELETE FROM employees WHERE email LIKE '%@dot-test.com';
DELETE FROM branches WHERE code LIKE 'TEST-%';
DELETE FROM organizations WHERE code = 'DOT-TEST';

-- ================================================
-- 1. Create Test Organization
-- ================================================
INSERT INTO organizations (id, name, code, description, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'DOT 테스트 회사', 'DOT-TEST', '테스트용 조직', true);

-- ================================================
-- 2. Create Test Branches
-- ================================================
INSERT INTO branches (id, organization_id, name, code, address, latitude, longitude, geofence_radius, is_active) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '강남본사', 'TEST-GANGNAM', '서울시 강남구 테헤란로 123', 37.5665, 126.9780, 100, true),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '판교점', 'TEST-PANGYO', '경기도 성남시 판교역로 456', 37.3947, 127.1108, 100, true),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '여의도점', 'TEST-YEOUIDO', '서울시 영등포구 여의도동 789', 37.5219, 126.9245, 100, true);

-- ================================================
-- 3. Create Test Departments
-- ================================================
INSERT INTO departments (id, organization_id, branch_id, name, code, description, is_active) VALUES
    ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '영업팀', 'SALES', '영업 부서', true),
    ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '관리팀', 'ADMIN', '관리 부서', true);

-- ================================================
-- 4. Create Test Positions
-- ================================================
INSERT INTO positions (id, organization_id, department_id, name, code, level, description, is_active) VALUES
    ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', '대표이사', 'CEO', 10, '최고 경영자', true),
    ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', '팀장', 'MANAGER', 5, '팀 관리자', true),
    ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '직원', 'EMPLOYEE', 1, '일반 직원', true);

-- ================================================
-- 5. Create Supabase Auth Users (if not exists)
-- ================================================
-- Note: In production, use Supabase Auth API to create users
-- This is for reference only - actual auth users need to be created via Supabase Dashboard or API

-- ================================================
-- 6. Create Test Employees
-- ================================================

-- Master Admin
INSERT INTO employees (
    id, 
    organization_id, 
    branch_id, 
    department_id, 
    position_id,
    employee_code,
    name, 
    email, 
    phone,
    password_hash, -- In production, use proper password hashing
    device_id,
    approval_status,
    role,
    is_master_admin,
    is_active,
    date_of_birth,
    join_date
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    'EMP-MASTER-001',
    '마스터 관리자',
    'master.admin@dot-test.com',
    '010-1111-1111',
    '$2a$10$YourHashedPasswordHere', -- MasterAdmin123!@#
    'TEST-DEVICE-MASTER',
    'APPROVED',
    'MASTER_ADMIN',
    true,
    true,
    '1980-01-01',
    '2024-01-01'
);

-- Organization Admin
INSERT INTO employees (
    id, 
    organization_id, 
    branch_id, 
    department_id, 
    position_id,
    employee_code,
    name, 
    email, 
    phone,
    password_hash,
    device_id,
    approval_status,
    role,
    is_master_admin,
    is_active,
    date_of_birth,
    join_date
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '66666666-6666-6666-6666-666666666666',
    '88888888-8888-8888-8888-888888888888',
    'EMP-ADMIN-001',
    '조직 관리자',
    'admin@dot-test.com',
    '010-2222-2222',
    '$2a$10$YourHashedPasswordHere', -- Admin123!@#
    'TEST-DEVICE-ADMIN',
    'APPROVED',
    'ADMIN',
    false,
    true,
    '1985-05-15',
    '2024-01-15'
);

-- Branch Manager
INSERT INTO employees (
    id, 
    organization_id, 
    branch_id, 
    department_id, 
    position_id,
    employee_code,
    name, 
    email, 
    phone,
    password_hash,
    device_id,
    approval_status,
    role,
    is_master_admin,
    is_active,
    date_of_birth,
    join_date
) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555555',
    '88888888-8888-8888-8888-888888888888',
    'EMP-MGR-001',
    '지점 매니저',
    'manager@gangnam.dot-test.com',
    '010-3333-3333',
    '$2a$10$YourHashedPasswordHere', -- Manager123!@#
    'TEST-DEVICE-MANAGER',
    'APPROVED',
    'MANAGER',
    false,
    true,
    '1990-03-20',
    '2024-02-01'
);

-- Regular Employee 1 (Approved)
INSERT INTO employees (
    id, 
    organization_id, 
    branch_id, 
    department_id, 
    position_id,
    employee_code,
    name, 
    email, 
    phone,
    password_hash,
    device_id,
    approval_status,
    role,
    is_master_admin,
    is_active,
    date_of_birth,
    join_date
) VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555555',
    '99999999-9999-9999-9999-999999999999',
    'EMP-001',
    '김직원',
    'employee1@dot-test.com',
    '010-4444-4444',
    '$2a$10$YourHashedPasswordHere', -- Employee123!@#
    'TEST-DEVICE-EMP1',
    'APPROVED',
    'EMPLOYEE',
    false,
    true,
    '1995-07-10',
    '2024-03-01'
);

-- New Employee (Pending Approval)
INSERT INTO employees (
    id, 
    organization_id, 
    branch_id, 
    department_id, 
    position_id,
    employee_code,
    name, 
    email, 
    phone,
    password_hash,
    device_id,
    approval_status,
    role,
    is_master_admin,
    is_active,
    date_of_birth,
    join_date
) VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555555',
    '99999999-9999-9999-9999-999999999999',
    'EMP-NEW-001',
    '박신입',
    'newuser@dot-test.com',
    '010-5555-5555',
    '$2a$10$YourHashedPasswordHere', -- NewUser123!@#
    'TEST-DEVICE-NEW',
    'PENDING',
    'EMPLOYEE',
    false,
    false, -- Not active until approved
    '2000-12-25',
    NULL -- Not joined yet
);

-- ================================================
-- 7. Create Test QR Codes
-- ================================================
INSERT INTO qr_codes (
    id,
    organization_id,
    branch_id,
    code,
    type,
    name,
    description,
    valid_from,
    valid_until,
    is_active,
    metadata
) VALUES
    ('qr111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 
     'QR-GANGNAM-001', 'check_in', '강남본사 출근 QR', '강남본사 입구 QR 코드', NOW(), '2025-12-31', true, '{"location": "entrance"}'),
    ('qr222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 
     'QR-PANGYO-001', 'check_in', '판교점 출근 QR', '판교점 입구 QR 코드', NOW(), '2025-12-31', true, '{"location": "entrance"}'),
    ('qr333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 
     'QR-YEOUIDO-001', 'check_in', '여의도점 출근 QR', '여의도점 입구 QR 코드', NOW(), '2025-12-31', true, '{"location": "entrance"}');

-- ================================================
-- 8. Create Sample Attendance Records (Optional)
-- ================================================
INSERT INTO attendance (
    id,
    employee_id,
    date,
    check_in_time,
    check_in_latitude,
    check_in_longitude,
    status,
    total_work_minutes
) VALUES
    (gen_random_uuid(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', CURRENT_DATE, NOW() - INTERVAL '2 hours', 37.5665, 126.9780, 'WORKING', 120),
    (gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', CURRENT_DATE, NOW() - INTERVAL '3 hours', 37.5665, 126.9780, 'WORKING', 180);

-- ================================================
-- 9. Grant Permissions
-- ================================================
-- Note: RLS policies handle permissions automatically based on roles

-- ================================================
-- Success Message
-- ================================================
DO $$
BEGIN
    RAISE NOTICE 'Test data successfully created!';
    RAISE NOTICE 'Test accounts:';
    RAISE NOTICE '  Master Admin: master.admin@dot-test.com / MasterAdmin123!@#';
    RAISE NOTICE '  Admin: admin@dot-test.com / Admin123!@#';
    RAISE NOTICE '  Manager: manager@gangnam.dot-test.com / Manager123!@#';
    RAISE NOTICE '  Employee: employee1@dot-test.com / Employee123!@#';
    RAISE NOTICE '  New User: newuser@dot-test.com / NewUser123!@# (Pending Approval)';
END $$;