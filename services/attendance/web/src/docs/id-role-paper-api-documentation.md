# ID-ROLE-PAPER System API Documentation

This document provides comprehensive documentation for the new API endpoints that support the ID-ROLE-PAPER architecture in the DOT attendance system.

## Overview

The ID-ROLE-PAPER system replaces the traditional user-role-organization model with a dynamic, document-based approach where:
- **IDs**: Unified identities (Personal and Corporate)
- **ROLEs**: 7 dynamic roles calculated from owned papers
- **PAPERs**: Documents that grant roles when owned

## Authentication & Business Context

All API endpoints require authentication via Supabase Auth. Many endpoints also support business context through:
- Header: `X-Business-Registration-ID: {businessId}`
- Query parameter: `businessId={businessId}`

## Core API Endpoints

### Identity Management (`/api/identity/`)

#### GET /api/identity
Get identity information with optional context inclusion.

**Query Parameters:**
- `id` (required): Identity ID
- `include`: Comma-separated list: `papers,roles,businesses,permissions`

**Headers:**
- `X-Business-Registration-ID`: Business context for permission checks

**Response:**
```json
{
  "identity": {
    "id": "uuid",
    "idType": "personal|corporate",
    "email": "user@example.com",
    "fullName": "User Name",
    "isVerified": true,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "papers": [...],
  "computedRoles": [...],
  "businessRegistrations": [...]
}
```

#### POST /api/identity
Create a new identity.

**Request Body:**
```json
{
  "idType": "personal|corporate",
  "email": "user@example.com",
  "fullName": "User Name",
  "phone": "+1234567890",
  "birthDate": "1990-01-01",
  "linkedPersonalId": "uuid" // Required for corporate IDs
}
```

#### PUT /api/identity
Update identity information.

**Query Parameters:**
- `id` (required): Identity ID to update

**Request Body:**
```json
{
  "phone": "+1234567890",
  "fullName": "Updated Name",
  "profileData": {}
}
```

#### DELETE /api/identity
Deactivate an identity (requires high-level permissions).

**Query Parameters:**
- `id` (required): Identity ID to deactivate

#### PATCH /api/identity
Verify an identity (requires verification permissions).

**Query Parameters:**
- `id` (required): Identity ID to verify
- `action`: Must be "verify"

### Paper Management (`/api/papers/`)

#### GET /api/papers
Get papers with filtering options.

**Query Parameters:**
- `identityId`: Filter by paper owner
- `paperType`: Filter by paper type (Business Registration, Employment Contract, etc.)
- `businessId`: Filter by related business
- `isActive`: Filter by active status

**Response:**
```json
{
  "papers": [
    {
      "id": "uuid",
      "paperType": "Employment Contract",
      "ownerIdentityId": "uuid",
      "relatedBusinessId": "uuid",
      "paperData": {},
      "isActive": true,
      "validFrom": "2025-01-01T00:00:00Z",
      "validUntil": null
    }
  ]
}
```

#### POST /api/papers
Create a new paper.

**Request Body:**
```json
{
  "identityId": "uuid",
  "paperType": "Employment Contract",
  "relatedBusinessId": "uuid", // Required for business-related papers
  "paperData": {
    "position": "Manager",
    "startDate": "2025-01-01"
  },
  "validFrom": "2025-01-01T00:00:00Z",
  "validUntil": null
}
```

#### PUT /api/papers
Update paper information.

**Query Parameters:**
- `id` (required): Paper ID to update

**Request Body:**
```json
{
  "paperData": {},
  "validUntil": "2025-12-31T23:59:59Z",
  "isActive": true
}
```

#### DELETE /api/papers
Deactivate a paper.

**Query Parameters:**
- `id` (required): Paper ID to deactivate

### Business Registration Management (`/api/business-registrations/`)

#### GET /api/business-registrations
Get business registrations with filtering.

**Query Parameters:**
- `ownerId`: Filter by owner identity
- `status`: Filter by verification status (pending, verified, rejected)
- `type`: Filter by business type (individual, corporate)
- `isActive`: Filter by active status
- `registrationNumber`: Find by exact registration number

**Response:**
```json
{
  "businessRegistrations": [
    {
      "id": "uuid",
      "registrationNumber": "123-456-789",
      "businessName": "ACME Corp",
      "businessType": "corporate",
      "ownerIdentityId": "uuid",
      "verificationStatus": "verified",
      "isActive": true
    }
  ]
}
```

#### POST /api/business-registrations
Create a new business registration.

**Request Body:**
```json
{
  "identityId": "uuid",
  "registrationNumber": "123-456-789",
  "businessName": "ACME Corp",
  "businessType": "individual|corporate",
  "registrationData": {}
}
```

#### PUT /api/business-registrations
Update business registration.

**Query Parameters:**
- `id` (required): Business registration ID

**Request Body:**
```json
{
  "businessName": "Updated Name",
  "registrationData": {},
  "verificationStatus": "verified", // Requires special permissions
  "isActive": true
}
```

#### DELETE /api/business-registrations
Deactivate or delete business registration.

**Query Parameters:**
- `id` (required): Business registration ID

#### PATCH /api/business-registrations
Verify or reject business registration.

**Query Parameters:**
- `id` (required): Business registration ID
- `action`: "verify" or "reject"

### Role Management (`/api/roles/`)

#### GET /api/roles
Get computed roles with filtering.

**Query Parameters:**
- `identityId`: Filter by identity
- `role`: Filter by role type
- `businessContext`: Filter by business context
- `isActive`: Filter by active status
- `includePermissions`: Include permission details

**Headers:**
- `X-Business-Registration-ID`: Business context filter

**Response:**
```json
{
  "computedRoles": [
    {
      "id": "uuid",
      "identityId": "uuid",
      "role": "WORKER",
      "sourcePapers": ["paper-uuid-1"],
      "businessContextId": "uuid",
      "isActive": true,
      "computedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/roles
Trigger role recalculation.

**Request Body:**
```json
{
  "action": "recalculate",
  "identityId": "uuid"
}
```

### Role Permissions (`/api/roles/permissions/`)

#### GET /api/roles/permissions
Get permissions for specific roles.

**Query Parameters:**
- `roles` (required): Comma-separated role types (WORKER,MANAGER)
- `includeHierarchy`: Include permission hierarchy information

**Response:**
```json
{
  "rolePermissions": [
    {
      "role": "WORKER",
      "permissions": [
        {
          "resource": "attendance",
          "action": "create",
          "description": "Check in/out for attendance",
          "businessContext": true
        }
      ]
    }
  ]
}
```

### Permission Checking (`/api/roles/check-permission/`)

#### POST /api/roles/check-permission
Check if current user has specific permission.

**Request Body:**
```json
{
  "resource": "attendance",
  "action": "create",
  "context": {
    "businessContextId": "uuid",
    "targetUserId": "uuid"
  }
}
```

**Response:**
```json
{
  "hasPermission": true,
  "roles": ["WORKER", "MANAGER"],
  "explanation": {
    "granted": true,
    "reason": "Direct permission granted",
    "source": "direct"
  },
  "context": {
    "identityId": "uuid",
    "primaryRole": "MANAGER",
    "businessContextId": "uuid"
  }
}
```

### Role Statistics (`/api/roles/stats/`)

#### GET /api/roles/stats
Get role statistics and insights.

**Query Parameters:**
- `businessContext`: Filter by business context
- `timeRange`: Time range for statistics (default: 30d)

**Headers:**
- `X-Business-Registration-ID`: Business context filter

**Response:**
```json
{
  "stats": {
    "totalRoles": 150,
    "activeRoles": 142,
    "roleDistribution": {
      "WORKER": 80,
      "MANAGER": 35,
      "OWNER": 15
    },
    "businessContextDistribution": {
      "business-uuid-1": 50,
      "business-uuid-2": 30
    },
    "recentlyComputed": 5
  }
}
```

### Role Recalculation (`/api/roles/recalculate/`)

#### POST /api/roles/recalculate
Recalculate roles for an identity.

**Request Body:**
```json
{
  "identityId": "uuid"
}
```

**Response:**
```json
{
  "message": "Roles successfully recalculated",
  "computedRoles": [...]
}
```

### Updated Attendance API (`/api/attendance/updated/`)

#### GET /api/attendance/updated
Get attendance records with ID-ROLE-PAPER integration.

**Query Parameters:**
- `identityId`: Filter by identity
- `businessId`: Filter by business registration
- `startDate`: Filter by start date
- `endDate`: Filter by end date
- `status`: Filter by status
- `limit`: Number of records (default: 50)
- `offset`: Offset for pagination

**Headers:**
- `X-Business-Registration-ID`: Business context

**Response:**
```json
{
  "attendanceRecords": [
    {
      "id": "uuid",
      "identity_id": "uuid",
      "business_registration_id": "uuid",
      "check_in_time": "2025-01-01T09:00:00Z",
      "check_out_time": null,
      "status": "active",
      "role_at_time": "WORKER"
    }
  ],
  "totalCount": 100,
  "userContext": {
    "identityId": "uuid",
    "roles": ["WORKER"],
    "primaryRole": "WORKER"
  }
}
```

#### POST /api/attendance/updated
Create attendance record (check-in) with role verification.

**Request Body:**
```json
{
  "businessRegistrationId": "uuid",
  "checkInTime": "2025-01-01T09:00:00Z", // Optional, defaults to now
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "verificationMethod": "gps",
  "notes": "Early arrival"
}
```

**Headers:**
- `X-Business-Registration-ID`: Business context (alternative to body param)

#### PUT /api/attendance/updated
Update attendance record (check-out, etc.).

**Request Body:**
```json
{
  "id": "uuid",
  "checkOutTime": "2025-01-01T17:00:00Z",
  "checkOutLocation": {},
  "notes": "Overtime work",
  "breakTimeMinutes": 60,
  "overtimeMinutes": 30
}
```

#### DELETE /api/attendance/updated
Delete attendance record (requires high-level permissions).

**Query Parameters:**
- `id` (required): Attendance record ID

## Role-Based Permissions

### Role Types
1. **SEEKER**: Default role, basic permissions
2. **WORKER**: Employment contract holder
3. **MANAGER**: Worker + authority delegation
4. **SUPERVISOR**: Worker + supervisor authority delegation
5. **OWNER**: Business registration holder
6. **FRANCHISEE**: Owner + franchise agreement
7. **FRANCHISOR**: Owner + franchise HQ registration

### Permission Levels
- **Self**: Can only access own data
- **Business Context**: Can access data within business context
- **Role Hierarchy**: Higher roles inherit lower role permissions
- **Verification Status**: Some permissions require verified status

### Common Permission Patterns
```javascript
// Check if user can view attendance records
POST /api/roles/check-permission
{
  "resource": "attendance",
  "action": "read",
  "context": {
    "businessContextId": "uuid",
    "targetUserId": "uuid"
  }
}

// Check if user can create papers
POST /api/roles/check-permission
{
  "resource": "paper",
  "action": "create",
  "context": {
    "businessContextId": "uuid"
  }
}
```

## Error Handling

All endpoints return structured error responses:

```json
{
  "error": "Error message",
  "details": {
    "field": "validation error"
  }
}
```

### Common HTTP Status Codes
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate data)
- `500`: Internal Server Error

## Migration from Legacy System

### Legacy vs New Mapping
- `employees` → `unified_identities`
- `organizations` → `business_registrations`
- `user_roles` → `computed_roles` (calculated from papers)
- `employee_id` → `identity_id`
- `business_id` → `business_registration_id`

### Backward Compatibility
The system maintains backward compatibility through:
1. Existing endpoints remain functional
2. New endpoints provide enhanced functionality
3. Gradual migration path available
4. Legacy data structures supported during transition

### Migration Steps
1. Create unified identities for existing users
2. Convert organizations to business registrations
3. Create appropriate papers for existing roles
4. Recalculate roles based on papers
5. Update client applications to use new endpoints
6. Gradually phase out legacy endpoints

## Best Practices

### Authentication
- Always include proper authentication headers
- Use business context headers for scoped operations
- Implement proper error handling for auth failures

### Permission Checking
- Check permissions before sensitive operations
- Use the permission checking endpoint for complex scenarios
- Cache permission results when appropriate

### Performance
- Use pagination for large result sets
- Implement proper caching strategies
- Batch operations when possible

### Security
- Validate all input parameters
- Use HTTPS for all API calls
- Implement rate limiting
- Log security-relevant events

## Testing

### Sample Test Scenarios

1. **Identity Creation**:
   ```bash
   curl -X POST /api/identity \
     -H "Content-Type: application/json" \
     -d '{"idType":"personal","email":"test@example.com","fullName":"Test User"}'
   ```

2. **Paper Creation**:
   ```bash
   curl -X POST /api/papers \
     -H "Content-Type: application/json" \
     -d '{"identityId":"uuid","paperType":"Employment Contract","relatedBusinessId":"uuid"}'
   ```

3. **Role Recalculation**:
   ```bash
   curl -X POST /api/roles/recalculate \
     -H "Content-Type: application/json" \
     -d '{"identityId":"uuid"}'
   ```

4. **Attendance Check-in**:
   ```bash
   curl -X POST /api/attendance/updated \
     -H "Content-Type: application/json" \
     -H "X-Business-Registration-ID: uuid" \
     -d '{"businessRegistrationId":"uuid","location":{}}'
   ```

This API documentation provides comprehensive coverage of the new ID-ROLE-PAPER system endpoints. For additional support or questions, refer to the system architecture documentation or contact the development team.