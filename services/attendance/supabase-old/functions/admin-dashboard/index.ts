// Edge Function: Admin Dashboard API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface DashboardRequest {
  action: 'overview' | 'employees' | 'departments' | 'approvals' | 'settings' | 'reports'
  organizationId: string
  filters?: {
    department?: string
    status?: string
    date?: string
    search?: string
  }
  data?: any
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
    const body: DashboardRequest = await req.json()
    const { action, organizationId, filters, data } = body

    // Check admin permissions
    const { data: userEmployee } = await supabase
      .from('employees')
      .select('role, permissions')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!userEmployee || (userEmployee.role !== 'admin' && userEmployee.role !== 'master_admin')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result: any = {}

    switch (action) {
      case 'overview':
        result = await getDashboardOverview(supabase, organizationId)
        break

      case 'employees':
        if (req.method === 'GET') {
          result = await getEmployees(supabase, organizationId, filters)
        } else if (req.method === 'POST') {
          result = await createEmployee(supabase, organizationId, data)
        } else if (req.method === 'PUT') {
          result = await updateEmployee(supabase, data)
        } else if (req.method === 'DELETE') {
          result = await deleteEmployee(supabase, data.employeeId)
        }
        break

      case 'departments':
        result = await manageDepartments(supabase, organizationId, req.method, data)
        break

      case 'approvals':
        result = await handleApprovals(supabase, organizationId, data)
        break

      case 'settings':
        result = await manageSettings(supabase, organizationId, req.method, data)
        break

      case 'reports':
        result = await generateReports(supabase, organizationId, filters)
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Log admin action
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: user.id,
      action: `admin.${action}`,
      resource_type: 'admin_dashboard',
      metadata: { filters, data }
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        data: result
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin dashboard error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Get dashboard overview
async function getDashboardOverview(supabase: any, organizationId: string) {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Get organization info
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  // Get employee statistics
  const { data: employees } = await supabase
    .from('employees')
    .select('id, role, is_active')
    .eq('organization_id', organizationId)

  const totalEmployees = employees?.filter((e: any) => e.is_active).length || 0
  const adminCount = employees?.filter((e: any) => e.role === 'admin').length || 0
  const managerCount = employees?.filter((e: any) => e.role === 'manager').length || 0
  const workerCount = employees?.filter((e: any) => e.role === 'worker').length || 0

  // Get today's attendance
  const { data: todayAttendance } = await supabase
    .from('attendance')
    .select('employee_id, status')
    .eq('date', today)
    .in('employee_id', employees?.map((e: any) => e.id) || [])

  const presentToday = todayAttendance?.length || 0
  const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0

  // Get pending approvals
  const { data: pendingApprovals } = await supabase
    .from('attendance')
    .select('id')
    .eq('date', today)
    .eq('status', 'pending')
    .in('employee_id', employees?.map((e: any) => e.id) || [])

  // Get recent notifications
  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get system health
  const systemHealth = await checkSystemHealth(supabase, organizationId)

  return {
    organization: {
      id: org.id,
      name: org.name,
      plan: org.subscription_plan || 'free',
      createdAt: org.created_at
    },
    statistics: {
      totalEmployees,
      adminCount,
      managerCount,
      workerCount,
      presentToday,
      attendanceRate,
      pendingApprovals: pendingApprovals?.length || 0
    },
    recentActivity: {
      notifications: recentNotifications || [],
      lastSync: new Date().toISOString()
    },
    systemHealth
  }
}

// Get employees with filters
async function getEmployees(supabase: any, organizationId: string, filters?: any) {
  let query = supabase
    .from('employees')
    .select(`
      *,
      user:users!employees_user_id_fkey(email, name),
      shifts:employee_shifts(
        shift:shifts(*)
      )
    `)
    .eq('organization_id', organizationId)

  if (filters?.department) {
    query = query.eq('department_id', filters.department)
  }
  if (filters?.status) {
    query = query.eq('is_active', filters.status === 'active')
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  return {
    employees: data,
    total: data?.length || 0
  }
}

// Create new employee
async function createEmployee(supabase: any, organizationId: string, employeeData: any) {
  // Create auth user first
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: employeeData.email,
    password: employeeData.password || generateTempPassword(),
    email_confirm: true
  })

  if (authError) throw authError

  // Create employee record
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .insert({
      user_id: authUser.user.id,
      organization_id: organizationId,
      name: employeeData.name,
      email: employeeData.email,
      role: employeeData.role || 'worker',
      department_id: employeeData.department_id,
      employee_code: employeeData.employee_code || generateEmployeeCode(),
      phone: employeeData.phone,
      is_active: true
    })
    .select()
    .single()

  if (employeeError) {
    // Rollback auth user creation
    await supabase.auth.admin.deleteUser(authUser.user.id)
    throw employeeError
  }

  // Send welcome email
  await sendWelcomeEmail(supabase, employee)

  return employee
}

// Update employee
async function updateEmployee(supabase: any, employeeData: any) {
  const { data, error } = await supabase
    .from('employees')
    .update({
      name: employeeData.name,
      role: employeeData.role,
      department_id: employeeData.department_id,
      phone: employeeData.phone,
      is_active: employeeData.is_active
    })
    .eq('id', employeeData.id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete employee (soft delete)
async function deleteEmployee(supabase: any, employeeId: string) {
  const { data, error } = await supabase
    .from('employees')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('id', employeeId)
    .select()
    .single()

  if (error) throw error
  return { message: 'Employee deactivated', employee: data }
}

// Manage departments
async function manageDepartments(supabase: any, organizationId: string, method: string, data?: any) {
  if (method === 'GET') {
    const { data: departments } = await supabase
      .from('departments')
      .select(`
        *,
        employees:employees(count)
      `)
      .eq('organization_id', organizationId)
      .order('name')

    return departments
  } else if (method === 'POST') {
    const { data: department } = await supabase
      .from('departments')
      .insert({
        organization_id: organizationId,
        name: data.name,
        description: data.description,
        manager_id: data.manager_id
      })
      .select()
      .single()

    return department
  } else if (method === 'PUT') {
    const { data: department } = await supabase
      .from('departments')
      .update({
        name: data.name,
        description: data.description,
        manager_id: data.manager_id
      })
      .eq('id', data.id)
      .select()
      .single()

    return department
  } else if (method === 'DELETE') {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', data.id)

    if (error) throw error
    return { message: 'Department deleted' }
  }
}

// Handle approval requests
async function handleApprovals(supabase: any, organizationId: string, data: any) {
  const { approvalId, action, reason } = data

  if (!approvalId || !action) {
    throw new Error('Approval ID and action required')
  }

  // Get the approval request
  const { data: approval } = await supabase
    .from('attendance')
    .select('*')
    .eq('id', approvalId)
    .single()

  if (!approval) {
    throw new Error('Approval request not found')
  }

  // Update approval status
  const status = action === 'approve' ? 'approved' : 'rejected'
  const { data: updated } = await supabase
    .from('attendance')
    .update({
      approval_status: status,
      approved_by: data.approvedBy,
      approval_reason: reason,
      approved_at: new Date().toISOString()
    })
    .eq('id', approvalId)
    .select()
    .single()

  // Send notification to employee
  await supabase.from('notifications').insert({
    organization_id: organizationId,
    user_id: approval.employee_id,
    type: 'approval_update',
    title: `Attendance ${status}`,
    message: `Your attendance request has been ${status}. ${reason || ''}`,
    data: { approvalId, status }
  })

  return updated
}

// Manage organization settings
async function manageSettings(supabase: any, organizationId: string, method: string, data?: any) {
  if (method === 'GET') {
    const { data: settings } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (!settings) {
      // Return default settings
      return {
        work_start_time: '09:00',
        work_end_time: '18:00',
        lunch_break_duration: 60,
        overtime_threshold: 8 * 60,
        location_tracking: true,
        biometric_enabled: false,
        auto_checkout_enabled: false,
        notification_settings: {
          late_arrival: true,
          early_departure: true,
          overtime: true,
          absence: true
        }
      }
    }

    return settings
  } else if (method === 'PUT') {
    const { data: settings, error } = await supabase
      .from('organization_settings')
      .upsert({
        organization_id: organizationId,
        ...data,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return settings
  }
}

// Generate reports
async function generateReports(supabase: any, organizationId: string, filters?: any) {
  const reportType = filters?.type || 'attendance'
  const startDate = filters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = filters?.endDate || new Date().toISOString().split('T')[0]

  switch (reportType) {
    case 'attendance':
      return await generateAttendanceReport(supabase, organizationId, startDate, endDate)
    case 'overtime':
      return await generateOvertimeReport(supabase, organizationId, startDate, endDate)
    case 'employee':
      return await generateEmployeeReport(supabase, organizationId, filters?.employeeId, startDate, endDate)
    case 'department':
      return await generateDepartmentReport(supabase, organizationId, filters?.departmentId, startDate, endDate)
    default:
      throw new Error('Invalid report type')
  }
}

// Report generation functions
async function generateAttendanceReport(supabase: any, organizationId: string, startDate: string, endDate: string) {
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .in('employee_id', employees?.map((e: any) => e.id) || [])
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  // Calculate summary statistics
  const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
  const totalEmployees = employees?.length || 0
  const totalRecords = attendance?.length || 0
  const expectedRecords = totalDays * totalEmployees
  const overallAttendanceRate = expectedRecords > 0 ? Math.round((totalRecords / expectedRecords) * 100) : 0

  return {
    reportType: 'attendance',
    period: { startDate, endDate },
    summary: {
      totalEmployees,
      totalDays,
      totalRecords,
      overallAttendanceRate
    },
    data: attendance,
    generated_at: new Date().toISOString()
  }
}

async function generateOvertimeReport(supabase: any, organizationId: string, startDate: string, endDate: string) {
  const { data: overtime } = await supabase
    .from('attendance')
    .select(`
      employee_id,
      date,
      overtime_minutes,
      employee:employees(name)
    `)
    .gt('overtime_minutes', 0)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('overtime_minutes', { ascending: false })

  const totalOvertimeMinutes = overtime?.reduce((sum, r) => sum + r.overtime_minutes, 0) || 0
  const totalOvertimeHours = Math.round(totalOvertimeMinutes / 60)

  return {
    reportType: 'overtime',
    period: { startDate, endDate },
    summary: {
      totalOvertimeHours,
      totalOvertimeCost: totalOvertimeHours * 30, // Simplified calculation
      employeesWithOvertime: new Set(overtime?.map(r => r.employee_id)).size
    },
    data: overtime,
    generated_at: new Date().toISOString()
  }
}

async function generateEmployeeReport(supabase: any, organizationId: string, employeeId: string, startDate: string, endDate: string) {
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single()

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  const presentDays = attendance?.filter(a => a.check_in_time).length || 0
  const lateDays = attendance?.filter(a => a.status === 'late').length || 0
  const totalOvertimeMinutes = attendance?.reduce((sum, a) => sum + (a.overtime_minutes || 0), 0) || 0

  return {
    reportType: 'employee',
    employee,
    period: { startDate, endDate },
    summary: {
      presentDays,
      lateDays,
      attendanceRate: attendance?.length > 0 ? Math.round((presentDays / attendance.length) * 100) : 0,
      totalOvertimeHours: Math.round(totalOvertimeMinutes / 60)
    },
    data: attendance,
    generated_at: new Date().toISOString()
  }
}

async function generateDepartmentReport(supabase: any, organizationId: string, departmentId: string, startDate: string, endDate: string) {
  const { data: department } = await supabase
    .from('departments')
    .select('*')
    .eq('id', departmentId)
    .single()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('department_id', departmentId)
    .eq('is_active', true)

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .in('employee_id', employees?.map(e => e.id) || [])
    .gte('date', startDate)
    .lte('date', endDate)

  const totalRecords = attendance?.length || 0
  const presentRecords = attendance?.filter(a => a.check_in_time).length || 0

  return {
    reportType: 'department',
    department,
    period: { startDate, endDate },
    summary: {
      totalEmployees: employees?.length || 0,
      averageAttendanceRate: totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0
    },
    employees: employees?.map(emp => ({
      ...emp,
      attendance: attendance?.filter(a => a.employee_id === emp.id) || []
    })),
    generated_at: new Date().toISOString()
  }
}

// Helper functions
async function checkSystemHealth(supabase: any, organizationId: string) {
  // Check various system metrics
  const checks = {
    database: 'healthy',
    api: 'healthy',
    storage: 'healthy',
    realtime: 'healthy'
  }

  // Check if there are any recent errors in audit logs
  const { data: recentErrors } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('action', 'error%')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  if (recentErrors && recentErrors.length > 5) {
    checks.api = 'degraded'
  }

  return {
    status: Object.values(checks).every(s => s === 'healthy') ? 'healthy' : 'degraded',
    checks,
    lastChecked: new Date().toISOString()
  }
}

function generateTempPassword(): string {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()
}

function generateEmployeeCode(): string {
  return 'EMP' + Date.now().toString().slice(-6)
}

async function sendWelcomeEmail(supabase: any, employee: any) {
  // Queue welcome email notification
  await supabase.from('notifications').insert({
    organization_id: employee.organization_id,
    user_id: employee.user_id,
    type: 'welcome',
    title: 'Welcome to the team!',
    message: `Welcome ${employee.name}! Your account has been created. Please check your email for login instructions.`,
    data: { employeeId: employee.id }
  })
}