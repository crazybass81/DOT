# DOT 출석 서비스 - 포괄적 네이밍 통일 마이그레이션 전략

## 1. 심층 분석 결과

### 1.1 네이밍 충돌 매트릭스

| 컴포넌트 | Legacy 네이밍 | 현재 혼재 | 새로운 ID-ROLE-PAPER |
|---------|-------------|----------|------------------|
| **역할 시스템** | UserRole (MASTER_ADMIN, ADMIN, MANAGER, WORKER) | UnifiedRole (master, admin, manager, worker) | RoleType (SEEKER, WORKER, MANAGER, OWNER, etc.) |
| **아이디 분류** | 단일 사용자 기반 | IdType (personal, business_owner, corporation) | IdType (PERSONAL, CORPORATE) |
| **조직 타입** | OrganizationType (PERSONAL, CORP, FRANCHISE) | OrgType (personal, business_owner, corporation) | BusinessType (individual, corporate) |
| **권한 시스템** | 4단계 계층 | 5단계 혼재 | 7단계 동적 계층 |
| **페이퍼 시스템** | 없음 | 부분적 구현 | PaperType (6가지 문서) |

### 1.2 코드베이스 영향도 분석

#### 높은 영향도 (Critical)
- **src/types/** (12개 파일): 타입 정의 불일치
- **src/services/** (16개 서비스): 다중 역할 시스템 사용  
- **app/api/** (마스터 어드민 API): MASTER_ADMIN 하드코딩
- **app/super-admin/**, **app/master-admin/** (페이지): legacy role 의존

#### 중간 영향도 (Important)  
- **src/components/** (대시보드, 관리 컴포넌트): role 기반 UI 렌더링
- **tests/** (통합 테스트): 여러 role 시스템 혼재
- **middleware.ts**: 권한 검증 로직

#### 낮은 영향도 (Minor)
- **app/auth/**, **app/onboarding/**: 주로 인증 흐름
- 유틸리티 함수들: 비즈니스 로직과 분리

### 1.3 주요 발견 사항

1. **3개의 병렬 역할 시스템**:
   - Legacy: `UserRole` (4계층)
   - Unified: `UnifiedRole` (5계층) 
   - New: `RoleType` (7계층)

2. **테스트 시스템 불일치**:
   - `tests/setup/id-role-paper-test-setup.ts`가 새로운 아키텍처 사용
   - 기존 통합 테스트들은 legacy 시스템 의존

3. **데이터베이스 스키마 갭**:
   - `database.ts`의 paper_type이 ID-ROLE-PAPER와 다름
   - Role 계산 로직이 DB 함수와 TypeScript 코드에 분산

## 2. 통합 네이밍 컨벤션 (확정안)

### 2.1 핵심 원칙
1. **ID-ROLE-PAPER 아키텍처 채택**: 새로운 표준으로 정착
2. **UPPER_CASE Enums**: 타입 안전성과 일관성
3. **camelCase Properties**: TypeScript/JavaScript 표준
4. **영어 우선, 한국어 디스플레이**: 시스템 내부 vs UI 분리
5. **명확한 네임스페이스**: IdRolePaper 접두어 활용

### 2.2 표준화된 타입 정의

```typescript
// === 핵심 ID-ROLE-PAPER 타입 ===
enum IdType {
  PERSONAL = 'personal',      // 개인 ID
  CORPORATE = 'corporate'     // 기업 ID
}

enum RoleType {
  SEEKER = 'SEEKER',           // 구직자 (기본)
  WORKER = 'WORKER',           // 워커 (근로계약서)
  MANAGER = 'MANAGER',         // 매니저 (근로계약서 + 권한위임장)
  SUPERVISOR = 'SUPERVISOR',   // 수퍼바이저 (근로계약서 + 수퍼바이저 권한위임장)  
  OWNER = 'OWNER',             // 사업자관리자 (사업자등록증)
  FRANCHISEE = 'FRANCHISEE',   // 가맹점주 (사업자등록증 + 가맹계약서)
  FRANCHISOR = 'FRANCHISOR'    // 가맹본부관리자 (사업자등록증 + 가맹본부등록증)
}

enum PaperType {
  BUSINESS_REGISTRATION = 'Business Registration',
  EMPLOYMENT_CONTRACT = 'Employment Contract',
  AUTHORITY_DELEGATION = 'Authority Delegation',
  SUPERVISOR_AUTHORITY_DELEGATION = 'Supervisor Authority Delegation',
  FRANCHISE_AGREEMENT = 'Franchise Agreement',
  FRANCHISE_HQ_REGISTRATION = 'Franchise HQ Registration'
}

enum BusinessType {
  INDIVIDUAL = 'individual',   // 개인사업자
  CORPORATE = 'corporate'      // 법인사업자
}
```

### 2.3 호환성 레이어 

```typescript
// Legacy 호환을 위한 매핑
const ROLE_COMPATIBILITY_MAP = {
  // Legacy UserRole → New RoleType
  'MASTER_ADMIN': 'FRANCHISOR',
  'SUPER_ADMIN': 'FRANCHISOR', 
  'BUSINESS_ADMIN': 'OWNER',
  'ADMIN': 'OWNER',
  'MANAGER': 'MANAGER', 
  'WORKER': 'WORKER',
  'EMPLOYEE': 'WORKER',
  
  // Unified UnifiedRole → New RoleType  
  'master': 'FRANCHISOR',
  'franchise_admin': 'FRANCHISOR',
  'admin': 'OWNER',
  'manager': 'MANAGER',
  'worker': 'WORKER'
};

// 역방향 매핑 (display용)
const ROLE_DISPLAY_MAP = {
  'FRANCHISOR': '마스터 관리자',
  'FRANCHISEE': '가맹점주', 
  'OWNER': '사업자 관리자',
  'MANAGER': '매니저',
  'SUPERVISOR': '수퍼바이저',
  'WORKER': '워커', 
  'SEEKER': '구직자'
};
```

## 3. 단계적 마이그레이션 계획

### Phase 1: 타입 시스템 통합 (1-2주)

#### 1.1 새로운 통합 타입 정의
- [ ] `src/types/id-role-paper-unified.ts` 생성
- [ ] 모든 core types를 단일 파일로 통합
- [ ] 호환성 레이어 및 변환 유틸리티 추가

#### 1.2 기존 타입 파일 정리  
- [ ] `user.types.ts` → deprecated, 호환성 유지
- [ ] `unified.types.ts` → deprecated, 호환성 유지
- [ ] `organization.types.ts` → 새로운 시스템에 맞게 업데이트

#### 1.3 변환 유틸리티 개발
```typescript
// src/utils/role-migration.ts
export class RoleMigrationUtils {
  static convertLegacyRole(legacyRole: string): RoleType;
  static convertToDisplayName(role: RoleType): string;
  static validateRoleTransition(from: RoleType, to: RoleType): boolean;
}
```

### Phase 2: 서비스 레이어 마이그레이션 (2-3주)

#### 2.1 핵심 서비스 업데이트
- [ ] `authService.ts` → 새로운 RoleType 사용
- [ ] `roleManagementService.ts` → ID-ROLE-PAPER 계층 적용
- [ ] `organizationService.ts` → 새로운 Business/Organization 분리

#### 2.2 ID-ROLE-PAPER 서비스 완성
- [ ] `identityService.ts` → Personal/Corporate ID 관리
- [ ] `paperService.ts` → 문서 기반 역할 계산 
- [ ] `permissionService.ts` → 새로운 권한 시스템

#### 2.3 호환성 래퍼 서비스
```typescript
// src/services/legacy-compat.ts
export class LegacyCompatService {
  static async getUserRole(userId: string): Promise<string>; // legacy format
  static async convertToNewRole(legacyRole: string): Promise<RoleType>;
}
```

### Phase 3: 컴포넌트 레이어 마이그레이션 (2-3주)

#### 3.1 관리자 컴포넌트 업데이트
- [ ] `master-admin/` 컴포넌트들 → 새로운 role 시스템
- [ ] `dashboard/` 컴포넌트들 → 동적 역할 기반 UI
- [ ] `id-role-paper/` 컴포넌트들 → 완전한 기능 구현

#### 3.2 권한 기반 렌더링 개선
```typescript
// components/auth/RoleGuard.tsx
interface RoleGuardProps {
  allowedRoles: RoleType[];
  requiredPapers?: PaperType[];
  businessContext?: string;
  fallback?: React.ReactNode;
}
```

### Phase 4: API & 데이터베이스 마이그레이션 (3-4주)

#### 4.1 데이터베이스 스키마 업데이트
```sql
-- 새로운 테이블 구조 (이미 부분적으로 존재)
CREATE TABLE unified_identities (
  id UUID PRIMARY KEY,
  id_type id_type_enum,
  email VARCHAR UNIQUE,
  phone VARCHAR,
  full_name VARCHAR NOT NULL,
  -- ... ID-ROLE-PAPER 컬럼들
);

CREATE TABLE business_registrations (
  id UUID PRIMARY KEY,
  registration_number VARCHAR UNIQUE,
  business_name VARCHAR,
  business_type business_type_enum,
  owner_identity_id UUID REFERENCES unified_identities(id)
);

CREATE TABLE papers (
  id UUID PRIMARY KEY,
  paper_type paper_type_enum,
  owner_identity_id UUID REFERENCES unified_identities(id),
  related_business_id UUID REFERENCES business_registrations(id),
  -- ... paper 관련 컬럼들
);
```

#### 4.2 API 엔드포인트 마이그레이션
- [ ] `/api/master-admin/` → `/api/admin/` (새로운 권한 시스템)
- [ ] 새로운 ID-ROLE-PAPER API 엔드포인트 추가
- [ ] Legacy API 호환성 유지 (deprecation 경고)

#### 4.3 데이터 마이그레이션 스크립트
```typescript
// scripts/migrate-roles-to-id-role-paper.ts
export class RoleDataMigration {
  static async migrateExistingUsers(): Promise<void>;
  static async createPapersFromLegacyRoles(): Promise<void>;
  static async validateMigrationIntegrity(): Promise<boolean>;
}
```

### Phase 5: 테스트 & 검증 (2주)

#### 5.1 포괄적 테스트 업데이트
- [ ] 모든 역할 전환 시나리오 테스트
- [ ] 권한 시스템 End-to-End 테스트
- [ ] 데이터 마이그레이션 검증 테스트

#### 5.2 성능 최적화
- [ ] 역할 계산 캐싱 시스템
- [ ] 권한 검증 최적화
- [ ] 데이터베이스 인덱스 최적화

## 4. 위험도 관리

### 4.1 높은 위험도 (High Risk)
- **기존 사용자 데이터 손실**: 철저한 백업 및 롤백 계획
- **권한 시스템 오작동**: 단계적 롤아웃 및 fallback 메커니즘
- **프로덕션 서비스 중단**: Blue-Green 배포 전략

### 4.2 중간 위험도 (Medium Risk)  
- **Legacy API 호환성**: Deprecation 경고 및 단계적 제거
- **타입 불일치 오류**: 엄격한 TypeScript 검증
- **UI/UX 일관성**: 컴포넌트 테스트 강화

### 4.3 위험 완화 전략

#### 4.1 백업 및 롤백 계획
```bash
# 데이터베이스 백업
pg_dump > backup_pre_migration_$(date +%Y%m%d).sql

# 코드 백업 브랜치
git checkout -b backup/pre-id-role-paper-migration
git push origin backup/pre-id-role-paper-migration
```

#### 4.2 단계적 활성화
```typescript
// Feature flag 시스템
const FEATURE_FLAGS = {
  USE_ID_ROLE_PAPER: process.env.ENABLE_ID_ROLE_PAPER === 'true',
  LEGACY_COMPAT_MODE: process.env.LEGACY_COMPAT === 'true'
};
```

## 5. 성공 지표 (KPIs)

### 5.1 기술적 지표
- [ ] 타입 안전성: TypeScript 컴파일 에러 0개
- [ ] 테스트 커버리지: 새로운 시스템 95% 이상
- [ ] 성능 지표: 권한 검증 응답시간 < 50ms
- [ ] 호환성: Legacy API 호출 성공률 99.9%

### 5.2 비즈니스 지표  
- [ ] 사용자 경험: 권한 오류율 < 0.1%
- [ ] 시스템 안정성: 99.9% uptime 유지
- [ ] 개발 생산성: 새로운 역할 추가 시간 50% 단축

### 5.3 검증 체크리스트
- [ ] 모든 기존 사용자가 올바른 새 역할로 매핑됨
- [ ] 권한 시스템이 예상대로 동작함  
- [ ] UI에서 새로운 역할이 올바르게 표시됨
- [ ] API 응답이 새로운 형식으로 정확히 반환됨
- [ ] 데이터베이스 일관성 검증 통과

## 6. 다음 액션 아이템

### 즉시 시작 (Week 1)
1. [ ] **Phase 1 착수**: 통합 타입 정의 개발
2. [ ] **호환성 레이어 구현**: Legacy role 변환 유틸리티
3. [ ] **테스트 환경 설정**: 마이그레이션 전용 DB 환경

### 2주차 목표
1. [ ] **핵심 서비스 마이그레이션 시작**: authService, roleManagementService
2. [ ] **컴포넌트 영향도 분석 완료**: UI 변경사항 문서화
3. [ ] **데이터 마이그레이션 스크립트 초안**: 기존 데이터 변환 로직

### 4주차 목표
1. [ ] **Phase 1-2 완료**: 타입 시스템 + 서비스 레이어 마이그레이션
2. [ ] **통합 테스트 환경 구축**: 새로운 시스템 검증
3. [ ] **프로덕션 배포 계획 수립**: Blue-Green 배포 전략

---

**최종 목표**: 2025년 10월 중순까지 ID-ROLE-PAPER 아키텍처로 완전 전환  
**책임자**: 시스템 아키텍트 팀  
**리뷰 주기**: 매주 금요일 진행상황 점검  