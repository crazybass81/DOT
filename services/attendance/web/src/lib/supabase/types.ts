/**
 * TDD Phase 2: GREEN - Database Type Definitions
 * Complete type definitions based on user-permission-diagram.md schema
 */

export interface Database {
  public: {
    Tables: {
      // Core organization structure
      organizations: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          logo_url: string | null;
          is_active: boolean;
          settings: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };

      // Employee management
      employees: {
        Row: {
          id: string;
          auth_user_id: string | null;
          organization_id: string;
          branch_id: string | null;
          department_id: string | null;
          position_id: string | null;
          employee_code: string | null;
          name: string;
          email: string;
          phone: string | null;
          password_hash: string | null;
          device_id: string | null;
          qr_registered_device_id: string | null;
          fcm_token: string | null;
          approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
          approved_by: string | null;
          approved_at: string | null;
          rejected_by: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
          is_master_admin: boolean;
          is_active: boolean;
          avatar_url: string | null;
          date_of_birth: string | null;
          join_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['employees']['Insert']>;
      };

      // Attendance records
      attendance_records: {
        Row: {
          id: string;
          employee_id: string;
          organization_id: string;
          date: string;
          check_in_time: string | null;
          check_out_time: string | null;
          break_start_time: string | null;
          break_end_time: string | null;
          overtime_start: string | null;
          overtime_end: string | null;
          status: 'CHECKED_IN' | 'CHECKED_OUT' | 'BREAK_START' | 'BREAK_END' | 'ABSENT' | 'HOLIDAY' | 'LEAVE';
          check_in_location: unknown | null; // PostGIS point type
          check_out_location: unknown | null; // PostGIS point type
          check_in_method: 'QR' | 'GPS' | 'MANUAL' | 'BIOMETRIC' | null;
          check_out_method: 'QR' | 'GPS' | 'MANUAL' | 'BIOMETRIC' | null;
          work_hours: number | null;
          overtime_hours: number | null;
          is_late: boolean;
          is_early_leave: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attendance_records']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['attendance_records']['Insert']>;
      };

      // Work schedules
      schedules: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          type: 'FIXED' | 'FLEXIBLE' | 'SHIFT';
          start_time: string;
          end_time: string;
          break_duration: number; // in minutes
          working_days: string[]; // Array of day names
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['schedules']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['schedules']['Insert']>;
      };

      // Branches
      branches: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string | null;
          address: string | null;
          location: unknown | null; // PostGIS point
          radius_meters: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['branches']['Insert']>;
      };

      // Departments
      departments: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string | null;
          name: string;
          code: string | null;
          description: string | null;
          parent_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['departments']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };

      // Positions
      positions: {
        Row: {
          id: string;
          organization_id: string;
          department_id: string | null;
          name: string;
          code: string | null;
          level: number | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['positions']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['positions']['Insert']>;
      };

      // Leave requests
      leave_requests: {
        Row: {
          id: string;
          employee_id: string;
          organization_id: string;
          leave_type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY' | 'OTHER';
          start_date: string;
          end_date: string;
          reason: string | null;
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
          approved_by: string | null;
          approved_at: string | null;
          rejected_by: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leave_requests']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leave_requests']['Insert']>;
      };

      // Health check table (for testing)
      _health_check: {
        Row: {
          id: number;
          timestamp: string;
        };
        Insert: {
          id?: number;
          timestamp?: string;
        };
        Update: Partial<Database['public']['Tables']['_health_check']['Insert']>;
      };
    };

    Views: {
      // Attendance summary view
      attendance_summary: {
        Row: {
          employee_id: string;
          employee_name: string;
          date: string;
          check_in_time: string | null;
          check_out_time: string | null;
          work_hours: number | null;
          status: string;
        };
      };

      // Employee details view
      employee_details: {
        Row: {
          id: string;
          name: string;
          email: string;
          organization_name: string;
          branch_name: string | null;
          department_name: string | null;
          position_name: string | null;
          role: string;
          approval_status: string;
        };
      };
    };

    Functions: {
      // Check-in function
      check_in: {
        Args: {
          p_employee_id: string;
          p_location?: unknown;
          p_method?: string;
        };
        Returns: {
          success: boolean;
          message: string;
          record_id: string | null;
        };
      };

      // Calculate work hours
      calculate_work_hours: {
        Args: {
          p_check_in: string;
          p_check_out: string;
          p_break_duration?: number;
        };
        Returns: number;
      };
    };

    Enums: {
      user_role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
      approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
      attendance_status: 'CHECKED_IN' | 'CHECKED_OUT' | 'BREAK_START' | 'BREAK_END' | 'ABSENT' | 'HOLIDAY' | 'LEAVE';
      leave_type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY' | 'OTHER';
      check_method: 'QR' | 'GPS' | 'MANUAL' | 'BIOMETRIC';
      schedule_type: 'FIXED' | 'FLEXIBLE' | 'SHIFT';
    };
  };
}

// Export type aliases for convenience
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type Employee = Database['public']['Tables']['employees']['Row'];
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];
export type Schedule = Database['public']['Tables']['schedules']['Row'];
export type Branch = Database['public']['Tables']['branches']['Row'];
export type Department = Database['public']['Tables']['departments']['Row'];
export type Position = Database['public']['Tables']['positions']['Row'];
export type LeaveRequest = Database['public']['Tables']['leave_requests']['Row'];

// Enum exports
export type UserRole = Database['public']['Enums']['user_role'];
export type ApprovalStatus = Database['public']['Enums']['approval_status'];
export type AttendanceStatus = Database['public']['Enums']['attendance_status'];
export type LeaveType = Database['public']['Enums']['leave_type'];
export type CheckMethod = Database['public']['Enums']['check_method'];
export type ScheduleType = Database['public']['Enums']['schedule_type'];