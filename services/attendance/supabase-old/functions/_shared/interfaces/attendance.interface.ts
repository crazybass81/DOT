// _shared/interfaces/attendance.interface.ts
// Interface Segregation Principle: 클라이언트가 필요하지 않은 메서드에 의존하지 않도록 인터페이스를 분리

export interface CheckInData {
  employeeId: string;
  locationId: string;
  latitude: number;
  longitude: number;
}

export interface CheckOutData extends CheckInData {}

export interface BreakData {
  employeeId: string;
  attendanceId?: string;
}

export interface IAttendanceService {
  checkIn(data: CheckInData): Promise<any>;
  checkOut(data: CheckOutData): Promise<any>;
  startBreak(data: BreakData): Promise<any>;
  endBreak(data: BreakData): Promise<any>;
  getTodayAttendance(employeeId: string): Promise<any>;
  getAttendanceHistory(employeeId: string, startDate: string, endDate: string): Promise<any[]>;
  getAttendanceStatus(employeeId: string): Promise<any>;
}

export interface IAuthService {
  checkEmployeeApprovalStatus(employeeId: string): Promise<string>;
  validateToken(token: string): Promise<boolean>;
  getEmployeeById(employeeId: string): Promise<any>;
}

export interface IValidationService {
  validateCheckInData(data: CheckInData): ValidationResult;
  validateCheckOutData(data: CheckOutData): ValidationResult;
  validateBreakAction(action: string): ValidationResult;
  validateDateRange(startDate: string, endDate: string): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: string[];
}