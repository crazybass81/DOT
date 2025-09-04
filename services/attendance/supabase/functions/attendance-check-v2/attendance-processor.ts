// Attendance Processing Module
import { configService } from '../_shared/config.ts'

interface ProcessResult {
  success: boolean
  data?: any
  message?: string
  error?: string
}

/**
 * Process employee check-in
 */
export async function processCheckIn(
  supabase: any,
  employee: any,
  locationId: string | null,
  verificationMethod: string,
  deviceId: string | undefined,
  ipAddress: string | undefined,
  config: any
): Promise<ProcessResult> {
  const currentDate = new Date().toISOString().split('T')[0]
  const currentTime = new Date().toISOString()

  // Check if already checked in today
  const { data: existingAttendance } = await supabase
    .from('attendance')
    .select('id, check_in_time')
    .eq('employee_id', employee.id)
    .eq('date', currentDate)
    .single()

  if (existingAttendance?.check_in_time) {
    return {
      success: false,
      error: 'Already checked in today'
    }
  }

  // Determine attendance status based on configuration
  const status = configService.getAttendanceStatus(new Date(), config)

  // Create or update attendance record
  const attendanceData = {
    employee_id: employee.id,
    organization_id: employee.organization_id,
    date: currentDate,
    check_in_time: currentTime,
    check_in_location_id: locationId,
    status,
    verification_method: verificationMethod,
    device_id: deviceId,
    ip_address: ipAddress
  }

  const { data: attendance, error } = existingAttendance
    ? await supabase
        .from('attendance')
        .update(attendanceData)
        .eq('id', existingAttendance.id)
        .select()
        .single()
    : await supabase
        .from('attendance')
        .insert(attendanceData)
        .select()
        .single()

  if (error) {
    console.error('Check-in error:', error)
    return {
      success: false,
      error: 'Failed to record check-in'
    }
  }

  // Send notification if configured
  if (config.notificationSettings.lateArrival && status === 'late') {
    await sendNotification(supabase, {
      userId: employee.user_id,
      type: 'late_arrival',
      message: `Late check-in recorded at ${new Date().toLocaleTimeString()}`
    })
  }

  return {
    success: true,
    data: attendance,
    message: `Check-in successful${status === 'late' ? ' (Late arrival)' : ''}`
  }
}

/**
 * Process employee check-out
 */
export async function processCheckOut(
  supabase: any,
  employee: any,
  locationId: string | null,
  config: any
): Promise<ProcessResult> {
  const currentDate = new Date().toISOString().split('T')[0]
  const currentTime = new Date().toISOString()

  // Find today's attendance record
  const { data: attendance, error: fetchError } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('date', currentDate)
    .is('check_out_time', null)
    .single()

  if (fetchError || !attendance) {
    return {
      success: false,
      error: 'No check-in record found for today'
    }
  }

  // Calculate work duration and overtime
  const checkInTime = new Date(attendance.check_in_time)
  const checkOutTime = new Date(currentTime)
  const workDurationMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60))
  
  // Calculate overtime based on configuration
  const overtimeMinutes = configService.calculateOvertime(workDurationMinutes, config)
  
  // Check if early departure
  const isEarlyDeparture = configService.isEarlyCheckOut(checkOutTime, config)

  // Update attendance record
  const { data: updatedAttendance, error: updateError } = await supabase
    .from('attendance')
    .update({
      check_out_time: currentTime,
      check_out_location_id: locationId,
      work_duration_minutes: workDurationMinutes,
      overtime_minutes: overtimeMinutes,
      early_departure: isEarlyDeparture
    })
    .eq('id', attendance.id)
    .select()
    .single()

  if (updateError) {
    console.error('Check-out error:', updateError)
    return {
      success: false,
      error: 'Failed to record check-out'
    }
  }

  // Send notifications based on configuration
  if (config.notificationSettings.overtime && overtimeMinutes > 0) {
    await sendNotification(supabase, {
      userId: employee.user_id,
      type: 'overtime',
      message: `Overtime recorded: ${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m`
    })
  }

  if (config.notificationSettings.earlyDeparture && isEarlyDeparture) {
    await sendNotification(supabase, {
      userId: employee.user_id,
      type: 'early_departure',
      message: `Early departure recorded at ${new Date().toLocaleTimeString()}`
    })
  }

  const workHours = Math.floor(workDurationMinutes / 60)
  const workMinutes = workDurationMinutes % 60
  const overtimeHours = Math.floor(overtimeMinutes / 60)
  const overtimeMin = overtimeMinutes % 60

  return {
    success: true,
    data: {
      ...updatedAttendance,
      workDuration: {
        hours: workHours,
        minutes: workMinutes,
        formatted: `${workHours}h ${workMinutes}m`
      },
      overtime: overtimeMinutes > 0 ? {
        hours: overtimeHours,
        minutes: overtimeMin,
        formatted: `${overtimeHours}h ${overtimeMin}m`
      } : null
    },
    message: `Check-out successful. Work duration: ${workHours}h ${workMinutes}m${overtimeMinutes > 0 ? ` (Overtime: ${overtimeHours}h ${overtimeMin}m)` : ''}`
  }
}

/**
 * Send notification helper
 */
async function sendNotification(supabase: any, notification: any): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: notification.userId,
      type: notification.type,
      title: notification.title || notification.type.replace(/_/g, ' ').toUpperCase(),
      message: notification.message,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}