-- DOT 조직 관리 시스템 스키마 확장
-- 파일: organization-management-schema.sql
-- 작성일: 2025-09-11

-- 1. 조직 테이블 확장 (기존 organizations_v3 기반)
ALTER TABLE public.organizations_v3 ADD COLUMN IF NOT EXISTS 
    business_registration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS 
    business_registration_document_url TEXT,
ADD COLUMN IF NOT EXISTS 
    business_registration_status VARCHAR(20) DEFAULT 'pending' CHECK (business_registration_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS 
    business_registration_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS 
    business_registration_verified_by UUID,
ADD COLUMN IF NOT EXISTS 
    primary_location JSONB, -- GPS 좌표, 주소
ADD COLUMN IF NOT EXISTS 
    work_locations JSONB[], -- 다중 사업장 지원
ADD COLUMN IF NOT EXISTS 
    attendance_radius_meters INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS 
    work_hours_policy JSONB, -- 근무시간 정책
ADD COLUMN IF NOT EXISTS 
    break_time_policy JSONB, -- 휴게시간 정책
ADD COLUMN IF NOT EXISTS 
    organization_settings JSONB DEFAULT '{}', -- 기타 설정
ADD COLUMN IF NOT EXISTS 
    qr_code_data TEXT, -- QR 코드 데이터
ADD COLUMN IF NOT EXISTS 
    invitation_code VARCHAR(20) UNIQUE; -- 직원 초대 코드

-- 2. 부서/팀 관리 테이블
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    organization_id UUID NOT NULL REFERENCES public.organizations_v3(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_department_id UUID REFERENCES public.departments(id), -- 상위 부서
    manager_id UUID REFERENCES public.unified_identities(id), -- 부서 관리자
    
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(organization_id, name)
);

-- 3. 사업자등록증 관리 테이블
CREATE TABLE IF NOT EXISTS public.business_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    organization_id UUID NOT NULL REFERENCES public.organizations_v3(id) ON DELETE CASCADE,
    registration_number VARCHAR(50) NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    business_type VARCHAR(100),
    address TEXT,
    representative_name VARCHAR(100),
    
    -- 파일 업로드 정보
    document_url TEXT NOT NULL,
    document_file_name VARCHAR(255),
    document_file_size INTEGER,
    document_mime_type VARCHAR(100),
    
    -- OCR 결과
    ocr_result JSONB,
    ocr_confidence DECIMAL(3,2), -- 0.00 ~ 1.00
    
    -- 승인 상태
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_review')),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES public.unified_identities(id),
    review_notes TEXT,
    
    UNIQUE(registration_number)
);

-- 4. 위치 설정 테이블
CREATE TABLE IF NOT EXISTS public.work_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    organization_id UUID NOT NULL REFERENCES public.organizations_v3(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- 사업장 이름
    address TEXT NOT NULL,
    
    -- GPS 좌표
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- 출퇴근 허용 반경 (미터)
    allowed_radius_meters INTEGER DEFAULT 100,
    
    -- 사업장 타입
    location_type VARCHAR(50) DEFAULT 'main' CHECK (location_type IN ('main', 'branch', 'remote', 'temporary')),
    
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(organization_id, name)
);

-- 5. 초대 시스템 테이블
CREATE TABLE IF NOT EXISTS public.employee_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    organization_id UUID NOT NULL REFERENCES public.organizations_v3(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES public.unified_identities(id),
    
    -- 초대 정보
    email VARCHAR(255),
    phone VARCHAR(20),
    full_name VARCHAR(100),
    
    -- 역할 정보
    role VARCHAR(50) DEFAULT 'worker' CHECK (role IN ('worker', 'manager', 'admin')),
    department_id UUID REFERENCES public.departments(id),
    position VARCHAR(100),
    employee_code VARCHAR(50),
    
    -- 초대 상태
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    invitation_token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- 수락/거절 정보
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, email),
    UNIQUE(organization_id, employee_code)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_departments_organization ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON public.departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_business_registrations_org ON public.business_registrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_registrations_status ON public.business_registrations(status);
CREATE INDEX IF NOT EXISTS idx_work_locations_org ON public.work_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_locations_coords ON public.work_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_org ON public.employee_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON public.employee_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON public.employee_invitations(status);

-- 트리거 생성 (updated_at 자동 업데이트)
CREATE TRIGGER update_departments_updated_at 
    BEFORE UPDATE ON public.departments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_registrations_updated_at 
    BEFORE UPDATE ON public.business_registrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_locations_updated_at 
    BEFORE UPDATE ON public.work_locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_invitations_updated_at 
    BEFORE UPDATE ON public.employee_invitations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 설정
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

-- 조직 관리자만 접근 가능한 정책
CREATE POLICY "Organization admins can manage departments" ON public.departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.role_assignments ra 
            WHERE ra.identity_id = auth.uid()::text::uuid 
                AND ra.organization_id = departments.organization_id
                AND ra.role IN ('admin', 'manager', 'master')
                AND ra.is_active = true
        )
    );

CREATE POLICY "Organization admins can manage business registrations" ON public.business_registrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.role_assignments ra 
            WHERE ra.identity_id = auth.uid()::text::uuid 
                AND ra.organization_id = business_registrations.organization_id
                AND ra.role IN ('admin', 'master')
                AND ra.is_active = true
        )
    );

CREATE POLICY "Organization members can view locations" ON public.work_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.role_assignments ra 
            WHERE ra.identity_id = auth.uid()::text::uuid 
                AND ra.organization_id = work_locations.organization_id
                AND ra.is_active = true
        )
    );

CREATE POLICY "Organization admins can manage locations" ON public.work_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.role_assignments ra 
            WHERE ra.identity_id = auth.uid()::text::uuid 
                AND ra.organization_id = work_locations.organization_id
                AND ra.role IN ('admin', 'manager', 'master')
                AND ra.is_active = true
        )
    );

CREATE POLICY "Organization admins can manage invitations" ON public.employee_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.role_assignments ra 
            WHERE ra.identity_id = auth.uid()::text::uuid 
                AND ra.organization_id = employee_invitations.organization_id
                AND ra.role IN ('admin', 'manager', 'master')
                AND ra.is_active = true
        )
    );

-- 유틸리티 함수들

-- 1. 조직 생성 함수
CREATE OR REPLACE FUNCTION create_organization_with_defaults(
    org_name TEXT,
    org_type TEXT,
    admin_id UUID,
    business_reg_number TEXT DEFAULT NULL,
    primary_address TEXT DEFAULT NULL,
    gps_lat DECIMAL DEFAULT NULL,
    gps_lng DECIMAL DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_org_id UUID;
    invitation_code TEXT;
BEGIN
    -- 초대 코드 생성 (6자리 랜덤)
    invitation_code := UPPER(substring(md5(random()::text) from 1 for 6));
    
    -- 조직 생성
    INSERT INTO public.organizations_v3 (
        name, 
        type, 
        business_registration_number,
        primary_location,
        invitation_code,
        is_active
    ) VALUES (
        org_name,
        org_type,
        business_reg_number,
        CASE 
            WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL 
            THEN json_build_object(
                'address', primary_address,
                'latitude', gps_lat,
                'longitude', gps_lng
            )::jsonb
            ELSE NULL
        END,
        invitation_code,
        true
    ) RETURNING id INTO new_org_id;
    
    -- 관리자 역할 할당
    INSERT INTO public.role_assignments (
        identity_id,
        organization_id,
        role,
        is_active
    ) VALUES (
        admin_id,
        new_org_id,
        'admin',
        true
    );
    
    -- 기본 부서 생성
    INSERT INTO public.departments (
        organization_id,
        name,
        description,
        manager_id
    ) VALUES (
        new_org_id,
        '전체',
        '기본 부서',
        admin_id
    );
    
    RETURN new_org_id;
END;
$$;

-- 2. 사업자등록증 검증 함수
CREATE OR REPLACE FUNCTION validate_business_registration(
    reg_id UUID,
    reviewer_id UUID,
    approve BOOLEAN,
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
    reg_number TEXT;
BEGIN
    -- 권한 확인 (master 역할만 가능)
    IF NOT EXISTS (
        SELECT 1 FROM public.role_assignments ra 
        WHERE ra.identity_id = reviewer_id 
            AND ra.role = 'master'
            AND ra.is_active = true
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to validate business registration';
    END IF;
    
    -- 사업자등록증 정보 가져오기
    SELECT organization_id, registration_number 
    INTO org_id, reg_number
    FROM public.business_registrations 
    WHERE id = reg_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business registration not found';
    END IF;
    
    -- 상태 업데이트
    UPDATE public.business_registrations 
    SET 
        status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
        reviewed_at = NOW(),
        reviewed_by = reviewer_id,
        review_notes = notes
    WHERE id = reg_id;
    
    -- 승인된 경우 조직 테이블 업데이트
    IF approve THEN
        UPDATE public.organizations_v3 
        SET 
            business_registration_status = 'approved',
            business_registration_verified_at = NOW(),
            business_registration_verified_by = reviewer_id
        WHERE id = org_id;
    END IF;
    
    RETURN true;
END;
$$;

-- 3. 직원 초대 처리 함수
CREATE OR REPLACE FUNCTION process_employee_invitation(
    invitation_token TEXT,
    user_id UUID,
    accept BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_row RECORD;
BEGIN
    -- 초대 정보 조회
    SELECT * INTO invitation_row
    FROM public.employee_invitations 
    WHERE invitation_token = invitation_token 
        AND status = 'pending'
        AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;
    
    IF accept THEN
        -- 초대 수락
        UPDATE public.employee_invitations 
        SET 
            status = 'accepted',
            accepted_at = NOW()
        WHERE invitation_token = invitation_token;
        
        -- 역할 할당
        INSERT INTO public.role_assignments (
            identity_id,
            organization_id,
            role,
            department,
            position,
            employee_code,
            is_active
        ) VALUES (
            user_id,
            invitation_row.organization_id,
            invitation_row.role,
            (SELECT name FROM public.departments WHERE id = invitation_row.department_id),
            invitation_row.position,
            invitation_row.employee_code,
            true
        );
    ELSE
        -- 초대 거절
        UPDATE public.employee_invitations 
        SET 
            status = 'rejected',
            rejected_at = NOW()
        WHERE invitation_token = invitation_token;
    END IF;
    
    RETURN true;
END;
$$;

-- 코멘트 추가
COMMENT ON TABLE public.departments IS 'DOT 조직관리 - 부서/팀 관리';
COMMENT ON TABLE public.business_registrations IS 'DOT 조직관리 - 사업자등록증 관리';
COMMENT ON TABLE public.work_locations IS 'DOT 조직관리 - 사업장 위치 관리';
COMMENT ON TABLE public.employee_invitations IS 'DOT 조직관리 - 직원 초대 시스템';

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ DOT 조직 관리 시스템 스키마 확장 완료';
    RAISE NOTICE '   - organizations_v3 테이블 확장됨';
    RAISE NOTICE '   - departments 테이블 생성됨';
    RAISE NOTICE '   - business_registrations 테이블 생성됨';
    RAISE NOTICE '   - work_locations 테이블 생성됨';
    RAISE NOTICE '   - employee_invitations 테이블 생성됨';
    RAISE NOTICE '   - RLS 정책 설정 완료';
    RAISE NOTICE '   - 유틸리티 함수 생성됨';
END $$;