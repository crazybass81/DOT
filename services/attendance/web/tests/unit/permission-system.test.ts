/**
 * Permission System Unit Tests
 * 
 * Tests the comprehensive permission system for ID-ROLE-PAPER architecture:
 * - Role-based access control (RBAC)
 * - Business context isolation
 * - Permission inheritance and delegation
 * - Resource-level permissions
 * - Security policy enforcement
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { TestDataFactory, RoleType } from '../setup/id-role-paper-test-setup';

// Permission types and resources
export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE';
export type ResourceType = 'ATTENDANCE' | 'SCHEDULE' | 'EMPLOYEE' | 'BUSINESS' | 'REPORTS' | 'SETTINGS' | 'PAPERS';

export interface Permission {
  id: string;
  role: RoleType;
  resource: ResourceType;
  actions: PermissionAction[];
  conditions?: Record<string, any>;
  business_context_required: boolean;
}

export interface AccessRequest {
  personal_id: string;
  business_id: string;
  resource: ResourceType;
  action: PermissionAction;
  resource_owner_id?: string;
  metadata?: Record<string, any>;
}

export interface AccessResult {
  granted: boolean;
  reason: string;
  applicable_roles: RoleType[];
  business_context: string;
  conditions_met: boolean;
}

// Mock Permission Service
class PermissionService {
  private static readonly DEFAULT_PERMISSIONS: Permission[] = [
    // SEEKER permissions
    {
      id: 'seeker-basic',
      role: 'SEEKER',
      resource: 'BUSINESS',
      actions: ['READ'],
      business_context_required: false
    },
    
    // WORKER permissions
    {
      id: 'worker-attendance',
      role: 'WORKER',
      resource: 'ATTENDANCE',
      actions: ['CREATE', 'READ', 'UPDATE'],
      conditions: { own_records_only: true },
      business_context_required: true
    },
    {
      id: 'worker-schedule',
      role: 'WORKER',
      resource: 'SCHEDULE',
      actions: ['READ'],
      business_context_required: true
    },
    
    // SUPERVISOR permissions
    {
      id: 'supervisor-attendance',
      role: 'SUPERVISOR',
      resource: 'ATTENDANCE',
      actions: ['CREATE', 'READ', 'UPDATE'],
      conditions: { team_members_only: true },
      business_context_required: true
    },
    {
      id: 'supervisor-reports',
      role: 'SUPERVISOR',
      resource: 'REPORTS',
      actions: ['READ'],
      conditions: { team_scope_only: true },
      business_context_required: true
    },
    
    // MANAGER permissions
    {
      id: 'manager-employees',
      role: 'MANAGER',
      resource: 'EMPLOYEE',
      actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
      business_context_required: true
    },
    {
      id: 'manager-schedule',
      role: 'MANAGER',
      resource: 'SCHEDULE',
      actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
      business_context_required: true
    },
    {
      id: 'manager-reports',
      role: 'MANAGER',
      resource: 'REPORTS',
      actions: ['READ'],
      conditions: { business_scope_only: true },
      business_context_required: true
    },
    
    // OWNER permissions
    {
      id: 'owner-full-access',
      role: 'OWNER',
      resource: 'BUSINESS',
      actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
      business_context_required: true
    },
    {
      id: 'owner-settings',
      role: 'OWNER',
      resource: 'SETTINGS',
      actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
      business_context_required: true
    },
    {
      id: 'owner-papers',
      role: 'OWNER',
      resource: 'PAPERS',
      actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
      business_context_required: true
    },
    
    // FRANCHISEE permissions (inherits MANAGER + additional)
    {
      id: 'franchisee-business-manage',
      role: 'FRANCHISEE',
      resource: 'BUSINESS',
      actions: ['READ', 'UPDATE'],
      conditions: { franchise_scope_only: true },
      business_context_required: true
    },
    
    // FRANCHISOR permissions (full franchise network access)
    {
      id: 'franchisor-network',
      role: 'FRANCHISOR',
      resource: 'BUSINESS',
      actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'],
      conditions: { franchise_network_only: true },
      business_context_required: false
    }
  ];

  private permissions: Permission[];

  constructor() {
    this.permissions = [...PermissionService.DEFAULT_PERMISSIONS];
  }

  async checkAccess(request: AccessRequest, userRoles: RoleType[]): Promise<AccessResult> {
    if (!userRoles || userRoles.length === 0) {
      return {
        granted: false,
        reason: 'No roles assigned',
        applicable_roles: [],
        business_context: request.business_id,
        conditions_met: false
      };
    }

    // Find applicable permissions based on roles and resource
    const applicablePermissions = this.permissions.filter(perm => 
      userRoles.includes(perm.role) && perm.resource === request.resource
    );

    if (applicablePermissions.length === 0) {
      return {
        granted: false,
        reason: `No permissions found for roles [${userRoles.join(', ')}] on resource ${request.resource}`,
        applicable_roles: userRoles,
        business_context: request.business_id,
        conditions_met: false
      };
    }

    // Check if any permission grants the requested action
    const grantingPermission = applicablePermissions.find(perm => 
      perm.actions.includes(request.action)
    );

    if (!grantingPermission) {
      return {
        granted: false,
        reason: `Action ${request.action} not permitted for roles [${userRoles.join(', ')}] on resource ${request.resource}`,
        applicable_roles: userRoles,
        business_context: request.business_id,
        conditions_met: false
      };
    }

    // Check business context requirement
    if (grantingPermission.business_context_required && !request.business_id) {
      return {
        granted: false,
        reason: 'Business context required but not provided',
        applicable_roles: userRoles,
        business_context: '',
        conditions_met: false
      };
    }

    // Check conditions
    const conditionsMet = this.checkConditions(grantingPermission, request, userRoles);

    return {
      granted: conditionsMet,
      reason: conditionsMet ? 'Access granted' : 'Conditions not met',
      applicable_roles: userRoles,
      business_context: request.business_id,
      conditions_met: conditionsMet
    };
  }

  private checkConditions(permission: Permission, request: AccessRequest, userRoles: RoleType[]): boolean {
    if (!permission.conditions) return true;

    // Own records only condition
    if (permission.conditions.own_records_only) {
      if (!request.resource_owner_id || request.resource_owner_id !== request.personal_id) {
        return false;
      }
    }

    // Team members only condition (for SUPERVISOR)
    if (permission.conditions.team_members_only) {
      // In real implementation, this would check if the resource belongs to supervised team members
      return request.metadata?.is_team_member === true;
    }

    // Team scope only condition
    if (permission.conditions.team_scope_only) {
      return request.metadata?.scope === 'team';
    }

    // Business scope only condition
    if (permission.conditions.business_scope_only) {
      return request.metadata?.scope === 'business';
    }

    // Franchise scope only condition
    if (permission.conditions.franchise_scope_only) {
      return request.metadata?.scope === 'franchise';
    }

    // Franchise network only condition
    if (permission.conditions.franchise_network_only) {
      return request.metadata?.scope === 'franchise_network';
    }

    return true;
  }

  async getEffectivePermissions(personalId: string, businessId: string, userRoles: RoleType[]): Promise<{
    permissions: Permission[];
    role_hierarchy: RoleType[];
    business_context: string;
  }> {
    const effectivePermissions: Permission[] = [];
    
    // Get all permissions for user's roles
    for (const role of userRoles) {
      const rolePermissions = this.permissions.filter(perm => perm.role === role);
      effectivePermissions.push(...rolePermissions);
    }

    // Remove duplicates and sort by resource
    const uniquePermissions = effectivePermissions.filter((perm, index, self) => 
      index === self.findIndex(p => p.id === perm.id)
    );

    return {
      permissions: uniquePermissions,
      role_hierarchy: userRoles,
      business_context: businessId
    };
  }

  async validateBusinessContext(personalId: string, businessId: string): Promise<{
    valid: boolean;
    reason: string;
    access_level: 'none' | 'basic' | 'full';
  }> {
    if (!personalId || !businessId) {
      return {
        valid: false,
        reason: 'Personal ID and Business ID are required',
        access_level: 'none'
      };
    }

    // In real implementation, this would check:
    // 1. If personal ID has any papers for this business
    // 2. If papers are active and effective
    // 3. What level of access is granted

    return {
      valid: true,
      reason: 'Valid business context',
      access_level: 'full'
    };
  }

  async checkCrossBusinessAccess(fromPersonalId: string, fromBusinessId: string, toBusinessId: string): Promise<{
    allowed: boolean;
    reason: string;
    required_roles: RoleType[];
  }> {
    if (fromBusinessId === toBusinessId) {
      return {
        allowed: true,
        reason: 'Same business context',
        required_roles: []
      };
    }

    // Cross-business access requires special roles
    const crossBusinessRoles: RoleType[] = ['FRANCHISOR', 'OWNER'];

    return {
      allowed: false,
      reason: 'Cross-business access requires FRANCHISOR or OWNER role in source business',
      required_roles: crossBusinessRoles
    };
  }

  addCustomPermission(permission: Permission): void {
    this.permissions.push(permission);
  }

  removePermission(permissionId: string): void {
    this.permissions = this.permissions.filter(p => p.id !== permissionId);
  }
}

describe('Permission System', () => {
  let permissionService: PermissionService;

  beforeEach(() => {
    permissionService = new PermissionService();
  });

  describe('Basic Access Control', () => {
    test('should grant SEEKER basic business read access', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'BUSINESS',
        action: 'READ'
      };

      const result = await permissionService.checkAccess(request, ['SEEKER']);

      expect(result.granted).toBe(true);
      expect(result.reason).toBe('Access granted');
      expect(result.applicable_roles).toEqual(['SEEKER']);
    });

    test('should deny SEEKER access to restricted resources', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'EMPLOYEE',
        action: 'CREATE'
      };

      const result = await permissionService.checkAccess(request, ['SEEKER']);

      expect(result.granted).toBe(false);
      expect(result.reason).toContain('No permissions found');
    });

    test('should grant WORKER access to own attendance records', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'ATTENDANCE',
        action: 'CREATE',
        resource_owner_id: 'pid1' // Own record
      };

      const result = await permissionService.checkAccess(request, ['WORKER']);

      expect(result.granted).toBe(true);
      expect(result.reason).toBe('Access granted');
    });

    test('should deny WORKER access to other workers attendance records', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'ATTENDANCE',
        action: 'UPDATE',
        resource_owner_id: 'pid2' // Different worker's record
      };

      const result = await permissionService.checkAccess(request, ['WORKER']);

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('Conditions not met');
    });
  });

  describe('Role Hierarchy and Inheritance', () => {
    test('should grant MANAGER access to employee management', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'EMPLOYEE',
        action: 'CREATE'
      };

      const result = await permissionService.checkAccess(request, ['MANAGER']);

      expect(result.granted).toBe(true);
      expect(result.reason).toBe('Access granted');
    });

    test('should grant OWNER full access to business management', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'BUSINESS',
        action: 'MANAGE'
      };

      const result = await permissionService.checkAccess(request, ['OWNER']);

      expect(result.granted).toBe(true);
      expect(result.reason).toBe('Access granted');
    });

    test('should handle multiple roles correctly', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'EMPLOYEE',
        action: 'UPDATE'
      };

      const result = await permissionService.checkAccess(request, ['WORKER', 'MANAGER']);

      expect(result.granted).toBe(true);
      expect(result.reason).toBe('Access granted');
      expect(result.applicable_roles).toContain('WORKER');
      expect(result.applicable_roles).toContain('MANAGER');
    });
  });

  describe('Business Context Requirements', () => {
    test('should require business context for context-sensitive permissions', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: '', // Missing business context
        resource: 'ATTENDANCE',
        action: 'CREATE'
      };

      const result = await permissionService.checkAccess(request, ['WORKER']);

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('Business context required but not provided');
    });

    test('should allow non-context-sensitive permissions without business context', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: '', // No business context needed
        resource: 'BUSINESS',
        action: 'READ'
      };

      const result = await permissionService.checkAccess(request, ['SEEKER']);

      expect(result.granted).toBe(true);
      expect(result.reason).toBe('Access granted');
    });
  });

  describe('Conditional Permissions', () => {
    test('should grant SUPERVISOR access to team member records', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'ATTENDANCE',
        action: 'READ',
        metadata: { is_team_member: true }
      };

      const result = await permissionService.checkAccess(request, ['SUPERVISOR']);

      expect(result.granted).toBe(true);
      expect(result.conditions_met).toBe(true);
    });

    test('should deny SUPERVISOR access to non-team member records', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'ATTENDANCE',
        action: 'READ',
        metadata: { is_team_member: false }
      };

      const result = await permissionService.checkAccess(request, ['SUPERVISOR']);

      expect(result.granted).toBe(false);
      expect(result.conditions_met).toBe(false);
    });

    test('should validate scope-based conditions', async () => {
      const businessScopeRequest: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'REPORTS',
        action: 'READ',
        metadata: { scope: 'business' }
      };

      const result = await permissionService.checkAccess(businessScopeRequest, ['MANAGER']);
      expect(result.granted).toBe(true);

      const invalidScopeRequest: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'REPORTS',
        action: 'READ',
        metadata: { scope: 'global' }
      };

      const result2 = await permissionService.checkAccess(invalidScopeRequest, ['MANAGER']);
      expect(result2.granted).toBe(false);
    });
  });

  describe('Franchise System Permissions', () => {
    test('should grant FRANCHISEE limited business management', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'BUSINESS',
        action: 'UPDATE',
        metadata: { scope: 'franchise' }
      };

      const result = await permissionService.checkAccess(request, ['FRANCHISEE']);

      expect(result.granted).toBe(true);
    });

    test('should grant FRANCHISOR network-wide access', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'BUSINESS',
        action: 'MANAGE',
        metadata: { scope: 'franchise_network' }
      };

      const result = await permissionService.checkAccess(request, ['FRANCHISOR']);

      expect(result.granted).toBe(true);
    });

    test('should deny FRANCHISEE access outside franchise scope', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'BUSINESS',
        action: 'UPDATE',
        metadata: { scope: 'global' }
      };

      const result = await permissionService.checkAccess(request, ['FRANCHISEE']);

      expect(result.granted).toBe(false);
      expect(result.conditions_met).toBe(false);
    });
  });

  describe('Effective Permissions Management', () => {
    test('should get effective permissions for multiple roles', async () => {
      const result = await permissionService.getEffectivePermissions('pid1', 'bid1', ['WORKER', 'SUPERVISOR']);

      expect(result.permissions.length).toBeGreaterThan(0);
      expect(result.role_hierarchy).toEqual(['WORKER', 'SUPERVISOR']);
      expect(result.business_context).toBe('bid1');

      const resources = result.permissions.map(p => p.resource);
      expect(resources).toContain('ATTENDANCE');
      expect(resources).toContain('REPORTS');
    });

    test('should return unique permissions without duplicates', async () => {
      const result = await permissionService.getEffectivePermissions('pid1', 'bid1', ['WORKER', 'WORKER']); // Duplicate roles

      const permissionIds = result.permissions.map(p => p.id);
      const uniqueIds = [...new Set(permissionIds)];
      expect(permissionIds.length).toBe(uniqueIds.length);
    });
  });

  describe('Business Context Validation', () => {
    test('should validate business context requirements', async () => {
      const result = await permissionService.validateBusinessContext('pid1', 'bid1');

      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Valid business context');
      expect(result.access_level).toBe('full');
    });

    test('should reject invalid business context', async () => {
      const result = await permissionService.validateBusinessContext('', 'bid1');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('required');
      expect(result.access_level).toBe('none');
    });
  });

  describe('Cross-Business Access Control', () => {
    test('should allow same business access', async () => {
      const result = await permissionService.checkCrossBusinessAccess('pid1', 'bid1', 'bid1');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Same business context');
    });

    test('should restrict cross-business access', async () => {
      const result = await permissionService.checkCrossBusinessAccess('pid1', 'bid1', 'bid2');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cross-business access requires');
      expect(result.required_roles).toContain('FRANCHISOR');
      expect(result.required_roles).toContain('OWNER');
    });
  });

  describe('Custom Permission Management', () => {
    test('should add custom permissions', () => {
      const customPermission: Permission = {
        id: 'custom-test',
        role: 'WORKER',
        resource: 'REPORTS',
        actions: ['READ'],
        business_context_required: true
      };

      permissionService.addCustomPermission(customPermission);

      const permissions = (permissionService as any).permissions;
      expect(permissions.find((p: Permission) => p.id === 'custom-test')).toBeDefined();
    });

    test('should remove permissions', () => {
      permissionService.removePermission('seeker-basic');

      const permissions = (permissionService as any).permissions;
      expect(permissions.find((p: Permission) => p.id === 'seeker-basic')).toBeUndefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty roles array', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'ATTENDANCE',
        action: 'READ'
      };

      const result = await permissionService.checkAccess(request, []);

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('No roles assigned');
    });

    test('should handle null/undefined roles', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'ATTENDANCE',
        action: 'READ'
      };

      const result = await permissionService.checkAccess(request, null as any);

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('No roles assigned');
    });

    test('should handle invalid resource types gracefully', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'INVALID_RESOURCE' as ResourceType,
        action: 'READ'
      };

      const result = await permissionService.checkAccess(request, ['WORKER']);

      expect(result.granted).toBe(false);
      expect(result.reason).toContain('No permissions found');
    });

    test('should handle invalid actions gracefully', async () => {
      const request: AccessRequest = {
        personal_id: 'pid1',
        business_id: 'bid1',
        resource: 'ATTENDANCE',
        action: 'INVALID_ACTION' as PermissionAction
      };

      const result = await permissionService.checkAccess(request, ['WORKER']);

      expect(result.granted).toBe(false);
      expect(result.reason).toContain('not permitted');
    });
  });
});