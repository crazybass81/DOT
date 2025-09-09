# DOT Attendance Service: API 참조 문서

## 개요

이 문서는 DOT 출석 서비스의 확정된 ID-ROLE-PAPER 기반 API 시스템에 대한 상세한 참조 가이드를 제공합니다.

## 인증 및 권한

### 헤더 요구사항
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Business-Registration-ID: <BUSINESS_ID> (선택적)
```

### ROLE 기반 권한 레벨
- **SEEKER**: 구직 관련 기능만 접근
- **WORKER**: 자신의 출근 데이터 조회/수정
- **MANAGER**: 팀 관리 기능 (Worker 권한 포함)
- **OWNER**: 사업장 전체 관리
- **FRANCHISEE**: 가맹점 운영 관리
- **FRANCHISOR**: 가맹본부 및 전체 네트워크 관리
- **SUPERVISOR**: 가맹점 감독 및 지원

## 통합 신원 관리 API

### 신원 생성
```http
POST /api/v2/identities
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "full_name": "홍길동",
  "phone": "010-1234-5678",
  "birth_date": "1990-01-01",
  "id_type": "personal",
  "id_number": "123456-1234567",
  "business_verification_data": {
    "business_number": "123-45-67890",
    "business_name": "테스트 상점"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "identity": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "홍길동",
    "id_type": "personal",
    "business_verification_status": "pending",
    "is_verified": false,
    "is_active": true,
    "created_at": "2025-09-07T10:30:00Z"
  }
}
```

**Error Responses:**
```json
// 409 Conflict - 이미 존재하는 이메일
{
  "success": false,
  "error": "Email already exists",
  "code": "DUPLICATE_EMAIL"
}

// 400 Bad Request - 잘못된 입력
{
  "success": false,
  "error": "Email and full name are required",
  "code": "INVALID_INPUT"
}
```

### 신원 조회
```http
GET /api/v2/identities/{id}
GET /api/v2/identities?email={email}
GET /api/v2/identities?auth_user_id={auth_user_id}
```

**Response (200 OK):**
```json
{
  "success": true,
  "identity": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "홍길동",
    "id_type": "personal",
    "business_verification_status": "verified",
    "is_verified": true,
    "is_active": true
  }
}
```

### 검증 상태 업데이트
```http
PUT /api/v2/identities/{id}/verification
```
**Required Role:** ADMIN 이상

**Request Body:**
```json
{
  "status": "verified",
  "verification_data": {
    "verified_by": "admin_user_id",
    "verification_method": "document_review",
    "notes": "모든 서류 확인 완료"
  }
}
```

## 역할 관리 API

### 사용자 역할 조회
```http
GET /api/user-roles/{user_id}
GET /api/user-roles?organization_id={org_id}
```
**Required Role:** ADMIN 이상 (또는 본인)

**Response (200 OK):**
```json
{
  "success": true,
  "roles": [
    {
      "id": "role-123",
      "employeeId": "550e8400-e29b-41d4-a716-446655440000",
      "organizationId": "org-456", 
      "roleType": "ADMIN",
      "isActive": true,
      "grantedAt": "2025-09-01T09:00:00Z",
      "grantedBy": "manager-789",
      "organizationName": "테스트 매장"
    }
  ]
}
```

### 역할 생성
```http
POST /api/user-roles
```
**Required Role:** MANAGER 이상

**Request Body:**
```json
{
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "org-456",
  "roleType": "ADMIN"
}
```

### 역할 수정
```http
PUT /api/user-roles/{role_id}
```
**Required Role:** MANAGER 이상

**Request Body:**
```json
{
  "isActive": false
}
```

### 대량 역할 변경
```http
POST /api/master-admin/users/bulk-role-change
```
**Required Role:** Master Admin

**Request Body:**
```json
{
  "changes": [
    {
      "userId": "user-1",
      "organizationId": "org-1",
      "oldRole": "WORKER",
      "newRole": "ADMIN",
      "reason": "승진으로 인한 권한 상승"
    }
  ]
}
```

## 계약 관리 API

### 계약 생성
```http
POST /api/contracts
```
**Required Role:** ADMIN 이상

**Request Body:**
```json
{
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "org-456",
  "contractType": "PART_TIME",
  "startDate": "2025-09-01",
  "endDate": "2025-12-31",
  "wageAmount": 15000,
  "wageType": "HOURLY",
  "isMinor": false,
  "terms": {
    "workingHours": "09:00-18:00",
    "workingDays": ["MON", "TUE", "WED", "THU", "FRI"],
    "overtime_rate": 1.5
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "contract": {
    "id": "contract-789",
    "employeeId": "550e8400-e29b-41d4-a716-446655440000",
    "organizationId": "org-456",
    "contractType": "PART_TIME",
    "status": "ACTIVE",
    "startDate": "2025-09-01",
    "endDate": "2025-12-31",
    "wageAmount": 15000,
    "wageType": "HOURLY",
    "isActive": true,
    "createdAt": "2025-09-07T10:30:00Z"
  }
}
```

### 계약 상태 변경
```http
PUT /api/contracts/{contract_id}/status
```
**Required Role:** MANAGER 이상

**Request Body:**
```json
{
  "status": "TERMINATED",
  "reason": "계약 만료",
  "effectiveDate": "2025-09-30"
}
```

## 출근 관리 API

### 출근 기록 조회
```http
GET /api/attendance?user_id={user_id}&date_from={date}&date_to={date}
GET /api/attendance/{attendance_id}
```
**Required Role:** WORKER (본인), ADMIN 이상 (팀원), MANAGER 이상 (조직원)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "att-123",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "organizationId": "org-456",
      "checkInTime": "2025-09-07T09:00:00Z",
      "checkOutTime": "2025-09-07T18:00:00Z",
      "workingHours": 8,
      "status": "PRESENT",
      "verificationMethod": "QR_CODE",
      "location": {
        "latitude": 37.5665,
        "longitude": 126.9780
      }
    }
  ]
}
```

### 출근 처리
```http
POST /api/attendance/checkin
```
**Required Role:** WORKER 이상

**Request Body:**
```json
{
  "organizationId": "org-456",
  "verificationMethod": "QR_CODE",
  "qrData": "qr-code-data",
  "location": {
    "latitude": 37.5665,
    "longitude": 126.9780,
    "accuracy": 10
  },
  "deviceFingerprint": "device-hash-123"
}
```

### 퇴근 처리
```http
POST /api/attendance/checkout
```
**Required Role:** WORKER 이상

**Request Body:**
```json
{
  "attendanceId": "att-123",
  "location": {
    "latitude": 37.5665,
    "longitude": 126.9780,
    "accuracy": 15
  }
}
```

### 수동 출근 등록
```http
POST /api/admin/manual-attendance
```
**Required Role:** ADMIN 이상

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "org-456",
  "date": "2025-09-07",
  "checkInTime": "09:00",
  "checkOutTime": "18:00",
  "reason": "QR 스캐너 오류로 인한 수동 등록",
  "approvedBy": "admin-789"
}
```

## 조직 관리 API

### 조직 목록 조회
```http
GET /api/organizations
GET /api/organizations?type={PERSONAL|CORP|FRANCHISE}
```
**Required Role:** ADMIN 이상 (본인 조직), Master Admin (전체)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "org-456",
      "name": "테스트 매장",
      "code": "TEST001",
      "bizType": "PERSONAL",
      "bizNumber": "123-45-67890",
      "isActive": true,
      "memberCount": 15,
      "createdAt": "2025-08-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

### 조직 생성
```http
POST /api/organizations
```
**Required Role:** 인증된 사업자 신원

**Request Body:**
```json
{
  "name": "새 매장",
  "code": "NEW001",
  "bizType": "PERSONAL",
  "bizNumber": "987-65-43210",
  "address": "서울시 강남구 테헤란로 123",
  "phone": "02-1234-5678"
}
```

### 조직 상태 변경
```http
PUT /api/master-admin/organizations/{org_id}/status
```
**Required Role:** Master Admin

**Request Body:**
```json
{
  "isActive": false,
  "reason": "사업자 등록 취소",
  "effectiveDate": "2025-09-30"
}
```

## 마스터 관리자 API

### 사용자 목록 조회
```http
GET /api/master-admin/users
GET /api/master-admin/users?role={WORKER|ADMIN|MANAGER|FRANCHISE}
GET /api/master-admin/users?organization_id={org_id}
GET /api/master-admin/users?search={keyword}
```
**Required Role:** Master Admin

**Query Parameters:**
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지 크기 (기본값: 20)
- `sort`: 정렬 기준 (name, email, created_at)
- `order`: 정렬 순서 (asc, desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "full_name": "홍길동",
      "roles": [
        {
          "roleType": "ADMIN",
          "organizationId": "org-456",
          "organizationName": "테스트 매장"
        }
      ],
      "isActive": true,
      "lastLoginAt": "2025-09-07T08:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

### 사용자 상세 조회
```http
GET /api/master-admin/users/{user_id}
```
**Required Role:** Master Admin

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "홍길동",
    "phone": "010-1234-5678",
    "roles": [
      {
        "id": "role-123",
        "roleType": "ADMIN",
        "organizationId": "org-456",
        "organizationName": "테스트 매장",
        "isActive": true,
        "grantedAt": "2025-09-01T09:00:00Z"
      }
    ],
    "contracts": [
      {
        "id": "contract-789",
        "contractType": "EMPLOYMENT",
        "status": "ACTIVE",
        "organizationName": "테스트 매장"
      }
    ],
    "statistics": {
      "totalWorkDays": 45,
      "averageWorkingHours": 8.2,
      "attendanceRate": 0.96
    }
  }
}
```

### 사용자 활동 통계
```http
GET /api/master-admin/users/{user_id}/activity-stats
```
**Required Role:** Master Admin

**Query Parameters:**
- `period`: 기간 (7d, 30d, 90d, 1y)
- `metric`: 메트릭 유형 (attendance, login, actions)

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "period": "30d",
    "attendance": {
      "totalDays": 22,
      "presentDays": 21,
      "absentDays": 1,
      "lateCount": 3,
      "earlyLeaveCount": 1,
      "averageWorkingHours": 8.1
    },
    "login": {
      "totalLogins": 45,
      "uniqueDays": 20,
      "averageSessionDuration": 380
    },
    "actions": [
      {
        "action": "attendance_checkin",
        "count": 21
      },
      {
        "action": "attendance_checkout", 
        "count": 21
      }
    ]
  }
}
```

## 보안 관련 API

### 권한 검증
```http
POST /api/security/verify-permission
```
**Request Body:**
```json
{
  "resource": "attendance_management",
  "action": "read",
  "organizationId": "org-456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "granted": true,
  "userRoles": ["ADMIN"],
  "reason": "Permission granted"
}
```

### 감사 로그 조회
```http
GET /api/security/audit-logs
GET /api/security/audit-logs?user_id={user_id}
GET /api/security/audit-logs?organization_id={org_id}
GET /api/security/audit-logs?action={action}
```
**Required Role:** Master Admin

**Response (200 OK):**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log-123",
      "timestamp": "2025-09-07T10:30:00Z",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "organizationId": "org-456",
      "action": "ATTENDANCE_CHECKIN",
      "resource": "attendance_record",
      "resourceId": "att-123",
      "result": "SUCCESS",
      "ipAddress": "192.168.1.100",
      "userAgent": "DOT Mobile App v1.0"
    }
  ]
}
```

### 보안 메트릭 조회
```http
GET /api/security/metrics
```
**Required Role:** Master Admin

**Response (200 OK):**
```json
{
  "success": true,
  "metrics": {
    "authenticationFailures": {
      "last24Hours": 15,
      "last7Days": 89
    },
    "suspiciousActivities": {
      "sqlInjectionAttempts": 3,
      "bruteForceAttempts": 2,
      "unauthorizedAccess": 1
    },
    "systemHealth": {
      "identityService": "healthy",
      "roleResolution": "healthy",
      "contractValidation": "healthy"
    }
  }
}
```

## 에러 코드 참조

### HTTP 상태 코드
- `200 OK`: 요청 성공
- `201 Created`: 리소스 생성 성공
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 권한 부족
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 충돌 발생
- `429 Too Many Requests`: 요청 한도 초과
- `500 Internal Server Error`: 서버 오류

### 애플리케이션 에러 코드
- `AUTHENTICATION_REQUIRED`: 인증 필요
- `INVALID_TOKEN`: 유효하지 않은 토큰
- `INSUFFICIENT_PERMISSIONS`: 권한 부족
- `USER_NOT_FOUND`: 사용자 없음
- `DUPLICATE_EMAIL`: 중복 이메일
- `INVALID_INPUT`: 잘못된 입력
- `CONTRACT_EXPIRED`: 계약 만료
- `ORGANIZATION_INACTIVE`: 비활성 조직
- `RATE_LIMIT_EXCEEDED`: 요청 한도 초과
- `SQL_INJECTION_DETECTED`: SQL 인젝션 탐지

## 개발자 도구

### API 테스트 환경
```bash
# 개발 환경
BASE_URL=http://localhost:3002/api

# 스테이징 환경  
BASE_URL=https://staging-attendance.dot.co.kr/api

# 프로덕션 환경
BASE_URL=https://attendance.dot.co.kr/api
```

### Postman 컬렉션
API 테스트를 위한 Postman 컬렉션이 제공됩니다:
- [DOT Attendance API Collection](./postman/dot-attendance-api.json)

### SDK 및 클라이언트 라이브러리
```typescript
// JavaScript/TypeScript
npm install @dot/attendance-client

// 사용 예시
import { AttendanceClient } from '@dot/attendance-client';

const client = new AttendanceClient({
  baseUrl: 'https://attendance.dot.co.kr/api',
  apiKey: 'your-api-key'
});

const attendance = await client.attendance.checkin({
  organizationId: 'org-456',
  verificationMethod: 'QR_CODE'
});
```

---

이 API 참조 문서는 지속적으로 업데이트되며, 최신 버전은 항상 개발자 포털에서 확인할 수 있습니다.