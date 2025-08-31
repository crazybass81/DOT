# 직원 등록 및 승인 시스템 문서

## 📋 개요
DOT 출근부 시스템의 직원 등록 및 승인 프로세스를 관리하는 시스템입니다.
첫 QR 스캔 시 직원 등록을 진행하고, 관리자 승인을 통해 시스템 접근 권한을 부여합니다.

## 🔄 등록 및 승인 플로우

### 1. QR 스캔 및 상태 확인
```
QR 스캔
  ↓
상태 확인 (check_employee_status)
  ↓
분기 처리:
  - NOT_REGISTERED → 등록 페이지
  - PENDING_APPROVAL → 승인 대기 페이지
  - APPROVED → 출퇴근 페이지
  - REJECTED → 거부 메시지 + 재등록
  - SUSPENDED → 정지 메시지
```

### 2. 직원 등록 프로세스
```
등록 페이지
  ↓
정보 입력 (사번, 이름, 이메일, 전화번호, PIN)
  ↓
제출 → register_employee_via_qr()
  ↓
approval_status = 'PENDING' 설정
  ↓
승인 대기 페이지로 이동
```

### 3. 관리자 승인 프로세스
```
관리자 대시보드
  ↓
대기 중인 승인 목록 (get_pending_approvals)
  ↓
직원 정보 확인
  ↓
승인/거부 결정:
  - 승인: approve_employee() → is_active = true
  - 거부: reject_employee() → rejection_reason 저장
```

### 4. 승인 후 프로세스
```
승인 대기 페이지 (5초마다 상태 확인)
  ↓
승인 확인
  ↓
사용자 대시보드로 자동 이동
```

## 📱 화면 구성

### 1. **직원 등록 페이지** (`employee_registration_page.dart`)
- **경로**: `/employee-registration`
- **기능**: 
  - 직원 정보 입력 폼
  - PIN 코드 설정 (4자리)
  - 디바이스 ID 자동 수집
  - Supabase Auth 계정 생성

### 2. **승인 대기 페이지** (`approval_pending_page.dart`)
- **경로**: `/approval-pending`
- **기능**:
  - 승인 대기 상태 표시
  - 5초마다 자동 상태 확인
  - 승인 시 자동 페이지 이동
  - 거부 시 사유 표시

### 3. **QR 스캐너 업데이트** (`qr_scanner_page.dart`)
- 상태별 분기 처리
- 거부/정지 메시지 다이얼로그
- 자동 페이지 리다이렉션

## 🗄️ 데이터베이스 스키마

### 1. **employees 테이블 추가 필드**
```sql
approval_status VARCHAR(50) DEFAULT 'PENDING'  -- PENDING, APPROVED, REJECTED, SUSPENDED
approved_by UUID                               -- 승인한 관리자 ID
approved_at TIMESTAMPTZ                        -- 승인 시간
rejection_reason TEXT                          -- 거부 사유
rejected_by UUID                               -- 거부한 관리자 ID
rejected_at TIMESTAMPTZ                        -- 거부 시간
```

### 2. **approval_requests 테이블**
```sql
id UUID PRIMARY KEY
employee_id UUID                -- 직원 ID
request_type VARCHAR(50)        -- REGISTRATION, UPDATE, REACTIVATION
request_data JSONB              -- 요청 데이터
status VARCHAR(50)              -- PENDING, APPROVED, REJECTED
requested_at TIMESTAMPTZ        -- 요청 시간
reviewed_by UUID                -- 검토한 관리자
reviewed_at TIMESTAMPTZ         -- 검토 시간
review_notes TEXT               -- 검토 노트
```

## 🔧 주요 함수

### 1. **check_employee_status**
직원의 등록 및 승인 상태를 확인합니다.
```sql
RETURNS:
- status: NOT_REGISTERED | PENDING_APPROVAL | APPROVED | REJECTED | SUSPENDED
- employee_id
- approval_status
- organization_name
- branch_name
- is_active
- rejection_reason
```

### 2. **register_employee_via_qr**
QR 스캔을 통한 직원 등록을 처리합니다.
- 새 직원 생성 또는 기존 직원 업데이트
- approval_status를 'PENDING'으로 설정
- approval_requests 테이블에 요청 생성

### 3. **approve_employee**
직원 등록을 승인합니다.
- approval_status를 'APPROVED'로 변경
- is_active를 true로 설정
- 승인 정보 기록

### 4. **reject_employee**
직원 등록을 거부합니다.
- approval_status를 'REJECTED'로 변경
- is_active를 false로 설정
- 거부 사유 저장

### 5. **get_pending_approvals**
승인 대기 중인 직원 목록을 조회합니다.

## 🔐 보안 정책 (RLS)

### approval_requests 테이블
- **관리자**: 조직 내 모든 승인 요청 조회 및 수정 가능
- **직원**: 본인의 승인 요청만 조회 가능

### employees 테이블
- **승인 전**: is_active = false, 시스템 접근 불가
- **승인 후**: is_active = true, 정상 접근 가능

## 📲 상태 코드 및 메시지

| 상태 | 코드 | 설명 | 사용자 액션 |
|------|------|------|------------|
| 미등록 | NOT_REGISTERED | 직원 정보 없음 | 등록 페이지로 이동 |
| 승인 대기 | PENDING_APPROVAL | 관리자 승인 대기 중 | 대기 페이지 표시 |
| 승인됨 | APPROVED | 정상 승인 완료 | 출퇴근 시스템 이용 가능 |
| 거부됨 | REJECTED | 관리자가 거부함 | 재등록 안내 |
| 정지됨 | SUSPENDED | 계정 정지 상태 | 관리자 문의 안내 |

## 🔄 Provider 상태 관리

### EmployeeRegistrationState
```dart
@freezed
class EmployeeRegistrationState {
  bool isLoading
  bool isRegistered
  String? employeeId
  String? organizationName
  String? branchName
  String? approvalStatus    // 승인 상태
  String? rejectionReason   // 거부 사유
  String? error
}
```

### 주요 메서드
- `checkRegistrationStatus()`: 등록 및 승인 상태 확인
- `checkApprovalStatus()`: 특정 직원의 승인 상태 확인
- `registerEmployee()`: 직원 등록 처리

## 🚀 배포 체크리스트

### 1. 데이터베이스 마이그레이션
```bash
# Supabase SQL Editor에서 실행
001_employees_table.sql
002_employee_approval_system.sql
```

### 2. 환경 설정
- Supabase 프로젝트 URL 및 API 키 설정
- RLS 정책 활성화 확인

### 3. 관리자 계정 설정
- Master Admin 계정 생성
- 승인 권한 부여

## 📋 테스트 시나리오

### 1. 신규 직원 등록
1. QR 스캔 → 등록 페이지
2. 정보 입력 및 제출
3. 승인 대기 페이지 확인

### 2. 관리자 승인
1. Master Admin 로그인
2. 대기 중인 승인 목록 확인
3. 승인/거부 처리

### 3. 승인 후 접근
1. 승인된 직원 QR 재스캔
2. 출퇴근 페이지로 자동 이동
3. 정상 서비스 이용

### 4. 거부된 직원
1. 거부된 직원 QR 재스캔
2. 거부 메시지 및 사유 확인
3. 재등록 프로세스 진행

## 🐛 문제 해결

### 1. 등록 후 승인 대기 페이지로 이동하지 않음
- 라우터 redirect 로직 확인
- `employeeRegistration`과 `approvalPending` 경로가 인증 없이 접근 가능한지 확인

### 2. 승인 상태가 업데이트되지 않음
- Supabase RLS 정책 확인
- `check_employee_status` 함수 권한 확인

### 3. QR 스캔 시 마스터 어드민 로그인으로 이동
- 라우터의 인증 체크 로직 확인
- 등록 관련 페이지들이 auth route로 설정되어 있는지 확인