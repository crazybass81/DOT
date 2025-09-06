// _shared/services/approval.service.ts
// Single Responsibility: 승인 관련 비즈니스 로직만 담당
// Interface Segregation: 필요한 메서드만 노출

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export interface IApprovalService {
  approveEmployee(data: ApprovalData): Promise<any>;
  rejectEmployee(data: RejectionData): Promise<any>;
  getPendingEmployees(params: PaginationParams): Promise<PaginatedResult>;
  registerEmployee(data: RegistrationData): Promise<any>;
  checkEmailExists(email: string): Promise<boolean>;
  checkDeviceExists(deviceId: string): Promise<boolean>;
}

export interface ApprovalData {
  employeeId: string;
  approvedBy: string;
  approvedAt: string;
}

export interface RejectionData {
  employeeId: string;
  rejectedBy: string;
  rejectedAt: string;
  rejectionReason: string;
}

export interface RegistrationData {
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  deviceId: string;
  approvalStatus: string;
  createdAt: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult {
  data: any[];
  totalRecords: number;
}

export class ApprovalService implements IApprovalService {
  constructor(private supabase: SupabaseClient) {}

  async approveEmployee(data: ApprovalData): Promise<any> {
    const { employeeId, approvedBy, approvedAt } = data;

    // Get employee record
    const { data: employee, error: fetchError } = await this.supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .single();

    if (fetchError || !employee) {
      throw new Error("Employee not found");
    }

    if (employee.approval_status === "APPROVED") {
      throw new Error("Employee already approved");
    }

    if (employee.approval_status === "REJECTED") {
      throw new Error("Employee was rejected. Cannot approve rejected employee.");
    }

    // Update employee status
    const { data: updatedEmployee, error: updateError } = await this.supabase
      .from("employees")
      .update({
        approval_status: "APPROVED",
        approved_by: approvedBy,
        approved_at: approvedAt,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to approve employee: ${updateError.message}`);
    }

    // Create approval history record
    await this.createApprovalHistory({
      employeeId,
      action: "APPROVED",
      performedBy: approvedBy,
      performedAt: approvedAt,
      reason: null,
    });

    return updatedEmployee;
  }

  async rejectEmployee(data: RejectionData): Promise<any> {
    const { employeeId, rejectedBy, rejectedAt, rejectionReason } = data;

    // Get employee record
    const { data: employee, error: fetchError } = await this.supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .single();

    if (fetchError || !employee) {
      throw new Error("Employee not found");
    }

    if (employee.approval_status !== "PENDING") {
      throw new Error("Employee already processed");
    }

    // Update employee status
    const { data: updatedEmployee, error: updateError } = await this.supabase
      .from("employees")
      .update({
        approval_status: "REJECTED",
        rejected_by: rejectedBy,
        rejected_at: rejectedAt,
        rejection_reason: rejectionReason,
        approved_by: null,
        approved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to reject employee: ${updateError.message}`);
    }

    // Create approval history record
    await this.createApprovalHistory({
      employeeId,
      action: "REJECTED",
      performedBy: rejectedBy,
      performedAt: rejectedAt,
      reason: rejectionReason,
    });

    return updatedEmployee;
  }

  async getPendingEmployees(params: PaginationParams): Promise<PaginatedResult> {
    const { page, limit } = params;
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase
      .from("employees")
      .select("*", { count: "exact" })
      .eq("approval_status", "PENDING")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get pending employees: ${error.message}`);
    }

    return {
      data: data || [],
      totalRecords: count || 0,
    };
  }

  async registerEmployee(data: RegistrationData): Promise<any> {
    const { name, email, phone, department, position, deviceId, approvalStatus, createdAt } = data;

    // Create employee record
    const { data: employee, error } = await this.supabase
      .from("employees")
      .insert({
        name,
        email,
        phone,
        department,
        position,
        device_id: deviceId,
        approval_status: approvalStatus,
        created_at: createdAt,
        updated_at: createdAt,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register employee: ${error.message}`);
    }

    // Create registration history record
    await this.createApprovalHistory({
      employeeId: employee.id,
      action: "REGISTERED",
      performedBy: employee.id, // Self-registration
      performedAt: createdAt,
      reason: null,
    });

    return employee;
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("employees")
      .select("id")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = No rows found
      throw new Error(`Failed to check email: ${error.message}`);
    }

    return !!data;
  }

  async checkDeviceExists(deviceId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("employees")
      .select("id")
      .eq("device_id", deviceId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = No rows found
      throw new Error(`Failed to check device: ${error.message}`);
    }

    return !!data;
  }

  private async createApprovalHistory(data: {
    employeeId: string;
    action: string;
    performedBy: string;
    performedAt: string;
    reason: string | null;
  }): Promise<void> {
    const { error } = await this.supabase
      .from("approval_history")
      .insert({
        employee_id: data.employeeId,
        action: data.action,
        performed_by: data.performedBy,
        performed_at: data.performedAt,
        reason: data.reason,
      });

    if (error) {
      console.error("Failed to create approval history:", error);
      // Don't throw - this is not critical for the main operation
    }
  }
}