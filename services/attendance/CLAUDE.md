# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DOT Attendance Service is an enterprise-grade multi-tenant attendance management system with real-time synchronization and hierarchical role-based access control. Built on Supabase with Next.js web dashboard and Flutter mobile app.

## Architecture

### Multi-Platform Structure
- **Web Dashboard**: Next.js 15.5 (Port 3002) - Admin interface and reporting
- **Mobile App**: Flutter 3.x - Employee attendance checking with biometric auth
- **Backend**: Supabase (PostgreSQL + Edge Functions) with Row Level Security
- **Real-time**: WebSocket subscriptions for live updates

### Database Schema (11 Core Tables)
PostgreSQL with comprehensive RLS policies for multi-tenant isolation:
- **organizations** - Multi-tenant organization management  
- **users/employees** - User accounts with 4-tier role hierarchy
- **attendance** - Check-in/out records with GPS validation
- **shifts/locations** - Work scheduling and geo-fencing
- **permissions/role_templates** - RBAC system with custom roles
- **audit_logs/sync_queue** - Compliance and offline sync

### 4-Tier Role Hierarchy (Critical for Understanding)
1. **MASTER_ADMIN** - System-wide control, organization CRUD
2. **ADMIN** - Organization-wide management, employee CRUD  
3. **MANAGER** - Team management, attendance approval
4. **WORKER** - Personal attendance only

## Development Commands

### Service-Level Commands
```bash
# Service root level (services/attendance/)
npm run dev                    # Start development environment
npm run build                  # Build all components
npm run test                   # Run all tests
npm run test:integration       # Integration tests with Supabase
npm run test:benchmark         # Performance benchmarks
npm run functions:serve        # Start Supabase edge functions locally
npm run functions:deploy       # Deploy edge functions
```

### Web Dashboard Commands
```bash
# Web development (services/attendance/web/)
npm run dev                    # Next.js dev server on port 3002
npm run dev:clean              # Clean dev server with cache clear
npm run build                  # Production build
npm run test                   # Unit tests
npm run test:unit              # Unit tests only  
npm run test:integration       # Integration tests with real Supabase
npm run test:rls               # Row Level Security policy tests
npm run test:master-admin      # Master admin functionality tests
npm run test:workflow          # Full workflow end-to-end tests
npm run test:security          # Security-focused test suite
npm run test:performance       # Performance and load tests
npm run setup:test-user        # Create test user with MASTER_ADMIN role
npm run test:auth              # Test authentication flow
npm run deploy                 # Production deployment
```

### Mobile App Commands  
```bash
# Mobile development (services/attendance/mobile/)
flutter pub get                # Install dependencies
flutter run                    # Run on device/emulator
flutter run -d web             # Run as web app
flutter test                   # Run Dart/Flutter tests
flutter build apk              # Build Android APK
flutter build ios              # Build iOS app
flutter build web              # Build PWA
```

### Integration Test Scripts
```bash
# Advanced integration testing (services/attendance/scripts/)
./scripts/run-integration-tests.sh           # All integration tests
./scripts/run-integration-tests.sh rls       # RLS policy tests only
./scripts/run-integration-tests.sh security  # Security test suite
./scripts/setup-test-user.js                 # Create MASTER_ADMIN test user
```

## Key Architectural Patterns

### Authentication & Authorization Flow
1. **Supabase Auth** - JWT-based authentication with refresh tokens
2. **RLS Policies** - Database-level security enforcement by organization
3. **Role Hierarchy** - Each role inherits permissions from lower levels
4. **Permission Matrix** - Granular CRUD permissions per resource type

### Real-time Data Architecture
```typescript
// Subscription pattern used throughout
const subscription = supabase
  .from('attendance')
  .on('*', { filter: 'organization_id=eq.123' })
  .subscribe()
```

### Multi-tenant Data Isolation
All queries are automatically filtered by `organization_id` via RLS policies. Each user can only access data within their organization.

### Type System (services/attendance/src/types/index.ts)
Comprehensive TypeScript definitions covering:
- **Database Models**: Organization, Employee, Attendance, etc.
- **API Contracts**: Request/response types for all endpoints
- **Role System**: UserRole enum and ROLE_HIERARCHY constants
- **Real-time**: Subscription and payload types

## Testing Strategy

### Test Categories by Complexity
1. **Unit Tests** (`npm run test:unit`) - Individual component logic
2. **Integration Tests** (`npm run test:integration`) - Full Supabase integration
3. **Security Tests** (`npm run test:security`) - RLS, auth, privilege escalation
4. **Workflow Tests** (`npm run test:workflow`) - End-to-end user journeys
5. **Performance Tests** (`npm run test:performance`) - Load and benchmark testing

### Critical Test Areas
- **Row Level Security** - Ensure data isolation between organizations
- **Role-based Permissions** - Verify access control at all levels
- **Real-time Subscriptions** - WebSocket connection management
- **Offline Sync** - Mobile app synchronization logic

### Test Environment Setup
```bash
# Required for integration tests
export SUPABASE_SERVICE_ROLE_KEY=your_service_key
export TEST_SUPABASE_URL=your_test_instance_url

# Run comprehensive test setup
npm run setup:test-user  # Creates archt723@gmail.com with MASTER_ADMIN
```

## Security Considerations

### Row Level Security (RLS) Policies
Every table has organization-based RLS policies. When modifying queries, ensure they work within RLS constraints.

### Privilege Escalation Prevention
Role changes require proper authorization chains. MASTER_ADMIN creation is restricted and audited.

### Data Encryption
- JWT tokens for session management
- HTTPS enforcement for all communications
- Sensitive data encryption at rest in Supabase

## Performance Optimization

### Database Query Patterns
- Use indexed columns: `organization_id`, `user_id`, `created_at`
- Implement pagination for large datasets
- Real-time subscriptions are filtered at database level

### Mobile App Architecture
- Offline-first design with sync queue
- Biometric authentication caching
- Optimistic updates with rollback capability

## Common Development Workflows

### Adding New Features
1. Define types in `src/types/index.ts`
2. Create database migration if needed
3. Implement RLS policies for new tables
4. Add business logic to appropriate service layer
5. Create comprehensive tests including security scenarios

### Debugging Authentication Issues
1. Check JWT token validity and role claims
2. Verify RLS policies aren't blocking legitimate queries
3. Test with `setup:test-user` script for known-good account
4. Use `test:auth` command to validate flow

### Performance Investigation
1. Run `npm run test:performance` for baseline metrics
2. Use `npm run benchmark` for detailed timing analysis
3. Check Supabase logs for slow queries
4. Monitor real-time subscription memory usage

## Environment Configuration

### Required Environment Variables
```bash
# Web (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mobile (config files)
# Flutter uses pubspec.yaml dependencies
# Supabase config in lib/core/services/supabase_service.dart
```

### Database Migration Workflow
```bash
# Create new migration
npm run migrate:create migration_name

# Apply migrations
npm run migrate

# Deploy Edge Functions
npm run functions:deploy
```

## Troubleshooting Common Issues

### Authentication Failures
- Verify environment variables are set correctly
- Check if user exists in both `auth.users` and `employees` tables
- Validate role hierarchy assignment matches expected permissions

### Real-time Connection Issues
- Confirm WebSocket connections aren't blocked by firewall
- Check subscription filters match RLS policy expectations
- Monitor connection state and implement reconnection logic

### Mobile Build Issues
- Run `flutter clean && flutter pub get` to reset dependencies
- Check Android/iOS specific permissions in platform config
- Verify Supabase Flutter SDK version compatibility

## Code Organization Principles

### Monorepo Structure
- Shared types and utilities in root `src/` directory
- Platform-specific code in `web/` and `mobile/` subdirectories
- Common database schema and migrations in `supabase/`

### Component Architecture
- Feature-based organization over technical layers
- Shared business logic extracted to service layer
- Platform-specific UI implementations with common data models

### TypeScript Usage
- Strict type checking enabled across all platforms
- Shared type definitions prevent web/mobile drift  
- Runtime type validation with Zod for API boundaries