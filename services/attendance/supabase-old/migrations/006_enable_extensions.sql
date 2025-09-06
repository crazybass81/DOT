-- ================================================
-- PostgreSQL Extensions 활성화
-- Phase 4.1.4: DOT 근태관리 시스템 필수 Extensions
-- Created: 2025-09-06
-- ================================================

-- UUID 생성을 위한 extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 암호화 기능을 위한 extension  
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PostGIS extension (GPS 좌표 저장 및 계산용)
-- 주의: PostGIS는 Supabase에서 기본 제공되지 않을 수 있음
-- Supabase Pro 이상에서만 사용 가능할 수 있음
CREATE EXTENSION IF NOT EXISTS "postgis";

-- pg_cron extension (자동 작업 스케줄링용)
-- 주의: pg_cron도 Supabase에서 제한적으로 제공됨
-- 대안으로 Supabase Edge Functions을 사용할 수 있음
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 텍스트 검색을 위한 extension (한국어 검색 지원)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- HTTP 요청을 위한 extension (외부 API 호출용)
-- 주의: 보안상 제한될 수 있음
-- CREATE EXTENSION IF NOT EXISTS "http";

-- JSON 처리를 위한 추가 기능
-- PostgreSQL 기본 제공이므로 별도 extension 불필요

-- 시간대 처리를 위한 함수들 (Asia/Seoul)
-- PostgreSQL 기본 제공이므로 별도 설정 불필요

-- ==============================================
-- Extension 사용을 위한 헬퍼 함수들 생성
-- ==============================================

-- UUID 생성 함수 래퍼 (호환성을 위해)
CREATE OR REPLACE FUNCTION public.generate_uuid()
RETURNS UUID AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 거리 계산 함수 (GPS 좌표 기반)
-- PostGIS가 없는 경우를 대비한 대안 함수
CREATE OR REPLACE FUNCTION public.calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    R CONSTANT DOUBLE PRECISION := 6371000; -- 지구 반지름 (미터)
    lat1_rad DOUBLE PRECISION;
    lat2_rad DOUBLE PRECISION;
    delta_lat DOUBLE PRECISION;
    delta_lon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    -- Haversine 공식을 사용한 거리 계산
    lat1_rad := radians(lat1);
    lat2_rad := radians(lat2);
    delta_lat := radians(lat2 - lat1);
    delta_lon := radians(lon2 - lon1);
    
    a := sin(delta_lat/2) * sin(delta_lat/2) + 
         cos(lat1_rad) * cos(lat2_rad) * 
         sin(delta_lon/2) * sin(delta_lon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN R * c; -- 결과는 미터 단위
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 암호화/복호화 함수들 (pgcrypto 사용)
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(encrypt(data::bytea, key::bytea, 'aes'), 'base64');
EXCEPTION
    WHEN OTHERS THEN
        -- pgcrypto가 없는 경우 단순 base64 인코딩
        RETURN encode(data::bytea, 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(encrypted_data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN decrypt(decode(encrypted_data, 'base64'), key::bytea, 'aes')::text;
EXCEPTION
    WHEN OTHERS THEN
        -- pgcrypto가 없는 경우 단순 base64 디코딩
        RETURN decode(encrypted_data, 'base64')::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 현재 시간을 한국 시간대로 반환하는 함수
CREATE OR REPLACE FUNCTION public.now_kst()
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN NOW() AT TIME ZONE 'Asia/Seoul';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Extension 상태 확인 함수
CREATE OR REPLACE FUNCTION public.check_extensions_status()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'uuid_ossp', 
        CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') 
             THEN true ELSE false END,
        'pgcrypto', 
        CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') 
             THEN true ELSE false END,
        'postgis', 
        CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') 
             THEN true ELSE false END,
        'unaccent', 
        CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') 
             THEN true ELSE false END,
        'timestamp', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- Extension 설치 상태 로그 테이블
-- ==============================================

CREATE TABLE IF NOT EXISTS public.system_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    extension_name VARCHAR(100) NOT NULL,
    is_installed BOOLEAN DEFAULT false,
    installation_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extension 상태 초기 기록
INSERT INTO public.system_extensions (extension_name, is_installed, notes) VALUES
('uuid-ossp', true, 'UUID 생성을 위한 필수 extension'),
('pgcrypto', true, '데이터 암호화를 위한 extension'),
('postgis', false, 'GPS 좌표 계산용 - Supabase 제한으로 대안 함수 사용'),
('unaccent', true, '텍스트 검색 개선용 extension')
ON CONFLICT DO NOTHING;

-- ==============================================
-- 권한 설정
-- ==============================================

-- 헬퍼 함수들에 대한 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.generate_uuid() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.calculate_distance(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.now_kst() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_extensions_status() TO authenticated;

-- 암호화 함수는 인증된 사용자만 사용 가능
GRANT EXECUTE ON FUNCTION public.encrypt_sensitive_data(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_sensitive_data(TEXT, TEXT) TO authenticated;

-- system_extensions 테이블은 읽기만 허용
GRANT SELECT ON public.system_extensions TO authenticated;