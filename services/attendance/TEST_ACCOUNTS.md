# 📋 DOT Attendance System - 테스트 계정 정보

## 🔐 테스트 계정 목록

### 1. 👑 **마스터 어드민 (Master Admin)**
```
이메일: master.admin@dot-test.com
비밀번호: MasterAdmin123!@#
권한: 최고 관리자 (모든 권한)
2FA: 비활성화 (테스트용)
```

### 2. 🏢 **일반 관리자 (Organization Admin)**
```
이메일: admin@dot-test.com
비밀번호: Admin123!@#
권한: 조직 관리자
조직: 강남본사
```

### 3. 🏪 **지점 관리자 (Branch Manager)**
```
이메일: manager@gangnam.dot-test.com
비밀번호: Manager123!@#
권한: 지점 관리자
지점: 강남점
```

### 4. 👤 **일반 직원 (Employee)**
```
이메일: employee1@dot-test.com
비밀번호: Employee123!@#
권한: 일반 직원
상태: 승인됨 (APPROVED)
```

### 5. 🆕 **신규 직원 (Pending Approval)**
```
이메일: newuser@dot-test.com
비밀번호: NewUser123!@#
권한: 일반 직원
상태: 승인 대기 (PENDING)
```

## 🔑 추가 테스트 계정

### 직원 계정들
| 구분 | 이메일 | 비밀번호 | 상태 |
|------|--------|----------|------|
| 직원2 | employee2@dot-test.com | Employee123!@# | APPROVED |
| 직원3 | employee3@dot-test.com | Employee123!@# | APPROVED |
| 파트타임 | parttime@dot-test.com | PartTime123!@# | APPROVED |
| 거부된 사용자 | rejected@dot-test.com | Rejected123!@# | REJECTED |
| 정지된 사용자 | suspended@dot-test.com | Suspended123!@# | SUSPENDED |

## 🏢 테스트 조직 구조

### 조직 (Organizations)
- **DOT 테스트 회사** (org-test-001)
  - 코드: DOT-TEST
  - 활성 상태: Active

### 지점 (Branches)
1. **강남본사** (branch-gangnam-001)
   - 주소: 서울시 강남구 테헤란로 123
   - QR 코드: QR-GANGNAM-001

2. **판교점** (branch-pangyo-001)
   - 주소: 경기도 성남시 판교역로 456
   - QR 코드: QR-PANGYO-001

3. **여의도점** (branch-yeouido-001)
   - 주소: 서울시 영등포구 여의도동 789
   - QR 코드: QR-YEOUIDO-001

## 📱 디바이스 토큰 (테스트용)

### 신뢰된 디바이스
```
Device ID: TEST-DEVICE-001
FCM Token: TEST-FCM-TOKEN-001
Trust Level: TRUSTED
```

### 미확인 디바이스
```
Device ID: TEST-DEVICE-002
FCM Token: TEST-FCM-TOKEN-002
Trust Level: UNKNOWN
```

## 🧪 테스트 시나리오

### 1. 로그인 테스트
```javascript
// 마스터 어드민 로그인
{
  "email": "master.admin@dot-test.com",
  "password": "MasterAdmin123!@#"
}
```

### 2. 직원 등록 테스트
```javascript
// 신규 직원 등록
{
  "name": "테스트 직원",
  "email": "test.new@dot-test.com",
  "phone": "010-1234-5678",
  "birthDate": "1990-01-01",
  "branchId": "branch-gangnam-001",
  "deviceId": "TEST-DEVICE-003"
}
```

### 3. QR 스캔 테스트
```javascript
// QR 코드 데이터
{
  "qrCode": "QR-GANGNAM-001",
  "deviceId": "TEST-DEVICE-001",
  "location": {
    "latitude": 37.5665,
    "longitude": 126.9780
  }
}
```

## 🚀 빠른 시작 가이드

### 웹에서 테스트
1. http://localhost:3002 접속
2. "관리자 로그인" 클릭
3. 위 계정 정보로 로그인

### 마스터 어드민 접속
1. http://localhost:3002/master-admin/login
2. master.admin@dot-test.com / MasterAdmin123!@#

### 직원 등록 플로우
1. http://localhost:3002/register
2. 정보 입력 후 등록
3. 관리자 계정으로 승인

## ⚠️ 주의사항

1. **이 계정들은 테스트 환경에서만 사용하세요**
2. **프로덕션 환경에서는 반드시 삭제하거나 비활성화하세요**
3. **실제 운영 시 강력한 비밀번호 정책을 적용하세요**
4. **2FA (이중 인증)을 활성화하세요**

## 🔧 테스트 데이터 초기화

```bash
# 테스트 데이터 생성
npm run seed:test

# 테스트 데이터 삭제
npm run clean:test
```

## 📝 추가 정보

- Supabase 대시보드: https://supabase.com/dashboard
- API 문서: /docs/api
- 테스트 스크립트: /tests/integration/