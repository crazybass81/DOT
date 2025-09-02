# DOT Attendance System - Integration Tests

This directory contains comprehensive integration tests for the DOT Attendance System, covering all major functionality including RLS policies, master admin features, QR code workflows, real-time functionality, and security validations.

## 🧪 Test Structure

### Test Categories

1. **RLS Policies Tests** (`rls.test.ts`)
   - Employee data access policies
   - Attendance record security
   - Organization and branch access control
   - Helper function validation
   - Performance and security validation

2. **Master Admin Tests** (`master-admin.test.ts`)
   - Authentication and authorization
   - Permission management
   - QR code generation and management
   - Audit logging
   - User approval workflows

3. **Full Workflow Tests** (`full-workflow.test.ts`)
   - Complete user registration and approval
   - Device token management
   - QR code generation and scanning
   - Real-time functionality
   - Performance benchmarks
   - Security vulnerability checks

## 🚀 Running Tests

### Prerequisites

1. **Environment Variables**
   ```bash
   # Required
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Optional (will use defaults if not set)
   TEST_SUPABASE_URL=your_test_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Dependencies**
   ```bash
   npm install
   ```

### Running Individual Test Suites

```bash
# Run RLS policies tests
npm run test:integration -- --testPathPattern=rls.test.ts

# Run master admin tests
npm run test:integration -- --testPathPattern=master-admin.test.ts

# Run full workflow tests
npm run test:integration -- --testPathPattern=full-workflow.test.ts
```

### Running All Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration -- --coverage

# Run specific test pattern
npm run test:integration -- --testNamePattern="QR code"

# Run in watch mode
npm run test:integration -- --watch
```

### Test Configuration

The tests use a dedicated Jest configuration (`jest.integration.config.js`) with the following features:

- **Test Environment**: Node.js environment for database operations
- **Timeout**: 60 seconds per test for complex operations
- **Sequential Execution**: Tests run one at a time to avoid conflicts
- **Global Setup/Teardown**: Automatic environment setup and cleanup
- **Detailed Reporting**: HTML and JUnit reports generated

## 🔧 Test Environment Setup

### Automatic Setup

The integration tests automatically:

1. **Verify Database Connection**: Ensures Supabase is accessible
2. **Setup Data Isolation**: Creates unique test data prefixes
3. **Clean Previous Test Data**: Removes any leftover test data
4. **Verify Required Tables**: Ensures all necessary tables exist
5. **Check RLS Policies**: Validates security policies are active

### Manual Environment Setup

If you need to manually prepare the test environment:

```bash
# Reset test database (if using local Supabase)
supabase db reset

# Run migrations
supabase db push

# Seed initial data
npm run db:seed:test
```

## 📊 Test Coverage

The integration tests cover:

### Security Testing
- ✅ SQL injection protection
- ✅ RLS policy enforcement
- ✅ Authentication bypass prevention
- ✅ Privilege escalation protection
- ✅ Input validation
- ✅ Rate limiting checks

### Functionality Testing
- ✅ User registration and approval workflow
- ✅ Device token management and FCM notifications
- ✅ QR code generation, scanning, and security
- ✅ Real-time updates and subscriptions
- ✅ Attendance check-in/check-out flow
- ✅ Master admin permissions and audit logging

### Performance Testing
- ✅ Database query performance
- ✅ Concurrent operation handling
- ✅ Bulk operation efficiency
- ✅ Real-time latency measurement
- ✅ Resource usage monitoring

## 🐛 Debugging Tests

### Verbose Logging

Enable verbose logging for debugging:

```bash
npm run test:integration -- --verbose --no-silent
```

### Test-Specific Debugging

```bash
# Run single test with full output
npm run test:integration -- --testNamePattern="specific test name" --verbose

# Debug with Node.js inspector
node --inspect-brk ./node_modules/.bin/jest --config tests/jest.integration.config.js --runInBand
```

### Common Issues and Solutions

1. **Database Connection Failures**
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
   - Check network connectivity to Supabase
   - Ensure database is not in maintenance mode

2. **RLS Policy Failures**
   - Verify migrations have been applied
   - Check that auth.users table has proper data
   - Ensure test users are properly created

3. **Timeout Issues**
   - Increase timeout in jest config
   - Check for hanging promises in test code
   - Verify test cleanup is happening properly

4. **Data Cleanup Issues**
   - Run manual cleanup: `npm run test:cleanup`
   - Check foreign key constraints
   - Verify user deletion permissions

## 📈 Performance Benchmarks

The tests include performance benchmarks with the following thresholds:

| Operation | Threshold | Measurement |
|-----------|-----------|-------------|
| QR Generation | 1000ms | Time to generate QR code |
| QR Scan | 500ms | Time to process QR scan |
| Real-time Update | 2000ms | Latency for real-time events |
| Attendance Create | 1000ms | Time to create attendance record |
| Device Registration | 1500ms | Time to register device token |

## 🔒 Security Test Coverage

### Authentication Tests
- User session management
- Token expiration handling
- Multi-factor authentication flows
- Session hijacking prevention

### Authorization Tests
- Role-based access control
- Resource-level permissions
- Cross-tenant data isolation
- Privilege escalation attempts

### Data Protection Tests
- SQL injection attempts
- XSS protection
- CSRF protection
- Input sanitization

## 📁 File Structure

```
tests/
├── integration/
│   ├── rls.test.ts                 # RLS policies tests
│   ├── master-admin.test.ts        # Master admin functionality tests
│   └── full-workflow.test.ts       # End-to-end workflow tests
├── setup/
│   ├── global-setup.ts             # Global test environment setup
│   ├── global-teardown.ts          # Global test cleanup
│   ├── integration-setup.ts        # Per-test setup
│   └── env-setup.js                # Environment configuration
├── reports/                        # Test reports and coverage
├── jest.integration.config.js      # Jest configuration
└── README.md                       # This file
```

## 🚀 Deployment Integration

The integration tests are designed to work with the deployment pipeline:

### Pre-deployment Testing

```bash
# Run as part of deployment script
./scripts/deploy.sh --environment staging

# The deployment script automatically runs:
# 1. Unit tests
# 2. Integration tests (non-production)
# 3. Security audits
# 4. Performance benchmarks
```

### CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
- name: Run Integration Tests
  run: |
    npm run test:integration
  env:
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
```

## 📞 Support

If you encounter issues with the integration tests:

1. Check the troubleshooting section above
2. Review the test logs in `tests/reports/`
3. Ensure all environment variables are set correctly
4. Verify database migrations are up to date

For additional support, refer to the main project documentation or create an issue in the project repository.

---

**Note**: These integration tests require a live Supabase instance and appropriate permissions. They are designed to be safe for development and staging environments but should not be run against production databases.