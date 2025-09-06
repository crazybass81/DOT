# DOT 근태관리 시스템 리팩터링 로드맵

## 📋 개요

DOT 근태관리 시스템의 아이디 및 역할 구조를 통합하고 확장 가능한 아키텍처로 리팩터링하는 종합 계획입니다.

### 목표
- **아이디 타입 통합**: 개인/법인/프랜차이즈 통합 관리
- **역할 시스템 정규화**: 일관된 권한 체계 구축
- **비즈니스 규칙 구현**: 법인 검증, 프랜차이즈 계층 구조
- **무중단 마이그레이션**: Zero-downtime 데이터 이전
- **확장 가능한 아키텍처**: 미래 요구사항 대응

## 🚀 Phase 1: 데이터베이스 통합 (Week 1-2)

### Week 1: 스키마 설계 완료 ✅

#### 완료된 작업
- [x] `003_schema_consolidation.sql` - 통합 스키마 마이그레이션
- [x] `unified.types.ts` - TypeScript 타입 시스템 통합
- [x] `identityService.ts` - 신원 관리 서비스
- [x] `organizationService.ts` - 조직 관리 서비스

#### 주요 개선사항
- **통합 enum 시스템**: `id_type`, `unified_role`, `business_status`
- **비즈니스 규칙 강화**: 트리거 기반 검증
- **계층적 권한 구조**: 프랜차이즈 본사-가맹점 관계
- **청소년 근로 보호**: 법적 제약 조건 구현

### Week 2: 데이터베이스 구현

#### 1일차: 마이그레이션 실행
```bash
# 1. Supabase CLI 설정 확인
cd /home/ec2-user/DOT/services/attendance
supabase status

# 2. 백업 생성
supabase db dump > backups/pre_refactoring_$(date +%Y%m%d).sql

# 3. 마이그레이션 실행
supabase db push

# 4. 데이터 검증
supabase db reset --db-url=$DATABASE_URL
```

#### 2-3일차: 데이터 검증 및 수정
- **스키마 검증**: 모든 제약 조건 테스트
- **인덱스 최적화**: 쿼리 성능 분석
- **RLS 정책 검증**: 보안 규칙 테스트

#### 4-5일차: 기본 데이터 마이그레이션
```sql
-- 기존 마스터 관리자 계정 마이그레이션
SELECT migrate_user_to_unified('existing-master-admin-id');

-- 테스트 조직 생성
INSERT INTO organizations_v3 (name, org_type, owner_identity_id) 
VALUES ('Test Organization', 'personal', 'master-identity-id');
```

### 위험도 평가: 🟡 중간
- **데이터 무결성**: 백업 및 롤백 계획 수립
- **스키마 충돌**: 기존 테이블과 병행 운영
- **성능 영향**: 인덱스 최적화로 완화

## 🚀 Phase 2: 서비스 레이어 구현 (Week 3-4)

### Week 3: 비즈니스 로직 서비스

#### 1일차: Identity Service 확장
```typescript
// 추가 구현 필요
export class IdentityService {
  async verifyWithNiceAPI(identityId: string, encData: string): Promise<boolean>
  async validateTeenWorkPermit(identity: UnifiedIdentity): Promise<ValidationResult>
  async linkSupabaseAuth(identityId: string, authUser: AuthUser): Promise<boolean>
}
```

#### 2일차: Organization Service 확장
```typescript
// 프랜차이즈 관리 기능
export class OrganizationService {
  async createFranchiseStore(hqId: string, storeData: CreateStoreRequest): Promise<Organization>
  async validateFranchiseHierarchy(parentId: string, childId: string): Promise<boolean>
  async transferOwnership(orgId: string, newOwnerId: string, transferredBy: string): Promise<boolean>
}
```

#### 3일차: Contract Service 구현
```typescript
export class ContractService {
  async createEmploymentContract(request: CreateContractRequest): Promise<EmploymentContract>
  async validateTeenEmployment(contract: EmploymentContract): Promise<ValidationResult>
  async generateContractDocument(contractId: string): Promise<DocumentUrl>
  async processDigitalSignature(contractId: string, signature: DigitalSignature): Promise<boolean>
}
```

#### 4-5일차: Permission Service 구현
```typescript
export class PermissionService {
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean>
  async getUserEffectivePermissions(userId: string): Promise<Permission[]>
  async validateRoleAssignment(request: AssignRoleRequest): Promise<ValidationResult>
  async auditPermissionChange(change: PermissionChangeEvent): Promise<void>
}
```

### Week 4: API 레이어 구현

#### 1-2일차: REST API v2 구현
- [x] `/api/v2/identities` - 신원 관리 API
- [x] `/api/v2/organizations` - 조직 관리 API
- [ ] `/api/v2/contracts` - 계약 관리 API
- [ ] `/api/v2/roles` - 역할 할당 API

#### 3일차: 외부 API 통합
```typescript
// 국세청 사업자등록번호 검증
export class ExternalAPIService {
  async verifyBusinessWithNTS(businessNumber: string): Promise<BusinessVerificationResult>
  async verifyAgeWithNiceAPI(userData: NiceAPIRequest): Promise<AgeVerificationResult>
  async sendParentConsentSMS(parentPhone: string, consentLink: string): Promise<boolean>
}
```

#### 4-5일차: GraphQL API (선택적)
```graphql
type UnifiedIdentity {
  id: ID!
  email: String!
  fullName: String!
  idType: IdType!
  organizations: [Organization!]!
  roles: [RoleAssignment!]!
}

type Query {
  me: UnifiedIdentity
  organization(code: String!): Organization
}

type Mutation {
  createIdentity(input: CreateIdentityInput!): UnifiedIdentity!
  assignRole(input: AssignRoleInput!): RoleAssignment!
}
```

### 위험도 평가: 🟢 낮음
- **기존 시스템 영향 없음**: 새로운 API 엔드포인트
- **점진적 구현**: 서비스별 독립적 개발
- **철저한 테스트**: 단위/통합 테스트 병행

## 🚀 Phase 3: 무중단 마이그레이션 (Week 5-6)

### Week 5: 마이그레이션 준비

#### 1일차: 마이그레이션 전략 실행 ✅
- [x] `004_migration_strategy.sql` - 마이그레이션 프레임워크
- [x] 이중 쓰기 시스템 구현
- [x] 데이터 동기화 뷰 생성

#### 2일차: 마이그레이션 도구 개발
```bash
#!/bin/bash
# scripts/migration-manager.sh

# 마이그레이션 상태 확인
check_migration_status() {
    echo "=== Migration Status ==="
    supabase db exec "SELECT * FROM migration_control ORDER BY phase;"
}

# 단계별 마이그레이션 실행
execute_migration_phase() {
    local phase=$1
    echo "Starting migration phase: $phase"
    
    case $phase in
        "dual_write")
            supabase db exec "SELECT start_migration_phase('user_migration', 'dual_write');"
            ;;
        "data_copy")
            supabase db exec "SELECT migrate_all_users_to_unified(50);"
            ;;
        "validation")
            supabase db exec "SELECT * FROM validate_migration_completeness();"
            ;;
    esac
}
```

#### 3일차: 모니터링 시스템 구축
```typescript
// 마이그레이션 모니터링 대시보드
export class MigrationMonitor {
  async getMigrationProgress(): Promise<MigrationProgress>
  async validateDataConsistency(): Promise<ConsistencyReport>
  async rollbackToPhase(phase: string): Promise<boolean>
  async generateMigrationReport(): Promise<MigrationReport>
}
```

#### 4-5일차: 테스트 환경 마이그레이션
- **개발 환경 마이그레이션**: 전체 프로세스 검증
- **성능 테스트**: 대용량 데이터 마이그레이션
- **롤백 테스트**: 실패 시나리오 검증

### Week 6: 프로덕션 마이그레이션

#### 1일차: 프로덕션 준비
```bash
# 1. 최종 백업
pg_dump $PRODUCTION_DATABASE_URL > final_backup_$(date +%Y%m%d_%H%M).sql

# 2. 마이그레이션 스크립트 배포
supabase db push --dry-run
supabase db push

# 3. 모니터링 활성화
./scripts/enable_migration_monitoring.sh
```

#### 2일차: 이중 쓰기 활성화 (점진적 적용)
```sql
-- 1. 마스터 관리자 계정부터 시작
SELECT migrate_user_to_unified('master-admin-id');

-- 2. 시험 조직 마이그레이션 (10% 트래픽)
SELECT migrate_all_users_to_unified(10);

-- 3. 데이터 일관성 검증
SELECT * FROM validate_migration_completeness();
```

#### 3일차: 전체 데이터 마이그레이션
```bash
# 배치 마이그레이션 (50개씩)
./scripts/migration-manager.sh execute_migration_phase data_copy

# 실시간 모니터링
./scripts/monitor_migration.sh

# 검증
./scripts/validate_migration.sh
```

#### 4일차: API 트래픽 전환
```yaml
# API Gateway 설정 (점진적 트래픽 전환)
traffic_split:
  - version: v1    # 기존 API
    weight: 50%
  - version: v2    # 신규 API  
    weight: 50%

health_checks:
  - endpoint: /api/v2/health
    interval: 30s
    threshold: 3
```

#### 5일차: 검증 및 최적화
- **데이터 무결성 검증**: 100% 완료 확인
- **성능 최적화**: 쿼리 튜닝, 인덱스 최적화
- **모니터링 대시보드**: Grafana/Prometheus 연동

### 위험도 평가: 🔴 높음
- **데이터 손실 위험**: 완전한 백업 및 롤백 계획
- **서비스 중단 위험**: 이중 쓰기로 완화
- **성능 영향**: 점진적 트래픽 전환으로 완화

## 🚀 Phase 4: 프론트엔드 리팩터링 (Week 7-8)

### Week 7: 컴포넌트 리팩터링

#### 1-2일차: 회원가입 플로우 리팩터링
```tsx
// 통합 회원가입 컴포넌트
export function UnifiedRegistrationFlow() {
  const [step, setStep] = useState<RegistrationStep>('identity')
  const [formData, setFormData] = useState<RegistrationFlowData>({})
  
  return (
    <div className="registration-flow">
      {step === 'identity' && <IdentityForm onNext={handleIdentitySubmit} />}
      {step === 'verification' && <VerificationForm />}
      {step === 'organization' && <OrganizationSetup />}
      {step === 'complete' && <RegistrationComplete />}
    </div>
  )
}

// 청소년 근로자 특별 플로우
export function TeenWorkerRegistration() {
  return (
    <>
      <ParentConsentForm />
      <WorkPermitUpload />
      <TeenWorkRestrictions />
    </>
  )
}
```

#### 3일차: 관리 대시보드 업데이트
```tsx
// 통합 사용자 관리
export function UnifiedUserManagement() {
  const { identities, loading } = useIdentities()
  const { organizations } = useOrganizations()
  
  return (
    <div className="user-management">
      <IdentityTable identities={identities} />
      <RoleAssignmentPanel />
      <BusinessVerificationQueue />
    </div>
  )
}

// 프랜차이즈 관리 도구
export function FranchiseManagement() {
  return (
    <>
      <FranchiseHierarchyTree />
      <StoreCreationWizard />
      <FranchiseAnalytics />
    </>
  )
}
```

#### 4-5일차: 권한 기반 UI 구현
```tsx
// 권한 체크 HOC
export function withPermission<T>(
  Component: React.ComponentType<T>,
  requiredPermission: Permission
) {
  return function PermissionWrappedComponent(props: T) {
    const { hasPermission } = usePermissions()
    
    if (!hasPermission(requiredPermission)) {
      return <AccessDeniedMessage />
    }
    
    return <Component {...props} />
  }
}

// 사용 예시
const AdminPanel = withPermission(AdminPanelComponent, {
  resource: 'admin',
  action: 'access'
})
```

### Week 8: 모바일 앱 업데이트

#### 1-2일차: Flutter 서비스 레이어 업데이트
```dart
// lib/services/unified_identity_service.dart
class UnifiedIdentityService {
  Future<UnifiedIdentity> createIdentity(CreateIdentityRequest request) async {
    final response = await httpClient.post('/api/v2/identities', 
      data: request.toJson());
    return UnifiedIdentity.fromJson(response.data);
  }
  
  Future<bool> verifyWithNiceAPI(String identityId, String encData) async {
    // NICE 본인인증 연동
  }
}

// lib/services/organization_service.dart
class OrganizationService {
  Future<Organization> joinByCode(String orgCode) async {
    final response = await httpClient.get('/api/v2/organizations',
      queryParameters: {'code': orgCode});
    return Organization.fromJson(response.data);
  }
}
```

#### 3일차: 회원가입 플로우 업데이트
```dart
// lib/features/registration/presentation/pages/registration_page.dart
class RegistrationPage extends StatefulWidget {
  @override
  _RegistrationPageState createState() => _RegistrationPageState();
}

class _RegistrationPageState extends State<RegistrationPage> {
  RegistrationStep currentStep = RegistrationStep.identity;
  RegistrationFlowData formData = RegistrationFlowData();

  Widget buildStep() {
    switch (currentStep) {
      case RegistrationStep.identity:
        return IdentityForm(onSubmit: handleIdentitySubmit);
      case RegistrationStep.verification:
        return VerificationForm(formData: formData);
      case RegistrationStep.organization:
        return OrganizationSetup(formData: formData);
      default:
        return RegistrationComplete();
    }
  }
}
```

#### 4-5일차: 테스트 및 배포
- **단위 테스트**: 모든 새로운 컴포넌트
- **통합 테스트**: E2E 시나리오
- **사용성 테스트**: UX/UI 검증

### 위험도 평가: 🟡 중간
- **UI/UX 변경**: 사용자 적응 기간 필요
- **기존 기능 호환성**: 점진적 업데이트로 완화
- **모바일 앱 배포**: App Store/Play Store 승인 대기

## 🚀 Phase 5: 테스트 및 배포 (Week 9-10)

### Week 9: 종합 테스트

#### 1일차: 단위 테스트 완성도 100%
```typescript
// tests/services/identity.service.test.ts
describe('IdentityService', () => {
  test('should create personal identity', async () => {
    const request: CreateIdentityRequest = {
      email: 'test@example.com',
      phone: '010-1234-5678',
      fullName: '홍길동',
      birthDate: '1990-01-01',
      idType: 'personal'
    }
    
    const result = await identityService.createIdentity(request)
    expect(result.success).toBe(true)
    expect(result.identity?.idType).toBe('personal')
  })
  
  test('should validate teen work restrictions', async () => {
    const teenIdentity = createTeenIdentity()
    const contract = createInvalidTeenContract() // >35 hours
    
    const validation = await identityService.validateTeenEmployment(
      teenIdentity, contract
    )
    
    expect(validation.isValid).toBe(false)
    expect(validation.errors).toContain('Teen workers cannot work more than 35 hours per week')
  })
})
```

#### 2일차: 통합 테스트
```typescript
// tests/integration/registration.flow.test.ts
describe('Registration Flow Integration', () => {
  test('complete business owner registration', async () => {
    // 1. 사업자 신원 생성
    const identity = await createBusinessOwnerIdentity()
    
    // 2. 사업자 인증
    await verifyBusinessWithNTS(identity.businessNumber!)
    
    // 3. 조직 생성
    const org = await createOrganization({
      name: 'Test Business',
      orgType: 'business_owner',
      ownerIdentityId: identity.id
    })
    
    // 4. 관리자 권한 할당
    const roleAssignment = await assignAdminRole(identity.id, org.id)
    
    expect(org.ownerIdentityId).toBe(identity.id)
    expect(roleAssignment.role).toBe('admin')
  })
})
```

#### 3일차: E2E 테스트 (Playwright)
```typescript
// tests/e2e/franchise.management.test.ts
test('franchise headquarters can create stores', async ({ page }) => {
  // 프랜차이즈 본사 로그인
  await page.goto('/login')
  await page.fill('[data-testid=email]', 'franchise@example.com')
  await page.fill('[data-testid=password]', 'password123')
  await page.click('[data-testid=submit]')
  
  // 가맹점 생성
  await page.goto('/admin/franchise/stores')
  await page.click('[data-testid=create-store]')
  
  await page.fill('[data-testid=store-name]', '홍대점')
  await page.fill('[data-testid=store-address]', '서울시 마포구 홍대입구')
  await page.click('[data-testid=submit]')
  
  // 결과 검증
  await expect(page.locator('[data-testid=store-created]')).toBeVisible()
  await expect(page.locator('text=홍대점')).toBeVisible()
})
```

#### 4-5일차: 성능 테스트
```bash
# 부하 테스트 (Artillery)
artillery run tests/performance/identity-creation.yml

# 데이터베이스 성능 테스트
pgbench -c 10 -j 2 -t 1000 $DATABASE_URL

# 메모리 사용량 모니터링
node --inspect tests/performance/memory-leak.test.js
```

### Week 10: 배포 및 모니터링

#### 1일차: Staging 환경 배포
```bash
# 1. 스테이징 환경 배포
./scripts/deploy-staging.sh

# 2. 스모크 테스트
npm run test:smoke:staging

# 3. 성능 모니터링 활성화
./scripts/setup-monitoring.sh staging
```

#### 2일차: 프로덕션 배포 준비
```yaml
# .github/workflows/deploy-production.yml
name: Production Deployment
on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Integration Tests
        run: npm run test:integration
      - name: Deploy Database Migrations
        run: supabase db push --db-url=$PROD_DATABASE_URL
      - name: Deploy Application
        run: ./scripts/deploy-production.sh
      - name: Verify Deployment
        run: ./scripts/verify-production.sh
```

#### 3일차: 프로덕션 배포
```bash
# 1. 배포 전 체크리스트 확인
./scripts/pre-deployment-checklist.sh

# 2. Blue-Green 배포 시작
./scripts/deploy-blue-green.sh

# 3. 트래픽 전환 (10% → 50% → 100%)
./scripts/switch-traffic.sh 10
# 30분 모니터링 후
./scripts/switch-traffic.sh 50
# 1시간 모니터링 후
./scripts/switch-traffic.sh 100
```

#### 4일차: 모니터링 및 최적화
```typescript
// 실시간 모니터링 대시보드
const monitoringMetrics = {
  // API 응답 시간
  apiResponseTime: {
    target: '<200ms',
    current: '180ms',
    status: 'green'
  },
  
  // 데이터베이스 성능
  dbQueryTime: {
    target: '<50ms',
    current: '45ms', 
    status: 'green'
  },
  
  // 에러율
  errorRate: {
    target: '<0.1%',
    current: '0.05%',
    status: 'green'
  },
  
  // 마이그레이션 진행률
  migrationProgress: {
    completed: 100,
    validated: 100,
    status: 'completed'
  }
}
```

#### 5일차: 최종 검증 및 문서화
- **기능 검증**: 모든 신규 기능 정상 작동 확인
- **성능 검증**: 응답 시간, 처리량 목표 달성 확인
- **보안 검증**: 권한 체계, 데이터 보호 확인
- **문서 업데이트**: API 문서, 사용자 가이드 업데이트

### 위험도 평가: 🟡 중간
- **배포 실패**: Blue-Green 배포로 롤백 용이
- **성능 저하**: 점진적 트래픽 전환으로 완화
- **사용자 혼란**: 충분한 문서화 및 교육으로 완화

## 📊 성공 지표 (KPI)

### 기술적 지표
- **마이그레이션 완료율**: 100% (목표)
- **API 응답 시간**: <200ms (목표)
- **데이터베이스 쿼리 시간**: <50ms (목표)
- **에러율**: <0.1% (목표)
- **테스트 커버리지**: >90% (목표)

### 비즈니스 지표
- **사용자 만족도**: >4.5/5.0 (목표)
- **가입 전환율**: 현재 대비 +20% (목표)
- **관리 효율성**: 사용자 관리 시간 50% 단축 (목표)
- **시스템 확장성**: 10x 사용자 증가 대응 (목표)

### 규정 준수 지표
- **청소년 근로 보호**: 100% 법적 준수 (필수)
- **사업자 인증**: 실시간 검증 시스템 (필수)
- **데이터 보호**: GDPR/개인정보보호법 준수 (필수)
- **감사 추적**: 모든 권한 변경 기록 (필수)

## 🚨 위험 관리 계획

### Critical Risk (🔴 높음)
1. **데이터 손실**
   - 완전한 백업 시스템
   - 실시간 복제 환경
   - 1분 이내 롤백 시스템

2. **서비스 중단**
   - Blue-Green 배포
   - 헬스 체크 자동화
   - 자동 페일오버

### High Risk (🟡 중간)
3. **성능 저하**
   - 점진적 트래픽 전환
   - 실시간 모니터링
   - 자동 스케일링

4. **보안 취약점**
   - 보안 코드 리뷰
   - 침투 테스트
   - 권한 체계 감사

### Medium Risk (🟢 낮음)
5. **사용자 혼란**
   - 충분한 문서화
   - 사용자 교육
   - 단계별 기능 공개

## 📅 일정 요약

| Phase | 기간 | 핵심 활동 | 완료 조건 |
|-------|------|-----------|-----------|
| Phase 1 | Week 1-2 | 데이터베이스 통합 | 통합 스키마 적용 완료 |
| Phase 2 | Week 3-4 | 서비스/API 구현 | 모든 비즈니스 로직 구현 |
| Phase 3 | Week 5-6 | 무중단 마이그레이션 | 100% 데이터 마이그레이션 |
| Phase 4 | Week 7-8 | 프론트엔드 업데이트 | 모든 UI 컴포넌트 완성 |
| Phase 5 | Week 9-10 | 테스트 및 배포 | 프로덕션 배포 완료 |

## 🎯 다음 단계

1. **Phase 1 실행**: 스키마 마이그레이션 시작
2. **팀 교육**: 새로운 아키텍처 및 API 교육
3. **모니터링 설정**: 실시간 모니터링 대시보드 구축
4. **문서화**: 개발자 및 사용자 문서 업데이트
5. **피드백 수집**: 베타 사용자 피드백 반영

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-09-06
**담당자**: DOT 개발팀
**승인자**: [승인자 이름]