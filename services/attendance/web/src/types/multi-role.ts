// Phase 1.3: 다중 역할 지원 타입 정의
// TDD: 테스트를 통과시키기 위한 타입 구현

/**
 * 사용자 역할 종류
 */
export enum RoleType {
  WORKER = 'WORKER',       // 근로자
  ADMIN = 'ADMIN',         // 관리자  
  MANAGER = 'MANAGER',     // 매니저
  FRANCHISE = 'FRANCHISE'  // 가맹본부
}

/**
 * 계약 종류
 */
export enum ContractType {
  EMPLOYMENT = 'EMPLOYMENT',   // 정규직
  PART_TIME = 'PART_TIME',     // 파트타임
  TEMPORARY = 'TEMPORARY',     // 임시직
  INTERNSHIP = 'INTERNSHIP',   // 인턴
  FREELANCE = 'FREELANCE'      // 프리랜서
}

/**
 * 계약 상태
 */
export enum ContractStatus {
  PENDING = 'PENDING',     // 대기
  ACTIVE = 'ACTIVE',       // 활성
  TERMINATED = 'TERMINATED', // 해지
  EXPIRED = 'EXPIRED'      // 만료
}

/**
 * 급여 형태
 */
export enum WageType {
  HOURLY = 'HOURLY',   // 시급
  DAILY = 'DAILY',     // 일급
  MONTHLY = 'MONTHLY', // 월급
  YEARLY = 'YEARLY'    // 연봉
}

/**
 * 사용자 역할 정보
 */
export interface UserRole {
  id: string;
  employeeId: string;
  organizationId: string;
  roleType: RoleType;
  isActive: boolean;
  grantedAt: Date;
  grantedBy?: string;
  organizationName: string;
}

/**
 * 근로 계약 정보
 */
export interface Contract {
  id: string;
  employeeId: string;
  organizationId: string;
  contractType: ContractType;
  startDate: Date;
  endDate?: Date;
  status: ContractStatus;
  wageAmount?: number;
  wageType: string;
  isMinor?: boolean;
  parentConsentFile?: string;
  terms?: Record<string, any>;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  organizationName: string;
}

/**
 * 다중 역할을 지원하는 사용자 정보
 */
export interface MultiRoleUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  contracts: Contract[];
  metadata?: Record<string, any>;
}

/**
 * 역할별 권한 정의
 */
export interface RolePermissions {
  // 기본 권한
  canViewOwnAttendance: boolean;
  canViewOwnContracts: boolean;
  
  // 조직 관리 권한
  canManageEmployees: boolean;
  canManageOrganization: boolean;
  canCreateContracts: boolean;
  canApproveAttendance: boolean;
  
  // 시스템 관리 권한
  canAccessSystemAdmin: boolean;
  canManageAllOrganizations: boolean;
  
  // 가맹본부 권한
  canManageFranchises: boolean;
  canViewFranchiseReports: boolean;
}

/**
 * 조직 정보 (확장)
 */
export interface Organization {
  id: string;
  name: string;
  code?: string;
  bizType?: 'PERSONAL' | 'CORP' | 'FRANCHISE';
  bizNumber?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

/**
 * 직원 정보 (확장)
 */
export interface Employee {
  id: string;
  userId: string;
  organizationId: string;
  email: string;
  name: string;
  phone?: string;
  position: string;
  department?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

/**
 * 대시보드 라우팅을 위한 사용자 컨텍스트
 */
export interface UserContext {
  user: MultiRoleUser;
  currentRole?: UserRole;
  currentOrganization?: Organization;
  availableDashboards: DashboardInfo[];
}

/**
 * 대시보드 정보
 */
export interface DashboardInfo {
  id: string;
  type: 'worker' | 'admin' | 'manager' | 'franchise' | 'system';
  title: string;
  description: string;
  path: string;
  role: UserRole;
  organization?: Organization;
  contract?: Contract;
}

/**
 * API 응답 타입들
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 역할 생성/수정 요청 타입
 */
export interface CreateRoleRequest {
  employeeId: string;
  organizationId: string;
  roleType: RoleType;
}

export interface UpdateRoleRequest {
  isActive: boolean;
}

/**
 * 계약 생성/수정 요청 타입
 */
export interface CreateContractRequest {
  employeeId: string;
  organizationId: string;
  contractType: ContractType;
  startDate: string; // ISO date string
  endDate?: string;
  wageAmount?: number;
  wageType: WageType;
  terms?: Record<string, any>;
}

export interface UpdateContractRequest {
  endDate?: string;
  status?: ContractStatus;
  wageAmount?: number;
  wageType?: WageType;
  terms?: Record<string, any>;
}