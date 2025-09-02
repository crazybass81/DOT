-- QR 코드 저장 테이블 생성
-- Supabase SQL Editor에서 실행해주세요

-- QR 코드 테이블
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'login', 'attendance', 'checkout' 등
    location_id VARCHAR(100) NOT NULL,
    location_name VARCHAR(255),
    extra_data JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL이면 영구 유효
    is_active BOOLEAN DEFAULT true,
    used_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB -- 추가 메타데이터
);

-- 인덱스 생성
CREATE INDEX idx_qr_codes_code ON public.qr_codes(code);
CREATE INDEX idx_qr_codes_location ON public.qr_codes(location_id);
CREATE INDEX idx_qr_codes_created_by ON public.qr_codes(created_by);
CREATE INDEX idx_qr_codes_is_active ON public.qr_codes(is_active);
CREATE INDEX idx_qr_codes_expires_at ON public.qr_codes(expires_at);

-- QR 코드 사용 기록 테이블
CREATE TABLE IF NOT EXISTS public.qr_code_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    qr_code_id UUID REFERENCES public.qr_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_info JSONB,
    location JSONB -- 위치 정보 (위도, 경도 등)
);

-- 인덱스 생성
CREATE INDEX idx_qr_code_usage_qr_code ON public.qr_code_usage(qr_code_id);
CREATE INDEX idx_qr_code_usage_user ON public.qr_code_usage(user_id);
CREATE INDEX idx_qr_code_usage_time ON public.qr_code_usage(used_at);

-- RLS 정책 설정
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_code_usage ENABLE ROW LEVEL SECURITY;

-- QR 코드 정책
-- 관리자만 생성/수정/삭제 가능
CREATE POLICY "Admins can manage QR codes" ON public.qr_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('MASTER_ADMIN', 'ADMIN', 'SUPER_ADMIN')
        )
    );

-- 모든 인증된 사용자는 활성 QR 코드 조회 가능
CREATE POLICY "Authenticated users can view active QR codes" ON public.qr_codes
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );

-- QR 코드 사용 기록 정책
-- 사용자는 자신의 사용 기록만 조회 가능
CREATE POLICY "Users can view own QR usage" ON public.qr_code_usage
    FOR SELECT
    USING (user_id = auth.uid());

-- 모든 인증된 사용자는 QR 사용 기록 생성 가능
CREATE POLICY "Authenticated users can create QR usage" ON public.qr_code_usage
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 관리자는 모든 사용 기록 조회 가능
CREATE POLICY "Admins can view all QR usage" ON public.qr_code_usage
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('MASTER_ADMIN', 'ADMIN', 'SUPER_ADMIN')
        )
    );

-- QR 코드 사용 시 자동으로 사용 횟수 증가 및 마지막 사용 시간 업데이트
CREATE OR REPLACE FUNCTION update_qr_code_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.qr_codes
    SET 
        used_count = used_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.qr_code_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_qr_code_usage_trigger
AFTER INSERT ON public.qr_code_usage
FOR EACH ROW
EXECUTE FUNCTION update_qr_code_usage();

-- 만료된 QR 코드 자동 비활성화
CREATE OR REPLACE FUNCTION deactivate_expired_qr_codes()
RETURNS void AS $$
BEGIN
    UPDATE public.qr_codes
    SET is_active = false
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 샘플 데이터 (선택사항)
-- INSERT INTO public.qr_codes (code, type, location_id, location_name, created_by)
-- VALUES 
-- ('QR_MAIN_001', 'login', 'main_office', '본사 - 강남', auth.uid()),
-- ('QR_GN_001', 'login', 'branch_gangnam', '강남지점', auth.uid());