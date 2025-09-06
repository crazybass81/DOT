// Edge Function: Attendance Analytics
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AnalyticsRequest {
  type: 'summary' | 'trends' | 'employee' | 'department' | 'overtime' | 'patterns'
  organizationId: string
  startDate: string
  endDate: string
  employeeId?: string
  departmentId?: string
  groupBy?: 'day' | 'week' | 'month'
}

interface AttendanceSummary {
  totalEmployees: number
  presentToday: number
  absentToday: number
  onLeave: number
  lateArrivals: number
  earlyDepartures: number
  overtimeHours: number
  averageWorkHours: number
  attendanceRate: number
}

interface TrendData {
  date: string
  present: number
  absent: number
  late: number
  overtime: number
  attendanceRate: number
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get JWT from header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const body: AnalyticsRequest = await req.json()
    const { type, organizationId, startDate, endDate, employeeId, departmentId, groupBy = 'day' } = body

    // Check permissions - only managers and admins can view analytics
    const { data: userEmployee } = await supabase
      .from('employees')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!userEmployee || userEmployee.role === 'worker') {
      return new Response(
        JSON.stringify({ error: 'Permission denied. Analytics access requires manager or admin role.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle different analytics types
    let result: any = {}

    switch (type) {
      case 'summary':
        result = await getAttendanceSummary(supabase, organizationId, startDate, endDate)
        break

      case 'trends':
        result = await getAttendanceTrends(supabase, organizationId, startDate, endDate, groupBy)
        break

      case 'employee':
        if (!employeeId) {
          return new Response(
            JSON.stringify({ error: 'Employee ID required for employee analytics' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getEmployeeAnalytics(supabase, employeeId, startDate, endDate)
        break

      case 'department':
        if (!departmentId) {
          return new Response(
            JSON.stringify({ error: 'Department ID required for department analytics' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getDepartmentAnalytics(supabase, departmentId, startDate, endDate)
        break

      case 'overtime':
        result = await getOvertimeAnalytics(supabase, organizationId, startDate, endDate)
        break

      case 'patterns':
        result = await getAttendancePatterns(supabase, organizationId, startDate, endDate)
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid analytics type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Log analytics access
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: user.id,
      action: `analytics.${type}`,
      resource_type: 'analytics',
      metadata: { startDate, endDate, employeeId, departmentId }
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        data: result,
        period: { startDate, endDate }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Analytics error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Get attendance summary statistics
async function getAttendanceSummary(supabase: any, organizationId: string, startDate: string, endDate: string): Promise<AttendanceSummary> {
  // Get all employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const totalEmployees = employees?.length || 0
  const today = new Date().toISOString().split('T')[0]

  // Get today's attendance
  const { data: todayAttendance } = await supabase
    .from('attendance')
    .select('employee_id, status, check_in_time, check_out_time, overtime_minutes')
    .eq('date', today)
    .in('employee_id', employees?.map((e: any) => e.id) || [])

  const presentToday = todayAttendance?.filter((a: any) => a.check_in_time).length || 0
  const absentToday = totalEmployees - presentToday
  const lateArrivals = todayAttendance?.filter((a: any) => a.status === 'late').length || 0
  const earlyDepartures = todayAttendance?.filter((a: any) => {
    if (!a.check_out_time) return false
    const checkOutTime = new Date(a.check_out_time)
    return checkOutTime.getHours() < 17 // Before 5 PM
  }).length || 0

  // Get period statistics
  const { data: periodAttendance } = await supabase
    .from('attendance')
    .select('work_duration_minutes, overtime_minutes')
    .gte('date', startDate)
    .lte('date', endDate)
    .in('employee_id', employees?.map((e: any) => e.id) || [])

  const totalWorkMinutes = periodAttendance?.reduce((sum: number, a: any) => sum + (a.work_duration_minutes || 0), 0) || 0
  const totalOvertimeMinutes = periodAttendance?.reduce((sum: number, a: any) => sum + (a.overtime_minutes || 0), 0) || 0
  const recordCount = periodAttendance?.length || 1

  return {
    totalEmployees,
    presentToday,
    absentToday,
    onLeave: 0, // Would need leave management system
    lateArrivals,
    earlyDepartures,
    overtimeHours: Math.round(totalOvertimeMinutes / 60),
    averageWorkHours: Math.round((totalWorkMinutes / recordCount) / 60 * 10) / 10,
    attendanceRate: totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0
  }
}

// Get attendance trends over time
async function getAttendanceTrends(
  supabase: any,
  organizationId: string,
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'week' | 'month'
): Promise<TrendData[]> {
  // Get all employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const totalEmployees = employees?.length || 0

  // Get attendance records for period
  const { data: attendance } = await supabase
    .from('attendance')
    .select('date, status, overtime_minutes')
    .gte('date', startDate)
    .lte('date', endDate)
    .in('employee_id', employees?.map((e: any) => e.id) || [])
    .order('date', { ascending: true })

  // Group data based on groupBy parameter
  const grouped = new Map<string, any[]>()
  
  attendance?.forEach((record: any) => {
    let key: string
    const date = new Date(record.date)
    
    if (groupBy === 'week') {
      // Get week number
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      key = weekStart.toISOString().split('T')[0]
    } else if (groupBy === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    } else {
      key = record.date
    }
    
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)?.push(record)
  })

  // Calculate trends for each group
  const trends: TrendData[] = []
  
  grouped.forEach((records, date) => {
    const present = records.length
    const absent = totalEmployees - present
    const late = records.filter((r: any) => r.status === 'late').length
    const overtime = records.filter((r: any) => r.overtime_minutes > 0).length
    const attendanceRate = totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0
    
    trends.push({
      date,
      present,
      absent,
      late,
      overtime,
      attendanceRate
    })
  })

  return trends
}

// Get individual employee analytics
async function getEmployeeAnalytics(supabase: any, employeeId: string, startDate: string, endDate: string) {
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  const totalDays = attendance?.length || 0
  const presentDays = attendance?.filter((a: any) => a.status === 'present').length || 0
  const lateDays = attendance?.filter((a: any) => a.status === 'late').length || 0
  const totalWorkMinutes = attendance?.reduce((sum: number, a: any) => sum + (a.work_duration_minutes || 0), 0) || 0
  const totalOvertimeMinutes = attendance?.reduce((sum: number, a: any) => sum + (a.overtime_minutes || 0), 0) || 0

  // Calculate average check-in/out times
  const checkInTimes = attendance?.filter((a: any) => a.check_in_time).map((a: any) => {
    const time = new Date(a.check_in_time)
    return time.getHours() * 60 + time.getMinutes()
  }) || []
  
  const checkOutTimes = attendance?.filter((a: any) => a.check_out_time).map((a: any) => {
    const time = new Date(a.check_out_time)
    return time.getHours() * 60 + time.getMinutes()
  }) || []

  const avgCheckInMinutes = checkInTimes.length > 0 
    ? checkInTimes.reduce((a: number, b: number) => a + b, 0) / checkInTimes.length 
    : 0
  const avgCheckOutMinutes = checkOutTimes.length > 0
    ? checkOutTimes.reduce((a: number, b: number) => a + b, 0) / checkOutTimes.length
    : 0

  return {
    totalDays,
    presentDays,
    absentDays: totalDays - presentDays,
    lateDays,
    attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
    punctualityRate: presentDays > 0 ? Math.round(((presentDays - lateDays) / presentDays) * 100) : 0,
    averageWorkHours: totalDays > 0 ? Math.round((totalWorkMinutes / totalDays) / 60 * 10) / 10 : 0,
    totalOvertimeHours: Math.round(totalOvertimeMinutes / 60),
    averageCheckIn: formatMinutesToTime(avgCheckInMinutes),
    averageCheckOut: formatMinutesToTime(avgCheckOutMinutes),
    records: attendance
  }
}

// Get department analytics
async function getDepartmentAnalytics(supabase: any, departmentId: string, startDate: string, endDate: string) {
  // Get department employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('department_id', departmentId)
    .eq('is_active', true)

  if (!employees || employees.length === 0) {
    return { message: 'No employees in department' }
  }

  const employeeIds = employees.map((e: any) => e.id)

  // Get attendance for all department employees
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .in('employee_id', employeeIds)
    .gte('date', startDate)
    .lte('date', endDate)

  // Calculate department statistics
  const employeeStats = employees.map((emp: any) => {
    const empAttendance = attendance?.filter((a: any) => a.employee_id === emp.id) || []
    const presentDays = empAttendance.filter((a: any) => a.check_in_time).length
    const totalDays = empAttendance.length || 1
    
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      attendanceRate: Math.round((presentDays / totalDays) * 100),
      presentDays,
      totalDays
    }
  })

  const overallAttendanceRate = employeeStats.reduce((sum, e) => sum + e.attendanceRate, 0) / employeeStats.length

  return {
    departmentId,
    totalEmployees: employees.length,
    overallAttendanceRate: Math.round(overallAttendanceRate),
    employeeStats,
    topPerformers: employeeStats.sort((a, b) => b.attendanceRate - a.attendanceRate).slice(0, 5),
    needsImprovement: employeeStats.filter(e => e.attendanceRate < 80)
  }
}

// Get overtime analytics
async function getOvertimeAnalytics(supabase: any, organizationId: string, startDate: string, endDate: string) {
  // Get all employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const employeeIds = employees?.map((e: any) => e.id) || []

  // Get overtime data
  const { data: attendance } = await supabase
    .from('attendance')
    .select('employee_id, date, overtime_minutes')
    .in('employee_id', employeeIds)
    .gte('date', startDate)
    .lte('date', endDate)
    .gt('overtime_minutes', 0)

  // Calculate overtime by employee
  const overtimeByEmployee = new Map<string, number>()
  attendance?.forEach((record: any) => {
    const current = overtimeByEmployee.get(record.employee_id) || 0
    overtimeByEmployee.set(record.employee_id, current + record.overtime_minutes)
  })

  // Create employee overtime list
  const employeeOvertimeList = Array.from(overtimeByEmployee.entries()).map(([employeeId, minutes]) => {
    const employee = employees?.find((e: any) => e.id === employeeId)
    return {
      employeeId,
      employeeName: employee?.name || 'Unknown',
      totalOvertimeHours: Math.round(minutes / 60 * 10) / 10,
      totalOvertimeMinutes: minutes
    }
  }).sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes)

  const totalOvertimeMinutes = Array.from(overtimeByEmployee.values()).reduce((sum, min) => sum + min, 0)

  return {
    totalOvertimeHours: Math.round(totalOvertimeMinutes / 60),
    totalOvertimeCost: calculateOvertimeCost(totalOvertimeMinutes), // Simplified calculation
    employeesWithOvertime: overtimeByEmployee.size,
    topOvertimeEmployees: employeeOvertimeList.slice(0, 10),
    overtimeByDay: groupOvertimeByDay(attendance),
    averageOvertimePerEmployee: Math.round((totalOvertimeMinutes / employeeIds.length) / 60 * 10) / 10
  }
}

// Get attendance patterns (e.g., frequent late arrivals, early departures)
async function getAttendancePatterns(supabase: any, organizationId: string, startDate: string, endDate: string) {
  // Get all employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const employeeIds = employees?.map((e: any) => e.id) || []

  // Get attendance records
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .in('employee_id', employeeIds)
    .gte('date', startDate)
    .lte('date', endDate)

  // Analyze patterns
  const patterns = {
    chronicallyLate: [] as any[],
    earlyDepartures: [] as any[],
    perfectAttendance: [] as any[],
    irregularPatterns: [] as any[],
    mondayAbsentees: [] as any[],
    fridayAbsentees: [] as any[]
  }

  employees?.forEach((emp: any) => {
    const empAttendance = attendance?.filter((a: any) => a.employee_id === emp.id) || []
    
    // Check for chronic lateness (>30% late arrivals)
    const lateCount = empAttendance.filter((a: any) => a.status === 'late').length
    if (lateCount > empAttendance.length * 0.3) {
      patterns.chronicallyLate.push({
        employeeId: emp.id,
        employeeName: emp.name,
        latePercentage: Math.round((lateCount / empAttendance.length) * 100)
      })
    }

    // Check for early departures
    const earlyDepartureCount = empAttendance.filter((a: any) => {
      if (!a.check_out_time) return false
      const checkOut = new Date(a.check_out_time)
      return checkOut.getHours() < 17
    }).length
    
    if (earlyDepartureCount > empAttendance.length * 0.2) {
      patterns.earlyDepartures.push({
        employeeId: emp.id,
        employeeName: emp.name,
        earlyDeparturePercentage: Math.round((earlyDepartureCount / empAttendance.length) * 100)
      })
    }

    // Check for perfect attendance
    if (empAttendance.length > 20 && empAttendance.every((a: any) => a.status === 'present')) {
      patterns.perfectAttendance.push({
        employeeId: emp.id,
        employeeName: emp.name,
        days: empAttendance.length
      })
    }

    // Check Monday/Friday patterns
    const mondayAbsences = empAttendance.filter((a: any) => {
      const date = new Date(a.date)
      return date.getDay() === 1 && !a.check_in_time
    }).length

    const fridayAbsences = empAttendance.filter((a: any) => {
      const date = new Date(a.date)
      return date.getDay() === 5 && !a.check_in_time
    }).length

    if (mondayAbsences > 2) {
      patterns.mondayAbsentees.push({
        employeeId: emp.id,
        employeeName: emp.name,
        mondayAbsences
      })
    }

    if (fridayAbsences > 2) {
      patterns.fridayAbsentees.push({
        employeeId: emp.id,
        employeeName: emp.name,
        fridayAbsences
      })
    }
  })

  return patterns
}

// Helper functions
function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function calculateOvertimeCost(minutes: number): number {
  // Simplified calculation - assuming $30/hour overtime rate
  const overtimeRate = 30
  const hours = minutes / 60
  return Math.round(hours * overtimeRate * 100) / 100
}

function groupOvertimeByDay(attendance: any[]): any[] {
  const grouped = new Map<string, number>()
  
  attendance?.forEach((record: any) => {
    const current = grouped.get(record.date) || 0
    grouped.set(record.date, current + record.overtime_minutes)
  })
  
  return Array.from(grouped.entries()).map(([date, minutes]) => ({
    date,
    overtimeHours: Math.round(minutes / 60 * 10) / 10
  })).sort((a, b) => a.date.localeCompare(b.date))
}