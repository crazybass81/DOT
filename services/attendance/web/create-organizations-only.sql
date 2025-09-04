-- =====================================================
-- organizations 테이블만 생성
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    biz_number VARCHAR(20),
    biz_address TEXT,
    representative_name VARCHAR(100),
    establish_date DATE,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    settings JSONB DEFAULT '{}',
    max_employees INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 기본 정책들
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Allow creating organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;

CREATE POLICY "Users can view their own organization" ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id 
            FROM employees 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Allow creating organizations" ON organizations
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE
    USING (
        id IN (
            SELECT organization_id 
            FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
            AND is_active = true
        )
    );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_biz_number ON organizations(biz_number);

-- 확인
SELECT 'organizations 테이블 생성 완료!' as message;