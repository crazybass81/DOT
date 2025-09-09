/**
 * RBAC Middleware Implementation
 * Express middleware for role-based access control in ID-ROLE-PAPER system
 * 
 * Provides authentication validation, permission checking, and business context resolution
 */

import { Request, Response, NextFunction } from 'express';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { 
  PermissionService, 
  PermissionCheckRequest,
  createPermissionService 
} from '../services/permission-service';
import { 
  RoleType,
  UnifiedIdentity,
  IdentityWithContext 
} from '../../types/id-role-paper';

/**
 * Extended Request interface with RBAC context
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    identity: UnifiedIdentity;
    identityContext?: IdentityWithContext;
    supabaseAccessToken?: string;
    supabaseUser?: any;
  };
  businessContext?: {
    businessId: string;
    userRole: RoleType;
    permissions: string[];
  };
}

/**
 * RBAC Middleware options
 */
export interface RBACOptions {
  resource: string;
  action: string;
  businessContextRequired?: boolean;
  roles?: RoleType[];
  conditions?: Record<string, any>;
  skipAuthCheck?: boolean;
}

/**
 * Business context resolution options
 */
export interface BusinessContextOptions {
  paramName?: string;          // Parameter name for business ID (default: 'businessId')
  headerName?: string;         // Header name for business ID (default: 'X-Business-Context')
  required?: boolean;          // Whether business context is required (default: true)
}

/**
 * RBAC Middleware class for Express applications
 */
export class RBACMiddleware {
  private supabase: SupabaseClient;
  private permissionService: PermissionService;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.permissionService = createPermissionService(this.supabase);
  }

  /**
   * Authentication middleware - validates JWT and loads user identity
   */
  authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Extract JWT token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'Missing or invalid authorization header'
          });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify JWT token with Supabase
        const { data: { user }, error: authError } = await this.supabase.auth.getUser(token);
        
        if (authError || !user) {
          return res.status(401).json({
            error: 'Authentication failed',
            message: 'Invalid or expired token'
          });
        }

        // Get user's identity record
        const { data: identity, error: identityError } = await this.supabase
          .from('unified_identities')
          .select('*')
          .eq('authUserId', user.id)
          .eq('isActive', true)
          .single();

        if (identityError || !identity) {
          return res.status(401).json({
            error: 'Identity not found',
            message: 'User identity record not found or inactive'
          });
        }

        // Attach user context to request
        req.user = {
          id: identity.id,
          identity: identity as UnifiedIdentity,
          supabaseAccessToken: token,
          supabaseUser: user
        };

        next();
      } catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Authentication processing failed'
        });
      }
    };
  }

  /**
   * Business context resolution middleware
   */
  resolveBusinessContext(options: BusinessContextOptions = {}) {
    const { 
      paramName = 'businessId', 
      headerName = 'X-Business-Context',
      required = true 
    } = options;

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'User must be authenticated before business context resolution'
          });
        }

        // Extract business ID from params, query, or headers
        let businessId = req.params[paramName] || req.query[paramName] || req.headers[headerName.toLowerCase()];

        // Handle array case (express can parse params as arrays)
        if (Array.isArray(businessId)) {
          businessId = businessId[0];
        }

        // Check if business context is required
        if (required && !businessId) {
          return res.status(400).json({
            error: 'Business context required',
            message: `Business ID must be provided via parameter '${paramName}' or header '${headerName}'`
          });
        }

        // If no business ID provided and not required, continue without context
        if (!businessId) {
          return next();
        }

        // Validate business exists and user has access
        const { data: business, error: businessError } = await this.supabase
          .from('business_registrations')
          .select('id, businessName, isActive')
          .eq('id', businessId)
          .eq('isActive', true)
          .single();

        if (businessError || !business) {
          return res.status(404).json({
            error: 'Business not found',
            message: 'Business does not exist or is not active'
          });
        }

        // Get user's identity with full context (roles and permissions for this business)
        const identityResult = await this.permissionService.getPermissionMatrix({
          identityId: req.user.id,
          businessContext: businessId as string
        });

        if (!identityResult.success || !identityResult.data) {
          return res.status(500).json({
            error: 'Failed to resolve user context',
            message: 'Could not determine user permissions for business'
          });
        }

        const matrix = identityResult.data;

        // Get available actions for common resources
        const commonResources = ['attendance', 'employees', 'reports', 'business'];
        const permissions: string[] = [];

        for (const resource of commonResources) {
          const resourcePerms = matrix.permissions[resource];
          if (resourcePerms) {
            for (const [action, result] of Object.entries(resourcePerms)) {
              if (result.granted) {
                permissions.push(`${resource}:${action}`);
              }
            }
          }
        }

        // Attach business context to request
        req.businessContext = {
          businessId: businessId as string,
          userRole: matrix.effectiveRole,
          permissions
        };

        next();
      } catch (error) {
        console.error('Business context resolution error:', error);
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Business context resolution failed'
        });
      }
    };
  }

  /**
   * Authorization middleware - checks specific permissions
   */
  authorize(options: RBACOptions) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user && !options.skipAuthCheck) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'User must be authenticated'
          });
        }

        // Skip authorization if explicitly configured
        if (options.skipAuthCheck) {
          return next();
        }

        // Prepare permission check request
        const permissionRequest: PermissionCheckRequest = {
          identityId: req.user.id,
          resource: options.resource,
          action: options.action,
          businessContext: req.businessContext?.businessId,
          conditions: options.conditions
        };

        // If business context required but not provided
        if (options.businessContextRequired && !req.businessContext) {
          return res.status(400).json({
            error: 'Business context required',
            message: 'This operation requires business context'
          });
        }

        // Check permission
        const permissionResult = await this.permissionService.checkPermission(permissionRequest);

        if (!permissionResult.success) {
          return res.status(500).json({
            error: 'Permission check failed',
            message: permissionResult.error
          });
        }

        if (!permissionResult.data?.granted) {
          const result = permissionResult.data;
          
          return res.status(403).json({
            error: 'Access forbidden',
            message: result.reason || 'Insufficient permissions',
            details: {
              requiredRole: result.requiredRole,
              requiredPapers: result.requiredPapers,
              businessContextRequired: result.businessContextRequired,
              resource: options.resource,
              action: options.action
            }
          });
        }

        next();
      } catch (error) {
        console.error('Authorization middleware error:', error);
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Authorization check failed'
        });
      }
    };
  }

  /**
   * Combined authentication and authorization middleware
   */
  requirePermission(options: RBACOptions, businessContextOptions?: BusinessContextOptions) {
    const middlewares = [this.authenticate()];

    // Add business context resolution if needed
    if (options.businessContextRequired || businessContextOptions) {
      middlewares.push(this.resolveBusinessContext(businessContextOptions));
    }

    // Add authorization check
    middlewares.push(this.authorize(options));

    return middlewares;
  }

  /**
   * Role-based middleware (simplified interface)
   */
  requireRole(roles: RoleType | RoleType[], businessContextOptions?: BusinessContextOptions) {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    return this.requirePermission(
      {
        resource: 'general',
        action: 'access',
        roles: roleArray,
        businessContextRequired: !!businessContextOptions
      },
      businessContextOptions
    );
  }

  /**
   * Business owner middleware
   */
  requireBusinessOwner(businessContextOptions?: BusinessContextOptions) {
    return this.requirePermission(
      {
        resource: 'business',
        action: 'manage',
        businessContextRequired: true,
        roles: [RoleType.OWNER]
      },
      { required: true, ...businessContextOptions }
    );
  }

  /**
   * Manager or above middleware
   */
  requireManager(businessContextOptions?: BusinessContextOptions) {
    return this.requirePermission(
      {
        resource: 'team',
        action: 'manage',
        businessContextRequired: true,
        roles: [RoleType.MANAGER, RoleType.SUPERVISOR, RoleType.OWNER]
      },
      { required: true, ...businessContextOptions }
    );
  }

  /**
   * Worker or above middleware (basic business access)
   */
  requireWorker(businessContextOptions?: BusinessContextOptions) {
    return this.requirePermission(
      {
        resource: 'attendance',
        action: 'read',
        businessContextRequired: true,
        roles: [RoleType.WORKER, RoleType.MANAGER, RoleType.SUPERVISOR, RoleType.OWNER]
      },
      { required: true, ...businessContextOptions }
    );
  }

  /**
   * Error handling middleware for RBAC errors
   */
  static errorHandler() {
    return (error: any, req: Request, res: Response, next: NextFunction) => {
      // Handle Supabase specific errors
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Resource not found',
          message: 'The requested resource does not exist'
        });
      }

      // Handle JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided authentication token is invalid'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'The authentication token has expired'
        });
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          details: error.details
        });
      }

      // Generic error handling
      console.error('RBAC Middleware Error:', error);
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    };
  }
}

/**
 * Factory function to create RBAC middleware instance
 */
export const createRBACMiddleware = (supabaseUrl: string, supabaseServiceKey: string): RBACMiddleware => {
  return new RBACMiddleware(supabaseUrl, supabaseServiceKey);
};

/**
 * Utility function to extract user info from authenticated request
 */
export const getUserInfo = (req: AuthenticatedRequest) => {
  return {
    identityId: req.user?.id,
    identity: req.user?.identity,
    businessContext: req.businessContext,
    hasBusinessContext: !!req.businessContext,
    effectiveRole: req.businessContext?.userRole || RoleType.SEEKER,
    permissions: req.businessContext?.permissions || []
  };
};

/**
 * Utility function to check if user has specific permission in current context
 */
export const hasPermission = (req: AuthenticatedRequest, resource: string, action: string): boolean => {
  const permissionKey = `${resource}:${action}`;
  return req.businessContext?.permissions.includes(permissionKey) || false;
};

/**
 * Utility function to check if user has any of the specified roles
 */
export const hasRole = (req: AuthenticatedRequest, roles: RoleType[]): boolean => {
  const userRole = req.businessContext?.userRole || RoleType.SEEKER;
  return roles.includes(userRole);
};

/**
 * Utility function for role hierarchy checking
 */
export const hasMinimumRole = (req: AuthenticatedRequest, minimumRole: RoleType): boolean => {
  const roleHierarchy: Record<RoleType, number> = {
    [RoleType.SEEKER]: 0,
    [RoleType.WORKER]: 1,
    [RoleType.MANAGER]: 2,
    [RoleType.SUPERVISOR]: 2,
    [RoleType.OWNER]: 3,
    [RoleType.FRANCHISEE]: 4,
    [RoleType.FRANCHISOR]: 5
  };

  const userRole = req.businessContext?.userRole || RoleType.SEEKER;
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
};