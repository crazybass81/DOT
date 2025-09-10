-- DOT 근태관리 시스템 - 누락된 스키마 생성
-- 파일: create-missing-schema.sql
-- 작성일: 2025-09-09

-- 1. attendance_records 테이블 생성
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- 직원 및 조직 정보
    employee_id UUID NOT NULL REFERENCES public.unified_identities(id),
    business_id UUID NOT NULL REFERENCES public.organizations_v3(id),
    
    -- 출퇴근 시간
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    work_date DATE,
    
    -- 위치 정보 (GPS 좌표, 주소 등)
    check_in_location JSONB,
    check_out_location JSONB,
    
    -- 인증 방법 및 상태
    verification_method VARCHAR(10) CHECK (verification_method IN ('gps', 'qr', 'manual')) DEFAULT 'manual',
    status VARCHAR(20) CHECK (status IN ('active', 'completed', 'cancelled', 'pending')) DEFAULT 'active',
    
    -- 추가 정보
    notes TEXT,
    break_time_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    
    -- 인덱스용 필드
    CONSTRAINT check_valid_times CHECK (
        (check_in_time IS NULL OR check_out_time IS NULL) OR 
        (check_out_time > check_in_time)
    )
);

-- attendance_records 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance_records(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_business_date ON public.attendance_records(business_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON public.attendance_records(created_at);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_attendance_records_updated_at 
    BEFORE UPDATE ON public.attendance_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. active_employees 뷰 생성
CREATE OR REPLACE VIEW public.active_employees AS
SELECT DISTINCT
    ui.id,
    ui.email,
    ui.full_name,
    ui.phone,
    ui.auth_user_id,
    ra.role,
    ra.organization_id,
    ra.employee_code,
    ra.department,
    ra.position,
    org.name as organization_name
FROM public.unified_identities ui
JOIN public.role_assignments ra ON ui.id = ra.identity_id
JOIN public.organizations_v3 org ON ra.organization_id = org.id
WHERE ui.is_active = true 
    AND ra.is_active = true 
    AND org.is_active = true
    AND ra.revoked_at IS NULL;

-- 3. RLS (Row Level Security) 정책 설정
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 본인의 조직 데이터만 접근 가능
CREATE POLICY "Users can view attendance in their organization" ON public.attendance_records
    FOR SELECT USING (
        business_id IN (
            SELECT ra.organization_id 
            FROM public.role_assignments ra 
            WHERE ra.identity_id = auth.uid()::text::uuid 
                AND ra.is_active = true
        )
    );

-- 입력 정책: 본인의 출근 기록만 생성 가능 (또는 관리자)
CREATE POLICY "Users can insert their own attendance" ON public.attendance_records
    FOR INSERT WITH CHECK (
        employee_id = auth.uid()::text::uuid OR
        EXISTS (
            SELECT 1 FROM public.role_assignments ra 
            WHERE ra.identity_id = auth.uid()::text::uuid 
                AND ra.organization_id = business_id
                AND ra.role IN ('admin', 'manager', 'master')
                AND ra.is_active = true
        )
    );

-- 수정 정책: 본인의 기록 또는 관리자만 수정 가능
CREATE POLICY "Users can update attendance in their organization" ON public.attendance_records
    FOR UPDATE USING (
        employee_id = auth.uid()::text::uuid OR
        EXISTS (
            SELECT 1 FROM public.role_assignments ra 
            WHERE ra.identity_id = auth.uid()::text::uuid 
                AND ra.organization_id = business_id
                AND ra.role IN ('admin', 'manager', 'master')
                AND ra.is_active = true
        )
    );

-- 4. 유용한 함수들 생성

-- 오늘 출근 기록 조회 함수
CREATE OR REPLACE FUNCTION get_today_attendance(emp_id UUID)
RETURNS TABLE (
    id UUID,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    status TEXT,
    work_hours INTERVAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ar.id,
        ar.check_in_time,
        ar.check_out_time,
        ar.status::TEXT,
        CASE 
            WHEN ar.check_in_time IS NOT NULL AND ar.check_out_time IS NOT NULL 
            THEN ar.check_out_time - ar.check_in_time - (ar.break_time_minutes || ' minutes')::INTERVAL
            ELSE NULL
        END as work_hours
    FROM public.attendance_records ar
    WHERE ar.employee_id = emp_id 
        AND ar.work_date = CURRENT_DATE
    ORDER BY ar.created_at DESC
    LIMIT 1;
END;
$$;

-- 월별 근무 통계 함수
CREATE OR REPLACE FUNCTION get_monthly_stats(emp_id UUID, target_month DATE)
RETURNS TABLE (
    total_days INTEGER,
    present_days INTEGER,
    absent_days INTEGER,
    total_hours INTERVAL,
    overtime_hours INTERVAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_days,
        COUNT(CASE WHEN ar.status = 'completed' THEN 1 END)::INTEGER as present_days,
        COUNT(CASE WHEN ar.status NOT IN ('completed', 'active') THEN 1 END)::INTEGER as absent_days,
        COALESCE(
            SUM(
                CASE 
                    WHEN ar.check_in_time IS NOT NULL AND ar.check_out_time IS NOT NULL 
                    THEN ar.check_out_time - ar.check_in_time - (ar.break_time_minutes || ' minutes')::INTERVAL
                    ELSE INTERVAL '0'
                END
            ), 
            INTERVAL '0'
        ) as total_hours,
        COALESCE(
            SUM((ar.overtime_minutes || ' minutes')::INTERVAL), 
            INTERVAL '0'
        ) as overtime_hours
    FROM public.attendance_records ar
    WHERE ar.employee_id = emp_id 
        AND DATE_TRUNC('month', ar.work_date) = DATE_TRUNC('month', target_month);
END;
$$;

-- 5. 기본 데이터 삽입을 위한 준비
-- (실제 데이터는 별도 스크립트에서 처리)

COMMENT ON TABLE public.attendance_records IS 'DOT 근태관리 - 출근/퇴근 기록 테이블';
COMMENT ON VIEW public.active_employees IS 'DOT 근태관리 - 활성 직원 통합 뷰';

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ DOT 근태관리 시스템 스키마 생성 완료';
    RAISE NOTICE '   - attendance_records 테이블 생성됨';
    RAISE NOTICE '   - active_employees 뷰 생성됨';  
    RAISE NOTICE '   - RLS 정책 설정 완료';
    RAISE NOTICE '   - 유틸리티 함수 생성됨';
END $$;