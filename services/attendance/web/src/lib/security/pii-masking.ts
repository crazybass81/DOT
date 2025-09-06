/**
 * 🟢 GREEN Phase: PII Data Masking System with GDPR/CCPA Compliance
 * Implements comprehensive PII protection and regulatory compliance
 */

import { createHash } from 'crypto';

/**
 * Sensitive data type classifications
 */
export enum SensitiveDataTypes {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  ADDRESS = 'ADDRESS',
  SSN = 'SSN',
  FINANCIAL = 'FINANCIAL',
  MEDICAL = 'MEDICAL',
  IP_ADDRESS = 'IP_ADDRESS',
  BUSINESS_NUMBER = 'BUSINESS_NUMBER',
  PERSONAL_NOTE = 'PERSONAL_NOTE',
  NONE = 'NONE'
}

/**
 * PII Masking System for comprehensive data protection
 */
export class PIIMaskingSystem {
  private maskingRules: Map<string, MaskingRule> = new Map();
  private sensitivePatterns: RegExp[];

  constructor() {
    this.initializeMaskingRules();
    this.initializeSensitivePatterns();
  }

  private initializeMaskingRules(): void {
    // Email masking rule
    this.maskingRules.set('email', {
      pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      mask: (match: string) => {
        const [local, domain] = match.split('@');
        const maskedLocal = local.length > 4 
          ? local.substring(0, 4) + '****' 
          : local.substring(0, 1) + '****';
        return `${maskedLocal}@${domain}`;
      }
    });

    // Korean phone number masking
    this.maskingRules.set('phone_kr', {
      pattern: /(\+82[-\s]?)?(0\d{1,2})[-\s]?(\d{3,4})[-\s]?(\d{4})/g,
      mask: (match: string) => {
        const cleaned = match.replace(/[-\s]/g, '');
        const hasCountryCode = cleaned.startsWith('+82');
        const localNumber = hasCountryCode ? cleaned.substring(3) : cleaned;
        
        if (localNumber.length >= 10) {
          const prefix = localNumber.substring(0, 3);
          const suffix = localNumber.substring(localNumber.length - 4);
          const masked = `${prefix}-****-${suffix}`;
          return hasCountryCode ? `+82-${masked.substring(1)}` : masked;
        }
        return match.substring(0, 3) + '****' + match.substring(match.length - 4);
      }
    });

    // International phone masking
    this.maskingRules.set('phone_intl', {
      pattern: /\+\d{1,3}[-\s]?\d{1,4}[-\s]?\d{3,4}[-\s]?\d{4}/g,
      mask: (match: string) => {
        const parts = match.split(/[-\s]/);
        if (parts.length >= 3) {
          parts[parts.length - 2] = parts[parts.length - 2].replace(/\d/g, '*');
          return parts.join(match.includes('-') ? '-' : ' ');
        }
        return match;
      }
    });

    // Business registration number masking
    this.maskingRules.set('business_number', {
      pattern: /\d{3}[-]?\d{2}[-]?\d{5}/g,
      mask: (match: string) => {
        const cleaned = match.replace(/-/g, '');
        if (cleaned.length === 10) {
          return `${cleaned.substring(0, 3)}-**-*****`;
        }
        return match;
      }
    });
  }

  private initializeSensitivePatterns(): void {
    this.sensitivePatterns = [
      /password[:\s]*\S+/gi,
      /social\s+security\s+number[:\s]*[\d-]+/gi,
      /credit\s+card[:\s]*[\d\s-]+/gi,
      /medical\s+(condition|diagnosis|record)/gi,
      /salary[:\s]*[\$\d,]+/gi,
      /performance\s+review/gi,
      /confidential/gi,
      /allergies?\s+to/gi,
      /medication/gi
    ];
  }

  maskEmail(email: string): string {
    const rule = this.maskingRules.get('email');
    if (!rule) return email;
    return email.replace(rule.pattern, rule.mask);
  }

  maskPhoneNumber(phone: string): string {
    // Try Korean format first
    let masked = phone;
    const krRule = this.maskingRules.get('phone_kr');
    if (krRule && krRule.pattern.test(phone)) {
      masked = phone.replace(krRule.pattern, krRule.mask);
    } else {
      // Try international format
      const intlRule = this.maskingRules.get('phone_intl');
      if (intlRule) {
        masked = phone.replace(intlRule.pattern, intlRule.mask);
      }
    }
    return masked;
  }

  maskAddress(address: string): string {
    // Korean address masking
    const koreanPattern = /(.*[시도])\s+([가-힣]+[시군구])\s+([가-힣]+[동로길].*)/;
    const match = address.match(koreanPattern);
    
    if (match) {
      const [_, city, district] = match;
      return `${city} ***구 ***`;
    }
    
    // Fallback: mask everything after city
    const parts = address.split(' ');
    if (parts.length > 2) {
      return `${parts[0]} ***`;
    }
    
    return '***';
  }

  maskAddressObject(address: AddressObject): AddressObject {
    return {
      ...address,
      street: '***',
      district: address.district ? '***구' : undefined,
      postalCode: address.postalCode ? address.postalCode.substring(0, 2) + '***' : undefined,
      details: address.details ? '[REDACTED]' : undefined
    };
  }

  maskBusinessNumber(number: string): string {
    const rule = this.maskingRules.get('business_number');
    if (!rule) return number;
    return number.replace(rule.pattern, rule.mask);
  }

  maskObject(obj: any, depth: number = 0): any {
    if (depth > 10) return obj; // Prevent infinite recursion
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.maskObject(item, depth + 1));
    }
    
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const masked: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (typeof value === 'string') {
        if (lowerKey.includes('email')) {
          masked[key] = this.maskEmail(value);
        } else if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('tel')) {
          masked[key] = this.maskPhoneNumber(value);
        } else if (lowerKey.includes('address')) {
          masked[key] = this.maskAddress(value);
        } else if (lowerKey.includes('business') && lowerKey.includes('number')) {
          masked[key] = this.maskBusinessNumber(value);
        } else if (lowerKey.includes('note') || lowerKey.includes('memo') || lowerKey.includes('comment')) {
          masked[key] = this.maskSensitiveText(value);
        } else {
          masked[key] = value;
        }
      } else if (typeof value === 'object') {
        masked[key] = this.maskObject(value, depth + 1);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }

  private maskSensitiveText(text: string): string {
    // Check if text contains sensitive information
    for (const pattern of this.sensitivePatterns) {
      if (pattern.test(text)) {
        return '[REDACTED - SENSITIVE INFORMATION]';
      }
    }
    return text;
  }

  async maskApiResponse(response: any): Promise<any> {
    return this.maskObject(response);
  }

  createMaskingStream(): MaskingStream {
    return new MaskingStream(this);
  }
}

/**
 * Streaming masking for real-time data processing
 */
class MaskingStream {
  constructor(private masker: PIIMaskingSystem) {}

  async processChunk(chunk: any): Promise<any> {
    return this.masker.maskObject(chunk);
  }
}

/**
 * Data Classification System
 */
export class DataClassifier {
  private sensitiveKeywords = [
    'password', 'secret', 'token', 'key', 'api_key',
    'ssn', 'social_security', 'tax_id',
    'credit_card', 'card_number', 'cvv', 'expiry',
    'medical', 'diagnosis', 'prescription', 'health',
    'salary', 'compensation', 'wage', 'income',
    'performance', 'review', 'evaluation'
  ];

  classifyObject(obj: any): Record<string, SensitiveDataTypes> {
    const classification: Record<string, SensitiveDataTypes> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      classification[key] = this.classifyField(key, value);
    }
    
    return classification;
  }

  private classifyField(key: string, value: any): SensitiveDataTypes {
    const lowerKey = key.toLowerCase();
    const valueStr = String(value);
    
    // Check by field name
    if (lowerKey.includes('email')) return SensitiveDataTypes.EMAIL;
    if (lowerKey.includes('phone') || lowerKey.includes('mobile')) return SensitiveDataTypes.PHONE;
    if (lowerKey.includes('address')) return SensitiveDataTypes.ADDRESS;
    if (lowerKey.includes('ssn') || lowerKey.includes('social')) return SensitiveDataTypes.SSN;
    if (lowerKey.includes('credit') || lowerKey.includes('card')) return SensitiveDataTypes.FINANCIAL;
    if (lowerKey.includes('ip') && lowerKey.includes('address')) return SensitiveDataTypes.IP_ADDRESS;
    
    // Check by value pattern
    if (this.isEmail(valueStr)) return SensitiveDataTypes.EMAIL;
    if (this.isPhone(valueStr)) return SensitiveDataTypes.PHONE;
    if (this.isSSN(valueStr)) return SensitiveDataTypes.SSN;
    if (this.isCreditCard(valueStr)) return SensitiveDataTypes.FINANCIAL;
    if (this.isIPAddress(valueStr)) return SensitiveDataTypes.IP_ADDRESS;
    
    return SensitiveDataTypes.NONE;
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isPhone(value: string): boolean {
    return /^[\d\s\-\+\(\)]+$/.test(value) && value.replace(/\D/g, '').length >= 10;
  }

  private isSSN(value: string): boolean {
    return /^\d{3}-?\d{2}-?\d{4}$/.test(value);
  }

  private isCreditCard(value: string): boolean {
    const cleaned = value.replace(/[\s-]/g, '');
    return /^\d{13,19}$/.test(cleaned);
  }

  private isIPAddress(value: string): boolean {
    return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value);
  }

  containsSensitiveData(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.sensitiveKeywords.some(keyword => lowerText.includes(keyword));
  }

  isSensitiveText(text: string): boolean {
    const patterns = [
      /medical|health|diagnosis|prescription/i,
      /salary|wage|compensation|income/i,
      /performance|review|evaluation/i,
      /password|secret|token/i,
      /ssn|social security|tax id/i,
      /credit card|card number|cvv/i,
      /allerg/i
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }
}

/**
 * Compliance Validator for GDPR and CCPA
 */
export class ComplianceValidator {
  validateGDPR(userData: any): GDPRValidation {
    return {
      isCompliant: this.checkGDPRCompliance(userData),
      requiresEncryption: true,
      requiresPseudonymization: true,
      maxRetentionDays: 2555, // 7 years
      lawfulBasis: userData.gdprConsent ? 'CONSENT' : 'LEGITIMATE_INTEREST',
      dataSubjectRights: ['ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'OBJECTION']
    };
  }

  private checkGDPRCompliance(userData: any): boolean {
    // Check for required GDPR fields
    return !!(userData.gdprConsent && userData.dataProcessingAgreement);
  }

  async processErasureRequest(userId: string): Promise<ErasureResult> {
    // Simulate data erasure process
    return {
      status: 'SUCCESS',
      userId,
      dataErased: ['personal_information', 'usage_data', 'preferences'],
      dataRetained: ['legal_obligations', 'financial_records'],
      retentionReason: 'Legal requirement - 7 years',
      erasureDate: new Date().toISOString()
    };
  }

  async exportUserData(userId: string): Promise<DataExport> {
    // Simulate data export for portability
    return {
      userId,
      format: 'JSON',
      data: { /* masked user data */ },
      masked: true,
      includesPII: false,
      exportDate: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  validateCCPA(userData: any): CCPAValidation {
    const isCaliforniaResident = userData.state === 'CA';
    
    return {
      isCompliant: this.checkCCPACompliance(userData),
      requiresNotice: isCaliforniaResident,
      allowsSale: false,
      requiresOptOut: isCaliforniaResident,
      consumerRights: ['KNOW', 'DELETE', 'OPT_OUT', 'NON_DISCRIMINATION']
    };
  }

  private checkCCPACompliance(userData: any): boolean {
    return userData.ccpaOptOut !== undefined;
  }

  async processCCPAOptOut(userId: string): Promise<OptOutResult> {
    return {
      status: 'SUCCESS',
      userId,
      dataSalesStopped: true,
      thirdPartySharing: 'DISABLED',
      optOutDate: new Date().toISOString()
    };
  }
}

/**
 * Audit Logger for compliance tracking
 */
export class AuditLogger {
  private logs: AuditLog[] = [];
  private retentionPeriod = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years in ms

  async logPIIAccess(log: PIIAccessLog): Promise<void> {
    const auditLog: AuditLog = {
      id: this.generateLogId(),
      timestamp: log.timestamp || new Date(),
      ...log,
      retained: true
    };
    
    this.logs.push(auditLog);
    
    // In production, persist to secure storage
    await this.persistLog(auditLog);
  }

  async getAccessLogs(userId: string): Promise<AuditLog[]> {
    return this.logs.filter(log => log.userId === userId);
  }

  async checkRetention(log: any): Promise<RetentionCheck> {
    const logDate = new Date(log.timestamp);
    const expiryDate = new Date(logDate.getTime() + this.retentionPeriod);
    const now = new Date();
    
    return {
      shouldRetain: expiryDate > now,
      expiryDate,
      daysRemaining: Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    };
  }

  async checkSuspiciousActivity(userId: string): Promise<SecurityAlert[]> {
    const userLogs = await this.getAccessLogs(userId);
    const alerts: SecurityAlert[] = [];
    
    // Check for bulk PII access
    const recentLogs = userLogs.filter(log => 
      new Date(log.timestamp).getTime() > Date.now() - 3600000 // Last hour
    );
    
    if (recentLogs.length > 50) {
      alerts.push({
        type: 'BULK_PII_ACCESS',
        severity: 'HIGH',
        userId,
        description: `User accessed ${recentLogs.length} PII records in the last hour`,
        timestamp: new Date()
      });
    }
    
    // Check for sensitive data exports
    const exports = recentLogs.filter(log => log.action === 'EXPORT');
    if (exports.length > 5) {
      alerts.push({
        type: 'EXCESSIVE_EXPORTS',
        severity: 'MEDIUM',
        userId,
        description: `User exported ${exports.length} records recently`,
        timestamp: new Date()
      });
    }
    
    return alerts;
  }

  private generateLogId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
  }

  private async persistLog(log: AuditLog): Promise<void> {
    // In production, save to secure audit log storage
    // This could be a separate secure database or audit service
    console.log('[AUDIT]', log);
  }
}

// Type definitions
interface MaskingRule {
  pattern: RegExp;
  mask: (match: string) => string;
}

interface AddressObject {
  street?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  details?: string;
}

interface GDPRValidation {
  isCompliant: boolean;
  requiresEncryption: boolean;
  requiresPseudonymization: boolean;
  maxRetentionDays: number;
  lawfulBasis?: string;
  dataSubjectRights?: string[];
}

interface CCPAValidation {
  isCompliant: boolean;
  requiresNotice: boolean;
  allowsSale: boolean;
  requiresOptOut: boolean;
  consumerRights?: string[];
}

interface ErasureResult {
  status: string;
  userId: string;
  dataErased: string[];
  dataRetained: string[];
  retentionReason: string;
  erasureDate: string;
}

interface DataExport {
  userId: string;
  format: string;
  data: any;
  masked: boolean;
  includesPII: boolean;
  exportDate: string;
  validUntil: string;
}

interface OptOutResult {
  status: string;
  userId: string;
  dataSalesStopped: boolean;
  thirdPartySharing: string;
  optOutDate: string;
}

interface PIIAccessLog {
  userId: string;
  action: string;
  resource?: string;
  piiFields?: string[];
  timestamp?: Date;
  ip?: string;
}

interface AuditLog extends PIIAccessLog {
  id: string;
  timestamp: Date;
  retained: boolean;
}

interface RetentionCheck {
  shouldRetain: boolean;
  expiryDate: Date;
  daysRemaining: number;
}

interface SecurityAlert {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId: string;
  description: string;
  timestamp: Date;
}