/**
 * Security Audit Logger
 * Tamper-proof audit logging for security events
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

interface SecurityEvent {
  type: string;
  userId?: string | null;
  endpoint?: string;
  timestamp: Date;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details?: any;
  blocked?: boolean;
  success?: boolean;
  executionTime?: number;
  ipAddress?: string;
  userAgent?: string;
  fromRole?: string;
  toRole?: string;
  action?: string;
  pattern?: string;
}

interface AuditLog extends SecurityEvent {
  id: string;
  hash: string;
  previousHash?: string;
}

interface LogQuery {
  startTime: Date;
  endTime: Date;
  userId?: string;
  severity?: string;
  type?: string;
}

export class SecurityAuditLogger {
  private logs: AuditLog[];
  private criticalEvents: AuditLog[];
  private readonly LOG_FILE = 'security-audit.log';
  private readonly CRITICAL_LOG_FILE = 'critical-security.log';
  private logCounter: number;
  private previousHash: string;

  constructor() {
    this.logs = [];
    this.criticalEvents = [];
    this.logCounter = 0;
    this.previousHash = 'genesis';

    // In production, this would write to a secure, append-only storage
    this.initializeLogFiles();
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent | any): Promise<void> {
    const logEntry = this.createLogEntry(event);
    
    this.logs.push(logEntry);

    // Store critical events separately
    if (event.severity === 'CRITICAL' || 
        event.type?.includes('ESCALATION') ||
        event.type?.includes('MANIPULATION')) {
      this.criticalEvents.push(logEntry);
      await this.writeCriticalLog(logEntry);
    }

    // Write to persistent storage
    await this.writeLog(logEntry);

    // Update previous hash for chain integrity
    this.previousHash = logEntry.hash;
  }

  /**
   * Log critical security event
   */
  async logCriticalEvent(event: any): Promise<void> {
    await this.logSecurityEvent({
      ...event,
      severity: 'CRITICAL'
    });
  }

  /**
   * Query security logs
   */
  async getSecurityLogs(query: LogQuery): Promise<AuditLog[]> {
    return this.logs.filter(log => {
      const logTime = log.timestamp.getTime();
      const startTime = query.startTime.getTime();
      const endTime = query.endTime.getTime();

      if (logTime < startTime || logTime > endTime) {
        return false;
      }

      if (query.userId && log.userId !== query.userId) {
        return false;
      }

      if (query.severity && log.severity !== query.severity) {
        return false;
      }

      if (query.type && !log.type.includes(query.type)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get critical events
   */
  getCriticalEvents(): AuditLog[] {
    return [...this.criticalEvents];
  }

  /**
   * Get last event
   */
  getLastEvent(): AuditLog | undefined {
    return this.logs[this.logs.length - 1];
  }

  /**
   * Check if event has been logged
   */
  hasLoggedEvent(eventType: string): boolean {
    return this.logs.some(log => log.type === eventType);
  }

  /**
   * Create tamper-proof log entry
   */
  private createLogEntry(event: SecurityEvent): AuditLog {
    const id = this.generateLogId();
    
    const logData = {
      id,
      ...event,
      timestamp: event.timestamp || new Date(),
      previousHash: this.previousHash
    };

    // Create tamper-proof hash
    const hash = this.createHash(logData);

    return {
      ...logData,
      hash
    };
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    if (process.env.NODE_ENV === 'test') {
      return `log-${++this.logCounter}`;
    }
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Create cryptographic hash of log entry
   */
  private createHash(data: any): string {
    const content = JSON.stringify({
      ...data,
      hash: undefined // Exclude hash field from hash calculation
    });

    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Verify log integrity
   */
  async verifyLogIntegrity(): Promise<boolean> {
    if (this.logs.length === 0) {
      return true;
    }

    let previousHash = 'genesis';

    for (const log of this.logs) {
      // Verify previous hash matches
      if (log.previousHash !== previousHash) {
        console.error(`Log integrity violation: Previous hash mismatch at ${log.id}`);
        return false;
      }

      // Verify current hash
      const recalculatedHash = this.createHash({
        ...log,
        hash: undefined
      });

      if (log.hash !== recalculatedHash) {
        console.error(`Log integrity violation: Hash mismatch at ${log.id}`);
        return false;
      }

      previousHash = log.hash;
    }

    return true;
  }

  /**
   * Initialize log files (in production, use secure storage)
   */
  private async initializeLogFiles(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return; // Skip file operations in test environment
    }

    try {
      const logDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize log directory:', error);
    }
  }

  /**
   * Write log to persistent storage
   */
  private async writeLog(log: AuditLog): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return; // Skip file operations in test environment
    }

    try {
      const logPath = path.join(process.cwd(), 'logs', this.LOG_FILE);
      const logLine = JSON.stringify(log) + '\n';
      await fs.appendFile(logPath, logLine);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * Write critical log to separate file
   */
  private async writeCriticalLog(log: AuditLog): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return; // Skip file operations in test environment
    }

    try {
      const logPath = path.join(process.cwd(), 'logs', this.CRITICAL_LOG_FILE);
      const logLine = JSON.stringify(log) + '\n';
      await fs.appendFile(logPath, logLine);

      // In production, also send to monitoring service
      console.error(`🚨 CRITICAL SECURITY EVENT: ${log.type} - User: ${log.userId}`);
    } catch (error) {
      console.error('Failed to write critical log:', error);
    }
  }

  /**
   * Get security metrics
   */
  getMetrics(): {
    totalEvents: number;
    criticalEvents: number;
    blockedAttempts: number;
    uniqueUsers: number;
    eventsByType: { [key: string]: number };
    eventsBySeverity: { [key: string]: number };
  } {
    const uniqueUsers = new Set(this.logs.map(l => l.userId).filter(Boolean));
    const blockedAttempts = this.logs.filter(l => l.blocked === true).length;
    
    const eventsByType: { [key: string]: number } = {};
    const eventsBySeverity: { [key: string]: number } = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };

    for (const log of this.logs) {
      // Count by type
      eventsByType[log.type] = (eventsByType[log.type] || 0) + 1;
      
      // Count by severity
      if (log.severity) {
        eventsBySeverity[log.severity]++;
      }
    }

    return {
      totalEvents: this.logs.length,
      criticalEvents: this.criticalEvents.length,
      blockedAttempts,
      uniqueUsers: uniqueUsers.size,
      eventsByType,
      eventsBySeverity
    };
  }

  /**
   * Export logs for analysis
   */
  async exportLogs(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    // CSV format
    const headers = ['id', 'type', 'userId', 'endpoint', 'timestamp', 'severity', 'blocked', 'hash'];
    const rows = [headers.join(',')];

    for (const log of this.logs) {
      const row = [
        log.id,
        log.type,
        log.userId || '',
        log.endpoint || '',
        log.timestamp.toISOString(),
        log.severity || '',
        log.blocked?.toString() || '',
        log.hash
      ];
      rows.push(row.map(v => `"${v}"`).join(','));
    }

    return rows.join('\n');
  }

  /**
   * Clear logs (for testing only)
   */
  clearLogs(): void {
    if (process.env.NODE_ENV === 'test') {
      this.logs = [];
      this.criticalEvents = [];
      this.logCounter = 0;
      this.previousHash = 'genesis';
    }
  }
}

// Export singleton instance
export const securityAuditLogger = new SecurityAuditLogger();