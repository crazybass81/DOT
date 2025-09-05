-- =====================================================
-- 조직 기반 접근 제어 테스트 스크립트
-- =====================================================

-- 1. 현재 RLS 정책 확인
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename IN ('employees', 'organizations', 'user_roles', 'contracts')
ORDER BY tablename, cmd, policyname;

-- 2. 헬퍼 함수 존재 확인
SELECT 
    proname as function_name,
    prosecdef as security_definer,
    provolatile as volatility
FROM pg_proc
WHERE proname IN ('get_user_organization_id', 'user_has_role', 'get_user_employee_id');

-- 3. 테이블 관계 확인
SELECT 
    'employees' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT organization_id) as unique_orgs,
    COUNT(*) FILTER (WHERE organization_id IS NOT NULL) as with_org,
    COUNT(*) FILTER (WHERE organization_id IS NULL) as without_org
FROM employees

UNION ALL

SELECT 
    'user_roles' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT organization_id) as unique_orgs,
    COUNT(*) as with_org,
    0 as without_org
FROM user_roles

UNION ALL

SELECT 
    'contracts' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT employee_id) as unique_users,
    COUNT(DISTINCT organization_id) as unique_orgs,
    COUNT(*) as with_org,
    0 as without_org
FROM contracts;

-- 4. RLS 활성화 상태 확인
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('employees', 'organizations', 'user_roles', 'contracts')
  AND schemaname = 'public';

-- 5. 사용자별 접근 권한 테스트 (예시)
-- 실제 사용자 ID로 대체하여 테스트
-- SELECT * FROM get_user_organization_id('user-uuid-here');
-- SELECT * FROM user_has_role('user-uuid-here', 'org-uuid-here', ARRAY['admin', 'manager']);
-- SELECT * FROM get_user_employee_id('user-uuid-here');

-- 완료 메시지
SELECT '✅ 조직 기반 접근 제어 테스트 완료!' as message;