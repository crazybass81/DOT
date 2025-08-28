import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Request, Response, NextFunction } from 'express';
import * as Joi from 'joi';

// ========== AUTHENTICATION MIDDLEWARE ==========

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

/**
 * Middleware to authenticate Firebase users
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Missing or invalid authorization header',
        },
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get user document from Firestore for role information
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      res.status(401).json({
        error: {
          code: 'user-not-found',
          message: 'User account not found',
        },
      });
      return;
    }

    const userData = userDoc.data()!;
    
    // Check if user is active
    if (userData.status !== 'ACTIVE') {
      res.status(403).json({
        error: {
          code: 'user-inactive',
          message: `User account is ${userData.status}`,
        },
      });
      return;
    }

    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: {
          code: 'token-expired',
          message: 'Authentication token has expired',
        },
      });
    } else if (error.code === 'auth/argument-error') {
      res.status(401).json({
        error: {
          code: 'invalid-token',
          message: 'Invalid authentication token',
        },
      });
    } else {
      res.status(500).json({
        error: {
          code: 'authentication-failed',
          message: 'Authentication failed',
        },
      });
    }
  }
};

// ========== AUTHORIZATION MIDDLEWARE ==========

/**
 * Middleware to check user roles
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'not-authenticated',
            message: 'Authentication required',
          },
        });
        return;
      }

      const userRole = req.user.role;
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        res.status(403).json({
          error: {
            code: 'insufficient-permissions',
            message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        error: {
          code: 'authorization-failed',
          message: 'Authorization check failed',
        },
      });
    }
  };
};

/**
 * Check if user can access specific store
 */
export const authorizeStore = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'not-authenticated',
          message: 'Authentication required',
        },
      });
      return;
    }

    const storeId = req.params.storeId || req.body.storeId;
    
    if (!storeId) {
      res.status(400).json({
        error: {
          code: 'missing-store-id',
          message: 'Store ID is required',
        },
      });
      return;
    }

    // Get user data
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(req.user.uid)
      .get();

    if (!userDoc.exists) {
      res.status(404).json({
        error: {
          code: 'user-not-found',
          message: 'User not found',
        },
      });
      return;
    }

    const userData = userDoc.data()!;
    
    // Check if user can access store
    const canAccess = userData.role === 'SUPER_ADMIN' ||
                     userData.storeId === storeId ||
                     (userData.managedStoreIds && userData.managedStoreIds.includes(storeId));

    if (!canAccess) {
      res.status(403).json({
        error: {
          code: 'store-access-denied',
          message: 'You do not have access to this store',
        },
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Store authorization error:', error);
    res.status(500).json({
      error: {
        code: 'store-authorization-failed',
        message: 'Store access check failed',
      },
    });
  }
};

// ========== VALIDATION MIDDLEWARE ==========

/**
 * Middleware to validate request body using Joi schemas
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        res.status(400).json({
          error: {
            code: 'validation-failed',
            message: 'Request validation failed',
            details: validationErrors,
          },
        });
        return;
      }

      // Replace req.body with validated and sanitized data
      req.body = value;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({
        error: {
          code: 'validation-error',
          message: 'Validation process failed',
        },
      });
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        res.status(400).json({
          error: {
            code: 'query-validation-failed',
            message: 'Query parameter validation failed',
            details: validationErrors,
          },
        });
        return;
      }

      req.query = value;
      next();
    } catch (error) {
      console.error('Query validation error:', error);
      res.status(500).json({
        error: {
          code: 'query-validation-error',
          message: 'Query validation process failed',
        },
      });
    }
  };
};

// ========== RATE LIMITING MIDDLEWARE ==========

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiting middleware
 */
export const rateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  const { windowMs, max, message = 'Too many requests', keyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const key = keyGenerator ? keyGenerator(req) : req.ip;
      const now = Date.now();

      // Get current rate limit data for this key
      const current = rateLimitStore.get(key);

      // Reset if window has expired
      if (!current || now > current.resetTime) {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });
        next();
        return;
      }

      // Check if limit exceeded
      if (current.count >= max) {
        res.status(429).json({
          error: {
            code: 'rate-limit-exceeded',
            message,
            retryAfter: Math.ceil((current.resetTime - now) / 1000),
          },
        });
        return;
      }

      // Increment counter
      current.count++;
      rateLimitStore.set(key, current);
      next();

    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Don't block request on rate limiting errors
    }
  };
};

// ========== ERROR HANDLING MIDDLEWARE ==========

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Unhandled error:', error);

  // Handle Firestore errors
  if (error.code && error.code.startsWith('firestore/')) {
    res.status(500).json({
      error: {
        code: 'database-error',
        message: 'Database operation failed',
      },
    });
    return;
  }

  // Handle validation errors
  if (error.isJoi || error.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'validation-error',
        message: 'Request validation failed',
        details: error.details || error.message,
      },
    });
    return;
  }

  // Handle Firebase Auth errors
  if (error.code && error.code.startsWith('auth/')) {
    res.status(401).json({
      error: {
        code: 'authentication-error',
        message: 'Authentication failed',
      },
    });
    return;
  }

  // Default error response
  res.status(500).json({
    error: {
      code: 'internal-error',
      message: 'An internal error occurred',
      ...(process.env.NODE_ENV !== 'production' && {
        stack: error.stack,
        details: error.message,
      }),
    },
  });
};

// ========== CORS MIDDLEWARE ==========

/**
 * Custom CORS middleware with environment-based configuration
 */
export const corsHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        'https://dotattendance.com',
        'https://admin.dotattendance.com',
        'https://app.dotattendance.com',
      ]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  const origin = req.headers.origin;
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};

// ========== LOGGING MIDDLEWARE ==========

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  
  // Log request
  console.log(`→ ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  });

  // Log response when finished
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    console.log(`← ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
    return originalSend.call(this, body);
  };

  next();
};

// ========== HEALTH CHECK MIDDLEWARE ==========

/**
 * Health check endpoint
 */
export const healthCheck = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
};

// ========== UTILITY FUNCTIONS ==========

/**
 * Async wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create standardized API response
 */
export const createResponse = (
  data: any,
  message?: string,
  meta?: any
) => {
  return {
    success: true,
    data,
    message,
    meta,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Create standardized error response
 */
export const createErrorResponse = (
  code: string,
  message: string,
  details?: any
) => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
};