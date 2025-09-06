/**
 * 🛡️ SQL Injection Defense System
 * Comprehensive protection against SQL injection attacks
 * CVE-2025-004 Mitigation
 */

export interface SQLInjectionPattern {
  name: string;
  pattern: RegExp;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  blockedPatterns: SQLInjectionPattern[];
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  sanitizedInput: string;
}

export class SQLInjectionGuard {
  private static instance: SQLInjectionGuard;
  private maliciousPatterns: SQLInjectionPattern[];
  
  constructor() {
    this.initializePatterns();
  }

  static getInstance(): SQLInjectionGuard {
    if (!SQLInjectionGuard.instance) {
      SQLInjectionGuard.instance = new SQLInjectionGuard();
    }
    return SQLInjectionGuard.instance;
  }

  private initializePatterns(): void {
    this.maliciousPatterns = [
      {
        name: 'SQL Comments',
        pattern: /(--|\*\/|\*)/gi,
        severity: 'HIGH',
        description: 'SQL comment injection attempt'
      },
      {
        name: 'SQL Keywords',
        pattern: /(union\s+select|select\s+.*\s+from|drop\s+table|delete\s+from|insert\s+into|update\s+.*\s+set)/gi,
        severity: 'HIGH',
        description: 'Dangerous SQL keywords detected'
      },
      {
        name: 'Quote Injection',
        pattern: /('|(\\')|('')|("|(\\")|(\")|(`|(\\`))|(\`\`))/gi,
        severity: 'HIGH',
        description: 'Quote-based injection attempt'
      },
      {
        name: 'Semicolon Termination',
        pattern: /;\s*(exec|execute|drop|delete|truncate|alter|create|insert|update)/gi,
        severity: 'HIGH',
        description: 'Statement termination injection'
      },
      {
        name: 'System Commands',
        pattern: /(xp_cmdshell|sp_executesql|exec\s+master|exec\s+xp_)/gi,
        severity: 'HIGH',
        description: 'System command execution attempt'
      },
      {
        name: 'Information Schema',
        pattern: /(information_schema|sysobjects|syscolumns|systables)/gi,
        severity: 'MEDIUM',
        description: 'Database schema discovery attempt'
      },
      {
        name: 'Boolean Injection',
        pattern: /(\s+or\s+1=1|\s+and\s+1=1|\s+or\s+'1'='1'|\s+and\s+'1'='1')/gi,
        severity: 'HIGH',
        description: 'Boolean-based injection attempt'
      },
      {
        name: 'Time-based Injection',
        pattern: /(waitfor\s+delay|pg_sleep|benchmark|sleep\()/gi,
        severity: 'MEDIUM',
        description: 'Time-based blind injection attempt'
      }
    ];
  }

  /**
   * Main validation method
   */
  validateInput(input: string): ValidationResult {
    if (!input || typeof input !== 'string') {
      return {
        isValid: true,
        blockedPatterns: [],
        risk: 'NONE',
        sanitizedInput: input
      };
    }

    const blockedPatterns: SQLInjectionPattern[] = [];
    let highestRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE';

    // Check against all patterns
    for (const pattern of this.maliciousPatterns) {
      if (pattern.pattern.test(input)) {
        blockedPatterns.push(pattern);
        if (pattern.severity === 'HIGH' || 
           (pattern.severity === 'MEDIUM' && highestRisk !== 'HIGH') ||
           (pattern.severity === 'LOW' && highestRisk === 'NONE')) {
          highestRisk = pattern.severity;
        }
      }
    }

    return {
      isValid: blockedPatterns.length === 0,
      blockedPatterns,
      risk: highestRisk,
      sanitizedInput: this.sanitizeInput(input)
    };
  }

  /**
   * Sanitize input by removing dangerous patterns
   */
  private sanitizeInput(input: string): string {
    let sanitized = input;
    
    // Remove dangerous patterns
    sanitized = sanitized.replace(/(--|\*\/|\*)/gi, '');
    sanitized = sanitized.replace(/('|(\\')|('')|("|(\\")|(\")|(`|(\\`))|(\`\`))/gi, '');
    sanitized = sanitized.replace(/;\s*(exec|execute|drop|delete|truncate|alter|create|insert|update)/gi, '');
    
    return sanitized.trim();
  }

  /**
   * Check if input contains high-risk patterns
   */
  isHighRisk(input: string): boolean {
    const result = this.validateInput(input);
    return result.risk === 'HIGH';
  }

  /**
   * Get detection statistics
   */
  getStats(): { totalPatterns: number; highRiskPatterns: number } {
    const highRiskCount = this.maliciousPatterns.filter(p => p.severity === 'HIGH').length;
    return {
      totalPatterns: this.maliciousPatterns.length,
      highRiskPatterns: highRiskCount
    };
  }
}

// Export singleton instance
export const sqlInjectionGuard = SQLInjectionGuard.getInstance();

// Utility function for quick validation
export function validateSQLInput(input: string): boolean {
  return sqlInjectionGuard.validateInput(input).isValid;
}

export default sqlInjectionGuard;