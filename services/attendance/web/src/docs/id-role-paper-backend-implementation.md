# ID-ROLE-PAPER Backend Implementation

This document describes the core backend services implementation for the new ID-ROLE-PAPER system that replaces the previous attendance system architecture.

## Overview

The ID-ROLE-PAPER system implements a dynamic role-based access control where:
- **Roles are calculated** from owned PAPER documents, not assigned manually
- **7 distinct roles** support various business scenarios from job seekers to franchise headquarters
- **Business context** enables multi-business operations for users
- **Permissions are hierarchical** with role inheritance and business-scoped access

## Core Services

### 1. Identity Service (`/services/identityService.ts`)

**Purpose**: Manages unified identities, papers, business registrations, and computed roles.

**Key Features**:
- Creates and manages Personal and Corporate identities
- Handles PAPER document lifecycle (create, validate, activate/deactivate)
- Manages business registrations with verification workflows
- Automatically calculates and updates user roles based on owned papers
- Supports Corporate ID linking to Personal IDs for business ownership

**Main Methods**:
```typescript
// Identity Management
createIdentity(data: CreateIdentityData): Promise<UnifiedIdentity>
getIdentityWithContext(identityId: string): Promise<IdentityWithContext>
getIdentityByAuthUser(authUserId: string): Promise<UnifiedIdentity>

// Paper Management
createPaper(identityId: string, paperRequest: CreatePaperRequest): Promise<Paper>
getIdentityPapers(identityId: string): Promise<Paper[]>

// Business Registration
createBusinessRegistration(identityId: string, businessRequest: CreateBusinessRegistrationRequest): Promise<BusinessRegistration>
getIdentityBusinessRegistrations(identityId: string): Promise<BusinessRegistration[]>

// Role Calculation
recalculateRoles(identityId: string): Promise<ComputedRole[]>
```

### 2. Permission System (`/lib/permissions/role-permissions.ts`)

**Purpose**: Comprehensive role-based permission system with hierarchical inheritance and business context support.

**Key Features**:
- 7-role hierarchy with automatic permission inheritance
- Business-scoped permissions for multi-business users
- Conditional permissions based on context (self, business, verification status)
- Detailed permission explanations for debugging and UI

**Role Hierarchy**:
1. **SEEKER** (Level 1) - Default role, job seeking permissions
2. **WORKER** (Level 2) - Employee with employment contract
3. **MANAGER** (Level 3) - Team management with authority delegation
4. **SUPERVISOR** (Level 4) - Business supervision with supervisor authority
5. **OWNER** (Level 6) - Business owner with business registration
6. **FRANCHISEE** (Level 5) - Franchise location owner
7. **FRANCHISOR** (Level 7) - Franchise headquarters manager

**Main Methods**:
```typescript
// Permission Checking
hasPermission(role: RoleType, resource: Resource, action: Action, context?): boolean
hasMultiRolePermission(roles: RoleType[], resource: Resource, action: Action, context?): boolean

// Permission Analysis
getRolePermissions(role: RoleType): EnhancedPermission[]
getPermissionExplanation(role: RoleType, resource: Resource, action: Action): PermissionExplanation
```

### 3. Unified Auth Service (`/services/unifiedAuthService.ts`)

**Purpose**: Integrates Supabase authentication with ID-ROLE-PAPER architecture, providing unified authentication with role and permission context.

**Key Features**:
- Seamless integration between Supabase auth and identity system
- Automatic identity creation during user registration
- Role-based permission checking with business context
- Paper and business registration management through auth interface
- Multi-business context switching for users with multiple businesses

**Main Methods**:
```typescript
// Authentication
signUp(email: string, password: string, metadata?, identityOptions?): Promise<AuthResult>
signIn(email: string, password: string): Promise<AuthResult>
getCurrentUser(): Promise<UnifiedUser>

// Identity Integration
createIdentity(options: CreateIdentityOptions): Promise<AuthResult>
getUserWithContext(userId?: string): Promise<IdentityWithContext>

// Permission & Role Management
hasPermission(resource: Resource, action: Action, context?): Promise<boolean>
createPaper(paperRequest: CreatePaperRequest): Promise<{success: boolean; rolesUpdated?: RoleType[]}>
createBusinessRegistration(businessRequest: CreateBusinessRegistrationRequest): Promise<{success: boolean; businessId?: string}>

// Business Context
switchBusinessContext(businessId: string): Promise<{success: boolean; availableRoles?: RoleType[]}>
```

## Data Flow

### User Registration Flow
1. User signs up with email/password through `unifiedAuthService.signUp()`
2. Supabase creates auth user account
3. Identity is created with Personal ID type and basic profile
4. User starts with SEEKER role (no papers required)
5. Email verification if required

### Role Progression Flow
1. User obtains business documents (employment contract, business registration, etc.)
2. Papers are created in system via `createPaper()` 
3. Role calculator automatically determines new roles based on paper combinations
4. Computed roles are saved and permissions updated
5. User gains access to new features based on role permissions

### Business Registration Flow
1. Identity creates business registration with registration number and details
2. Business registration paper is automatically created
3. User gains OWNER role for that business context
4. Can add additional papers (franchise agreement, etc.) for higher roles
5. Multi-business users can switch contexts to access different role sets

### Permission Checking Flow
1. User attempts action through UI or API
2. System gets user's identity context with current roles
3. Permission service checks if any user role grants required permission
4. Business context and conditions are validated
5. Access granted or denied based on comprehensive permission matrix

## Database Schema Requirements

The system requires these database tables:

```sql
-- Core identity table
unified_identities (
  id UUID PRIMARY KEY,
  id_type VARCHAR(20) NOT NULL, -- 'personal' | 'corporate'
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  full_name VARCHAR(255) NOT NULL,
  birth_date DATE,
  id_number VARCHAR(100), -- SSN for personal, business number for corporate
  auth_user_id UUID REFERENCES auth.users(id),
  linked_personal_id UUID REFERENCES unified_identities(id), -- For corporate IDs
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  profile_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Business registrations
business_registrations (
  id UUID PRIMARY KEY,
  registration_number VARCHAR(100) UNIQUE NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(20) NOT NULL, -- 'individual' | 'corporate'
  owner_identity_id UUID REFERENCES unified_identities(id),
  registration_data JSONB DEFAULT '{}',
  verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'verified' | 'rejected'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Papers (documents that grant roles)
papers (
  id UUID PRIMARY KEY,
  paper_type VARCHAR(100) NOT NULL, -- Business Registration, Employment Contract, etc.
  owner_identity_id UUID REFERENCES unified_identities(id),
  related_business_id UUID REFERENCES business_registrations(id),
  paper_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Computed roles (automatically calculated)
computed_roles (
  id UUID PRIMARY KEY,
  identity_id UUID REFERENCES unified_identities(id),
  role VARCHAR(50) NOT NULL, -- SEEKER, WORKER, MANAGER, etc.
  source_papers TEXT[], -- Array of paper IDs that grant this role
  business_context_id UUID REFERENCES business_registrations(id),
  is_active BOOLEAN DEFAULT TRUE,
  computed_at TIMESTAMP DEFAULT NOW()
);
```

## Integration Points

### With Existing Supabase Auth
- `auth_user_id` links unified identities to Supabase auth users
- Maintains backward compatibility with existing auth flows
- Leverages Supabase RLS for data security

### With Attendance System
- Attendance records can reference identity IDs and business contexts
- Role-based access controls attendance features
- Multi-business users can track attendance across different businesses

### With UI Components
- User context provides role information for UI state
- Permission checking enables/disables features dynamically
- Business context switching for multi-business interfaces

## Security Considerations

### Access Control
- All database operations use Supabase RLS policies
- Server-side permission validation prevents client manipulation
- Business context isolation ensures users only access authorized data

### Data Validation
- Identity and business registration data validation
- Paper ownership verification before role calculation
- Corporate ID requires valid Personal ID linkage

### Error Handling
- Comprehensive error types for different failure scenarios
- Graceful degradation when identity context unavailable
- Audit logging for security-sensitive operations

## Usage Examples

See `/examples/id-role-paper-usage.ts` for comprehensive examples including:
- User registration with identity creation
- Business owner journey with role progression
- Manager role assignment with prerequisites
- Permission checking across different contexts
- Role analysis and progression planning
- Franchise system setup
- Multi-business context switching

## Migration Considerations

### From Existing System
- Existing users need identity creation workflow
- Role migration from old system to paper-based roles
- Business data migration to new business registration format

### Backward Compatibility
- Legacy role field maintained in UnifiedUser interface
- Existing API endpoints can be gradually updated
- Permission system provides fallback for unmapped scenarios

## Performance Considerations

### Caching Strategy
- Role calculations cached until papers change
- Permission checking optimized with role inheritance
- Business context switching minimizes database queries

### Database Optimization
- Indexed foreign keys for identity relationships
- Composite indexes for role and business context queries
- Efficient paper ownership validation

## Testing Strategy

The implementation includes comprehensive test scenarios:
- Unit tests for role calculation logic
- Integration tests for identity and business workflows  
- Permission system validation across all role combinations
- Multi-business context scenarios
- Error handling and edge cases

## Next Steps

1. **Database Migration**: Create tables and migrate existing data
2. **API Updates**: Update existing endpoints to use new services
3. **UI Integration**: Update components to use new permission system
4. **Testing**: Comprehensive testing across all user scenarios
5. **Documentation**: API documentation and user guides
6. **Monitoring**: Set up logging and metrics for the new system