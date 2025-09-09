# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DOT is a comprehensive business platform for restaurant digital transformation, built as a microservices-based monorepo. The platform provides integrated solutions for attendance management, marketing automation, and scheduling.

## Architecture

### Monorepo Structure
- **services/**: Independent microservices (attendance, marketing, scheduler)
- **packages/**: Shared libraries (shared, ui, utils, context-manager)
- **infrastructure/**: AWS CDK deployment configurations
- **docker/**: Local development environment setup
- **monitoring/**: Prometheus/Grafana monitoring stack

### Services Overview
- **Attendance Service** (Port 3002): GPS-based attendance with web dashboard + Flutter mobile app
- **Marketing Service** (Port 3003): YouTube creator marketing automation platform
- **Scheduler Service**: Employee scheduling and shift management (in planning)

## Development Commands

### Workspace Management
- `npm install` - Install root dependencies and setup workspaces
- `npm run install:all` - Install all workspace dependencies
- `npm run clean` - Clean all build artifacts and node_modules

### Service Development
- `npm run dev` - Start all services in development mode
- `npm run dev:attendance:web` - Start attendance web service (port 3002)
- `npm run dev:attendance:mobile` - Start Flutter mobile app development
- `npm run dev:marketing` - Start marketing service (port 3003)

### Build & Test
- `npm run build` - Build all services for production
- `npm run build:attendance` - Build attendance service only
- `npm run build:marketing` - Build marketing service only
- `npm run test` - Run all tests across services
- `npm run lint` - Run linting across all services

### Service-Specific Commands

#### Attendance Service
```bash
cd services/attendance/web
npm run dev              # Web dashboard (port 3002)
npm run dev:clean        # Clean dev server with cache clear
npm run test             # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests with Supabase
npm run test:rls         # Row Level Security tests
npm run test:master-admin # Master admin functionality tests
npm run test:workflow    # Full workflow tests
npm run test:security    # Security-related tests
npm run test:performance # Performance tests
npm run setup:test-user  # Setup test user for development
npm run test:auth        # Test authentication flow
npm run deploy           # Deploy to production

cd services/attendance/mobile
flutter pub get          # Install Flutter dependencies
flutter run              # Run mobile app
flutter test             # Run Flutter tests
flutter build web       # Build for web deployment
```

#### Marketing Service
```bash
cd services/marketing
npm run dev              # Development server (port 3003)
npm run setup:aws        # Setup AWS Parameter Store
npm run load:env         # Load environment from AWS
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Infrastructure & DevOps
- `docker-compose up -d --profile dev` - Start local development environment
- `docker-compose up -d --profile monitoring` - Start monitoring stack
- `./scripts/setup-hybrid-database.sh` - Setup hybrid database architecture

## Technology Stack

### Frontend
- **Next.js 15.5** with React 19 - Web applications
- **Flutter 3.10+** - Mobile application development
- **TypeScript 5.9** - Type safety across all services
- **Tailwind CSS 3.4** - Utility-first CSS framework

### Backend & Infrastructure
- **Supabase** - Primary backend for attendance service (Auth, Realtime, Database)
- **AWS Services** - Lambda, DynamoDB, API Gateway, Cognito for marketing service
- **AWS CDK** - Infrastructure as Code
- **Docker** - Local development environment

### Testing & Quality
- **Jest** - Unit and integration testing
- **Playwright** - E2E testing  
- **ESLint** - Code linting
- **TypeScript** - Static type checking

## Security Architecture

### ID-ROLE-PAPER System
The attendance service implements a comprehensive 7-tier role hierarchy:

1. **SUPER_ADMIN** - System-wide control
2. **MASTER_ADMIN** - Cross-organization management
3. **BUSINESS_ADMIN** - Organization-wide administration
4. **LOCATION_ADMIN** - Location-specific management
5. **MANAGER** - Team and shift management
6. **EMPLOYEE** - Standard worker permissions
7. **GUEST** - Limited read-only access

### Security Features
- **Row Level Security (RLS)** - Database-level multi-tenant isolation
- **JWT Authentication** - Secure token-based auth with WebSocket support
- **Audit Logging** - Comprehensive activity tracking
- **Permission Matrix** - Granular CRUD permissions per resource
- **Real-time Security** - WebSocket connections with JWT validation

## Development Guidelines

### Recent Updates (2025-01)
- **Jest Configuration**: Updated to use `--testPathPatterns` instead of deprecated `--testPathPattern`
- **Security Hardening**: Removed exposed service keys, strengthened CSP policies
- **Performance Tests**: Some benchmark tests disabled due to syntax issues (marked as .disabled)
- **Build Cleanup**: Removed .next artifacts to resolve disk space issues

### Testing Commands (Updated)
```bash
# Updated Jest commands with correct flags
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests  
npm run test:security         # Security test suite
npm run test:rls              # Row Level Security tests
npm run test:auth             # Authentication flow tests
```

### Code Quality Rules
- **No TODO Comments**: All code must be production-ready
- **Complete Implementations**: No partial features or placeholder functions  
- **Security First**: Never expose service keys or credentials
- **TDD Approach**: Write tests before implementation
- **Parallel Development**: Use concurrent operations where possible

## Troubleshooting

### Common Issues

**Build Failures (ENOSPC)**
- Solution: Clear .next directory with `rm -rf .next`
- Monitor disk space with `du -sh .next node_modules`

**Jest Test Issues**
- Use updated command flags: `--testPathPatterns` not `--testPathPattern`
- Performance benchmark tests are disabled (.disabled extension)

**TypeScript Errors** 
- Some integration test files have syntax issues and are disabled
- Core functionality tests work correctly

**Authentication Problems**
- Test with: `npx jest src/tests/auth-service-unified.test.ts`
- Verify Supabase connection and environment variables

### Development Workflow
1. **Security Review**: Always check for exposed credentials
2. **Test Coverage**: Run comprehensive test suites before commits
3. **Performance**: Monitor disk usage and clean build artifacts
4. **Documentation**: Update relevant docs when making changes

## Project Structure Notes

### Critical Files
- `next.config.js` - Security headers and CSP configuration
- `jest.config.js` - Main test configuration (no duplicates)
- `middleware.ts` - Authentication and request handling
- `auth-middleware.ts` - Role-based access control

### Disabled Files
- Performance benchmark tests (`.disabled` extension)
- Broken integration tests (syntax errors)
- These can be re-enabled after refactoring

## Important Reminders

1. **Never commit service keys** - Use environment variables only
2. **Test security changes** - Run auth and security test suites  
3. **Monitor disk space** - Clean build artifacts regularly
4. **Update documentation** - Keep this file current with changes
5. **Follow TDD** - Write tests first, implement after

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.