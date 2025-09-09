# ID-ROLE-PAPER Testing Framework

This comprehensive testing framework validates the complete ID-ROLE-PAPER architecture for the DOT attendance system. It provides thorough testing of personal/corporate identities, business registrations, paper-based role calculations, and security measures.

## Architecture Overview

The ID-ROLE-PAPER system implements a hierarchical role system based on papers (documents) that grant specific roles to individuals within business contexts:

- **Personal IDs**: Individual identity records
- **Corporate IDs**: Business entity identities linked to personal IDs
- **Business Registrations**: Legal business entity records
- **Papers**: Documents that grant roles (employment contracts, business registrations, etc.)
- **Role Calculations**: Computed roles based on active papers
- **Permission System**: Role-based access control

### Role Hierarchy
```
FRANCHISOR (6) - Network-wide franchise control
    ↓
FRANCHISEE (5) - Individual franchise management
    ↓
OWNER (4) - Business ownership and control
    ↓
MANAGER (3) - Business management (requires WORKER)
    ↓
SUPERVISOR (2) - Team supervision (requires WORKER)
    ↓
WORKER (1) - Basic employment
    ↓
SEEKER (0) - No role/unemployed
```

## Test Structure

### Unit Tests (`/tests/unit/`)
- **Role Calculation Engine** - Core role computation logic
- **Identity Service** - Personal/corporate ID management
- **Permission System** - Role-based access control
- **Paper Management** - Paper lifecycle and validation
- **Business Registration** - Business entity management

### Integration Tests (`/tests/integration/`)
- **API Endpoints** - Complete API layer testing
- **RLS Policies** - Row Level Security enforcement
- **Authentication Flow** - User authentication and session management
- **Cross-Role Permissions** - Multi-role access scenarios

### Security Tests (`/tests/security/`)
- **Privilege Escalation** - Security vulnerability testing
- **Business Context Isolation** - Multi-tenant security
- **Paper Forgery Prevention** - Document authenticity
- **SQL Injection Protection** - Database security

### Utilities (`/tests/utils/`)
- **Test Data Factories** - Advanced test data generation
- **Performance Test Utilities** - Load testing tools
- **Edge Case Builders** - Boundary condition testing

## Running Tests

### Complete Test Suite
```bash
# Run all tests with comprehensive reporting
npm run test:id-role-paper

# Run with HTML report generation
npm run test:id-role-paper:report

# Run only fast tests (skip slow performance/e2e)
npm run test:id-role-paper:fast

# Run only critical tests
npm run test:id-role-paper:critical
```

### Individual Test Suites
```bash
# Unit tests with coverage
npm run test:id-role-paper:unit

# Integration tests
npm run test:id-role-paper:integration

# Security tests
npm run test:id-role-paper:security

# Database RLS policy tests
npm run test:id-role-paper:rls

# API endpoint tests
npm run test:id-role-paper:api
```

### Specific Components
```bash
# Role calculation engine
npm run test:id-role-paper:role-calc

# Identity service
npm run test:id-role-paper:identity

# Permission system
npm run test:id-role-paper:permissions

# Paper management
npm run test:id-role-paper:papers

# Business registration
npm run test:id-role-paper:business

# Privilege escalation security
npm run test:id-role-paper:privilege-escalation
```

## Test Configuration

### Environment Setup

The tests require a Supabase database connection. Configure these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Test Database

Tests use a real Supabase database with the following tables:
- `personal_ids` - Individual identity records
- `corporate_ids` - Business entity identities
- `business_registrations` - Legal business records
- `papers` - Role-granting documents
- `role_calculations` - Computed role assignments

### Row Level Security

The system enforces strict RLS policies:
- Users can only access their own personal data
- Business owners can manage their businesses
- Employees can only see businesses they work for
- Papers are isolated by business context
- Cross-business access is restricted

## Test Data Generation

### Basic Test Data
```typescript
import { TestDataFactory } from './setup/id-role-paper-test-setup';

// Create personal ID
const personalId = TestDataFactory.createPersonalId({
  name: '김테스트',
  phone: '010-1234-5678'
});

// Create business
const business = TestDataFactory.createBusinessRegistration(personalId.id, {
  business_name: '테스트 회사',
  business_type: 'CORPORATION'
});

// Create employment paper
const paper = TestDataFactory.createPaper(personalId.id, business.id, {
  paper_type: 'EMPLOYMENT_CONTRACT',
  role_granted: 'WORKER'
});
```

### Advanced Scenarios
```typescript
import { AdvancedTestDataFactory } from './utils/test-data-factories';

// Create business ecosystem
const ecosystem = AdvancedTestDataFactory.createBusinessEcosystem({
  businessCount: 3,
  employeesPerBusiness: 5,
  managementLevels: 2,
  franchiseNetwork: true
});

// Create realistic industry data
const restaurant = AdvancedTestDataFactory.createRealisticBusinessData('restaurant');

// Generate performance test data
const perfData = AdvancedTestDataFactory.generatePerformanceTestData({
  personalIdCount: 1000,
  businessCount: 100,
  papersPerPerson: 3,
  corporateIdRatio: 0.2
});
```

## Security Testing

The framework includes comprehensive security tests:

### Privilege Escalation Prevention
- Tests attempts to elevate roles through paper manipulation
- Validates business ownership transfer restrictions
- Checks cross-business access isolation

### Authentication Security
- Token manipulation protection
- Session hijacking prevention
- Anonymous access restrictions

### Data Integrity
- SQL injection prevention
- Input validation testing
- Constraint enforcement

### Example Security Test
```typescript
test('should prevent role elevation through paper creation', async () => {
  // Malicious user attempts to create OWNER paper
  const maliciousPaper = TestDataFactory.createPaper(userId, businessId, {
    paper_type: 'BUSINESS_REGISTRATION',
    role_granted: 'OWNER'
  });

  const { error } = await userClient
    .from('papers')
    .insert([maliciousPaper]);

  expect(error).not.toBeNull();
  expect(error.code).toBe('42501'); // Insufficient privilege
});
```

## Performance Testing

### Load Testing
```typescript
// Generate large datasets
const perfData = AdvancedTestDataFactory.generatePerformanceTestData({
  personalIdCount: 10000,
  businessCount: 1000,
  papersPerPerson: 5
});

// Test role calculation performance
test('should calculate roles efficiently for large datasets', async () => {
  const startTime = Date.now();
  
  const roles = await calculateRoles(personalId, businessId);
  
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(1000); // Should complete within 1 second
});
```

### Memory Usage
```typescript
test('should handle large datasets without memory issues', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Process large dataset
  await processLargeDataset(perfData);
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
});
```

## Best Practices

### Test Organization
1. **AAA Pattern** - Arrange, Act, Assert
2. **Single Responsibility** - One concept per test
3. **Descriptive Names** - Clear test intentions
4. **Independent Tests** - No test dependencies
5. **Proper Cleanup** - Clean state for each test

### Data Management
1. **Isolated Data** - Each test uses unique data
2. **Realistic Scenarios** - Test real-world use cases
3. **Edge Cases** - Test boundary conditions
4. **Error Conditions** - Test failure scenarios

### Security Testing
1. **Assume Malice** - Test malicious user behavior
2. **Boundary Testing** - Test access boundaries
3. **Input Validation** - Test all input vectors
4. **Privilege Boundaries** - Test role transitions

## Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Check database connectivity
npm run test:db-check

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

**RLS Policy Failures**
```bash
# Run RLS-specific tests
npm run test:id-role-paper:rls

# Check user authentication in tests
```

**Performance Issues**
```bash
# Run performance tests separately
npm run test:performance

# Use --runInBand for debugging
jest --runInBand --detectOpenHandles
```

### Debug Mode
```bash
# Enable verbose output
npm run test:id-role-paper -- --verbose

# Run specific test with debugging
DEBUG=true jest tests/unit/role-calculation-engine.test.ts --verbose
```

## Coverage Reports

### Generate Coverage
```bash
# Unit tests with coverage
npm run test:id-role-paper:unit

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Targets
- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 70%+
- **Statements**: 80%+

## Continuous Integration

The tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run ID-ROLE-PAPER Tests
  run: |
    npm run test:id-role-paper:critical
    npm run test:id-role-paper:security
```

For production deployments, all security tests must pass:
```bash
npm run test:id-role-paper:security || exit 1
```

## Contributing

When adding new features to the ID-ROLE-PAPER system:

1. **Write Tests First** - TDD approach
2. **Cover All Scenarios** - Happy path, edge cases, errors
3. **Security Tests** - Always include security validation
4. **Performance Tests** - Consider scalability impact
5. **Documentation** - Update test documentation

### Test Checklist
- [ ] Unit tests for core logic
- [ ] Integration tests for API endpoints
- [ ] Security tests for new permissions
- [ ] RLS policy tests for data access
- [ ] Performance tests for scalability
- [ ] Edge case and error condition tests

## Support

For questions about the testing framework:

1. Check this README first
2. Review existing tests for examples
3. Run specific test suites to isolate issues
4. Use verbose mode for debugging
5. Check the test reports in `test-results/`

The testing framework ensures the ID-ROLE-PAPER architecture maintains security, performance, and reliability standards for the DOT attendance system.