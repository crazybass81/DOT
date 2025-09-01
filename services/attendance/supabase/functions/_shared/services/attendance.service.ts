// _shared/services/attendance.service.ts
// Single Responsibility: 근태 관련 비즈니스 로직만 담당
// Interface Segregation: 필요한 메서드만 노출

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { IAttendanceService, CheckInData, CheckOutData, BreakData } from "../interfaces/attendance.interface.ts";
import { Attendance, AttendanceStatus } from "../models/attendance.model.ts";

export class AttendanceService implements IAttendanceService {
  constructor(private supabase: SupabaseClient) {}

  async checkIn(data: CheckInData): Promise<Attendance> {
    const { employeeId, locationId, latitude, longitude } = data;
    
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    const { data: attendance, error } = await this.supabase
      .from("attendance")
      .insert({
        employee_id: employeeId,
        date: today,
        check_in_time: now,
        check_in_location: locationId,
        check_in_latitude: latitude,
        check_in_longitude: longitude,
        status: AttendanceStatus.WORKING,
        working_minutes: 0,
        break_minutes: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Check-in failed: ${error.message}`);
    }

    return attendance;
  }

  async checkOut(data: CheckOutData): Promise<Attendance> {
    const { employeeId, locationId, latitude, longitude } = data;
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Get today's attendance record
    const { data: existingAttendance, error: fetchError } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .single();

    if (fetchError || !existingAttendance) {
      throw new Error("No check-in record found for today");
    }

    if (existingAttendance.check_out_time) {
      throw new Error("Already checked out");
    }

    // Auto-end any active break
    let autoEndedBreak = false;
    if (existingAttendance.status === AttendanceStatus.ON_BREAK) {
      await this.endBreak({ employeeId, attendanceId: existingAttendance.id });
      autoEndedBreak = true;
    }

    // Calculate total working minutes
    const checkInTime = new Date(existingAttendance.check_in_time);
    const checkOutTime = new Date(now);
    const totalMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000);
    const actualWorkMinutes = totalMinutes - (existingAttendance.break_minutes || 0);

    // Update attendance record
    const { data: updatedAttendance, error: updateError } = await this.supabase
      .from("attendance")
      .update({
        check_out_time: now,
        check_out_location: locationId,
        check_out_latitude: latitude,
        check_out_longitude: longitude,
        status: AttendanceStatus.COMPLETED,
        total_work_minutes: totalMinutes,
        actual_work_minutes: actualWorkMinutes,
      })
      .eq("id", existingAttendance.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Check-out failed: ${updateError.message}`);
    }

    return { ...updatedAttendance, autoEndedBreak };
  }

  async startBreak(data: BreakData): Promise<Attendance> {
    const { employeeId, attendanceId } = data;
    
    const now = new Date().toISOString();

    // Get attendance record
    const { data: attendance, error: fetchError } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("id", attendanceId)
      .eq("employee_id", employeeId)
      .single();

    if (fetchError || !attendance) {
      throw new Error("Attendance record not found");
    }

    if (attendance.status !== AttendanceStatus.WORKING) {
      throw new Error("Cannot start break - not in working status");
    }

    // Create break record
    const { error: breakError } = await this.supabase
      .from("breaks")
      .insert({
        attendance_id: attendanceId,
        start_time: now,
        status: "ACTIVE",
      });

    if (breakError) {
      throw new Error(`Failed to start break: ${breakError.message}`);
    }

    // Update attendance status
    const { data: updatedAttendance, error: updateError } = await this.supabase
      .from("attendance")
      .update({
        status: AttendanceStatus.ON_BREAK,
        current_break_start: now,
      })
      .eq("id", attendanceId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update attendance status: ${updateError.message}`);
    }

    return updatedAttendance;
  }

  async endBreak(data: BreakData): Promise<Attendance> {
    const { employeeId, attendanceId } = data;
    
    const now = new Date().toISOString();

    // Get attendance record
    const { data: attendance, error: fetchError } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("id", attendanceId)
      .eq("employee_id", employeeId)
      .single();

    if (fetchError || !attendance) {
      throw new Error("Attendance record not found");
    }

    if (attendance.status !== AttendanceStatus.ON_BREAK) {
      throw new Error("Not on break");
    }

    // Get active break record
    const { data: activeBreak, error: breakFetchError } = await this.supabase
      .from("breaks")
      .select("*")
      .eq("attendance_id", attendanceId)
      .eq("status", "ACTIVE")
      .single();

    if (breakFetchError || !activeBreak) {
      throw new Error("No active break found");
    }

    // Calculate break duration
    const breakStart = new Date(activeBreak.start_time);
    const breakEnd = new Date(now);
    const breakDuration = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);

    // Update break record
    const { error: breakUpdateError } = await this.supabase
      .from("breaks")
      .update({
        end_time: now,
        duration_minutes: breakDuration,
        status: "COMPLETED",
      })
      .eq("id", activeBreak.id);

    if (breakUpdateError) {
      throw new Error(`Failed to end break: ${breakUpdateError.message}`);
    }

    // Update attendance record
    const newBreakMinutes = (attendance.break_minutes || 0) + breakDuration;
    
    const { data: updatedAttendance, error: updateError } = await this.supabase
      .from("attendance")
      .update({
        status: AttendanceStatus.WORKING,
        break_minutes: newBreakMinutes,
        current_break_start: null,
      })
      .eq("id", attendanceId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update attendance: ${updateError.message}`);
    }

    return {
      ...updatedAttendance,
      breakEndTime: now,
      breakDuration,
    };
  }

  async getTodayAttendance(employeeId: string): Promise<Attendance | null> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return null;
      }
      throw new Error(`Failed to get attendance: ${error.message}`);
    }

    return data;
  }

  async getAttendanceHistory(
    employeeId: string, 
    startDate: string, 
    endDate: string
  ): Promise<Attendance[]> {
    const { data, error } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) {
      throw new Error(`Failed to get attendance history: ${error.message}`);
    }

    return data || [];
  }

  async getAttendanceStatus(employeeId: string): Promise<{
    currentStatus: AttendanceStatus;
    today: Attendance | null;
  }> {
    const today = await this.getTodayAttendance(employeeId);
    
    if (!today) {
      return {
        currentStatus: AttendanceStatus.NOT_WORKING,
        today: null,
      };
    }

    return {
      currentStatus: today.status as AttendanceStatus,
      today,
    };
  }
}