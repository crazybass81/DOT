/**
 * Rate Limiting Module for API Protection
 * Implements token bucket algorithm with sliding window
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  maxRequests: number;         // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean;     // Don't count failed requests
  message?: string;                  // Custom error message
  standardHeaders?: boolean;        // Return rate limit headers
  legacyHeaders?: boolean;         // Return X-RateLimit headers
  handler?: (req: NextRequest) => NextResponse; // Custom handler for rate limited requests
}

// Default configurations for different endpoints
export const RateLimitConfigs = {
  // Strict limit for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
  },
  
  // Moderate limit for API endpoints
  api: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'API rate limit exceeded',
  },
  
  // Relaxed limit for read operations
  read: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests',
  },
  
  // Strict limit for write operations
  write: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Write operation rate limit exceeded',
  },
  
  // Very strict limit for admin operations
  admin: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
    message: 'Admin operation rate limit exceeded',
  },
} as const;

// In-memory store for rate limit data (use Redis in production)
class RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  increment(key: string, windowMs: number): number {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    const entry = this.store.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // New window
      this.store.set(key, { count: 1, resetTime });
      return 1;
    }
    
    // Increment existing window
    entry.count++;
    return entry.count;
  }

  get(key: string): { count: number; resetTime: number } | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    
    // Check if window has expired
    if (entry.resetTime <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    
    return entry;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global store instance
const rateLimitStore = new RateLimitStore();

/**
 * Generate a unique key for rate limiting
 */
function generateKey(req: NextRequest, customGenerator?: (req: NextRequest) => string): string {
  if (customGenerator) {
    return customGenerator(req);
  }
  
  // Default: Use IP address + user ID if authenticated
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             req.ip || 
             'unknown';
  
  const userId = req.headers.get('x-user-id') || '';
  const endpoint = req.nextUrl.pathname;
  
  // Create a hash to avoid key length issues
  const keyData = `${ip}-${userId}-${endpoint}`;
  return createHash('md5').update(keyData).digest('hex');
}

/**
 * Main rate limiting middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator,
    message = 'Too many requests, please try again later',
    standardHeaders = true,
    legacyHeaders = false,
    handler,
  } = config;

  return async function rateLimiter(req: NextRequest): Promise<NextResponse | null> {
    const key = generateKey(req, keyGenerator);
    const count = rateLimitStore.increment(key, windowMs);
    const entry = rateLimitStore.get(key);
    
    if (!entry) {
      return null; // Should not happen, but handle gracefully
    }
    
    const remaining = Math.max(0, maxRequests - count);
    const resetTime = new Date(entry.resetTime);
    
    // Prepare headers
    const headers = new Headers();
    
    if (standardHeaders) {
      headers.set('RateLimit-Limit', maxRequests.toString());
      headers.set('RateLimit-Remaining', remaining.toString());
      headers.set('RateLimit-Reset', resetTime.toISOString());
    }
    
    if (legacyHeaders) {
      headers.set('X-RateLimit-Limit', maxRequests.toString());
      headers.set('X-RateLimit-Remaining', remaining.toString());
      headers.set('X-RateLimit-Reset', resetTime.toISOString());
    }
    
    // Check if limit exceeded
    if (count > maxRequests) {
      headers.set('Retry-After', Math.ceil((entry.resetTime - Date.now()) / 1000).toString());
      
      // Use custom handler if provided
      if (handler) {
        return handler(req);
      }
      
      // Default rate limit response
      return NextResponse.json(
        {
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: entry.resetTime,
          limit: maxRequests,
        },
        {
          status: 429,
          headers,
        }
      );
    }
    
    // Not rate limited, return null to continue
    return null;
  };
}

/**
 * Distributed rate limiting with Redis (for production)
 */
export class DistributedRateLimiter {
  private redisClient: any; // Redis client type
  
  constructor(redisClient: any) {
    this.redisClient = redisClient;
  }
  
  async checkLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    // Use Redis pipeline for atomic operations
    const pipeline = this.redisClient.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results[0][1];
    
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetTime: (window + 1) * windowMs,
    };
  }
}

/**
 * IP-based rate limiting
 */
export function createIPRateLimiter(
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  return createRateLimiter({
    windowMs,
    maxRequests,
    keyGenerator: (req) => {
      const ip = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 req.ip || 
                 'unknown';
      return `ip:${ip}`;
    },
    message: `IP rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
  });
}

/**
 * User-based rate limiting
 */
export function createUserRateLimiter(
  maxRequests: number = 60,
  windowMs: number = 60000
) {
  return createRateLimiter({
    windowMs,
    maxRequests,
    keyGenerator: (req) => {
      const userId = req.headers.get('x-user-id') || 'anonymous';
      return `user:${userId}`;
    },
    message: `User rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
  });
}

/**
 * Endpoint-specific rate limiting
 */
export function createEndpointRateLimiter(
  endpoint: string,
  maxRequests: number = 30,
  windowMs: number = 60000
) {
  return createRateLimiter({
    windowMs,
    maxRequests,
    keyGenerator: (req) => {
      const userId = req.headers.get('x-user-id') || 
                    req.headers.get('x-forwarded-for') || 
                    'anonymous';
      return `endpoint:${endpoint}:${userId}`;
    },
    message: `Endpoint rate limit exceeded for ${endpoint}`,
  });
}

/**
 * Progressive rate limiting (increases delay with each violation)
 */
export class ProgressiveRateLimiter {
  private violations: Map<string, number> = new Map();
  
  async checkLimit(
    key: string,
    baseLimit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; delay: number }> {
    const violations = this.violations.get(key) || 0;
    const delay = Math.min(Math.pow(2, violations) * 1000, 60000); // Max 1 minute
    
    const entry = rateLimitStore.get(key);
    if (!entry || entry.count > baseLimit) {
      this.violations.set(key, violations + 1);
      return { allowed: false, delay };
    }
    
    // Reset violations on successful request
    if (violations > 0) {
      this.violations.set(key, Math.max(0, violations - 1));
    }
    
    return { allowed: true, delay: 0 };
  }
}

/**
 * Clean up resources on process exit
 */
if (typeof window === 'undefined') {
  process.on('exit', () => {
    rateLimitStore.destroy();
  });
}