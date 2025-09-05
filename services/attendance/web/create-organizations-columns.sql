-- organizations 테이블에 필요한 컬럼 추가

-- 1. 현재 테이블 구조 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;

-- 2. code 컬럼 추가 (없는 경우)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- 3. is_active 컬럼 추가 (없는 경우)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. metadata 컬럼 추가 (없는 경우)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 5. created_at 컬럼 추가 (없는 경우)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. updated_at 컬럼 추가 (없는 경우)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 7. 다시 구조 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;

-- 완료 메시지
SELECT '✅ organizations 테이블 컬럼 추가 완료!' as message;