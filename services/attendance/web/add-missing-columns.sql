-- organizations 테이블에 누락된 컬럼 추가

-- 1. biz_type 컬럼 추가 (없는 경우에만)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'biz_type'
    ) THEN
        ALTER TABLE organizations 
        ADD COLUMN biz_type VARCHAR(20) DEFAULT 'PERSONAL';
        
        -- 기존 데이터 업데이트 (business_type이나 type 컬럼이 있다면 그 값 사용)
        UPDATE organizations 
        SET biz_type = CASE 
            WHEN name LIKE '%법인%' OR name LIKE '%(주)%' THEN 'CORP'
            WHEN name LIKE '%가맹%' THEN 'FRANCHISE'
            ELSE 'PERSONAL'
        END
        WHERE biz_type IS NULL;
    END IF;
END $$;

-- 2. biz_number 컬럼 추가 (없는 경우에만)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'biz_number'
    ) THEN
        ALTER TABLE organizations 
        ADD COLUMN biz_number VARCHAR(20);
    END IF;
END $$;

-- 3. 확인
SELECT 
    column_name, 
    data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- 완료 메시지
SELECT '✅ organizations 테이블에 필요한 컬럼이 추가되었습니다!' as message;