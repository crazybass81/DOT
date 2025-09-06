/**
 * Privilege Escalation Detector
 * Detects and prevents privilege escalation attempts in real-time
 */

interface EscalationAttempt {
  sessionId?: string;
  currentRole: string;
  requestedRole: string;
  userId: string;
  endpoint?: string;
  timestamp?: Date;
}

interface DetectionResult {
  detected: boolean;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action?: string;
  details?: any;
}

interface SuspiciousPattern {
  userId?: string;
  attempts?: number;
  timeWindow?: number;
  sessions?: string[];
  escalationType?: string;
  tokenReplay?: boolean;
  originalToken?: string;
}

export class PrivilegeEscalationDetector {
  private attemptHistory: Map<string, EscalationAttempt[]>;
  private blacklistedUsers: Set<string>;
  private suspiciousPatterns: Map<string, SuspiciousPattern[]>;
  private readonly MAX_ATTEMPTS = 3;
  private readonly TIME_WINDOW = 60000; // 1 minute
  private readonly LOCKDOWN_DURATION = 3600000; // 1 hour

  constructor() {
    this.attemptHistory = new Map();
    this.blacklistedUsers = new Set();
    this.suspiciousPatterns = new Map();

    // Clean up old data periodically
    setInterval(() => this.cleanupOldData(), 300000); // 5 minutes
  }

  /**
   * Detect privilege escalation attempts
   */
  async detectEscalation(attempt: EscalationAttempt): Promise<DetectionResult> {
    const { userId, currentRole, requestedRole, sessionId, endpoint } = attempt;
    
    // Check if user is blacklisted
    if (this.blacklistedUsers.has(userId)) {
      return {
        detected: true,
        severity: 'CRITICAL',
        action: 'BLOCK_AND_ALERT',
        details: { reason: 'USER_BLACKLISTED' }
      };
    }

    // Check for role escalation attempt
    if (this.isEscalationAttempt(currentRole, requestedRole)) {
      await this.recordAttempt(attempt);
      
      // Check for patterns
      const pattern = await this.analyzeUserPattern(userId);
      
      if (pattern.suspicious) {
        // Blacklist user for repeated attempts
        if (pattern.attemptCount >= this.MAX_ATTEMPTS) {
          this.blacklistedUsers.add(userId);
          
          return {
            detected: true,
            severity: 'CRITICAL',
            action: 'BLOCK_AND_INVALIDATE_ALL',
            details: {
              reason: 'REPEATED_ESCALATION_ATTEMPTS',
              attemptCount: pattern.attemptCount,
              pattern: pattern.type
            }
          };
        }

        return {
          detected: true,
          severity: 'HIGH',
          action: 'BLOCK_REQUEST',
          details: {
            reason: 'SUSPICIOUS_PATTERN_DETECTED',
            pattern: pattern.type
          }
        };
      }

      // Single attempt, still suspicious
      return {
        detected: true,
        severity: 'MEDIUM',
        action: 'BLOCK_AND_LOG',
        details: {
          reason: 'PRIVILEGE_ESCALATION_ATTEMPT',
          from: currentRole,
          to: requestedRole
        }
      };
    }

    // Check for cross-session escalation
    if (sessionId && await this.isCrossSessionEscalation(userId, sessionId, requestedRole)) {
      return {
        detected: true,
        severity: 'HIGH',
        action: 'INVALIDATE_ALL_SESSIONS',
        details: {
          reason: 'CROSS_SESSION_ESCALATION',
          sessionId
        }
      };
    }

    return {
      detected: false
    };
  }

  /**
   * Analyze suspicious patterns
   */
  async analyzePattern(pattern: SuspiciousPattern): Promise<{ suspicious: boolean; action?: string; type?: string }> {
    // Rapid attempt detection
    if (pattern.attempts && pattern.timeWindow) {
      const userAttempts = this.attemptHistory.get(pattern.userId || '');
      if (userAttempts) {
        const recentAttempts = userAttempts.filter(
          a => Date.now() - (a.timestamp?.getTime() || 0) < (pattern.timeWindow || 60000)
        );
        
        if (recentAttempts.length >= (pattern.attempts || 3)) {
          return {
            suspicious: true,
            action: 'IMMEDIATE_LOCKDOWN',
            type: 'RAPID_ATTEMPTS'
          };
        }
      }
    }

    // Cross-session escalation
    if (pattern.escalationType === 'CROSS_SESSION' && pattern.sessions) {
      return {
        suspicious: true,
        action: 'LOCKDOWN_ALL_SESSIONS',
        type: 'CROSS_SESSION_ATTACK'
      };
    }

    // Token replay attack
    if (pattern.tokenReplay) {
      return {
        suspicious: true,
        action: 'LOCKDOWN_AND_ROTATE_KEYS',
        type: 'TOKEN_REPLAY_ATTACK'
      };
    }

    return { suspicious: false };
  }

  /**
   * Check if role change is an escalation attempt
   */
  private isEscalationAttempt(currentRole: string, requestedRole: string): boolean {
    const roleHierarchy: { [key: string]: number } = {
      'MASTER_ADMIN': 4,
      'ADMIN': 3,
      'MANAGER': 2,
      'EMPLOYEE': 1
    };

    const currentLevel = roleHierarchy[currentRole] || 0;
    const requestedLevel = roleHierarchy[requestedRole] || 0;

    // CRITICAL: Non-MASTER_ADMIN trying to access MASTER_ADMIN
    if (requestedRole === 'MASTER_ADMIN' && currentRole !== 'MASTER_ADMIN') {
      return true;
    }

    // Any attempt to escalate privileges
    return requestedLevel > currentLevel;
  }

  /**
   * Record escalation attempt
   */
  private async recordAttempt(attempt: EscalationAttempt): Promise<void> {
    const { userId } = attempt;
    
    if (!this.attemptHistory.has(userId)) {
      this.attemptHistory.set(userId, []);
    }

    const attempts = this.attemptHistory.get(userId)!;
    attempts.push({
      ...attempt,
      timestamp: new Date()
    });

    // Keep only recent attempts
    const cutoff = Date.now() - this.TIME_WINDOW;
    const recentAttempts = attempts.filter(
      a => (a.timestamp?.getTime() || 0) > cutoff
    );
    this.attemptHistory.set(userId, recentAttempts);
  }

  /**
   * Analyze user pattern for suspicious behavior
   */
  private async analyzeUserPattern(userId: string): Promise<{ suspicious: boolean; attemptCount: number; type?: string }> {
    const attempts = this.attemptHistory.get(userId) || [];
    const recentAttempts = attempts.filter(
      a => Date.now() - (a.timestamp?.getTime() || 0) < this.TIME_WINDOW
    );

    // Multiple attempts in short time
    if (recentAttempts.length >= this.MAX_ATTEMPTS) {
      return {
        suspicious: true,
        attemptCount: recentAttempts.length,
        type: 'RAPID_ESCALATION_ATTEMPTS'
      };
    }

    // Different sessions attempting escalation
    const uniqueSessions = new Set(recentAttempts.map(a => a.sessionId).filter(Boolean));
    if (uniqueSessions.size > 1) {
      return {
        suspicious: true,
        attemptCount: recentAttempts.length,
        type: 'MULTI_SESSION_ESCALATION'
      };
    }

    // Pattern of targeting specific endpoints
    const targetedEndpoints = recentAttempts.filter(a => 
      a.endpoint && a.endpoint.includes('master-admin')
    );
    if (targetedEndpoints.length > 0) {
      return {
        suspicious: true,
        attemptCount: targetedEndpoints.length,
        type: 'TARGETED_ENDPOINT_ATTACK'
      };
    }

    return {
      suspicious: false,
      attemptCount: recentAttempts.length
    };
  }

  /**
   * Check for cross-session escalation
   */
  private async isCrossSessionEscalation(
    userId: string,
    currentSessionId: string,
    requestedRole: string
  ): Promise<boolean> {
    const attempts = this.attemptHistory.get(userId) || [];
    
    // Look for different session attempting higher privilege
    const otherSessionAttempts = attempts.filter(
      a => a.sessionId !== currentSessionId && 
           a.requestedRole === requestedRole &&
           Date.now() - (a.timestamp?.getTime() || 0) < this.TIME_WINDOW
    );

    return otherSessionAttempts.length > 0;
  }

  /**
   * Reset detection state (for testing)
   */
  resetDetection(): void {
    this.attemptHistory.clear();
    this.blacklistedUsers.clear();
    this.suspiciousPatterns.clear();
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - this.LOCKDOWN_DURATION;

    // Clean up attempt history
    for (const [userId, attempts] of this.attemptHistory.entries()) {
      const recentAttempts = attempts.filter(
        a => (a.timestamp?.getTime() || 0) > cutoff
      );
      
      if (recentAttempts.length === 0) {
        this.attemptHistory.delete(userId);
      } else {
        this.attemptHistory.set(userId, recentAttempts);
      }
    }

    // Clean up blacklist (after lockdown duration)
    // In production, this would be more sophisticated
    // For now, we keep the blacklist until manually cleared
  }

  /**
   * Get current threat level for a user
   */
  async getUserThreatLevel(userId: string): Promise<'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> {
    if (this.blacklistedUsers.has(userId)) {
      return 'CRITICAL';
    }

    const attempts = this.attemptHistory.get(userId) || [];
    const recentAttempts = attempts.filter(
      a => Date.now() - (a.timestamp?.getTime() || 0) < this.TIME_WINDOW
    );

    if (recentAttempts.length >= this.MAX_ATTEMPTS) {
      return 'HIGH';
    }

    if (recentAttempts.length > 0) {
      return 'MEDIUM';
    }

    const historicalAttempts = attempts.length;
    if (historicalAttempts > 0) {
      return 'LOW';
    }

    return 'SAFE';
  }

  /**
   * Export detection metrics (for monitoring)
   */
  getMetrics(): {
    totalUsers: number;
    blacklistedUsers: number;
    activeThreats: number;
    recentAttempts: number;
  } {
    const now = Date.now();
    let recentAttempts = 0;
    let activeThreats = 0;

    for (const attempts of this.attemptHistory.values()) {
      const recent = attempts.filter(
        a => now - (a.timestamp?.getTime() || 0) < this.TIME_WINDOW
      );
      recentAttempts += recent.length;
      if (recent.length > 0) {
        activeThreats++;
      }
    }

    return {
      totalUsers: this.attemptHistory.size,
      blacklistedUsers: this.blacklistedUsers.size,
      activeThreats,
      recentAttempts
    };
  }
}

// Export singleton instance
export const privilegeEscalationDetector = new PrivilegeEscalationDetector();