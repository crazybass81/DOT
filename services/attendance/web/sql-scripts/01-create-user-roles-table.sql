-- Phase 1.1: user_roles 테이블 생성
-- TDD: 테스트를 통과시키기 위한 최소 구현

-- 1. user_roles 테이블 생성
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('WORKER', 'ADMIN', 'MANAGER', 'FRANCHISE')),
    is_active BOOLEAN DEFAULT true,
    granted_at TIMESTAMP DEFAULT now(),
    granted_by UUID REFERENCES employees(id),
    
    -- 복합 인덱스: 조회 성능 최적화
    UNIQUE(employee_id, organization_id, role_type)
);

-- 2. 인덱스 생성 (쿼리 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_roles_employee_id ON user_roles(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;

-- 3. RLS (Row Level Security) 설정
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 - 자신과 관련된 역할만 조회 가능
CREATE POLICY "user_roles_select_own" ON user_roles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.id = user_roles.employee_id 
            AND employees.user_id = auth.uid()
        )
        OR
        -- 같은 조직의 관리자는 조회 가능
        EXISTS (
            SELECT 1 FROM employees e1
            JOIN user_roles ur1 ON e1.id = ur1.employee_id
            WHERE e1.user_id = auth.uid()
            AND ur1.organization_id = user_roles.organization_id
            AND ur1.role_type IN ('ADMIN', 'MANAGER')
            AND ur1.is_active = true
        )
    );

-- 5. RLS 정책 - 자신의 역할만 수정 가능
CREATE POLICY "user_roles_update_own" ON user_roles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.id = user_roles.employee_id 
            AND employees.user_id = auth.uid()
        )
    );

-- 6. RLS 정책 - 관리자만 역할 생성 가능
CREATE POLICY "user_roles_insert_admin" ON user_roles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees e
            JOIN user_roles ur ON e.id = ur.employee_id
            WHERE e.user_id = auth.uid()
            AND ur.organization_id = user_roles.organization_id
            AND ur.role_type IN ('ADMIN', 'OWNER')
            AND ur.is_active = true
        )
        OR
        -- 자신의 첫 역할은 생성 가능 (회원가입 시)
        NOT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.employee_id = user_roles.employee_id
        )
    );

-- 7. 권한 부여
GRANT ALL ON user_roles TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 8. 유틸리티 함수: 사용자의 모든 역할 조회
CREATE OR REPLACE FUNCTION get_user_roles(user_uuid UUID)
RETURNS TABLE(
    role_id UUID,
    organization_name TEXT,
    role_type TEXT,
    is_active BOOLEAN,
    granted_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ur.id as role_id,
        o.name as organization_name,
        ur.role_type,
        ur.is_active,
        ur.granted_at
    FROM user_roles ur
    JOIN employees e ON ur.employee_id = e.id
    JOIN organizations o ON ur.organization_id = o.id
    WHERE e.user_id = user_uuid
    AND ur.is_active = true
    ORDER BY ur.granted_at DESC;
END;
$$;

-- 9. 유틸리티 함수: 사용자가 특정 조직에서 특정 역할을 가지는지 확인
CREATE OR REPLACE FUNCTION has_role_in_organization(
    user_uuid UUID,
    org_id UUID,
    required_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN employees e ON ur.employee_id = e.id
        WHERE e.user_id = user_uuid
        AND ur.organization_id = org_id
        AND ur.role_type = required_role
        AND ur.is_active = true
    );
END;
$$;

COMMENT ON TABLE user_roles IS '사용자별 조직 내 역할 관리 테이블 - 다중 역할 지원';
COMMENT ON FUNCTION get_user_roles IS '사용자의 모든 활성 역할 조회';
COMMENT ON FUNCTION has_role_in_organization IS '특정 조직에서의 역할 보유 여부 확인';