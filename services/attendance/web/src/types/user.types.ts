// User Types - 4-tier role hierarchy for DOT Attendance Service

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