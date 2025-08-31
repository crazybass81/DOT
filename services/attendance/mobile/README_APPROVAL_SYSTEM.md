# DOT 출근부 - 직원 등록 승인 시스템

## 🎯 시스템 개요

DOT 출근부 앱의 직원 등록 및 승인 시스템은 다음과 같은 플로우로 작동합니다:

1. **첫 QR 스캔** → 직원 등록 페이지
2. **등록 정보 제출** → 승인 대기 상태
3. **마스터 어드민 승인** → 시스템 접근 권한 부여
4. **승인 후 QR 스캔** → 사용자 대시보드

## 📱 주요 화면

### 1. 직원 등록 페이지
- **파일**: `lib/presentation/pages/registration/employee_registration_page.dart`
- **입력 필드**:
  - 사번
  - 성, 이름
  - 이메일
  - 전화번호
  - 4자리 PIN 코드

### 2. 승인 대기 페이지
- **파일**: `lib/presentation/pages/registration/approval_pending_page.dart`
- **기능**:
  - 5초마다 자동 승인 상태 확인
  - 승인 시 자동으로 대시보드 이동
  - 거부 시 거부 사유 표시

### 3. QR 스캐너 (업데이트)
- **파일**: `lib/presentation/pages/attendance/qr_scanner_page.dart`
- **상태별 처리**:
  - `NOT_REGISTERED`: 등록 페이지로 이동
  - `PENDING_APPROVAL`: 승인 대기 페이지로 이동
  - `APPROVED`: 출퇴근 처리
  - `REJECTED`: 거부 메시지 표시
  - `SUSPENDED`: 정지 메시지 표시

## 🗄️ 데이터베이스 변경사항

### employees 테이블 추가 컬럼
```sql
-- 승인 상태 관련
approval_status VARCHAR(50) DEFAULT 'PENDING'
approved_by UUID
approved_at TIMESTAMPTZ
rejection_reason TEXT
rejected_by UUID
rejected_at TIMESTAMPTZ
```

### approval_requests 테이블 (신규)
- 직원 등록 요청 관리
- 승인/거부 이력 추적

## 🔧 주요 함수

| 함수명 | 용도 | 반환값 |
|--------|------|--------|
| `check_employee_status` | 직원 상태 확인 | NOT_REGISTERED, PENDING_APPROVAL, APPROVED, REJECTED, SUSPENDED |
| `register_employee_via_qr` | QR 통한 직원 등록 | employee_id |
| `approve_employee` | 직원 승인 처리 | success boolean |
| `reject_employee` | 직원 거부 처리 | success boolean |
| `get_pending_approvals` | 승인 대기 목록 조회 | 직원 목록 |

## 🚀 설치 및 실행

### 1. 데이터베이스 마이그레이션
```bash
# Supabase SQL Editor에서 다음 파일 순서대로 실행:
1. supabase/migrations/001_employees_table.sql
2. supabase/migrations/002_employee_approval_system.sql
```

### 2. 앱 빌드 및 실행
```bash
# 의존성 설치
flutter pub get

# freezed 파일 생성
dart run build_runner build --delete-conflicting-outputs

# 앱 실행
flutter run
```

## 📋 테스트 시나리오

### 시나리오 1: 신규 직원 등록
1. QR 코드 스캔
2. "미등록" 상태 확인 → 등록 페이지 이동
3. 정보 입력 및 제출
4. 승인 대기 페이지로 자동 이동

### 시나리오 2: 승인 대기 중 재스캔
1. 승인 대기 중인 직원이 QR 재스캔
2. "승인 대기 중" 메시지 표시
3. 승인 대기 페이지로 이동

### 시나리오 3: 승인 후 접근
1. 마스터 어드민이 승인 처리
2. 직원이 QR 스캔
3. 출퇴근 페이지로 정상 이동

### 시나리오 4: 거부된 직원
1. 거부된 직원이 QR 스캔
2. 거부 사유 표시
3. 재등록 안내

## 🔐 보안 고려사항

1. **PIN 코드**: 해시 처리하여 저장
2. **디바이스 ID**: 기기별 고유 ID로 중복 등록 방지
3. **RLS 정책**: Supabase Row Level Security 적용
4. **승인 권한**: ADMIN, SUPER_ADMIN, MASTER_ADMIN만 승인 가능

## 📝 변경 파일 목록

### 신규 파일
- `lib/presentation/pages/registration/employee_registration_page.dart`
- `lib/presentation/pages/registration/approval_pending_page.dart`
- `lib/presentation/pages/admin/approval_management_page.dart`
- `lib/presentation/providers/approval_management_provider.dart`
- `lib/presentation/widgets/common/neo_brutal_text_field.dart`
- `supabase/migrations/002_employee_approval_system.sql`
- `docs/EMPLOYEE_REGISTRATION_APPROVAL_SYSTEM.md`
- `README_APPROVAL_SYSTEM.md`

### 수정 파일
- `lib/presentation/providers/employee_registration_provider.dart`
- `lib/presentation/pages/attendance/qr_scanner_page.dart`
- `lib/presentation/pages/admin/master_admin_dashboard_page.dart` (승인 관리 버튼 추가)
- `lib/presentation/router/app_router.dart` (승인 관리 라우트 추가)
- `lib/main.dart`
- `pubspec.yaml` (device_info_plus 추가)

## ⚠️ 주의사항

1. **라우터 설정**: `employeeRegistration`과 `approvalPending` 경로는 인증 없이 접근 가능하도록 설정됨
2. **Provider 상태**: `checkRegistrationStatus()`가 String을 반환하도록 변경됨 (기존 bool에서)
3. **Freezed 파일**: Provider 수정 후 반드시 `build_runner` 실행 필요

## 🆘 문제 해결

### APK 설치 실패 시
```bash
# 클린 빌드
flutter clean
flutter pub get
flutter run
```

### Freezed 파일 오류 시
```bash
dart run build_runner build --delete-conflicting-outputs
```

### 라우팅 오류 시
- `app_router.dart`의 redirect 로직 확인
- 등록 관련 페이지가 인증 체크에서 제외되었는지 확인

## 📊 상태 흐름도

```
[QR 스캔]
    ↓
[상태 확인]
    ├─ NOT_REGISTERED → [등록 페이지] → [승인 대기]
    ├─ PENDING_APPROVAL → [승인 대기 페이지]
    ├─ APPROVED → [출퇴근 페이지]
    ├─ REJECTED → [거부 메시지] → [재등록]
    └─ SUSPENDED → [정지 메시지]
```

## ✅ 구현 완료 기능

1. **마스터 어드민 승인 관리 페이지**
   - ✅ 승인 대기 목록 표시
   - ✅ 승인/거부 버튼
   - ✅ 거부 사유 입력 다이얼로그
   - ✅ 실시간 상태 업데이트
   - ✅ 당겨서 새로고침 기능

2. **직원 관리 기능**
   - 직원 목록 조회
   - 직원 정보 수정
   - 계정 정지/재활성화

3. **알림 시스템**
   - 신규 등록 알림 (관리자)
   - 승인/거부 알림 (직원)

---

**작성일**: 2024년
**버전**: 1.0.0
**작성자**: DOT 개발팀