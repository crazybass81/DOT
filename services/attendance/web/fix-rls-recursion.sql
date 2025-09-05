-- =====================================================
-- employees 테이블 RLS 무한 재귀 문제 해결
-- =====================================================

-- 1. 기존 모든 RLS 정책 삭제
DROP POLICY IF EXISTS "Users can view employees in their organization" ON employees;
DROP POLICY IF EXISTS "Allow creating employees" ON employees;
DROP POLICY IF EXISTS "Users can update their own employee record" ON employees;
DROP POLICY IF EXISTS "Anyone can read employees" ON employees;
DROP POLICY IF EXISTS "Anyone can create employees" ON employees;
DROP POLICY IF EXISTS "Users can update own employee" ON employees;

-- 2. 단순하고 재귀 없는 RLS 정책 생성

-- SELECT 정책: 자신의 레코드만 조회 가능 (재귀 없음)
CREATE POLICY "Users can view own employee record" ON employees
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT 정책: 누구나 생성 가능
CREATE POLICY "Allow employee creation" ON employees
    FOR INSERT
    WITH CHECK (true);

-- UPDATE 정책: 자신의 레코드만 수정 가능
CREATE POLICY "Users can update own record" ON employees
    FOR UPDATE
    USING (user_id = auth.uid());

-- DELETE 정책: 자신의 레코드만 삭제 가능
CREATE POLICY "Users can delete own record" ON employees
    FOR DELETE
    USING (user_id = auth.uid());

-- 3. 확인
SELECT 
    'RLS 정책이 재설정되었습니다' as message,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'employees';