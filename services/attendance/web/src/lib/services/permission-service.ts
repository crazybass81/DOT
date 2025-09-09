/**
 * Permission Service Implementation
 * Role-based permission checking for ID-ROLE-PAPER system
 * 
 * Handles dynamic permission evaluation based on identity context, roles, and business scope
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  RoleType,
  Permission,
  IdentityWithContext,
  ComputedRole,
  Paper,
  BusinessRegistration,
  UnifiedIdentity
} from '../../types/id-role-paper';

/**
 * Request types for Permission Service operations
 */
export interface PermissionCheckRequest {
  identityId: string;
  resource: string;
  action: string;
  businessContext?: string;
  conditions?: Record<string, any>;
}

export interface PermissionEvaluationRequest {
  identity: UnifiedIdentity;
  computedRoles: ComputedRole[];
  papers: Paper[];
  businessRegistrations: BusinessRegistration[];
  resource: string;
  action: string;
  businessContext?: string;
  conditions?: Record<string, any>;
}

export interface BulkPermissionCheckRequest {
  identityId: string;
  permissions: Array<{
    resource: string;
    action: string;
    businessContext?: string;
    conditions?: Record<string, any>;
  }>;
}

export interface PermissionMatrixRequest {
  identityId: string;
  businessContext?: string;
}

/**
 * Response types for Permission Service operations
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, any>;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  requiredRole?: RoleType;
  requiredPapers?: string[];
  businessContextRequired?: boolean;
}

export interface PermissionMatrix {
  identityId: string;
  businessContext?: string;
  permissions: Record<string, Record<string, PermissionResult>>;
  availableRoles: RoleType[];
  effectiveRole: RoleType;
}

/**
 * Permission Service - Core role-based access control functionality
 */
export class PermissionService {
  private supabase: SupabaseClient;

  // Role hierarchy for permission inheritance
  private static readonly ROLE_HIERARCHY: Record<RoleType, number> = {
    [RoleType.SEEKER]: 0,
    [RoleType.WORKER]: 1,
    [RoleType.MANAGER]: 2,
    [RoleType.SUPERVISOR]: 2,
    [RoleType.OWNER]: 3,
    [RoleType.FRANCHISEE]: 4,
    [RoleType.FRANCHISOR]: 5
  };

  // Resource permission matrix
  private static readonly PERMISSION_MATRIX: Record<string, Record<string, {
    requiredRole: RoleType;
    businessContextRequired: boolean;
    conditions?: Record<string, any>;
  }>> = {
    // Identity management permissions
    'identity': {
      'read': { requiredRole: RoleType.SEEKER, businessContextRequired: false },
      'update': { requiredRole: RoleType.SEEKER, businessContextRequired: false },
      'create': { requiredRole: RoleType.SEEKER, businessContextRequired: false },
      'delete': { requiredRole: RoleType.OWNER, businessContextRequired: false }
    },

    // Business management permissions
    'business': {
      'read': { requiredRole: RoleType.WORKER, businessContextRequired: true },
      'create': { requiredRole: RoleType.OWNER, businessContextRequired: false },
      'update': { requiredRole: RoleType.OWNER, businessContextRequired: true },
      'delete': { requiredRole: RoleType.OWNER, businessContextRequired: true },
      'manage': { requiredRole: RoleType.OWNER, businessContextRequired: true }
    },

    // Paper management permissions
    'papers': {
      'read': { requiredRole: RoleType.WORKER, businessContextRequired: true },
      'create': { requiredRole: RoleType.MANAGER, businessContextRequired: true },
      'update': { requiredRole: RoleType.MANAGER, businessContextRequired: true },
      'validate': { requiredRole: RoleType.OWNER, businessContextRequired: true },
      'delete': { requiredRole: RoleType.OWNER, businessContextRequired: true }
    },

    // Employee management permissions
    'employees': {
      'read': { requiredRole: RoleType.MANAGER, businessContextRequired: true },
      'create': { requiredRole: RoleType.OWNER, businessContextRequired: true },
      'update': { requiredRole: RoleType.MANAGER, businessContextRequired: true },
      'delete': { requiredRole: RoleType.OWNER, businessContextRequired: true },
      'manage': { requiredRole: RoleType.OWNER, businessContextRequired: true }
    },

    // Attendance management permissions
    'attendance': {
      'read': { requiredRole: RoleType.WORKER, businessContextRequired: true },
      'create': { requiredRole: RoleType.WORKER, businessContextRequired: true },
      'update': { requiredRole: RoleType.WORKER, businessContextRequired: true },
      'approve': { requiredRole: RoleType.MANAGER, businessContextRequired: true },
      'delete': { requiredRole: RoleType.MANAGER, businessContextRequired: true }
    },

    // Reports and analytics permissions
    'reports': {
      'read': { requiredRole: RoleType.MANAGER, businessContextRequired: true },
      'create': { requiredRole: RoleType.MANAGER, businessContextRequired: true },
      'export': { requiredRole: RoleType.MANAGER, businessContextRequired: true },
      'manage': { requiredRole: RoleType.OWNER, businessContextRequired: true }
    },

    // Team management permissions
    'team': {
      'read': { requiredRole: RoleType.MANAGER, businessContextRequired: true },
      'manage': { requiredRole: RoleType.MANAGER, businessContextRequired: true },
      'assign': { requiredRole: RoleType.SUPERVISOR, businessContextRequired: true }
    },

    // Franchise operations
    'franchise': {
      'read': { requiredRole: RoleType.FRANCHISEE, businessContextRequired: true },
      'manage': { requiredRole: RoleType.FRANCHISEE, businessContextRequired: true },
      'oversee': { requiredRole: RoleType.FRANCHISOR, businessContextRequired: false }
    }
  };

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Check if an identity has permission for a specific resource and action
   */
  async checkPermission(request: PermissionCheckRequest): Promise<ServiceResponse<PermissionResult>> {
    try {
      // Get identity context from Identity Service
      const identityContext = await this.getIdentityContext(request.identityId);
      if (!identityContext) {
        return {
          success: false,
          error: 'Identity not found or invalid'
        };
      }

      // Evaluate permission
      const result = this.evaluatePermission({
        identity: identityContext.identity,
        computedRoles: identityContext.computedRoles,
        papers: identityContext.papers,
        businessRegistrations: identityContext.businessRegistrations,
        resource: request.resource,
        action: request.action,
        businessContext: request.businessContext,
        conditions: request.conditions
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check multiple permissions in bulk
   */
  async checkBulkPermissions(request: BulkPermissionCheckRequest): Promise<ServiceResponse<Record<string, PermissionResult>>> {
    try {
      // Get identity context once
      const identityContext = await this.getIdentityContext(request.identityId);
      if (!identityContext) {
        return {
          success: false,
          error: 'Identity not found or invalid'
        };
      }

      const results: Record<string, PermissionResult> = {};

      // Evaluate each permission
      for (const permission of request.permissions) {
        const permissionKey = `${permission.resource}:${permission.action}`;
        results[permissionKey] = this.evaluatePermission({
          identity: identityContext.identity,
          computedRoles: identityContext.computedRoles,
          papers: identityContext.papers,
          businessRegistrations: identityContext.businessRegistrations,
          resource: permission.resource,
          action: permission.action,
          businessContext: permission.businessContext,
          conditions: permission.conditions
        });
      }

      return {
        success: true,
        data: results
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get full permission matrix for an identity
   */
  async getPermissionMatrix(request: PermissionMatrixRequest): Promise<ServiceResponse<PermissionMatrix>> {
    try {
      // Get identity context
      const identityContext = await this.getIdentityContext(request.identityId);
      if (!identityContext) {
        return {
          success: false,
          error: 'Identity not found or invalid'
        };
      }

      const permissions: Record<string, Record<string, PermissionResult>> = {};

      // Evaluate all defined permissions
      for (const [resource, actions] of Object.entries(PermissionService.PERMISSION_MATRIX)) {
        permissions[resource] = {};

        for (const action of Object.keys(actions)) {
          permissions[resource][action] = this.evaluatePermission({
            identity: identityContext.identity,
            computedRoles: identityContext.computedRoles,
            papers: identityContext.papers,
            businessRegistrations: identityContext.businessRegistrations,
            resource,
            action,
            businessContext: request.businessContext
          });
        }
      }

      // Get highest role for effective role
      const availableRoles = identityContext.computedRoles.map(cr => cr.role);
      const effectiveRole = this.getHighestRole(availableRoles);

      const matrix: PermissionMatrix = {
        identityId: request.identityId,
        businessContext: request.businessContext,
        permissions,
        availableRoles,
        effectiveRole
      };

      return {
        success: true,
        data: matrix
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get available actions for a resource given identity context
   */
  async getAvailableActions(
    identityId: string, 
    resource: string, 
    businessContext?: string
  ): Promise<ServiceResponse<string[]>> {
    try {
      const matrixResult = await this.getPermissionMatrix({ identityId, businessContext });
      
      if (!matrixResult.success || !matrixResult.data) {
        return {
          success: false,
          error: matrixResult.error || 'Failed to get permission matrix'
        };
      }

      const resourcePermissions = matrixResult.data.permissions[resource];
      if (!resourcePermissions) {
        return {
          success: true,
          data: []
        };
      }

      const availableActions = Object.entries(resourcePermissions)
        .filter(([, result]) => result.granted)
        .map(([action]) => action);

      return {
        success: true,
        data: availableActions
      };

    } catch (error) {
      return {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Evaluate permission against identity context
   */
  private evaluatePermission(request: PermissionEvaluationRequest): PermissionResult {
    // Get permission requirements
    const resourcePerms = PermissionService.PERMISSION_MATRIX[request.resource];
    if (!resourcePerms) {
      return {
        granted: false,
        reason: `Unknown resource: ${request.resource}`
      };
    }

    const actionPerm = resourcePerms[request.action];
    if (!actionPerm) {
      return {
        granted: false,
        reason: `Unknown action: ${request.action} for resource: ${request.resource}`
      };
    }

    // Check if business context is required but not provided
    if (actionPerm.businessContextRequired && !request.businessContext) {
      return {
        granted: false,
        reason: 'Business context is required for this action',
        businessContextRequired: true
      };
    }

    // Get effective roles for the business context (if provided)
    const effectiveRoles = request.businessContext
      ? request.computedRoles
          .filter(cr => cr.businessContextId === request.businessContext)
          .map(cr => cr.role)
      : request.computedRoles.map(cr => cr.role);

    // Check if user has required role or higher
    const hasRequiredRole = this.hasRequiredRole(effectiveRoles, actionPerm.requiredRole);
    
    if (!hasRequiredRole) {
      return {
        granted: false,
        reason: 'Insufficient role level',
        requiredRole: actionPerm.requiredRole
      };
    }

    // Additional condition checks (if any)
    if (actionPerm.conditions && request.conditions) {
      const conditionsMet = this.checkConditions(actionPerm.conditions, request.conditions);
      if (!conditionsMet) {
        return {
          granted: false,
          reason: 'Additional conditions not met'
        };
      }
    }

    return {
      granted: true,
      reason: 'Permission granted'
    };
  }

  /**
   * Check if roles include required role or higher in hierarchy
   */
  private hasRequiredRole(userRoles: RoleType[], requiredRole: RoleType): boolean {
    const requiredLevel = PermissionService.ROLE_HIERARCHY[requiredRole];
    
    return userRoles.some(role => {
      const userLevel = PermissionService.ROLE_HIERARCHY[role];
      return userLevel >= requiredLevel;
    });
  }

  /**
   * Get highest role from available roles
   */
  private getHighestRole(roles: RoleType[]): RoleType {
    if (roles.length === 0) return RoleType.SEEKER;
    
    return roles.reduce((highest, current) => {
      return PermissionService.ROLE_HIERARCHY[current] > PermissionService.ROLE_HIERARCHY[highest]
        ? current : highest;
    });
  }

  /**
   * Check additional conditions
   */
  private checkConditions(
    requiredConditions: Record<string, any>, 
    providedConditions: Record<string, any>
  ): boolean {
    for (const [key, requiredValue] of Object.entries(requiredConditions)) {
      const providedValue = providedConditions[key];
      
      if (providedValue === undefined || providedValue !== requiredValue) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get identity context (this would integrate with Identity Service)
   */
  private async getIdentityContext(identityId: string): Promise<IdentityWithContext | null> {
    try {
      // This would normally call the Identity Service
      // For now, we'll implement a direct database query
      
      // Get identity
      const { data: identity, error: identityError } = await this.supabase
        .from('unified_identities')
        .select('*')
        .eq('id', identityId)
        .single();

      if (identityError || !identity) return null;

      // Get papers
      const { data: papers, error: papersError } = await this.supabase
        .from('papers')
        .select('*')
        .eq('ownerIdentityId', identityId)
        .eq('isActive', true);

      if (papersError) return null;

      // Get business registrations
      const businessIds = papers
        ?.filter(p => p.relatedBusinessId)
        .map(p => p.relatedBusinessId) || [];

      let businessRegistrations: BusinessRegistration[] = [];
      if (businessIds.length > 0) {
        const { data: businesses, error: businessesError } = await this.supabase
          .from('business_registrations')
          .select('*')
          .in('id', businessIds);

        if (!businessesError) {
          businessRegistrations = businesses || [];
        }
      }

      // For this implementation, we'll create a simple role calculation
      // In production, this would use the RoleCalculator
      const computedRoles: ComputedRole[] = [];
      
      // Basic role assignment based on papers
      const employmentContracts = papers?.filter(p => p.paperType === 'Employment Contract') || [];
      const businessRegs = papers?.filter(p => p.paperType === 'Business Registration') || [];
      const authorityDelegations = papers?.filter(p => p.paperType === 'Authority Delegation') || [];
      const supervisorDelegations = papers?.filter(p => p.paperType === 'Supervisor Authority Delegation') || [];
      
      if (businessRegs.length > 0) {
        computedRoles.push({
          id: `computed-${identityId}-owner`,
          identityId,
          role: RoleType.OWNER,
          sourcePapers: businessRegs.map(p => p.id),
          businessContextId: businessRegs[0].relatedBusinessId,
          isActive: true,
          computedAt: new Date()
        });
      }
      
      if (employmentContracts.length > 0) {
        computedRoles.push({
          id: `computed-${identityId}-worker`,
          identityId,
          role: RoleType.WORKER,
          sourcePapers: employmentContracts.map(p => p.id),
          businessContextId: employmentContracts[0].relatedBusinessId,
          isActive: true,
          computedAt: new Date()
        });
        
        if (authorityDelegations.length > 0) {
          computedRoles.push({
            id: `computed-${identityId}-manager`,
            identityId,
            role: RoleType.MANAGER,
            sourcePapers: [...employmentContracts.map(p => p.id), ...authorityDelegations.map(p => p.id)],
            businessContextId: authorityDelegations[0].relatedBusinessId,
            isActive: true,
            computedAt: new Date()
          });
        }
        
        if (supervisorDelegations.length > 0) {
          computedRoles.push({
            id: `computed-${identityId}-supervisor`,
            identityId,
            role: RoleType.SUPERVISOR,
            sourcePapers: [...employmentContracts.map(p => p.id), ...supervisorDelegations.map(p => p.id)],
            businessContextId: supervisorDelegations[0].relatedBusinessId,
            isActive: true,
            computedAt: new Date()
          });
        }
      }

      // Default to SEEKER if no roles computed
      if (computedRoles.length === 0) {
        computedRoles.push({
          id: `computed-${identityId}-seeker`,
          identityId,
          role: RoleType.SEEKER,
          sourcePapers: [],
          isActive: true,
          computedAt: new Date()
        });
      }

      const availableRoles = computedRoles.map(cr => cr.role);
      const primaryRole = this.getHighestRole(availableRoles);
      const permissions: Permission[] = []; // Would be generated based on roles

      return {
        identity: identity as UnifiedIdentity,
        papers: papers || [],
        computedRoles,
        businessRegistrations,
        primaryRole,
        availableRoles,
        permissions
      };

    } catch {
      return null;
    }
  }
}

// Export singleton instance factory
export const createPermissionService = (supabaseClient: SupabaseClient): PermissionService => {
  return new PermissionService(supabaseClient);
};