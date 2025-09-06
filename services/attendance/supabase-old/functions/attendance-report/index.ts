import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface ReportRequest {
  startDate: string
  endDate: string
  employeeIds?: string[]
  departmentFilter?: string
  reportType: 'summary' | 'detailed' | 'export'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    // Get user's role and organization
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      throw new Error('User data not found')
    }

    // Check permission
    if (!['master_admin', 'admin', 'manager'].includes(userData.role)) {
      throw new Error('Insufficient permissions to generate reports')
    }

    // Get request data
    const { 
      startDate, 
      endDate, 
      employeeIds,
      departmentFilter,
      reportType 
    }: ReportRequest = await req.json()

    // Build query
    let query = supabaseClient
      .from('attendance')
      .select(`
        *,
        employee:employees!inner(
          id,
          first_name,
          last_name,
          employee_code,
          department,
          position,
          user:users!inner(email)
        ),
        check_in_location:locations!check_in_location_id(name),
        check_out_location:locations!check_out_location_id(name),
        shift:shifts(name, start_time, end_time)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('employee.last_name', { ascending: true })

    // Apply filters based on role
    if (userData.role === 'manager') {
      // Managers can only see their team's data
      const { data: managedEmployees } = await supabaseClient
        .from('employees')
        .select('id')
        .eq('manager_id', user.id)

      const managedIds = managedEmployees?.map(e => e.id) || []
      query = query.in('employee_id', managedIds)
    } else if (userData.role === 'admin') {
      // Admins can only see their organization's data
      query = query.eq('employee.organization_id', userData.organization_id)
    }
    // Master admins can see everything (no filter needed)

    // Apply additional filters
    if (employeeIds && employeeIds.length > 0) {
      query = query.in('employee_id', employeeIds)
    }

    if (departmentFilter) {
      query = query.eq('employee.department', departmentFilter)
    }

    // Execute query
    const { data: attendanceData, error: queryError } = await query

    if (queryError) throw queryError

    // Process data based on report type
    let report
    if (reportType === 'summary') {
      // Generate summary statistics
      const summary = {
        totalDays: 0,
        totalEmployees: new Set(),
        attendanceByStatus: {} as Record<string, number>,
        totalLateMinutes: 0,
        totalOvertimeMinutes: 0,
        averageAttendanceRate: 0,
      }

      attendanceData?.forEach(record => {
        summary.totalDays++
        summary.totalEmployees.add(record.employee_id)
        summary.attendanceByStatus[record.status] = 
          (summary.attendanceByStatus[record.status] || 0) + 1
        summary.totalLateMinutes += record.late_minutes || 0
        summary.totalOvertimeMinutes += record.overtime_minutes || 0
      })

      const workDays = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      summary.averageAttendanceRate = 
        (summary.totalDays / (summary.totalEmployees.size * workDays)) * 100

      report = {
        type: 'summary',
        period: { startDate, endDate },
        statistics: {
          ...summary,
          totalEmployees: summary.totalEmployees.size,
        },
      }
    } else if (reportType === 'detailed') {
      // Group by employee
      const byEmployee: Record<string, any> = {}

      attendanceData?.forEach(record => {
        const employeeKey = record.employee.employee_code
        if (!byEmployee[employeeKey]) {
          byEmployee[employeeKey] = {
            employee: {
              code: record.employee.employee_code,
              name: `${record.employee.first_name} ${record.employee.last_name}`,
              department: record.employee.department,
              position: record.employee.position,
              email: record.employee.user.email,
            },
            attendance: [],
            statistics: {
              totalPresent: 0,
              totalLate: 0,
              totalAbsent: 0,
              totalLateMinutes: 0,
              totalOvertimeMinutes: 0,
            },
          }
        }

        byEmployee[employeeKey].attendance.push({
          date: record.date,
          status: record.status,
          checkIn: record.check_in_time,
          checkOut: record.check_out_time,
          lateMinutes: record.late_minutes,
          overtimeMinutes: record.overtime_minutes,
          location: record.check_in_location?.name,
        })

        // Update statistics
        if (record.status === 'present') {
          byEmployee[employeeKey].statistics.totalPresent++
        } else if (record.status === 'late') {
          byEmployee[employeeKey].statistics.totalLate++
        } else if (record.status === 'absent') {
          byEmployee[employeeKey].statistics.totalAbsent++
        }
        byEmployee[employeeKey].statistics.totalLateMinutes += record.late_minutes || 0
        byEmployee[employeeKey].statistics.totalOvertimeMinutes += record.overtime_minutes || 0
      })

      report = {
        type: 'detailed',
        period: { startDate, endDate },
        employees: Object.values(byEmployee),
      }
    } else {
      // Export format (CSV-ready)
      report = {
        type: 'export',
        period: { startDate, endDate },
        headers: [
          'Date',
          'Employee Code',
          'Employee Name',
          'Department',
          'Check In',
          'Check Out',
          'Status',
          'Late Minutes',
          'Overtime Minutes',
          'Location',
        ],
        data: attendanceData?.map(record => [
          record.date,
          record.employee.employee_code,
          `${record.employee.first_name} ${record.employee.last_name}`,
          record.employee.department || '',
          record.check_in_time || '',
          record.check_out_time || '',
          record.status,
          record.late_minutes || 0,
          record.overtime_minutes || 0,
          record.check_in_location?.name || '',
        ]),
      }
    }

    // Log audit
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      organization_id: userData.organization_id,
      action: 'report.generated',
      resource: 'attendance_reports',
      changes: {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        filters: {
          employee_ids: employeeIds,
          department: departmentFilter,
        },
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        report,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})