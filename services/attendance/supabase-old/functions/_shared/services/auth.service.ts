// _shared/services/auth.service.ts
// Single Responsibility: 인증 및 권한 확인만 담당

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { IAuthService } from "../interfaces/attendance.interface.ts";
import { ApprovalStatus, Employee } from "../models/attendance.model.ts";

export class AuthService implements IAuthService {
  constructor(private supabase: SupabaseClient) {}

  async checkEmployeeApprovalStatus(employeeId: string): Promise<string> {
    const { data: employee, error } = await this.supabase
      .from("employees")
      .select("approval_status, is_active")
      .eq("id", employeeId)
      .single();

    if (error || !employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    if (!employee.is_active) {
      return ApprovalStatus.SUSPENDED;
    }

    return employee.approval_status || ApprovalStatus.PENDING;
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async getEmployeeById(employeeId: string): Promise<Employee> {
    const { data: employee, error } = await this.supabase
      .from("employees")
      .select(`
        *,
        branches (
          id,
          name,
          organization_id
        ),
        departments (
          id,
          name
        ),
        positions (
          id,
          name
        )
      `)
      .eq("id", employeeId)
      .single();

    if (error || !employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    return employee;
  }

  async getEmployeeByEmail(email: string): Promise<Employee> {
    const { data: employee, error } = await this.supabase
      .from("employees")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !employee) {
      throw new Error(`Employee not found with email: ${email}`);
    }

    return employee;
  }

  async getEmployeeByDeviceId(deviceId: string): Promise<Employee | null> {
    const { data: employee, error } = await this.supabase
      .from("employees")
      .select("*")
      .eq("qr_registered_device_id", deviceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return null;
      }
      throw new Error(`Error fetching employee: ${error.message}`);
    }

    return employee;
  }

  async updateEmployeeApprovalStatus(
    employeeId: string,
    status: ApprovalStatus,
    approvedBy?: string,
    rejectionReason?: string
  ): Promise<void> {
    const updateData: any = {
      approval_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === ApprovalStatus.APPROVED) {
      updateData.is_active = true;
      updateData.approved_by = approvedBy;
      updateData.approved_at = new Date().toISOString();
    } else if (status === ApprovalStatus.REJECTED) {
      updateData.is_active = false;
      updateData.rejected_by = approvedBy;
      updateData.rejected_at = new Date().toISOString();
      updateData.rejection_reason = rejectionReason;
    }

    const { error } = await this.supabase
      .from("employees")
      .update(updateData)
      .eq("id", employeeId);

    if (error) {
      throw new Error(`Failed to update approval status: ${error.message}`);
    }
  }

  async checkMasterAdminStatus(employeeId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("employees")
      .select("is_master_admin")
      .eq("id", employeeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found - employee doesn't exist
        return false;
      }
      throw new Error(`Failed to check master admin status: ${error.message}`);
    }

    return data.is_master_admin === true;
  }
}