# 📡 Attendance Service API Documentation

## Base Configuration

### Service URL
```
Production: https://{project_id}.supabase.co/functions/v1/{function_name}
Staging: https://{staging_project_id}.supabase.co/functions/v1/{function_name}
Development: http://localhost:54321/functions/v1/{function_name}
```

### Authentication
```http
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json
X-Organization-ID: {organization_id} (for non-master admins)
```

### Available Edge Functions
- `/auth-signup` - User registration with role assignment
- `/attendance-check` - Check-in/out operations
- `/attendance-report` - Generate attendance reports
- `/permission-check` - Verify user permissions
- `/shift-management` - Manage employee shifts

## 🔐 Authentication Endpoints

### POST /functions/v1/auth-signup
사용자 등록 (권한 기반)

**Required Role:** `admin`, `manager` (for creating lower roles)

**Request:**
```json
{
  "email": "employee@company.com",
  "password": "secure_password",
  "role": "worker|manager|admin",
  "organizationId": "org_uuid",
  "employeeData": {
    "firstName": "김",
    "lastName": "직원",
    "employeeCode": "EMP001",
    "department": "주방",
    "position": "요리사",
    "hireDate": "2025-01-20",
    "phone": "010-1234-5678"
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "employee@company.com",
    "role": "worker",
    "organization_id": "org_uuid"
  },
  "employee": {
    "id": "emp_uuid",
    "employee_code": "EMP001",
    "first_name": "김",
    "last_name": "직원"
  },
  "message": "User created successfully"
}
```

## 📍 Check-In/Out Endpoints

### POST /functions/v1/attendance-check
출퇴근 처리 (위치 기반 검증 포함)

**Required Role:** `worker` or higher

**Request:**
```json
{
  "type": "check_in|check_out",
  "locationId": "location_uuid",  // Optional: specific location
  "latitude": 37.5665,            // Optional: for geo-validation
  "longitude": 126.9780,           // Optional: for geo-validation
  "notes": "조기 출근"             // Optional: notes
}
```

**Success Response (Check-in):**
```json
{
  "success": true,
  "attendance": {
    "id": "att_uuid",
    "employee_id": "emp_uuid",
    "date": "2025-01-20",
    "check_in_time": "2025-01-20T09:00:00Z",
    "check_in_location_id": "loc_uuid",
    "status": "present",
    "late_minutes": 0
  },
  "message": "Checked in successfully"
}
```

**Success Response (Check-out):**
```json
{
  "success": true,
  "attendance": {
    "id": "att_uuid",
    "check_out_time": "2025-01-20T18:30:00Z",
    "check_out_location_id": "loc_uuid",
    "overtime_minutes": 30
  },
  "message": "Checked out successfully (30 minutes overtime)"
}
```

**Error Response (Location Validation Failed):**
```json
{
  "success": false,
  "error": "You are 150m away from 강남점. Maximum allowed distance is 100m."
}
```

## 📊 Report Generation

### POST /functions/v1/attendance-report
근태 보고서 생성 (권한 기반 필터링)

**Required Role:** `manager` or higher

**Request:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "employeeIds": ["emp_uuid1", "emp_uuid2"],  // Optional
  "departmentFilter": "주방",                // Optional
  "reportType": "summary|detailed|export"
}
```

**Response (Summary):**
```json
{
  "success": true,
  "report": {
    "type": "summary",
    "period": {
      "startDate": "2025-01-01",
      "endDate": "2025-01-31"
    },
    "statistics": {
      "totalDays": 620,
      "totalEmployees": 25,
      "attendanceByStatus": {
        "present": 500,
        "late": 80,
        "absent": 40
      },
      "totalLateMinutes": 450,
      "totalOvertimeMinutes": 1200,
      "averageAttendanceRate": 93.5
    }
  }
}
```

## 📊 Records Management

### GET /api/attendance/records
근태 기록 조회

**Query Parameters:**
```
?employeeId=EMP001
&startDate=2025-01-01
&endDate=2025-01-31
&status=pending|approved|rejected
&page=1
&limit=20
```

**Response:**
```json
{
  "records": [
    {
      "id": "uuid",
      "date": "2025-01-20",
      "employee": {
        "id": "EMP001",
        "name": "김직원",
        "department": "주방"
      },
      "checkIn": "09:00:00",
      "checkOut": "18:00:00",
      "totalHours": 9.0,
      "overtime": 0,
      "breaks": [
        {
          "start": "12:00:00",
          "end": "13:00:00",
          "duration": 60
        }
      ],
      "status": "approved",
      "approvedBy": "MGR001",
      "notes": ""
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### PUT /api/attendance/records/{id}
근태 기록 수정 (관리자 전용)

**Request:**
```json
{
  "checkIn": "09:00:00",
  "checkOut": "18:30:00",
  "notes": "30분 연장 근무 승인"
}
```

## 👨‍💼 Admin Endpoints

### POST /api/attendance/admin/approve
근태 승인

**Request:**
```json
{
  "recordIds": ["uuid1", "uuid2"],
  "notes": "승인 완료"
}
```

### POST /api/attendance/admin/reject
근태 거부

**Request:**
```json
{
  "recordIds": ["uuid1"],
  "reason": "위치 정보 불일치"
}
```

### GET /api/attendance/admin/dashboard
실시간 대시보드 데이터

**Response:**
```json
{
  "summary": {
    "totalEmployees": 25,
    "checkedIn": 20,
    "onBreak": 3,
    "checkedOut": 2,
    "absent": 3
  },
  "activeEmployees": [
    {
      "id": "EMP001",
      "name": "김직원",
      "checkInTime": "09:00:00",
      "status": "working",
      "currentLocation": "주방"
    }
  ],
  "pendingApprovals": 5,
  "alerts": [
    {
      "type": "late_checkin",
      "employeeId": "EMP005",
      "message": "15분 지각"
    }
  ]
}
```

## 📱 Mobile Specific Endpoints

### GET /api/attendance/mobile/qr
QR 코드 정보 조회

**Response:**
```json
{
  "qrCode": "STORE_QR_2025_01_20",
  "validUntil": "2025-01-20T23:59:59Z",
  "storeInfo": {
    "name": "강남점",
    "address": "서울시 강남구",
    "coordinates": {
      "latitude": 37.5665,
      "longitude": 126.9780
    }
  }
}
```

### POST /api/attendance/mobile/device
디바이스 등록

**Request:**
```json
{
  "deviceId": "unique_device_id",
  "deviceType": "ios|android",
  "pushToken": "fcm_or_apns_token"
}
```

## 🔄 WebSocket Events

### Connection
```javascript
const ws = new WebSocket('wss://api.dot-platform.com/attendance/realtime');

ws.send(JSON.stringify({
  type: 'auth',
  token: 'supabase_jwt_token'
}));
```

### Event Types

#### employee.checkin
```json
{
  "event": "employee.checkin",
  "data": {
    "employeeId": "EMP001",
    "name": "김직원",
    "time": "2025-01-20T09:00:00Z"
  }
}
```

#### employee.checkout
```json
{
  "event": "employee.checkout",
  "data": {
    "employeeId": "EMP001",
    "name": "김직원",
    "time": "2025-01-20T18:00:00Z",
    "totalHours": 9.0
  }
}
```

#### approval.required
```json
{
  "event": "approval.required",
  "data": {
    "recordId": "uuid",
    "employeeId": "EMP001",
    "type": "overtime",
    "details": "2시간 초과 근무"
  }
}
```

## ⚠️ Error Codes

| Code | Message | Description |
|------|---------|-------------|
| AUTH_001 | Not Authenticated | 인증 토큰이 없거나 유효하지 않음 |
| AUTH_002 | Insufficient Permissions | 해당 작업을 수행할 권한이 없음 |
| AUTH_003 | Organization Mismatch | 다른 조직의 데이터에 접근 시도 |
| ATT_001 | Already Checked In | 이미 출근 처리됨 |
| ATT_002 | No Check-In Record | 출근 기록 없이 퇴근 시도 |
| ATT_003 | Location Out of Range | 위치 정보가 허용 범위를 벗어남 |
| ATT_004 | Invalid Shift | 배정된 시프트가 없거나 유효하지 않음 |
| EMP_001 | Employee Not Found | 직원 레코드를 찾을 수 없음 |
| EMP_002 | Duplicate Employee Code | 중복된 직원 코드 |
| PERM_001 | Role Cannot Manage Target | 상위 권한 역할을 관리할 수 없음 |

## 📊 Rate Limiting

- **일반 API**: 분당 60 요청
- **관리자 API**: 분당 120 요청
- **WebSocket**: 연결당 초당 10 메시지

---
*이 문서는 Context Manager에 의해 자동으로 관리됩니다.*