// Rate Limiting Middleware for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyPrefix?: string // Redis key prefix
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
}

interface RateLimitEntry {
  count: number
  resetAt: number
  firstRequestAt: number
}

export class RateLimiter {
  private readonly cache = new Map<string, RateLimitEntry>()
  private readonly options: Required<RateLimitOptions>
  private cleanupInterval: number | null = null

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      keyPrefix: options.keyPrefix || 'ratelimit',
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false
    }
    
    // Start cleanup interval
    this.startCleanup()
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `${this.options.keyPrefix}:${identifier}`
    const now = Date.now()
    
    // Get or create entry
    let entry = this.cache.get(key)
    
    if (!entry || now > entry.resetAt) {
      // Create new entry
      entry = {
        count: 1,
        resetAt: now + this.options.windowMs,
        firstRequestAt: now
      }
      this.cache.set(key, entry)
      
      return {
        allowed: true,
        remaining: this.options.maxRequests - 1,
        resetAt: entry.resetAt
      }
    }
    
    // Check if limit exceeded
    if (entry.count >= this.options.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt
      }
    }
    
    // Increment counter
    entry.count++
    this.cache.set(key, entry)
    
    return {
      allowed: true,
      remaining: this.options.maxRequests - entry.count,
      resetAt: entry.resetAt
    }
  }

  /**
   * Reset rate limit for specific identifier
   */
  reset(identifier: string): void {
    const key = `${this.options.keyPrefix}:${identifier}`
    this.cache.delete(key)
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now > entry.resetAt) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  /**
   * Stop the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

/**
 * Create rate limiter middleware for different tiers
 */
export function createRateLimiters() {
  return {
    anonymous: new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10
    }),
    authenticated: new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    }),
    premium: new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000
    }),
    strict: new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5 // For sensitive operations
    })
  }
}

/**
 * Rate limiting middleware for Edge Functions
 */
export async function rateLimitMiddleware(
  req: Request,
  limiter: RateLimiter,
  identifier?: string
): Promise<Response | null> {
  // Get identifier from request
  const id = identifier || 
    req.headers.get('X-User-ID') || 
    req.headers.get('X-Forwarded-For')?.split(',')[0] || 
    'anonymous'
  
  // Check rate limit
  const result = await limiter.checkLimit(id)
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limiter.options.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString()
        }
      }
    )
  }
  
  // Request allowed - add rate limit headers
  return null
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  result: { allowed: boolean; remaining: number; resetAt: number },
  limit: number
): HeadersInit {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
  }
}

/**
 * Distributed rate limiter using Supabase
 */
export class DistributedRateLimiter {
  private supabase: any

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async checkLimit(
    identifier: string, 
    options: RateLimitOptions
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now()
    const key = `${options.keyPrefix}:${identifier}`
    const windowStart = now - options.windowMs

    try {
      // Get count of requests in current window
      const { data, error } = await this.supabase
        .from('rate_limit_logs')
        .select('id', { count: 'exact' })
        .eq('key', key)
        .gte('created_at', new Date(windowStart).toISOString())

      if (error) throw error

      const count = data?.length || 0

      if (count >= options.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: windowStart + options.windowMs
        }
      }

      // Log this request
      await this.supabase
        .from('rate_limit_logs')
        .insert({
          key,
          identifier,
          created_at: new Date(now).toISOString()
        })

      // Clean old entries
      await this.supabase
        .from('rate_limit_logs')
        .delete()
        .lt('created_at', new Date(windowStart).toISOString())

      return {
        allowed: true,
        remaining: options.maxRequests - count - 1,
        resetAt: windowStart + options.windowMs
      }

    } catch (error) {
      console.error('Distributed rate limit error:', error)
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: options.maxRequests,
        resetAt: now + options.windowMs
      }
    }
  }
}