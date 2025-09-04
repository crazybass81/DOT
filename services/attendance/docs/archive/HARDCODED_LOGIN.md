# 하드코딩된 로그인 계정 정보

## 🔐 마스터 관리자 계정

### 로그인 정보
- **이메일**: `archt723@gmail.com`
- **비밀번호**: `Master123!@#`

### 접속 가능한 페이지
1. **일반 로그인 페이지**: http://localhost:3002/login
2. **마스터 관리자 전용 페이지**: http://localhost:3002/master-admin/login

### 권한
- ✅ 모든 기능에 접근 가능
- ✅ 마스터 관리자 대시보드
- ✅ 직원 관리
- ✅ 조직/지점/부서 관리
- ✅ 출퇴근 기록 전체 조회
- ✅ 시스템 설정

## 📝 구현 내용

### 수정된 파일
1. `/web/app/login/page.tsx` - 일반 로그인 페이지
2. `/web/app/master-admin/login/page.tsx` - 마스터 관리자 로그인 페이지

### 동작 방식
- 백엔드 인증 없이 프론트엔드에서 직접 인증 처리
- 로그인 시 localStorage에 인증 정보 저장
- 토큰과 사용자 정보를 브라우저에 저장하여 세션 유지

### localStorage 저장 데이터
```javascript
// 일반 로그인
localStorage.setItem('auth_user', {
  id: 'master-001',
  email: 'archt723@gmail.com',
  name: 'Master Admin',
  role: 'MASTER_ADMIN',
  is_master_admin: true
});
localStorage.setItem('auth_token', 'hardcoded-master-token-[timestamp]');

// 마스터 관리자 로그인
localStorage.setItem('master_admin_token', 'hardcoded-master-token-[timestamp]');
localStorage.setItem('master_admin_user', {
  id: 'master-001',
  email: 'archt723@gmail.com',
  name: 'Master Admin',
  role: 'MASTER_ADMIN',
  is_master_admin: true
});
```

## ⚠️ 주의사항
- 이것은 개발/테스트용 하드코딩된 계정입니다
- 프로덕션 환경에서는 절대 사용하지 마세요
- 실제 배포 시에는 적절한 인증 시스템으로 교체해야 합니다