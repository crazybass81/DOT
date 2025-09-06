/**
 * SQL Injection 방지 시스템
 * 다층 방어 체계를 통한 포괄적인 SQL Injection 공격 차단
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types and Interfaces
// ============================================================================

interface DetectionResult {
  isMalicious: boolean;
  confidence: number;
  attackType: string[];
  patterns: string[];
  sanitizedInput?: string;
}

interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  errors: string[];
  warnings: string[];
}

interface QueryValidationResult {
  query: string;
  params: any[];
  isSafe: boolean;
  warnings: string[];
}

interface SecurityLogEntry {
  id: string;
  timestamp: Date;
  userId: string | null;
  ipAddress: string;
  query: string;
  attackType: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  blocked: boolean;
  details: Record<string, any>;
}

interface AnomalyDetectionResult {
  isAnomalous: boolean;
  reasons: string[];
  riskScore: number;
}

interface SecurityReport {
  totalQueries: number;
  blockedAttempts: number;
  topAttackTypes: { type: string; count: number }[];
  suspiciousUsers: { userId: string; attempts: number }[];
  ipThreats: { ip: string; threatLevel: string; attempts: number }[];
}

// ============================================================================
// SQL Injection Detection Engine
// ============================================================================

export class SQLInjectionDetector {
  private readonly patterns: Map<string, RegExp[]>;
  private readonly weightMap: Map<string, number>;

  constructor() {
    this.patterns = this.initializePatterns();
    this.weightMap = this.initializeWeights();
  }

  private initializePatterns(): Map<string, RegExp[]> {
    const patterns = new Map<string, RegExp[]>();

    // DROP/DELETE/TRUNCATE patterns
    patterns.set('DROP_TABLE', [
      /drop\s+(table|database|schema|view|index)/gi,
      /;\s*drop\s+/gi,
      /--.*drop\s+/gi
    ]);

    patterns.set('DELETE_INJECTION', [
      /;\s*delete\s+from/gi,
      /delete\s+from\s+\w+\s+(where\s+)?1\s*=\s*1/gi,
      /--.*delete\s+from/gi
    ]);

    // UNION injection patterns
    patterns.set('UNION_INJECTION', [
      /union\s+(all\s+)?select/gi,
      /\bunion\b.*\bselect\b/gi,
      /union.*from.*information_schema/gi
    ]);

    // UPDATE injection patterns
    patterns.set('UPDATE_INJECTION', [
      /;\s*update\s+\w+\s+set/gi,
      /update\s+\w+\s+set.*where\s+1\s*=\s*1/gi,
      /--.*update\s+.*set/gi
    ]);

    // Blind SQL injection patterns
    patterns.set('BLIND_INJECTION', [
      /\band\b.*\b(1\s*=\s*1|1\s*=\s*2)/gi,
      /\bor\b.*\b(1\s*=\s*1|'1'\s*=\s*'1')/gi,
      /\b(and|or)\b.*\bsubstring\b/gi,
      /\b(and|or)\b.*\bascii\b/gi,
      /\b(and|or)\b.*\bchar\b/gi
    ]);

    // Time-based injection patterns
    patterns.set('TIME_BASED_INJECTION', [
      /sleep\s*\(\s*\d+\s*\)/gi,
      /pg_sleep\s*\(\s*\d+\s*\)/gi,
      /waitfor\s+delay/gi,
      /benchmark\s*\(/gi,
      /delay\s+['"]?\d{2}:\d{2}:\d{2}/gi
    ]);

    // Boolean-based injection patterns
    patterns.set('BOOLEAN_INJECTION', [
      /\b(and|or)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/gi,
      /\b(and|or)\b\s+\d+\s*=\s*\d+/gi,
      /\b(and|or)\b.*\bcase\s+when/gi
    ]);

    // Stacked queries patterns
    patterns.set('STACKED_QUERIES', [
      /;\s*(insert|update|delete|create|alter|drop|exec|execute)/gi,
      /;\s*declare\s+/gi,
      /;\s*exec\s*\(/gi,
      /xp_cmdshell/gi
    ]);

    // Encoded injection patterns
    patterns.set('ENCODED_INJECTION', [
      /0x[0-9a-f]+/gi,
      /char\s*\(\s*\d+\s*\)/gi,
      /concat\s*\(.*char\s*\(/gi,
      /\\x[0-9a-f]{2}/gi
    ]);

    // Comment injection patterns
    patterns.set('COMMENT_INJECTION', [
      /--[^-]*$/,
      /\/\*.*?\*\//g,
      /#.*$/,
      /\/\*!\d+/g
    ]);

    // Information schema access
    patterns.set('SCHEMA_ACCESS', [
      /information_schema/gi,
      /sys\.(tables|columns|views)/gi,
      /mysql\.(user|db)/gi,
      /pg_catalog/gi
    ]);

    // Advanced evasion techniques
    patterns.set('EVASION', [
      /un\/\*.*?\*\/ion/gi,
      /se\/\*.*?\*\/lect/gi,
      /\/\*.*?\*\/or\/\*.*?\*\//gi,
      /\bexec\b.*\bmaster\b/gi
    ]);

    return patterns;
  }

  private initializeWeights(): Map<string, number> {
    const weights = new Map<string, number>();
    
    // Critical patterns
    weights.set('DROP_TABLE', 1.0);
    weights.set('DELETE_INJECTION', 0.95);
    weights.set('UPDATE_INJECTION', 0.9);
    weights.set('TRUNCATE', 1.0);
    
    // High risk patterns
    weights.set('UNION_INJECTION', 0.85);
    weights.set('STACKED_QUERIES', 0.9);
    weights.set('SCHEMA_ACCESS', 0.8);
    
    // Medium risk patterns
    weights.set('BLIND_INJECTION', 0.7);
    weights.set('BOOLEAN_INJECTION', 0.65);
    weights.set('TIME_BASED_INJECTION', 0.75);
    
    // Lower risk patterns
    weights.set('COMMENT_INJECTION', 0.5);
    weights.set('ENCODED_INJECTION', 0.6);
    weights.set('EVASION', 0.7);

    return weights;
  }

  public detect(input: string): DetectionResult {
    if (!input || typeof input !== 'string') {
      return {
        isMalicious: false,
        confidence: 0,
        attackType: [],
        patterns: []
      };
    }

    const detectedPatterns: string[] = [];
    const attackTypes: string[] = [];
    let maxConfidence = 0;

    // Normalize input for better detection
    const normalizedInput = this.normalizeInput(input);

    // Check against all patterns
    for (const [type, regexList] of this.patterns) {
      for (const regex of regexList) {
        if (regex.test(normalizedInput) || regex.test(input)) {
          detectedPatterns.push(regex.source);
          if (!attackTypes.includes(type)) {
            attackTypes.push(type);
          }
          const weight = this.weightMap.get(type) || 0.5;
          maxConfidence = Math.max(maxConfidence, weight);
        }
      }
    }

    // Additional heuristic checks
    const heuristicScore = this.calculateHeuristicScore(input);
    maxConfidence = Math.min(1, maxConfidence + heuristicScore);

    return {
      isMalicious: maxConfidence > 0.3,
      confidence: maxConfidence,
      attackType: attackTypes,
      patterns: detectedPatterns
    };
  }

  private normalizeInput(input: string): string {
    // Remove multiple spaces
    let normalized = input.replace(/\s+/g, ' ');
    
    // Remove SQL comments for analysis
    normalized = normalized.replace(/--.*$/gm, '');
    normalized = normalized.replace(/\/\*.*?\*\//g, '');
    normalized = normalized.replace(/#.*$/gm, '');
    
    // Convert to lowercase for pattern matching
    normalized = normalized.toLowerCase();
    
    return normalized;
  }

  private calculateHeuristicScore(input: string): number {
    let score = 0;

    // Check for suspicious character combinations
    if (input.includes("'") && input.includes(';')) score += 0.2;
    if (input.includes("'") && (input.includes('=') || input.includes('OR'))) score += 0.15;
    if (input.match(/'\s*(and|or)\s+/i)) score += 0.2;
    if (input.match(/;\s*$/)) score += 0.1;
    
    // Check for multiple SQL keywords
    const sqlKeywords = ['select', 'insert', 'update', 'delete', 'drop', 'union', 'exec', 'declare'];
    const keywordCount = sqlKeywords.filter(kw => 
      new RegExp(`\\b${kw}\\b`, 'i').test(input)
    ).length;
    
    if (keywordCount > 2) score += 0.3;
    else if (keywordCount > 1) score += 0.15;

    // Check for common injection patterns
    if (input.match(/\d+\s*=\s*\d+/)) score += 0.1;
    if (input.match(/'[^']*'\s*=\s*'[^']*'/)) score += 0.1;

    return Math.min(score, 0.5); // Cap heuristic contribution
  }
}

// ============================================================================
// Input Validator
// ============================================================================

export class InputValidator {
  private readonly sqlDetector: SQLInjectionDetector;
  private readonly emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private readonly phoneRegex = /^[\d\s\-\+\(\)]+$/;

  constructor() {
    this.sqlDetector = new SQLInjectionDetector();
  }

  public validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for SQL injection first
    const detection = this.sqlDetector.detect(email);
    if (detection.isMalicious) {
      errors.push('SQL_INJECTION_DETECTED');
      return {
        isValid: false,
        sanitized: '',
        errors,
        warnings
      };
    }

    // Validate email format
    if (!this.emailRegex.test(email)) {
      errors.push('INVALID_EMAIL_FORMAT');
    }

    // Length check
    if (email.length > 255) {
      errors.push('EMAIL_TOO_LONG');
    }

    return {
      isValid: errors.length === 0,
      sanitized: email.toLowerCase().trim(),
      errors,
      warnings
    };
  }

  public validateUUID(uuid: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for SQL injection
    const detection = this.sqlDetector.detect(uuid);
    if (detection.isMalicious) {
      errors.push('SQL_INJECTION_DETECTED');
      return {
        isValid: false,
        sanitized: '',
        errors,
        warnings
      };
    }

    // Validate UUID format
    if (!this.uuidRegex.test(uuid)) {
      errors.push('INVALID_UUID_FORMAT');
    }

    return {
      isValid: errors.length === 0,
      sanitized: uuid.toLowerCase().trim(),
      errors,
      warnings
    };
  }

  public validateSearchQuery(query: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for SQL injection with lower threshold for search
    const detection = this.sqlDetector.detect(query);
    if (detection.confidence > 0.7) {
      errors.push('SQL_INJECTION_DETECTED');
      warnings.push(`Attack type: ${detection.attackType.join(', ')}`);
    } else if (detection.confidence > 0.4) {
      warnings.push('SUSPICIOUS_PATTERN_DETECTED');
    }

    // Length limitation
    const maxLength = 255;
    let sanitized = query.slice(0, maxLength);

    // Escape single quotes for PostgreSQL
    sanitized = sanitized.replace(/'/g, "''");

    // Remove potential SQL comments
    sanitized = sanitized.replace(/--.*$/g, '');
    sanitized = sanitized.replace(/\/\*.*?\*\//g, '');
    sanitized = sanitized.replace(/#.*$/g, '');

    return {
      isValid: errors.length === 0,
      sanitized: sanitized.trim(),
      errors,
      warnings
    };
  }

  public validateRole(role: string): ValidationResult {
    const validRoles = ['EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for SQL injection
    const detection = this.sqlDetector.detect(role);
    if (detection.isMalicious) {
      errors.push('SQL_INJECTION_DETECTED');
      return {
        isValid: false,
        sanitized: '',
        errors,
        warnings
      };
    }

    // Whitelist validation
    if (!validRoles.includes(role)) {
      errors.push('INVALID_ROLE');
    }

    return {
      isValid: errors.length === 0,
      sanitized: role,
      errors,
      warnings
    };
  }

  public validateDate(date: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for SQL injection
    const detection = this.sqlDetector.detect(date);
    if (detection.isMalicious) {
      errors.push('SQL_INJECTION_DETECTED');
      return {
        isValid: false,
        sanitized: '',
        errors,
        warnings
      };
    }

    // Validate ISO date format
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        errors.push('INVALID_DATE_FORMAT');
      }
    } catch {
      errors.push('INVALID_DATE_FORMAT');
    }

    return {
      isValid: errors.length === 0,
      sanitized: date,
      errors,
      warnings
    };
  }

  public validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for SQL injection
    const detection = this.sqlDetector.detect(phone);
    if (detection.isMalicious) {
      errors.push('SQL_INJECTION_DETECTED');
      return {
        isValid: false,
        sanitized: '',
        errors,
        warnings
      };
    }

    // Validate phone format
    if (!this.phoneRegex.test(phone)) {
      errors.push('INVALID_PHONE_FORMAT');
    }

    // Length check
    if (phone.length > 20) {
      errors.push('PHONE_TOO_LONG');
    }

    return {
      isValid: errors.length === 0,
      sanitized: phone.replace(/[^\d\+\-\(\)\s]/g, ''),
      errors,
      warnings
    };
  }

  public validatePagination(page: string | number, limit: string | number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const pageNum = typeof page === 'string' ? parseInt(page) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit) : limit;

    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('INVALID_PAGE_NUMBER');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('INVALID_LIMIT');
    }

    return {
      isValid: errors.length === 0,
      sanitized: `page=${pageNum}&limit=${limitNum}`,
      errors,
      warnings
    };
  }
}

// ============================================================================
// Query Sanitizer
// ============================================================================

export class QuerySanitizer {
  private readonly detector: SQLInjectionDetector;

  constructor() {
    this.detector = new SQLInjectionDetector();
  }

  public escapeString(input: string): string {
    if (!input) return '';
    
    // Escape single quotes for PostgreSQL
    return input.replace(/'/g, "''");
  }

  public removeComments(input: string): string {
    let cleaned = input;
    
    // Remove SQL line comments
    cleaned = cleaned.replace(/--[^-\n]*$/gm, '');
    
    // Remove C-style comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove MySQL-style comments
    cleaned = cleaned.replace(/#.*$/gm, '');
    
    return cleaned;
  }

  public parameterize(query: string, params: any[]): QueryValidationResult {
    const warnings: string[] = [];
    
    // Check if query uses parameters
    const paramCount = (query.match(/\?/g) || []).length;
    
    if (paramCount !== params.length) {
      warnings.push('PARAMETER_COUNT_MISMATCH');
    }

    // Validate each parameter
    for (const param of params) {
      const detection = this.detector.detect(String(param));
      if (detection.isMalicious) {
        warnings.push(`SQL_INJECTION_IN_PARAMETER: ${detection.attackType.join(', ')}`);
      }
    }

    return {
      query,
      params,
      isSafe: warnings.length === 0,
      warnings
    };
  }

  public validateQuery(query: string): QueryValidationResult {
    const warnings: string[] = [];
    
    // Check for non-parameterized user input
    if (query.includes("'") && !query.includes('?')) {
      warnings.push('NON_PARAMETERIZED_QUERY');
    }

    // Check for dangerous operations
    const dangerousPatterns = [
      /drop\s+table/i,
      /truncate\s+table/i,
      /delete\s+from.*where\s+1\s*=\s*1/i,
      /update.*set.*where\s+1\s*=\s*1/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        warnings.push('DANGEROUS_OPERATION_DETECTED');
        break;
      }
    }

    return {
      query,
      params: [],
      isSafe: warnings.length === 0,
      warnings
    };
  }

  public sanitizeIdentifier(identifier: string): string {
    // Remove everything except alphanumeric and underscore
    return identifier.replace(/[^a-zA-Z0-9_]/g, '');
  }

  public buildSafeQuery(table: string, conditions: Record<string, any>): QueryValidationResult {
    const sanitizedTable = this.sanitizeIdentifier(table);
    const params: any[] = [];
    const whereClauses: string[] = [];

    for (const [key, value] of Object.entries(conditions)) {
      const sanitizedKey = this.sanitizeIdentifier(key);
      whereClauses.push(`${sanitizedKey} = ?`);
      params.push(value);
    }

    const query = `SELECT * FROM ${sanitizedTable} WHERE ${whereClauses.join(' AND ')}`;

    return this.parameterize(query, params);
  }
}

// ============================================================================
// Whitelist Validator
// ============================================================================

interface WhitelistConfig {
  roles?: string[];
  statuses?: string[];
  sortFields?: string[];
  sortOrders?: string[];
  tables?: string[];
  operations?: string[];
  [key: string]: string[] | undefined;
}

export class WhitelistValidator {
  private readonly whitelist: WhitelistConfig;

  constructor(config: WhitelistConfig = {}) {
    this.whitelist = {
      roles: config.roles || ['EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'],
      statuses: config.statuses || ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      sortFields: config.sortFields || ['name', 'email', 'created_at', 'updated_at'],
      sortOrders: config.sortOrders || ['asc', 'desc'],
      tables: config.tables || ['users', 'organizations', 'user_organizations', 'audit_logs'],
      operations: config.operations || ['SELECT', 'INSERT', 'UPDATE'],
      ...config
    };
  }

  public validate(category: string, value: string): boolean {
    const allowedValues = this.whitelist[category];
    if (!allowedValues) return false;
    
    return allowedValues.includes(value);
  }

  public validateFilters(filters: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null) continue;

      switch (key) {
        case 'role':
          if (!this.validate('roles', value)) {
            errors.push('INVALID_ROLE');
          }
          break;
        case 'status':
          if (!this.validate('statuses', value)) {
            errors.push('INVALID_STATUS');
          }
          break;
        case 'sortBy':
          if (!this.validate('sortFields', value)) {
            errors.push('INVALID_SORT_FIELD');
          }
          break;
        case 'sortOrder':
          if (!this.validate('sortOrders', value)) {
            errors.push('INVALID_SORT_ORDER');
          }
          break;
        default:
          // Custom validation for other fields
          const detector = new SQLInjectionDetector();
          const detection = detector.detect(String(value));
          if (detection.isMalicious) {
            errors.push(`SQL_INJECTION_IN_${key.toUpperCase()}`);
          }
      }
    }

    return {
      isValid: errors.length === 0,
      sanitized: JSON.stringify(filters),
      errors,
      warnings
    };
  }

  public getWhitelist(category: string): string[] {
    return this.whitelist[category] || [];
  }

  public addToWhitelist(category: string, values: string[]): void {
    if (!this.whitelist[category]) {
      this.whitelist[category] = [];
    }
    this.whitelist[category]!.push(...values);
  }

  public removeFromWhitelist(category: string, value: string): void {
    if (this.whitelist[category]) {
      this.whitelist[category] = this.whitelist[category]!.filter(v => v !== value);
    }
  }
}

// ============================================================================
// Database Access Logger
// ============================================================================

export class DatabaseAccessLogger {
  private readonly logs: SecurityLogEntry[] = [];
  private readonly ipAttempts: Map<string, number> = new Map();
  private readonly userAttempts: Map<string, number> = new Map();
  private readonly queryPatterns: Map<string, string[]> = new Map();
  private readonly detector: SQLInjectionDetector;

  constructor() {
    this.detector = new SQLInjectionDetector();
  }

  public async logSuspiciousActivity(params: {
    query: string;
    userId: string | null;
    ipAddress: string;
    timestamp: Date;
  }): Promise<SecurityLogEntry> {
    const detection = this.detector.detect(params.query);
    
    const severity = this.calculateSeverity(detection);
    const blocked = severity === 'CRITICAL' || detection.confidence > 0.8;

    const logEntry: SecurityLogEntry = {
      id: crypto.randomUUID(),
      timestamp: params.timestamp,
      userId: params.userId,
      ipAddress: params.ipAddress,
      query: params.query,
      attackType: detection.attackType,
      severity,
      blocked,
      details: {
        confidence: detection.confidence,
        patterns: detection.patterns
      }
    };

    this.logs.push(logEntry);

    // Track attempts by IP
    const currentIpAttempts = this.ipAttempts.get(params.ipAddress) || 0;
    this.ipAttempts.set(params.ipAddress, currentIpAttempts + 1);

    // Track attempts by user
    if (params.userId) {
      const currentUserAttempts = this.userAttempts.get(params.userId) || 0;
      this.userAttempts.set(params.userId, currentUserAttempts + 1);
    }

    // Store in database if critical
    if (severity === 'CRITICAL') {
      await this.persistToDatabase(logEntry);
    }

    return logEntry;
  }

  private calculateSeverity(detection: DetectionResult): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (detection.confidence > 0.9) return 'CRITICAL';
    if (detection.confidence > 0.7) return 'HIGH';
    if (detection.confidence > 0.5) return 'MEDIUM';
    return 'LOW';
  }

  public async trackQuery(params: {
    userId: string;
    query: string;
    duration: number;
  }): Promise<void> {
    // Store query patterns for anomaly detection
    if (!this.queryPatterns.has(params.userId)) {
      this.queryPatterns.set(params.userId, []);
    }
    
    const patterns = this.queryPatterns.get(params.userId)!;
    patterns.push(this.extractQueryPattern(params.query));
    
    // Keep only last 100 patterns
    if (patterns.length > 100) {
      patterns.shift();
    }
  }

  private extractQueryPattern(query: string): string {
    // Extract table names and operation type
    const operation = query.match(/^(SELECT|INSERT|UPDATE|DELETE)/i)?.[1] || 'UNKNOWN';
    const tables = query.match(/FROM\s+(\w+)/gi)?.map(m => m.split(/\s+/)[1]) || [];
    
    return `${operation}:${tables.join(',')}`;
  }

  public async detectAnomaly(params: {
    userId: string;
    query: string;
    duration: number;
  }): Promise<AnomalyDetectionResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for unusual table access
    const pattern = this.extractQueryPattern(params.query);
    const userPatterns = this.queryPatterns.get(params.userId) || [];
    
    if (userPatterns.length > 10 && !userPatterns.includes(pattern)) {
      reasons.push('UNUSUAL_TABLE_ACCESS');
      riskScore += 0.3;
    }

    // Check for slow queries
    if (params.duration > 5000) {
      reasons.push('SLOW_QUERY');
      riskScore += 0.2;
    }

    // Check for suspicious patterns
    const detection = this.detector.detect(params.query);
    if (detection.confidence > 0.3) {
      reasons.push('SUSPICIOUS_PATTERN');
      riskScore += detection.confidence;
    }

    // Check for high frequency from user
    const userAttempts = this.userAttempts.get(params.userId) || 0;
    if (userAttempts > 100) {
      reasons.push('HIGH_QUERY_FREQUENCY');
      riskScore += 0.2;
    }

    return {
      isAnomalous: riskScore > 0.5,
      reasons,
      riskScore: Math.min(riskScore, 1)
    };
  }

  public async assessThreatLevel(ipAddress: string): Promise<'LOW' | 'MEDIUM' | 'HIGH'> {
    const attempts = this.ipAttempts.get(ipAddress) || 0;
    
    if (attempts > 10) return 'HIGH';
    if (attempts > 5) return 'MEDIUM';
    return 'LOW';
  }

  public async shouldBlockIp(ipAddress: string): Promise<boolean> {
    const attempts = this.ipAttempts.get(ipAddress) || 0;
    const threatLevel = await this.assessThreatLevel(ipAddress);
    
    // Block if high threat or too many attempts
    return threatLevel === 'HIGH' || attempts > 15;
  }

  public async generateSecurityReport(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<SecurityReport> {
    const relevantLogs = this.logs.filter(log => 
      log.timestamp >= params.startDate && log.timestamp <= params.endDate
    );

    // Count attack types
    const attackTypeCounts = new Map<string, number>();
    for (const log of relevantLogs) {
      for (const type of log.attackType) {
        attackTypeCounts.set(type, (attackTypeCounts.get(type) || 0) + 1);
      }
    }

    // Get top attack types
    const topAttackTypes = Array.from(attackTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get suspicious users
    const suspiciousUsers = Array.from(this.userAttempts.entries())
      .filter(([_, attempts]) => attempts > 5)
      .map(([userId, attempts]) => ({ userId, attempts }))
      .sort((a, b) => b.attempts - a.attempts);

    // Get IP threats
    const ipThreats = await Promise.all(
      Array.from(this.ipAttempts.entries()).map(async ([ip, attempts]) => ({
        ip,
        threatLevel: await this.assessThreatLevel(ip),
        attempts
      }))
    );

    return {
      totalQueries: relevantLogs.length,
      blockedAttempts: relevantLogs.filter(log => log.blocked).length,
      topAttackTypes,
      suspiciousUsers,
      ipThreats: ipThreats.filter(threat => threat.threatLevel !== 'LOW')
    };
  }

  private async persistToDatabase(logEntry: SecurityLogEntry): Promise<void> {
    try {
      const supabase = createClient();
      
      await supabase.from('security_logs').insert({
        id: logEntry.id,
        timestamp: logEntry.timestamp.toISOString(),
        user_id: logEntry.userId,
        ip_address: logEntry.ipAddress,
        query: logEntry.query.slice(0, 1000), // Limit query length
        attack_type: logEntry.attackType,
        severity: logEntry.severity,
        blocked: logEntry.blocked,
        details: logEntry.details
      });
    } catch (error) {
      console.error('Failed to persist security log:', error);
    }
  }

  public clearOldLogs(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    this.logs.splice(0, this.logs.findIndex(log => log.timestamp >= cutoffDate));
  }
}

// ============================================================================
// Middleware Integration Helper
// ============================================================================

export class SQLInjectionMiddleware {
  private readonly validator: InputValidator;
  private readonly sanitizer: QuerySanitizer;
  private readonly detector: SQLInjectionDetector;
  private readonly logger: DatabaseAccessLogger;
  private readonly whitelist: WhitelistValidator;

  constructor() {
    this.validator = new InputValidator();
    this.sanitizer = new QuerySanitizer();
    this.detector = new SQLInjectionDetector();
    this.logger = new DatabaseAccessLogger();
    this.whitelist = new WhitelistValidator();
  }

  public async validateRequest(params: {
    searchParams: URLSearchParams;
    userId: string | null;
    ipAddress: string;
  }): Promise<{ isValid: boolean; errors: string[]; sanitizedParams: Record<string, string> }> {
    const errors: string[] = [];
    const sanitizedParams: Record<string, string> = {};

    // Validate each parameter
    for (const [key, value] of params.searchParams.entries()) {
      let validationResult: ValidationResult;

      switch (key) {
        case 'email':
          validationResult = this.validator.validateEmail(value);
          break;
        case 'id':
        case 'userId':
        case 'organizationId':
          validationResult = this.validator.validateUUID(value);
          break;
        case 'role':
          validationResult = this.validator.validateRole(value);
          break;
        case 'status':
          validationResult = this.whitelist.validate('statuses', value) 
            ? { isValid: true, sanitized: value, errors: [], warnings: [] }
            : { isValid: false, sanitized: '', errors: ['INVALID_STATUS'], warnings: [] };
          break;
        case 'search':
          validationResult = this.validator.validateSearchQuery(value);
          break;
        case 'startDate':
        case 'endDate':
          validationResult = this.validator.validateDate(value);
          break;
        case 'phone':
          validationResult = this.validator.validatePhone(value);
          break;
        case 'page':
        case 'limit':
          validationResult = this.validator.validatePagination(
            key === 'page' ? value : params.searchParams.get('page') || '1',
            key === 'limit' ? value : params.searchParams.get('limit') || '20'
          );
          break;
        default:
          // Generic validation for unknown parameters
          const detection = this.detector.detect(value);
          if (detection.isMalicious) {
            validationResult = {
              isValid: false,
              sanitized: '',
              errors: ['SQL_INJECTION_DETECTED'],
              warnings: []
            };
          } else {
            validationResult = {
              isValid: true,
              sanitized: this.sanitizer.escapeString(value),
              errors: [],
              warnings: []
            };
          }
      }

      if (!validationResult.isValid) {
        errors.push(...validationResult.errors.map(e => `${key}: ${e}`));
        
        // Log suspicious activity
        await this.logger.logSuspiciousActivity({
          query: `${key}=${value}`,
          userId: params.userId,
          ipAddress: params.ipAddress,
          timestamp: new Date()
        });
      } else {
        sanitizedParams[key] = validationResult.sanitized;
      }
    }

    // Check if IP should be blocked
    if (await this.logger.shouldBlockIp(params.ipAddress)) {
      errors.push('IP_BLOCKED_DUE_TO_SUSPICIOUS_ACTIVITY');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedParams
    };
  }

  public getSanitizer(): QuerySanitizer {
    return this.sanitizer;
  }

  public getValidator(): InputValidator {
    return this.validator;
  }

  public getLogger(): DatabaseAccessLogger {
    return this.logger;
  }
}

// ============================================================================
// Export default instance for easy use
// ============================================================================

export const sqlInjectionMiddleware = new SQLInjectionMiddleware();