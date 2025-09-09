// User Types - Updated for ID-ROLE-PAPER unified architecture
// Migration Phase 1: Introducing new types while maintaining legacy compatibility

import { IdType, RoleType, PaperType } from './id-role-paper-unified';

// Legacy UserRole enum - DEPRECATED: Use RoleType from unified system
/** @deprecated Use RoleType from id-role-paper-unified.ts instead */
export enum UserRole {
  MASTER_ADMIN = 'MASTER_ADMIN',
  ADMIN = 'ADMIN', 
  MANAGER = 'MANAGER',
  WORKER = 'WORKER',
  // Legacy compatibility
  EMPLOYEE = 'EMPLOYEE',
  BUSINESS_ADMIN = 'BUSINESS_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

// Legacy to new role mapping
export const LEGACY_TO_NEW_ROLE_MAPPING: Record<UserRole, RoleType> = {
  [UserRole.SUPER_ADMIN]: RoleType.FRANCHISOR,
  [UserRole.MASTER_ADMIN]: RoleType.FRANCHISOR,
  [UserRole.ADMIN]: RoleType.OWNER,
  [UserRole.BUSINESS_ADMIN]: RoleType.OWNER,
  [UserRole.MANAGER]: RoleType.MANAGER,
  [UserRole.WORKER]: RoleType.WORKER,
  [UserRole.EMPLOYEE]: RoleType.WORKER,
};

// Legacy User interface - DEPRECATED: Use UnifiedIdentity from unified system
/** @deprecated Use UnifiedIdentity from id-role-paper-unified.ts instead */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roles?: UserRole[];
  organizationId?: string;
  isVerified?: boolean;
}

// New ID-ROLE-PAPER compatible user interface
export interface ModernUser {
  // Identity
  identityId: string;
  idType: IdType;
  
  // Personal Information
  email: string;
  name: string;
  
  // Dynamic Role (computed from papers)
  currentRole: RoleType;
  availableRoles: RoleType[];
  
  // Papers that grant roles
  papers: Array<{
    paperId: string;
    paperType: PaperType;
    isActive: boolean;
    validFrom: Date;
    validUntil?: Date;
    businessId?: string; // Context for business-specific papers
  }>;
  
  // Business Context
  businessAffiliations: Array<{
    businessId: string;
    role: RoleType;
    papers: PaperType[];
  }>;
  
  // Status
  isVerified: boolean;
  lastRoleUpdate: Date;
}

// Legacy UserPermissions interface - DEPRECATED: Use dynamic Permission system
/** @deprecated Use Permission[] from id-role-paper-unified.ts for dynamic permissions */
export interface UserPermissions {
  canManageUsers: boolean;
  canViewReports: boolean;
  canApproveRequests: boolean;
  canManageSettings: boolean;
  canCheckIn: boolean;
  canCheckOut: boolean;
  canViewOwnRecords: boolean;
}

// New dynamic permission system
export interface UserPermissionContext {
  identityId: string;
  currentRole: RoleType;
  businessContextId?: string;
  
  // Computed permissions based on papers and role
  grantedPermissions: Array<{
    resource: string;
    actions: string[];
    conditions?: Record<string, any>;
    grantedBy: {
      paperType: PaperType;
      paperId: string;
    };
  }>;
  
  // Quick permission checks for common operations
  can: {
    manageUsers: boolean;
    viewReports: boolean;
    approveRequests: boolean;
    manageSettings: boolean;
    checkIn: boolean;
    checkOut: boolean;
    viewOwnRecords: boolean;
    // Dynamic permissions
    access: (resource: string, action: string, conditions?: Record<string, any>) => boolean;
    hasRole: (role: RoleType, businessContext?: string) => boolean;
  };
  
  // Permission calculation metadata
  calculatedAt: Date;
  expiresAt?: Date;
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Convert legacy User to ModernUser
 * 기존 User 인터페이스를 새로운 ModernUser로 변환
 */
export const convertLegacyUserToModern = (legacyUser: User): Partial<ModernUser> => {
  const newRole = LEGACY_TO_NEW_ROLE_MAPPING[legacyUser.role];
  
  return {
    identityId: legacyUser.id,
    idType: IdType.PERSONAL, // Default to PERSONAL, should be determined by business logic
    email: legacyUser.email,
    name: legacyUser.name,
    currentRole: newRole,
    availableRoles: [newRole],
    papers: [], // To be populated based on role
    businessAffiliations: legacyUser.organizationId ? [{
      businessId: legacyUser.organizationId,
      role: newRole,
      papers: [] // To be determined based on role
    }] : [],
    isVerified: legacyUser.isVerified ?? false,
    lastRoleUpdate: new Date()
  };
};

/**
 * Convert legacy UserPermissions to UserPermissionContext
 * 기존 권한 시스템을 새로운 동적 권한 시스템으로 변환
 */
export const convertLegacyPermissionsToContext = (
  permissions: UserPermissions,
  identityId: string,
  role: RoleType
): Partial<UserPermissionContext> => {
  return {
    identityId,
    currentRole: role,
    grantedPermissions: [], // To be calculated by permission service
    can: {
      manageUsers: permissions.canManageUsers,
      viewReports: permissions.canViewReports,
      approveRequests: permissions.canApproveRequests,
      manageSettings: permissions.canManageSettings,
      checkIn: permissions.canCheckIn,
      checkOut: permissions.canCheckOut,
      viewOwnRecords: permissions.canViewOwnRecords,
      access: () => false, // Placeholder - to be implemented by permission service
      hasRole: () => false  // Placeholder - to be implemented by permission service
    },
    calculatedAt: new Date()
  };
};

/**
 * Check if user has specific legacy role
 * 기존 역할 시스템과의 호환성을 위한 유틸리티
 */
export const hasLegacyRole = (user: ModernUser, legacyRole: UserRole): boolean => {
  const mappedRole = LEGACY_TO_NEW_ROLE_MAPPING[legacyRole];
  return user.availableRoles.includes(mappedRole);
};

/**
 * Get display name for user role
 * 사용자 역할의 표시명 반환
 */
export const getUserRoleDisplayName = (role: RoleType): string => {
  const roleDisplayNames: Record<RoleType, string> = {
    [RoleType.SEEKER]: '구직자',
    [RoleType.WORKER]: '워커',
    [RoleType.MANAGER]: '매니저', 
    [RoleType.SUPERVISOR]: '수퍼바이저',
    [RoleType.OWNER]: '사업자관리자',
    [RoleType.FRANCHISEE]: '가맹점주',
    [RoleType.FRANCHISOR]: '가맹본부관리자'
  };
  return roleDisplayNames[role] || role;
};

// ========== LEGACY COMPATIBILITY ==========

/**
 * Legacy role hierarchy for backward compatibility
 * 기존 시스템과의 호환성을 위한 역할 계층
 */
export const LEGACY_ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.WORKER]: 1,
  [UserRole.EMPLOYEE]: 1,
  [UserRole.MANAGER]: 2,
  [UserRole.ADMIN]: 3,
  [UserRole.BUSINESS_ADMIN]: 3,
  [UserRole.MASTER_ADMIN]: 4,
  [UserRole.SUPER_ADMIN]: 4,
};

/**
 * Check if user has higher or equal legacy role
 * 기존 역할 계층에서의 권한 비교
 */
export const hasHigherOrEqualLegacyRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return LEGACY_ROLE_HIERARCHY[userRole] >= LEGACY_ROLE_HIERARCHY[requiredRole];
};