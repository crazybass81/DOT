# DOT Attendance Service API Documentation

## Overview

The DOT Attendance Service provides a comprehensive REST API for enterprise attendance management with the ID-ROLE-PAPER architecture, supporting Personal and Corporate IDs with role-based access control through business registration papers, biometric verification, and real-time capabilities.

## Base URL

```
https://your-project.supabase.co/functions/v1/
```

## Authentication

All API endpoints require authentication via JWT tokens. Include the token in the `Authorization` header:

```http
Authorization: Bearer <jwt-token>
```

## Rate Limiting

API requests are rate-limited based on user tier:
- **Anonymous**: 10 requests per 15 minutes
- **Authenticated**: 100 requests per 15 minutes  
- **Premium**: 1000 requests per 15 minutes

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid employee ID format",
    "details": {
      "field": "employeeId",
      "constraint": "Must be a valid UUID"
    },
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req_123456789"
  }
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `AUTHENTICATION_REQUIRED` | Missing or invalid auth token | 401 |
| `PERMISSION_DENIED` | Insufficient permissions | 403 |
| `RESOURCE_NOT_FOUND` | Requested resource not found | 404 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

## Endpoints

### 1. Attendance Management

#### Check In/Out
Record employee attendance with location and biometric verification.

```http
POST /attendance-check-v2
```

**Request Body:**
```json
{
  "action": "check_in" | "check_out",
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 10,
    "locationId": "550e8400-e29b-41d4-a716-446655440001"
  },
  "verificationMethod": {
    "type": "biometric" | "pin" | "face_id" | "fingerprint",
    "token": "biometric-token-or-pin",
    "deviceId": "device-unique-identifier",
    "metadata": {
      "biometricType": "face_id",
      "deviceInfo": "iPhone 15 Pro"
    }
  },
  "shift": {
    "shiftId": "550e8400-e29b-41d4-a716-446655440002",
    "expectedStart": "09:00:00",
    "expectedEnd": "17:00:00"
  },
  "notes": "Working from client site today"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "attendanceId": "550e8400-e29b-41d4-a716-446655440003",
    "employeeId": "550e8400-e29b-41d4-a716-446655440000",
    "action": "check_in",
    "timestamp": "2024-01-01T09:05:30.000Z",
    "location": {
      "verified": true,
      "distance": 5.2,
      "address": "123 Main St, San Francisco, CA"
    },
    "verification": {
      "method": "face_id",
      "status": "verified",
      "confidence": 0.98
    },
    "shift": {
      "status": "on_time" | "early" | "late",
      "variance": 5
    },
    "metadata": {
      "requestId": "req_123456789",
      "processingTime": 245
    }
  }
}
```

#### Get Attendance Records

```http
GET /attendance/records?employeeId={id}&startDate={date}&endDate={date}&limit={n}&offset={n}
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `employeeId` | UUID | Yes | Employee identifier |
| `startDate` | ISO Date | No | Start date filter (YYYY-MM-DD) |
| `endDate` | ISO Date | No | End date filter (YYYY-MM-DD) |
| `limit` | Integer | No | Max records (default: 50, max: 200) |
| `offset` | Integer | No | Pagination offset (default: 0) |
| `status` | String | No | Filter by status (present/absent/late) |

**Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "date": "2024-01-01",
      "checkInTime": "2024-01-01T09:05:30.000Z",
      "checkOutTime": "2024-01-01T17:02:15.000Z",
      "totalHours": 7.95,
      "overtimeMinutes": 2,
      "status": "present",
      "location": {
        "checkIn": "Main Office",
        "checkOut": "Main Office"
      },
      "shift": {
        "name": "Day Shift",
        "expectedHours": 8.0
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasNext": true
  }
}
```

### 2. Employee Management

#### Get Employee Details

```http
GET /employees/{employeeId}
```

**Response (200):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@company.com",
    "employeeNumber": "EMP001",
    "department": "Engineering",
    "role": "Senior Developer",
    "manager": {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "name": "Jane Smith"
    },
    "schedule": {
      "timezone": "America/New_York",
      "workDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "defaultShift": {
        "start": "09:00:00",
        "end": "17:00:00"
      }
    },
    "permissions": {
      "canViewReports": true,
      "canApproveLeave": false,
      "locations": ["loc_main_office", "loc_remote"]
    }
  }
}
```

#### Update Employee Permissions

```http
PATCH /employees/{employeeId}/permissions
```

**Request Body:**
```json
{
  "permissions": {
    "canViewReports": true,
    "canApproveLeave": true,
    "locations": ["loc_main_office", "loc_branch_a"],
    "maxOvertimeHours": 10
  }
}
```

### 3. Reporting & Analytics

#### Generate Attendance Report

```http
POST /reports/attendance
```

**Request Body:**
```json
{
  "reportType": "daily" | "weekly" | "monthly" | "custom",
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "filters": {
    "departments": ["Engineering", "Marketing"],
    "employees": ["550e8400-e29b-41d4-a716-446655440000"],
    "statuses": ["present", "late"],
    "locations": ["loc_main_office"]
  },
  "metrics": [
    "attendance_rate",
    "punctuality_rate", 
    "overtime_hours",
    "total_hours_worked"
  ],
  "format": "json" | "csv" | "pdf",
  "groupBy": "employee" | "department" | "date"
}
```

**Response (200):**
```json
{
  "reportId": "rpt_123456789",
  "status": "completed" | "processing" | "failed",
  "downloadUrl": "https://storage.../report.pdf",
  "expiresAt": "2024-01-08T12:00:00.000Z",
  "summary": {
    "totalEmployees": 25,
    "totalWorkingDays": 22,
    "averageAttendanceRate": 94.5,
    "averagePunctualityRate": 87.2,
    "totalOvertimeHours": 145.5
  },
  "data": [
    {
      "employee": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "department": "Engineering"
      },
      "metrics": {
        "daysPresent": 20,
        "daysLate": 2,
        "attendanceRate": 90.9,
        "punctualityRate": 81.8,
        "totalHours": 176.5,
        "overtimeHours": 8.5,
        "averageCheckInTime": "09:07:30",
        "averageCheckOutTime": "17:03:15"
      }
    }
  ]
}
```

### 4. Leave Management

#### Request Leave

```http
POST /leave/request
```

**Request Body:**
```json
{
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "annual" | "sick" | "personal" | "maternity" | "emergency",
  "startDate": "2024-02-15",
  "endDate": "2024-02-16",
  "halfDay": false,
  "reason": "Family vacation",
  "documents": [
    {
      "type": "medical_certificate",
      "url": "https://storage.../doc.pdf"
    }
  ],
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "+1-555-0123"
  }
}
```

**Response (201):**
```json
{
  "data": {
    "requestId": "lr_123456789",
    "status": "pending",
    "approvalWorkflow": [
      {
        "step": 1,
        "approver": "Manager",
        "status": "pending",
        "dueDate": "2024-02-10T17:00:00.000Z"
      }
    ],
    "balanceImpact": {
      "currentBalance": 15,
      "requestedDays": 2,
      "remainingBalance": 13
    }
  }
}
```

### 5. Real-time Features

#### WebSocket Connection

Connect to real-time updates:

```javascript
const supabase = createClient(url, key)
const channel = supabase
  .channel('attendance-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'attendance',
    filter: 'organization_id=eq.your-org-id'
  }, (payload) => {
    console.log('Attendance update:', payload)
  })
  .subscribe()
```

#### Server-Sent Events

```http
GET /events/attendance?employeeId={id}
```

**Headers:**
```http
Accept: text/event-stream
Cache-Control: no-cache
```

**Response:**
```
event: attendance_check
data: {"employeeId": "...", "action": "check_in", "timestamp": "..."}

event: leave_approved  
data: {"requestId": "...", "employeeId": "...", "approver": "..."}
```

### 6. Configuration Management

#### Get Organization Settings

```http
GET /config/organization/{organizationId}
```

**Response (200):**
```json
{
  "data": {
    "organizationId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "settings": {
      "workingHours": {
        "standardMinutes": 480,
        "graceMinutes": 15,
        "overtimeThreshold": 480
      },
      "attendance": {
        "requireLocation": true,
        "locationRadius": 100,
        "allowRemoteWork": true,
        "biometricRequired": false
      },
      "notifications": {
        "lateCheckIn": true,
        "missedCheckOut": true,
        "overtimeAlert": true,
        "approvalReminders": true
      },
      "integrations": {
        "payroll": {
          "enabled": true,
          "provider": "ADP",
          "syncFrequency": "daily"
        },
        "calendar": {
          "enabled": true,
          "provider": "Google Workspace"
        }
      }
    }
  }
}
```

## Webhooks

Configure webhooks to receive real-time notifications about attendance events.

### Webhook Events

| Event | Description |
|-------|-------------|
| `attendance.checked_in` | Employee checked in |
| `attendance.checked_out` | Employee checked out |
| `attendance.late_arrival` | Employee arrived late |
| `attendance.missed_checkout` | Employee forgot to check out |
| `leave.requested` | Leave request submitted |
| `leave.approved` | Leave request approved |
| `leave.denied` | Leave request denied |
| `overtime.threshold_reached` | Employee exceeded overtime threshold |

### Webhook Payload

```json
{
  "event": "attendance.checked_in",
  "timestamp": "2024-01-01T09:05:30.000Z",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "employeeId": "550e8400-e29b-41d4-a716-446655440000",
    "attendanceId": "550e8400-e29b-41d4-a716-446655440003",
    "checkInTime": "2024-01-01T09:05:30.000Z",
    "location": "Main Office",
    "status": "on_time"
  },
  "metadata": {
    "requestId": "req_123456789",
    "version": "v2"
  }
}
```

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @dot/attendance-sdk
```

```javascript
import { AttendanceClient } from '@dot/attendance-sdk'

const client = new AttendanceClient({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key',
  organizationId: 'your-org-id'
})

// Check in
const result = await client.attendance.checkIn({
  employeeId: 'employee-uuid',
  location: { latitude: 37.7749, longitude: -122.4194 },
  verificationMethod: { type: 'face_id', token: 'biometric-token' }
})
```

### Python

```bash
pip install dot-attendance-sdk
```

```python
from dot_attendance import AttendanceClient

client = AttendanceClient(
    supabase_url="https://your-project.supabase.co",
    supabase_key="your-anon-key",
    organization_id="your-org-id"
)

# Check in
result = client.attendance.check_in(
    employee_id="employee-uuid",
    location={"latitude": 37.7749, "longitude": -122.4194},
    verification_method={"type": "face_id", "token": "biometric-token"}
)
```

## Testing

### Test Environment

Use the following endpoints for testing:

```
Base URL: https://your-project-test.supabase.co/functions/v1/
```

### Test Data

Sample test employee IDs:
- `test-employee-001`: Standard employee
- `test-employee-002`: Manager with approval permissions  
- `test-employee-003`: HR admin with full access

### Postman Collection

Download our [Postman collection](./postman/DOT-Attendance-API.json) for easy API testing.

## Support

- **Documentation**: [https://docs.dot-attendance.com](https://docs.dot-attendance.com)
- **Support Email**: support@dot-attendance.com
- **Status Page**: [https://status.dot-attendance.com](https://status.dot-attendance.com)
- **GitHub Issues**: [https://github.com/dot/attendance-service/issues](https://github.com/dot/attendance-service/issues)

## Changelog

### v2.1.0 (Current)
- Added biometric verification support
- Improved rate limiting with tiered access
- Enhanced error handling and validation
- Real-time WebSocket events
- Performance optimizations

### v2.0.0
- Complete API redesign for better RESTful compliance
- Multi-tenant architecture support  
- Advanced reporting and analytics
- Webhook integration support

### v1.0.0
- Initial API release
- Basic attendance tracking
- Employee management
- Simple reporting