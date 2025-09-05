-- 마스터 어드민 지원을 위한 employees 테이블 확장
-- 실행 전에 기존 데이터 백업 권장

-- employees 테이블에 is_master_admin 컬럼 추가
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_master_admin BOOLEAN DEFAULT FALSE;

-- 마스터 어드민 컬럼에 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_employees_master_admin 
ON employees(is_master_admin) 
WHERE is_master_admin = TRUE;

-- 마스터 어드민 역할 확인 함수
CREATE OR REPLACE FUNCTION is_master_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees 
    WHERE id = user_id 
    AND is_master_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 마스터 어드민용 RLS 정책 (모든 데이터 접근 가능)
CREATE POLICY "master_admin_all_access" ON user_roles
FOR ALL TO authenticated
USING (is_master_admin(auth.uid()));

-- 기존 RLS 정책에 마스터 어드민 예외 추가
DROP POLICY IF EXISTS "users_can_view_own_roles" ON user_roles;
CREATE POLICY "users_can_view_own_roles" ON user_roles
FOR SELECT TO authenticated
USING (
  employee_id = auth.uid() 
  OR is_master_admin(auth.uid())
  OR has_role_in_organization(auth.uid(), organization_id, 'ADMIN')
  OR has_role_in_organization(auth.uid(), organization_id, 'MANAGER')
);

-- 조직 테이블에도 마스터 어드민 접근 권한 추가
CREATE POLICY IF NOT EXISTS "master_admin_org_access" ON organizations
FOR ALL TO authenticated
USING (is_master_admin(auth.uid()));

-- 계약 테이블에도 마스터 어드민 접근 권한 추가
CREATE POLICY IF NOT EXISTS "master_admin_contract_access" ON contracts
FOR ALL TO authenticated
USING (is_master_admin(auth.uid()));

-- 감사 로그 테이블 생성 (권한 변경 이력 추적)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  resource TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  result TEXT CHECK (result IN ('GRANTED', 'DENIED')),
  timestamp TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

-- 감사 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);

-- 감사 로그 RLS 정책
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 마스터 어드민만 모든 감사 로그 조회 가능
CREATE POLICY "master_admin_audit_access" ON audit_logs
FOR SELECT TO authenticated
USING (is_master_admin(auth.uid()));

-- 일반 사용자는 자신의 감사 로그만 조회 가능
CREATE POLICY "users_own_audit_logs" ON audit_logs
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 감사 로그 삽입 함수 (보안을 위해 SECURITY DEFINER 사용)
CREATE OR REPLACE FUNCTION log_audit_entry(
  p_action TEXT,
  p_user_id UUID,
  p_resource TEXT,
  p_organization_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_result TEXT DEFAULT 'GRANTED'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    action,
    user_id,
    resource,
    organization_id,
    details,
    result
  ) VALUES (
    p_action,
    p_user_id,
    p_resource,
    p_organization_id,
    p_details,
    p_result
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 변경 트리거 (user_roles 테이블 변경 시 자동 감사 로그)
CREATE OR REPLACE FUNCTION audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_entry(
      'ROLE_GRANTED',
      NEW.employee_id,
      'user_roles',
      NEW.organization_id,
      jsonb_build_object(
        'role_type', NEW.role_type,
        'granted_by', auth.uid()
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 역할 활성/비활성 변경 감사
    IF OLD.is_active != NEW.is_active THEN
      PERFORM log_audit_entry(
        CASE WHEN NEW.is_active THEN 'ROLE_ACTIVATED' ELSE 'ROLE_DEACTIVATED' END,
        NEW.employee_id,
        'user_roles',
        NEW.organization_id,
        jsonb_build_object(
          'role_type', NEW.role_type,
          'changed_by', auth.uid()
        )
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_entry(
      'ROLE_REVOKED',
      OLD.employee_id,
      'user_roles',
      OLD.organization_id,
      jsonb_build_object(
        'role_type', OLD.role_type,
        'revoked_by', auth.uid()
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS audit_role_changes_trigger ON user_roles;
CREATE TRIGGER audit_role_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION audit_role_changes();

-- 샘플 마스터 어드민 계정 생성 (개발용)
-- 실제 운영에서는 수동으로 지정해야 함
INSERT INTO employees (id, email, name, is_master_admin)
VALUES (
  gen_random_uuid(),
  'master@admin.local',
  'Master Administrator',
  TRUE
) ON CONFLICT (email) DO UPDATE SET
  is_master_admin = TRUE;

-- 성능 최적화를 위한 추가 인덱스
CREATE INDEX IF NOT EXISTS idx_user_roles_compound 
ON user_roles(employee_id, organization_id, role_type, is_active);

CREATE INDEX IF NOT EXISTS idx_user_roles_organization 
ON user_roles(organization_id, role_type) 
WHERE is_active = TRUE;

-- 권한 통계 뷰 (마스터 어드민용)
CREATE OR REPLACE VIEW role_statistics AS
SELECT 
  o.name AS organization_name,
  ur.role_type,
  COUNT(*) AS user_count,
  COUNT(CASE WHEN ur.is_active THEN 1 END) AS active_count,
  COUNT(CASE WHEN NOT ur.is_active THEN 1 END) AS inactive_count
FROM user_roles ur
JOIN organizations o ON ur.organization_id = o.id
GROUP BY o.name, ur.role_type
ORDER BY o.name, ur.role_type;

-- 뷰에 RLS 정책 적용
CREATE POLICY "master_admin_role_stats" ON role_statistics
FOR SELECT TO authenticated
USING (is_master_admin(auth.uid()));

COMMENT ON TABLE audit_logs IS '시스템 감사 로그 - 모든 권한 변경과 접근 기록';
COMMENT ON COLUMN employees.is_master_admin IS '마스터 어드민 여부 - 모든 조직과 데이터에 접근 가능';
COMMENT ON FUNCTION is_master_admin(UUID) IS '사용자의 마스터 어드민 여부를 확인하는 함수';
COMMENT ON FUNCTION log_audit_entry IS '감사 로그를 안전하게 기록하는 함수';