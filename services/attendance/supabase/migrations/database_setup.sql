-- Supabase SQL Editor에 복사해서 실행할 코드
-- 이 SQL을 실행하면 모든 테이블이 자동 생성됩니다

-- 1. 프로필 테이블 (사용자 정보)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'USER',
  department TEXT,
  employee_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 출퇴근 기록 테이블
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'NOT_WORKING',
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 휴게 기록 테이블
CREATE TABLE IF NOT EXISTS breaks (
  id SERIAL PRIMARY KEY,
  attendance_id INTEGER REFERENCES attendance(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;

-- 5. 보안 정책 설정 (사용자는 자신의 데이터만 접근)
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own attendance" 
  ON attendance FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own breaks" 
  ON breaks FOR ALL 
  USING (
    attendance_id IN (
      SELECT id FROM attendance WHERE user_id = auth.uid()
    )
  );

-- 6. 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE breaks;

-- 7. 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    CASE 
      WHEN new.email = 'archt723@gmail.com' THEN 'MASTER_ADMIN'
      ELSE 'USER'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 신규 사용자 가입시 프로필 자동 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. 마스터 관리자 확인 함수
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'MASTER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 마스터 관리자는 모든 데이터 접근 가능
CREATE POLICY "Master admin can view all profiles" 
  ON profiles FOR SELECT 
  USING (is_master_admin());

CREATE POLICY "Master admin can view all attendance" 
  ON attendance FOR SELECT 
  USING (is_master_admin());

-- 11. 오늘 출퇴근 상태 조회 함수
CREATE OR REPLACE FUNCTION get_today_attendance(p_user_id UUID)
RETURNS TABLE (
  id INTEGER,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  break_minutes INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.check_in_time,
    a.check_out_time,
    a.break_minutes,
    a.status
  FROM attendance a
  WHERE a.user_id = p_user_id
    AND DATE(a.created_at) = CURRENT_DATE
  ORDER BY a.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 완료! 
-- 이제 Authentication에서 사용자를 생성하면 됩니다.
-- 마스터 관리자: archt723@gmail.com / 1q2w3e2w1q!