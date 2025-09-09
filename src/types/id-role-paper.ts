/**
 * ID-ROLE-PAPER System Type Definitions
 * Comprehensive types for the identity, business, paper, and permission management system
 */

// Enum for role hierarchy (7-tier system)
export enum RoleType {
  SEEKER = 'SEEKER',
  WORKER = 'WORKER',
  SUPERVISOR = 'SUPERVISOR',
  MANAGER = 'MANAGER',
  OWNER = 'OWNER',
  FRANCHISEE = 'FRANCHISEE',
  FRANCHISOR = 'FRANCHISOR'
}

// Role hierarchy mapping (lower roles inherit from higher roles)
export const ROLE_HIERARCHY: Record<RoleType, RoleType[]> = {
  [RoleType.FRANCHISOR]: [RoleType.FRANCHISOR, RoleType.FRANCHISEE, RoleType.OWNER, RoleType.MANAGER, RoleType.SUPERVISOR, RoleType.WORKER, RoleType.SEEKER],
  [RoleType.FRANCHISEE]: [RoleType.FRANCHISEE, RoleType.OWNER, RoleType.MANAGER, RoleType.SUPERVISOR, RoleType.WORKER, RoleType.SEEKER],
  [RoleType.OWNER]: [RoleType.OWNER, RoleType.MANAGER, RoleType.SUPERVISOR, RoleType.WORKER, RoleType.SEEKER],
  [RoleType.MANAGER]: [RoleType.MANAGER, RoleType.SUPERVISOR, RoleType.WORKER, RoleType.SEEKER],
  [RoleType.SUPERVISOR]: [RoleType.SUPERVISOR, RoleType.WORKER, RoleType.SEEKER],
  [RoleType.WORKER]: [RoleType.WORKER, RoleType.SEEKER],
  [RoleType.SEEKER]: [RoleType.SEEKER]
};

// Identity Types
export interface PersonalInfo {
  phone: string;
  address: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface CorporateInfo {
  businessNumber: string;
  representativeName: string;
  businessType: string;
  incorporationDate?: string;
  registeredAddress: string;
}

export interface Identity {
  id: string;
  organizationId: string;
  userId: string;
  identityType: 'personal' | 'corporate';
  fullName: string;
  personalInfo?: PersonalInfo;
  corporateInfo?: CorporateInfo;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Business Types
export interface Business {
  id: string;
  organizationId: string;
  name: string;
  businessType: 'individual' | 'corporate';
  businessNumber: string;
  ownerIdentityId: string;
  address: string;
  phone: string;
  email?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDocuments?: {
    businessRegistration?: string;
    taxRegistration?: string;
    otherDocuments?: string[];
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Paper Types
export enum PaperType {
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  TAX_REGISTRATION = 'TAX_REGISTRATION', 
  EMPLOYMENT_INSURANCE = 'EMPLOYMENT_INSURANCE',
  INDUSTRIAL_ACCIDENT_INSURANCE = 'INDUSTRIAL_ACCIDENT_INSURANCE',
  HEALTH_INSURANCE = 'HEALTH_INSURANCE',
  PENSION_INSURANCE = 'PENSION_INSURANCE'
}

export interface Paper {
  id: string;
  organizationId: string;
  businessId: string;
  paperType: PaperType;
  title: string;
  documentNumber?: string;
  issuedBy?: string;
  issuedDate?: string;
  validFrom: string;
  validUntil: string;
  isValid: boolean;
  documentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Permission Types
export interface Permission {
  id: string;
  organizationId: string;
  roleType: RoleType;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  organizationId: string;
  identityId: string;
  roleType: RoleType;
  businessId?: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Composite Types for UI
export interface IdentityWithContext {
  identity: Identity;
  primaryRole: RoleType;
  availableRoles: RoleType[];
  permissions: Permission[];
  businessContext?: Business;
}

export interface BusinessWithOwner {
  business: Business;
  owner: Identity;
  papers: Paper[];
  roles: Role[];
}

export interface PaperWithBusiness {
  paper: Paper;
  business: Business;
  validationHistory?: PaperValidation[];
}

export interface PaperValidation {
  id: string;
  paperId: string;
  validatedBy: string;
  validatedAt: string;
  status: 'valid' | 'invalid' | 'expired';
  notes?: string;
}

// Form Types
export interface CreateIdentityForm {
  identityType: 'personal' | 'corporate';
  fullName: string;
  personalInfo?: Partial<PersonalInfo>;
  corporateInfo?: Partial<CorporateInfo>;
}

export interface CreateBusinessForm {
  name: string;
  businessType: 'individual' | 'corporate';
  businessNumber: string;
  ownerIdentityId: string;
  address: string;
  phone: string;
  email?: string;
}

export interface CreatePaperForm {
  businessId: string;
  paperType: PaperType;
  title: string;
  documentNumber?: string;
  issuedBy?: string;
  issuedDate?: string;
  validFrom: string;
  validUntil: string;
  notes?: string;
}

export interface PermissionCheckForm {
  identityId: string;
  resource: string;
  action: string;
  businessId?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface BusinessValidationError extends ValidationError {
  businessNumber?: string;
  suggestion?: string;
}

// Korean Business Number Validation
export interface KoreanBusinessNumber {
  number: string;
  type: 'individual' | 'corporate';
  isValid: boolean;
  formatted: string;
}

// Validation Schemas
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Search and Filter Types
export interface IdentitySearchParams {
  search?: string;
  identityType?: 'personal' | 'corporate';
  roleType?: RoleType;
  businessId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface BusinessSearchParams {
  search?: string;
  businessType?: 'individual' | 'corporate';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface PaperSearchParams {
  search?: string;
  paperType?: PaperType;
  businessId?: string;
  isValid?: boolean;
  validUntil?: string;
  limit?: number;
  offset?: number;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  error?: string;
  details?: any;
}

export interface ModalState {
  isOpen: boolean;
  type?: 'create' | 'edit' | 'view' | 'delete';
  data?: any;
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  type: 'restaurant' | 'franchise' | 'corporate';
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Export utility types
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;