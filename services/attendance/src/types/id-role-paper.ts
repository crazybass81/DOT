/**
 * ID-ROLE-PAPER Architecture Type Definitions
 * 
 * This file defines the core types for the new attendance system architecture
 * where roles are dynamically determined by owned documents (PAPER).
 * 
 * Key Concepts:
 * - Personal vs Corporate IDs: Two identity types with different capabilities
 * - PAPER System: Documents that grant roles when owned
 * - Dynamic Roles: 7 roles calculated from PAPER combinations
 * - Business Registration: Core business entities replacing organizations
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
 * Role Type - 7 dynamic roles in the system
 * Roles are calculated based on owned PAPER documents
 */
export enum RoleType {
  SEEKER = 'SEEKER',           // 구직자 - Default role, no papers needed
  WORKER = 'WORKER',           // 워커 - Has Employment Contract
  MANAGER = 'MANAGER',         // 매니저 - Has Employment Contract + Authority Delegation (requires WORKER)
  OWNER = 'OWNER',             // 사업자관리자 - Has Business Registration
  FRANCHISEE = 'FRANCHISEE',   // 가맹점주 - Has Business Registration + Franchise Agreement
  FRANCHISOR = 'FRANCHISOR',   // 가맹본부관리자 - Has Business Registration + Franchise HQ Registration
  SUPERVISOR = 'SUPERVISOR'    // 수퍼바이저 - Has Employment Contract + Supervisor Authority Delegation (requires WORKER)
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
 * Verification Status for entities requiring verification
 */
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

// ========== Core Interfaces ==========

/**
 * Unified Identity - Core identity management
 * Supports both Personal and Corporate ID types
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
 * Business Registration - Replaces organizations
 * Core business entity in the new system
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
 * Core of the PAPER system - roles are derived from owned papers
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
 * Represents a role granted to an identity based on their papers
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
 * Role Dependency - Defines prerequisite relationships
 * Example: MANAGER requires WORKER as prerequisite
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
 * Rule for calculating roles from papers
 * Defines which paper combinations grant which roles
 */
export interface RoleCalculationRule {
  papers: PaperType[];                 // Required papers for this role
  resultRole: RoleType;                // Role granted by these papers
  description: string;
  dependencies?: RoleType[];           // Prerequisite roles required
  businessContext?: boolean;           // Whether this role requires business context
}

/**
 * Role calculation context with papers and business info
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
 * Permission definition for role-based access control
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

// ========== API and Service Types ==========

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
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CALCULATION_FAILED = 'ROLE_CALCULATION_FAILED'
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
}

// ========== Utility Types ==========

/**
 * Type guard utilities
 */
export const isPersonalId = (identity: UnifiedIdentity): boolean => 
  identity.idType === IdType.PERSONAL;

export const isCorporateId = (identity: UnifiedIdentity): boolean => 
  identity.idType === IdType.CORPORATE;

/**
 * Role hierarchy levels for priority determination
 */
export const ROLE_HIERARCHY: Record<RoleType, number> = {
  [RoleType.SEEKER]: 1,
  [RoleType.WORKER]: 2,
  [RoleType.MANAGER]: 3,
  [RoleType.SUPERVISOR]: 4,
  [RoleType.FRANCHISEE]: 5,
  [RoleType.OWNER]: 6,
  [RoleType.FRANCHISOR]: 7
};

/**
 * Role calculation rules based on paper combinations
 */
export const ROLE_CALCULATION_RULES: RoleCalculationRule[] = [
  {
    papers: [],
    resultRole: RoleType.SEEKER,
    description: 'Default role when no papers are held'
  },
  {
    papers: [PaperType.BUSINESS_REGISTRATION],
    resultRole: RoleType.OWNER,
    description: 'Business registration grants business owner role',
    businessContext: true
  },
  {
    papers: [PaperType.EMPLOYMENT_CONTRACT],
    resultRole: RoleType.WORKER,
    description: 'Employment contract grants worker role',
    businessContext: true
  },
  {
    papers: [PaperType.EMPLOYMENT_CONTRACT, PaperType.AUTHORITY_DELEGATION],
    resultRole: RoleType.MANAGER,
    description: 'Employment contract + authority delegation grants manager role',
    dependencies: [RoleType.WORKER],
    businessContext: true
  },
  {
    papers: [PaperType.BUSINESS_REGISTRATION, PaperType.FRANCHISE_AGREEMENT],
    resultRole: RoleType.FRANCHISEE,
    description: 'Business registration + franchise agreement grants franchisee role',
    businessContext: true
  },
  {
    papers: [PaperType.BUSINESS_REGISTRATION, PaperType.FRANCHISE_HQ_REGISTRATION],
    resultRole: RoleType.FRANCHISOR,
    description: 'Business registration + franchise HQ registration grants franchisor role',
    businessContext: true
  },
  {
    papers: [PaperType.EMPLOYMENT_CONTRACT, PaperType.SUPERVISOR_AUTHORITY_DELEGATION],
    resultRole: RoleType.SUPERVISOR,
    description: 'Employment contract + supervisor authority delegation grants supervisor role',
    dependencies: [RoleType.WORKER],
    businessContext: true
  }
];

/**
 * Default role dependencies
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
  IdRolePaperError
};