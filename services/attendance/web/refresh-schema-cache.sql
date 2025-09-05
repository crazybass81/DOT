-- Supabase 스키마 캐시 새로고침 및 테이블 확인

-- 1. 현재 organizations 테이블 구조 확인
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'organizations' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. PostgREST 스키마 캐시 새로고침
-- Supabase 대시보드에서 다음 작업 중 하나를 수행:
-- Option A: Settings → API → "Reload Schema Cache" 버튼 클릭
-- Option B: 프로젝트 재시작 (Settings → General → Restart project)

-- 3. 또는 API를 통해 강제 새로고침 (pg_notify 사용)
NOTIFY pgrst, 'reload schema';

-- 4. 테스트용 임시 조직 생성 (컬럼 확인용)
INSERT INTO organizations (name, code, is_active, metadata)
VALUES (
    'TEST_ORG_' || NOW()::text,
    'TEST_' || substring(gen_random_uuid()::text from 1 for 8),
    true,
    '{"test": true}'::jsonb
)
RETURNING *;

-- 5. 방금 생성한 테스트 데이터 삭제
DELETE FROM organizations 
WHERE name LIKE 'TEST_ORG_%' 
    AND metadata->>'test' = 'true';

-- 완료 메시지
SELECT '⚠️ Supabase 대시보드에서 "Reload Schema Cache" 버튼을 클릭하거나 프로젝트를 재시작하세요!' as message;