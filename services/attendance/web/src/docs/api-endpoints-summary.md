# API Endpoints Summary - ID-ROLE-PAPER System

## Overview

This document summarizes all the API endpoints created for the new ID-ROLE-PAPER architecture, including both new endpoints and updated legacy-compatible endpoints.

## New API Endpoints

### 1. Identity Management (`/api/identity/`)

**File**: `/home/ec2-user/DOT/services/attendance/web/src/app/api/identity/route.ts`

**Endpoints**:
- `GET /api/identity` - Get identity information with context
- `POST /api/identity` - Create new identity (Personal/Corporate)
- `PUT /api/identity` - Update identity information
- `DELETE /api/identity` - Deactivate identity
- `PATCH /api/identity` - Verify identity

**Key Features**:
- Support for Personal and Corporate ID types
- Business context validation via headers
- Role-based permission checking
- Full identity context including papers, roles, and business registrations

### 2. Paper Management (`/api/papers/`)

**File**: `/home/ec2-user/DOT/services/attendance/web/src/app/api/papers/route.ts`

**Endpoints**:
- `GET /api/papers` - Get papers with filtering
- `POST /api/papers` - Create new paper
- `PUT /api/papers` - Update paper information
- `DELETE /api/papers` - Deactivate paper

**Key Features**:
- 6 paper types: Business Registration, Employment Contract, Authority Delegation, Supervisor Authority Delegation, Franchise Agreement, Franchise HQ Registration
- Automatic role recalculation on paper changes
- Business context validation
- Paper ownership verification

### 3. Business Registration Management (`/api/business-registrations/`)

**File**: `/home/ec2-user/DOT/services/attendance/web/src/app/api/business-registrations/route.ts`

**Endpoints**:
- `GET /api/business-registrations` - Get business registrations
- `POST /api/business-registrations` - Create new business registration
- `PUT /api/business-registrations` - Update business registration
- `DELETE /api/business-registrations` - Deactivate/delete business registration
- `PATCH /api/business-registrations` - Verify/reject business registration

**Key Features**:
- Automatic business registration paper creation
- Verification workflow (pending → verified/rejected)
- Individual and Corporate business types
- Soft delete when associated data exists

### 4. Role Management (`/api/roles/`)

**File**: `/home/ec2-user/DOT/services/attendance/web/src/app/api/roles/route.ts`

**Endpoints**:
- `GET /api/roles` - Get computed roles with filtering
- `POST /api/roles` - Trigger role recalculation

**Key Features**:
- 7 role types: SEEKER, WORKER, MANAGER, SUPERVISOR, OWNER, FRANCHISEE, FRANCHISOR
- Dynamic role calculation from owned papers
- Business context filtering
- Role hierarchy and inheritance

### 5. Role Permissions (`/api/roles/permissions/`)

**File**: `/home/ec2-user/DOT/services/attendance/web/src/app/api/roles/permissions/route.ts`

**Endpoints**:
- `GET /api/roles/permissions` - Get permissions for specific roles

**Key Features**:
- Multi-role permission queries
- Permission hierarchy information
- Role inheritance details

### 6. Permission Checking (`/api/roles/check-permission/`)

**File**: `/home/ec2-user/DOT/services/attendance/web/src/app/api/roles/check-permission/route.ts`

**Endpoints**:
- `POST /api/roles/check-permission` - Check specific permission for user

**Key Features**:
- Real-time permission validation
- Context-aware checking
- Detailed permission explanations

### 7. Role Statistics (`/api/roles/stats/`)

**File**: `/home/ec2-user/DOT/services/attendance/web/src/app/api/roles/stats/route.ts`

**Endpoints**:
- `GET /api/roles/stats` - Get role statistics and insights

**Key Features**:
- Role distribution analytics
- Business context statistics
- Time-based filtering
- Management dashboard data

### 8. Role Recalculation (`/api/roles/recalculate/`)

**File**: `/home/ec2-user/DOT/services/attendance/web/src/app/api/roles/recalculate/route.ts`

**Endpoints**:
- `POST /api/roles/recalculate` - Recalculate roles for an identity

**Key Features**:
- Manual role recalculation
- Batch role updates
- Permission-based access control

## Updated Legacy-Compatible Endpoints

### 9. Updated Attendance API (`/api/attendance/updated/`)

**File**: `/home/ec2-user/DOT/services/attendance/web/src/app/api/attendance/updated/route.ts`

**Endpoints**:
- `GET /api/attendance/updated` - Get attendance records with ID-ROLE-PAPER integration
- `POST /api/attendance/updated` - Create attendance record with role verification
- `PUT /api/attendance/updated` - Update attendance record
- `DELETE /api/attendance/updated` - Delete attendance record

**Key Features**:
- Identity-based attendance tracking
- Business registration context
- Role verification at check-in time
- Enhanced permission system
- Backward compatibility with existing data

### 10. Updated User Roles API (`/api/user-roles/updated/`)

**File**: `/home/ec2-user/DOT/services/attendance/web/src/app/api/user-roles/updated/route.ts`

**Endpoints**:
- `GET /api/user-roles/updated` - Get computed roles in legacy format
- `POST /api/user-roles/updated` - Create role by generating appropriate papers
- `PUT /api/user-roles/updated` - Update role by modifying papers
- `DELETE /api/user-roles/updated` - Delete role by deactivating papers

**Key Features**:
- Legacy format compatibility
- Automatic paper generation for role assignment
- Paper-based role management
- Backward compatibility with existing user-role APIs

## System Integration Features

### Authentication & Authorization
- Supabase Auth integration
- Role-based access control (RBAC)
- Business context headers (`X-Business-Registration-ID`)
- Multi-role permission system

### Data Relationships
- Unified identities (Personal/Corporate)
- Papers as role-granting documents
- Business registrations as core business entities
- Computed roles from paper combinations

### Role Calculation Engine
- Dynamic role calculation from owned papers
- Role dependencies (MANAGER requires WORKER)
- Business context awareness
- Automatic recalculation on paper changes

### Permission System
- 7-tier role hierarchy
- Context-aware permissions
- Business-scoped access control
- Permission inheritance

### Error Handling
- Comprehensive error responses
- Validation error details
- Permission error explanations
- Structured error types

### Performance Features
- Efficient database queries
- Pagination support
- Caching-friendly responses
- Optimized permission checks

## Migration Support

### Backward Compatibility
- Legacy endpoint formats maintained
- Gradual migration path
- Data structure compatibility
- API response format consistency

### Data Migration
- Organizations → Business Registrations
- Employees → Unified Identities
- User Roles → Computed Roles
- Legacy field name support

### Testing Support
- Comprehensive test scenarios
- Sample API calls
- Error condition testing
- Migration validation

## Security Features

### Access Control
- Identity-based authentication
- Role-based authorization
- Business context validation
- Permission-based access

### Data Protection
- Input validation
- SQL injection prevention
- Business context isolation
- Audit trail support

### Compliance
- GDPR-compatible data handling
- Privacy-by-design principles
- Data retention policies
- Secure data transmission

## Performance Characteristics

### Scalability
- Efficient database queries
- Pagination support
- Caching strategies
- Connection pooling

### Response Times
- Optimized permission checks
- Cached role calculations
- Batch operations support
- Minimal database round trips

### Resource Usage
- Memory-efficient operations
- Connection pooling
- Query optimization
- Caching integration

## File Structure

```
/home/ec2-user/DOT/services/attendance/web/src/app/api/
├── identity/
│   └── route.ts                      # Identity management
├── papers/
│   └── route.ts                      # Paper management
├── business-registrations/
│   └── route.ts                      # Business registration management
├── roles/
│   ├── route.ts                      # Role management
│   ├── permissions/
│   │   └── route.ts                  # Role permissions
│   ├── check-permission/
│   │   └── route.ts                  # Permission checking
│   ├── stats/
│   │   └── route.ts                  # Role statistics
│   └── recalculate/
│       └── route.ts                  # Role recalculation
├── attendance/
│   └── updated/
│       └── route.ts                  # Updated attendance API
└── user-roles/
    └── updated/
        └── route.ts                  # Updated user roles API
```

## Documentation Files

```
/home/ec2-user/DOT/services/attendance/web/src/docs/
├── id-role-paper-api-documentation.md    # Comprehensive API docs
└── api-endpoints-summary.md               # This summary file
```

## Next Steps

1. **Testing**: Implement comprehensive test suites for all endpoints
2. **Frontend Integration**: Update frontend applications to use new endpoints
3. **Migration Scripts**: Create data migration utilities
4. **Monitoring**: Implement API monitoring and analytics
5. **Performance Optimization**: Fine-tune database queries and caching
6. **Documentation**: Create interactive API documentation
7. **Training**: Prepare development team training materials

This comprehensive API system provides a robust foundation for the ID-ROLE-PAPER architecture while maintaining backward compatibility and supporting smooth migration from the legacy system.