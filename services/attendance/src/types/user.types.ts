// User Role Types
export enum UserRole {
  SUPER_ADMIN = 'super_admin',     // 서비스 관리자
  BUSINESS_ADMIN = 'business_admin', // 사업장 관리자
  EMPLOYEE = 'employee'             // 일반 사용자
}

// User Status
export enum UserStatus {
  PENDING = 'pending',     // 승인 대기
  APPROVED = 'approved',   // 승인됨
  SUSPENDED = 'suspended', // 정지
  REJECTED = 'rejected'    // 거부됨
}

// Contract Type
export enum ContractType {
  FULL_TIME = 'full_time',   // 정규직
  PART_TIME = 'part_time',   // 파트타임
  CONTRACT = 'contract'      // 계약직
}

// User Interface
export interface User {
  id: string;
  phone: string;
  name: string;
  birthDate?: string;
  accountNumber?: string;
  role: UserRole;
  status: UserStatus;
  deviceFingerprint?: string;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  businessId?: string;
}

// Employee Details
export interface EmployeeDetails {
  id: string;
  userId: string;
  businessId: string;
  contractType: ContractType;
  salary?: number;
  workSchedule?: {
    days: string[];
    hours: string;
  };
  department?: string;
  position?: string;
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  createdAt: Date;
}

// Registration Request
export interface RegistrationRequest {
  name: string;
  phone: string;
  birthDate: string;
  accountNumber?: string;
  deviceInfo: {
    fingerprint: string;
    userAgent: string;
    platform: string;
  };
  businessId: string;  // From QR code
  locationId: string;  // From QR code
}

// Approval Request
export interface ApprovalRequest {
  userId: string;
  contractType: ContractType;
  salary: number;
  workSchedule: {
    days: string[];
    hours: string;
  };
  department: string;
  position: string;
  startDate: string;
  endDate?: string;
}