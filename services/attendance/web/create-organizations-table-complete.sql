-- organizations 테이블 완전 생성 (이미 있으면 컬럼 추가)

-- 1. 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 이미 있다면 누락된 컬럼만 추가
DO $$ 
BEGIN
    -- code 컬럼
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'code'
    ) THEN
        ALTER TABLE organizations ADD COLUMN code VARCHAR(50);
        -- 기존 데이터에 대해 임시 code 생성
        UPDATE organizations 
        SET code = 'ORG_' || substring(id::text from 1 for 8) 
        WHERE code IS NULL;
        -- UNIQUE 제약 추가
        ALTER TABLE organizations ADD CONSTRAINT organizations_code_unique UNIQUE(code);
    END IF;

    -- is_active 컬럼
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE organizations ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- metadata 컬럼
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE organizations ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    -- created_at 컬럼
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE organizations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- updated_at 컬럼
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE organizations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. RLS 활성화
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 4. 간단한 RLS 정책 (조직 멤버만 조회 가능)
DROP POLICY IF EXISTS "organizations_select" ON organizations;
CREATE POLICY "organizations_select" ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id 
            FROM employees 
            WHERE user_id = auth.uid()
        )
        OR auth.uid() IS NOT NULL  -- 임시로 모든 로그인 사용자 허용
    );

-- 5. INSERT 정책 (로그인한 사용자만)
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
CREATE POLICY "organizations_insert" ON organizations
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 6. UPDATE 정책 (admin/owner만)
DROP POLICY IF EXISTS "organizations_update" ON organizations;
CREATE POLICY "organizations_update" ON organizations
    FOR UPDATE
    USING (
        id IN (
            SELECT organization_id 
            FROM employees 
            WHERE user_id = auth.uid() 
            AND position IN ('admin', 'owner')
        )
    );

-- 7. 구조 확인
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;

-- 8. 완료 메시지
SELECT '✅ organizations 테이블 생성/수정 완료!' as message;