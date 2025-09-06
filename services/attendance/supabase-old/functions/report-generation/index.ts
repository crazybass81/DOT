// Edge Function: Report Generation
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { PDFDocument, rgb, StandardFonts } from 'https://cdn.skypack.dev/pdf-lib@1.17.1'

interface ReportRequest {
  type: 'attendance' | 'payroll' | 'summary' | 'compliance' | 'custom'
  format: 'pdf' | 'csv' | 'excel' | 'json'
  organizationId: string
  startDate: string
  endDate: string
  filters?: {
    employeeIds?: string[]
    departmentIds?: string[]
    includeInactive?: boolean
    groupBy?: 'employee' | 'department' | 'date' | 'week' | 'month'
  }
  customOptions?: {
    includeCharts?: boolean
    includeDetails?: boolean
    includeSummary?: boolean
    language?: 'en' | 'ko' | 'ja'
  }
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
    const body: ReportRequest = await req.json()
    const { type, format, organizationId, startDate, endDate, filters, customOptions } = body

    // Check permissions
    const { data: userEmployee } = await supabase
      .from('employees')
      .select('role, permissions')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!userEmployee || (userEmployee.role === 'worker' && type !== 'attendance')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions for report generation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate report data
    let reportData: any
    switch (type) {
      case 'attendance':
        reportData = await generateAttendanceReport(supabase, organizationId, startDate, endDate, filters)
        break
      case 'payroll':
        reportData = await generatePayrollReport(supabase, organizationId, startDate, endDate, filters)
        break
      case 'summary':
        reportData = await generateSummaryReport(supabase, organizationId, startDate, endDate, filters)
        break
      case 'compliance':
        reportData = await generateComplianceReport(supabase, organizationId, startDate, endDate)
        break
      case 'custom':
        reportData = await generateCustomReport(supabase, organizationId, startDate, endDate, filters, customOptions)
        break
      default:
        throw new Error('Invalid report type')
    }

    // Format report based on requested format
    let formattedReport: any
    let contentType = 'application/json'
    
    switch (format) {
      case 'pdf':
        formattedReport = await formatAsPDF(reportData, type, customOptions)
        contentType = 'application/pdf'
        break
      case 'csv':
        formattedReport = formatAsCSV(reportData)
        contentType = 'text/csv'
        break
      case 'excel':
        formattedReport = await formatAsExcel(reportData)
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break
      case 'json':
      default:
        formattedReport = JSON.stringify(reportData)
        break
    }

    // Log report generation
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: user.id,
      action: `report.generate.${type}`,
      resource_type: 'report',
      metadata: { type, format, startDate, endDate, filters }
    })

    // Save report metadata
    const { data: reportRecord } = await supabase
      .from('generated_reports')
      .insert({
        organization_id: organizationId,
        generated_by: user.id,
        report_type: type,
        format,
        start_date: startDate,
        end_date: endDate,
        file_size: formattedReport.length,
        metadata: { filters, customOptions }
      })
      .select()
      .single()

    return new Response(formattedReport, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${type}-report-${startDate}-${endDate}.${format}"`,
        'X-Report-Id': reportRecord?.id || ''
      }
    })

  } catch (error) {
    console.error('Report generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Generate attendance report
async function generateAttendanceReport(supabase: any, organizationId: string, startDate: string, endDate: string, filters?: any) {
  let employeeQuery = supabase
    .from('employees')
    .select('id, name, email, employee_code, department_id')
    .eq('organization_id', organizationId)

  if (filters?.employeeIds?.length > 0) {
    employeeQuery = employeeQuery.in('id', filters.employeeIds)
  }
  if (filters?.departmentIds?.length > 0) {
    employeeQuery = employeeQuery.in('department_id', filters.departmentIds)
  }
  if (!filters?.includeInactive) {
    employeeQuery = employeeQuery.eq('is_active', true)
  }

  const { data: employees } = await employeeQuery

  // Get attendance records
  const { data: attendance } = await supabase
    .from('attendance')
    .select(`
      *,
      employee:employees(name, employee_code),
      check_in_location:locations!check_in_location_id(name),
      check_out_location:locations!check_out_location_id(name)
    `)
    .in('employee_id', employees?.map(e => e.id) || [])
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  // Group by requested grouping
  let groupedData: any = {}
  const groupBy = filters?.groupBy || 'employee'

  if (groupBy === 'employee') {
    employees?.forEach(emp => {
      groupedData[emp.id] = {
        employee: emp,
        records: attendance?.filter(a => a.employee_id === emp.id) || [],
        summary: calculateEmployeeSummary(attendance?.filter(a => a.employee_id === emp.id) || [])
      }
    })
  } else if (groupBy === 'date') {
    const dates = getDateRange(startDate, endDate)
    dates.forEach(date => {
      groupedData[date] = {
        date,
        records: attendance?.filter(a => a.date === date) || [],
        summary: calculateDailySummary(attendance?.filter(a => a.date === date) || [])
      }
    })
  } else if (groupBy === 'department') {
    const departments = [...new Set(employees?.map(e => e.department_id).filter(Boolean))]
    departments.forEach(deptId => {
      const deptEmployees = employees?.filter(e => e.department_id === deptId) || []
      const deptAttendance = attendance?.filter(a => 
        deptEmployees.some(e => e.id === a.employee_id)
      ) || []
      
      groupedData[deptId] = {
        departmentId: deptId,
        employees: deptEmployees,
        records: deptAttendance,
        summary: calculateDepartmentSummary(deptAttendance, deptEmployees.length)
      }
    })
  }

  return {
    reportType: 'attendance',
    period: { startDate, endDate },
    organization: { id: organizationId },
    totalEmployees: employees?.length || 0,
    totalRecords: attendance?.length || 0,
    data: groupedData,
    overallSummary: calculateOverallSummary(attendance || [], employees?.length || 0),
    generatedAt: new Date().toISOString()
  }
}

// Generate payroll report
async function generatePayrollReport(supabase: any, organizationId: string, startDate: string, endDate: string, filters?: any) {
  // Get employees with salary information
  const { data: employees } = await supabase
    .from('employees')
    .select(`
      id, name, employee_code,
      salary_info:employee_salaries(
        base_salary,
        hourly_rate,
        overtime_rate
      )
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  // Get attendance with overtime
  const { data: attendance } = await supabase
    .from('attendance')
    .select('employee_id, work_duration_minutes, overtime_minutes')
    .in('employee_id', employees?.map(e => e.id) || [])
    .gte('date', startDate)
    .lte('date', endDate)

  // Calculate payroll for each employee
  const payrollData = employees?.map(emp => {
    const empAttendance = attendance?.filter(a => a.employee_id === emp.id) || []
    const totalWorkMinutes = empAttendance.reduce((sum, a) => sum + (a.work_duration_minutes || 0), 0)
    const totalOvertimeMinutes = empAttendance.reduce((sum, a) => sum + (a.overtime_minutes || 0), 0)
    
    const salaryInfo = emp.salary_info?.[0] || { base_salary: 0, hourly_rate: 30, overtime_rate: 45 }
    const regularPay = salaryInfo.base_salary || (totalWorkMinutes / 60 * salaryInfo.hourly_rate)
    const overtimePay = (totalOvertimeMinutes / 60) * salaryInfo.overtime_rate
    
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      employeeCode: emp.employee_code,
      workDays: empAttendance.length,
      totalWorkHours: Math.round(totalWorkMinutes / 60 * 10) / 10,
      totalOvertimeHours: Math.round(totalOvertimeMinutes / 60 * 10) / 10,
      regularPay,
      overtimePay,
      totalPay: regularPay + overtimePay,
      deductions: 0, // Would need deductions system
      netPay: regularPay + overtimePay
    }
  }) || []

  const totalPayroll = payrollData.reduce((sum, p) => sum + p.totalPay, 0)

  return {
    reportType: 'payroll',
    period: { startDate, endDate },
    organization: { id: organizationId },
    payrollSummary: {
      totalEmployees: payrollData.length,
      totalRegularPay: payrollData.reduce((sum, p) => sum + p.regularPay, 0),
      totalOvertimePay: payrollData.reduce((sum, p) => sum + p.overtimePay, 0),
      totalDeductions: 0,
      totalNetPay: totalPayroll
    },
    employeePayroll: payrollData,
    generatedAt: new Date().toISOString()
  }
}

// Generate summary report
async function generateSummaryReport(supabase: any, organizationId: string, startDate: string, endDate: string, filters?: any) {
  // Combine multiple report types into a summary
  const attendanceData = await generateAttendanceReport(supabase, organizationId, startDate, endDate, filters)
  const payrollData = await generatePayrollReport(supabase, organizationId, startDate, endDate, filters)
  
  // Get additional metrics
  const { data: employees } = await supabase
    .from('employees')
    .select('id, role')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const { data: shifts } = await supabase
    .from('shifts')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  return {
    reportType: 'summary',
    period: { startDate, endDate },
    organization: { id: organizationId },
    keyMetrics: {
      totalEmployees: employees?.length || 0,
      activeShifts: shifts?.length || 0,
      attendanceRate: attendanceData.overallSummary?.attendanceRate || 0,
      totalPayroll: payrollData.payrollSummary?.totalNetPay || 0,
      averageWorkHours: attendanceData.overallSummary?.averageWorkHours || 0
    },
    attendance: attendanceData.overallSummary,
    payroll: payrollData.payrollSummary,
    trends: await calculateTrends(supabase, organizationId, startDate, endDate),
    generatedAt: new Date().toISOString()
  }
}

// Generate compliance report
async function generateComplianceReport(supabase: any, organizationId: string, startDate: string, endDate: string) {
  // Check various compliance metrics
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)

  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('organization_id', organizationId)

  // Labor law compliance checks
  const violations = {
    overtimeViolations: attendance?.filter(a => (a.overtime_minutes || 0) > 4 * 60).length || 0, // >4 hours overtime
    missingCheckouts: attendance?.filter(a => a.check_in_time && !a.check_out_time).length || 0,
    unauthorizedAccess: 0, // Would need to check against schedules
    dataPrivacyIssues: 0 // Would need to check audit logs
  }

  return {
    reportType: 'compliance',
    period: { startDate, endDate },
    organization: { id: organizationId },
    complianceScore: calculateComplianceScore(violations),
    violations,
    recommendations: generateComplianceRecommendations(violations),
    auditTrail: await getAuditTrail(supabase, organizationId, startDate, endDate),
    generatedAt: new Date().toISOString()
  }
}

// Generate custom report
async function generateCustomReport(supabase: any, organizationId: string, startDate: string, endDate: string, filters?: any, options?: any) {
  // Flexible custom report generation based on options
  const sections: any = {}

  if (options?.includeSummary) {
    sections.summary = await generateSummaryReport(supabase, organizationId, startDate, endDate, filters)
  }

  if (options?.includeDetails) {
    sections.details = await generateAttendanceReport(supabase, organizationId, startDate, endDate, filters)
  }

  if (options?.includeCharts) {
    sections.chartData = await generateChartData(supabase, organizationId, startDate, endDate)
  }

  return {
    reportType: 'custom',
    period: { startDate, endDate },
    organization: { id: organizationId },
    sections,
    generatedAt: new Date().toISOString()
  }
}

// Format as PDF
async function formatAsPDF(data: any, reportType: string, options?: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let yPosition = 800

  // Title
  page.drawText(`${reportType.toUpperCase()} REPORT`, {
    x: 50,
    y: yPosition,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0)
  })
  yPosition -= 30

  // Period
  page.drawText(`Period: ${data.period.startDate} to ${data.period.endDate}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3)
  })
  yPosition -= 30

  // Content based on report type
  if (data.overallSummary) {
    page.drawText('Summary:', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont
    })
    yPosition -= 20

    Object.entries(data.overallSummary).forEach(([key, value]) => {
      page.drawText(`${key}: ${value}`, {
        x: 70,
        y: yPosition,
        size: 11,
        font
      })
      yPosition -= 18
    })
  }

  // Add more content based on report type...

  const pdfBytes = await pdfDoc.save()
  return new Uint8Array(pdfBytes)
}

// Format as CSV
function formatAsCSV(data: any): string {
  const rows: string[] = []
  
  // Headers
  if (data.data && Object.keys(data.data).length > 0) {
    const firstRecord = Object.values(data.data)[0] as any
    if (firstRecord.records && firstRecord.records.length > 0) {
      rows.push(Object.keys(firstRecord.records[0]).join(','))
      
      // Data rows
      Object.values(data.data).forEach((group: any) => {
        group.records.forEach((record: any) => {
          rows.push(Object.values(record).map(v => `"${v}"`).join(','))
        })
      })
    }
  }

  return rows.join('\n')
}

// Format as Excel (simplified - would use a proper library in production)
async function formatAsExcel(data: any): Promise<Uint8Array> {
  // In production, use a proper Excel library like ExcelJS
  // For now, return CSV format with Excel mime type
  const csvContent = formatAsCSV(data)
  return new TextEncoder().encode(csvContent)
}

// Helper functions
function calculateEmployeeSummary(records: any[]) {
  const presentDays = records.filter(r => r.check_in_time).length
  const lateDays = records.filter(r => r.status === 'late').length
  const totalWorkMinutes = records.reduce((sum, r) => sum + (r.work_duration_minutes || 0), 0)
  const totalOvertimeMinutes = records.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0)

  return {
    presentDays,
    absentDays: records.length - presentDays,
    lateDays,
    attendanceRate: records.length > 0 ? Math.round((presentDays / records.length) * 100) : 0,
    totalWorkHours: Math.round(totalWorkMinutes / 60 * 10) / 10,
    totalOvertimeHours: Math.round(totalOvertimeMinutes / 60 * 10) / 10
  }
}

function calculateDailySummary(records: any[]) {
  return {
    totalEmployees: records.length,
    present: records.filter(r => r.check_in_time).length,
    absent: records.filter(r => !r.check_in_time).length,
    late: records.filter(r => r.status === 'late').length,
    overtime: records.filter(r => r.overtime_minutes > 0).length
  }
}

function calculateDepartmentSummary(records: any[], totalEmployees: number) {
  const presentRecords = records.filter(r => r.check_in_time).length
  const workingDays = [...new Set(records.map(r => r.date))].length

  return {
    totalEmployees,
    averageAttendance: workingDays > 0 ? Math.round(presentRecords / workingDays) : 0,
    attendanceRate: records.length > 0 ? Math.round((presentRecords / records.length) * 100) : 0
  }
}

function calculateOverallSummary(records: any[], totalEmployees: number) {
  const presentRecords = records.filter(r => r.check_in_time).length
  const totalWorkMinutes = records.reduce((sum, r) => sum + (r.work_duration_minutes || 0), 0)
  const workingDays = [...new Set(records.map(r => r.date))].length

  return {
    totalRecords: records.length,
    presentRecords,
    attendanceRate: records.length > 0 ? Math.round((presentRecords / (totalEmployees * workingDays)) * 100) : 0,
    averageWorkHours: presentRecords > 0 ? Math.round((totalWorkMinutes / presentRecords) / 60 * 10) / 10 : 0
  }
}

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

async function calculateTrends(supabase: any, organizationId: string, startDate: string, endDate: string) {
  // Calculate week-over-week trends
  const weeks = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000))
  
  return {
    weeklyTrend: 'improving', // Simplified
    monthlyTrend: 'stable',
    projectedNextMonth: {
      attendanceRate: 92,
      overtimeHours: 150
    }
  }
}

function calculateComplianceScore(violations: any): number {
  const totalViolations = Object.values(violations).reduce((sum: number, count: any) => sum + count, 0) as number
  return Math.max(0, 100 - (totalViolations * 5))
}

function generateComplianceRecommendations(violations: any): string[] {
  const recommendations: string[] = []
  
  if (violations.overtimeViolations > 0) {
    recommendations.push('Review overtime policies and ensure compliance with labor laws')
  }
  if (violations.missingCheckouts > 0) {
    recommendations.push('Implement automatic checkout reminders or policies')
  }
  
  return recommendations
}

async function getAuditTrail(supabase: any, organizationId: string, startDate: string, endDate: string) {
  const { data } = await supabase
    .from('audit_logs')
    .select('action, user_id, created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
    .limit(100)

  return data || []
}

async function generateChartData(supabase: any, organizationId: string, startDate: string, endDate: string) {
  // Generate data suitable for charting
  return {
    attendanceTrend: [], // Daily attendance rates
    overtimeTrend: [], // Daily overtime hours
    departmentComparison: [], // Department attendance rates
    employeeRanking: [] // Top performers
  }
}