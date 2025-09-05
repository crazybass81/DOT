-- crazybass81@naver.com 계정 상태 확인 (간단 버전)

-- 1. 사용자 및 Employee 정보 확인
SELECT 
    u.id as user_id,
    u.email,
    e.id as employee_id,
    e.name,
    e.position,  -- 핵심! worker인지 admin/owner인지
    e.organization_id,
    e.is_active
FROM auth.users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE u.email = 'crazybass81@naver.com';

-- 2. 조직 정보 확인 (있다면)
SELECT 
    o.*
FROM organizations o
JOIN employees e ON e.organization_id = o.id
JOIN auth.users u ON e.user_id = u.id
WHERE u.email = 'crazybass81@naver.com';

-- 3. User Roles 확인
SELECT 
    ur.*
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'crazybass81@naver.com';

-- 4. Position 수정 쿼리 (필요한 경우)
-- UPDATE employees
-- SET position = 'admin'
-- WHERE user_id IN (
--     SELECT id FROM auth.users 
--     WHERE email = 'crazybass81@naver.com'
-- );

SELECT '⚠️ position이 worker로 되어있다면 위 UPDATE 쿼리 주석을 해제하고 실행하세요!' as message;