-- 테이블 구조 확인 스크립트

-- 1. organizations 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. employees 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employees'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. user_roles 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_roles'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. contracts 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
    AND table_schema = 'public'
ORDER BY ordinal_position;