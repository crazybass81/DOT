/**
 * ID-ROLE-PAPER Architecture Type Definitions
 * Final specification implementation for DOT Attendance Service
 * 
 * This implements the confirmed ID-ROLE-PAPER system from Final-ID-ROLE-PAPER-Architecture.md
 * with Personal/Corporate IDs, 7 roles, and 6 paper types
 */

// ========== Core Enums ==========

/**
 * Identity Type - Personal vs Corporate identification
 */
export enum IdType {
  PERSONAL = 'personal',
  CORPORATE = 'corporate'
}

/**
 * Role Type - 7 dynamic roles based on owned papers
 * Hierarchy: SEEKER < WORKER < MANAGER/SUPERVISOR < OWNER < FRANCHISEE < FRANCHISOR
 */
export enum RoleType {
  SEEKER = 'SEEKER',           // 구직자 - No papers needed
  WORKER = 'WORKER',           // 워커 - Employment Contract
  MANAGER = 'MANAGER',         // 매니저 - Employment Contract + Authority Delegation (requires WORKER)
  OWNER = 'OWNER',             // 사업자관리자 - Business Registration
  FRANCHISEE = 'FRANCHISEE',   // 가맹점주 - Business Registration + Franchise Agreement
  FRANCHISOR = 'FRANCHISOR',   // 가맹본부관리자 - Business Registration + Franchise HQ Registration
  SUPERVISOR = 'SUPERVISOR'    // 수퍼바이저 - Employment Contract + Supervisor Authority Delegation (requires WORKER)
}

/**
 * Paper Type - 6 document types that grant roles
 */
export enum PaperType {
  BUSINESS_REGISTRATION = 'Business Registration',
  EMPLOYMENT_CONTRACT = 'Employment Contract',
  AUTHORITY_DELEGATION = 'Authority Delegation',
  SUPERVISOR_AUTHORITY_DELEGATION = 'Supervisor Authority Delegation',
  FRANCHISE_AGREEMENT = 'Franchise Agreement',
  FRANCHISE_HQ_REGISTRATION = 'Franchise HQ Registration'
}

/**
 * Business Type for Business Registrations
 */
export enum BusinessType {
  INDIVIDUAL = 'individual',  // 개인사업자
  CORPORATE = 'corporate'     // 법인사업자
}

/**
 * Verification Status
 */
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

// ========== Core Interfaces ==========

/**
 * Unified Identity - Core identity management
 * Supports both Personal and Corporate ID types based on confirmed architecture
 */
export interface UnifiedIdentity {
  id: string;
  idType: IdType;
  email: string;
  phone?: string;
  fullName: string;
  birthDate?: Date;
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
 * Business Registration - Core business entity
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
 * Paper - Document that grants roles
 * Core of the PAPER system - roles derived from owned papers
 */
export interface Paper {
  id: string;
  paperType: PaperType;
  ownerIdentityId: string;
  relatedBusinessId?: string;           // Business context for this paper
  paperData: Record<string, any>;      // Paper-specific data
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;                   // Optional expiration
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Computed Role - Automatically calculated from owned papers
 */
export interface ComputedRole {
  id: string;
  identityId: string;
  role: RoleType;
  sourcePapers: string[];              // Array of paper IDs that grant this role
  businessContextId?: string;          // Business where this role applies
  isActive: boolean;
  computedAt: Date;
}

/**
 * Role Dependency - Prerequisite relationships
 */
export interface RoleDependency {
  id: string;
  parentRole: RoleType;                // Required prerequisite role
  childRole: RoleType;                 // Role that depends on parent
  description?: string;
  createdAt: Date;
}

// ========== Role Calculation System ==========

/**
 * Rule for calculating roles from papers - Based on confirmed architecture
 */
export interface RoleCalculationRule {
  papers: PaperType[];                 // Required papers for this role
  resultRole: RoleType;                // Role granted by these papers
  description: string;
  dependencies?: RoleType[];           // Prerequisite roles required
  businessContext?: boolean;           // Whether this role requires business context
  corporateIdRule?: boolean;           // Special rules for Corporate IDs
}

/**
 * Role calculation context
 */
export interface RoleCalculationContext {
  identity: UnifiedIdentity;
  papers: Paper[];
  businessRegistrations: BusinessRegistration[];
  existingRoles?: ComputedRole[];
}

/**
 * Result of role calculation
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

// ========== Permission System ==========

/**
 * Permission definition for RBAC
 */
export interface Permission {
  resource: string;                    // Resource being accessed
  action: string;                      // Action being performed
  conditions?: Record<string, any>;    // Additional conditions
  businessContext?: boolean;           // Whether permission is business-scoped
}

/**
 * Role-based permission set
 */
export interface RolePermissions {
  role: RoleType;
  permissions: Permission[];
  inheritsFrom?: RoleType[];           // Roles this role inherits permissions from
}

// ========== API Types ==========

/**
 * Identity service response with full context
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
 * Request to create a new paper
 */
export interface CreatePaperRequest {
  paperType: PaperType;
  relatedBusinessId?: string;
  paperData: Record<string, any>;
  validFrom?: Date;
  validUntil?: Date;
}

/**
 * Request to create a business registration
 */
export interface CreateBusinessRegistrationRequest {
  registrationNumber: string;
  businessName: string;
  businessType: BusinessType;
  registrationData?: Record<string, any>;
}

/**
 * Attendance record update for new system
 */
export interface AttendanceRecordUpdate {
  identityId: string;
  businessRegistrationId: string;
  role?: RoleType;
  metadata?: Record<string, any>;
}

// ========== Constants and Rules ==========

/**
 * Role hierarchy levels for priority determination
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

/**
 * Role calculation rules - Based on confirmed ID-ROLE-PAPER architecture
 */
export const ROLE_CALCULATION_RULES: RoleCalculationRule[] = [
  {
    papers: [],
    resultRole: RoleType.SEEKER,
    description: '어떤 PAPER도 갖지 않는 경우'
  },
  {
    papers: [PaperType.BUSINESS_REGISTRATION],
    resultRole: RoleType.OWNER,
    description: '사업자등록증만 소유',
    businessContext: true
  },
  {
    papers: [PaperType.EMPLOYMENT_CONTRACT],
    resultRole: RoleType.WORKER,
    description: '근로계약서만 소유',
    businessContext: true
  },
  {
    papers: [PaperType.EMPLOYMENT_CONTRACT, PaperType.AUTHORITY_DELEGATION],
    resultRole: RoleType.MANAGER,
    description: '근로계약서 + 권한위임장',
    dependencies: [RoleType.WORKER],
    businessContext: true
  },
  {
    papers: [PaperType.BUSINESS_REGISTRATION, PaperType.FRANCHISE_AGREEMENT],
    resultRole: RoleType.FRANCHISEE,
    description: '가맹계약을 체결한 사업자',
    businessContext: true
  },
  {
    papers: [PaperType.BUSINESS_REGISTRATION, PaperType.FRANCHISE_HQ_REGISTRATION],
    resultRole: RoleType.FRANCHISOR,
    description: '가맹본부 등록증을 보유한 사업자',
    businessContext: true
  },
  {
    papers: [PaperType.EMPLOYMENT_CONTRACT, PaperType.SUPERVISOR_AUTHORITY_DELEGATION],
    resultRole: RoleType.SUPERVISOR,
    description: '근로계약서 + 수퍼바이저 권한위임장',
    dependencies: [RoleType.WORKER],
    businessContext: true
  }
];

/**
 * Default role dependencies - Manager and Supervisor require Worker
 */
export const ROLE_DEPENDENCIES: RoleDependency[] = [
  {
    id: 'manager-requires-worker',
    parentRole: RoleType.WORKER,
    childRole: RoleType.MANAGER,
    description: 'Manager role requires Worker role as prerequisite',
    createdAt: new Date()
  },
  {
    id: 'supervisor-requires-worker',
    parentRole: RoleType.WORKER,
    childRole: RoleType.SUPERVISOR,
    description: 'Supervisor role requires Worker role as prerequisite',
    createdAt: new Date()
  }
];

/**
 * Corporate ID specific rules - Based on confirmed architecture
 */
export const CORPORATE_ID_RULES = {
  // Corporate IDs cannot directly hold Employment Contracts
  cannotHavePapers: [PaperType.EMPLOYMENT_CONTRACT],
  
  // Corporate IDs must be linked to Personal IDs
  requiresPersonalIdLink: true,
  
  // Corporate IDs can own businesses
  canOwnBusinessRegistrations: true,
  
  // Corporate IDs inherit certain roles from linked Personal ID
  inheritsRolesFromPersonalId: [RoleType.OWNER, RoleType.FRANCHISEE, RoleType.FRANCHISOR]
};

// ========== Utility Functions ==========

/**
 * Type guard utilities
 */
export const isPersonalId = (identity: UnifiedIdentity): boolean => 
  identity.idType === IdType.PERSONAL;

export const isCorporateId = (identity: UnifiedIdentity): boolean => 
  identity.idType === IdType.CORPORATE;

/**
 * Check if a role has business context requirement
 */
export const requiresBusinessContext = (role: RoleType): boolean => {
  const rule = ROLE_CALCULATION_RULES.find(r => r.resultRole === role);
  return rule?.businessContext === true;
};

/**
 * Get role display name in Korean
 */
export const getRoleDisplayName = (role: RoleType): string => {
  const displayNames: Record<RoleType, string> = {
    [RoleType.SEEKER]: '구직자',
    [RoleType.WORKER]: '워커',
    [RoleType.MANAGER]: '매니저',
    [RoleType.OWNER]: '사업자관리자',
    [RoleType.FRANCHISEE]: '가맹점주',
    [RoleType.FRANCHISOR]: '가맹본부관리자',
    [RoleType.SUPERVISOR]: '수퍼바이저'
  };
  return displayNames[role] || role;
};

/**
 * Get paper display name in Korean
 */
export const getPaperDisplayName = (paperType: PaperType): string => {
  const displayNames: Record<PaperType, string> = {
    [PaperType.BUSINESS_REGISTRATION]: '사업자등록증',
    [PaperType.EMPLOYMENT_CONTRACT]: '근로계약서',
    [PaperType.AUTHORITY_DELEGATION]: '권한위임장',
    [PaperType.SUPERVISOR_AUTHORITY_DELEGATION]: '수퍼바이저 권한위임장',
    [PaperType.FRANCHISE_AGREEMENT]: '가맹계약서',
    [PaperType.FRANCHISE_HQ_REGISTRATION]: '가맹본부 등록증'
  };
  return displayNames[paperType] || paperType;
};

// ========== Error Types ==========

/**
 * ID-ROLE-PAPER specific error types
 */
export enum IdRolePaperErrorType {
  INVALID_ID_TYPE = 'INVALID_ID_TYPE',
  MISSING_PREREQUISITE_ROLE = 'MISSING_PREREQUISITE_ROLE',
  INVALID_PAPER_COMBINATION = 'INVALID_PAPER_COMBINATION',
  BUSINESS_CONTEXT_REQUIRED = 'BUSINESS_CONTEXT_REQUIRED',
  CORPORATE_ID_REQUIRES_PERSONAL_LINK = 'CORPORATE_ID_REQUIRES_PERSONAL_LINK',
  CORPORATE_ID_CANNOT_HAVE_EMPLOYMENT_CONTRACT = 'CORPORATE_ID_CANNOT_HAVE_EMPLOYMENT_CONTRACT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CALCULATION_FAILED = 'ROLE_CALCULATION_FAILED',
  BUSINESS_REGISTRATION_OWNERSHIP_REQUIRED = 'BUSINESS_REGISTRATION_OWNERSHIP_REQUIRED'
}

/**
 * Structured error for ID-ROLE-PAPER operations
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

// ========== Test Support Types ==========

/**
 * Test data factory interfaces for TDD support
 */
export interface TestIdentityData {
  idType: IdType;
  email: string;
  fullName: string;
  linkedPersonalId?: string;
  profileData?: Record<string, any>;
}

export interface TestPaperData {
  paperType: PaperType;
  ownerIdentityId: string;
  relatedBusinessId?: string;
  paperData?: Record<string, any>;
  validFrom?: Date;
  validUntil?: Date;
}

export interface TestBusinessRegistrationData {
  registrationNumber: string;
  businessName: string;
  businessType: BusinessType;
  ownerIdentityId: string;
  registrationData?: Record<string, any>;
}

/**
 * Test scenario definitions for comprehensive testing
 */
export interface TestScenario {
  name: string;
  description: string;
  identity: TestIdentityData;
  papers: TestPaperData[];
  businessRegistrations: TestBusinessRegistrationData[];
  expectedRoles: RoleType[];
  expectedErrors?: IdRolePaperErrorType[];
}

/**
 * Export all types for easy importing
 */
export type {
  UnifiedIdentity,
  BusinessRegistration,
  Paper,
  ComputedRole,
  RoleDependency,
  RoleCalculationRule,
  RoleCalculationContext,
  RoleCalculationResult,
  Permission,
  RolePermissions,
  IdentityWithContext,
  CreatePaperRequest,
  CreateBusinessRegistrationRequest,
  AttendanceRecordUpdate,
  IdRolePaperError,
  TestIdentityData,
  TestPaperData,
  TestBusinessRegistrationData,
  TestScenario
};