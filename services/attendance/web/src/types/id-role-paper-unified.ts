/**
 * ID-ROLE-PAPER Unified Type System
 * 
 * 단일 진실 소스(Single Source of Truth)로서의 통합 타입 정의
 * 모든 legacy 시스템과의 호환성을 보장하면서 새로운 아키텍처 구현
 * 
 * Architecture: Personal/Corporate ID → Papers → Dynamic Roles → Permissions
 * Created: 2025-09-09
 * Migration Phase: 1 (Type System Unification)
 */

// ========== CORE ENUMS (Single Source of Truth) ==========

/**
 * Identity Type Classification
 * 개인/기업 구분을 통한 명확한 신원 분류
 */
export enum IdType {
  PERSONAL = 'personal',    // 개인 신원 - 자연인
  CORPORATE = 'corporate'   // 기업 신원 - 법인/사업체
}

/**
 * Dynamic Role System (7-tier hierarchy)
 * Papers에 의해 동적으로 계산되는 역할 시스템
 * 계층: SEEKER < WORKER < MANAGER/SUPERVISOR < OWNER < FRANCHISEE < FRANCHISOR
 */
export enum RoleType {
  SEEKER = 'SEEKER',           // 구직자 - No papers required
  WORKER = 'WORKER',           // 워커 - Employment Contract required
  MANAGER = 'MANAGER',         // 매니저 - Employment Contract + Authority Delegation
  SUPERVISOR = 'SUPERVISOR',   // 수퍼바이저 - Employment Contract + Supervisor Authority Delegation
  OWNER = 'OWNER',             // 사업자관리자 - Business Registration required
  FRANCHISEE = 'FRANCHISEE',   // 가맹점주 - Business Registration + Franchise Agreement
  FRANCHISOR = 'FRANCHISOR'    // 가맹본부관리자 - Business Registration + Franchise HQ Registration
}

/**
 * Paper Document Types
 * 역할을 부여하는 6가지 핵심 문서 타입
 */
export enum PaperType {
  BUSINESS_REGISTRATION = 'Business Registration',                    // 사업자등록증
  EMPLOYMENT_CONTRACT = 'Employment Contract',                       // 근로계약서
  AUTHORITY_DELEGATION = 'Authority Delegation',                     // 권한위임장
  SUPERVISOR_AUTHORITY_DELEGATION = 'Supervisor Authority Delegation', // 수퍼바이저 권한위임장
  FRANCHISE_AGREEMENT = 'Franchise Agreement',                       // 가맹계약서
  FRANCHISE_HQ_REGISTRATION = 'Franchise HQ Registration'            // 가맹본부 등록증
}

/**
 * Business Entity Types
 * 사업체 형태 분류
 */
export enum BusinessType {
  INDIVIDUAL = 'individual',   // 개인사업자
  CORPORATE = 'corporate'      // 법인사업자
}

/**
 * Document/Paper Verification Status
 * 문서 검증 상태
 */
export enum VerificationStatus {
  PENDING = 'pending',     // 검증 대기
  VERIFIED = 'verified',   // 검증 완료
  REJECTED = 'rejected'    // 검증 거부
}

// ========== LEGACY COMPATIBILITY MAPPINGS ==========

/**
 * Legacy Role Compatibility Matrix
 * 기존 시스템의 역할을 새로운 RoleType으로 매핑
 */
export const LEGACY_ROLE_MAPPING: Record<string, RoleType> = {
  // Legacy UserRole → New RoleType
  'MASTER_ADMIN': RoleType.FRANCHISOR,
  'SUPER_ADMIN': RoleType.FRANCHISOR,
  'BUSINESS_ADMIN': RoleType.OWNER,
  'ADMIN': RoleType.OWNER,
  'MANAGER': RoleType.MANAGER,
  'WORKER': RoleType.WORKER,
  'EMPLOYEE': RoleType.WORKER,
  
  // Unified UnifiedRole → New RoleType
  'master': RoleType.FRANCHISOR,
  'franchise_admin': RoleType.FRANCHISOR,
  'admin': RoleType.OWNER,
  'manager': RoleType.MANAGER,
  'worker': RoleType.WORKER
};

/**
 * Role Display Names (Korean)
 * UI에서 사용할 한국어 역할명
 */
export const ROLE_DISPLAY_NAMES: Record<RoleType, string> = {
  [RoleType.SEEKER]: '구직자',
  [RoleType.WORKER]: '워커',
  [RoleType.MANAGER]: '매니저',
  [RoleType.SUPERVISOR]: '수퍼바이저',
  [RoleType.OWNER]: '사업자관리자',
  [RoleType.FRANCHISEE]: '가맹점주',
  [RoleType.FRANCHISOR]: '가맹본부관리자'
};

/**
 * Paper Display Names (Korean)
 * UI에서 사용할 한국어 문서명
 */
export const PAPER_DISPLAY_NAMES: Record<PaperType, string> = {
  [PaperType.BUSINESS_REGISTRATION]: '사업자등록증',
  [PaperType.EMPLOYMENT_CONTRACT]: '근로계약서',
  [PaperType.AUTHORITY_DELEGATION]: '권한위임장',
  [PaperType.SUPERVISOR_AUTHORITY_DELEGATION]: '수퍼바이저 권한위임장',
  [PaperType.FRANCHISE_AGREEMENT]: '가맹계약서',
  [PaperType.FRANCHISE_HQ_REGISTRATION]: '가맹본부 등록증'
};

/**
 * Role Hierarchy Levels
 * 권한 계산을 위한 역할 계층 수치
 */
export const ROLE_HIERARCHY: Record<RoleType, number> = {
  [RoleType.SEEKER]: 1,
  [RoleType.WORKER]: 2,
  [RoleType.MANAGER]: 3,
  [RoleType.SUPERVISOR]: 4,
  [RoleType.OWNER]: 5,
  [RoleType.FRANCHISEE]: 6,
  [RoleType.FRANCHISOR]: 7
};

// ========== CORE INTERFACES ==========

/**
 * Unified Identity
 * Personal과 Corporate ID를 통합한 단일 identity 모델
 */
export interface UnifiedIdentity {
  id: string;
  idType: IdType;
  email: string;
  phone?: string;
  fullName: string;
  birthDate?: Date;                     // Personal ID only
  idNumber?: string;                    // Personal: SSN, Corporate: Business Registration Number
  authUserId: string;                   // Links to Supabase auth.users
  linkedPersonalId?: string;            // For Corporate IDs: links to Personal ID owner
  isVerified: boolean;
  isActive: boolean;
  profileData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Business Registration
 * 사업체 등록 정보 - Owner 역할의 기반
 */
export interface BusinessRegistration {
  id: string;
  registrationNumber: string;
  businessName: string;
  businessType: BusinessType;
  ownerIdentityId: string;
  registrationData: Record<string, any>;
  verificationStatus: VerificationStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paper Document
 * 역할을 부여하는 핵심 문서
 */
export interface Paper {
  id: string;
  paperType: PaperType;
  ownerIdentityId: string;              // Who owns this paper
  relatedBusinessId?: string;           // Business context (if applicable)
  paperData: Record<string, any>;      // Paper-specific metadata
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;                   // Optional expiration
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Computed Role
 * Papers로부터 자동 계산된 역할
 */
export interface ComputedRole {
  id: string;
  identityId: string;
  role: RoleType;
  sourcePapers: string[];              // Paper IDs that grant this role
  businessContextId?: string;          // Business scope for this role
  isActive: boolean;
  computedAt: Date;
}

/**
 * Permission Definition
 * 역할 기반 권한 정의
 */
export interface Permission {
  resource: string;                    // 리소스 (e.g., 'attendance', 'reports')
  action: string;                      // 액션 (e.g., 'read', 'write', 'delete')
  conditions?: Record<string, any>;    // 추가 조건 (e.g., own records only)
  businessContext?: boolean;           // 비즈니스 스코프 필요 여부
}

/**
 * Role-based Permission Set
 * 역할별 권한 집합
 */
export interface RolePermissions {
  role: RoleType;
  permissions: Permission[];
  inheritsFrom?: RoleType[];           // 상속받는 역할들
}

// ========== ROLE CALCULATION SYSTEM ==========

/**
 * Role Calculation Rule
 * Papers 조합에서 역할을 도출하는 규칙
 */
export interface RoleCalculationRule {
  papers: PaperType[];                 // Required papers
  resultRole: RoleType;                // Resulting role
  description: string;                 // Rule description
  dependencies?: RoleType[];           // Prerequisite roles
  businessContext?: boolean;           // Requires business context
  corporateIdRule?: boolean;           // Special rules for Corporate IDs
}

/**
 * Default Role Calculation Rules
 * ID-ROLE-PAPER 아키텍처의 핵심 규칙들
 */
export const ROLE_CALCULATION_RULES: RoleCalculationRule[] = [
  {
    papers: [],
    resultRole: RoleType.SEEKER,
    description: '어떤 PAPER도 갖지 않는 기본 상태'
  },
  {
    papers: [PaperType.EMPLOYMENT_CONTRACT],
    resultRole: RoleType.WORKER,
    description: '근로계약서 보유자',
    businessContext: true
  },
  {
    papers: [PaperType.EMPLOYMENT_CONTRACT, PaperType.AUTHORITY_DELEGATION],
    resultRole: RoleType.MANAGER,
    description: '근로계약서 + 권한위임장 보유자',
    dependencies: [RoleType.WORKER],
    businessContext: true
  },
  {
    papers: [PaperType.EMPLOYMENT_CONTRACT, PaperType.SUPERVISOR_AUTHORITY_DELEGATION],
    resultRole: RoleType.SUPERVISOR,
    description: '근로계약서 + 수퍼바이저 권한위임장 보유자',
    dependencies: [RoleType.WORKER],
    businessContext: true
  },
  {
    papers: [PaperType.BUSINESS_REGISTRATION],
    resultRole: RoleType.OWNER,
    description: '사업자등록증 보유자',
    businessContext: true
  },
  {
    papers: [PaperType.BUSINESS_REGISTRATION, PaperType.FRANCHISE_AGREEMENT],
    resultRole: RoleType.FRANCHISEE,
    description: '사업자등록증 + 가맹계약서 보유자',
    businessContext: true
  },
  {
    papers: [PaperType.BUSINESS_REGISTRATION, PaperType.FRANCHISE_HQ_REGISTRATION],
    resultRole: RoleType.FRANCHISOR,
    description: '사업자등록증 + 가맹본부 등록증 보유자',
    businessContext: true
  }
];

/**
 * Role Calculation Context
 * 역할 계산을 위한 컨텍스트 정보
 */
export interface RoleCalculationContext {
  identity: UnifiedIdentity;
  papers: Paper[];
  businessRegistrations: BusinessRegistration[];
  existingRoles?: ComputedRole[];
}

/**
 * Role Calculation Result
 * 역할 계산 결과
 */
export interface RoleCalculationResult {
  identity: UnifiedIdentity;
  calculatedRoles: {
    role: RoleType;
    sourcePapers: string[];
    businessContext?: string;
    metadata?: Record<string, any>;
  }[];
  warnings?: string[];
  errors?: string[];
}

// ========== API TYPES ==========

/**
 * Identity with Full Context
 * 완전한 컨텍스트를 포함한 identity 응답
 */
export interface IdentityWithContext {
  identity: UnifiedIdentity;
  papers: Paper[];
  computedRoles: ComputedRole[];
  businessRegistrations: BusinessRegistration[];
  primaryRole: RoleType;
  availableRoles: RoleType[];
  permissions: Permission[];
}

/**
 * Paper Creation Request
 */
export interface CreatePaperRequest {
  paperType: PaperType;
  relatedBusinessId?: string;
  paperData: Record<string, any>;
  validFrom?: Date;
  validUntil?: Date;
}

/**
 * Business Registration Creation Request
 */
export interface CreateBusinessRegistrationRequest {
  registrationNumber: string;
  businessName: string;
  businessType: BusinessType;
  registrationData?: Record<string, any>;
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Type Guards
 */
export const isPersonalId = (identity: UnifiedIdentity): boolean => 
  identity.idType === IdType.PERSONAL;

export const isCorporateId = (identity: UnifiedIdentity): boolean => 
  identity.idType === IdType.CORPORATE;

/**
 * Legacy Role Conversion
 * 기존 시스템의 역할을 새로운 시스템으로 변환
 */
export const convertLegacyRole = (legacyRole: string): RoleType => {
  const converted = LEGACY_ROLE_MAPPING[legacyRole];
  if (!converted) {
    console.warn(`Unknown legacy role: ${legacyRole}, defaulting to SEEKER`);
    return RoleType.SEEKER;
  }
  return converted;
};

/**
 * Role Display Name Helper
 * 역할을 사용자 친화적 이름으로 변환
 */
export const getRoleDisplayName = (role: RoleType): string => {
  return ROLE_DISPLAY_NAMES[role] || role;
};

/**
 * Paper Display Name Helper
 * 문서 타입을 사용자 친화적 이름으로 변환
 */
export const getPaperDisplayName = (paperType: PaperType): string => {
  return PAPER_DISPLAY_NAMES[paperType] || paperType;
};

/**
 * Role Hierarchy Comparison
 * 역할 간 계층 비교
 */
export const isHigherRole = (role1: RoleType, role2: RoleType): boolean => {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
};

/**
 * Business Context Requirement Check
 * 역할이 비즈니스 컨텍스트를 필요로 하는지 확인
 */
export const requiresBusinessContext = (role: RoleType): boolean => {
  const rule = ROLE_CALCULATION_RULES.find(r => r.resultRole === role);
  return rule?.businessContext === true;
};

// ========== ERROR TYPES ==========

/**
 * ID-ROLE-PAPER Error Types
 */
export enum IdRolePaperErrorType {
  INVALID_ID_TYPE = 'INVALID_ID_TYPE',
  MISSING_PREREQUISITE_ROLE = 'MISSING_PREREQUISITE_ROLE',
  INVALID_PAPER_COMBINATION = 'INVALID_PAPER_COMBINATION',
  BUSINESS_CONTEXT_REQUIRED = 'BUSINESS_CONTEXT_REQUIRED',
  CORPORATE_ID_REQUIRES_PERSONAL_LINK = 'CORPORATE_ID_REQUIRES_PERSONAL_LINK',
  CORPORATE_ID_CANNOT_HAVE_EMPLOYMENT_CONTRACT = 'CORPORATE_ID_CANNOT_HAVE_EMPLOYMENT_CONTRACT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CALCULATION_FAILED = 'ROLE_CALCULATION_FAILED'
}

/**
 * Structured Error for ID-ROLE-PAPER Operations
 */
export interface IdRolePaperError {
  type: IdRolePaperErrorType;
  message: string;
  details?: Record<string, any>;
  identityId?: string;
  businessId?: string;
  paperType?: PaperType;
  role?: RoleType;
}

// ========== FEATURE FLAGS ==========

/**
 * Migration Feature Flags
 * 단계적 마이그레이션을 위한 기능 플래그
 */
export const MIGRATION_FEATURE_FLAGS = {
  USE_UNIFIED_TYPES: process.env.NEXT_PUBLIC_USE_UNIFIED_TYPES === 'true',
  ENABLE_LEGACY_COMPAT: process.env.NEXT_PUBLIC_LEGACY_COMPAT !== 'false', // default true
  STRICT_ROLE_VALIDATION: process.env.NEXT_PUBLIC_STRICT_ROLE_VALIDATION === 'true',
  DEBUG_ROLE_CALCULATION: process.env.NEXT_PUBLIC_DEBUG_ROLES === 'true'
};

// ========== EXPORT ALL TYPES ==========

/**
 * Comprehensive Type Export
 * 모든 타입을 단일 export로 제공
 */
export type {
  UnifiedIdentity,
  BusinessRegistration,
  Paper,
  ComputedRole,
  Permission,
  RolePermissions,
  RoleCalculationRule,
  RoleCalculationContext,
  RoleCalculationResult,
  IdentityWithContext,
  CreatePaperRequest,
  CreateBusinessRegistrationRequest,
  IdRolePaperError
};

/**
 * Legacy Compatibility Exports
 * 기존 시스템과의 호환성을 위한 타입 별칭
 */
export type User = UnifiedIdentity;                          // Legacy compatibility
export type UserRole = RoleType;                            // Legacy compatibility  
export type UnifiedRole = RoleType;                         // Unified system compatibility
export type Organization = BusinessRegistration;            // Organization compatibility

// Migration utilities export - commented out to prevent circular dependencies
// export * from './id-role-paper'; // Re-export existing types for transition period