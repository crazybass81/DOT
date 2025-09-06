/**
 * Unified Type System for DOT Attendance Service
 * Phase 1: Consolidation of all identity, organization, and role types
 */

// =====================================================
// Core Identity System
// =====================================================

export type IdType = 
  | 'personal'          // 개인 (기본 신원)
  | 'business_owner'    // 개인사업자
  | 'corporation'       // 법인
  | 'franchise_hq'      // 프랜차이즈 본사
  | 'franchise_store'   // 프랜차이즈 가맹점

export type UnifiedRole = 
  | 'master'            // 시스템 관리자
  | 'admin'            // 사업장 관리자
  | 'manager'          // 매니저
  | 'worker'           // 일반 직원
  | 'franchise_admin'  // 프랜차이즈 본사 관리자

export type BusinessStatus = 
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'suspended'
  | 'rejected'

export type ContractStatus = 
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'suspended'
  | 'terminated'
  | 'expired'

export type EmploymentType = 
  | 'permanent'
  | 'fixed_term'
  | 'part_time'
  | 'internship'

export type SalaryType = 
  | 'hourly'
  | 'daily'
  | 'monthly'
  | 'annual'

// =====================================================
// Core Data Interfaces
// =====================================================

export interface UnifiedIdentity {
  id: string
  
  // Core identity (immutable)
  email: string
  phone: string
  fullName: string
  birthDate: string
  
  // Identity type and verification
  idType: IdType
  isVerified: boolean
  verifiedAt?: Date
  verificationMethod?: string
  
  // Computed fields
  age: number
  isTeen: boolean
  
  // Teen-specific data
  parentConsentData?: ParentConsentData
  parentVerifiedAt?: Date
  
  // Supabase auth integration
  authUserId?: string
  
  // Business-specific data (for business owners)
  businessNumber?: string
  businessName?: string
  businessVerificationStatus: BusinessStatus
  businessVerifiedAt?: Date
  businessVerificationData?: Record<string, any>
  
  // Status
  isActive: boolean
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface ParentConsentData {
  parentName: string
  parentPhone: string
  consentedAt: Date
  consentDocument?: string
  verificationMethod?: string
}

export interface Organization {
  id: string
  code: string
  
  // Basic information
  name: string
  displayName?: string
  description?: string
  logoUrl?: string
  
  // Organization type and hierarchy
  orgType: IdType
  parentOrgId?: string
  
  // Ownership
  ownerIdentityId: string
  
  // Business registration
  businessRegistration: Record<string, any>
  businessVerificationStatus: BusinessStatus
  
  // Settings and limits
  settings: OrganizationSettings
  maxEmployees: number
  maxLocations: number
  
  // Subscription and billing
  subscriptionTier: string
  subscriptionExpiresAt?: Date
  billingData: Record<string, any>
  
  // Status
  isActive: boolean
  suspendedAt?: Date
  suspensionReason?: string
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationSettings {
  workingHours: {
    start: string
    end: string
  }
  overtimePolicy: {
    enabled: boolean
    threshold: number // minutes
  }
  gpsTracking: {
    enabled: boolean
    radius: number // meters
  }
  approvalRequired: boolean
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  customFields?: Record<string, any>
}

export interface RoleAssignment {
  id: string
  
  // Identity and organization
  identityId: string
  organizationId?: string // null for master role
  
  // Role definition
  role: UnifiedRole
  isActive: boolean
  isPrimary: boolean // Primary role for login
  
  // Permissions
  customPermissions: Record<string, any>
  accessRestrictions: Record<string, any>
  
  // Assignment tracking
  assignedAt: Date
  assignedBy?: string
  revokedAt?: Date
  revokedBy?: string
  revocationReason?: string
  
  // Metadata
  metadata: Record<string, any>
}

export interface EmploymentContract {
  id: string
  contractNumber: string
  
  // Parties
  employeeId: string
  employerOrgId: string
  
  // Position details
  positionTitle: string
  department?: string
  reportingManagerId?: string
  
  // Employment terms
  employmentType: EmploymentType
  startDate: string
  endDate?: string // null for permanent
  probationPeriodMonths: number
  
  // Compensation
  salaryType: SalaryType
  salaryAmount: number
  currency: string
  
  // Working conditions
  weeklyWorkHours: number
  workSchedule: WorkSchedule
  breakMinutes: number
  
  // Contract status
  status: ContractStatus
  
  // Signature and approval
  employeeSignedAt?: Date
  employerSignedAt?: Date
  approvedBy?: string
  approvedAt?: Date
  
  // Teen employment compliance
  teenWorkPermitData?: TeenWorkPermitData
  parentGuardianConsent?: ParentConsentData
  
  // Document management
  contractDocuments: ContractDocument[]
  
  // Termination data
  terminatedAt?: Date
  terminationReason?: string
  terminationType?: 'voluntary' | 'involuntary' | 'mutual' | 'expiry'
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface WorkSchedule {
  days: number[] // 1=Monday, 7=Sunday
  start: string // HH:mm format
  end: string // HH:mm format
  flexibleHours?: boolean
  shiftPattern?: 'fixed' | 'rotating' | 'flexible'
}

export interface TeenWorkPermitData {
  permitNumber: string
  issuedAt: Date
  expiresAt: Date
  issuingAuthority: string
  restrictions: string[]
  parentalConsent: boolean
}

export interface ContractDocument {
  id: string
  type: 'contract' | 'signature' | 'permit' | 'consent' | 'other'
  filename: string
  url: string
  uploadedAt: Date
  uploadedBy: string
}

// =====================================================
// API Request/Response Types
// =====================================================

export interface CreateIdentityRequest {
  email: string
  phone: string
  fullName: string
  birthDate: string
  idType: IdType
  businessNumber?: string
  businessName?: string
}

export interface CreateIdentityResponse {
  success: boolean
  identity?: UnifiedIdentity
  requiresVerification: boolean
  verificationMethod?: string
  error?: string
}

export interface CreateOrganizationRequest {
  name: string
  displayName?: string
  orgType: IdType
  ownerIdentityId: string
  businessNumber?: string
  settings?: Partial<OrganizationSettings>
}

export interface CreateOrganizationResponse {
  success: boolean
  organization?: Organization
  code?: string
  error?: string
}

export interface AssignRoleRequest {
  identityId: string
  organizationId?: string
  role: UnifiedRole
  assignedBy: string
  customPermissions?: Record<string, any>
}

export interface AssignRoleResponse {
  success: boolean
  roleAssignment?: RoleAssignment
  error?: string
}

export interface CreateContractRequest {
  employeeId: string
  employerOrgId: string
  positionTitle: string
  department?: string
  employmentType: EmploymentType
  startDate: string
  endDate?: string
  salaryType: SalaryType
  salaryAmount: number
  weeklyWorkHours: number
  workSchedule: WorkSchedule
}

export interface CreateContractResponse {
  success: boolean
  contract?: EmploymentContract
  contractNumber?: string
  requiresParentConsent: boolean
  error?: string
}

// =====================================================
// Permission System
// =====================================================

export interface Permission {
  resource: string
  action: string
  conditions?: Record<string, any>
}

export interface RolePermissions {
  [key: string]: Permission[]
}

export const DEFAULT_PERMISSIONS: RolePermissions = {
  master: [
    { resource: '*', action: '*' } // Full system access
  ],
  admin: [
    { resource: 'organization', action: 'read' },
    { resource: 'organization', action: 'update' },
    { resource: 'employees', action: '*' },
    { resource: 'attendance', action: '*' },
    { resource: 'contracts', action: '*' },
    { resource: 'reports', action: 'generate' }
  ],
  manager: [
    { resource: 'organization', action: 'read' },
    { resource: 'employees', action: 'read' },
    { resource: 'employees', action: 'update', conditions: { managedOnly: true } },
    { resource: 'attendance', action: 'read' },
    { resource: 'attendance', action: 'approve' },
    { resource: 'contracts', action: 'read', conditions: { managedOnly: true } }
  ],
  worker: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'attendance', action: 'read', conditions: { selfOnly: true } },
    { resource: 'attendance', action: 'create', conditions: { selfOnly: true } },
    { resource: 'contracts', action: 'read', conditions: { selfOnly: true } }
  ],
  franchise_admin: [
    { resource: 'franchise', action: '*' },
    { resource: 'franchise_stores', action: '*' },
    { resource: 'reports', action: 'generate', conditions: { franchiseOnly: true } }
  ]
}

// =====================================================
// Validation Schemas
// =====================================================

export const VALIDATION_PATTERNS = {
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  phone: /^[0-9-+\s]+$/,
  businessNumber: /^\d{3}-\d{2}-\d{5}$/, // Korean business registration number
  orgCode: /^[A-Z0-9]{8,12}$/
} as const

export interface ValidationRule {
  field: string
  rule: 'required' | 'pattern' | 'minLength' | 'maxLength' | 'custom'
  value?: any
  message: string
}

export const IDENTITY_VALIDATION_RULES: ValidationRule[] = [
  { field: 'email', rule: 'required', message: 'Email is required' },
  { field: 'email', rule: 'pattern', value: VALIDATION_PATTERNS.email, message: 'Invalid email format' },
  { field: 'phone', rule: 'required', message: 'Phone is required' },
  { field: 'phone', rule: 'pattern', value: VALIDATION_PATTERNS.phone, message: 'Invalid phone format' },
  { field: 'fullName', rule: 'required', message: 'Full name is required' },
  { field: 'fullName', rule: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
  { field: 'birthDate', rule: 'required', message: 'Birth date is required' }
]

// =====================================================
// Utility Functions
// =====================================================

export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

export function isTeen(birthDate: string): boolean {
  const age = calculateAge(birthDate)
  return age >= 15 && age < 18
}

export function generateOrgCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function validateBusinessOwnership(identity: UnifiedIdentity, org: Organization): boolean {
  if (org.orgType === 'business_owner' || org.orgType === 'corporation') {
    return (
      identity.id === org.ownerIdentityId &&
      identity.idType === org.orgType &&
      identity.businessVerificationStatus === 'verified'
    )
  }
  return true
}

export function validateFranchiseHierarchy(parentOrg: Organization, childOrg: Organization): boolean {
  if (childOrg.orgType === 'franchise_store') {
    return parentOrg.orgType === 'franchise_hq'
  }
  return true
}

export function validateTeenEmployment(identity: UnifiedIdentity, contract: EmploymentContract): string[] {
  const errors: string[] = []
  
  if (!isTeen(identity.birthDate)) {
    return errors
  }
  
  // Check work hours
  if (contract.weeklyWorkHours > 35) {
    errors.push('Teen workers cannot work more than 35 hours per week')
  }
  
  // Check parent consent
  if (!contract.parentGuardianConsent) {
    errors.push('Teen workers require parent/guardian consent')
  }
  
  // Check work permit
  if (!contract.teenWorkPermitData) {
    errors.push('Teen workers require work permit data')
  }
  
  return errors
}

export function hasPermission(
  roleAssignments: RoleAssignment[], 
  resource: string, 
  action: string
): boolean {
  for (const assignment of roleAssignments) {
    if (!assignment.isActive) continue
    
    const permissions = DEFAULT_PERMISSIONS[assignment.role] || []
    
    for (const permission of permissions) {
      if (permission.resource === '*' && permission.action === '*') {
        return true
      }
      
      if (permission.resource === resource || permission.resource === '*') {
        if (permission.action === action || permission.action === '*') {
          return true
        }
      }
    }
  }
  
  return false
}

// =====================================================
// Type Guards
// =====================================================

export function isBusinessIdentity(identity: UnifiedIdentity): boolean {
  return identity.idType === 'business_owner' || identity.idType === 'corporation'
}

export function isFranchiseOrganization(organization: Organization): boolean {
  return organization.orgType === 'franchise_hq' || organization.orgType === 'franchise_store'
}

export function isActiveContract(contract: EmploymentContract): boolean {
  return contract.status === 'active' && 
         (!contract.endDate || new Date(contract.endDate) > new Date())
}

export function requiresParentConsent(identity: UnifiedIdentity): boolean {
  return isTeen(identity.birthDate)
}

// =====================================================
// Constants
// =====================================================

export const SYSTEM_CONSTANTS = {
  MIN_AGE: 15,
  ADULT_AGE: 18,
  TEEN_MAX_WORK_HOURS: 35,
  DEFAULT_WORK_HOURS: 40,
  DEFAULT_BREAK_MINUTES: 60,
  DEFAULT_PROBATION_MONTHS: 3,
  MAX_ORG_CODE_LENGTH: 12,
  MIN_ORG_CODE_LENGTH: 8
} as const

export const ERROR_CODES = {
  INVALID_IDENTITY_TYPE: 'INVALID_IDENTITY_TYPE',
  BUSINESS_VERIFICATION_REQUIRED: 'BUSINESS_VERIFICATION_REQUIRED',
  PARENT_CONSENT_REQUIRED: 'PARENT_CONSENT_REQUIRED',
  INVALID_FRANCHISE_HIERARCHY: 'INVALID_FRANCHISE_HIERARCHY',
  TEEN_WORK_HOURS_EXCEEDED: 'TEEN_WORK_HOURS_EXCEEDED',
  WORK_PERMIT_REQUIRED: 'WORK_PERMIT_REQUIRED',
  DUPLICATE_ADMIN_ROLE: 'DUPLICATE_ADMIN_ROLE',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS'
} as const