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

// Legacy IdType - DEPRECATED: Use IdType from id-role-paper-unified.ts
/** @deprecated Use IdType from id-role-paper-unified.ts instead */
export type LegacyIdType = 
  | 'personal'           // 개인
  | 'business_owner'     // 사업자
  | 'corporation'        // 법인
  | 'franchise_hq'       // 프랜차이즈 본사

// Mapping from legacy IdType to new IdType
export const LEGACY_ID_TYPE_MAPPING: Record<LegacyIdType, IdType> = {
  'personal': IdType.PERSONAL,
  'business_owner': IdType.CORPORATE,
  'corporation': IdType.CORPORATE,
  'franchise_hq': IdType.CORPORATE,
};

// Legacy UnifiedRole - DEPRECATED: Use RoleType from id-role-paper-unified.ts
/** @deprecated Use RoleType from id-role-paper-unified.ts instead */
export type UnifiedRole = 
  | 'master'           // 마스터 관리자 (시스템 전체)
  | 'admin'            // 사업자/관리자 (조직 내)
  | 'manager'          // 매니저 (부서/팀 관리)
  | 'worker'           // 워커 (일반 직원)
  | 'franchise_admin'  // 프랜차이즈 본사 관리자

// Mapping from legacy UnifiedRole to new RoleType
export const LEGACY_UNIFIED_ROLE_MAPPING: Record<UnifiedRole, RoleType> = {
  'master': RoleType.FRANCHISOR,
  'franchise_admin': RoleType.FRANCHISOR,
  'admin': RoleType.OWNER,
  'manager': RoleType.MANAGER,
  'worker': RoleType.WORKER,
};

// Legacy compatibility exports for migration period
/** @deprecated All interfaces below are deprecated. Use types from id-role-paper-unified.ts */

// Re-export new types for compatibility
export type { UnifiedIdentity as Identity } from './id-role-paper-unified';
export type { BusinessRegistration as Organization } from './id-role-paper-unified';

/**
 * Generate unique organization code (legacy utility)
 * @deprecated This function will be moved to a utility module
 */
export function generateOrgCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// All remaining functions are deprecated and should use the new ID-ROLE-PAPER system
// This file serves only as a compatibility layer during migration

export default {
  // Export mappings for easy reference during migration
  LEGACY_ID_TYPE_MAPPING,
  LEGACY_UNIFIED_ROLE_MAPPING,
};
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