// 통합 출근 관리 모델
// 웹과 모바일 간 일관성을 위한 공통 타입 사용

import { 
  AttendanceRecord as BaseAttendanceRecord,
  AttendanceStatistics as BaseAttendanceStatistics,
  Employee as BaseEmployee,
  AttendanceLocation as BaseAttendanceLocation,
  AttendanceQueue as BaseAttendanceQueue,
  AttendanceVerificationResult as BaseAttendanceVerificationResult,
  AttendanceOverview as BaseAttendanceOverview,
  AttendanceStatus,
  AttendanceMethod,
  LocationData,
  DeviceInfo,
  EntityId,
  Timestamp,
  ApiResponse,
  PaginatedResponse
} from '../../types/common-attendance-types';

// Supabase 스키마와 호환되는 출근 기록
export interface AttendanceRecord extends BaseAttendanceRecord {
  // 레거시 호환성을 위한 추가 필드
  attendanceId?: EntityId; // 기존 시스템과의 호환성 유지
}

// 출근 통계
export interface AttendanceStatistics extends BaseAttendanceStatistics {}

// 직원 정보  
export interface Employee extends BaseEmployee {}

// 출근 위치
export interface AttendanceLocation extends BaseAttendanceLocation {}

// 출근 대기열 (오프라인 동기화용)
export interface AttendanceQueue extends BaseAttendanceQueue {}

// 출근 인증 결과
export interface AttendanceVerificationResult extends BaseAttendanceVerificationResult {}

// 출근 현황 (대시보드)
export interface AttendanceOverview extends BaseAttendanceOverview {}

// 데이터베이스 작업용 DTO
export interface CreateAttendanceRequest {
  employeeId: EntityId;
  organizationId: EntityId;
  date: string;
  checkInTime?: Timestamp;
  checkInLocation?: LocationData;
  checkInMethod?: AttendanceMethod;
  checkInNotes?: string;
  deviceInfo?: DeviceInfo;
  status?: AttendanceStatus;
}

export interface UpdateAttendanceRequest {
  checkOutTime?: Timestamp;
  checkOutLocation?: LocationData;
  checkOutMethod?: AttendanceMethod;
  checkOutNotes?: string;
  status?: AttendanceStatus;
  actualWorkHours?: number;
  breakDuration?: number;
  notes?: string;
  modifiedBy?: EntityId;
}

export interface AttendanceQueryParams {
  employeeId?: EntityId;
  organizationId?: EntityId;
  departmentId?: EntityId;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'checkInTime' | 'checkOutTime' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// 레포지토리 응답 타입
export interface AttendanceRepositoryResponse<T = any> extends ApiResponse<T> {
  executionTime?: number;
  affectedRows?: number;
}

// 배치 작업용 타입
export interface BatchAttendanceOperation {
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: CreateAttendanceRequest | UpdateAttendanceRequest;
  employeeId: EntityId;
  date: string;
}

export interface BatchOperationResult {
  successful: number;
  failed: number;
  errors: Array<{
    operation: BatchAttendanceOperation;
    error: string;
  }>;
  results: AttendanceRecord[];
}

// 출근 패턴 분석용
export interface AttendancePattern {
  employeeId: EntityId;
  period: string;
  patterns: {
    averageCheckInTime: string;
    averageCheckOutTime: string;
    mostCommonWorkDays: number[];
    averageWorkHours: number;
    punctualityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    attendanceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
  recommendations?: string[];
}

// 알림/경고 시스템용
export interface AttendanceAlert {
  id: EntityId;
  employeeId: EntityId;
  organizationId: EntityId;
  type: 'LATE_CHECKIN' | 'MISSING_CHECKOUT' | 'LONG_ABSENCE' | 'OVERTIME_LIMIT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Timestamp;
  acknowledged: boolean;
  acknowledgedBy?: EntityId;
  acknowledgedAt?: Timestamp;
}

// 내보내기
export {
  AttendanceStatus,
  AttendanceMethod,
  LocationData,
  DeviceInfo,
  EntityId,
  Timestamp,
  ApiResponse,
  PaginatedResponse
};

// 기본 내보내기
export default {
  AttendanceStatus,
  AttendanceMethod
};