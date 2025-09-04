// Shared validation schemas using Zod for security
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// UUID validation schema
export const uuidSchema = z.string().uuid('Invalid UUID format')

// Date validation schema
export const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format'
)

// Time validation schema  
export const timeSchema = z.string().regex(
  /^([01]\d|2[0-3]):([0-5]\d)$/,
  'Time must be in HH:MM format'
)

// Email validation schema
export const emailSchema = z.string().email('Invalid email format')

// Phone validation schema
export const phoneSchema = z.string().regex(
  /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
  'Invalid phone number format'
)

// Employee role validation
export const roleSchema = z.enum(['master_admin', 'admin', 'manager', 'worker'])

// Verification method validation
export const verificationMethodSchema = z.enum(['gps', 'qr', 'wifi', 'biometric', 'manual'])

// Location coordinates validation
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
})

// Attendance request validation
export const attendanceRequestSchema = z.object({
  action: z.enum(['check_in', 'check_out']),
  employeeId: uuidSchema,
  location: coordinatesSchema.optional(),
  verificationMethod: verificationMethodSchema,
  qrCode: z.string().optional(),
  wifiSSID: z.string().optional(),
  biometricToken: z.string().optional(),
  deviceId: z.string().optional(),
  ipAddress: z.string().ip().optional()
})

// Shift request validation
export const shiftRequestSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'assign', 'list']),
  shiftData: z.object({
    name: z.string().min(1).max(100),
    startTime: timeSchema,
    endTime: timeSchema,
    breakDuration: z.number().min(0).max(180),
    daysOfWeek: z.array(z.number().min(1).max(7)),
    organizationId: uuidSchema.optional(),
    isActive: z.boolean().optional()
  }).optional(),
  employeeId: uuidSchema.optional(),
  shiftId: uuidSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional()
})

// Analytics request validation
export const analyticsRequestSchema = z.object({
  type: z.enum(['summary', 'trends', 'employee', 'department', 'overtime', 'patterns']),
  organizationId: uuidSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  employeeId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional()
})

// Report request validation
export const reportRequestSchema = z.object({
  type: z.enum(['attendance', 'payroll', 'summary', 'compliance', 'custom']),
  format: z.enum(['pdf', 'csv', 'excel', 'json']),
  organizationId: uuidSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  filters: z.object({
    employeeIds: z.array(uuidSchema).optional(),
    departmentIds: z.array(uuidSchema).optional(),
    includeInactive: z.boolean().optional(),
    groupBy: z.enum(['employee', 'department', 'date', 'week', 'month']).optional()
  }).optional(),
  customOptions: z.object({
    includeCharts: z.boolean().optional(),
    includeDetails: z.boolean().optional(),
    includeSummary: z.boolean().optional(),
    language: z.enum(['en', 'ko', 'ja']).optional()
  }).optional()
})

// Dashboard request validation
export const dashboardRequestSchema = z.object({
  action: z.enum(['overview', 'employees', 'departments', 'approvals', 'settings', 'reports']),
  organizationId: uuidSchema,
  filters: z.object({
    department: uuidSchema.optional(),
    status: z.string().optional(),
    date: dateSchema.optional(),
    search: z.string().max(100).optional()
  }).optional(),
  data: z.any().optional()
})

// Employee creation validation
export const employeeCreateSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number and special character'
  ).optional(),
  name: z.string().min(1).max(100),
  role: roleSchema,
  departmentId: uuidSchema.optional(),
  employeeCode: z.string().optional(),
  phone: phoneSchema.optional()
})

// Settings validation
export const organizationSettingsSchema = z.object({
  workStartTime: timeSchema,
  workEndTime: timeSchema,
  lunchBreakDuration: z.number().min(0).max(120),
  overtimeThreshold: z.number().min(0).max(720),
  graceMinutes: z.number().min(0).max(60),
  locationTracking: z.boolean(),
  biometricEnabled: z.boolean(),
  autoCheckoutEnabled: z.boolean(),
  notificationSettings: z.object({
    lateArrival: z.boolean(),
    earlyDeparture: z.boolean(),
    overtime: z.boolean(),
    absence: z.boolean()
  })
})

// Sanitize SQL input (additional protection)
export function sanitizeInput(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/sp_/gi, '')
    .trim()
}

// Validate and sanitize pagination
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  orderBy: z.string().regex(/^[a-zA-Z_]+$/).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc')
})

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: {
    anonymous: 10,
    authenticated: 100,
    premium: 1000
  }
}