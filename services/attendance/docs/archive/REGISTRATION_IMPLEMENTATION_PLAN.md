# 📋 Registration System Implementation Plan

## Overview
This document provides a detailed implementation plan for the new multi-role registration system, broken down into actionable tasks with clear dependencies and timelines.

---

## Phase 1: Database Setup (Days 1-3)

### Day 1: Schema Migration
- [ ] **Backup existing database**
  ```bash
  pg_dump -h localhost -U postgres -d attendance > backup_$(date +%Y%m%d).sql
  ```

- [ ] **Run migration script**
  ```bash
  supabase migration new registration_system
  cp supabase/migrations/002_registration_system.sql supabase/migrations/$(date +%Y%m%d)_registration_system.sql
  supabase db push
  ```

- [ ] **Verify table creation**
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('personal_accounts', 'organizations_v2', 'user_roles', 'employment_contracts');
  ```

### Day 2: Data Migration
- [ ] **Migrate existing users to personal_accounts**
  ```sql
  INSERT INTO personal_accounts (auth_user_id, email, phone, full_name, birth_date)
  SELECT id, email, phone, CONCAT(first_name, ' ', last_name), '1990-01-01'
  FROM users
  WHERE NOT EXISTS (SELECT 1 FROM personal_accounts WHERE email = users.email);
  ```

- [ ] **Migrate organizations**
  ```sql
  INSERT INTO organizations_v2 (name, code, owner_account_id)
  SELECT name, UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FOR 8)), 
         (SELECT id FROM personal_accounts LIMIT 1)
  FROM organizations;
  ```

- [ ] **Create user roles from existing data**
  ```sql
  INSERT INTO user_roles (account_id, organization_id, role)
  SELECT pa.id, o.id, 
         CASE u.role 
           WHEN 'master_admin' THEN 'master'::role_type
           WHEN 'admin' THEN 'admin'::role_type
           WHEN 'manager' THEN 'manager'::role_type
           ELSE 'worker'::role_type
         END
  FROM users u
  JOIN personal_accounts pa ON u.email = pa.email
  LEFT JOIN organizations o ON u.organization_id = o.id;
  ```

### Day 3: RLS and Indexes
- [ ] **Enable Row Level Security**
- [ ] **Create all RLS policies from migration script**
- [ ] **Verify indexes are created**
- [ ] **Run performance tests on new schema**

---

## Phase 2: API Development (Days 4-10)

### Day 4-5: Edge Functions Setup
- [ ] **Deploy registration Edge Function**
  ```bash
  supabase functions deploy register-user-v2
  ```

- [ ] **Create environment variables**
  ```bash
  supabase secrets set NICE_API_KEY=your-key
  supabase secrets set NTS_API_KEY=your-key
  supabase secrets set SMS_API_KEY=your-key
  ```

- [ ] **Test Edge Function locally**
  ```bash
  supabase functions serve register-user-v2
  ```

### Day 6-7: External API Integration
- [ ] **NICE API Integration**
  - [ ] Obtain API credentials
  - [ ] Implement verification function
  - [ ] Add error handling
  - [ ] Create mock for testing

- [ ] **NTS API Integration**
  - [ ] Obtain API credentials
  - [ ] Implement business verification
  - [ ] Handle API response parsing
  - [ ] Add caching for verified businesses

- [ ] **SMS Service Integration**
  - [ ] Setup SMS provider (Twilio/AWS SNS)
  - [ ] Implement parent consent flow
  - [ ] Create SMS templates
  - [ ] Add delivery tracking

### Day 8-10: Additional Endpoints
- [ ] **Check Availability Endpoint**
  ```typescript
  // supabase/functions/check-availability/index.ts
  export async function checkAvailability(email: string, phone: string)
  ```

- [ ] **Add Role Endpoint**
  ```typescript
  // supabase/functions/add-role/index.ts
  export async function addRole(accountId: string, roleData: RoleData)
  ```

- [ ] **Organization Management**
  ```typescript
  // supabase/functions/organization/index.ts
  export async function createOrganization(orgData: OrganizationData)
  export async function joinOrganization(code: string, accountId: string)
  ```

---

## Phase 3: Frontend Integration (Days 11-18)

### Day 11-12: Registration UI Components
- [ ] **Create registration form components**
  ```tsx
  // src/components/registration/RegistrationFlow.tsx
  // src/components/registration/BasicInfoStep.tsx
  // src/components/registration/AgeVerificationStep.tsx
  // src/components/registration/RoleSelectionStep.tsx
  // src/components/registration/BusinessVerificationStep.tsx
  ```

- [ ] **State management setup**
  ```tsx
  // src/stores/registrationStore.ts
  interface RegistrationState {
    flowId: string
    currentStep: RegistrationStep
    formData: Partial<RegistrationData>
  }
  ```

### Day 13-14: Multi-step Form Logic
- [ ] **Implement form validation**
  - [ ] Email/phone format validation
  - [ ] Age calculation and verification
  - [ ] Business number format validation

- [ ] **Step navigation logic**
  - [ ] Progress indicator
  - [ ] Back/Next buttons
  - [ ] Step validation before proceeding
  - [ ] Save progress to localStorage

### Day 15-16: Parent Consent Flow
- [ ] **Teen registration UI**
  - [ ] Parent information form
  - [ ] SMS verification code input
  - [ ] Consent document upload
  - [ ] Waiting state for parent approval

- [ ] **Parent consent page**
  - [ ] Unique URL for parent access
  - [ ] Review child information
  - [ ] Digital signature component
  - [ ] Confirmation screen

### Day 17-18: Role Management UI
- [ ] **Role selection interface**
  - [ ] Visual role cards
  - [ ] Organization search/join
  - [ ] Create organization form
  - [ ] Role comparison table

- [ ] **Multi-role dashboard**
  - [ ] Role switcher component
  - [ ] Organization selector
  - [ ] Quick access cards
  - [ ] Recent activity feed

---

## Phase 4: Testing (Days 19-23)

### Day 19: Unit Tests
- [ ] **Database functions tests**
  ```typescript
  // tests/database/registration.test.ts
  describe('Registration Database Functions', () => {
    test('creates personal account')
    test('enforces one admin per org')
    test('validates teen work hours')
  })
  ```

- [ ] **Edge Function tests**
  ```typescript
  // tests/functions/register-user.test.ts
  describe('Registration Edge Function', () => {
    test('handles new user registration')
    test('validates age restrictions')
    test('processes business verification')
  })
  ```

### Day 20: Integration Tests
- [ ] **Complete flow tests**
  - [ ] New user with business
  - [ ] Teen registration with parent consent
  - [ ] Existing user adding role
  - [ ] Organization creation and joining

- [ ] **Error handling tests**
  - [ ] Duplicate email/phone
  - [ ] Invalid business number
  - [ ] Age below 15
  - [ ] Network failures

### Day 21: E2E Tests
- [ ] **Playwright test scenarios**
  ```typescript
  // tests/e2e/registration.spec.ts
  test('complete adult registration flow')
  test('teen registration with parent consent')
  test('business owner registration')
  test('role switching after registration')
  ```

### Day 22: Security Testing
- [ ] **Security audit**
  - [ ] SQL injection attempts
  - [ ] XSS vulnerability scan
  - [ ] Rate limiting verification
  - [ ] RLS policy testing

- [ ] **Data protection**
  - [ ] Verify password hashing
  - [ ] Check PII encryption
  - [ ] Audit log completeness
  - [ ] Session management

### Day 23: Performance Testing
- [ ] **Load testing**
  ```bash
  # Using k6 for load testing
  k6 run tests/load/registration.js
  ```

- [ ] **Database performance**
  - [ ] Query optimization
  - [ ] Index effectiveness
  - [ ] Connection pooling
  - [ ] Cache hit rates

---

## Phase 5: Deployment (Days 24-25)

### Day 24: Staging Deployment
- [ ] **Deploy to staging environment**
  ```bash
  git checkout -b feature/registration-system
  git push origin feature/registration-system
  vercel --prod=false
  ```

- [ ] **Staging tests**
  - [ ] Smoke tests
  - [ ] User acceptance testing
  - [ ] Performance monitoring
  - [ ] Error tracking setup

### Day 25: Production Deployment
- [ ] **Production preparation**
  - [ ] Database backup
  - [ ] Rollback plan ready
  - [ ] Monitoring alerts configured
  - [ ] Support team briefed

- [ ] **Deploy to production**
  ```bash
  git checkout main
  git merge feature/registration-system
  git push origin main
  vercel --prod
  ```

- [ ] **Post-deployment**
  - [ ] Monitor error rates
  - [ ] Check performance metrics
  - [ ] Verify all flows working
  - [ ] User feedback collection

---

## Risk Management

### High Risk Items
1. **Data Migration**
   - Risk: Data loss or corruption
   - Mitigation: Complete backup, test migration on staging first

2. **External API Dependencies**
   - Risk: NICE/NTS API downtime
   - Mitigation: Implement fallback manual verification

3. **Teen Registration Compliance**
   - Risk: Legal compliance issues
   - Mitigation: Legal review, clear consent flow

### Medium Risk Items
1. **Performance Impact**
   - Risk: Slower queries with new schema
   - Mitigation: Extensive indexing, query optimization

2. **User Experience**
   - Risk: Complex registration flow
   - Mitigation: User testing, progress saving

---

## Success Metrics

### Technical Metrics
- [ ] Registration completion time < 5 minutes
- [ ] API response time < 200ms P95
- [ ] Zero data migration errors
- [ ] 100% test coverage for critical paths

### Business Metrics
- [ ] Registration completion rate > 80%
- [ ] User satisfaction score > 4.5/5
- [ ] Support ticket rate < 5%
- [ ] Daily registrations increase by 20%

---

## Team Assignments

### Backend Team
- **Lead**: Database migration, API development
- **Tasks**: Days 1-10, 19-20

### Frontend Team
- **Lead**: UI components, user experience
- **Tasks**: Days 11-18, 21

### DevOps Team
- **Lead**: Deployment, monitoring
- **Tasks**: Days 24-25, ongoing

### QA Team
- **Lead**: Testing strategy, test execution
- **Tasks**: Days 19-23

---

## Communication Plan

### Daily Standups
- Time: 9:00 AM
- Duration: 15 minutes
- Format: What I did / What I'm doing / Blockers

### Progress Reviews
- Day 5: Database and API progress
- Day 10: Backend complete review
- Day 18: Frontend complete review
- Day 23: Testing complete review

### Stakeholder Updates
- Weekly email updates
- Demo after each phase
- Final presentation Day 25

---

## Rollback Plan

If critical issues arise post-deployment:

1. **Immediate Actions**
   ```bash
   # Revert Edge Functions
   supabase functions delete register-user-v2
   
   # Restore database
   pg_restore -h localhost -U postgres -d attendance < backup_latest.sql
   
   # Revert frontend
   vercel rollback
   ```

2. **Communication**
   - Notify all users via email
   - Update status page
   - Prepare incident report

3. **Recovery**
   - Fix identified issues
   - Re-test thoroughly
   - Schedule new deployment window

---

## Checklist Summary

### Pre-Implementation
- [ ] Legal review completed
- [ ] API credentials obtained
- [ ] Team briefed on new architecture
- [ ] Development environment setup

### During Implementation
- [ ] Daily progress tracking
- [ ] Blocker resolution within 4 hours
- [ ] Code reviews for all PRs
- [ ] Documentation updated

### Post-Implementation
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] User documentation complete
- [ ] Support team trained

---

## Conclusion

This implementation plan provides a structured approach to deploying the new registration system over 25 working days (5 weeks). The phased approach ensures thorough testing and minimal risk to existing operations.

**Total Estimated Time**: 25 working days
**Team Size Required**: 6-8 developers
**Budget Estimate**: $50,000 - $75,000