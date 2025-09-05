-- 알림 시스템 테이블 생성
-- Phase 3.2.2: 알림 타입별 처리 로직 구현

-- 알림 메시지 저장 테이블
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    target_users TEXT[],
    target_organizations TEXT[],
    created_by VARCHAR(255) NOT NULL,
    created_by_name VARCHAR(255)
);

-- 사용자별 알림 읽음 상태 관리 테이블
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(notification_id, user_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target_users ON public.notifications USING GIN(target_users);
CREATE INDEX IF NOT EXISTS idx_notifications_target_organizations ON public.notifications USING GIN(target_organizations);
CREATE INDEX IF NOT EXISTS idx_notifications_valid_until ON public.notifications(valid_until) WHERE valid_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id ON public.user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_at ON public.user_notifications(read_at) WHERE read_at IS NOT NULL;

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- 알림 조회 정책: 자신이 타겟인 알림만 조회 가능
CREATE POLICY notifications_select_policy ON public.notifications
    FOR SELECT USING (
        -- 시스템 전체 알림 (target_users와 target_organizations가 모두 NULL인 경우)
        (target_users IS NULL AND target_organizations IS NULL)
        OR
        -- 개인 타겟 알림
        (target_users IS NOT NULL AND auth.uid()::text = ANY(target_users))
        OR
        -- 조직 타겟 알림 (사용자가 해당 조직에 속한 경우)
        (target_organizations IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.employee_id = auth.uid() 
            AND ur.organization_id = ANY(target_organizations)
            AND ur.is_active = true
        ))
        OR
        -- 마스터 어드민은 모든 알림 조회 가능
        EXISTS (
            SELECT 1 FROM public.employees e 
            WHERE e.id = auth.uid() 
            AND e.is_master_admin = true
        )
    );

-- 알림 생성 정책: 인증된 사용자만 가능
CREATE POLICY notifications_insert_policy ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            created_by = auth.uid()::text
            OR
            -- 마스터 어드민은 시스템 알림 생성 가능
            EXISTS (
                SELECT 1 FROM public.employees e 
                WHERE e.id = auth.uid() 
                AND e.is_master_admin = true
            )
        )
    );

-- 사용자 알림 읽음 상태 관리 정책
CREATE POLICY user_notifications_select_policy ON public.user_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_notifications_insert_policy ON public.user_notifications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_notifications_update_policy ON public.user_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- 알림 유형 열거형 생성 (참고용)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            'ATTENDANCE_CHECK_IN',
            'ATTENDANCE_CHECK_OUT',
            'ATTENDANCE_LATE',
            'ATTENDANCE_ABSENT',
            'ROLE_CHANGED',
            'ROLE_ASSIGNED',
            'ROLE_REVOKED',
            'ORGANIZATION_INVITED',
            'ORGANIZATION_APPROVED',
            'ORGANIZATION_REJECTED',
            'ORGANIZATION_ANNOUNCEMENT',
            'SYSTEM_ANNOUNCEMENT',
            'SYSTEM_MAINTENANCE',
            'SYSTEM_UPDATE',
            'TASK_ASSIGNED',
            'TASK_COMPLETED',
            'REPORT_READY'
        );
    END IF;
END $$;

-- 알림 우선순위 열거형 생성 (참고용)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
        CREATE TYPE notification_priority AS ENUM (
            'LOW',
            'MEDIUM', 
            'HIGH',
            'URGENT'
        );
    END IF;
END $$;

-- 유용한 뷰 생성
CREATE OR REPLACE VIEW public.user_notification_summary AS
SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.priority,
    n.created_at,
    n.valid_until,
    un.read_at,
    CASE WHEN un.read_at IS NULL THEN true ELSE false END as is_unread,
    n.created_by_name
FROM public.notifications n
LEFT JOIN public.user_notifications un ON n.id = un.notification_id 
WHERE 
    -- 개인 타겟 알림
    (n.target_users IS NOT NULL AND auth.uid()::text = ANY(n.target_users))
    OR
    -- 조직 타겟 알림
    (n.target_organizations IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.employee_id = auth.uid() 
        AND ur.organization_id = ANY(n.target_organizations)
        AND ur.is_active = true
    ))
    OR
    -- 시스템 전체 알림
    (n.target_users IS NULL AND n.target_organizations IS NULL);

-- 통계 함수 생성
CREATE OR REPLACE FUNCTION get_user_notification_stats(user_uuid UUID)
RETURNS TABLE (
    total_count INTEGER,
    unread_count INTEGER,
    high_priority_unread INTEGER,
    urgent_priority_unread INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_count,
        COUNT(*) FILTER (WHERE un.read_at IS NULL)::INTEGER as unread_count,
        COUNT(*) FILTER (WHERE un.read_at IS NULL AND n.priority = 'HIGH')::INTEGER as high_priority_unread,
        COUNT(*) FILTER (WHERE un.read_at IS NULL AND n.priority = 'URGENT')::INTEGER as urgent_priority_unread
    FROM public.notifications n
    LEFT JOIN public.user_notifications un ON n.id = un.notification_id AND un.user_id = user_uuid
    WHERE 
        -- 개인 타겟 알림
        (n.target_users IS NOT NULL AND user_uuid::text = ANY(n.target_users))
        OR
        -- 조직 타겟 알림
        (n.target_organizations IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.employee_id = user_uuid
            AND ur.organization_id = ANY(n.target_organizations)
            AND ur.is_active = true
        ))
        OR
        -- 시스템 전체 알림
        (n.target_users IS NULL AND n.target_organizations IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 만료된 알림 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notifications 
    WHERE valid_until IS NOT NULL 
    AND valid_until < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 정기적인 정리 작업을 위한 cron job 설정 (수동 실행용)
-- SELECT cleanup_expired_notifications();

COMMENT ON TABLE public.notifications IS '실시간 알림 메시지 저장 테이블';
COMMENT ON TABLE public.user_notifications IS '사용자별 알림 읽음 상태 관리 테이블';
COMMENT ON FUNCTION get_user_notification_stats(UUID) IS '사용자의 알림 통계 조회 함수';
COMMENT ON FUNCTION cleanup_expired_notifications() IS '만료된 알림 정리 함수';