/**
 * Role Management Service - Advanced Role Operations
 * Specialized service for role-based access control and permission management
 */

import { supabase } from '../lib/supabase-config'
import { 
  RoleAssignment,
  UnifiedRole,
  IdType,
  RoleHierarchy,
  PermissionCheck,
  RoleTransitionRequest,
  RoleTransitionResponse,
  BulkRoleAssignmentRequest,
  BulkRoleAssignmentResponse
} from '../types/unified.types'
import { organizationService } from './organizationService'
import { unifiedIdentityService } from './unifiedIdentityService'

export class RoleManagementService {
  private supabase = supabase

  // Role hierarchy definition (higher number = higher authority)
  private roleHierarchy: Record<UnifiedRole, number> = {
    'master': 100,
    'admin': 80,
    'manager': 60,
    'worker': 40,
    'franchise_admin': 70
  }

  /**
   * Check if user has specific permission for an action
   */
  async checkPermission(
    identityId: string,
    action: string,
    resource?: string,
    organizationId?: string
  ): Promise<PermissionCheck> {
    try {
      console.log(`🔍 Checking permission for identity ${identityId}: ${action} on ${resource || 'system'}`)

      // Get user's active roles
      const userRoles = await organizationService.getUserRoles(identityId)
      
      if (!userRoles || userRoles.length === 0) {
        return {
          hasPermission: false,
          reason: 'No active roles found',
          appliedRoles: []
        }
      }

      console.log(`📋 Found ${userRoles.length} roles for user`)

      // Filter roles by organization context if specified
      const applicableRoles = organizationId 
        ? userRoles.filter(role => role.organizationId === organizationId || role.role === 'master')
        : userRoles

      // Check permissions based on action and role hierarchy
      const hasPermission = this.evaluatePermission(action, resource, applicableRoles)

      return {
        hasPermission,
        reason: hasPermission ? 'Permission granted' : 'Insufficient permissions',
        appliedRoles: applicableRoles.map(r => r.role),
        highestRole: this.getHighestRole(applicableRoles)
      }

    } catch (error) {
      console.error('Permission check error:', error)
      return {
        hasPermission: false,
        reason: 'Permission check failed',
        appliedRoles: []
      }
    }
  }

  /**
   * Transition user from one role to another with validation
   */
  async transitionRole(request: RoleTransitionRequest): Promise<RoleTransitionResponse> {
    try {
      console.log(`🔄 Processing role transition: ${request.fromRole} -> ${request.toRole}`)

      // Validate transition request
      const validation = await this.validateRoleTransition(request)
      if (!validation.isValid) {
        return { success: false, error: validation.error }
      }

      // Get current role assignment
      const currentRole = await this.getCurrentRoleAssignment(
        request.identityId, 
        request.organizationId, 
        request.fromRole
      )

      if (!currentRole) {
        return { success: false, error: 'Current role assignment not found' }
      }

      // Revoke current role
      const revokeResult = await organizationService.revokeRole(
        currentRole.id,
        request.requestedBy,
        `Role transition to ${request.toRole}`
      )

      if (!revokeResult.success) {
        return { success: false, error: 'Failed to revoke current role' }
      }

      // Assign new role
      const assignResult = await organizationService.assignRole({
        identityId: request.identityId,
        organizationId: request.organizationId,
        role: request.toRole,
        assignedBy: request.requestedBy,
        customPermissions: request.customPermissions
      })

      if (!assignResult.success) {
        // Try to restore previous role if new assignment fails
        await organizationService.assignRole({
          identityId: request.identityId,
          organizationId: request.organizationId,
          role: request.fromRole,
          assignedBy: request.requestedBy
        })

        return { success: false, error: 'Failed to assign new role, restored previous role' }
      }

      console.log('✅ Role transition completed successfully')

      return {
        success: true,
        newRoleAssignment: assignResult.roleAssignment,
        transitionLog: {
          from: request.fromRole,
          to: request.toRole,
          requestedBy: request.requestedBy,
          timestamp: new Date()
        }
      }

    } catch (error) {
      console.error('Role transition error:', error)
      return { success: false, error: 'Internal error during role transition' }
    }
  }

  /**
   * Assign roles to multiple users at once
   */
  async bulkAssignRoles(request: BulkRoleAssignmentRequest): Promise<BulkRoleAssignmentResponse> {
    try {
      console.log(`📦 Processing bulk role assignment for ${request.assignments.length} users`)

      const results = []
      const errors = []

      for (const assignment of request.assignments) {
        try {
          const result = await organizationService.assignRole({
            identityId: assignment.identityId,
            organizationId: assignment.organizationId,
            role: assignment.role,
            assignedBy: request.requestedBy,
            customPermissions: assignment.customPermissions
          })

          if (result.success) {
            results.push({
              identityId: assignment.identityId,
              role: assignment.role,
              success: true,
              roleAssignment: result.roleAssignment
            })
          } else {
            errors.push({
              identityId: assignment.identityId,
              role: assignment.role,
              error: result.error
            })
          }
        } catch (error: any) {
          errors.push({
            identityId: assignment.identityId,
            role: assignment.role,
            error: error.message
          })
        }
      }

      console.log(`✅ Bulk assignment completed: ${results.length} successful, ${errors.length} failed`)

      return {
        success: errors.length === 0,
        successfulAssignments: results,
        failedAssignments: errors,
        summary: {
          total: request.assignments.length,
          successful: results.length,
          failed: errors.length
        }
      }

    } catch (error) {
      console.error('Bulk role assignment error:', error)
      return {
        success: false,
        successfulAssignments: [],
        failedAssignments: request.assignments.map(a => ({
          identityId: a.identityId,
          role: a.role,
          error: 'System error during bulk assignment'
        })),
        summary: {
          total: request.assignments.length,
          successful: 0,
          failed: request.assignments.length
        }
      }
    }
  }

  /**
   * Get role hierarchy information
   */
  getRoleHierarchy(): RoleHierarchy {
    return {
      roles: Object.keys(this.roleHierarchy) as UnifiedRole[],
      hierarchy: this.roleHierarchy,
      permissions: this.getDefaultRolePermissions()
    }
  }

  /**
   * Validate if a user can perform an action on another user's role
   */
  async canManageRole(
    managerId: string,
    targetIdentityId: string,
    targetRole: UnifiedRole,
    organizationId?: string
  ): Promise<{ canManage: boolean; reason: string }> {
    try {
      // Get manager's roles
      const managerRoles = await organizationService.getUserRoles(managerId)
      
      if (!managerRoles || managerRoles.length === 0) {
        return { canManage: false, reason: 'Manager has no active roles' }
      }

      // Get manager's highest role in relevant context
      const contextRoles = organizationId 
        ? managerRoles.filter(r => r.organizationId === organizationId || r.role === 'master')
        : managerRoles.filter(r => r.role === 'master')

      if (contextRoles.length === 0) {
        return { canManage: false, reason: 'Manager has no roles in this context' }
      }

      const managerHighestRole = this.getHighestRole(contextRoles)
      
      if (!managerHighestRole) {
        return { canManage: false, reason: 'Cannot determine manager role level' }
      }

      // Master can manage any role
      if (managerHighestRole === 'master') {
        return { canManage: true, reason: 'Master role has full permissions' }
      }

      // Check hierarchy - can only manage roles of lower hierarchy
      const managerLevel = this.roleHierarchy[managerHighestRole]
      const targetLevel = this.roleHierarchy[targetRole]

      if (managerLevel <= targetLevel) {
        return { 
          canManage: false, 
          reason: `${managerHighestRole} cannot manage ${targetRole} (insufficient hierarchy level)` 
        }
      }

      return { 
        canManage: true, 
        reason: `${managerHighestRole} can manage ${targetRole}` 
      }

    } catch (error) {
      console.error('Error checking role management permission:', error)
      return { canManage: false, reason: 'Error checking permissions' }
    }
  }

  /**
   * Get user's effective permissions across all roles
   */
  async getUserEffectivePermissions(identityId: string): Promise<{
    permissions: string[]
    roles: UnifiedRole[]
    organizations: string[]
  }> {
    try {
      const userRoles = await organizationService.getUserRoles(identityId)
      
      const permissions = new Set<string>()
      const roles = new Set<UnifiedRole>()
      const organizations = new Set<string>()

      for (const roleAssignment of userRoles) {
        roles.add(roleAssignment.role)
        
        if (roleAssignment.organizationId) {
          organizations.add(roleAssignment.organizationId)
        }

        // Add role-based permissions
        const rolePermissions = this.getRolePermissions(roleAssignment.role)
        rolePermissions.forEach(p => permissions.add(p))

        // Add custom permissions
        if (roleAssignment.customPermissions) {
          Object.keys(roleAssignment.customPermissions)
            .filter(key => roleAssignment.customPermissions![key] === true)
            .forEach(p => permissions.add(p))
        }
      }

      return {
        permissions: Array.from(permissions),
        roles: Array.from(roles),
        organizations: Array.from(organizations)
      }

    } catch (error) {
      console.error('Error getting effective permissions:', error)
      return {
        permissions: [],
        roles: [],
        organizations: []
      }
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  private evaluatePermission(
    action: string,
    resource: string | undefined,
    roles: RoleAssignment[]
  ): boolean {
    // Master role has all permissions
    if (roles.some(r => r.role === 'master')) {
      return true
    }

    // Check action-specific permissions
    switch (action) {
      case 'read':
        return roles.length > 0 // Any role can read basic info
      
      case 'write':
        return roles.some(r => ['admin', 'manager'].includes(r.role))
      
      case 'delete':
        return roles.some(r => ['admin'].includes(r.role))
      
      case 'manage_users':
        return roles.some(r => ['admin', 'manager'].includes(r.role))
      
      case 'manage_organization':
        return roles.some(r => ['admin'].includes(r.role))
      
      case 'system_config':
        return roles.some(r => ['master'].includes(r.role))
      
      default:
        // Check custom permissions
        return roles.some(r => r.customPermissions?.[action] === true)
    }
  }

  private getHighestRole(roles: RoleAssignment[]): UnifiedRole | null {
    if (!roles || roles.length === 0) return null

    return roles.reduce((highest, current) => {
      if (!highest) return current.role
      
      const currentLevel = this.roleHierarchy[current.role] || 0
      const highestLevel = this.roleHierarchy[highest] || 0
      
      return currentLevel > highestLevel ? current.role : highest
    }, null as UnifiedRole | null)
  }

  private async validateRoleTransition(request: RoleTransitionRequest): Promise<{
    isValid: boolean
    error?: string
  }> {
    // Check if requester can manage the transition
    const canManage = await this.canManageRole(
      request.requestedBy,
      request.identityId,
      request.toRole,
      request.organizationId
    )

    if (!canManage.canManage) {
      return { isValid: false, error: canManage.reason }
    }

    // Validate role transition logic (e.g., certain transitions may be restricted)
    if (request.fromRole === 'master' && request.toRole !== 'admin') {
      return { 
        isValid: false, 
        error: 'Master role can only transition to admin role' 
      }
    }

    return { isValid: true }
  }

  private async getCurrentRoleAssignment(
    identityId: string,
    organizationId: string | undefined,
    role: UnifiedRole
  ): Promise<RoleAssignment | null> {
    try {
      const userRoles = await organizationService.getUserRoles(identityId)
      
      return userRoles.find(r => 
        r.role === role && 
        r.organizationId === organizationId &&
        r.isActive
      ) || null

    } catch (error) {
      return null
    }
  }

  private getRolePermissions(role: UnifiedRole): string[] {
    const permissions = {
      'master': ['*'], // All permissions
      'admin': [
        'read', 'write', 'delete', 
        'manage_users', 'manage_organization',
        'view_reports', 'manage_settings'
      ],
      'manager': [
        'read', 'write',
        'manage_users', 'view_reports'
      ],
      'worker': [
        'read', 'write_own'
      ],
      'franchise_admin': [
        'read', 'write', 
        'manage_users', 'view_reports',
        'manage_franchise_settings'
      ]
    }

    return permissions[role] || []
  }

  private getDefaultRolePermissions(): Record<UnifiedRole, string[]> {
    return {
      'master': this.getRolePermissions('master'),
      'admin': this.getRolePermissions('admin'),
      'manager': this.getRolePermissions('manager'),
      'worker': this.getRolePermissions('worker'),
      'franchise_admin': this.getRolePermissions('franchise_admin')
    }
  }
}

export const roleManagementService = new RoleManagementService()