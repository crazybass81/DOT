// 통합 출근 관리 모델 (공통 타입 사용)
import { 
  AttendanceRecord as CommonAttendanceRecord,
  AttendanceStatus,
  AttendanceMethod,
  LocationData,
  DeviceInfo
} from '../../types/common-attendance-types';

// Supabase 데이터베이스용 출근 기록 (공통 타입 확장)
export interface AttendanceRecord extends CommonAttendanceRecord {
  // 기본 식별자 (공통 타입과 호환성 유지)
  attendanceId?: string; // 레거시 호환성을 위해 선택적으로 유지
}
  
  // Work Details
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  actualWorkHours?: number;
  overtimeHours?: number;
  breakDuration?: number; // in minutes
  
  // Location & Device
  checkInLocation?: LocationData;
  checkOutLocation?: LocationData;
  deviceInfo?: DeviceInfo;
  
  // Organization
  organizationId: string;
  departmentId?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  notes?: string;
  approvedBy?: string;
  modifiedBy?: string;
}

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
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  timestamp: string;
}

export interface DeviceInfo {
  deviceId?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Employee Model
export interface Employee {
  // Primary Key
  employeeId: string;
  organizationId: string;
  
  // Personal Information
  name: string;
  email: string;
  phone?: string;
  employeeCode?: string;
  
  // Work Information
  departmentId?: string;
  departmentName?: string;
  position?: string;
  role?: EmployeeRole;
  managerId?: string;
  
  // Employment Details
  joinDate?: string;
  employmentType?: EmploymentType;
  workSchedule?: WorkSchedule;
  
  // Authentication
  userId?: string; // Supabase Auth User ID
  
  // Status
  isActive: boolean;
  lastActive?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export enum EmployeeRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  HR = 'HR',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
  FREELANCE = 'FREELANCE',
}

export interface WorkSchedule {
  type: 'FIXED' | 'FLEXIBLE' | 'SHIFT';
  standardHours?: number; // per week
  startTime?: string;     // Default start time
  endTime?: string;       // Default end time
  workDays?: number[];    // 0=Sunday, 6=Saturday
}

// Schedule Model
export interface Schedule {
  // Primary Key
  scheduleId: string;
  employeeId: string;
  
  // Schedule Details
  date: string;
  startTime: string;
  endTime: string;
  scheduleType: ScheduleType;
  
  // Shift Information
  shiftName?: string;
  shiftCode?: string;
  
  // Status
  status: ScheduleStatus;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  
  // Organization
  organizationId: string;
  departmentId?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  approvedBy?: string;
}

export enum ScheduleType {
  REGULAR = 'REGULAR',
  OVERTIME = 'OVERTIME',
  SHIFT = 'SHIFT',
  ON_CALL = 'ON_CALL',
  TRAINING = 'TRAINING',
}

export enum ScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export interface RecurringPattern {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string;
}

// Statistics Model for Aggregations
export interface AttendanceStatistics {
  employeeId: string;
  period: string; // YYYY-MM or YYYY
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  totalWorkHours: number;
  overtimeHours: number;
  averageCheckInTime?: string;
  averageCheckOutTime?: string;
  attendanceRate: number; // percentage
}