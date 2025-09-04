# 📡 API Specification

## 🔐 Authentication

### Base URL
```
Production: https://api.dot-platform.com
Staging: https://staging-api.dot-platform.com
Development: http://localhost:3000
```

### Authentication Headers
```http
Authorization: Bearer {jwt_token}
X-API-Key: {api_key}
Content-Type: application/json
```

---

## 📍 Attendance Service APIs

### Check-In/Out

#### POST /api/attendance/check-in
QR 코드 스캔 출근 기록

**Request:**
```json
{
  "employeeId": "string",
  "qrCode": "string",
  "location": {
    "lat": 37.5665,
    "lng": 126.9780
  },
  "deviceId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recordId": "uuid",
    "checkInTime": "2025-01-01T09:00:00Z",
    "status": "checked_in"
  }
}
```

#### POST /api/attendance/check-out
퇴근 기록

**Request:**
```json
{
  "employeeId": "string",
  "recordId": "uuid",
  "location": {
    "lat": 37.5665,
    "lng": 126.9780
  }
}
```

### Attendance Records

#### GET /api/attendance/records
근태 기록 조회

**Query Parameters:**
- `employeeId` (optional): 특정 직원 필터
- `startDate`: 시작 날짜 (YYYY-MM-DD)
- `endDate`: 종료 날짜 (YYYY-MM-DD)
- `status`: pending | approved | rejected
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "employeeId": "string",
      "employeeName": "string",
      "date": "2025-01-01",
      "checkIn": "09:00:00",
      "checkOut": "18:00:00",
      "status": "approved",
      "totalHours": 9.0,
      "overtime": 0,
      "notes": "string"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Admin Management

#### PUT /api/attendance/records/{id}/approve
근태 기록 승인

**Request:**
```json
{
  "approverId": "string",
  "notes": "string (optional)"
}
```

#### PUT /api/attendance/records/{id}/reject
근태 기록 거부

**Request:**
```json
{
  "approverId": "string",
  "reason": "string"
}
```

---

## 🎯 Marketing Service APIs

### Creator Management

#### GET /api/marketing/creators
크리에이터 목록 조회

**Query Parameters:**
- `platform`: youtube | instagram | tiktok
- `category`: food | beauty | lifestyle
- `minFollowers`: 최소 팔로워 수
- `maxFollowers`: 최대 팔로워 수

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "platform": "youtube",
      "channelId": "string",
      "followers": 100000,
      "averageViews": 50000,
      "engagementRate": 5.2,
      "categories": ["food", "lifestyle"],
      "matchScore": 85
    }
  ]
}
```

### Campaign Management

#### POST /api/marketing/campaigns
캠페인 생성

**Request:**
```json
{
  "name": "string",
  "description": "string",
  "budget": 1000000,
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "targetPlatforms": ["youtube", "instagram"],
  "targetCategories": ["food"],
  "requirements": {
    "minFollowers": 10000,
    "minEngagementRate": 3.0
  }
}
```

#### GET /api/marketing/campaigns/{id}/matches
캠페인-크리에이터 매칭 결과

**Response:**
```json
{
  "campaignId": "uuid",
  "matches": [
    {
      "creatorId": "uuid",
      "matchScore": 92,
      "reasoning": [
        "High engagement in food category",
        "Target audience match 85%",
        "Budget range compatible"
      ],
      "estimatedReach": 150000,
      "estimatedCost": 500000
    }
  ]
}
```

---

## 📅 Scheduler Service APIs

### Schedule Management

#### GET /api/scheduler/schedules
스케줄 조회

**Query Parameters:**
- `employeeId`: 직원 ID
- `week`: 주차 (YYYY-WW)
- `status`: draft | published | archived

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "employeeId": "string",
      "week": "2025-01",
      "shifts": [
        {
          "date": "2025-01-01",
          "startTime": "09:00",
          "endTime": "18:00",
          "break": 60,
          "position": "manager"
        }
      ],
      "totalHours": 40,
      "status": "published"
    }
  ]
}
```

#### POST /api/scheduler/shifts
시프트 생성/수정

**Request:**
```json
{
  "employeeId": "string",
  "date": "2025-01-01",
  "startTime": "09:00",
  "endTime": "18:00",
  "position": "string",
  "notes": "string"
}
```

---

## 🔄 Realtime Events (WebSocket)

### Connection
```javascript
const ws = new WebSocket('wss://api.dot-platform.com/realtime');
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt_token'
}));
```

### Event Types

#### attendance.update
```json
{
  "type": "attendance.update",
  "data": {
    "recordId": "uuid",
    "employeeId": "string",
    "action": "check_in | check_out | approved | rejected",
    "timestamp": "2025-01-01T09:00:00Z"
  }
}
```

#### campaign.match
```json
{
  "type": "campaign.match",
  "data": {
    "campaignId": "uuid",
    "matchCount": 15,
    "topMatch": {
      "creatorId": "uuid",
      "score": 95
    }
  }
}
```

---

## ⚠️ Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {
      "field": "additional info"
    }
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED`: 인증 필요
- `AUTH_INVALID`: 유효하지 않은 인증
- `PERMISSION_DENIED`: 권한 없음
- `NOT_FOUND`: 리소스를 찾을 수 없음
- `VALIDATION_ERROR`: 입력값 검증 실패
- `RATE_LIMIT`: 요청 제한 초과
- `SERVER_ERROR`: 서버 내부 오류

---

## 📊 Rate Limiting

- **Default**: 100 requests/minute per API key
- **Authenticated**: 1000 requests/minute per user
- **Bulk Operations**: 10 requests/minute

Headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 🔍 Pagination

모든 목록 API는 표준 페이지네이션을 지원합니다:

```http
GET /api/resource?page=2&limit=20&sort=created_at:desc
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 200,
    "pages": 10,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---
*이 문서는 Context Manager에 의해 자동으로 관리됩니다.*