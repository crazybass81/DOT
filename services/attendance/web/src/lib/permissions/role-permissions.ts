/**
 * Role-Based Permission System for ID-ROLE-PAPER Architecture
 * 
 * Defines comprehensive permissions for the 7-role system where permissions
 * are determined by computed roles derived from owned PAPER documents.
 */

import {
  RoleType,
  Permission,
  RolePermissions,
  PaperType,
  BusinessType
} from '../../../src/types/id-role-paper';

/**
 * Resource definitions for the attendance system
 */
export enum Resource {
  // Identity & User Management
  IDENTITY = 'identity',
  PAPER = 'paper',
  BUSINESS_REGISTRATION = 'business_registration',
  
  // Attendance Management
  ATTENDANCE = 'attendance',
  SCHEDULE = 'schedule',
  SHIFT = 'shift',
  
  // Administrative
  ORGANIZATION = 'organization',
  USER_ROLES = 'user_roles',
  REPORTS = 'reports',
  APPROVALS = 'approvals',
  
  // System
  SETTINGS = 'settings',
  AUDIT_LOGS = 'audit_logs',
  NOTIFICATIONS = 'notifications'
}

/**
 * Action definitions
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  MANAGE = 'manage',
  VERIFY = 'verify',
  ASSIGN = 'assign',
  REVOKE = 'revoke'
}

/**
 * Permission condition types for context-specific access control
 */
export interface PermissionCondition {
  type: 'self' | 'business_context' | 'role_hierarchy' | 'paper_ownership' | 'verification_status';
  value?: any;
  metadata?: Record<string, any>;
}

/**
 * Enhanced permission with conditions and context
 */
export interface EnhancedPermission extends Permission {
  conditions?: PermissionCondition[];
  description: string;
  requiresVerification?: boolean;
}

/**
 * SEEKER Role Permissions
 * Default role with minimal permissions focused on job seeking
 */
const SEEKER_PERMISSIONS: EnhancedPermission[] = [
  {
    resource: Resource.IDENTITY,
    action: Action.READ,
    description: 'View own identity information',
    conditions: [{ type: 'self' }]
  },
  {
    resource: Resource.IDENTITY,
    action: Action.UPDATE,
    description: 'Update own basic profile information',
    conditions: [{ type: 'self' }]
  },
  {
    resource: Resource.PAPER,
    action: Action.READ,
    description: 'View own papers',
    conditions: [{ type: 'paper_ownership' }]
  },
  {
    resource: Resource.ATTENDANCE,
    action: Action.READ,
    description: 'View own attendance records',
    conditions: [{ type: 'self' }]
  },
  {
    resource: Resource.SCHEDULE,
    action: Action.READ,
    description: 'View available schedules',
    conditions: [{ type: 'self' }]
  }
];

/**
 * WORKER Role Permissions
 * Employee-level permissions with employment contract
 */
const WORKER_PERMISSIONS: EnhancedPermission[] = [
  ...SEEKER_PERMISSIONS,
  {
    resource: Resource.ATTENDANCE,
    action: Action.CREATE,
    description: 'Check in/out for attendance',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.ATTENDANCE,
    action: Action.UPDATE,
    description: 'Update own attendance records (within policy)',
    businessContext: true,
    conditions: [{ type: 'self' }, { type: 'business_context' }]
  },
  {
    resource: Resource.SHIFT,
    action: Action.READ,
    description: 'View assigned shifts',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.SCHEDULE,
    action: Action.READ,
    description: 'View work schedules',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.PAPER,
    action: Action.CREATE,
    description: 'Request additional work-related papers',
    conditions: [{ type: 'paper_ownership' }]
  }
];

/**
 * MANAGER Role Permissions
 * Management-level permissions with authority delegation
 */
const MANAGER_PERMISSIONS: EnhancedPermission[] = [
  ...WORKER_PERMISSIONS,
  {
    resource: Resource.ATTENDANCE,
    action: Action.READ,
    description: 'View team attendance records',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.ATTENDANCE,
    action: Action.APPROVE,
    description: 'Approve/reject attendance modifications',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.SCHEDULE,
    action: Action.CREATE,
    description: 'Create work schedules',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.SCHEDULE,
    action: Action.UPDATE,
    description: 'Modify work schedules',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.SHIFT,
    action: Action.ASSIGN,
    description: 'Assign shifts to workers',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.USER_ROLES,
    action: Action.READ,
    description: 'View team roles and assignments',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.REPORTS,
    action: Action.READ,
    description: 'View team performance reports',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  }
];

/**
 * SUPERVISOR Role Permissions
 * Senior management with supervisor authority delegation
 */
const SUPERVISOR_PERMISSIONS: EnhancedPermission[] = [
  ...MANAGER_PERMISSIONS,
  {
    resource: Resource.ATTENDANCE,
    action: Action.MANAGE,
    description: 'Full attendance management for business',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.USER_ROLES,
    action: Action.ASSIGN,
    description: 'Assign worker and manager roles',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.PAPER,
    action: Action.APPROVE,
    description: 'Approve work-related papers',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.REPORTS,
    action: Action.CREATE,
    description: 'Generate business reports',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.SETTINGS,
    action: Action.UPDATE,
    description: 'Modify business attendance settings',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  }
];

/**
 * OWNER Role Permissions
 * Business owner with full business control
 */
const OWNER_PERMISSIONS: EnhancedPermission[] = [
  ...SUPERVISOR_PERMISSIONS,
  {
    resource: Resource.BUSINESS_REGISTRATION,
    action: Action.MANAGE,
    description: 'Full business registration management',
    businessContext: true,
    conditions: [{ type: 'paper_ownership' }]
  },
  {
    resource: Resource.ORGANIZATION,
    action: Action.MANAGE,
    description: 'Full organization management',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.USER_ROLES,
    action: Action.MANAGE,
    description: 'Full role management for business',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.PAPER,
    action: Action.VERIFY,
    description: 'Verify business-related papers',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.AUDIT_LOGS,
    action: Action.READ,
    description: 'View business audit logs',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.SETTINGS,
    action: Action.MANAGE,
    description: 'Full business settings management',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  }
];

/**
 * FRANCHISEE Role Permissions
 * Franchise location owner with franchise agreement
 */
const FRANCHISEE_PERMISSIONS: EnhancedPermission[] = [
  ...OWNER_PERMISSIONS,
  {
    resource: Resource.REPORTS,
    action: Action.CREATE,
    description: 'Generate franchise compliance reports',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.SETTINGS,
    action: Action.READ,
    description: 'View franchise system settings',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  },
  {
    resource: Resource.NOTIFICATIONS,
    action: Action.READ,
    description: 'Receive franchise communications',
    businessContext: true,
    conditions: [{ type: 'business_context' }]
  }
];

/**
 * FRANCHISOR Role Permissions
 * Franchise headquarters with system-wide control
 */
const FRANCHISOR_PERMISSIONS: EnhancedPermission[] = [
  ...FRANCHISEE_PERMISSIONS,
  {
    resource: Resource.ORGANIZATION,
    action: Action.READ,
    description: 'View all franchise locations',
    conditions: [{ type: 'verification_status', value: 'verified' }]
  },
  {
    resource: Resource.REPORTS,
    action: Action.READ,
    description: 'View system-wide franchise reports',
    conditions: [{ type: 'verification_status', value: 'verified' }]
  },
  {
    resource: Resource.SETTINGS,
    action: Action.MANAGE,
    description: 'Manage franchise system settings',
    conditions: [{ type: 'verification_status', value: 'verified' }]
  },
  {
    resource: Resource.PAPER,
    action: Action.VERIFY,
    description: 'Verify franchise-related papers',
    conditions: [{ type: 'verification_status', value: 'verified' }]
  },
  {
    resource: Resource.USER_ROLES,
    action: Action.READ,
    description: 'View franchise system roles',
    conditions: [{ type: 'verification_status', value: 'verified' }]
  },
  {
    resource: Resource.AUDIT_LOGS,
    action: Action.READ,
    description: 'View system-wide audit logs',
    conditions: [{ type: 'verification_status', value: 'verified' }]
  },
  {
    resource: Resource.NOTIFICATIONS,
    action: Action.MANAGE,
    description: 'Manage franchise communications',
    conditions: [{ type: 'verification_status', value: 'verified' }]
  }
];

/**
 * Role permission mappings
 */
export const ROLE_PERMISSIONS_MAP: Record<RoleType, RolePermissions> = {
  [RoleType.SEEKER]: {
    role: RoleType.SEEKER,
    permissions: SEEKER_PERMISSIONS
  },
  [RoleType.WORKER]: {
    role: RoleType.WORKER,
    permissions: WORKER_PERMISSIONS,
    inheritsFrom: [RoleType.SEEKER]
  },
  [RoleType.MANAGER]: {
    role: RoleType.MANAGER,
    permissions: MANAGER_PERMISSIONS,
    inheritsFrom: [RoleType.WORKER, RoleType.SEEKER]
  },
  [RoleType.SUPERVISOR]: {
    role: RoleType.SUPERVISOR,
    permissions: SUPERVISOR_PERMISSIONS,
    inheritsFrom: [RoleType.MANAGER, RoleType.WORKER, RoleType.SEEKER]
  },
  [RoleType.OWNER]: {
    role: RoleType.OWNER,
    permissions: OWNER_PERMISSIONS,
    inheritsFrom: [RoleType.SUPERVISOR, RoleType.MANAGER, RoleType.WORKER, RoleType.SEEKER]
  },
  [RoleType.FRANCHISEE]: {
    role: RoleType.FRANCHISEE,
    permissions: FRANCHISEE_PERMISSIONS,
    inheritsFrom: [RoleType.OWNER, RoleType.SUPERVISOR, RoleType.MANAGER, RoleType.WORKER, RoleType.SEEKER]
  },
  [RoleType.FRANCHISOR]: {
    role: RoleType.FRANCHISOR,
    permissions: FRANCHISOR_PERMISSIONS,
    inheritsFrom: [RoleType.FRANCHISEE, RoleType.OWNER, RoleType.SUPERVISOR, RoleType.MANAGER, RoleType.WORKER, RoleType.SEEKER]
  }
};

/**
 * Permission Service for role-based access control
 */
export class PermissionService {
  private static instance: PermissionService;

  static getInstance(): PermissionService {
    if (!this.instance) {
      this.instance = new PermissionService();
    }
    return this.instance;
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(
    role: RoleType,
    resource: Resource | string,
    action: Action | string,
    context?: {
      businessContextId?: string;
      targetUserId?: string;
      currentUserId?: string;
      userVerified?: boolean;
    }
  ): boolean {
    const rolePermissions = ROLE_PERMISSIONS_MAP[role];
    if (!rolePermissions) return false;

    // Check direct permissions
    const hasDirectPermission = this.checkDirectPermission(
      rolePermissions.permissions,
      resource,
      action,
      context
    );

    if (hasDirectPermission) return true;

    // Check inherited permissions
    if (rolePermissions.inheritsFrom) {
      for (const inheritedRole of rolePermissions.inheritsFrom) {
        if (this.hasPermission(inheritedRole, resource, action, context)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: RoleType): EnhancedPermission[] {
    const rolePermissions = ROLE_PERMISSIONS_MAP[role];
    if (!rolePermissions) return [];

    let permissions = [...rolePermissions.permissions];

    // Add inherited permissions
    if (rolePermissions.inheritsFrom) {
      for (const inheritedRole of rolePermissions.inheritsFrom) {
        const inheritedPermissions = this.getRolePermissions(inheritedRole);
        permissions = [...permissions, ...inheritedPermissions];
      }
    }

    // Remove duplicates based on resource and action
    const uniquePermissions = permissions.filter((permission, index, self) => 
      index === self.findIndex(p => 
        p.resource === permission.resource && p.action === permission.action
      )
    );

    return uniquePermissions;
  }

  /**
   * Get permissions for multiple roles
   */
  getMultiRolePermissions(roles: RoleType[]): EnhancedPermission[] {
    const allPermissions: EnhancedPermission[] = [];

    for (const role of roles) {
      const rolePermissions = this.getRolePermissions(role);
      allPermissions.push(...rolePermissions);
    }

    // Remove duplicates
    const uniquePermissions = allPermissions.filter((permission, index, self) => 
      index === self.findIndex(p => 
        p.resource === permission.resource && p.action === permission.action
      )
    );

    return uniquePermissions;
  }

  /**
   * Check if multiple roles can perform an action
   */
  hasMultiRolePermission(
    roles: RoleType[],
    resource: Resource | string,
    action: Action | string,
    context?: {
      businessContextId?: string;
      targetUserId?: string;
      currentUserId?: string;
      userVerified?: boolean;
    }
  ): boolean {
    for (const role of roles) {
      if (this.hasPermission(role, resource, action, context)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get permission explanation for debugging
   */
  getPermissionExplanation(
    role: RoleType,
    resource: Resource | string,
    action: Action | string
  ): {
    granted: boolean;
    reason: string;
    permission?: EnhancedPermission;
    source?: 'direct' | 'inherited';
    sourceRole?: RoleType;
  } {
    const rolePermissions = ROLE_PERMISSIONS_MAP[role];
    if (!rolePermissions) {
      return {
        granted: false,
        reason: `Unknown role: ${role}`
      };
    }

    // Check direct permissions
    const directPermission = rolePermissions.permissions.find(
      p => p.resource === resource && p.action === action
    );

    if (directPermission) {
      return {
        granted: true,
        reason: 'Direct permission granted',
        permission: directPermission,
        source: 'direct'
      };
    }

    // Check inherited permissions
    if (rolePermissions.inheritsFrom) {
      for (const inheritedRole of rolePermissions.inheritsFrom) {
        const explanation = this.getPermissionExplanation(inheritedRole, resource, action);
        if (explanation.granted) {
          return {
            ...explanation,
            source: 'inherited',
            sourceRole: inheritedRole
          };
        }
      }
    }

    return {
      granted: false,
      reason: `No permission found for ${role} to ${action} ${resource}`
    };
  }

  /**
   * Validate permission conditions
   */
  private checkConditions(
    conditions: PermissionCondition[],
    context?: {
      businessContextId?: string;
      targetUserId?: string;
      currentUserId?: string;
      userVerified?: boolean;
    }
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    if (!context) return false;

    for (const condition of conditions) {
      switch (condition.type) {
        case 'self':
          if (context.targetUserId && context.currentUserId && 
              context.targetUserId !== context.currentUserId) {
            return false;
          }
          break;
        case 'business_context':
          if (!context.businessContextId) return false;
          break;
        case 'verification_status':
          if (condition.value === 'verified' && !context.userVerified) {
            return false;
          }
          break;
        // Add more condition types as needed
      }
    }

    return true;
  }

  /**
   * Check direct permission with conditions
   */
  private checkDirectPermission(
    permissions: EnhancedPermission[],
    resource: Resource | string,
    action: Action | string,
    context?: {
      businessContextId?: string;
      targetUserId?: string;
      currentUserId?: string;
      userVerified?: boolean;
    }
  ): boolean {
    const permission = permissions.find(
      p => p.resource === resource && p.action === action
    );

    if (!permission) return false;

    // Check conditions
    if (permission.conditions) {
      return this.checkConditions(permission.conditions, context);
    }

    return true;
  }
}

// Export singleton instance
export const permissionService = PermissionService.getInstance();

// Export commonly used permission checking functions
export const checkPermission = (
  role: RoleType,
  resource: Resource | string,
  action: Action | string,
  context?: Parameters<typeof permissionService.hasPermission>[3]
): boolean => {
  return permissionService.hasPermission(role, resource, action, context);
};

export const checkMultiRolePermission = (
  roles: RoleType[],
  resource: Resource | string,
  action: Action | string,
  context?: Parameters<typeof permissionService.hasMultiRolePermission>[3]
): boolean => {
  return permissionService.hasMultiRolePermission(roles, resource, action, context);
};

// Export types and constants (Resource and Action already exported as enums)
export {
  PermissionCondition,
  EnhancedPermission
};