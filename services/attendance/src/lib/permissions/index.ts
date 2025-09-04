// =====================================================
// Permission System Implementation
// Based on user-permission-diagram.md specifications
// =====================================================

import { 
  User, 
  UserRole, 
  Permission, 
  PermissionCheck, 
  PermissionResult,
  ROLE_HIERARCHY 
} from '../../types'

// =====================================================
// Core Permission Functions
// =====================================================

/**
 * Check if a user has permission to perform an action on a resource
 */
export async function checkPermission(
  check: PermissionCheck,
  permissions: Permission[]
): Promise<PermissionResult> {
  const { user, resource, action, organizationId, resourceId } = check

  // Master admin has all permissions
  if (user.role === UserRole.MasterAdmin) {
    return { allowed: true, reason: 'Master admin has full access' }
  }

  // Check organization membership for non-master admins
  if (user.organization_id && organizationId) {
    if (user.organization_id !== organizationId) {
      return { 
        allowed: false, 
        reason: 'User does not belong to this organization' 
      }
    }
  }

  // Find matching permissions
  const rolePermissions = permissions.filter(p => 
    p.role === user.role && 
    p.resource === resource && 
    p.action === action
  )

  if (rolePermissions.length === 0) {
    return { 
      allowed: false, 
      reason: `Role ${user.role} does not have ${action} permission on ${resource}` 
    }
  }

  // Check conditions if any
  for (const permission of rolePermissions) {
    if (permission.conditions && Object.keys(permission.conditions).length > 0) {
      const conditionsMet = await evaluateConditions(
        permission.conditions, 
        { user, organizationId, resourceId }
      )
      
      if (!conditionsMet) {
        return { 
          allowed: false, 
          reason: 'Permission conditions not met',
          conditions: permission.conditions
        }
      }
    }
  }

  return { allowed: true }
}

/**
 * Evaluate permission conditions
 */
async function evaluateConditions(
  conditions: Record<string, any>,
  context: { user: User; organizationId?: string; resourceId?: string }
): Promise<boolean> {
  for (const [key, value] of Object.entries(conditions)) {
    switch (key) {
      case 'own_resource':
        if (value === true) {
          // Check if user owns the resource
          // This would need to be implemented based on specific resource type
          // For now, returning true as placeholder
          return true
        }
        break

      case 'same_organization':
        if (value === true && context.organizationId) {
          if (context.user.organization_id !== context.organizationId) {
            return false
          }
        }
        break

      case 'team_member':
        if (value === true) {
          // Check if resource belongs to user's team
          // Would need to check against employee's manager_id
          // For now, returning true as placeholder
          return true
        }
        break

      default:
        // Unknown condition, fail safe
        return false
    }
  }

  return true
}

/**
 * Check if one role can perform actions on another role
 */
export function canManageRole(
  actorRole: UserRole,
  targetRole: UserRole
): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}

/**
 * Check if a role has higher privilege than another
 */
export function hasHigherPrivilege(
  role1: UserRole,
  role2: UserRole
): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2]
}

/**
 * Get all roles a user can assign
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  const userLevel = ROLE_HIERARCHY[userRole]
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, level]) => level < userLevel)
    .map(([role]) => role as UserRole)
}

// =====================================================
// Permission Matrix
// =====================================================

export interface PermissionMatrix {
  [role: string]: {
    [resource: string]: string[]  // Array of allowed actions
  }
}

export const PERMISSION_MATRIX: PermissionMatrix = {
  [UserRole.MasterAdmin]: {
    organizations: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    employees: ['create', 'read', 'update', 'delete'],
    attendance: ['create', 'read', 'update', 'delete', 'approve'],
    shifts: ['create', 'read', 'update', 'delete', 'assign'],
    locations: ['create', 'read', 'update', 'delete'],
    permissions: ['create', 'read', 'update', 'delete'],
    reports: ['generate', 'read', 'export'],
    audit_logs: ['read'],
    notifications: ['create', 'read', 'update', 'delete'],
    system: ['manage', 'configure'],
  },
  
  [UserRole.Admin]: {
    users: ['create', 'read', 'update'],  // Cannot delete users
    employees: ['create', 'read', 'update', 'delete'],
    attendance: ['create', 'read', 'update', 'delete', 'approve'],
    shifts: ['create', 'read', 'update', 'delete', 'assign'],
    locations: ['create', 'read', 'update', 'delete'],
    reports: ['generate', 'read', 'export'],
    audit_logs: ['read'],
    notifications: ['create', 'read'],
    role_templates: ['create', 'read', 'update', 'delete'],
  },
  
  [UserRole.Manager]: {
    employees: ['read', 'update'],  // Can update team members only
    attendance: ['create', 'read', 'update', 'approve'],
    shifts: ['read', 'assign'],
    locations: ['read'],
    reports: ['view', 'export'],  // Limited report access
    notifications: ['read'],
  },
  
  [UserRole.Worker]: {
    attendance: ['create', 'read'],  // Own attendance only
    profile: ['read', 'update'],     // Own profile only
    shifts: ['read'],                 // Own shifts only
    locations: ['read'],
    notifications: ['read'],
  },
}

/**
 * Check if a role has a specific permission using the matrix
 */
export function hasPermissionInMatrix(
  role: UserRole,
  resource: string,
  action: string
): boolean {
  const rolePermissions = PERMISSION_MATRIX[role]
  if (!rolePermissions) return false
  
  const resourceActions = rolePermissions[resource]
  if (!resourceActions) return false
  
  return resourceActions.includes(action)
}

// =====================================================
// Resource-based Permissions
// =====================================================

export interface ResourcePermission {
  resource: string
  actions: string[]
  conditions?: Record<string, any>
}

/**
 * Get all permissions for a user role
 */
export function getRolePermissions(role: UserRole): ResourcePermission[] {
  const permissions: ResourcePermission[] = []
  const roleMatrix = PERMISSION_MATRIX[role]
  
  if (!roleMatrix) return permissions
  
  for (const [resource, actions] of Object.entries(roleMatrix)) {
    permissions.push({
      resource,
      actions: actions as string[],
      conditions: getDefaultConditions(role, resource)
    })
  }
  
  return permissions
}

/**
 * Get default conditions for a role and resource
 */
function getDefaultConditions(
  role: UserRole,
  resource: string
): Record<string, any> | undefined {
  // Workers can only access their own data
  if (role === UserRole.Worker) {
    if (['attendance', 'profile', 'shifts'].includes(resource)) {
      return { own_resource: true }
    }
  }
  
  // Managers can only manage their team
  if (role === UserRole.Manager) {
    if (['employees', 'attendance'].includes(resource)) {
      return { team_member: true }
    }
  }
  
  // Admins are limited to their organization
  if (role === UserRole.Admin) {
    return { same_organization: true }
  }
  
  return undefined
}

// =====================================================
// Permission Helpers
// =====================================================

/**
 * Filter resources based on user permissions
 */
export function filterByPermissions<T extends { id: string }>(
  items: T[],
  user: User,
  resource: string,
  action: string
): T[] {
  // Implementation would need to check each item against permissions
  // This is a simplified version
  if (user.role === UserRole.MasterAdmin) {
    return items
  }
  
  // Filter based on organization for admins
  if (user.role === UserRole.Admin && user.organization_id) {
    // Would need to check organization_id on items
    return items
  }
  
  // Further filtering for managers and workers
  // Would need more context about the resource type
  return items
}

/**
 * Build permission query conditions for database queries
 */
export function buildPermissionConditions(
  user: User,
  resource: string
): Record<string, any> {
  const conditions: Record<string, any> = {}
  
  // Master admin has no restrictions
  if (user.role === UserRole.MasterAdmin) {
    return conditions
  }
  
  // Add organization filter for non-master admins
  if (user.organization_id) {
    conditions.organization_id = user.organization_id
  }
  
  // Add specific conditions based on role and resource
  if (user.role === UserRole.Worker) {
    conditions.user_id = user.id
  }
  
  if (user.role === UserRole.Manager && resource === 'employees') {
    conditions.manager_id = user.id
  }
  
  return conditions
}

// =====================================================
// Export Permission System
// =====================================================

export const PermissionSystem = {
  checkPermission,
  canManageRole,
  hasHigherPrivilege,
  getAssignableRoles,
  hasPermissionInMatrix,
  getRolePermissions,
  filterByPermissions,
  buildPermissionConditions,
}