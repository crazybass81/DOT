/**
 * 공통 출근 관리 타입 정의
 * 웹(TypeScript)과 모바일(Dart) 간 일관성 확보
 */

// 기본 엔티티 ID 타입
export type EntityId = string;
export type Timestamp = string; // ISO 8601 형식

// 출근 상태 열거형
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT', 
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  HOLIDAY = 'HOLIDAY',
  SICK_LEAVE = 'SICK_LEAVE',
  VACATION = 'VACATION',
  REMOTE = 'REMOTE',
  BUSINESS_TRIP = 'BUSINESS_TRIP',
  HALF_DAY = 'HALF_DAY',
  WEEKEND = 'WEEKEND'
}

// 출근 인증 방법
export enum AttendanceMethod {
  MANUAL = 'manual',
  QR_CODE = 'qr', 
  GPS_LOCATION = 'location',
  WIFI = 'wifi',
  BIOMETRIC = 'biometric',
  AUTO = 'auto'
}

// 위치 정보 (GPS 좌표)
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  timestamp: Timestamp;
}

// 기기 정보
export interface DeviceInfo {
  deviceId?: string;
  deviceType?: 'mobile' | 'web' | 'tablet';
  platform?: 'ios' | 'android' | 'web';
  ipAddress?: string;
  userAgent?: string;
  appVersion?: string;
}

// 통합 출근 기록 엔티티
export interface AttendanceRecord {
  // 기본 식별자
  id: EntityId;
  employeeId: EntityId;
  organizationId: EntityId;
  
  // 날짜 및 시간 정보
  date: string; // YYYY-MM-DD 형식
  checkInTime?: Timestamp;
  checkOutTime?: Timestamp;
  
  // 근무 시간 정보
  scheduledStartTime?: Timestamp;
  scheduledEndTime?: Timestamp;
  actualWorkHours?: number; // 분 단위
  overtimeHours?: number; // 분 단위
  breakDuration?: number; // 분 단위
  totalWorkingHours?: number; // 분 단위 (호환성을 위해)
  
  // 출근 상태 및 플래그
  status: AttendanceStatus;
  isLateCheckIn?: boolean;
  isEarlyCheckOut?: boolean;
  
  // 위치 및 인증 정보
  checkInLocation?: LocationData;
  checkOutLocation?: LocationData;
  checkInMethod?: AttendanceMethod;
  checkOutMethod?: AttendanceMethod;
  
  // 추가 정보
  checkInNotes?: string;
  checkOutNotes?: string;
  checkInImageUrl?: string;
  checkOutImageUrl?: string;
  
  // 기기 정보
  deviceInfo?: DeviceInfo;
  
  // 부서 정보
  departmentId?: EntityId;
  departmentName?: string;
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedBy?: EntityId;
  modifiedBy?: EntityId;
  notes?: string;
}

// 출근 통계 정보
export interface AttendanceStatistics {
  employeeId: EntityId;
  organizationId: EntityId;
  period: string; // YYYY-MM 또는 YYYY 형식
  
  // 일수 통계
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays: number;
  
  // 시간 통계 
  totalWorkHours: number;
  overtimeHours: number;
  averageWorkHours: number;
  
  // 출근율
  attendanceRate: number; // 백분율
  punctualityRate: number; // 정시 출근율
  
  // 평균 시간
  averageCheckInTime?: string; // HH:mm 형식
  averageCheckOutTime?: string; // HH:mm 형식
  
  // 기간 정보
  periodStart?: string;
  periodEnd?: string;
}

// 출근 현황 (대시보드용)
export interface AttendanceOverview {
  organizationId: EntityId;
  date: string;
  
  // 직원 수 통계
  totalEmployees: number;
  presentEmployees: number;
  absentEmployees: number;
  lateEmployees: number;
  remoteEmployees: number;
  
  // 출근율 정보
  attendanceRate: number;
  onTimeRate: number;
  
  // 일별 추세 데이터
  dailyData?: Array<{
    date: string;
    presentCount: number;
    totalCount: number;
    rate: number;
  }>;
}

// 출근 대기열 (오프라인 지원)
export interface AttendanceQueue {
  id: EntityId;
  employeeId: EntityId;
  actionType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  timestamp: Timestamp;
  location?: LocationData;
  method: AttendanceMethod;
  notes?: string;
  deviceInfo?: DeviceInfo;
  
  // 동기화 상태
  status: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  lastAttempt?: Timestamp;
  errorMessage?: string;
}

// 출근 인증 결과
export interface AttendanceVerificationResult {
  isValid: boolean;
  method: AttendanceMethod;
  location?: LocationData;
  distance?: number; // GPS 인증시 사업장과의 거리
  errorMessage?: string;
  warningMessage?: string;
  
  // QR 코드 검증 결과
  qrData?: {
    token: string;
    locationId: string;
    expiresAt: Timestamp;
  };
  
  // 생체 인증 결과
  biometricResult?: {
    type: 'fingerprint' | 'face' | 'voice';
    confidence: number;
    verified: boolean;
  };
}

// 출근 위치 정보
export interface AttendanceLocation {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number; // 미터 단위
  isActive: boolean;
  
  // 추가 정보
  description?: string;
  contactNumber?: string;
  workingHours?: {
    start: string; // HH:mm
    end: string;   // HH:mm
    days: number[]; // 0=일요일, 6=토요일
  };
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 직원 정보 (출근 관련)
export interface Employee {
  id: EntityId;
  userId?: EntityId; // 인증 시스템 사용자 ID
  employeeId: EntityId; // 사번
  organizationId: EntityId;
  
  // 기본 정보
  name: string;
  email: string;
  phone?: string;
  employeeCode?: string;
  
  // 근무 정보
  departmentId?: EntityId;
  departmentName?: string;
  position?: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'HR';
  managerId?: EntityId;
  
  // 고용 정보
  joinDate?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'FREELANCE';
  workSchedule?: {
    type: 'FIXED' | 'FLEXIBLE' | 'SHIFT';
    standardHours?: number; // 주당 표준 근무 시간
    startTime?: string;     // 기본 출근 시간
    endTime?: string;       // 기본 퇴근 시간  
    workDays?: number[];    // 근무 요일
  };
  
  // 상태
  isActive: boolean;
  lastActive?: Timestamp;
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
  details?: string[];
  timestamp?: Timestamp;
}

// 페이지네이션 정보
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 페이지네이션된 응답
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

// 주간 근무 시간 (차트용)
export interface WeeklyHours {
  day: number; // 0-6 (일-토)
  date: string;
  hours: number;
  status?: AttendanceStatus;
}

// 출근율 정보 (대시보드용) 
export interface AttendanceRates {
  todayRate: number;
  weeklyRate: number;
  monthlyRate: number;
  yearlyRate: number;
}

// 실시간 출근 정보 (관리자 대시보드용)
export interface RealTimeAttendance {
  employeeId: EntityId;
  employeeName: string;
  departmentName?: string;
  status: AttendanceStatus;
  checkInTime?: Timestamp;
  checkOutTime?: Timestamp;
  currentLocation?: LocationData;
  workingHours?: number;
  lastActivity?: Timestamp;
}

// 타입 가드 함수들
export function isValidAttendanceStatus(status: string): status is AttendanceStatus {
  return Object.values(AttendanceStatus).includes(status as AttendanceStatus);
}

export function isValidAttendanceMethod(method: string): method is AttendanceMethod {
  return Object.values(AttendanceMethod).includes(method as AttendanceMethod);
}

// 유틸리티 타입
export type AttendanceRecordPartial = Partial<AttendanceRecord>;
export type AttendanceRecordCreate = Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type AttendanceRecordUpdate = Partial<Omit<AttendanceRecord, 'id' | 'employeeId' | 'createdAt'>>;

// 내보내기 기본값
export default {
  AttendanceStatus,
  AttendanceMethod,
  isValidAttendanceStatus,
  isValidAttendanceMethod
};