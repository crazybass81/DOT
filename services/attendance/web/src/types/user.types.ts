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

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roles?: UserRole[];
  organizationId?: string;
  isVerified?: boolean;
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