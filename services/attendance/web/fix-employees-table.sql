-- =====================================================
-- employees 테이블 문제 해결
-- =====================================================

-- 1. 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Users can view employees in their organization" ON employees;
DROP POLICY IF EXISTS "Allow creating employees" ON employees;
DROP POLICY IF EXISTS "Users can update their own employee record" ON employees;

-- 2. 더 관대한 RLS 정책 생성
CREATE POLICY "Anyone can read employees" ON employees
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can create employees" ON employees
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update own employee" ON employees
    FOR UPDATE
    USING (user_id = auth.uid());

-- 3. 인덱스 확인
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- 4. 테스트 데이터 확인
SELECT 
    COUNT(*) as total_employees,
    COUNT(DISTINCT user_id) as unique_users
FROM employees;

-- 5. 컬럼 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;