/**
 * Organization Types - Updated for ID-ROLE-PAPER unified architecture
 * Migration Phase 1: Integrating with BusinessRegistration system while maintaining legacy compatibility
 * 
 * 기존 조직 관리 → BusinessRegistration + 통합 신원 관리로 전환
 */

import { 
  BusinessRegistration, 
  BusinessType, 
  IdType, 
  RoleType, 
  VerificationStatus 
} from './id-role-paper-unified';

export enum OrganizationType {
  PERSONAL = 'PERSONAL',       // 개인사업자
  CORP = 'CORP',              // 법인
  FRANCHISE = 'FRANCHISE'      // 가맹점
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',          // 활성
  INACTIVE = 'INACTIVE',      // 비활성
  SUSPENDED = 'SUSPENDED',    // 정지
  PENDING = 'PENDING'         // 승인 대기
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  businessRegistrationNumber?: string;
  address?: string;
  phone?: string;
  status: OrganizationStatus;
  parentOrganizationId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  
  // 통계 정보 (조회시 포함)
  employeeCount?: number;
  activeEmployeeCount?: number;
  totalAttendance?: number;
  
  // 관계 정보
  parentOrganization?: Partial<Organization>;
  childOrganizations?: Partial<Organization>[];
}

export interface OrganizationListFilters {
  search?: string;                    // 조직명, 사업자번호로 검색
  status?: OrganizationStatus[];      // 상태 필터
  type?: OrganizationType[];          // 타입 필터
  employeeCountRange?: {              // 직원수 범위
    min?: number;
    max?: number;
  };
  dateRange?: {                       // 생성일 범위
    startDate?: Date;
    endDate?: Date;
  };
  parentOrganizationId?: string;      // 상위 조직 ID
}

export interface OrganizationListSort {
  field: 'name' | 'createdAt' | 'employeeCount' | 'type' | 'status';
  direction: 'asc' | 'desc';
}

export interface OrganizationListParams {
  page?: number;
  pageSize?: number;
  filters?: OrganizationListFilters;
  sort?: OrganizationListSort;
}

export interface OrganizationListResponse {
  organizations: Organization[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface OrganizationStats {
  totalOrganizations: number;
  activeOrganizations: number;
  inactiveOrganizations: number;
  pendingOrganizations: number;
  totalEmployees: number;
  organizationsByType: Record<OrganizationType, number>;
  recentCreations: number; // 최근 7일간 생성된 조직 수
}

// API 요청/응답 타입
export interface CreateOrganizationRequest {
  name: string;
  type: OrganizationType;
  businessRegistrationNumber?: string;
  address?: string;
  phone?: string;
  parentOrganizationId?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  type?: OrganizationType;
  businessRegistrationNumber?: string;
  address?: string;
  phone?: string;
  status?: OrganizationStatus;
}

// 상태 변경 관련 타입
export interface OrganizationStatusChangeRequest {
  organizationId: string;
  newStatus: OrganizationStatus;
  reason?: string;
  changedBy: string;
}

export interface BulkOrganizationStatusChangeRequest {
  organizationIds: string[];
  newStatus: OrganizationStatus;
  reason?: string;
  changedBy: string;
}

export interface OrganizationStatusChangeResponse {
  success: boolean;
  organizationId: string;
  previousStatus: OrganizationStatus;
  newStatus: OrganizationStatus;
  auditLogId: string;
  notificationId?: string;
  error?: string;
}

export interface BulkOrganizationStatusChangeResponse {
  success: boolean;
  results: OrganizationStatusChangeResponse[];
  totalCount: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface OrganizationAuditLogEntry {
  id: string;
  organizationId: string;
  action: string;
  previousStatus?: OrganizationStatus;
  newStatus?: OrganizationStatus;
  changedBy: string;
  changedByName: string;
  reason?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  canUndo: boolean;
  undoExpiresAt?: Date;
}

export interface OrganizationAuditLogResponse {
  auditLogs: OrganizationAuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UndoStatusChangeRequest {
  auditLogId: string;
  reason?: string;
  undoneBy: string;
}

export interface UndoStatusChangeResponse {
  success: boolean;
  organizationId: string;
  restoredStatus: OrganizationStatus;
  auditLogId: string;
  error?: string;
}