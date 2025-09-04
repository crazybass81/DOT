// =====================================================
// Attendance Service Type Definitions
// Based on user-permission-diagram.md specifications
// =====================================================

// =====================================================
// Enums
// =====================================================

export enum UserRole {
  MasterAdmin = 'master_admin',
  Admin = 'admin',
  Manager = 'manager',
  Worker = 'worker',
}

export enum AttendanceStatus {
  Present = 'present',
  Late = 'late',
  Absent = 'absent',
  HalfDay = 'half_day',
  Holiday = 'holiday',
  Leave = 'leave',
}

export enum SyncStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum NotificationType {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Success = 'success',
}

// =====================================================
// Database Tables Interfaces
// =====================================================

export interface Organization {
  id: string
  name: string
  subscription_tier: string
  settings: Record<string, any>
  max_employees: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  encrypted_password: string
  role: UserRole
  organization_id?: string | null
  is_active: boolean
  last_login?: string | null
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  user_id: string
  organization_id: string
  employee_code: string
  first_name: string
  last_name: string
  department?: string | null
  position?: string | null
  manager_id?: string | null
  hire_date: string
  phone?: string | null
  emergency_contact: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  user?: User
  organization?: Organization
  manager?: Employee
}

export interface Location {
  id: string
  organization_id: string
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  radius_meters: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  organization?: Organization
}

export interface Shift {
  id: string
  organization_id: string
  name: string
  start_time: string  // HH:MM format
  end_time: string    // HH:MM format
  break_duration: number  // in minutes
  days_of_week: number[]  // 1=Monday, 7=Sunday
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  organization?: Organization
}

export interface EmployeeShift {
  id: string
  employee_id: string
  shift_id: string
  start_date: string
  end_date?: string | null
  created_at: string
  updated_at: string
  // Relations
  employee?: Employee
  shift?: Shift
}

export interface Attendance {
  id: string
  employee_id: string
  date: string
  check_in_time?: string | null
  check_out_time?: string | null
  check_in_location_id?: string | null
  check_out_location_id?: string | null
  shift_id?: string | null
  status: AttendanceStatus
  late_minutes: number
  overtime_minutes: number
  break_duration: number
  notes?: string | null
  approved_by?: string | null
  created_at: string
  updated_at: string
  // Relations
  employee?: Employee
  check_in_location?: Location
  check_out_location?: Location
  shift?: Shift
  approver?: User
}

export interface Permission {
  id: string
  role: UserRole
  resource: string
  action: string
  conditions: Record<string, any>
  created_at: string
  updated_at: string
}

export interface RoleTemplate {
  id: string
  organization_id?: string | null
  name: string
  base_role: UserRole
  custom_permissions: any[]
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  organization?: Organization
}

export interface UserRoleAssignment {
  id: string
  user_id: string
  role_template_id?: string | null
  assigned_by: string
  valid_from: string
  valid_until?: string | null
  created_at: string
  // Relations
  user?: User
  role_template?: RoleTemplate
  assignor?: User
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message?: string | null
  data: Record<string, any>
  read: boolean
  read_at?: string | null
  created_at: string
  // Relations
  user?: User
}

export interface AuditLog {
  id: string
  user_id?: string | null
  organization_id?: string | null
  action: string
  resource: string
  resource_id?: string | null
  changes: Record<string, any>
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
  // Relations
  user?: User
  organization?: Organization
}

export interface SyncQueue {
  id: string
  organization_id?: string | null
  operation: string
  entity_type: string
  entity_id?: string | null
  data: Record<string, any>
  status: SyncStatus
  retry_count: number
  last_error?: string | null
  created_at: string
  processed_at?: string | null
  // Relations
  organization?: Organization
}

// =====================================================
// Permission System Types
// =====================================================

export interface PermissionCheck {
  user: User
  resource: string
  action: string
  organizationId?: string
  resourceId?: string
}

export interface PermissionResult {
  allowed: boolean
  reason?: string
  conditions?: Record<string, any>
}

// =====================================================
// API Request/Response Types
// =====================================================

export interface AuthSignupRequest {
  email: string
  password: string
  role: UserRole
  organizationId?: string
  employeeData?: {
    firstName: string
    lastName: string
    employeeCode: string
    department?: string
    position?: string
    hireDate: string
    phone?: string
  }
}

export interface AttendanceCheckRequest {
  type: 'check_in' | 'check_out'
  locationId?: string
  latitude?: number
  longitude?: number
  notes?: string
}

export interface AttendanceReportRequest {
  startDate: string
  endDate: string
  employeeIds?: string[]
  departmentFilter?: string
  reportType: 'summary' | 'detailed' | 'export'
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// =====================================================
// Real-time Subscription Types
// =====================================================

export interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T | null
  old: T | null
  schema: string
  table: string
  commit_timestamp: string
}

export interface AttendanceSubscription {
  organizationId: string
  employeeIds?: string[]
  onAttendanceChange: (payload: RealtimePayload<Attendance>) => void
}

// =====================================================
// Utility Types
// =====================================================

export type WithTimestamps<T> = T & {
  created_at: string
  updated_at: string
}

export type Nullable<T> = T | null

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

export type RoleHierarchy = {
  [K in UserRole]: number
}

export const ROLE_HIERARCHY: RoleHierarchy = {
  [UserRole.MasterAdmin]: 4,
  [UserRole.Admin]: 3,
  [UserRole.Manager]: 2,
  [UserRole.Worker]: 1,
}