/**
 * Role Hierarchy Validator
 * Enforces strict role hierarchy and prevents unauthorized promotions
 */

export interface RoleValidationResult {
  valid: boolean;
  reason?: string;
  requiredRole?: string;
  currentRole?: string;
}

export interface EndpointPermission {
  pattern: RegExp;
  requiredRole: string;
  method?: string;
}

export class RoleHierarchyValidator {
  // Strict role hierarchy (lower index = higher privilege)
  private readonly ROLE_HIERARCHY = [
    'MASTER_ADMIN',
    'ADMIN',
    'MANAGER',
    'EMPLOYEE'
  ];

  // Endpoint permission mapping
  private readonly ENDPOINT_PERMISSIONS: EndpointPermission[] = [
    // MASTER_ADMIN only endpoints
    {
      pattern: /^\/api\/master-admin\/.*/,
      requiredRole: 'MASTER_ADMIN'
    },
    {
      pattern: /^\/api\/master-admin\/users\/bulk-role-change$/,
      requiredRole: 'MASTER_ADMIN',
      method: 'POST'
    },
    {
      pattern: /^\/api\/master-admin\/organizations\/.*/,
      requiredRole: 'MASTER_ADMIN'
    },
    {
      pattern: /^\/api\/master-admin\/users\/rollback-role-changes$/,
      requiredRole: 'MASTER_ADMIN',
      method: 'POST'
    },
    // ADMIN endpoints
    {
      pattern: /^\/api\/admin\/.*/,
      requiredRole: 'ADMIN'
    },
    {
      pattern: /^\/api\/users\/approve$/,
      requiredRole: 'ADMIN',
      method: 'POST'
    },
    {
      pattern: /^\/api\/users\/role$/,
      requiredRole: 'ADMIN',
      method: 'PUT'
    },
    // MANAGER endpoints
    {
      pattern: /^\/api\/reports\/.*/,
      requiredRole: 'MANAGER'
    },
    {
      pattern: /^\/api\/team\/.*/,
      requiredRole: 'MANAGER'
    },
    // EMPLOYEE endpoints (default access)
    {
      pattern: /^\/api\/attendance\/.*/,
      requiredRole: 'EMPLOYEE'
    },
    {
      pattern: /^\/api\/profile\/.*/,
      requiredRole: 'EMPLOYEE'
    }
  ];

  /**
   * Validate if a role has required privileges
   */
  async validateRole(currentRole: string, requiredRole: string): Promise<RoleValidationResult> {
    if (!currentRole || !requiredRole) {
      return {
        valid: false,
        reason: 'MISSING_ROLE_INFORMATION'
      };
    }

    const currentIndex = this.ROLE_HIERARCHY.indexOf(currentRole);
    const requiredIndex = this.ROLE_HIERARCHY.indexOf(requiredRole);

    // Role not found in hierarchy
    if (currentIndex === -1) {
      return {
        valid: false,
        reason: 'INVALID_CURRENT_ROLE',
        currentRole
      };
    }

    if (requiredIndex === -1) {
      return {
        valid: false,
        reason: 'INVALID_REQUIRED_ROLE',
        requiredRole
      };
    }

    // Check if current role has sufficient privileges (lower index = higher privilege)
    const hasPrivilege = currentIndex <= requiredIndex;

    return {
      valid: hasPrivilege,
      reason: hasPrivilege ? 'AUTHORIZED' : 'INSUFFICIENT_PRIVILEGES',
      currentRole,
      requiredRole
    };
  }

  /**
   * Validate endpoint access based on role
   */
  async validateEndpointAccess(role: string, endpoint: string, method: string = 'GET'): Promise<{ allowed: boolean; reason?: string }> {
    // Find matching permission rule
    let requiredRole: string = 'EMPLOYEE'; // Default minimum role
    
    for (const permission of this.ENDPOINT_PERMISSIONS) {
      if (permission.pattern.test(endpoint)) {
        // Check method if specified
        if (permission.method && permission.method !== method) {
          continue;
        }
        requiredRole = permission.requiredRole;
        break;
      }
    }

    // Validate role hierarchy
    const validation = await this.validateRole(role, requiredRole);
    
    return {
      allowed: validation.valid,
      reason: validation.reason
    };
  }

  /**
   * Check if a user can promote another user to a specific role
   */
  async canPromoteToRole(promoterRole: string, targetRole: string): Promise<boolean> {
    // MASTER_ADMIN can promote to any role
    if (promoterRole === 'MASTER_ADMIN') {
      return true;
    }

    // ADMIN can promote to ADMIN or below, but NOT to MASTER_ADMIN
    if (promoterRole === 'ADMIN') {
      return targetRole !== 'MASTER_ADMIN';
    }

    // MANAGER can only promote to EMPLOYEE
    if (promoterRole === 'MANAGER') {
      return targetRole === 'EMPLOYEE';
    }

    // EMPLOYEE cannot promote anyone
    return false;
  }

  /**
   * Get role privilege level (lower = higher privilege)
   */
  getRoleLevel(role: string): number {
    const index = this.ROLE_HIERARCHY.indexOf(role);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  /**
   * Check if role1 has higher privileges than role2
   */
  hasHigherPrivilege(role1: string, role2: string): boolean {
    return this.getRoleLevel(role1) < this.getRoleLevel(role2);
  }

  /**
   * Check if roles are equal
   */
  areRolesEqual(role1: string, role2: string): boolean {
    return this.getRoleLevel(role1) === this.getRoleLevel(role2);
  }

  /**
   * Get all roles a user can manage
   */
  getManageableRoles(userRole: string): string[] {
    const userLevel = this.getRoleLevel(userRole);
    
    if (userRole === 'MASTER_ADMIN') {
      return [...this.ROLE_HIERARCHY];
    }

    if (userRole === 'ADMIN') {
      // ADMIN cannot manage MASTER_ADMIN
      return this.ROLE_HIERARCHY.filter(role => role !== 'MASTER_ADMIN');
    }

    if (userRole === 'MANAGER') {
      return ['EMPLOYEE'];
    }

    return [];
  }

  /**
   * Validate role transition (for role changes)
   */
  async validateRoleTransition(
    currentRole: string,
    newRole: string,
    performerRole: string
  ): Promise<{ valid: boolean; reason: string }> {
    // Check if performer can make this change
    if (!await this.canPromoteToRole(performerRole, newRole)) {
      return {
        valid: false,
        reason: `${performerRole} cannot promote to ${newRole}`
      };
    }

    // Prevent self-promotion to higher roles
    if (this.hasHigherPrivilege(newRole, currentRole)) {
      if (performerRole === currentRole) {
        return {
          valid: false,
          reason: 'SELF_PROMOTION_NOT_ALLOWED'
        };
      }
    }

    // CRITICAL: Only MASTER_ADMIN can grant MASTER_ADMIN role
    if (newRole === 'MASTER_ADMIN' && performerRole !== 'MASTER_ADMIN') {
      return {
        valid: false,
        reason: 'ONLY_MASTER_ADMIN_CAN_GRANT_MASTER_ADMIN'
      };
    }

    return {
      valid: true,
      reason: 'TRANSITION_ALLOWED'
    };
  }

  /**
   * Get role hierarchy information
   */
  getRoleHierarchy(): string[] {
    return [...this.ROLE_HIERARCHY];
  }

  /**
   * Check if a role exists in the hierarchy
   */
  isValidRole(role: string): boolean {
    return this.ROLE_HIERARCHY.includes(role);
  }
}

// Export singleton instance
export const roleHierarchyValidator = new RoleHierarchyValidator();