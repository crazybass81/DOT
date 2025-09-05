# SQL Scripts 실행 가이드

## 🚨 중요: RLS 정책 수정 필요

회원가입이 정상적으로 작동하려면 아래 SQL 스크립트를 Supabase 대시보드에서 실행해야 합니다.

### 실행 방법

1. [Supabase Dashboard](https://app.supabase.com) 로그인
2. 해당 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. 새 쿼리 생성
5. 아래 파일 내용을 복사하여 붙여넣기
6. **Run** 버튼 클릭

### 실행해야 할 스크립트

#### 1. 회원가입 RLS 정책 수정 (필수!)

⚠️ **중요**: `fix-signup-rls-simple.sql` 파일을 사용하세요!

```bash
# 파일: fix-signup-rls-simple.sql
```

이 스크립트는 다음 작업을 수행합니다:
- ✅ Organizations 테이블 RLS 정책 수정
- ✅ Employees 테이블 RLS 정책 수정
- ✅ 누락된 컬럼 추가 (code, biz_type, biz_number)
- ✅ 조직 코드 자동 생성 트리거 추가
- ✅ 필요한 권한 부여

### 오류 해결

#### 403 Forbidden 오류
```
POST https://...supabase.co/rest/v1/employees?select=* 403 (Forbidden)
```
👉 **해결**: `fix-signup-rls-policies.sql` 실행

#### 400 Bad Request 오류
```
POST https://...supabase.co/rest/v1/organizations?select=* 400 (Bad Request)
```
👉 **해결**: 누락된 컬럼 추가 (스크립트에 포함됨)

### 테스트 방법

1. SQL 스크립트 실행 후
2. 브라우저에서 `/signup` 페이지로 이동
3. 사업자로 회원가입 시도
4. 성공하면 `/business-dashboard`로 리다이렉트됨

### 기타 유용한 스크립트

- `check-user-position-simple.sql`: 사용자 권한 확인
- `fix-user-position.sql`: 사용자 권한 수정
- `create-organizations-table-complete.sql`: 테이블 구조 확인/생성

### 문제가 계속되면?

1. Supabase 대시보드에서 **Authentication > Policies** 확인
2. organizations와 employees 테이블의 RLS가 활성화되어 있는지 확인
3. 정책이 올바르게 생성되었는지 확인