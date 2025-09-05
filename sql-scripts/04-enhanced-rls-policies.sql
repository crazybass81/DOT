-- ============================================================================
-- 조직별 데이터 격리를 위한 강화된 RLS 정책
-- Phase 3.1.3: 조직별 데이터 격리 RLS 정책 확장
-- ============================================================================

-- 1. 기존 RLS 정책 제거 및 재생성
DROP POLICY IF EXISTS "users_policy" ON users;
DROP POLICY IF EXISTS "organizations_policy" ON organizations;  
DROP POLICY IF EXISTS "user_roles_policy" ON user_roles;
DROP POLICY IF EXISTS "attendance_policy" ON attendance;

-- 2. 사용자별 접근 제어를 위한 보안 함수
CREATE OR REPLACE FUNCTION auth.user_role_organizations()
RETURNS TABLE(organization_id uuid, role role_type, is_active boolean)
LANGUAGE sql SECURITY DEFINER
STABLE
AS $$
  SELECT ur.organization_id, ur.role, ur.is_active
  FROM user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND (ur.end_date IS NULL OR ur.end_date > NOW());
$$;

-- 3. 마스터 어드민 여부 확인 함수
CREATE OR REPLACE FUNCTION auth.is_master_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_master_admin FROM users WHERE id = auth.uid()),
    false
  );
$$;

-- 4. 사용자 테이블 RLS 정책
-- 자신의 정보는 항상 조회 가능, 마스터 어드민은 모든 사용자 조회 가능
-- ADMIN 이상 권한자는 같은 조직의 사용자 조회 가능
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    -- 자신의 정보 조회
    id = auth.uid()
    OR
    -- 마스터 어드민은 모든 사용자 조회 가능
    auth.is_master_admin()
    OR
    -- 관리자 권한자는 같은 조직 사용자 조회 가능
    EXISTS (
      SELECT 1 FROM auth.user_role_organizations() uro
      JOIN user_roles ur ON ur.organization_id = uro.organization_id
      WHERE ur.user_id = users.id
        AND ur.is_active = true
        AND uro.role IN ('ADMIN', 'MANAGER', 'FRANCHISE')
    )
  );

CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (
    -- 마스터 어드민만 새 사용자 생성 가능 (회원가입은 별도 처리)
    auth.is_master_admin()
  );

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    -- 자신의 정보 수정 가능
    id = auth.uid()
    OR
    -- 마스터 어드민은 모든 사용자 정보 수정 가능
    auth.is_master_admin()
  );

-- 5. 조직 테이블 RLS 정책
CREATE POLICY "organizations_select_policy" ON organizations
  FOR SELECT USING (
    -- 마스터 어드민은 모든 조직 조회 가능
    auth.is_master_admin()
    OR
    -- 자신이 속한 조직만 조회 가능
    id IN (
      SELECT organization_id FROM auth.user_role_organizations()
    )
  );

CREATE POLICY "organizations_insert_policy" ON organizations
  FOR INSERT WITH CHECK (
    -- 마스터 어드민 또는 FRANCHISE 권한자만 새 조직 생성 가능
    auth.is_master_admin()
    OR
    EXISTS (
      SELECT 1 FROM auth.user_role_organizations()
      WHERE role = 'FRANCHISE'
    )
  );

CREATE POLICY "organizations_update_policy" ON organizations
  FOR UPDATE USING (
    -- 마스터 어드민은 모든 조직 수정 가능
    auth.is_master_admin()
    OR
    -- MANAGER 이상 권한자는 자신이 속한 조직 수정 가능
    id IN (
      SELECT organization_id FROM auth.user_role_organizations()
      WHERE role IN ('MANAGER', 'FRANCHISE')
    )
  );

CREATE POLICY "organizations_delete_policy" ON organizations
  FOR DELETE USING (
    -- 마스터 어드민은 모든 조직 삭제 가능
    auth.is_master_admin()
    OR
    -- FRANCHISE 권한자만 자신이 속한 조직 삭제 가능
    id IN (
      SELECT organization_id FROM auth.user_role_organizations()
      WHERE role = 'FRANCHISE'
    )
  );

-- 6. 사용자 역할 테이블 RLS 정책
CREATE POLICY "user_roles_select_policy" ON user_roles
  FOR SELECT USING (
    -- 마스터 어드민은 모든 역할 조회 가능
    auth.is_master_admin()
    OR
    -- 자신의 역할은 항상 조회 가능
    user_id = auth.uid()
    OR
    -- 관리자는 같은 조직의 역할 조회 가능
    organization_id IN (
      SELECT organization_id FROM auth.user_role_organizations()
      WHERE role IN ('ADMIN', 'MANAGER', 'FRANCHISE')
    )
  );

CREATE POLICY "user_roles_insert_policy" ON user_roles
  FOR INSERT WITH CHECK (
    -- 마스터 어드민은 모든 역할 생성 가능
    auth.is_master_admin()
    OR
    -- MANAGER 이상 권한자는 자신이 속한 조직에서 역할 생성 가능
    organization_id IN (
      SELECT organization_id FROM auth.user_role_organizations()
      WHERE role IN ('MANAGER', 'FRANCHISE')
    )
  );

CREATE POLICY "user_roles_update_policy" ON user_roles
  FOR UPDATE USING (
    -- 마스터 어드민은 모든 역할 수정 가능
    auth.is_master_admin()
    OR
    -- MANAGER 이상 권한자는 자신이 속한 조직의 역할 수정 가능
    organization_id IN (
      SELECT organization_id FROM auth.user_role_organizations()
      WHERE role IN ('MANAGER', 'FRANCHISE')
    )
  );

CREATE POLICY "user_roles_delete_policy" ON user_roles
  FOR DELETE USING (
    -- 마스터 어드민은 모든 역할 삭제 가능
    auth.is_master_admin()
    OR
    -- MANAGER 이상 권한자는 자신이 속한 조직의 역할 삭제 가능
    organization_id IN (
      SELECT organization_id FROM auth.user_role_organizations()
      WHERE role IN ('MANAGER', 'FRANCHISE')
    )
  );

-- 7. 출근 기록 테이블 RLS 정책
CREATE POLICY "attendance_select_policy" ON attendance
  FOR SELECT USING (
    -- 마스터 어드민은 모든 출근 기록 조회 가능
    auth.is_master_admin()
    OR
    -- 자신의 출근 기록은 항상 조회 가능
    user_id = auth.uid()
    OR
    -- 관리자는 같은 조직의 출근 기록 조회 가능
    organization_id IN (
      SELECT organization_id FROM auth.user_role_organizations()
      WHERE role IN ('ADMIN', 'MANAGER', 'FRANCHISE')
    )
  );

CREATE POLICY "attendance_insert_policy" ON attendance
  FOR INSERT WITH CHECK (
    -- 자신의 출근 기록만 생성 가능
    user_id = auth.uid()
    AND
    -- 해당 조직에서 활성 역할이 있어야 함
    organization_id IN (
      SELECT organization_id FROM auth.user_role_organizations()
    )
  );

CREATE POLICY "attendance_update_policy" ON attendance
  FOR UPDATE USING (
    -- 마스터 어드민은 모든 출근 기록 수정 가능
    auth.is_master_admin()
    OR
    -- 자신의 출근 기록 수정 가능
    user_id = auth.uid()
    OR
    -- 관리자는 같은 조직의 출근 기록 수정 가능
    organization_id IN (
      SELECT organization_id FROM auth.user_role_organizations()
      WHERE role IN ('ADMIN', 'MANAGER', 'FRANCHISE')
    )
  );

CREATE POLICY "attendance_delete_policy" ON attendance
  FOR DELETE USING (
    -- 마스터 어드민은 모든 출근 기록 삭제 가능
    auth.is_master_admin()
    OR
    -- ADMIN 이상 권한자만 같은 조직의 출근 기록 삭제 가능
    organization_id IN (
      SELECT organization_id FROM auth.user_role_organizations()
      WHERE role IN ('ADMIN', 'MANAGER', 'FRANCHISE')
    )
  );

-- 8. 감사 로그 테이블 RLS 정책
CREATE POLICY "audit_logs_select_policy" ON audit_logs
  FOR SELECT USING (
    -- 마스터 어드민은 모든 감사 로그 조회 가능
    auth.is_master_admin()
    OR
    -- 자신의 로그는 조회 가능
    user_id = auth.uid()
    OR
    -- FRANCHISE 권한자는 같은 조직의 감사 로그 조회 가능
    organization_id IN (
      SELECT organization_id FROM auth.user_role_organizations()
      WHERE role = 'FRANCHISE'
    )
  );

CREATE POLICY "audit_logs_insert_policy" ON audit_logs
  FOR INSERT WITH CHECK (
    -- 시스템에서만 감사 로그 생성 가능 (사용자는 직접 생성 불가)
    auth.is_master_admin()
  );

-- 9. 조직 계층 구조를 고려한 접근 제어 함수
CREATE OR REPLACE FUNCTION auth.user_accessible_organizations()
RETURNS TABLE(organization_id uuid)
LANGUAGE sql SECURITY DEFINER
STABLE
AS $$
  WITH RECURSIVE org_hierarchy AS (
    -- 사용자가 직접 속한 조직들
    SELECT uro.organization_id, o.parent_organization_id
    FROM auth.user_role_organizations() uro
    JOIN organizations o ON o.id = uro.organization_id
    WHERE uro.role IN ('MANAGER', 'FRANCHISE')
    
    UNION ALL
    
    -- 하위 조직들 (MANAGER, FRANCHISE 권한자는 하위 조직 접근 가능)
    SELECT o.id, o.parent_organization_id
    FROM organizations o
    JOIN org_hierarchy oh ON oh.organization_id = o.parent_organization_id
  )
  SELECT DISTINCT oh.organization_id
  FROM org_hierarchy oh
  
  UNION
  
  -- 자신이 직접 속한 모든 조직
  SELECT uro.organization_id
  FROM auth.user_role_organizations() uro;
$$;

-- 10. 시간 기반 역할 유효성 검사 함수
CREATE OR REPLACE FUNCTION auth.is_role_valid_at_time(
  p_user_id uuid,
  p_organization_id uuid,
  p_role role_type,
  p_check_time timestamp with time zone DEFAULT NOW()
)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND role = p_role
      AND is_active = true
      AND start_date <= p_check_time
      AND (end_date IS NULL OR end_date > p_check_time)
  );
$$;

-- 11. 성능 최적화를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_roles_active_time_filter 
  ON user_roles (user_id, organization_id, is_active) 
  WHERE is_active = true AND (end_date IS NULL OR end_date > NOW());

CREATE INDEX IF NOT EXISTS idx_attendance_org_user_date 
  ON attendance (organization_id, user_id, check_in_time);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_user_action 
  ON audit_logs (organization_id, user_id, action, created_at);

-- 12. RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 13. 테스트를 위한 샘플 데이터 확인 쿼리
-- (실제 운영에서는 제거)
COMMENT ON FUNCTION auth.user_role_organizations() IS 
'사용자가 속한 활성 조직과 역할을 반환하는 보안 함수';

COMMENT ON FUNCTION auth.is_master_admin() IS
'현재 사용자가 마스터 어드민인지 확인하는 함수';

COMMENT ON FUNCTION auth.user_accessible_organizations() IS
'사용자가 접근 가능한 조직 목록을 계층 구조를 포함하여 반환하는 함수';

COMMENT ON FUNCTION auth.is_role_valid_at_time(uuid, uuid, role_type, timestamp with time zone) IS
'특정 시점에서 사용자의 역할이 유효한지 확인하는 함수';