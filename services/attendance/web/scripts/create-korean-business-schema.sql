-- ============================================================
-- Korean Business Registration System - Enhanced Schema
-- ============================================================
-- 한국 사업자등록 및 조직 관리 시스템을 위한 확장 스키마

-- ============================================================
-- 1. KOREAN BUSINESS REGISTRATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS korean_business_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
    
    -- 기본 사업자 정보
    business_number VARCHAR(12) UNIQUE NOT NULL, -- 000-00-00000
    corporate_number VARCHAR(14), -- 000000-0000000
    
    -- 사업체 정보
    business_name VARCHAR(100) NOT NULL,
    business_name_eng VARCHAR(100),
    business_type VARCHAR(100) NOT NULL, -- 업태
    business_item VARCHAR(200) NOT NULL, -- 종목
    
    -- 대표자 정보
    representative_name VARCHAR(50) NOT NULL,
    representative_name_eng VARCHAR(50),
    
    -- 사업장 주소
    business_address JSONB NOT NULL, -- Korean address structure
    head_office_address JSONB, -- 본점 주소 (다른 경우)
    
    -- 연락처 정보
    phone_number VARCHAR(15),
    fax_number VARCHAR(15),
    email VARCHAR(100),
    website VARCHAR(200),
    
    -- 사업 관련 정보
    established_date DATE NOT NULL,
    opening_date DATE,
    capital_amount BIGINT DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    
    -- 추가 정보
    tax_office VARCHAR(50), -- 관할세무서
    social_insurance_office VARCHAR(50), -- 관할고용노동청
    is_head_office BOOLEAN DEFAULT true,
    branch_info JSONB, -- 지점 정보
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_korean_business_number ON korean_business_registrations(business_number);
CREATE INDEX IF NOT EXISTS idx_korean_corporate_number ON korean_business_registrations(corporate_number);
CREATE INDEX IF NOT EXISTS idx_korean_business_name ON korean_business_registrations USING gin(to_tsvector('korean', business_name));
CREATE INDEX IF NOT EXISTS idx_korean_organization_id ON korean_business_registrations(organization_id);

-- ============================================================
-- 2. BUSINESS DOCUMENTS TABLE (사업자등록증 등)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
    
    -- 문서 정보
    document_type VARCHAR(50) NOT NULL, -- 'business_certificate', 'corporate_seal', etc.
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- 검증 정보
    verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'expired'
    verification_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES unified_identities(id),
    rejection_reason TEXT,
    
    -- 타임스탬프
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_business_documents_org ON business_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_documents_type ON business_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_business_documents_status ON business_documents(verification_status);

-- ============================================================
-- 3. WORKPLACE LOCATIONS TABLE (GPS 기반 사업장)
-- ============================================================
CREATE TABLE IF NOT EXISTS workplace_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
    
    -- 기본 정보
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- 주소 정보
    address JSONB NOT NULL, -- Korean address structure
    
    -- GPS 좌표
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    check_in_radius INTEGER DEFAULT 100, -- 미터 단위
    
    -- 근무 시간
    business_hours JSONB DEFAULT '{
        "monday": {"start": "09:00", "end": "18:00", "isWorkingDay": true},
        "tuesday": {"start": "09:00", "end": "18:00", "isWorkingDay": true},
        "wednesday": {"start": "09:00", "end": "18:00", "isWorkingDay": true},
        "thursday": {"start": "09:00", "end": "18:00", "isWorkingDay": true},
        "friday": {"start": "09:00", "end": "18:00", "isWorkingDay": true},
        "saturday": {"start": "09:00", "end": "18:00", "isWorkingDay": false},
        "sunday": {"start": "09:00", "end": "18:00", "isWorkingDay": false}
    }',
    
    -- 상태
    is_active BOOLEAN DEFAULT true,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_workplace_locations_org ON workplace_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_workplace_locations_active ON workplace_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_workplace_locations_coords ON workplace_locations(latitude, longitude);

-- ============================================================
-- 4. EMPLOYEE INVITATIONS TABLE (직원 초대)
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
    inviter_user_id UUID REFERENCES unified_identities(id) ON DELETE CASCADE,
    
    -- 초대받을 사람 정보
    invitee_name VARCHAR(50) NOT NULL,
    invitee_email VARCHAR(100),
    invitee_phone VARCHAR(15),
    
    -- 직책 정보
    role VARCHAR(20) NOT NULL, -- 'worker', 'manager', 'admin'
    department VARCHAR(50),
    position VARCHAR(50),
    workplace_location_id UUID REFERENCES workplace_locations(id),
    
    -- 초대 정보
    invitation_message TEXT,
    invitation_token VARCHAR(64) UNIQUE NOT NULL,
    
    -- 상태 관리
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_employee_invitations_org ON employee_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON employee_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON employee_invitations(status);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_expires ON employee_invitations(expires_at);

-- ============================================================
-- 5. ORGANIZATION INVITATION CODES TABLE (조직 초대 코드)
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_invitation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
    
    -- 초대 코드
    invitation_code VARCHAR(8) UNIQUE NOT NULL,
    
    -- 사용 통계
    usage_count INTEGER DEFAULT 0,
    max_usage_count INTEGER DEFAULT 100, -- 최대 사용 가능 횟수
    
    -- 만료 정보
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_org_invitation_codes_org ON organization_invitation_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitation_codes_code ON organization_invitation_codes(invitation_code);
CREATE INDEX IF NOT EXISTS idx_org_invitation_codes_active ON organization_invitation_codes(is_active);

-- ============================================================
-- 6. ATTENDANCE POLICIES TABLE (근태 정책)
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations_v3(id) ON DELETE CASCADE,
    
    -- 근무시간 정책
    standard_work_hours INTEGER DEFAULT 8, -- 표준 근무시간
    max_overtime_hours INTEGER DEFAULT 4, -- 최대 연장근무시간
    break_time_minutes INTEGER DEFAULT 60, -- 휴게시간
    flex_time_minutes INTEGER DEFAULT 10, -- 출근 허용 지연시간
    
    -- 출근체크 정책
    allow_early_check_in BOOLEAN DEFAULT true,
    allow_late_check_in BOOLEAN DEFAULT true,
    require_gps BOOLEAN DEFAULT true,
    require_qr BOOLEAN DEFAULT false,
    require_photo BOOLEAN DEFAULT false,
    
    -- 휴가 정책
    annual_leaves INTEGER DEFAULT 15, -- 연차
    sick_leaves INTEGER DEFAULT 3, -- 병가
    personal_leaves INTEGER DEFAULT 3, -- 개인사유 휴가
    
    -- 상태
    is_active BOOLEAN DEFAULT true,
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_attendance_policies_org ON attendance_policies(organization_id);

-- ============================================================
-- 7. ENHANCED ATTENDANCE RECORDS WITH LOCATION
-- ============================================================
-- 기존 attendance_records 테이블에 workplace_location_id 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance_records' 
                   AND column_name = 'workplace_location_id') THEN
        ALTER TABLE attendance_records 
        ADD COLUMN workplace_location_id UUID REFERENCES workplace_locations(id);
        
        CREATE INDEX IF NOT EXISTS idx_attendance_records_workplace 
        ON attendance_records(workplace_location_id);
    END IF;
END $$;

-- ============================================================
-- 8. USEFUL FUNCTIONS AND PROCEDURES
-- ============================================================

-- 한국 조직 생성 함수
CREATE OR REPLACE FUNCTION create_korean_organization(
    p_organization_data JSONB,
    p_business_data JSONB,
    p_workplace_locations JSONB[],
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_business_id UUID;
    v_location_id UUID;
    v_location JSONB;
    v_result JSONB;
BEGIN
    -- 1. 조직 생성
    INSERT INTO organizations_v3 (
        name, type, description, parent_organization_id, settings, is_active
    ) VALUES (
        p_organization_data->>'name',
        p_organization_data->>'type',
        p_organization_data->>'description',
        (p_organization_data->>'parent_organization_id')::UUID,
        COALESCE(p_organization_data->'settings', '{}'),
        true
    ) RETURNING id INTO v_org_id;
    
    -- 2. 한국 사업자 등록 정보 생성
    INSERT INTO korean_business_registrations (
        organization_id,
        business_number,
        corporate_number,
        business_name,
        business_name_eng,
        business_type,
        business_item,
        representative_name,
        representative_name_eng,
        business_address,
        head_office_address,
        phone_number,
        fax_number,
        email,
        website,
        established_date,
        opening_date,
        capital_amount,
        employee_count,
        tax_office,
        social_insurance_office,
        is_head_office,
        branch_info,
        metadata
    ) VALUES (
        v_org_id,
        p_business_data->>'businessNumber',
        p_business_data->>'corporateNumber',
        p_business_data->>'businessName',
        p_business_data->>'businessNameEng',
        p_business_data->>'businessType',
        p_business_data->>'businessItem',
        p_business_data->>'representativeName',
        p_business_data->>'representativeNameEng',
        p_business_data->'businessAddress',
        p_business_data->'headOfficeAddress',
        p_business_data->>'phoneNumber',
        p_business_data->>'faxNumber',
        p_business_data->>'email',
        p_business_data->>'website',
        (p_business_data->>'establishedDate')::DATE,
        (p_business_data->>'openingDate')::DATE,
        (p_business_data->>'capitalAmount')::BIGINT,
        (p_business_data->>'employeeCount')::INTEGER,
        p_business_data->>'taxOffice',
        p_business_data->>'socialInsuranceOffice',
        COALESCE((p_business_data->>'isHeadOffice')::BOOLEAN, true),
        p_business_data->'branchInfo',
        COALESCE(p_business_data->'metadata', '{}')
    ) RETURNING id INTO v_business_id;
    
    -- 3. 사업장 위치들 생성
    FOREACH v_location IN ARRAY p_workplace_locations
    LOOP
        INSERT INTO workplace_locations (
            organization_id,
            name,
            address,
            latitude,
            longitude,
            check_in_radius,
            business_hours,
            is_active,
            metadata
        ) VALUES (
            v_org_id,
            v_location->>'name',
            v_location->'address',
            (v_location->'coordinates'->>'latitude')::DECIMAL,
            (v_location->'coordinates'->>'longitude')::DECIMAL,
            COALESCE((v_location->>'checkInRadius')::INTEGER, 100),
            COALESCE(v_location->'businessHours', '{
                "monday": {"start": "09:00", "end": "18:00", "isWorkingDay": true},
                "tuesday": {"start": "09:00", "end": "18:00", "isWorkingDay": true},
                "wednesday": {"start": "09:00", "end": "18:00", "isWorkingDay": true},
                "thursday": {"start": "09:00", "end": "18:00", "isWorkingDay": true},
                "friday": {"start": "09:00", "end": "18:00", "isWorkingDay": true},
                "saturday": {"start": "09:00", "end": "18:00", "isWorkingDay": false},
                "sunday": {"start": "09:00", "end": "18:00", "isWorkingDay": false}
            }'),
            COALESCE((v_location->>'isActive')::BOOLEAN, true),
            COALESCE(v_location->'metadata', '{}')
        );
    END LOOP;
    
    -- 4. 기본 근태 정책 생성
    INSERT INTO attendance_policies (
        organization_id,
        standard_work_hours,
        max_overtime_hours,
        break_time_minutes,
        flex_time_minutes,
        allow_early_check_in,
        allow_late_check_in,
        require_gps,
        require_qr,
        require_photo,
        annual_leaves,
        sick_leaves,
        personal_leaves
    ) VALUES (
        v_org_id,
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'workTimePolicy'->>'standardWorkHours')::INTEGER, 8),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'workTimePolicy'->>'maxOvertimeHours')::INTEGER, 4),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'workTimePolicy'->>'breakTimeMinutes')::INTEGER, 60),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'workTimePolicy'->>'flexTimeMinutes')::INTEGER, 10),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'checkInPolicy'->>'allowEarlyCheckIn')::BOOLEAN, true),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'checkInPolicy'->>'allowLateCheckIn')::BOOLEAN, true),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'checkInPolicy'->>'requireGPS')::BOOLEAN, true),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'checkInPolicy'->>'requireQR')::BOOLEAN, false),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'checkInPolicy'->>'requirePhoto')::BOOLEAN, false),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'leavePolicy'->>'annualLeaves')::INTEGER, 15),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'leavePolicy'->>'sickLeaves')::INTEGER, 3),
        COALESCE((p_organization_data->'settings'->'attendancePolicy'->'leavePolicy'->>'personalLeaves')::INTEGER, 3)
    );
    
    -- 결과 반환
    v_result := jsonb_build_object(
        'organization_id', v_org_id,
        'business_registration_id', v_business_id,
        'success', true
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '조직 생성 중 오류: %', SQLERRM;
END;
$$;

-- 조직 직원 통계 함수
CREATE OR REPLACE FUNCTION get_organization_employee_stats(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_total INTEGER;
    v_active INTEGER;
    v_pending_invitations INTEGER;
BEGIN
    -- 총 직원 수
    SELECT COUNT(*) INTO v_total
    FROM role_assignments ra
    JOIN unified_identities ui ON ra.identity_id = ui.id
    WHERE ra.organization_id = org_id 
      AND ra.is_active = true 
      AND ui.is_active = true;
    
    -- 활성 직원 수 (최근 30일 내 로그인)
    SELECT COUNT(*) INTO v_active
    FROM role_assignments ra
    JOIN unified_identities ui ON ra.identity_id = ui.id
    WHERE ra.organization_id = org_id 
      AND ra.is_active = true 
      AND ui.is_active = true
      AND ui.last_login > NOW() - INTERVAL '30 days';
    
    -- 대기 중인 초대 수
    SELECT COUNT(*) INTO v_pending_invitations
    FROM employee_invitations
    WHERE organization_id = org_id 
      AND status = 'pending' 
      AND expires_at > NOW();
    
    v_result := jsonb_build_object(
        'totalEmployees', v_total,
        'activeEmployees', v_active,
        'pendingInvitations', v_pending_invitations,
        'inactiveEmployees', v_total - v_active
    );
    
    RETURN v_result;
END;
$$;

-- 조직 출근 통계 함수
CREATE OR REPLACE FUNCTION get_organization_attendance_stats(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_today_total INTEGER;
    v_today_present INTEGER;
    v_this_month_avg DECIMAL;
BEGIN
    -- 오늘 출근 대상자 수
    SELECT COUNT(*) INTO v_today_total
    FROM role_assignments ra
    JOIN unified_identities ui ON ra.identity_id = ui.id
    WHERE ra.organization_id = org_id 
      AND ra.is_active = true 
      AND ui.is_active = true;
    
    -- 오늘 실제 출근자 수
    SELECT COUNT(*) INTO v_today_present
    FROM attendance_records ar
    JOIN role_assignments ra ON ar.employee_id = ra.identity_id
    WHERE ra.organization_id = org_id 
      AND ar.work_date = CURRENT_DATE
      AND ar.check_in_time IS NOT NULL;
    
    -- 이번 달 평균 출석률
    SELECT COALESCE(AVG(daily_rate), 0) INTO v_this_month_avg
    FROM (
        SELECT 
            work_date,
            (COUNT(ar.id) * 100.0 / GREATEST(v_today_total, 1)) as daily_rate
        FROM attendance_records ar
        JOIN role_assignments ra ON ar.employee_id = ra.identity_id
        WHERE ra.organization_id = org_id 
          AND ar.work_date >= DATE_TRUNC('month', CURRENT_DATE)
          AND ar.check_in_time IS NOT NULL
        GROUP BY work_date
    ) daily_stats;
    
    v_result := jsonb_build_object(
        'todayTotal', v_today_total,
        'todayPresent', v_today_present,
        'todayAbsent', v_today_total - v_today_present,
        'todayAttendanceRate', ROUND((v_today_present * 100.0 / GREATEST(v_today_total, 1))::DECIMAL, 1),
        'monthlyAverageRate', ROUND(v_this_month_avg, 1)
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Korean Business Registrations RLS
ALTER TABLE korean_business_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's business registration"
ON korean_business_registrations FOR SELECT
USING (
    organization_id IN (
        SELECT ra.organization_id 
        FROM role_assignments ra
        JOIN unified_identities ui ON ra.identity_id = ui.id
        WHERE ui.auth_user_id = auth.uid() AND ra.is_active = true
    )
);

-- Business Documents RLS
ALTER TABLE business_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's documents"
ON business_documents FOR SELECT
USING (
    organization_id IN (
        SELECT ra.organization_id 
        FROM role_assignments ra
        JOIN unified_identities ui ON ra.identity_id = ui.id
        WHERE ui.auth_user_id = auth.uid() AND ra.is_active = true
    )
);

CREATE POLICY "Admins can manage their organization's documents"
ON business_documents FOR ALL
USING (
    organization_id IN (
        SELECT ra.organization_id 
        FROM role_assignments ra
        JOIN unified_identities ui ON ra.identity_id = ui.id
        WHERE ui.auth_user_id = auth.uid() 
          AND ra.is_active = true
          AND ra.role IN ('admin', 'owner', 'master')
    )
);

-- Workplace Locations RLS
ALTER TABLE workplace_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's workplace locations"
ON workplace_locations FOR SELECT
USING (
    organization_id IN (
        SELECT ra.organization_id 
        FROM role_assignments ra
        JOIN unified_identities ui ON ra.identity_id = ui.id
        WHERE ui.auth_user_id = auth.uid() AND ra.is_active = true
    )
);

CREATE POLICY "Admins can manage their organization's workplace locations"
ON workplace_locations FOR ALL
USING (
    organization_id IN (
        SELECT ra.organization_id 
        FROM role_assignments ra
        JOIN unified_identities ui ON ra.identity_id = ui.id
        WHERE ui.auth_user_id = auth.uid() 
          AND ra.is_active = true
          AND ra.role IN ('admin', 'owner', 'master')
    )
);

-- Employee Invitations RLS
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's invitations"
ON employee_invitations FOR SELECT
USING (
    organization_id IN (
        SELECT ra.organization_id 
        FROM role_assignments ra
        JOIN unified_identities ui ON ra.identity_id = ui.id
        WHERE ui.auth_user_id = auth.uid() AND ra.is_active = true
    )
);

CREATE POLICY "Admins can manage invitations"
ON employee_invitations FOR ALL
USING (
    organization_id IN (
        SELECT ra.organization_id 
        FROM role_assignments ra
        JOIN unified_identities ui ON ra.identity_id = ui.id
        WHERE ui.auth_user_id = auth.uid() 
          AND ra.is_active = true
          AND ra.role IN ('admin', 'owner', 'master')
    )
);

-- ============================================================
-- 10. INITIAL SETUP AND GRANTS
-- ============================================================

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create storage bucket for business certificates (if not exists)
-- This needs to be run in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--     'business-certificates',
--     'business-certificates',
--     false,
--     10485760, -- 10MB
--     ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ 한국 사업자 등록 시스템 스키마 생성 완료!';
    RAISE NOTICE '📋 생성된 테이블: korean_business_registrations, business_documents, workplace_locations, employee_invitations';
    RAISE NOTICE '🏢 사업장 위치 관리 시스템 활성화';
    RAISE NOTICE '📄 사업자등록증 업로드 시스템 활성화';
    RAISE NOTICE '👥 직원 초대 시스템 활성화';
    RAISE NOTICE '🛡️ RLS 정책 적용 완료';
END $$;