# DOT 출석 서비스 네이밍 통일 분석 보고서

## 1. 현재 네이밍 현황 분석

### 1.1 발견된 네이밍 패턴들

#### 역할(Role) 관련 네이밍
- **id-role-paper.ts**: `RoleType` enum 사용
  - SEEKER, WORKER, MANAGER, OWNER, FRANCHISEE, FRANCHISOR, SUPERVISOR (7가지)
- **unified.types.ts**: `UnifiedRole` enum 사용  
  - master, admin, manager, worker, franchise_admin (5가지)
- **user.types.ts**: `UserRole` enum 사용
  - MASTER_ADMIN, ADMIN, MANAGER, WORKER, EMPLOYEE, BUSINESS_ADMIN, SUPER_ADMIN (7가지)
- **database.ts**: 문자열 타입으로 정의
  - 'SEEKER' | 'WORKER' | 'SUPERVISOR' | 'MANAGER' | 'OWNER' | 'FRANCHISEE' | 'FRANCHISOR'

#### 아이디(ID) 관련 네이밍  
- **id-role-paper.ts**: `IdType` enum
  - PERSONAL, CORPORATE (2가지)
- **unified.types.ts**: `IdType` type
  - personal, business_owner, corporation, franchise_hq (4가지)
- **organization.types.ts**: `OrganizationType` enum
  - PERSONAL, CORP, FRANCHISE (3가지)

#### 페이퍼(Paper) 관련 네이밍
- **id-role-paper.ts**: `PaperType` enum (6가지)
  - BUSINESS_REGISTRATION, EMPLOYMENT_CONTRACT, AUTHORITY_DELEGATION, SUPERVISOR_AUTHORITY_DELEGATION, FRANCHISE_AGREEMENT, FRANCHISE_HQ_REGISTRATION
- **database.ts**: 문자열 타입 (6가지)  
  - 'BUSINESS_REGISTRATION' | 'TAX_REGISTRATION' | 'EMPLOYMENT_INSURANCE' | 'INDUSTRIAL_ACCIDENT_INSURANCE' | 'HEALTH_INSURANCE' | 'PENSION_INSURANCE'

### 1.2 주요 문제점

1. **역할 체계 불일치**
   - 3가지 다른 역할 enum이 동시에 존재
   - 계층 구조와 권한이 각각 다름
   - Legacy 호환을 위한 중복된 역할들 (EMPLOYEE, BUSINESS_ADMIN)

2. **아이디 분류 혼재**
   - Personal/Corporate vs Personal/Business_owner/Corporation 분류
   - 프랜차이즈 관련 분류 불일치

3. **페이퍼 타입 불일치**  
   - ID-ROLE-PAPER 아키텍처의 6가지 vs 데이터베이스의 6가지가 다름
   - 실제 업무 문서 vs 시스템 문서 차이

4. **네이밍 컨벤션 혼재**
   - UPPER_CASE vs camelCase vs kebab-case
   - 한국어/영어 혼재

## 2. ID-ROLE-PAPER 아키텍처 분석

### 2.1 새로운 분류 체계 (id-role-paper.ts 기준)

#### 아이디 분류 (2가지)
- `PERSONAL`: 개인 식별자
- `CORPORATE`: 기업/법인 식별자

#### 역할 분류 (7단계 계층)
1. `SEEKER`: 구직자 (최하위)
2. `WORKER`: 워커/근로자
3. `MANAGER`: 매니저 (Worker 권한 필요)  
4. `SUPERVISOR`: 수퍼바이저 (Worker 권한 필요)
5. `OWNER`: 사업자관리자 
6. `FRANCHISEE`: 가맹점주
7. `FRANCHISOR`: 가맹본부관리자 (최상위)

#### 페이퍼 분류 (6가지)
1. `BUSINESS_REGISTRATION`: 사업자등록증
2. `EMPLOYMENT_CONTRACT`: 근로계약서
3. `AUTHORITY_DELEGATION`: 권한위임장
4. `SUPERVISOR_AUTHORITY_DELEGATION`: 수퍼바이저 권한위임장
5. `FRANCHISE_AGREEMENT`: 가맹계약서  
6. `FRANCHISE_HQ_REGISTRATION`: 가맹본부 등록증

### 2.2 역할 계산 규칙

- SEEKER: 어떤 PAPER도 없는 경우
- WORKER: Employment Contract 보유
- MANAGER: Employment Contract + Authority Delegation (Worker 전제)
- SUPERVISOR: Employment Contract + Supervisor Authority Delegation (Worker 전제)  
- OWNER: Business Registration 보유
- FRANCHISEE: Business Registration + Franchise Agreement
- FRANCHISOR: Business Registration + Franchise HQ Registration

## 3. 현재 시스템 영향도 분석

### 3.1 데이터베이스 레이어
- **테이블**: organizations, identities, businesses, papers, roles, permissions
- **이슈**: database.ts의 paper_type이 ID-ROLE-PAPER 아키텍처와 불일치

### 3.2 서비스 레이어  
발견된 서비스들:
- userService.ts, authService.ts, identityService.ts
- unifiedAuthService.ts, multiRoleAuthService.ts  
- roleManagementService.ts, organizationService.ts

### 3.3 컴포넌트 레이어
- master-admin 컴포넌트들에서 여러 role 타입 사용
- id-role-paper 전용 컴포넌트 존재

### 3.4 API 레이어
- app/api, app/super-admin 등에서 다양한 role 시스템 사용

## 4. 통일된 네이밍 컨벤션 제안

### 4.1 기본 원칙
1. **ID-ROLE-PAPER 아키텍처를 표준으로 채택**
2. **Pascal Case for Enums**: UPPER_CASE 유지
3. **camelCase for properties**: TypeScript 표준 준수
4. **영어 우선**: 시스템 내부는 영어, 디스플레이용만 한국어  
5. **명시적 네임스페이스**: IdRolePaper 접두어 사용

### 4.2 통일 네이밍 체계

#### Core Types
```typescript
// 아이디 분류
enum IdType {
  PERSONAL = 'personal',
  CORPORATE = 'corporate'
}

// 역할 분류 (7단계)
enum RoleType {
  SEEKER = 'SEEKER',
  WORKER = 'WORKER', 
  MANAGER = 'MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  OWNER = 'OWNER',
  FRANCHISEE = 'FRANCHISEE',
  FRANCHISOR = 'FRANCHISOR'
}

// 페이퍼 분류 (6가지)
enum PaperType {
  BUSINESS_REGISTRATION = 'Business Registration',
  EMPLOYMENT_CONTRACT = 'Employment Contract', 
  AUTHORITY_DELEGATION = 'Authority Delegation',
  SUPERVISOR_AUTHORITY_DELEGATION = 'Supervisor Authority Delegation',
  FRANCHISE_AGREEMENT = 'Franchise Agreement',
  FRANCHISE_HQ_REGISTRATION = 'Franchise HQ Registration'
}
```

## 5. 마이그레이션 전략

### 5.1 단계별 접근법
1. **Phase 1**: 타입 정의 통일 (types 디렉토리)
2. **Phase 2**: 서비스 레이어 마이그레이션  
3. **Phase 3**: 컴포넌트 레이어 마이그레이션
4. **Phase 4**: 데이터베이스 스키마 업데이트
5. **Phase 5**: API 레이어 마이그레이션

### 5.2 호환성 보장 방안
- Legacy 타입들을 deprecated로 마킹하되 유지
- 타입 변환 유틸리티 함수 제공
- 단계적 마이그레이션으로 기존 기능 보호

## 6. 다음 단계 

1. **전체 코드베이스 네이밍 현황 상세 조사**
2. **마이그레이션 우선순위 결정** 
3. **타입 변환 유틸리티 개발**
4. **단계별 마이그레이션 계획 수립**
5. **테스트 시나리오 작성**

---

**생성일시**: 2025-09-09  
**분석 범위**: `/home/ec2-user/DOT/services/attendance/web/src/types/` 
**다음 업데이트**: 전체 코드베이스 분석 완료 후