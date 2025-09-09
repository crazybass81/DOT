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

export interface UserPermissions {
  canManageUsers: boolean;
  canViewReports: boolean;
  canApproveRequests: boolean;
  canManageSettings: boolean;
  canCheckIn: boolean;
  canCheckOut: boolean;
  canViewOwnRecords: boolean;
}