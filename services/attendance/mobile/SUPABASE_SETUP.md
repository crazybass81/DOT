# 🚀 Supabase 설정 가이드

DOT 출근부 앱을 위한 Supabase 백엔드 설정 가이드입니다.

## 1️⃣ Supabase 프로젝트 생성 (2분)

1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub으로 로그인
4. "New Project" 클릭
5. 입력:
   - **Project name**: dot-attendance
   - **Database Password**: 강한 비밀번호 (나중에 필요 없음)
   - **Region**: Northeast Asia (Seoul)
6. "Create new project" 클릭

## 2️⃣ 필요한 정보 복사 (30초)

프로젝트가 생성되면:
1. Settings > API 메뉴로 이동
2. 복사할 것:
   - **Project URL**: https://xxxxx.supabase.co
   - **anon public key**: eyJhbGc... (긴 문자열)

## 3️⃣ Flutter 패키지 설치 (1분)

```bash
flutter pub add supabase_flutter
```

## 4️⃣ 데이터베이스 테이블 생성 (1분)

Supabase Dashboard에서 SQL Editor 클릭하고 아래 코드 실행:

```sql
-- 사용자 프로필 테이블
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'USER',
  department TEXT,
  employee_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 출퇴근 기록 테이블
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'NOT_WORKING',
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 휴게 기록 테이블
CREATE TABLE breaks (
  id SERIAL PRIMARY KEY,
  attendance_id INTEGER REFERENCES attendance(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR 토큰 테이블 (필요시 추가)
-- CREATE TABLE qr_tokens (
--   id SERIAL PRIMARY KEY,
--   token TEXT UNIQUE NOT NULL,
--   action TEXT,
--   user_id UUID REFERENCES profiles(id),
--   expires_at TIMESTAMPTZ,
--   used_at TIMESTAMPTZ,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- RLS (Row Level Security) 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;

-- 정책 설정 (모든 사용자가 자신의 데이터만 접근)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own attendance" ON attendance
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own breaks" ON breaks
  FOR ALL USING (
    attendance_id IN (
      SELECT id FROM attendance WHERE user_id = auth.uid()
    )
  );

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE breaks;

-- 마스터 관리자 역할 함수
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'MASTER_ADMIN' 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 마스터 관리자는 모든 데이터 접근 가능
CREATE POLICY "Master admin full access" ON profiles
  FOR ALL USING (is_master_admin());

CREATE POLICY "Master admin attendance access" ON attendance
  FOR ALL USING (is_master_admin());
```

## 5️⃣ 테스트 계정 생성 (30초)

Authentication > Users 메뉴에서:
1. "Add user" → "Create new user" 클릭
2. 입력:
   - Email: `archt723@gmail.com`
   - Password: `1q2w3e2w1q!`
   - Auto Confirm User: ✅ 체크
3. "Create user" 클릭

프로필은 자동으로 생성됩니다 (트리거 설정됨).

## 6️⃣ Flutter 앱 설정

`lib/core/config/supabase_config.dart` 파일 수정:

```dart
class SupabaseConfig {
  static const String supabaseUrl = 'YOUR_SUPABASE_URL';
  static const String supabaseAnonKey = 'YOUR_ANON_KEY';
}
```

## 완료! 🎉

이제 Supabase가 준비되었습니다. Flutter 코드만 연결하면 됩니다!