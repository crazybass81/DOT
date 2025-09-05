-- Phase 1.2: contracts 테이블 생성
-- TDD: 테스트를 통과시키기 위한 구현

-- 1. contracts 테이블 생성
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- 계약 기본 정보
    contract_type TEXT DEFAULT 'EMPLOYMENT' CHECK (contract_type IN ('EMPLOYMENT', 'PART_TIME', 'TEMPORARY', 'INTERNSHIP', 'FREELANCE')),
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'TERMINATED', 'EXPIRED')),
    
    -- 급여 정보
    wage_amount DECIMAL(10,2) CHECK (wage_amount >= 0),
    wage_type TEXT DEFAULT 'HOURLY' CHECK (wage_type IN ('HOURLY', 'DAILY', 'MONTHLY', 'YEARLY')),
    
    -- 청소년 근로 관련
    is_minor BOOLEAN DEFAULT false,
    parent_consent_file TEXT, -- Supabase Storage 파일 경로
    
    -- 메타데이터 및 관리
    terms JSONB DEFAULT '{}', -- 표준근로계약서 내용
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    created_by UUID REFERENCES employees(id),
    
    -- 제약조건: 종료일은 시작일 이후여야 함
    CONSTRAINT check_contract_dates CHECK (end_date IS NULL OR end_date >= start_date),
    
    -- 복합 인덱스: 성능 최적화
    UNIQUE(employee_id, organization_id, start_date) -- 같은 직원이 같은 조직에서 같은 날 중복 계약 방지
);

-- 2. 인덱스 생성 (쿼리 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_contracts_employee_id ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_organization_id ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_contracts_active ON contracts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);

-- 3. 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_updated_at();

-- 4. RLS (Row Level Security) 설정
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 - 자신의 계약만 조회 가능
CREATE POLICY "contracts_select_own" ON contracts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.id = contracts.employee_id 
            AND employees.user_id = auth.uid()
        )
        OR
        -- 같은 조직의 관리자는 조회 가능
        EXISTS (
            SELECT 1 FROM employees e
            JOIN user_roles ur ON e.id = ur.employee_id
            WHERE e.user_id = auth.uid()
            AND ur.organization_id = contracts.organization_id
            AND ur.role_type IN ('ADMIN', 'MANAGER')
            AND ur.is_active = true
        )
    );

-- 6. RLS 정책 - 자신의 계약만 수정 가능 (제한적)
CREATE POLICY "contracts_update_limited" ON contracts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.id = contracts.employee_id 
            AND employees.user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- 중요 필드는 수정 불가 (메타데이터만 수정 가능)
        OLD.employee_id = NEW.employee_id
        AND OLD.organization_id = NEW.organization_id
        AND OLD.start_date = NEW.start_date
        AND OLD.wage_amount = NEW.wage_amount
        AND OLD.contract_type = NEW.contract_type
    );

-- 7. RLS 정책 - 관리자만 계약 생성/삭제 가능
CREATE POLICY "contracts_insert_admin" ON contracts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees e
            JOIN user_roles ur ON e.id = ur.employee_id
            WHERE e.user_id = auth.uid()
            AND ur.organization_id = contracts.organization_id
            AND ur.role_type IN ('ADMIN', 'OWNER')
            AND ur.is_active = true
        )
    );

CREATE POLICY "contracts_delete_admin" ON contracts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM employees e
            JOIN user_roles ur ON e.id = ur.employee_id
            WHERE e.user_id = auth.uid()
            AND ur.organization_id = contracts.organization_id
            AND ur.role_type IN ('ADMIN', 'OWNER')
            AND ur.is_active = true
        )
    );

-- 8. 권한 부여
GRANT ALL ON contracts TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 9. 유틸리티 함수: 사용자의 모든 활성 계약 조회
CREATE OR REPLACE FUNCTION get_active_contracts(user_uuid UUID)
RETURNS TABLE(
    contract_id UUID,
    organization_name TEXT,
    contract_type TEXT,
    start_date DATE,
    end_date DATE,
    wage_amount DECIMAL,
    wage_type TEXT,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as contract_id,
        o.name as organization_name,
        c.contract_type,
        c.start_date,
        c.end_date,
        c.wage_amount,
        c.wage_type,
        c.status
    FROM contracts c
    JOIN employees e ON c.employee_id = e.id
    JOIN organizations o ON c.organization_id = o.id
    WHERE e.user_id = user_uuid
    AND c.is_active = true
    AND c.status IN ('ACTIVE', 'PENDING')
    ORDER BY c.start_date DESC;
END;
$$;

-- 10. 유틸리티 함수: 계약 만료 처리 (배치 작업용)
CREATE OR REPLACE FUNCTION expire_contracts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE contracts 
    SET status = 'EXPIRED', updated_at = now()
    WHERE status = 'ACTIVE'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$;

-- 11. 유틸리티 함수: 조직의 모든 계약 조회 (관리자용)
CREATE OR REPLACE FUNCTION get_organization_contracts(org_id UUID)
RETURNS TABLE(
    contract_id UUID,
    employee_name TEXT,
    employee_email TEXT,
    contract_type TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT,
    wage_amount DECIMAL,
    wage_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as contract_id,
        e.name as employee_name,
        e.email as employee_email,
        c.contract_type,
        c.start_date,
        c.end_date,
        c.status,
        c.wage_amount,
        c.wage_type
    FROM contracts c
    JOIN employees e ON c.employee_id = e.id
    WHERE c.organization_id = org_id
    AND c.is_active = true
    ORDER BY c.created_at DESC;
END;
$$;

-- 12. 자동 만료 처리를 위한 pg_cron 작업 (PostgreSQL 확장 필요)
-- SELECT cron.schedule('expire-contracts', '0 1 * * *', 'SELECT expire_contracts();');

COMMENT ON TABLE contracts IS '근로 계약 관리 테이블 - 다중 계약 지원';
COMMENT ON FUNCTION get_active_contracts IS '사용자의 모든 활성 계약 조회';
COMMENT ON FUNCTION expire_contracts IS '만료된 계약 자동 처리 (배치 작업)';
COMMENT ON FUNCTION get_organization_contracts IS '조직의 모든 계약 조회 (관리자용)';