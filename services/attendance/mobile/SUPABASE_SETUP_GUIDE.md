# Supabase 설정 가이드

## 1. 사용자 계정 생성하기

### 방법 1: Supabase Dashboard에서 직접 생성 (권장)
1. Supabase Dashboard 접속: https://supabase.com/dashboard/project/mljyiuzetchtjudbcfvd
2. 왼쪽 메뉴에서 **Authentication** 클릭
3. **Users** 탭 선택
4. **Add user** → **Create new user** 버튼 클릭
5. 다음 정보 입력:
   - Email: `archt723@gmail.com`
   - Password: `1q2w3e2w1q!`
6. **Create user** 클릭

### 방법 2: SQL Editor에서 테이블 생성 및 프로필 설정
1. Supabase Dashboard의 **SQL Editor** 접속
2. `database_setup.sql` 파일의 내용을 실행 (이미 실행했다면 건너뛰기)
3. `create_test_admin.sql` 파일의 내용을 실행하여 관리자 권한 부여

## 2. 테이블이 생성되었는지 확인

SQL Editor에서 다음 쿼리 실행:
```sql
-- 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 프로필 확인
SELECT * FROM public.profiles;
```

## 3. 앱에서 로그인 테스트

1. 앱 실행: `flutter run`
2. Master Admin Login 페이지에서:
   - Admin ID: `archt723` (또는 `archt723@gmail.com`)
   - Password: `1q2w3e2w1q!`
3. 로그인 버튼 클릭

## 문제 해결

### "Invalid admin credential" 오류가 계속 나타나는 경우:

1. **사용자가 생성되었는지 확인:**
   ```sql
   SELECT id, email, created_at 
   FROM auth.users 
   WHERE email = 'archt723@gmail.com';
   ```

2. **프로필이 생성되었는지 확인:**
   ```sql
   SELECT * FROM public.profiles 
   WHERE id = (SELECT id FROM auth.users WHERE email = 'archt723@gmail.com');
   ```

3. **프로필의 role이 MASTER_ADMIN인지 확인:**
   ```sql
   UPDATE public.profiles 
   SET role = 'MASTER_ADMIN' 
   WHERE id = (SELECT id FROM auth.users WHERE email = 'archt723@gmail.com');
   ```

4. **RLS(Row Level Security) 정책 확인:**
   ```sql
   -- profiles 테이블의 RLS 비활성화 (테스트용)
   ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
   ```

## 로그 확인 방법

Android Studio의 Logcat 또는 터미널에서:
```bash
flutter logs
```

디버그 정보를 확인하려면 앱 실행 시:
```bash
flutter run --verbose
```