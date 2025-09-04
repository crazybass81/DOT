# 📡 Attendance Service API Documentation

## Base Configuration

### Service URL
```
Production: https://api.dot-platform.com/attendance
Staging: https://staging-api.dot-platform.com/attendance
Development: http://localhost:3000/api/attendance
```

### Authentication
```http
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json
```

## 🔐 Authentication Endpoints

### POST /api/auth/login
직원 로그인

**Request:**
```json
{
  "email": "employee@company.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "employee@company.com",
    "role": "employee",
    "employeeId": "EMP001"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}
```

## 📍 Check-In/Out Endpoints

### POST /api/attendance/check-in
QR 코드 스캔 출근

**Request:**
```json
{
  "qrCode": "STORE_QR_2025_01",
  "location": {
    "latitude": 37.5665,
    "longitude": 126.9780,
    "accuracy": 10
  },
  "deviceInfo": {
    "deviceId": "device_uuid",
    "platform": "ios|android",
    "appVersion": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "record": {
    "id": "uuid",
    "employeeId": "EMP001",
    "checkInTime": "2025-01-20T09:00:00Z",
    "location": "강남점",
    "status": "checked_in",
    "qrValid": true
  }
}
```

### POST /api/attendance/check-out
퇴근 처리

**Request:**
```json
{
  "recordId": "uuid",
  "location": {
    "latitude": 37.5665,
    "longitude": 126.9780
  }
}
```

**Response:**
```json
{
  "success": true,
  "record": {
    "id": "uuid",
    "checkOutTime": "2025-01-20T18:00:00Z",
    "totalHours": 9.0,
    "overtime": 0,
    "status": "completed"
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
| ATT_001 | Invalid QR Code | QR 코드가 만료되었거나 유효하지 않음 |
| ATT_002 | Location Mismatch | 위치 정보가 허용 범위를 벗어남 |
| ATT_003 | Already Checked In | 이미 출근 처리됨 |
| ATT_004 | No Check-In Record | 출근 기록 없이 퇴근 시도 |
| ATT_005 | Device Not Registered | 등록되지 않은 디바이스 |
| ATT_006 | Permission Denied | 권한 없음 |

## 📊 Rate Limiting

- **일반 API**: 분당 60 요청
- **관리자 API**: 분당 120 요청
- **WebSocket**: 연결당 초당 10 메시지

---
*이 문서는 Context Manager에 의해 자동으로 관리됩니다.*