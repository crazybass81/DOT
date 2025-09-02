# Supabase 프로젝트 설정 가이드

## 프로젝트 정보
- **프로젝트 URL**: https://mljyiuzetchtjudbcfvd.supabase.co
- **대시보드**: https://supabase.com/dashboard/project/mljyiuzetchtjudbcfvd

## 생성된 테스트 계정 (이메일 확인 필요)

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| MASTER_ADMIN | master.admin@gmail.com | MasterAdmin123!@# |
| MANAGER | manager.gangnam@gmail.com | Manager123!@# |
| EMPLOYEE | employee.kim2025@gmail.com | Employee123!@# |
| EMPLOYEE | newuser.park2025@gmail.com | NewUser123!@# |

## 이메일 확인 비활성화 방법

### 방법 1: Supabase Dashboard에서 설정
1. https://supabase.com/dashboard/project/mljyiuzetchtjudbcfvd 접속
2. **Authentication** → **Providers** → **Email** 클릭
3. **Confirm email** 옵션을 **비활성화**
4. 저장

### 방법 2: 수동으로 사용자 확인
1. https://supabase.com/dashboard/project/mljyiuzetchtjudbcfvd 접속
2. **Authentication** → **Users** 탭 이동
3. 각 사용자 클릭
4. **Confirm Email** 버튼 클릭

## 데이터베이스 테이블 생성

Supabase SQL Editor에서 실행:
1. **SQL Editor** 탭으로 이동
2. `/services/attendance/supabase/migrations/001_initial_schema.sql` 내용 복사
3. 실행

## Service Role Key 얻기
1. **Settings** → **API** 이동
2. **Service role key** 복사 (admin 권한 필요한 작업용)

## 로그인 테스트
- 웹앱: http://localhost:3002/login
- 마스터 관리자: http://localhost:3002/master-admin/login