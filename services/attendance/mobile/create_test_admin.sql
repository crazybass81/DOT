-- Create test admin user for Supabase Auth
-- 이 스크립트는 Supabase Dashboard의 SQL Editor에서 실행해야 합니다

-- 1. 먼저 사용자를 Supabase Auth에 생성해야 합니다
-- Supabase Dashboard에서 Authentication > Users 섹션에서 수동으로 생성하거나
-- 아래 코드를 사용하여 프로그래밍 방식으로 생성할 수 있습니다

-- 2. 생성한 사용자의 ID로 프로필 업데이트
-- 사용자 생성 후 생성된 user_id를 여기에 입력하세요
DO $$
DECLARE
    user_id_value UUID;
BEGIN
    -- Supabase Auth에서 archt723@gmail.com 사용자의 ID를 찾습니다
    SELECT id INTO user_id_value 
    FROM auth.users 
    WHERE email = 'archt723@gmail.com'
    LIMIT 1;
    
    IF user_id_value IS NOT NULL THEN
        -- 프로필이 이미 있는지 확인
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id_value) THEN
            -- 프로필 생성
            INSERT INTO public.profiles (id, name, role, created_at, updated_at)
            VALUES (
                user_id_value,
                'Master Admin',
                'MASTER_ADMIN',
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Profile created for user %', user_id_value;
        ELSE
            -- 프로필 업데이트 (role을 MASTER_ADMIN으로)
            UPDATE public.profiles 
            SET role = 'MASTER_ADMIN',
                name = 'Master Admin',
                updated_at = NOW()
            WHERE id = user_id_value;
            RAISE NOTICE 'Profile updated for user %', user_id_value;
        END IF;
    ELSE
        RAISE NOTICE 'User archt723@gmail.com not found. Please create the user first in Authentication > Users';
    END IF;
END $$;

-- 프로필 확인
SELECT 
    p.id,
    p.name,
    p.role,
    u.email,
    p.created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'archt723@gmail.com';