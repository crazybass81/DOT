import { supabase } from '../../supabase-config';
import { AttendanceRecord, AttendanceStatus, LocationData, DeviceInfo } from '../models/attendance.model';

export class AttendanceRepository {
  private readonly tableName = 'attendance_records';

  /**
   * Check in an employee
   */
  async checkIn(
    employeeId: string,
    organizationId: string,
    location?: LocationData,
    deviceInfo?: DeviceInfo
  ): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already checked in today
    const { data: existingRecord } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single();

    if (existingRecord?.check_in_time) {
      throw new Error('Already checked in today');
    }

    const now = new Date().toISOString();
    
    // Create or update attendance record
    const { data, error } = await supabase
      .from(this.tableName)
      .upsert({
        employee_id: employeeId,
        organization_id: organizationId,
        date: today,
        check_in_time: now,
        status: AttendanceStatus.PRESENT,
        check_in_location: location,
        device_info: deviceInfo,
        created_at: now,
        updated_at: now
      }, {
        onConflict: 'employee_id,date'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Check-in failed: ${error.message}`);
    }

    return this.mapToAttendanceRecord(data);
  }

  /**
   * Check out an employee
   */
  async checkOut(employeeId: string, location?: LocationData): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's attendance record
    const { data: existingRecord, error: fetchError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single();

    if (fetchError || !existingRecord) {
      throw new Error('No check-in record found for today');
    }

    if (!existingRecord.check_in_time) {
      throw new Error('Not checked in yet');
    }

    if (existingRecord.check_out_time) {
      throw new Error('Already checked out today');
    }

    const now = new Date().toISOString();
    const checkInTime = new Date(existingRecord.check_in_time);
    const checkOutTime = new Date(now);
    const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    // Update attendance record with checkout
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        check_out_time: now,
        check_out_location: location,
        actual_work_hours: workHours,
        updated_at: now
      })
      .eq('employee_id', employeeId)
      .eq('date', today)
      .select()
      .single();

    if (error) {
      throw new Error(`Check-out failed: ${error.message}`);
    }

    return this.mapToAttendanceRecord(data);
  }

  /**
   * Get today's attendance for an employee
   */
  async getTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToAttendanceRecord(data);
  }

  /**
   * Get attendance history for an employee
   */
  async getAttendanceHistory(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch attendance history: ${error.message}`);
    }

    return (data || []).map(record => this.mapToAttendanceRecord(record));
  }

  /**
   * Get attendance by organization and date
   */
  async getOrganizationAttendance(
    organizationId: string,
    date: string
  ): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        employees!inner(
          name,
          email,
          department,
          position
        )
      `)
      .eq('organization_id', organizationId)
      .eq('date', date)
      .order('check_in_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch organization attendance: ${error.message}`);
    }

    return (data || []).map(record => this.mapToAttendanceRecord(record));
  }

  /**
   * Update attendance status
   */
  async updateAttendanceStatus(
    employeeId: string,
    date: string,
    status: AttendanceStatus,
    approvedBy?: string,
    notes?: string
  ): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        status,
        approved_by: approvedBy,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', employeeId)
      .eq('date', date)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update attendance status: ${error.message}`);
    }

    return this.mapToAttendanceRecord(data);
  }

  /**
   * Get attendance statistics for an employee
   */
  async getAttendanceStats(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    averageWorkHours: number;
  }> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('status, actual_work_hours')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      throw new Error(`Failed to fetch attendance stats: ${error.message}`);
    }

    const records = data || [];
    const stats = {
      totalDays: records.length,
      presentDays: records.filter(r => r.status === AttendanceStatus.PRESENT).length,
      absentDays: records.filter(r => r.status === AttendanceStatus.ABSENT).length,
      lateDays: records.filter(r => r.status === AttendanceStatus.LATE).length,
      averageWorkHours: 0
    };

    const workHours = records
      .filter(r => r.actual_work_hours)
      .map(r => r.actual_work_hours);
    
    if (workHours.length > 0) {
      stats.averageWorkHours = workHours.reduce((a, b) => a + b, 0) / workHours.length;
    }

    return stats;
  }

  /**
   * Map database record to AttendanceRecord model
   */
  private mapToAttendanceRecord(data: any): AttendanceRecord {
    return {
      attendanceId: data.id,
      employeeId: data.employee_id,
      date: data.date,
      checkInTime: data.check_in_time,
      checkOutTime: data.check_out_time,
      status: data.status,
      scheduledStartTime: data.scheduled_start_time,
      scheduledEndTime: data.scheduled_end_time,
      actualWorkHours: data.actual_work_hours,
      overtimeHours: data.overtime_hours,
      breakDuration: data.break_duration,
      checkInLocation: data.check_in_location,
      checkOutLocation: data.check_out_location,
      deviceInfo: data.device_info,
      organizationId: data.organization_id,
      departmentId: data.department_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      notes: data.notes,
      approvedBy: data.approved_by,
      modifiedBy: data.modified_by
    };
  }
}