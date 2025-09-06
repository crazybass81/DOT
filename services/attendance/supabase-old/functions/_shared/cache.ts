// Caching Service for Performance Optimization
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CacheEntry<T> {
  data: T
  expiresAt: number
  etag?: string
  version?: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  etag?: string // Entity tag for cache validation
  version?: number // Cache version for invalidation
}

/**
 * Multi-layer caching service with memory and distributed cache
 */
export class CacheService {
  // In-memory cache (L1)
  private memoryCache = new Map<string, CacheEntry<any>>()
  
  // Distributed cache client (L2) - Redis/Supabase
  private supabase: any
  
  // Default TTL: 5 minutes
  private defaultTTL = 5 * 60 * 1000
  
  // Maximum memory cache size
  private maxMemoryCacheSize = 100
  
  // Cache hit/miss statistics
  private stats = {
    hits: 0,
    misses: 0,
    writes: 0,
    evictions: 0
  }

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey)
    }
    
    // Start cleanup interval
    this.startCleanup()
  }

  /**
   * Get data from cache with multi-layer lookup
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    // L1: Check memory cache
    const memoryCached = this.memoryCache.get(key)
    if (memoryCached && this.isValid(memoryCached, options)) {
      this.stats.hits++
      return memoryCached.data as T
    }

    // L2: Check distributed cache
    if (this.supabase) {
      const distributedData = await this.getFromDistributed<T>(key, options)
      if (distributedData) {
        // Populate L1 cache
        this.setMemoryCache(key, distributedData, options)
        this.stats.hits++
        return distributedData
      }
    }

    this.stats.misses++
    return null
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || this.defaultTTL
    const expiresAt = Date.now() + ttl

    const entry: CacheEntry<T> = {
      data,
      expiresAt,
      etag: options?.etag,
      version: options?.version
    }

    // L1: Set in memory cache
    this.setMemoryCache(key, data, options)

    // L2: Set in distributed cache
    if (this.supabase) {
      await this.setDistributed(key, entry)
    }

    this.stats.writes++
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    // L1: Delete from memory
    this.memoryCache.delete(key)

    // L2: Delete from distributed cache
    if (this.supabase) {
      await this.deleteFromDistributed(key)
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    // L1: Clear memory
    this.memoryCache.clear()

    // L2: Clear distributed cache
    if (this.supabase) {
      await this.clearDistributed()
    }

    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // L1: Invalidate memory cache
    const regex = new RegExp(pattern)
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key)
      }
    }

    // L2: Invalidate distributed cache
    if (this.supabase) {
      await this.invalidateDistributedPattern(pattern)
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryCacheSize: this.memoryCache.size
    }
  }

  /**
   * Cache wrapper for async functions
   */
  async cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const data = await fetcher()
    
    // Cache the result
    await this.set(key, data, options)
    
    return data
  }

  /**
   * Check if cache entry is valid
   */
  private isValid(entry: CacheEntry<any>, options?: CacheOptions): boolean {
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      return false
    }

    // Check version
    if (options?.version && entry.version !== options.version) {
      return false
    }

    // Check etag
    if (options?.etag && entry.etag !== options.etag) {
      return false
    }

    return true
  }

  /**
   * Set in memory cache with LRU eviction
   */
  private setMemoryCache<T>(key: string, data: T, options?: CacheOptions): void {
    // Evict if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value
      this.memoryCache.delete(firstKey)
      this.stats.evictions++
    }

    const ttl = options?.ttl || this.defaultTTL
    this.memoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      etag: options?.etag,
      version: options?.version
    })
  }

  /**
   * Get from distributed cache
   */
  private async getFromDistributed<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from('cache_entries')
        .select('data, expires_at, etag, version')
        .eq('cache_key', key)
        .single()

      if (error || !data) {
        return null
      }

      const entry: CacheEntry<T> = {
        data: data.data,
        expiresAt: new Date(data.expires_at).getTime(),
        etag: data.etag,
        version: data.version
      }

      if (!this.isValid(entry, options)) {
        // Delete expired entry
        await this.deleteFromDistributed(key)
        return null
      }

      return entry.data
    } catch (error) {
      console.error('Distributed cache get error:', error)
      return null
    }
  }

  /**
   * Set in distributed cache
   */
  private async setDistributed(key: string, entry: CacheEntry<any>): Promise<void> {
    try {
      await this.supabase
        .from('cache_entries')
        .upsert({
          cache_key: key,
          data: entry.data,
          expires_at: new Date(entry.expiresAt).toISOString(),
          etag: entry.etag,
          version: entry.version,
          updated_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Distributed cache set error:', error)
    }
  }

  /**
   * Delete from distributed cache
   */
  private async deleteFromDistributed(key: string): Promise<void> {
    try {
      await this.supabase
        .from('cache_entries')
        .delete()
        .eq('cache_key', key)
    } catch (error) {
      console.error('Distributed cache delete error:', error)
    }
  }

  /**
   * Clear distributed cache
   */
  private async clearDistributed(): Promise<void> {
    try {
      await this.supabase
        .from('cache_entries')
        .delete()
        .lt('expires_at', new Date().toISOString())
    } catch (error) {
      console.error('Distributed cache clear error:', error)
    }
  }

  /**
   * Invalidate distributed cache by pattern
   */
  private async invalidateDistributedPattern(pattern: string): Promise<void> {
    try {
      await this.supabase
        .from('cache_entries')
        .delete()
        .like('cache_key', pattern.replace(/\*/g, '%'))
    } catch (error) {
      console.error('Distributed cache invalidate error:', error)
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    setInterval(() => {
      // Clean expired entries from memory cache
      const now = Date.now()
      for (const [key, entry] of this.memoryCache) {
        if (now > entry.expiresAt) {
          this.memoryCache.delete(key)
        }
      }
    }, 60000) // Every minute
  }
}

/**
 * Cache key builders for consistent key generation
 */
export const cacheKeys = {
  employee: (id: string) => `employee:${id}`,
  organization: (id: string) => `org:${id}`,
  organizationSettings: (id: string) => `org:${id}:settings`,
  attendance: (employeeId: string, date: string) => `attendance:${employeeId}:${date}`,
  shift: (id: string) => `shift:${id}`,
  location: (orgId: string) => `location:${orgId}`,
  analytics: (orgId: string, type: string, date: string) => `analytics:${orgId}:${type}:${date}`,
  report: (orgId: string, type: string, start: string, end: string) => `report:${orgId}:${type}:${start}:${end}`
}

/**
 * Cache decorators for automatic caching
 */
export function cacheable(keyBuilder: (...args: any[]) => string, ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const cache = (this as any).cache || new CacheService()
      const key = keyBuilder(...args)
      
      return cache.cached(
        key,
        () => originalMethod.apply(this, args),
        { ttl }
      )
    }
    
    return descriptor
  }
}

// Export singleton instance
export const cacheService = new CacheService(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)