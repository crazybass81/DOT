/**
 * Unified Types - DEPRECATED: Use id-role-paper-unified.ts instead
 * Migration Phase 1: All types here are deprecated and will be removed
 * 
 * 기존 Unified Types → ID-ROLE-PAPER 통합 타입 시스템으로 전환
 * @deprecated Use id-role-paper-unified.ts for all new development
 */

import { 
  IdType, 
  RoleType, 
  BusinessType,
  UnifiedIdentity,
  BusinessRegistration,
  Paper,
  ComputedRole,
  VerificationStatus
} from './id-role-paper-unified';

// =====================================================
// Core Identity Types
// =====================================================

export type IdType = 
  | 'personal'           // 개인
  | 'business_owner'     // 사업자
  | 'corporation'        // 법인
  | 'franchise_hq'       // 프랜차이즈 본사

export type UnifiedRole = 
  | 'master'           // 마스터 관리자 (시스템 전체)
  | 'admin'            // 사업자/관리자 (조직 내)
  | 'manager'          // 매니저 (부서/팀 관리)
  | 'worker'           // 워커 (일반 직원)
  | 'franchise_admin'  // 프랜차이즈 본사 관리자

export type OrgType = 
  | 'personal'         // 개인사업자
  | 'business_owner'   // 사업자
  | 'corporation'      // 법인
  | 'franchise_hq'     // 프랜차이즈 본사
  | 'franchise_store'  // 프랜차이즈 매장

// =====================================================
// Identity Interface
// =====================================================

export interface Identity {
  id: string
  email: string
  phone?: string
  fullName: string
  birthDate?: string
  idType: IdType
  idNumber?: string
  businessVerificationStatus: 'pending' | 'verified' | 'rejected'
  businessVerificationData: Record<string, any>
  authUserId?: string
  profileData: Record<string, any>
  isVerified: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// =====================================================
// Organization Interface
// =====================================================

export interface Organization {
  id: string
  code: string
  name: string
  displayName?: string
  description?: string
  logoUrl?: string
  orgType: OrgType
  parentOrgId?: string
  ownerIdentityId: string
  businessRegistration: Record<string, any>
  businessVerificationStatus: string
  settings: OrganizationSettings
  maxEmployees?: number
  maxLocations?: number
  subscriptionTier?: string
  subscriptionExpiresAt?: Date
  billingData: Record<string, any>
  isActive: boolean
  suspendedAt?: Date
  suspensionReason?: string
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
    threshold: number
  }
  gpsTracking: {
    enabled: boolean
    radius: number
  }
  approvalRequired: boolean
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
}

// =====================================================
// Role Assignment Interface
// =====================================================

export interface RoleAssignment {
  id: string
  identityId: string
  organizationId?: string
  role: UnifiedRole
  isActive: boolean
  isPrimary: boolean
  customPermissions: Record<string, any>
  accessRestrictions: Record<string, any>
  assignedAt: Date
  assignedBy: string
  revokedAt?: Date
  revokedBy?: string
  revocationReason?: string
  metadata: Record<string, any>
}

// =====================================================
// Request/Response Types
// =====================================================

export interface CreateIdentityRequest {
  email: string
  phone?: string
  fullName: string
  birthDate?: string
  idType: IdType
  idNumber?: string
  businessData?: Record<string, any>
  authUserId?: string
  profileData?: Record<string, any>
}

export interface CreateIdentityResponse {
  success: boolean
  identity?: Identity
  requiresVerification?: boolean
  verificationMethod?: string
  error?: string
}

export interface CreateOrganizationRequest {
  name: string
  displayName?: string
  orgType: OrgType
  ownerIdentityId: string
  businessNumber?: string
  settings?: Partial<OrganizationSettings>
  parentOrgId?: string
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

// =====================================================
// Validation Patterns
// =====================================================

export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^010-?\d{4}-?\d{4}$/,
  businessNumber: /^\d{3}-?\d{2}-?\d{5}$/,
  corporateNumber: /^\d{6}-?\d{7}$/
}

// =====================================================
// Error Codes
// =====================================================

export const ERROR_CODES = {
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_BUSINESS_NUMBER: 'INVALID_BUSINESS_NUMBER',
  
  // Identity Errors
  IDENTITY_NOT_FOUND: 'IDENTITY_NOT_FOUND',
  IDENTITY_ALREADY_EXISTS: 'IDENTITY_ALREADY_EXISTS',
  IDENTITY_NOT_VERIFIED: 'IDENTITY_NOT_VERIFIED',
  
  // Organization Errors
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  ORGANIZATION_NAME_EXISTS: 'ORGANIZATION_NAME_EXISTS',
  INVALID_ORGANIZATION_TYPE: 'INVALID_ORGANIZATION_TYPE',
  INVALID_OWNERSHIP_RULES: 'INVALID_OWNERSHIP_RULES',
  
  // Role Errors
  ROLE_ALREADY_ASSIGNED: 'ROLE_ALREADY_ASSIGNED',
  INVALID_ROLE_ASSIGNMENT: 'INVALID_ROLE_ASSIGNMENT',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // System Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR'
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Generate unique organization code
 */
export function generateOrgCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

/**
 * Validate business ownership rules
 */
export function validateBusinessOwnership(ownerType: IdType, orgType: OrgType): boolean {
  switch (orgType) {
    case 'personal':
      return true // Personal orgs can be owned by anyone
    case 'business_owner':
      return ownerType === 'business_owner'
    case 'corporation':
      return ownerType === 'corporation'
    case 'franchise_hq':
      return ownerType === 'business_owner' || ownerType === 'corporation'
    case 'franchise_store':
      return true // Franchise stores can be owned by various types
    default:
      return false
  }
}

/**
 * Validate franchise hierarchy
 */
export function validateFranchiseHierarchy(parentOrgType: OrgType, childOrgType: OrgType): boolean {
  if (childOrgType === 'franchise_store') {
    return parentOrgType === 'franchise_hq'
  }
  return true
}

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: UnifiedRole): number {
  switch (role) {
    case 'master': return 100
    case 'franchise_admin': return 80
    case 'admin': return 60
    case 'manager': return 40
    case 'worker': return 20
    default: return 0
  }
}

/**
 * Check if role can assign another role
 */
export function canAssignRole(assignerRole: UnifiedRole, targetRole: UnifiedRole): boolean {
  const assignerLevel = getRoleLevel(assignerRole)
  const targetLevel = getRoleLevel(targetRole)
  
  // Master can assign any role
  if (assignerRole === 'master') return true
  
  // Can only assign roles at lower level
  return assignerLevel > targetLevel
}

/**
 * Get default permissions for role
 */
export function getDefaultPermissions(role: UnifiedRole): Record<string, boolean> {
  const basePermissions = {
    read_profile: true,
    update_profile: true,
    read_attendance: false,
    create_attendance: false,
    update_attendance: false,
    delete_attendance: false,
    read_reports: false,
    create_reports: false,
    manage_users: false,
    manage_organization: false,
    system_admin: false
  }

  switch (role) {
    case 'master':
      return {
        ...basePermissions,
        read_attendance: true,
        create_attendance: true,
        update_attendance: true,
        delete_attendance: true,
        read_reports: true,
        create_reports: true,
        manage_users: true,
        manage_organization: true,
        system_admin: true
      }
    
    case 'franchise_admin':
    case 'admin':
      return {
        ...basePermissions,
        read_attendance: true,
        create_attendance: true,
        update_attendance: true,
        delete_attendance: true,
        read_reports: true,
        create_reports: true,
        manage_users: true,
        manage_organization: true
      }
    
    case 'manager':
      return {
        ...basePermissions,
        read_attendance: true,
        create_attendance: true,
        update_attendance: true,
        read_reports: true,
        create_reports: true,
        manage_users: true
      }
    
    case 'worker':
      return {
        ...basePermissions,
        read_attendance: true,
        create_attendance: true
      }
    
    default:
      return basePermissions
  }
}

// =====================================================
// Type Guards
// =====================================================

export function isBusinessIdentity(idType: IdType): boolean {
  return ['business_owner', 'corporation', 'franchise_hq'].includes(idType)
}

export function isPersonalIdentity(idType: IdType): boolean {
  return idType === 'personal'
}

export function isFranchiseOrganization(orgType: OrgType): boolean {
  return ['franchise_hq', 'franchise_store'].includes(orgType)
}

export function isBusinessOrganization(orgType: OrgType): boolean {
  return ['business_owner', 'corporation'].includes(orgType)
}

export function requiresVerification(idType: IdType): boolean {
  return isBusinessIdentity(idType)
}

// =====================================================
// API Response Types
// =====================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// =====================================================
// Auth Integration Types
// =====================================================

export interface AuthUser {
  id: string
  email: string
  name?: string
  role?: UnifiedRole
  identityId?: string
  organizationId?: string
  permissions?: Record<string, boolean>
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  refreshToken?: string
  expiresAt: Date
}