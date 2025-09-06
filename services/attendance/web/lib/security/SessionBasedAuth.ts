/**
 * Session-Based Authentication
 * Provides session management and re-authentication for critical operations
 */

import crypto from 'crypto';

interface Session {
  id: string;
  userId: string;
  role: string;
  email: string;
  createdAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  verified: boolean;
  mfaCompleted?: boolean;
}

interface SessionCreateParams {
  userId: string;
  role: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ReAuthenticationRequest {
  action: string;
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface RoleChangeResult {
  success: boolean;
  action?: string;
  reason?: string;
}

export class SessionBasedAuth {
  private sessions: Map<string, Session>;
  private userSessions: Map<string, Set<string>>; // userId -> sessionIds
  private readonly SESSION_TIMEOUT = 3600000; // 1 hour
  private readonly CRITICAL_ACTION_TIMEOUT = 300000; // 5 minutes for critical actions
  private sessionCounter: number;

  constructor() {
    this.sessions = new Map();
    this.userSessions = new Map();
    this.sessionCounter = 0;

    // Clean up expired sessions periodically
    setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
  }

  /**
   * Create a new session
   */
  async createSession(params: SessionCreateParams): Promise<string> {
    const sessionId = this.generateSessionId();
    
    const session: Session = {
      id: sessionId,
      userId: params.userId,
      role: params.role,
      email: params.email,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      verified: true
    };

    this.sessions.set(sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(params.userId)) {
      this.userSessions.set(params.userId, new Set());
    }
    this.userSessions.get(params.userId)!.add(sessionId);

    return sessionId;
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string, userId: string, role: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    // Check session expiry
    if (this.isSessionExpired(session)) {
      this.removeSession(sessionId);
      return false;
    }

    // Validate session belongs to user
    if (session.userId !== userId) {
      // Session hijacking attempt detected
      console.error(`Session hijacking detected: Session ${sessionId} doesn't belong to user ${userId}`);
      this.invalidateUserSessions(userId);
      return false;
    }

    // Validate role hasn't been tampered
    if (session.role !== role) {
      console.error(`Role tampering detected: Session role ${session.role} doesn't match provided role ${role}`);
      this.removeSession(sessionId);
      return false;
    }

    // Update last activity
    session.lastActivity = new Date();

    return true;
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    if (this.isSessionExpired(session)) {
      this.removeSession(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Attempt to change role in session (should fail for security)
   */
  async attemptRoleChange(sessionId: string, newRole: string): Promise<RoleChangeResult> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        reason: 'SESSION_NOT_FOUND'
      };
    }

    // CRITICAL: Attempting to escalate to MASTER_ADMIN
    if (newRole === 'MASTER_ADMIN' && session.role !== 'MASTER_ADMIN') {
      console.error(`🚨 CRITICAL: Role escalation attempt to MASTER_ADMIN in session ${sessionId}`);
      
      // Invalidate all sessions for this user
      await this.invalidateUserSessions(session.userId);
      
      return {
        success: false,
        action: 'ALL_SESSIONS_INVALIDATED',
        reason: 'PRIVILEGE_ESCALATION_DETECTED'
      };
    }

    // Any role change in active session is suspicious
    if (session.role !== newRole) {
      console.warn(`Role change attempted in session ${sessionId}: ${session.role} -> ${newRole}`);
      
      // Invalidate this session
      this.removeSession(sessionId);
      
      return {
        success: false,
        action: 'SESSION_INVALIDATED',
        reason: 'ROLE_CHANGE_NOT_ALLOWED'
      };
    }

    return {
      success: true
    };
  }

  /**
   * Require re-authentication for sensitive actions
   */
  async requireReAuthentication(
    sessionId: string,
    request: ReAuthenticationRequest
  ): Promise<{ required: boolean; method?: string; reason?: string }> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        required: true,
        method: 'FULL_LOGIN',
        reason: 'SESSION_NOT_FOUND'
      };
    }

    // Critical actions always require re-authentication
    if (request.sensitivity === 'CRITICAL') {
      const timeSinceCreation = Date.now() - session.createdAt.getTime();
      
      // If session is older than critical timeout, require re-auth
      if (timeSinceCreation > this.CRITICAL_ACTION_TIMEOUT) {
        return {
          required: true,
          method: 'PASSWORD_CONFIRMATION',
          reason: 'CRITICAL_ACTION_TIMEOUT'
        };
      }

      // MFA required for critical actions
      if (!session.mfaCompleted) {
        return {
          required: true,
          method: 'MFA_VERIFICATION',
          reason: 'MFA_REQUIRED_FOR_CRITICAL'
        };
      }
    }

    // High sensitivity actions
    if (request.sensitivity === 'HIGH') {
      const timeSinceActivity = Date.now() - session.lastActivity.getTime();
      
      if (timeSinceActivity > this.CRITICAL_ACTION_TIMEOUT) {
        return {
          required: true,
          method: 'PASSWORD_CONFIRMATION',
          reason: 'INACTIVE_SESSION'
        };
      }
    }

    return {
      required: false
    };
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<number> {
    const sessionIds = this.userSessions.get(userId);
    
    if (!sessionIds) {
      return 0;
    }

    let invalidatedCount = 0;
    for (const sessionId of sessionIds) {
      this.sessions.delete(sessionId);
      invalidatedCount++;
    }

    this.userSessions.delete(userId);
    
    console.log(`Invalidated ${invalidatedCount} sessions for user ${userId}`);
    return invalidatedCount;
  }

  /**
   * Clear all sessions (for testing)
   */
  clearAllSessions(): void {
    this.sessions.clear();
    this.userSessions.clear();
    this.sessionCounter = 0;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        this.removeSession(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session || this.isSessionExpired(session)) {
      return null;
    }

    return { ...session };
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const sessionIds = this.userSessions.get(userId);
    
    if (!sessionIds) {
      return [];
    }

    const sessions: Session[] = [];
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && !this.isSessionExpired(session)) {
        sessions.push({ ...session });
      }
    }

    return sessions;
  }

  /**
   * Update session activity
   */
  async touchSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    session.lastActivity = new Date();
    return true;
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    // For testing, use simple counter-based IDs
    if (process.env.NODE_ENV === 'test') {
      return `session-${++this.sessionCounter}`;
    }

    // For production, use cryptographically secure random ID
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: Session): boolean {
    const now = Date.now();
    const lastActivity = session.lastActivity.getTime();
    return now - lastActivity > this.SESSION_TIMEOUT;
  }

  /**
   * Remove session and clean up references
   */
  private removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      // Remove from user sessions
      const userSessionIds = this.userSessions.get(session.userId);
      if (userSessionIds) {
        userSessionIds.delete(sessionId);
        if (userSessionIds.size === 0) {
          this.userSessions.delete(session.userId);
        }
      }
    }

    this.sessions.delete(sessionId);
  }

  /**
   * Get session metrics (for monitoring)
   */
  getMetrics(): {
    totalSessions: number;
    totalUsers: number;
    averageSessionAge: number;
    expiredSessions: number;
  } {
    let totalAge = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const session of this.sessions.values()) {
      totalAge += now - session.createdAt.getTime();
      if (this.isSessionExpired(session)) {
        expiredCount++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      totalUsers: this.userSessions.size,
      averageSessionAge: this.sessions.size > 0 ? totalAge / this.sessions.size : 0,
      expiredSessions: expiredCount
    };
  }
}

// Export singleton instance
export const sessionBasedAuth = new SessionBasedAuth();