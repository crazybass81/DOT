// _shared/models/attendance.model.ts
// Domain models following Single Responsibility Principle

export enum AttendanceStatus {
  NOT_WORKING = "NOT_WORKING",
  WORKING = "WORKING",
  ON_BREAK = "ON_BREAK",
  COMPLETED = "COMPLETED",
}

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  SUSPENDED = "SUSPENDED",
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string;
  check_out_time?: string;
  check_in_location?: string;
  check_out_location?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_out_latitude?: number;
  check_out_longitude?: number;
  status: AttendanceStatus;
  working_minutes: number;
  break_minutes: number;
  total_work_minutes?: number;
  actual_work_minutes?: number;
  current_break_start?: string;
  created_at: string;
  updated_at: string;
}

export interface Break {
  id: string;
  attendance_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  status: "ACTIVE" | "COMPLETED";
  created_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  branch_id?: string;
  department_id?: string;
  position_id?: string;
  approval_status: ApprovalStatus;
  is_active: boolean;
  qr_registered: boolean;
  qr_registered_at?: string;
  qr_registered_device_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  employeeId: string;
  period: {
    start: string;
    end: string;
  };
  totalDays: number;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  averageWorkHours: number;
  attendanceRate: number;
  records: Attendance[];
}