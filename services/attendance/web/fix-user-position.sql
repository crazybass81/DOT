-- crazybass81@naver.com 계정 position 수정

-- 1. 현재 상태 확인
SELECT 
    'BEFORE' as status,
    e.email,
    e.position,
    e.organization_id,
    o.name as organization_name
FROM employees e
LEFT JOIN organizations o ON e.organization_id = o.id
JOIN auth.users u ON e.user_id = u.id
WHERE u.email = 'crazybass81@naver.com';

-- 2. position을 admin 또는 owner로 수정
-- 개인사업자면 admin, 법인이면 owner
UPDATE employees
SET 
    position = 'admin',  -- 또는 'owner'
    updated_at = now()
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'crazybass81@naver.com'
);

-- 3. user_roles 테이블에도 역할 추가 (없다면)
INSERT INTO user_roles (user_id, organization_id, role, is_active)
SELECT 
    u.id,
    e.organization_id,
    'admin',  -- 또는 'owner'
    true
FROM auth.users u
JOIN employees e ON e.user_id = u.id
WHERE u.email = 'crazybass81@naver.com'
    AND e.organization_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = u.id 
        AND ur.organization_id = e.organization_id
    );

-- 4. 수정 후 확인
SELECT 
    'AFTER' as status,
    e.email,
    e.position,
    e.organization_id,
    o.name as organization_name,
    ur.role as user_role
FROM employees e
LEFT JOIN organizations o ON e.organization_id = o.id
LEFT JOIN user_roles ur ON ur.user_id = e.user_id AND ur.organization_id = e.organization_id
JOIN auth.users u ON e.user_id = u.id
WHERE u.email = 'crazybass81@naver.com';

-- 완료 메시지
SELECT '✅ Position이 admin/owner로 수정되었습니다. 다시 로그인하면 사업자 대시보드로 이동합니다!' as message;