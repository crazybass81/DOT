import { z } from 'zod';

// Location 스키마
export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  accuracy: z.number().min(0).optional()
});

// Check-in 스키마
export const CheckInSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID format'),
  business_id: z.string().uuid('Invalid business ID format'),
  check_in_time: z.string().datetime().optional(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  check_in_location: LocationSchema.optional(),
  verification_method: z.enum(['gps', 'qr', 'manual']).default('manual'),
  notes: z.string().max(500, 'Notes too long').optional()
});

// Check-out 스키마
export const CheckOutSchema = z.object({
  attendance_id: z.string().uuid('Invalid attendance ID format'),
  check_out_time: z.string().datetime().optional(),
  check_out_location: LocationSchema.optional(),
  break_time_minutes: z.number().min(0).max(480).default(0), // 최대 8시간
  overtime_minutes: z.number().min(0).max(720).default(0),   // 최대 12시간
  notes: z.string().max(500, 'Notes too long').optional()
});

// Attendance record 조회 스키마
export const AttendanceQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  business_id: z.string().uuid().optional(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['active', 'completed', 'cancelled', 'pending']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

// Attendance record 전체 스키마
export const AttendanceRecordSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  employee_id: z.string().uuid(),
  business_id: z.string().uuid(),
  check_in_time: z.string().datetime().nullable(),
  check_out_time: z.string().datetime().nullable(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_in_location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
    accuracy: z.number().optional()
  }).nullable(),
  check_out_location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
    accuracy: z.number().optional()
  }).nullable(),
  verification_method: z.enum(['gps', 'qr', 'manual']),
  status: z.enum(['active', 'completed', 'cancelled', 'pending']),
  notes: z.string().nullable(),
  break_time_minutes: z.number(),
  overtime_minutes: z.number()
});

// API 응답 스키마
export const AttendanceApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: AttendanceRecordSchema.optional(),
  error: z.string().optional(),
  details: z.array(z.string()).optional()
});

export const AttendanceListApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(AttendanceRecordSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number()
  }),
  error: z.string().optional()
});

// 통계 스키마
export const AttendanceStatsSchema = z.object({
  totalEmployees: z.number(),
  presentToday: z.number(),
  absentToday: z.number(),
  lateToday: z.number(),
  checkInsToday: z.number(),
  checkOutsToday: z.number(),
  attendanceRate: z.number().min(0).max(100)
});

// 실시간 이벤트 스키마
export const RealtimeEventSchema = z.object({
  type: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  record: AttendanceRecordSchema.optional(),
  old_record: AttendanceRecordSchema.optional(),
  timestamp: z.string().datetime(),
  employee_id: z.string().uuid()
});

// Type exports
export type Location = z.infer<typeof LocationSchema>;
export type CheckInData = z.infer<typeof CheckInSchema>;
export type CheckOutData = z.infer<typeof CheckOutSchema>;
export type AttendanceQuery = z.infer<typeof AttendanceQuerySchema>;
export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;
export type AttendanceApiResponse = z.infer<typeof AttendanceApiResponseSchema>;
export type AttendanceListApiResponse = z.infer<typeof AttendanceListApiResponseSchema>;
export type AttendanceStats = z.infer<typeof AttendanceStatsSchema>;
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;

// 검증 유틸리티 함수들
export const validateCheckIn = (data: unknown) => {
  return CheckInSchema.safeParse(data);
};

export const validateCheckOut = (data: unknown) => {
  return CheckOutSchema.safeParse(data);
};

export const validateAttendanceQuery = (data: unknown) => {
  return AttendanceQuerySchema.safeParse(data);
};

export const validateAttendanceRecord = (data: unknown) => {
  return AttendanceRecordSchema.safeParse(data);
};

// 에러 메시지 변환 함수
export const formatValidationErrors = (errors: z.ZodIssue[]): string[] => {
  return errors.map(error => {
    const path = error.path.join('.');
    return `${path}: ${error.message}`;
  });
};

// 기본값 생성 함수들
export const createDefaultCheckInData = (employeeId: string, businessId: string): Partial<CheckInData> => ({
  employee_id: employeeId,
  business_id: businessId,
  verification_method: 'manual',
  work_date: new Date().toISOString().split('T')[0]
});

export const createDefaultCheckOutData = (attendanceId: string): Partial<CheckOutData> => ({
  attendance_id: attendanceId,
  break_time_minutes: 60, // 기본 1시간
  overtime_minutes: 0
});