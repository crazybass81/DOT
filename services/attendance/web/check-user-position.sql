-- crazybass81@naver.com 계정 상태 확인

-- 1. Auth 사용자 확인
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
WHERE email = 'crazybass81@naver.com';

-- 2. Employee 정보 확인
SELECT 
    e.id,
    e.user_id,
    e.email,
    e.name,
    e.position,  -- 이게 핵심! worker인지 admin/owner인지
    e.organization_id,
    e.is_active,
    e.created_at,
    e.updated_at
FROM employees e
JOIN auth.users u ON e.user_id = u.id
WHERE u.email = 'crazybass81@naver.com';

-- 3. 조직 정보 확인 (있다면)
SELECT 
    o.id,
    o.name,
    o.biz_type,
    o.biz_number,
    o.created_at
FROM organizations o
JOIN employees e ON e.organization_id = o.id
JOIN auth.users u ON e.user_id = u.id
WHERE u.email = 'crazybass81@naver.com';

-- 4. User Roles 확인
SELECT 
    ur.id,
    ur.user_id,
    ur.organization_id,
    ur.role,
    ur.is_active,
    ur.created_at
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'crazybass81@naver.com';

-- 5. 문제 진단
SELECT 
    'User ID' as info_type,
    u.id as value
FROM auth.users u
WHERE u.email = 'crazybass81@naver.com'
UNION ALL
SELECT 
    'Employee Position' as info_type,
    e.position as value
FROM employees e
JOIN auth.users u ON e.user_id = u.id
WHERE u.email = 'crazybass81@naver.com'
UNION ALL
SELECT 
    'Organization ID' as info_type,
    COALESCE(e.organization_id::text, 'NULL') as value
FROM employees e
JOIN auth.users u ON e.user_id = u.id
WHERE u.email = 'crazybass81@naver.com'
UNION ALL
SELECT 
    'User Role' as info_type,
    COALESCE(ur.role, 'NO ROLE') as value
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'crazybass81@naver.com';

-- 수정 방법 제안
SELECT 
    '⚠️ Position 수정이 필요한 경우 아래 쿼리 실행:' as message;