# Supabase Authentication Implementation

## Overview

The DOT Attendance Web Application has a complete Supabase authentication implementation that provides secure user management, role-based access control, and seamless migration from AWS Cognito. This document outlines the architecture, features, and usage of the authentication system.

## 🏗️ Architecture

### Core Components

1. **Supabase Configuration** (`src/lib/supabase-config.ts`)
   - Supabase client initialization
   - Database type definitions
   - Employee table schema

2. **SupabaseAuthService** (`src/services/supabaseAuthService.ts`)
   - Primary authentication service
   - Implements complete AuthService interface
   - Manages user sessions and employee accounts

3. **UnifiedAuthService** (`src/services/unifiedAuthService.ts`)
   - Orchestrates between Cognito and Supabase
   - Feature flag system for gradual migration
   - Fallback mechanisms for reliability

4. **MigrationService** (`src/services/migrationService.ts`)
   - Handles user migration from Cognito
   - Employee account linking during migration
   - Statistics and monitoring

## 🔐 Authentication Features

### User Management
- ✅ User registration with email verification
- ✅ Password authentication
- ✅ Password reset functionality  
- ✅ Session management with automatic refresh
- ✅ Secure sign-out

### Employee Integration
- ✅ Employee account linking to Supabase users
- ✅ Approval workflow enforcement (`approval_status` field)
- ✅ Role-based access control (EMPLOYEE, MANAGER, ADMIN, MASTER_ADMIN)
- ✅ Master admin privilege checking
- ✅ Employee profile management

### Security Features
- ✅ PKCE flow for enhanced security
- ✅ Session persistence across browser sessions
- ✅ Device fingerprinting support
- ✅ Real-time session monitoring
- ✅ Comprehensive error handling

## 📊 Database Schema

### Employees Table Structure

```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id), -- Links to Supabase Auth
  organization_id UUID NOT NULL,
  branch_id UUID,
  department_id UUID,
  position_id UUID,
  employee_code TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT, -- Legacy field for migration
  device_id TEXT,
  qr_registered_device_id TEXT,
  fcm_token TEXT,
  approval_status TEXT CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')) DEFAULT 'PENDING',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  role TEXT CHECK (role IN ('EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN')) DEFAULT 'EMPLOYEE',
  is_master_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  date_of_birth DATE,
  join_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Configuration

### Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mljyiuzetchtjudbcfvd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Client Settings

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

## 💻 Usage Examples

### 1. User Registration and Employee Account Creation

```typescript
import { supabaseAuthService } from '@/services/supabaseAuthService';

// Register new user
const result = await supabaseAuthService.signUp(
  'employee@company.com', 
  'securePassword123',
  { name: 'John Doe' }
);

if (result.needsVerification) {
  // User needs to verify email
  const verificationResult = await supabaseAuthService.verifyOtp(
    'employee@company.com', 
    'verification_code'
  );
}

// Link employee account after verification
const employee = await supabaseAuthService.linkEmployeeAccount({
  name: 'John Doe',
  phone: '+1234567890',
  employeeCode: 'EMP001',
  branchId: 'branch-uuid',
  departmentId: 'dept-uuid',
  positionId: 'position-uuid'
});
```

### 2. User Authentication with Approval Check

```typescript
// Sign in user
const user = await supabaseAuthService.signIn(
  'employee@company.com', 
  'securePassword123'
);

// Check if user is approved
const isApproved = await supabaseAuthService.isApproved();
if (!isApproved) {
  throw new Error('Account is pending approval');
}

// Check user role and permissions
const isMasterAdmin = await supabaseAuthService.isMasterAdmin();
if (isMasterAdmin) {
  // Grant master admin access
  console.log('User has master admin privileges');
}
```

### 3. Role-Based Access Control

```typescript
const user = await supabaseAuthService.getCurrentUser();

// Check user role
switch (user?.employee?.role) {
  case 'MASTER_ADMIN':
    // Full system access
    break;
  case 'ADMIN':
    // Organization/branch admin access
    break;
  case 'MANAGER':
    // Department/team management access
    break;
  case 'EMPLOYEE':
    // Basic employee access
    break;
}

// Check approval status
if (user?.approvalStatus !== 'APPROVED') {
  // Redirect to pending approval page
  router.push('/pending-approval');
}
```

### 4. Migration from Cognito (Unified Auth)

```typescript
import { unifiedAuthService } from '@/services/unifiedAuthService';

// Unified sign-in handles migration automatically
const result = await unifiedAuthService.signIn(email, password);

if (result.needsMigration) {
  // Initiate migration process
  const migrationResult = await unifiedAuthService.initiateUserMigration(
    email, 
    password,
    { name: 'User Name', phone: '+1234567890' }
  );
  
  if (migrationResult.needsVerification) {
    // Handle email verification for migration
    await unifiedAuthService.completeMigration(email, verificationCode);
  }
}
```

### 5. Session Management

```typescript
// Get current session
const session = await supabaseAuthService.getSession();
const token = await supabaseAuthService.getSessionToken();

// Set up auth state listener
const unsubscribe = supabaseAuthService.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session?.user);
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  }
});

// Clean up listener
unsubscribe();
```

## 🔄 Migration Strategy

### Gradual Rollout with Feature Flags

The implementation supports gradual migration from Cognito to Supabase:

```typescript
// Feature flags control migration behavior
const flags = {
  enableSupabaseAuth: true,        // Enable Supabase for new users
  forceSupabaseForNewUsers: true,  // Force new sign-ups to use Supabase
  enableMigrationFlow: true,       // Enable migration for existing users
  enableCognitoFallback: true      // Allow fallback to Cognito if needed
};
```

### Migration Process

1. **User attempts sign-in**
2. **Check migration status** - Determine if user exists in Cognito/Supabase
3. **Handle accordingly:**
   - Fully migrated: Use Supabase only
   - Needs migration: Prompt user to migrate
   - New user: Use Supabase directly
   - Fallback: Use Cognito with migration reminder

## 🏥 Health Monitoring

### Migration Statistics

```typescript
import { migrationService } from '@/services/migrationService';

const stats = await migrationService.getMigrationStats();
console.log(`Migration progress: ${stats.migrationProgress}%`);
console.log(`${stats.migratedEmployees}/${stats.totalEmployees} employees migrated`);
```

### Error Handling

All authentication operations include comprehensive error handling:

```typescript
try {
  const user = await supabaseAuthService.signIn(email, password);
} catch (error) {
  if (error.message.includes('Invalid login credentials')) {
    // Handle invalid credentials
  } else if (error.message.includes('Email not confirmed')) {
    // Handle unverified email
  } else {
    // Handle other errors
  }
}
```

## 🔒 Security Considerations

### Authentication Security
- **PKCE Flow**: Enhanced security for SPA applications
- **Session Management**: Automatic token refresh and secure storage
- **Email Verification**: Required for account activation
- **Password Policies**: Enforced through Supabase Auth

### Database Security  
- **Row Level Security (RLS)**: Implemented for employee data
- **Role-based Access**: Multi-tier permission system
- **Audit Trail**: Approval/rejection tracking with timestamps

### Best Practices
- **Error Handling**: Never expose sensitive information in errors
- **Session Validation**: Always verify session before sensitive operations
- **Permission Checks**: Validate user permissions server-side
- **Input Validation**: Sanitize all user inputs

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Test the complete authentication implementation
npx ts-node scripts/test-supabase-auth.ts
```

The test script validates:
- Service initialization
- Authentication status checks
- User session management
- Role and permission validation
- Migration statistics
- Error handling

## 📚 API Reference

### SupabaseAuthService Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `signUp()` | Register new user | email, password, metadata | Promise<{user, session, needsVerification}> |
| `verifyOtp()` | Verify email with OTP | email, token | Promise<{user, session}> |
| `signIn()` | Authenticate user | email, password | Promise<User> |
| `signOut()` | Sign out user | - | Promise<void> |
| `getCurrentUser()` | Get current user | - | Promise<User \| null> |
| `getSession()` | Get current session | - | Promise<Session \| null> |
| `getSessionToken()` | Get access token | - | Promise<string \| null> |
| `isAuthenticated()` | Check auth status | - | Promise<boolean> |
| `isMasterAdmin()` | Check admin privileges | - | Promise<boolean> |
| `isApproved()` | Check approval status | - | Promise<boolean> |
| `linkEmployeeAccount()` | Link employee data | employeeData | Promise<Employee> |
| `resetPassword()` | Send password reset | email | Promise<void> |
| `updatePassword()` | Update password | newPassword | Promise<void> |

## 🤝 Contributing

When modifying the authentication system:

1. **Maintain Interface Compatibility**: Ensure changes don't break existing AuthService interface
2. **Update Type Definitions**: Keep TypeScript types current with database schema
3. **Test Migration Scenarios**: Verify both Cognito and Supabase flows work
4. **Document Changes**: Update this documentation for any API changes
5. **Security Review**: Have security-sensitive changes reviewed

## 📝 License

This implementation is part of the DOT Attendance Management System and follows the same licensing terms as the main project.

---

**Implementation Status: ✅ Complete and Production Ready**

The Supabase authentication implementation provides a robust, secure, and scalable authentication solution with seamless migration capabilities from AWS Cognito. All requested features have been implemented and tested.