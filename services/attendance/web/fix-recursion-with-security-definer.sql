-- =====================================================
-- 무한 재귀 완전 해결 - SECURITY DEFINER 함수 사용
-- =====================================================

-- 1. 모든 기존 정책 삭제
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select_own" ON employees;
DROP POLICY IF EXISTS "employees_select_same_org" ON employees;
DROP POLICY IF EXISTS "employees_insert" ON employees;
DROP POLICY IF EXISTS "employees_update_own" ON employees;
DROP POLICY IF EXISTS "employees_update_by_admin" ON employees;
DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;
DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_by_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "contracts_select_own" ON contracts;
DROP POLICY IF EXISTS "contracts_select_by_admin" ON contracts;
DROP POLICY IF EXISTS "contracts_insert" ON contracts;
DROP POLICY IF EXISTS "contracts_update" ON contracts;

-- 이전 정책들도 모두 삭제
DROP POLICY IF EXISTS "View own employee record" ON employees CASCADE;
DROP POLICY IF EXISTS "View organization employees" ON employees CASCADE;
DROP POLICY IF EXISTS "Create employee record" ON employees CASCADE;
DROP POLICY IF EXISTS "Update own employee record" ON employees CASCADE;
DROP POLICY IF EXISTS "Users can view employees in their organization" ON employees CASCADE;
DROP POLICY IF EXISTS "Allow creating employees" ON employees CASCADE;
DROP POLICY IF EXISTS "Users can update their own employee record" ON employees CASCADE;
DROP POLICY IF EXISTS "Anyone can read employees" ON employees CASCADE;
DROP POLICY IF EXISTS "Anyone can create employees" ON employees CASCADE;
DROP POLICY IF EXISTS "Users can update own employee" ON employees CASCADE;
DROP POLICY IF EXISTS "Users can view own employee record" ON employees CASCADE;
DROP POLICY IF EXISTS "Allow employee creation" ON employees CASCADE;
DROP POLICY IF EXISTS "Users can update own record" ON employees CASCADE;
DROP POLICY IF EXISTS "Users can delete own record" ON employees CASCADE;

-- =====================================================
-- 2. 헬퍼 함수 생성 (재귀 방지)
-- =====================================================

-- 사용자의 조직 ID 가져오기 (재귀 없음)
CREATE OR REPLACE FUNCTION get_user_organization_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id 
    FROM employees 
    WHERE user_id = user_uuid 
    AND organization_id IS NOT NULL
    LIMIT 1;
$$;

-- 사용자의 역할 확인 (재귀 없음)
CREATE OR REPLACE FUNCTION user_has_role(user_uuid UUID, org_uuid UUID, roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM user_roles 
        WHERE user_id = user_uuid 
        AND organization_id = org_uuid 
        AND role = ANY(roles)
        AND is_active = true
    );
$$;

-- 사용자의 employee ID 가져오기
CREATE OR REPLACE FUNCTION get_user_employee_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id 
    FROM employees 
    WHERE user_id = user_uuid
    LIMIT 1;
$$;

-- =====================================================
-- 3. employees 테이블 RLS 정책 (재귀 없음)
-- =====================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 3-1. SELECT: 자신의 레코드
CREATE POLICY "emp_select_own" ON employees
    FOR SELECT
    USING (user_id = auth.uid());

-- 3-2. SELECT: 같은 조직 (함수 사용으로 재귀 방지)
CREATE POLICY "emp_select_org" ON employees
    FOR SELECT
    USING (
        organization_id IS NOT NULL 
        AND organization_id = get_user_organization_id(auth.uid())
        AND organization_id IS NOT NULL
    );

-- 3-3. INSERT: 회원가입 또는 관리자가 추가
CREATE POLICY "emp_insert" ON employees
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR user_has_role(auth.uid(), organization_id, ARRAY['admin', 'manager'])
    );

-- 3-4. UPDATE: 자신의 레코드
CREATE POLICY "emp_update_own" ON employees
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 3-5. UPDATE: 관리자
CREATE POLICY "emp_update_admin" ON employees
    FOR UPDATE
    USING (
        organization_id IS NOT NULL
        AND user_has_role(auth.uid(), organization_id, ARRAY['admin'])
    );

-- =====================================================
-- 4. organizations 테이블 RLS 정책
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 4-1. SELECT: 소속 조직
CREATE POLICY "org_select" ON organizations
    FOR SELECT
    USING (
        id = get_user_organization_id(auth.uid())
        OR user_has_role(auth.uid(), id, ARRAY['admin', 'manager', 'worker'])
    );

-- 4-2. INSERT: 조직 생성
CREATE POLICY "org_insert" ON organizations
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 4-3. UPDATE: admin/owner만
CREATE POLICY "org_update" ON organizations
    FOR UPDATE
    USING (user_has_role(auth.uid(), id, ARRAY['owner', 'admin']))
    WITH CHECK (user_has_role(auth.uid(), id, ARRAY['owner', 'admin']));

-- =====================================================
-- 5. user_roles 테이블 RLS 정책
-- =====================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 5-1. SELECT: 자신의 역할
CREATE POLICY "role_select_own" ON user_roles
    FOR SELECT
    USING (user_id = auth.uid());

-- 5-2. SELECT: 관리자는 조직 전체
CREATE POLICY "role_select_admin" ON user_roles
    FOR SELECT
    USING (
        user_has_role(auth.uid(), organization_id, ARRAY['admin', 'manager'])
    );

-- 5-3. INSERT: 역할 생성
CREATE POLICY "role_insert" ON user_roles
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR user_has_role(auth.uid(), organization_id, ARRAY['admin'])
    );

-- 5-4. UPDATE: admin만
CREATE POLICY "role_update" ON user_roles
    FOR UPDATE
    USING (user_has_role(auth.uid(), organization_id, ARRAY['admin']))
    WITH CHECK (user_has_role(auth.uid(), organization_id, ARRAY['admin']));

-- =====================================================
-- 6. contracts 테이블 RLS 정책
-- =====================================================

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- 6-1. SELECT: 자신의 계약
CREATE POLICY "contract_select_own" ON contracts
    FOR SELECT
    USING (employee_id = get_user_employee_id(auth.uid()));

-- 6-2. SELECT: 관리자는 조직 전체
CREATE POLICY "contract_select_admin" ON contracts
    FOR SELECT
    USING (
        user_has_role(auth.uid(), organization_id, ARRAY['admin', 'manager'])
    );

-- 6-3. INSERT: 계약 생성
CREATE POLICY "contract_insert" ON contracts
    FOR INSERT
    WITH CHECK (
        user_has_role(auth.uid(), organization_id, ARRAY['admin', 'manager'])
        OR employee_id = get_user_employee_id(auth.uid())
    );

-- 6-4. UPDATE: admin만
CREATE POLICY "contract_update" ON contracts
    FOR UPDATE
    USING (user_has_role(auth.uid(), organization_id, ARRAY['admin']))
    WITH CHECK (user_has_role(auth.uid(), organization_id, ARRAY['admin']));

-- =====================================================
-- 7. 권한 부여
-- =====================================================

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION get_user_organization_id TO anon, authenticated;
GRANT EXECUTE ON FUNCTION user_has_role TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_employee_id TO anon, authenticated;

-- =====================================================
-- 8. 검증
-- =====================================================

-- 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('employees', 'organizations', 'user_roles', 'contracts')
ORDER BY tablename, cmd;

-- 함수 확인
SELECT 
    proname as function_name,
    prosecdef as security_definer
FROM pg_proc
WHERE proname IN ('get_user_organization_id', 'user_has_role', 'get_user_employee_id');

-- 완료 메시지
SELECT '✅ RLS 정책이 재귀 없이 완전히 구현되었습니다!' as message;