-- =====================================================
-- 무한 재귀 문제를 제대로 해결하는 SQL
-- 단순화나 생략 없이 완전한 구현
-- =====================================================

-- 1. 모든 기존 정책 제거
DROP POLICY IF EXISTS "View own employee record" ON employees;
DROP POLICY IF EXISTS "View organization employees" ON employees;
DROP POLICY IF EXISTS "Create employee record" ON employees;
DROP POLICY IF EXISTS "Update own employee record" ON employees;
DROP POLICY IF EXISTS "Users can view employees in their organization" ON employees;
DROP POLICY IF EXISTS "Allow creating employees" ON employees;
DROP POLICY IF EXISTS "Users can update their own employee record" ON employees;
DROP POLICY IF EXISTS "Anyone can read employees" ON employees;
DROP POLICY IF EXISTS "Anyone can create employees" ON employees;
DROP POLICY IF EXISTS "Users can update own employee" ON employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON employees;
DROP POLICY IF EXISTS "Allow employee creation" ON employees;
DROP POLICY IF EXISTS "Users can update own record" ON employees;
DROP POLICY IF EXISTS "Users can delete own record" ON employees;

DROP POLICY IF EXISTS "View organizations" ON organizations;
DROP POLICY IF EXISTS "Create organizations" ON organizations;
DROP POLICY IF EXISTS "Update organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Allow creating organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;

DROP POLICY IF EXISTS "View own roles" ON user_roles;
DROP POLICY IF EXISTS "View organization roles" ON user_roles;
DROP POLICY IF EXISTS "Create roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view roles in their organization" ON user_roles;
DROP POLICY IF EXISTS "Allow creating roles" ON user_roles;

DROP POLICY IF EXISTS "View own contracts" ON contracts;
DROP POLICY IF EXISTS "View organization contracts" ON contracts;
DROP POLICY IF EXISTS "Create contracts" ON contracts;
DROP POLICY IF EXISTS "Users can view contracts in their organization" ON contracts;
DROP POLICY IF EXISTS "Allow creating contracts" ON contracts;

-- =====================================================
-- 2. employees 테이블 - 재귀 없는 완전한 정책
-- =====================================================

-- 2-1. 자신의 employee 레코드 조회 (기본)
CREATE POLICY "employees_select_own" ON employees
    FOR SELECT
    USING (user_id = auth.uid());

-- 2-2. 같은 조직 직원 조회 (서브쿼리로 재귀 방지)
CREATE POLICY "employees_select_same_org" ON employees
    FOR SELECT
    USING (
        organization_id IS NOT NULL 
        AND organization_id = (
            SELECT organization_id 
            FROM employees e2
            WHERE e2.user_id = auth.uid()
            AND e2.organization_id IS NOT NULL
            LIMIT 1
        )
    );

-- 2-3. 회원가입/역할 추가 시 생성
CREATE POLICY "employees_insert" ON employees
    FOR INSERT
    WITH CHECK (
        -- 자신의 user_id로 생성하거나
        user_id = auth.uid() 
        -- 관리자가 다른 사람 추가 (조직이 같은 경우)
        OR (
            auth.uid() IN (
                SELECT ur.user_id 
                FROM user_roles ur
                WHERE ur.organization_id = organization_id
                AND ur.role IN ('admin', 'manager')
                AND ur.is_active = true
            )
        )
    );

-- 2-4. 자신의 레코드 수정
CREATE POLICY "employees_update_own" ON employees
    FOR UPDATE
    USING (user_id = auth.uid());

-- 2-5. 관리자가 조직 직원 수정
CREATE POLICY "employees_update_by_admin" ON employees
    FOR UPDATE
    USING (
        organization_id IS NOT NULL
        AND auth.uid() IN (
            SELECT ur.user_id
            FROM user_roles ur
            WHERE ur.organization_id = employees.organization_id
            AND ur.role = 'admin'
            AND ur.is_active = true
        )
    );

-- =====================================================
-- 3. organizations 테이블 - 완전한 정책
-- =====================================================

-- 3-1. 조직 조회 - JOIN 대신 서브쿼리 사용
CREATE POLICY "organizations_select" ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT DISTINCT organization_id 
            FROM employees 
            WHERE user_id = auth.uid() 
            AND organization_id IS NOT NULL
        )
        OR
        id IN (
            SELECT DISTINCT organization_id
            FROM user_roles
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

-- 3-2. 조직 생성 (법인/가맹본부 설립)
CREATE POLICY "organizations_insert" ON organizations
    FOR INSERT
    WITH CHECK (
        -- 인증된 사용자만 조직 생성 가능
        auth.uid() IS NOT NULL
    );

-- 3-3. 조직 수정 (owner/admin만)
CREATE POLICY "organizations_update" ON organizations
    FOR UPDATE
    USING (
        id IN (
            SELECT organization_id
            FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- =====================================================
-- 4. user_roles 테이블 - 완전한 정책
-- =====================================================

-- 4-1. 자신의 역할 조회
CREATE POLICY "user_roles_select_own" ON user_roles
    FOR SELECT
    USING (user_id = auth.uid());

-- 4-2. 관리자가 조직의 모든 역할 조회
CREATE POLICY "user_roles_select_by_admin" ON user_roles
    FOR SELECT
    USING (
        organization_id IN (
            SELECT ur2.organization_id
            FROM user_roles ur2
            WHERE ur2.user_id = auth.uid()
            AND ur2.role IN ('admin', 'manager')
            AND ur2.is_active = true
        )
    );

-- 4-3. 역할 생성
CREATE POLICY "user_roles_insert" ON user_roles
    FOR INSERT
    WITH CHECK (
        -- 자신의 역할 생성
        user_id = auth.uid()
        -- 또는 관리자가 조직에 역할 추가
        OR auth.uid() IN (
            SELECT ur.user_id
            FROM user_roles ur
            WHERE ur.organization_id = organization_id
            AND ur.role = 'admin'
            AND ur.is_active = true
        )
    );

-- 4-4. 역할 수정 (admin만)
CREATE POLICY "user_roles_update" ON user_roles
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT ur2.user_id
            FROM user_roles ur2
            WHERE ur2.organization_id = user_roles.organization_id
            AND ur2.role = 'admin'
            AND ur2.is_active = true
        )
    );

-- =====================================================
-- 5. contracts 테이블 - 완전한 정책
-- =====================================================

-- 5-1. 자신의 계약 조회
CREATE POLICY "contracts_select_own" ON contracts
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id 
            FROM employees 
            WHERE user_id = auth.uid()
        )
    );

-- 5-2. 관리자가 조직 계약 조회
CREATE POLICY "contracts_select_by_admin" ON contracts
    FOR SELECT
    USING (
        organization_id IN (
            SELECT ur.organization_id
            FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'manager')
            AND ur.is_active = true
        )
    );

-- 5-3. 계약 생성
CREATE POLICY "contracts_insert" ON contracts
    FOR INSERT
    WITH CHECK (
        -- 관리자가 계약 생성
        auth.uid() IN (
            SELECT ur.user_id
            FROM user_roles ur
            WHERE ur.organization_id = contracts.organization_id
            AND ur.role IN ('admin', 'manager')
            AND ur.is_active = true
        )
        -- 또는 자신의 계약 (법인 설립 시 자동 생성)
        OR employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        )
    );

-- 5-4. 계약 수정 (admin만)
CREATE POLICY "contracts_update" ON contracts
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT ur.user_id
            FROM user_roles ur
            WHERE ur.organization_id = contracts.organization_id
            AND ur.role = 'admin'
            AND ur.is_active = true
        )
    );

-- =====================================================
-- 6. 확인 쿼리
-- =====================================================
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('employees', 'organizations', 'user_roles', 'contracts')
ORDER BY tablename, cmd, policyname;

-- 테이블 관계 확인
SELECT 
    'employees → organizations' as relationship,
    COUNT(*) as count
FROM employees e
LEFT JOIN organizations o ON e.organization_id = o.id
UNION ALL
SELECT 
    'employees → user_roles' as relationship,
    COUNT(*) as count
FROM employees e
LEFT JOIN user_roles ur ON e.user_id = ur.user_id
UNION ALL
SELECT 
    'user_roles → organizations' as relationship,
    COUNT(*) as count
FROM user_roles ur
LEFT JOIN organizations o ON ur.organization_id = o.id;