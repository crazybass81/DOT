# 📋 데이터베이스 스키마 설정 가이드

## 🚨 중요: 다음 단계가 필요합니다

코드는 통합 테이블 시스템으로 업데이트되었지만, **데이터베이스에 실제 테이블이 생성되어야 합니다**.

### 📝 수동 스키마 생성 단계

#### 1단계: Supabase 대시보드 접속
1. https://app.supabase.com 이동
2. 프로젝트 선택 
3. 좌측 메뉴에서 **SQL Editor** 클릭

#### 2단계: SQL 스크립트 실행
1. `src/scripts/create-unified-schema.sql` 파일 내용 복사
2. Supabase SQL Editor에 붙여넣기
3. **Run** 버튼 클릭하여 실행

#### 3단계: 실행 확인
다음 메시지가 나오면 성공:
```
✅ DOT 통합 데이터베이스 스키마 생성 완료!
📋 생성된 테이블: unified_identities, organizations_v3, role_assignments, attendance_records
👀 생성된 뷰: user_roles_view, active_employees
🛡️ RLS 정책 적용 완료
🔧 헬퍼 함수 생성 완료
```

### 🔍 검증 방법

스키마 생성 후 다음 테스트 실행:

```bash
# 데이터베이스 연결 테스트
npm run test:integration

# 인증 플로우 테스트  
npm run test:auth

# 전체 테스트 실행
npm test
```

### 📊 생성될 테이블들

| 테이블명 | 용도 | 상태 |
|---------|------|------|
| `unified_identities` | 통합 사용자 신원 | ✅ 필수 |
| `organizations_v3` | 조직/회사 정보 | ✅ 필수 |
| `role_assignments` | 역할 배정 | ✅ 필수 |
| `attendance_records` | 근태 기록 | ✅ 필수 |
| `user_roles_view` | 사용자 역할 뷰 | ✅ 편의성 |
| `active_employees` | 활성 직원 뷰 | ✅ 편의성 |

### ⚠️ 중요 사항

1. **백업**: 기존 데이터가 있다면 먼저 백업
2. **RLS**: Row Level Security 정책이 자동으로 적용됨
3. **권한**: 필요한 권한들이 자동으로 설정됨
4. **인덱스**: 성능 최적화를 위한 인덱스들이 생성됨

### 🎯 다음 단계

스키마 생성 완료 후:

1. ✅ **회원가입 테스트**: 사용자 이메일로 회원가입
2. ✅ **인증 플로우 테스트**: 로그인/로그아웃 
3. ✅ **역할 배정 테스트**: 관리자 역할 생성
4. ✅ **근태 기록 테스트**: 출근/퇴근 기능

### 🔧 문제 해결

#### 스키마 생성 실패 시:
```sql
-- 테이블들이 이미 존재하는 경우 먼저 삭제
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS role_assignments CASCADE; 
DROP TABLE IF EXISTS organizations_v3 CASCADE;
DROP TABLE IF EXISTS unified_identities CASCADE;

-- 그 후 다시 스키마 생성 스크립트 실행
```

#### 권한 문제 시:
```sql
-- 권한 재설정
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
```

---

**📞 지원**: 스키마 생성 중 문제가 발생하면 콘솔 로그를 확인하고 필요시 문의하세요.