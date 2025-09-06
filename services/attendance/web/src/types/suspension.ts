/**
 * 계정 정지/활성화 관리 시스템 타입 정의
 * Phase 3.3.2.3 구현
 */

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED', 
  TEMPORARILY_DISABLED = 'TEMPORARILY_DISABLED',
  PERMANENTLY_BANNED = 'PERMANENTLY_BANNED'
}

export enum SuspensionReason {
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  SECURITY_RISK = 'SECURITY_RISK',
  USER_REQUEST = 'USER_REQUEST',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  LEGAL_REQUIREMENT = 'LEGAL_REQUIREMENT',
  CUSTOM = 'CUSTOM'
}

export enum SuspensionSeverity {
  LOW = 'LOW',           // 경미한 위반 (1-7일)
  MEDIUM = 'MEDIUM',     // 중간 위반 (7-30일)
  HIGH = 'HIGH',         // 심각한 위반 (30-90일)
  CRITICAL = 'CRITICAL'  // 매우 심각한 위반 (영구 차단)
}

export interface SuspensionDuration {
  type: 'TEMPORARY' | 'PERMANENT';
  startDate: Date;
  endDate?: Date;
  durationInHours?: number;
  autoReactivate: boolean;
  timezone: string;
}

export interface AccountSuspension {
  id: string;
  userId: string;
  suspendedBy: string;
  reason: SuspensionReason;
  customReason?: string;
  severity: SuspensionSeverity;
  duration: SuspensionDuration;
  evidence?: {
    files: string[];
    description: string;
    relatedIncidents: string[];
  };
  status: 'ACTIVE' | 'RESOLVED' | 'APPEALED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionReason?: string;
}

export interface SuspensionHistory {
  suspensions: AccountSuspension[];
  totalCount: number;
  activeSuspensions: number;
  totalDurationDays: number;
  lastSuspension?: AccountSuspension;
  recurringPatterns?: {
    reasonFrequency: Record<SuspensionReason, number>;
    averageDuration: number;
    escalationTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  };
}

export interface BulkSuspensionRequest {
  userIds: string[];
  reason: SuspensionReason;
  customReason?: string;
  severity: SuspensionSeverity;
  duration: SuspensionDuration;
  evidence?: {
    description: string;
    files: string[];
  };
  notifyUsers: boolean;
  batchSize?: number;
}

export interface BulkSuspensionResult {
  requestId: string;
  totalUsers: number;
  successCount: number;
  failureCount: number;
  successes: Array<{
    userId: string;
    suspensionId: string;
    timestamp: Date;
  }>;
  failures: Array<{
    userId: string;
    error: string;
    timestamp: Date;
  }>;
  rollbackAvailable: boolean;
  completedAt: Date;
}

export interface AutoReactivationSchedule {
  id: string;
  suspensionId: string;
  userId: string;
  scheduledAt: Date;
  timezone: string;
  status: 'SCHEDULED' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  conditions?: {
    requiresApproval: boolean;
    checkSecurityStatus: boolean;
    verifyUserConsent: boolean;
  };
  executedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
}

export interface AccountRecoveryRequest {
  id: string;
  userId: string;
  suspensionId: string;
  requestedBy: string; // 사용자 본인 또는 대리인
  reason: string;
  evidence?: {
    files: string[];
    statement: string;
    witnessContact?: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  decision?: {
    action: 'REACTIVATE' | 'REDUCE_SUSPENSION' | 'MAINTAIN_SUSPENSION';
    newEndDate?: Date;
    conditions?: string[];
  };
}

export interface SuspensionEvent {
  id: string;
  type: 'SUSPENSION_CREATED' | 'SUSPENSION_UPDATED' | 'SUSPENSION_RESOLVED' | 
        'AUTO_REACTIVATION_SCHEDULED' | 'AUTO_REACTIVATION_EXECUTED' |
        'RECOVERY_REQUEST_SUBMITTED' | 'RECOVERY_REQUEST_REVIEWED' |
        'BULK_SUSPENSION_STARTED' | 'BULK_SUSPENSION_COMPLETED';
  userId: string;
  suspensionId?: string;
  triggeredBy: string;
  metadata: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// API 요청/응답 타입
export interface SuspendUserRequest {
  reason: SuspensionReason;
  customReason?: string;
  severity: SuspensionSeverity;
  duration: SuspensionDuration;
  evidence?: {
    files: string[];
    description: string;
  };
  notifyUser: boolean;
  immediateLogout: boolean;
}

export interface ReactivateUserRequest {
  reason: string;
  restoreData: boolean;
  notifyUser: boolean;
  conditions?: string[];
}

export interface SuspensionApiResponse {
  success: boolean;
  suspension?: AccountSuspension;
  scheduleId?: string;
  error?: string;
  warnings?: string[];
}

export interface SuspensionHistoryResponse {
  success: boolean;
  history?: SuspensionHistory;
  error?: string;
}

export interface BulkSuspensionResponse {
  success: boolean;
  result?: BulkSuspensionResult;
  error?: string;
}

// 클라이언트 사이드 상태 관리 타입
export interface SuspensionState {
  loading: boolean;
  error?: string;
  currentSuspension?: AccountSuspension;
  history: SuspensionHistory | null;
  bulkOperation?: {
    inProgress: boolean;
    result?: BulkSuspensionResult;
    progress: number;
  };
  autoReactivationSchedules: AutoReactivationSchedule[];
}

export interface SuspensionActions {
  suspendUser: (userId: string, request: SuspendUserRequest) => Promise<SuspensionApiResponse>;
  reactivateUser: (userId: string, request: ReactivateUserRequest) => Promise<SuspensionApiResponse>;
  bulkSuspend: (request: BulkSuspensionRequest) => Promise<BulkSuspensionResponse>;
  getSuspensionHistory: (userId: string) => Promise<SuspensionHistoryResponse>;
  scheduleAutoReactivation: (suspensionId: string, scheduledAt: Date) => Promise<{ scheduleId: string }>;
  cancelAutoReactivation: (scheduleId: string) => Promise<{ success: boolean }>;
  rollbackBulkSuspension: (requestId: string) => Promise<{ success: boolean }>;
}

// 검증 및 유틸리티 타입
export interface SuspensionValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface SuspensionValidationResult {
  valid: boolean;
  errors: SuspensionValidationError[];
  warnings: string[];
}

// 법적 컴플라이언스 타입
export interface ComplianceReport {
  userId: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  suspensionCount: number;
  totalDurationDays: number;
  reasonBreakdown: Record<SuspensionReason, number>;
  dataRetentionStatus: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  auditTrail: Array<{
    action: string;
    timestamp: Date;
    performedBy: string;
    details: Record<string, any>;
  }>;
  gdprCompliance: {
    rightToErasure: boolean;
    rightToPortability: boolean;
    rightToRectification: boolean;
  };
  generatedAt: Date;
  generatedBy: string;
}