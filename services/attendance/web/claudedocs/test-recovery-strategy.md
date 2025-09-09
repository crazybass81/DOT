# DOT Attendance Service - Test Recovery Strategy

## Current Assessment
- **Test Suites**: 109 failed, 31 passed (22% pass rate)
- **Target**: Achieve 70% coverage for production readiness
- **Production Score**: 4.6/10 → 9.0/10 target

## Prioritized Recovery Plan

### Phase 1: Critical Infrastructure (Week 1)
**Target**: Get 50% of tests passing (70 test suites)

#### 1.1 Fix Module Resolution (HIGH IMPACT - 30% of failures)
- Update import paths in tests to match actual file locations
- Create missing component stubs where tests expect them
- Fix Jest moduleNameMapper configuration gaps

**Specific Actions**:
```bash
# Fix QR/Location service imports
tests/unit/lib-services/*.test.ts → src/lib/services/*.ts

# Create missing CheckInButton component stub
components/CheckInButton.tsx (basic implementation)

# Update import paths across test files
@/lib/services/attendance → src/lib/services/attendance
```

#### 1.2 Business Logic Alignment (HIGH IMPACT - 25% of failures)  
- Review business-registration.test.ts expectations
- Update compliance status logic to match tests
- Fix paper-management hierarchy conflict detection

**Critical Files**:
- `src/lib/services/business-registration-service.ts`
- `src/lib/services/paper-service.ts`

### Phase 2: Mock Infrastructure (Week 2)
**Target**: Get 70% of tests passing (98 test suites)

#### 2.1 Enhanced Supabase Mocking
- Fix Headers mock in jest.setup.js
- Create comprehensive Supabase client mock
- Implement proper authentication response mocking

#### 2.2 Component Test Infrastructure
- Create missing UI components for tests
- Implement proper React Testing Library setup
- Fix notification system test infrastructure

### Phase 3: Integration Refinement (Week 3)
**Target**: Achieve 80%+ pass rate (112+ test suites)

#### 3.1 Security Test Stabilization
- Fix privilege escalation test database setup
- Resolve RLS (Row Level Security) test failures
- Stabilize master-admin functionality tests

#### 3.2 Performance Test Optimization
- Fix database connection pool tests
- Resolve timeout issues in integration tests
- Optimize test execution performance

## Realistic Coverage Estimates

### Immediate Wins (2-3 days effort):
- **Unit Tests**: Can get ~80% passing by fixing imports
- **Service Tests**: Can get ~70% passing by aligning business logic
- **Component Tests**: Can get ~60% passing by creating component stubs

### Medium-term (1-2 weeks effort):
- **Integration Tests**: Can get ~60% passing with better mocking
- **Security Tests**: Can get ~50% passing with database setup fixes
- **Performance Tests**: Can get ~70% passing with timeout fixes

### Expected Final Coverage:
- **Optimistic**: 85% test suite pass rate (119/140)
- **Realistic**: 75% test suite pass rate (105/140) 
- **Conservative**: 65% test suite pass rate (91/140)

## Resource Allocation Strategy

### High ROI Quick Fixes (Day 1-2):
1. Fix import paths in lib-services tests
2. Create CheckInButton component stub  
3. Update business logic expectations in 3 key tests
4. Fix Headers mock in jest.setup.js

### Medium ROI Infrastructure (Day 3-7):
1. Comprehensive Supabase mock overhaul
2. Missing component creation (10-15 components)
3. Business logic alignment (5-8 service files)
4. Test data factory improvements

### Low ROI Polish (Week 2-3):
1. Security test database setup automation
2. Performance test optimization
3. E2E test stabilization
4. Coverage reporting improvements

## Success Metrics

### Daily Tracking:
- Test suite pass rate (current: 22%)
- Build success rate
- Critical path test coverage

### Weekly Goals:
- Week 1: 50% pass rate (70 suites)
- Week 2: 70% pass rate (98 suites)  
- Week 3: 75% pass rate (105 suites)

### Production Readiness Indicators:
- Core attendance flow: 90% test coverage
- Authentication system: 85% test coverage
- Business logic services: 80% test coverage
- Security features: 70% test coverage

## Risk Mitigation

### Technical Risks:
- **Supabase integration complexity**: Create isolated test environment
- **Business logic changes**: Maintain backward compatibility
- **Performance degradation**: Monitor test execution times

### Schedule Risks:
- **Scope creep**: Focus on existing tests, avoid new feature testing
- **Debugging complexity**: Time-box investigation to 2 hours per failing test
- **Dependency conflicts**: Maintain stable dependency versions

## Recommendations

### Immediate Actions (Next 24 hours):
1. Focus on import path fixes in lib-services tests
2. Create minimal CheckInButton component implementation  
3. Fix 3 highest-impact business logic expectation mismatches
4. Enhance Headers mock in jest.setup.js

### Framework Decisions:
- **Keep existing test structure**: Don't reorganize, just fix
- **Prioritize unit tests**: Higher ROI than integration tests
- **Mock aggressively**: Reduce external dependencies in tests
- **Maintain TDD approach**: Fix tests to drive implementation quality

This strategy balances quick wins with systematic improvement, targeting the most impactful failures first while building sustainable test infrastructure for long-term maintainability.