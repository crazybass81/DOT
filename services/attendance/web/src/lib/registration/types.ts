// Registration System Types
export interface PersonalAccount {
  id: string
  authUserId?: string
  email: string
  phone: string
  fullName: string
  birthDate: string
  ageVerifiedAt?: Date
  ageVerificationMethod?: 'nice_api' | 'parent_consent' | 'document'
  isTeen: boolean
  parentConsent?: ParentConsent
  isActive: boolean
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ParentConsent {
  parentName: string
  parentPhone: string
  consentedAt: Date
  consentDocument?: string
}

export type OrgType = 'personal_business' | 'corporation' | 'franchise_hq' | 'franchise_store'
export type RoleType = 'master' | 'admin' | 'manager' | 'worker' | 'franchise_staff'
export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'suspended' | 'terminated' | 'expired'
export type VerificationStatus = 'pending' | 'in_progress' | 'verified' | 'failed' | 'expired'

export interface Organization {
  id: string
  code: string
  name: string
  type: OrgType
  businessNumber?: string
  businessName?: string
  businessVerifiedAt?: Date
  ownerAccountId?: string
  parentOrgId?: string
  settings: OrganizationSettings
  maxEmployees: number
  maxBranches: number
  isActive: boolean
  subscriptionTier: string
  subscriptionExpiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationSettings {
  workingHours: {
    start: string
    end: string
  }
  overtimeThreshold: number
  requiresGPS: boolean
  gpsRadius: number
}

export interface UserRole {
  id: string
  accountId: string
  organizationId?: string
  role: RoleType
  isActive: boolean
  isPrimary: boolean
  permissions: Record<string, any>
  grantedAt: Date
  grantedBy?: string
  revokedAt?: Date
  revokedBy?: string
  metadata: Record<string, any>
}

export interface EmploymentContract {
  id: string
  contractNumber: string
  employeeId: string
  organizationId: string
  position: string
  department?: string
  employmentType: 'full_time' | 'part_time' | 'temporary' | 'internship'
  startDate: string
  endDate?: string
  probationEndDate?: string
  wageType: 'hourly' | 'monthly' | 'annual'
  wageAmount: number
  currency: string
  workHoursPerWeek: number
  workDays: string // Binary string for Mon-Sun
  breakMinutes: number
  status: ContractStatus
  signedAt?: Date
  terminatedAt?: Date
  terminationReason?: string
  contractDocumentUrl?: string
  signedDocumentUrl?: string
  teenWorkPermit?: TeenWorkPermit
  parentConsentId?: string
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface TeenWorkPermit {
  permitNumber: string
  issuedAt: Date
  expiresAt: Date
  restrictions: string[]
}

export interface RegistrationFlow {
  id: string
  sessionId: string
  accountId?: string
  email: string
  flowType: 'new_user' | 'add_role' | 'create_org' | 'join_org'
  currentStep: string
  completedSteps: string[]
  flowData: RegistrationFlowData
  isCompleted: boolean
  completedAt?: Date
  ipAddress?: string
  userAgent?: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface RegistrationFlowData {
  email: string
  phone: string
  fullName: string
  birthDate: string
  age: number
  requiresParentConsent: boolean
  ageVerified?: boolean
  verificationMethod?: string
  registrationType?: 'personal' | 'business_owner' | 'corporation_founder' | 'franchise_founder'
  roleType?: RoleType
  organizationId?: string
  organizationCode?: string
  businessNumber?: string
  businessName?: string
  businessVerified?: boolean
  parentConsent?: ParentConsent
  createOrganization?: {
    name: string
    type: OrgType
    code: string
    businessNumber?: string
  }
}

export interface AgeVerification {
  id: string
  accountId: string
  verificationType: 'nice_api' | 'parent_consent' | 'document'
  verificationStatus: VerificationStatus
  requestData: Record<string, any>
  responseData?: Record<string, any>
  parentName?: string
  parentPhone?: string
  parentVerifiedAt?: Date
  isVerified: boolean
  verifiedAt?: Date
  verificationCode?: string
  createdAt: Date
  expiresAt: Date
}

export interface BusinessVerification {
  id: string
  organizationId: string
  businessNumber: string
  businessName: string
  representativeName?: string
  verificationMethod?: 'nts_api' | 'manual' | 'document'
  verificationStatus: VerificationStatus
  apiRequestData?: Record<string, any>
  apiResponseData?: Record<string, any>
  isVerified: boolean
  verifiedAt?: Date
  verifiedBy?: string
  documentUrls?: string[]
  createdAt: Date
}

// Request/Response types for API
export interface RegistrationStartRequest {
  email: string
  phone: string
  fullName: string
  birthDate: string
  registrationType: 'personal' | 'business_owner' | 'corporation_founder' | 'franchise_founder'
}

export interface RegistrationStartResponse {
  success: boolean
  flowId: string
  sessionId: string
  requiresAgeVerification: boolean
  requiresParentConsent: boolean
  nextStep: string
  error?: string
}

export interface AgeVerificationRequest {
  flowId: string
  verificationType: 'nice_api' | 'parent_consent' | 'document'
  verificationData: {
    token?: string
    parentPhone?: string
    parentName?: string
    documentUrl?: string
  }
}

export interface AgeVerificationResponse {
  success: boolean
  verified: boolean
  nextStep: string
  error?: string
}

export interface BusinessVerificationRequest {
  flowId: string
  businessNumber: string
  businessName: string
  representativeName?: string
}

export interface BusinessVerificationResponse {
  success: boolean
  verified: boolean
  businessData?: any
  nextStep: string
  error?: string
}

export interface RoleSelectionRequest {
  flowId: string
  roleType: RoleType
  organizationCode?: string
  createOrganization?: {
    name: string
    type: OrgType
    businessNumber?: string
  }
}

export interface RoleSelectionResponse {
  success: boolean
  roleSelected: RoleType
  organizationCode?: string
  nextStep: string
  error?: string
}

export interface RegistrationCompleteRequest {
  flowId: string
  password: string
}

export interface RegistrationCompleteResponse {
  success: boolean
  accountId: string
  authUserId: string
  organizationCode?: string
  role: RoleType
  message: string
  error?: string
}

// Form validation schemas
export const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
export const phoneRegex = /^[0-9-]+$/
export const businessNumberRegex = /^\d{3}-\d{2}-\d{5}$/

// Helper functions
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
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export function generateContractNumber(): string {
  return `CONTRACT-${Date.now()}`
}

export function generateSessionId(): string {
  return `REG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}