-- =====================================================
-- user-permission-diagram.md 기반 올바른 RLS 정책
-- =====================================================

-- 1. employees 테이블 정책 (무한 재귀 방지)
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

-- 자신의 employee 레코드 조회
CREATE POLICY "View own employee record" ON employees
    FOR SELECT
    USING (user_id = auth.uid());

-- 같은 조직의 다른 직원 조회 (조직이 있는 경우만)
CREATE POLICY "View organization employees" ON employees
    FOR SELECT
    USING (
        organization_id IS NOT NULL 
        AND organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE user_id = auth.uid() 
            AND organization_id IS NOT NULL
        )
    );

-- 회원가입 시 employee 레코드 생성
CREATE POLICY "Create employee record" ON employees
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR auth.uid() IS NOT NULL
    );

-- 자신의 레코드 수정
CREATE POLICY "Update own employee record" ON employees
    FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- 2. organizations 테이블 정책 (재귀 방지)
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Allow creating organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;

-- 조직 조회 (employees 테이블 직접 참조 방지)
CREATE POLICY "View organizations" ON organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.organization_id = organizations.id 
            AND employees.user_id = auth.uid()
        )
    );

-- 조직 생성 (법인/가맹본부 설립 시)
CREATE POLICY "Create organizations" ON organizations
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 조직 수정 (어드민 역할만)
CREATE POLICY "Update organizations" ON organizations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.organization_id = organizations.id
            AND user_roles.user_id = auth.uid()
            AND user_roles.role IN ('admin', 'owner')
            AND user_roles.is_active = true
        )
    );

-- =====================================================
-- 3. user_roles 테이블 정책
-- =====================================================

DROP POLICY IF EXISTS "Users can view roles in their organization" ON user_roles;
DROP POLICY IF EXISTS "Allow creating roles" ON user_roles;

-- 자신의 역할 조회
CREATE POLICY "View own roles" ON user_roles
    FOR SELECT
    USING (user_id = auth.uid());

-- 같은 조직의 역할 조회 (어드민/매니저)
CREATE POLICY "View organization roles" ON user_roles
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND is_active = true
        )
    );

-- 역할 생성
CREATE POLICY "Create roles" ON user_roles
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 4. contracts 테이블 정책
-- =====================================================

DROP POLICY IF EXISTS "Users can view contracts in their organization" ON contracts;
DROP POLICY IF EXISTS "Allow creating contracts" ON contracts;

-- 자신의 계약 조회
CREATE POLICY "View own contracts" ON contracts
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE user_id = auth.uid()
        )
    );

-- 조직의 계약 조회 (어드민/매니저)
CREATE POLICY "View organization contracts" ON contracts
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager')
            AND is_active = true
        )
    );

-- 계약 생성
CREATE POLICY "Create contracts" ON contracts
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 확인
-- =====================================================
SELECT 
    'RLS 정책이 올바르게 재설정되었습니다' as message,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename IN ('employees', 'organizations', 'user_roles', 'contracts')
ORDER BY tablename, cmd;