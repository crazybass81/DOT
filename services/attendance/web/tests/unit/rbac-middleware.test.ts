/**
 * RBAC Middleware Unit Tests
 * TDD implementation for ID-ROLE-PAPER RBAC Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { 
  RBACMiddleware,
  AuthenticatedRequest,
  RBACOptions,
  BusinessContextOptions,
  getUserInfo,
  hasPermission,
  hasRole,
  hasMinimumRole
} from '../../src/lib/middleware/rbac-middleware';
import { 
  RoleType,
  UnifiedIdentity,
  IdType
} from '../../src/types/id-role-paper';

// Mock Express Request, Response, NextFunction
const mockRequest = (overrides = {}): AuthenticatedRequest => ({
  headers: {},
  params: {},
  query: {},
  user: undefined as any,
  businessContext: undefined,
  ...overrides
} as AuthenticatedRequest);

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
};

// Mock PermissionService
const mockPermissionService = {
  checkPermission: jest.fn(),
  getPermissionMatrix: jest.fn()
};

// Mock the createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Mock the PermissionService
jest.mock('../../src/lib/services/permission-service', () => ({
  createPermissionService: jest.fn(() => mockPermissionService)
}));

describe('RBAC Middleware', () => {
  let rbacMiddleware: RBACMiddleware;
  let req: AuthenticatedRequest;
  let res: Response;
  let next: NextFunction;

  const mockIdentity: UnifiedIdentity = {
    id: 'identity-123',
    idType: IdType.PERSONAL,
    email: 'test@example.com',
    fullName: '김테스트',
    authUserId: 'auth-123',
    isVerified: true,
    isActive: true,
    profileData: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    rbacMiddleware = new RBACMiddleware('mock-url', 'mock-key');
    req = mockRequest();
    res = mockResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    test('should authenticate valid JWT token', async () => {
      req.headers = {
        authorization: 'Bearer valid-jwt-token'
      };

      // Mock successful auth
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-123', email: 'test@example.com' } },
        error: null
      });

      // Mock identity lookup
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockIdentity,
        error: null
      });

      const authMiddleware = rbacMiddleware.authenticate();
      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('identity-123');
      expect(req.user.identity).toEqual(mockIdentity);
      expect(req.user.supabaseAccessToken).toBe('valid-jwt-token');
    });

    test('should reject request without authorization header', async () => {
      const authMiddleware = rbacMiddleware.authenticate();
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Missing or invalid authorization header'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request with invalid token format', async () => {
      req.headers = {
        authorization: 'InvalidFormat token-here'
      };

      const authMiddleware = rbacMiddleware.authenticate();
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Missing or invalid authorization header'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid JWT token', async () => {
      req.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      const authMiddleware = rbacMiddleware.authenticate();
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject when identity record not found', async () => {
      req.headers = {
        authorization: 'Bearer valid-token'
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-123' } },
        error: null
      });

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const authMiddleware = rbacMiddleware.authenticate();
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Identity not found',
        message: 'User identity record not found or inactive'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Business Context Resolution Middleware', () => {
    beforeEach(() => {
      req.user = {
        id: 'identity-123',
        identity: mockIdentity,
        supabaseAccessToken: 'token',
        supabaseUser: { id: 'auth-123' }
      };
    });

    test('should resolve business context from route parameter', async () => {
      req.params = { businessId: 'business-123' };

      // Mock business validation
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { id: 'business-123', businessName: '테스트 회사', isActive: true },
        error: null
      });

      // Mock permission matrix
      mockPermissionService.getPermissionMatrix.mockResolvedValue({
        success: true,
        data: {
          identityId: 'identity-123',
          businessContext: 'business-123',
          effectiveRole: RoleType.WORKER,
          permissions: {
            attendance: {
              read: { granted: true },
              create: { granted: true }
            }
          }
        }
      });

      const contextMiddleware = rbacMiddleware.resolveBusinessContext();
      await contextMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.businessContext).toBeDefined();
      expect(req.businessContext?.businessId).toBe('business-123');
      expect(req.businessContext?.userRole).toBe(RoleType.WORKER);
      expect(req.businessContext?.permissions).toContain('attendance:read');
      expect(req.businessContext?.permissions).toContain('attendance:create');
    });

    test('should resolve business context from custom parameter name', async () => {
      req.params = { companyId: 'business-123' };

      const options: BusinessContextOptions = {
        paramName: 'companyId'
      };

      // Mock business validation
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { id: 'business-123', businessName: '테스트 회사', isActive: true },
        error: null
      });

      // Mock permission matrix
      mockPermissionService.getPermissionMatrix.mockResolvedValue({
        success: true,
        data: {
          identityId: 'identity-123',
          businessContext: 'business-123',
          effectiveRole: RoleType.MANAGER,
          permissions: {
            attendance: { read: { granted: true }, approve: { granted: true } },
            employees: { read: { granted: true } }
          }
        }
      });

      const contextMiddleware = rbacMiddleware.resolveBusinessContext(options);
      await contextMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.businessContext?.businessId).toBe('business-123');
      expect(req.businessContext?.userRole).toBe(RoleType.MANAGER);
    });

    test('should resolve business context from header', async () => {
      req.headers = { 'x-business-context': 'business-123' };

      // Mock business validation
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { id: 'business-123', businessName: '테스트 회사', isActive: true },
        error: null
      });

      // Mock permission matrix
      mockPermissionService.getPermissionMatrix.mockResolvedValue({
        success: true,
        data: {
          identityId: 'identity-123',
          businessContext: 'business-123',
          effectiveRole: RoleType.OWNER,
          permissions: {
            business: { manage: { granted: true } },
            employees: { manage: { granted: true } }
          }
        }
      });

      const contextMiddleware = rbacMiddleware.resolveBusinessContext();
      await contextMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.businessContext?.businessId).toBe('business-123');
      expect(req.businessContext?.userRole).toBe(RoleType.OWNER);
    });

    test('should reject when business context required but not provided', async () => {
      const contextMiddleware = rbacMiddleware.resolveBusinessContext({ required: true });
      await contextMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Business context required',
        message: `Business ID must be provided via parameter 'businessId' or header 'X-Business-Context'`
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should continue without context when not required', async () => {
      const contextMiddleware = rbacMiddleware.resolveBusinessContext({ required: false });
      await contextMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.businessContext).toBeUndefined();
    });

    test('should reject when business not found', async () => {
      req.params = { businessId: 'non-existent-business' };

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const contextMiddleware = rbacMiddleware.resolveBusinessContext();
      await contextMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Business not found',
        message: 'Business does not exist or is not active'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject when not authenticated', async () => {
      req.user = undefined as any;

      const contextMiddleware = rbacMiddleware.resolveBusinessContext();
      await contextMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'User must be authenticated before business context resolution'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Authorization Middleware', () => {
    beforeEach(() => {
      req.user = {
        id: 'identity-123',
        identity: mockIdentity,
        supabaseAccessToken: 'token',
        supabaseUser: { id: 'auth-123' }
      };

      req.businessContext = {
        businessId: 'business-123',
        userRole: RoleType.WORKER,
        permissions: ['attendance:read', 'attendance:create']
      };
    });

    test('should allow access when permission granted', async () => {
      const options: RBACOptions = {
        resource: 'attendance',
        action: 'read',
        businessContextRequired: true
      };

      mockPermissionService.checkPermission.mockResolvedValue({
        success: true,
        data: { granted: true, reason: 'Permission granted' }
      });

      const authMiddleware = rbacMiddleware.authorize(options);
      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockPermissionService.checkPermission).toHaveBeenCalledWith({
        identityId: 'identity-123',
        resource: 'attendance',
        action: 'read',
        businessContext: 'business-123',
        conditions: undefined
      });
    });

    test('should deny access when permission denied', async () => {
      const options: RBACOptions = {
        resource: 'employees',
        action: 'create',
        businessContextRequired: true
      };

      mockPermissionService.checkPermission.mockResolvedValue({
        success: true,
        data: { 
          granted: false, 
          reason: 'Insufficient role level',
          requiredRole: RoleType.OWNER
        }
      });

      const authMiddleware = rbacMiddleware.authorize(options);
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access forbidden',
        message: 'Insufficient role level',
        details: {
          requiredRole: RoleType.OWNER,
          requiredPapers: undefined,
          businessContextRequired: undefined,
          resource: 'employees',
          action: 'create'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject when business context required but not provided', async () => {
      req.businessContext = undefined;

      const options: RBACOptions = {
        resource: 'attendance',
        action: 'read',
        businessContextRequired: true
      };

      const authMiddleware = rbacMiddleware.authorize(options);
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Business context required',
        message: 'This operation requires business context'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should skip authentication check when configured', async () => {
      req.user = undefined as any;

      const options: RBACOptions = {
        resource: 'public',
        action: 'read',
        skipAuthCheck: true
      };

      const authMiddleware = rbacMiddleware.authorize(options);
      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should handle permission service errors', async () => {
      const options: RBACOptions = {
        resource: 'attendance',
        action: 'read'
      };

      mockPermissionService.checkPermission.mockResolvedValue({
        success: false,
        error: 'Permission service unavailable'
      });

      const authMiddleware = rbacMiddleware.authorize(options);
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Permission check failed',
        message: 'Permission service unavailable'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Combined Middleware Methods', () => {
    test('requirePermission should create correct middleware chain', () => {
      const options: RBACOptions = {
        resource: 'attendance',
        action: 'read',
        businessContextRequired: true
      };

      const middlewares = rbacMiddleware.requirePermission(options);

      expect(middlewares).toHaveLength(3);
      // Should have authentication, business context, and authorization
    });

    test('requireRole should work with single role', () => {
      const middlewares = rbacMiddleware.requireRole(RoleType.MANAGER);

      expect(middlewares).toHaveLength(2);
      // Should have authentication and authorization
    });

    test('requireRole should work with multiple roles', () => {
      const middlewares = rbacMiddleware.requireRole([RoleType.MANAGER, RoleType.OWNER]);

      expect(middlewares).toHaveLength(2);
    });

    test('requireBusinessOwner should create owner-specific middleware', () => {
      const middlewares = rbacMiddleware.requireBusinessOwner();

      expect(middlewares).toHaveLength(3);
      // Should have authentication, business context, and authorization for owner
    });

    test('requireManager should create manager-specific middleware', () => {
      const middlewares = rbacMiddleware.requireManager();

      expect(middlewares).toHaveLength(3);
      // Should have authentication, business context, and authorization for manager
    });

    test('requireWorker should create worker-specific middleware', () => {
      const middlewares = rbacMiddleware.requireWorker();

      expect(middlewares).toHaveLength(3);
      // Should have authentication, business context, and authorization for worker
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      req.user = {
        id: 'identity-123',
        identity: mockIdentity,
        supabaseAccessToken: 'token',
        supabaseUser: { id: 'auth-123' }
      };

      req.businessContext = {
        businessId: 'business-123',
        userRole: RoleType.MANAGER,
        permissions: ['attendance:read', 'attendance:create', 'attendance:approve', 'employees:read']
      };
    });

    test('getUserInfo should extract user information', () => {
      const userInfo = getUserInfo(req);

      expect(userInfo.identityId).toBe('identity-123');
      expect(userInfo.identity).toEqual(mockIdentity);
      expect(userInfo.businessContext).toEqual(req.businessContext);
      expect(userInfo.hasBusinessContext).toBe(true);
      expect(userInfo.effectiveRole).toBe(RoleType.MANAGER);
      expect(userInfo.permissions).toEqual(req.businessContext.permissions);
    });

    test('getUserInfo should handle missing business context', () => {
      req.businessContext = undefined;

      const userInfo = getUserInfo(req);

      expect(userInfo.hasBusinessContext).toBe(false);
      expect(userInfo.effectiveRole).toBe(RoleType.SEEKER);
      expect(userInfo.permissions).toEqual([]);
    });

    test('hasPermission should check specific permissions', () => {
      expect(hasPermission(req, 'attendance', 'read')).toBe(true);
      expect(hasPermission(req, 'attendance', 'approve')).toBe(true);
      expect(hasPermission(req, 'employees', 'read')).toBe(true);
      expect(hasPermission(req, 'employees', 'create')).toBe(false);
    });

    test('hasRole should check specific roles', () => {
      expect(hasRole(req, [RoleType.MANAGER])).toBe(true);
      expect(hasRole(req, [RoleType.WORKER])).toBe(false);
      expect(hasRole(req, [RoleType.MANAGER, RoleType.OWNER])).toBe(true);
    });

    test('hasMinimumRole should check role hierarchy', () => {
      expect(hasMinimumRole(req, RoleType.SEEKER)).toBe(true);
      expect(hasMinimumRole(req, RoleType.WORKER)).toBe(true);
      expect(hasMinimumRole(req, RoleType.MANAGER)).toBe(true);
      expect(hasMinimumRole(req, RoleType.OWNER)).toBe(false);
      expect(hasMinimumRole(req, RoleType.FRANCHISOR)).toBe(false);
    });

    test('hasMinimumRole should handle SUPERVISOR at same level as MANAGER', () => {
      req.businessContext!.userRole = RoleType.SUPERVISOR;

      expect(hasMinimumRole(req, RoleType.WORKER)).toBe(true);
      expect(hasMinimumRole(req, RoleType.MANAGER)).toBe(true);
      expect(hasMinimumRole(req, RoleType.SUPERVISOR)).toBe(true);
      expect(hasMinimumRole(req, RoleType.OWNER)).toBe(false);
    });
  });

  describe('Error Handling Middleware', () => {
    let errorHandler: (error: any, req: Request, res: Response, next: NextFunction) => void;

    beforeEach(() => {
      errorHandler = RBACMiddleware.errorHandler();
    });

    test('should handle Supabase PGRST116 error', () => {
      const error = { code: 'PGRST116' };
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Resource not found',
        message: 'The requested resource does not exist'
      });
    });

    test('should handle JWT errors', () => {
      const jwtError = { name: 'JsonWebTokenError' };
      
      errorHandler(jwtError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'The provided authentication token is invalid'
      });
    });

    test('should handle token expired errors', () => {
      const expiredError = { name: 'TokenExpiredError' };
      
      errorHandler(expiredError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired',
        message: 'The authentication token has expired'
      });
    });

    test('should handle validation errors', () => {
      const validationError = { 
        name: 'ValidationError', 
        message: 'Invalid input',
        details: { field: 'businessId', reason: 'required' }
      };
      
      errorHandler(validationError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        message: 'Invalid input',
        details: { field: 'businessId', reason: 'required' }
      });
    });

    test('should handle generic errors', () => {
      const genericError = new Error('Something went wrong');
      
      errorHandler(genericError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    });
  });
});