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

// Legacy OrganizationType enum - DEPRECATED: Use BusinessType from unified system
/** @deprecated Use BusinessType from id-role-paper-unified.ts instead */
export enum OrganizationType {
  PERSONAL = 'PERSONAL',       // 개인사업자
  CORP = 'CORP',              // 법인
  FRANCHISE = 'FRANCHISE'      // 가맹점
}

// Legacy to new business type mapping
export const LEGACY_ORG_TYPE_MAPPING: Record<OrganizationType, BusinessType> = {
  [OrganizationType.PERSONAL]: BusinessType.INDIVIDUAL,
  [OrganizationType.CORP]: BusinessType.CORPORATE,
  [OrganizationType.FRANCHISE]: BusinessType.CORPORATE, // Franchises are corporate entities
};

// Legacy OrganizationStatus enum - DEPRECATED: Use VerificationStatus from unified system
/** @deprecated Use VerificationStatus from id-role-paper-unified.ts instead */
export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',          // 활성
  INACTIVE = 'INACTIVE',      // 비활성
  SUSPENDED = 'SUSPENDED',    // 정지
  PENDING = 'PENDING'         // 승인 대기
}

// Legacy to new status mapping
export const LEGACY_ORG_STATUS_MAPPING: Record<OrganizationStatus, VerificationStatus> = {
  [OrganizationStatus.PENDING]: VerificationStatus.PENDING,
  [OrganizationStatus.ACTIVE]: VerificationStatus.VERIFIED,
  [OrganizationStatus.INACTIVE]: VerificationStatus.REJECTED,
  [OrganizationStatus.SUSPENDED]: VerificationStatus.REJECTED,
};

// Legacy Organization interface - DEPRECATED: Use BusinessRegistration from unified system
/** @deprecated Use BusinessRegistration from id-role-paper-unified.ts instead */
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

// New ID-ROLE-PAPER compatible organization interface
export interface ModernOrganization extends BusinessRegistration {
  // Additional organization-specific fields
  parentOrganizationId?: string;
  
  // Statistics (computed fields)
  stats?: {
    employeeCount: number;
    activeEmployeeCount: number;
    totalAttendance: number;
    franchiseCount?: number; // For franchise headquarters
  };
  
  // Hierarchical relationships
  relationships?: {
    parentOrganization?: Partial<ModernOrganization>;
    childOrganizations: Partial<ModernOrganization>[];
    franchisees?: Partial<ModernOrganization>[]; // For franchise headquarters
  };
  
  // Owner identity information
  ownerInfo?: {
    identityId: string;
    idType: IdType;
    fullName: string;
    email: string;
    currentRole: RoleType;
  };
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

// ========== UTILITY FUNCTIONS ==========

/**
 * Convert legacy Organization to ModernOrganization
 * 기존 Organization 인터페이스를 새로운 BusinessRegistration 기반으로 변환
 */
export const convertLegacyOrganizationToModern = (legacyOrg: Organization): Partial<ModernOrganization> => {
  const businessType = LEGACY_ORG_TYPE_MAPPING[legacyOrg.type];
  const verificationStatus = LEGACY_ORG_STATUS_MAPPING[legacyOrg.status];
  
  return {
    id: legacyOrg.id,
    registrationNumber: legacyOrg.businessRegistrationNumber || '',
    businessName: legacyOrg.name,
    businessType,
    ownerIdentityId: legacyOrg.createdBy || '', // To be properly mapped
    registrationData: {
      address: legacyOrg.address,
      phone: legacyOrg.phone,
      legacyType: legacyOrg.type,
    },
    verificationStatus,
    isActive: legacyOrg.status === OrganizationStatus.ACTIVE,
    createdAt: legacyOrg.createdAt,
    updatedAt: legacyOrg.updatedAt,
    
    // Additional fields
    parentOrganizationId: legacyOrg.parentOrganizationId,
    stats: {
      employeeCount: legacyOrg.employeeCount || 0,
      activeEmployeeCount: legacyOrg.activeEmployeeCount || 0,
      totalAttendance: legacyOrg.totalAttendance || 0,
    },
  };
};

/**
 * Convert ModernOrganization back to legacy Organization
 * 호환성을 위한 역변환
 */
export const convertModernOrganizationToLegacy = (modernOrg: ModernOrganization): Partial<Organization> => {
  // Find legacy type from business type
  const legacyType = Object.entries(LEGACY_ORG_TYPE_MAPPING)
    .find(([_, businessType]) => businessType === modernOrg.businessType)?.[0] as OrganizationType;
    
  // Find legacy status from verification status
  const legacyStatus = Object.entries(LEGACY_ORG_STATUS_MAPPING)
    .find(([_, verificationStatus]) => verificationStatus === modernOrg.verificationStatus)?.[0] as OrganizationStatus;
  
  return {
    id: modernOrg.id,
    name: modernOrg.businessName,
    type: legacyType || OrganizationType.PERSONAL,
    businessRegistrationNumber: modernOrg.registrationNumber,
    address: modernOrg.registrationData?.address as string,
    phone: modernOrg.registrationData?.phone as string,
    status: legacyStatus || OrganizationStatus.PENDING,
    parentOrganizationId: modernOrg.parentOrganizationId,
    createdAt: modernOrg.createdAt,
    updatedAt: modernOrg.updatedAt,
    createdBy: modernOrg.ownerIdentityId,
    
    // Statistics
    employeeCount: modernOrg.stats?.employeeCount,
    activeEmployeeCount: modernOrg.stats?.activeEmployeeCount,
    totalAttendance: modernOrg.stats?.totalAttendance,
  };
};

/**
 * Check if organization has specific legacy type
 * 기존 조직 타입과의 호환성을 위한 유틸리티
 */
export const hasLegacyOrganizationType = (org: ModernOrganization, legacyType: OrganizationType): boolean => {
  const mappedType = LEGACY_ORG_TYPE_MAPPING[legacyType];
  return org.businessType === mappedType;
};

/**
 * Get display name for organization type
 * 조직 타입의 표시명 반환
 */
export const getOrganizationTypeDisplayName = (businessType: BusinessType): string => {
  const displayNames: Record<BusinessType, string> = {
    [BusinessType.INDIVIDUAL]: '개인사업자',
    [BusinessType.CORPORATE]: '법인사업자'
  };
  return displayNames[businessType] || businessType;
};

/**
 * Get display name for organization status
 * 조직 상태의 표시명 반환
 */
export const getOrganizationStatusDisplayName = (verificationStatus: VerificationStatus): string => {
  const displayNames: Record<VerificationStatus, string> = {
    [VerificationStatus.PENDING]: '승인 대기',
    [VerificationStatus.VERIFIED]: '활성',
    [VerificationStatus.REJECTED]: '비활성'
  };
  return displayNames[verificationStatus] || verificationStatus;
};