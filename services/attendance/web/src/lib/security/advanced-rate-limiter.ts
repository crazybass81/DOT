/**
 * 🟢 GREEN Phase: Advanced Rate Limiting System with DDoS Protection
 * Implements comprehensive rate limiting, DDoS detection, and IP blacklisting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';

// Rate limit configurations per API type
export const API_RATE_LIMITS = {
  general: { limit: 100, window: 60000 }, // 100 req/min
  search: { limit: 50, window: 60000 },   // 50 req/min
  auth: { limit: 10, window: 60000 },     // 10 req/min
  'master-admin': { limit: 20, window: 60000, perUser: true }, // 20 req/min per user
  bulk: { limit: 5, window: 60000, perUser: true },  // 5 req/min per user
};

/**
 * Advanced Rate Limiting System with multiple protection layers
 */
export class RateLimitingSystem {
  private store: Map<string, RateLimitEntry> = new Map();
  private redis?: Redis;
  private cleanupInterval: NodeJS.Timeout;
  private blacklist: Set<string> = new Set();
  private whitelist: Set<string> = new Set(['192.168.0.0/16', '10.0.0.0/8']); // Internal IPs

  constructor(redisClient?: Redis) {
    this.redis = redisClient;
    // Cleanup expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
  }

  async checkLimit(req: NextRequest, apiType: keyof typeof API_RATE_LIMITS): Promise<RateLimitResult> {
    const config = API_RATE_LIMITS[apiType];
    const fingerprint = await this.generateFingerprint(req, config.perUser);
    
    // Check if IP is blacklisted
    const ip = this.extractIP(req);
    if (this.blacklist.has(ip)) {
      return {
        allowed: false,
        statusCode: 403,
        message: 'Access denied - IP blacklisted',
        reason: 'BLACKLIST'
      };
    }

    // Check whitelist
    if (this.isWhitelisted(ip)) {
      return { allowed: true, statusCode: 200 };
    }

    // Check rate limit
    const entry = await this.getOrCreateEntry(fingerprint, config.window);
    entry.count++;

    if (entry.count > config.limit) {
      // Record violation
      entry.violations++;
      
      // Auto-blacklist after 5 violations
      if (entry.violations >= 5) {
        this.blacklist.add(ip);
        await this.logSecurityEvent('IP_BLACKLISTED', ip, 'Repeated rate limit violations');
      }

      const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
      
      return {
        allowed: false,
        statusCode: 429,
        message: `Rate limit exceeded for ${apiType} API`,
        retryAfter,
        limit: config.limit,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    return {
      allowed: true,
      statusCode: 200,
      remaining: config.limit - entry.count,
      limit: config.limit,
      resetTime: entry.resetTime
    };
  }

  async generateFingerprint(req: NextRequest, perUser: boolean = false): Promise<string> {
    const parts: string[] = [];
    
    // Always use real IP (prevent spoofing)
    const ip = this.extractIP(req);
    parts.push(ip);
    
    // Add user ID if per-user limiting
    if (perUser) {
      const userId = req.headers.get('x-user-id') || 'anonymous';
      parts.push(userId);
    }
    
    // Add endpoint
    parts.push(req.nextUrl.pathname);
    
    // Create hash for consistent key length
    return createHash('sha256').update(parts.join(':')).digest('hex');
  }

  private extractIP(req: NextRequest): string {
    // Prioritize X-Real-IP (from load balancer) over X-Forwarded-For (can be spoofed)
    return req.headers.get('x-real-ip') || 
           req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
           req.ip || 
           'unknown';
  }

  private isWhitelisted(ip: string): boolean {
    // Check if IP is in whitelist (supports CIDR notation)
    return Array.from(this.whitelist).some(range => {
      if (range.includes('/')) {
        return this.isIPInCIDR(ip, range);
      }
      return ip === range;
    });
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    // Simple CIDR check for internal networks
    const [network] = cidr.split('/');
    return ip.startsWith(network.split('.').slice(0, 2).join('.'));
  }

  private async getOrCreateEntry(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    let entry = this.store.get(key);
    
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        violations: 0,
        resetTime: now + windowMs,
        firstRequest: now
      };
      this.store.set(key, entry);
    }
    
    return entry;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  private async logSecurityEvent(event: string, ip: string, details: string): Promise<void> {
    console.log(`[SECURITY] ${event}: IP=${ip}, Details=${details}`);
    // In production, send to security monitoring service
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

/**
 * DDoS Detection System with pattern recognition
 */
export class DDoSDetector {
  private requestPatterns: Map<string, RequestPattern> = new Map();
  private attackStatus: 'IDLE' | 'SUSPICIOUS' | 'ACTIVE' = 'IDLE';
  private emergencyMode: boolean = false;
  private blockedIPs: Set<string> = new Set();
  private botnetSignatures: Map<string, number> = new Map();
  private monitoringInterval: NodeJS.Timeout;

  constructor() {
    // Monitor patterns every 5 seconds
    this.monitoringInterval = setInterval(() => this.analyzePatterns(), 5000);
  }

  async detectAttack(req: NextRequest): Promise<boolean> {
    const ip = this.extractIP(req);
    const endpoint = req.nextUrl.pathname;
    const timestamp = Date.now();
    const userId = req.headers.get('x-user-id');
    
    // Update request pattern
    const patternKey = `${endpoint}:${Math.floor(timestamp / 10000)}`; // 10-second windows
    const pattern = this.requestPatterns.get(patternKey) || {
      requests: 0,
      uniqueIPs: new Set(),
      authenticatedRequests: 0,
      timestamp
    };
    
    pattern.requests++;
    pattern.uniqueIPs.add(ip);
    if (userId) pattern.authenticatedRequests++;
    
    this.requestPatterns.set(patternKey, pattern);
    
    // Check for attack patterns
    const isAttack = this.checkAttackPatterns(pattern);
    
    if (isAttack) {
      this.attackStatus = 'ACTIVE';
      this.blockedIPs.add(ip);
      
      // Trigger emergency mode if severe
      if (pattern.requests > 500 || pattern.uniqueIPs.size > 50) {
        this.emergencyMode = true;
      }
    }
    
    return isAttack;
  }

  private checkAttackPatterns(pattern: RequestPattern): boolean {
    // High request rate from many IPs (DDoS)
    if (pattern.requests > 100 && pattern.uniqueIPs.size > 20) {
      const authRatio = pattern.authenticatedRequests / pattern.requests;
      // Low authentication ratio indicates attack
      if (authRatio < 0.1) {
        return true;
      }
    }
    
    // Sudden spike detection
    if (pattern.requests > 200) {
      return true;
    }
    
    return false;
  }

  async detectBotnetPattern(req: NextRequest): Promise<boolean> {
    const headers = this.extractHeaders(req);
    const signature = this.generateHeaderSignature(headers);
    
    // Track similar header patterns
    const count = (this.botnetSignatures.get(signature) || 0) + 1;
    this.botnetSignatures.set(signature, count);
    
    // If same header pattern from many IPs, likely botnet
    if (count > 30) {
      return true;
    }
    
    return false;
  }

  private extractHeaders(req: NextRequest): Record<string, string> {
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (['accept', 'accept-language', 'cache-control', 'user-agent'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });
    return headers;
  }

  private generateHeaderSignature(headers: Record<string, string>): string {
    return createHash('md5').update(JSON.stringify(headers)).digest('hex');
  }

  private analyzePatterns(): void {
    const now = Date.now();
    const oldThreshold = now - 30000; // 30 seconds
    
    // Clean old patterns
    for (const [key, pattern] of this.requestPatterns.entries()) {
      if (pattern.timestamp < oldThreshold) {
        this.requestPatterns.delete(key);
      }
    }
    
    // Reset status if no recent attacks
    if (this.requestPatterns.size === 0) {
      this.attackStatus = 'IDLE';
      this.emergencyMode = false;
    }
  }

  private extractIP(req: NextRequest): string {
    return req.headers.get('x-real-ip') || 
           req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
           'unknown';
  }

  getAttackStatus(): string {
    return this.attackStatus;
  }

  getMitigationMode(): string {
    return this.emergencyMode ? 'ENABLED' : 'DISABLED';
  }

  isEmergencyMode(): boolean {
    return this.emergencyMode;
  }

  getBlockedIPs(): Set<string> {
    return this.blockedIPs;
  }

  getBotnetStatus(): string {
    const suspiciousCount = Array.from(this.botnetSignatures.values())
      .filter(count => count > 20).length;
    return suspiciousCount > 5 ? 'DETECTED' : 'CLEAR';
  }

  destroy(): void {
    clearInterval(this.monitoringInterval);
    this.requestPatterns.clear();
    this.botnetSignatures.clear();
  }
}

/**
 * IP Blacklist Manager with progressive penalties
 */
export class IPBlacklistManager {
  private blacklist: Map<string, BlacklistEntry> = new Map();
  private whitelist: Set<string> = new Set();
  private violations: Map<string, ViolationRecord> = new Map();

  isBlacklisted(ip: string): boolean {
    const entry = this.blacklist.get(ip);
    if (!entry) return false;
    
    // Check if temporary block has expired
    if (entry.type === 'TEMPORARY' && entry.expiresAt && entry.expiresAt < Date.now()) {
      this.blacklist.delete(ip);
      return false;
    }
    
    return true;
  }

  async checkAccess(req: NextRequest): Promise<AccessCheckResult> {
    const ip = this.extractIP(req);
    
    // Whitelist always allowed
    if (this.whitelist.has(ip)) {
      return { allowed: true };
    }
    
    // Check blacklist
    if (this.isBlacklisted(ip)) {
      return {
        allowed: false,
        reason: 'IP_BLACKLISTED',
        statusCode: 403
      };
    }
    
    return { allowed: true };
  }

  async recordViolation(ip: string, type: string): Promise<void> {
    const record = this.violations.get(ip) || {
      count: 0,
      firstViolation: Date.now(),
      lastViolation: Date.now(),
      types: []
    };
    
    record.count++;
    record.lastViolation = Date.now();
    record.types.push(type);
    
    this.violations.set(ip, record);
    
    // Apply progressive penalties
    this.applyPenalty(ip, record);
  }

  private applyPenalty(ip: string, record: ViolationRecord): void {
    const penaltyLevel = this.getPenaltyLevel(ip);
    
    switch (penaltyLevel) {
      case 'WARNING':
        // Just track, no action
        break;
      case 'TEMP_BLOCK':
        this.blacklist.set(ip, {
          type: 'TEMPORARY',
          reason: 'Multiple violations',
          addedAt: Date.now(),
          expiresAt: Date.now() + 300000 // 5 minutes
        });
        break;
      case 'EXTENDED_BLOCK':
        this.blacklist.set(ip, {
          type: 'TEMPORARY',
          reason: 'Repeated violations',
          addedAt: Date.now(),
          expiresAt: Date.now() + 3600000 // 1 hour
        });
        break;
      case 'PERMANENT':
        this.blacklist.set(ip, {
          type: 'PERMANENT',
          reason: 'Chronic violator',
          addedAt: Date.now()
        });
        break;
    }
  }

  getPenaltyLevel(ip: string): PenaltyLevel {
    const record = this.violations.get(ip);
    if (!record) return 'NONE';
    
    if (record.count >= 4) return 'PERMANENT';
    if (record.count === 3) return 'EXTENDED_BLOCK';
    if (record.count === 2) return 'TEMP_BLOCK';
    if (record.count === 1) return 'WARNING';
    
    return 'NONE';
  }

  getBlockDuration(ip: string): number {
    const entry = this.blacklist.get(ip);
    if (!entry || !entry.expiresAt) return 0;
    
    return entry.expiresAt - entry.addedAt;
  }

  addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
    // Remove from blacklist if present
    this.blacklist.delete(ip);
    this.violations.delete(ip);
  }

  clear(): void {
    this.blacklist.clear();
    this.violations.clear();
  }

  private extractIP(req: NextRequest): string {
    return req.headers.get('x-real-ip') || 
           req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
           'unknown';
  }
}

/**
 * Create advanced rate limiter middleware
 */
export function createAdvancedRateLimiter(options?: RateLimiterOptions): AdvancedRateLimiter {
  const system = new RateLimitingSystem(options?.redis);
  const ddos = new DDoSDetector();
  const blacklist = new IPBlacklistManager();

  return {
    middleware: async (req: NextRequest) => {
      // Check blacklist first
      const accessCheck = await blacklist.checkAccess(req);
      if (!accessCheck.allowed) {
        return NextResponse.json(
          { error: 'Access denied', reason: accessCheck.reason },
          { status: 403 }
        );
      }

      // Check for DDoS
      const isAttack = await ddos.detectAttack(req);
      if (isAttack) {
        const ip = req.headers.get('x-real-ip') || 'unknown';
        await blacklist.recordViolation(ip, 'DDOS_ATTACK');
        
        return NextResponse.json(
          { error: 'Service temporarily unavailable' },
          { status: 503 }
        );
      }

      // Determine API type from path
      const apiType = determineAPIType(req.nextUrl.pathname);
      
      // Check rate limit
      const result = await system.checkLimit(req, apiType);
      if (!result.allowed) {
        const headers = new Headers();
        headers.set('Retry-After', String(result.retryAfter || 60));
        headers.set('X-RateLimit-Limit', String(result.limit || 100));
        headers.set('X-RateLimit-Remaining', String(result.remaining || 0));
        
        return NextResponse.json(
          {
            error: result.message,
            retryAfter: result.retryAfter,
            limit: result.limit
          },
          { status: result.statusCode, headers }
        );
      }

      return null; // Allow request to proceed
    },
    
    system,
    ddos,
    blacklist
  };
}

// Helper function to determine API type from path
function determineAPIType(path: string): keyof typeof API_RATE_LIMITS {
  if (path.includes('/auth/') || path.includes('/login')) return 'auth';
  if (path.includes('/search')) return 'search';
  if (path.includes('/master-admin/')) return 'master-admin';
  if (path.includes('/bulk/')) return 'bulk';
  return 'general';
}

// Types
interface RateLimitEntry {
  count: number;
  violations: number;
  resetTime: number;
  firstRequest: number;
}

interface RateLimitResult {
  allowed: boolean;
  statusCode: number;
  message?: string;
  retryAfter?: number;
  limit?: number;
  remaining?: number;
  resetTime?: number;
  reason?: string;
}

interface RequestPattern {
  requests: number;
  uniqueIPs: Set<string>;
  authenticatedRequests: number;
  timestamp: number;
}

interface BlacklistEntry {
  type: 'TEMPORARY' | 'PERMANENT';
  reason: string;
  addedAt: number;
  expiresAt?: number;
}

interface ViolationRecord {
  count: number;
  firstViolation: number;
  lastViolation: number;
  types: string[];
}

interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  statusCode?: number;
}

type PenaltyLevel = 'NONE' | 'WARNING' | 'TEMP_BLOCK' | 'EXTENDED_BLOCK' | 'PERMANENT';

interface RateLimiterOptions {
  redis?: Redis;
}

interface AdvancedRateLimiter {
  middleware: (req: NextRequest) => Promise<NextResponse | null>;
  system: RateLimitingSystem;
  ddos: DDoSDetector;
  blacklist: IPBlacklistManager;
}