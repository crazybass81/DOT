// Unit tests for validation and security modules
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { z } from 'zod'

// Mock Zod schemas since we can't import Deno modules in Jest
const uuidSchema = z.string().uuid('Invalid UUID format')
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format')
const emailSchema = z.string().email('Invalid email format')
const roleSchema = z.enum(['master_admin', 'admin', 'manager', 'worker'])
const verificationMethodSchema = z.enum(['gps', 'qr', 'wifi', 'biometric', 'manual'])

const attendanceRequestSchema = z.object({
  action: z.enum(['check_in', 'check_out']),
  employeeId: uuidSchema,
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  verificationMethod: verificationMethodSchema,
  qrCode: z.string().optional(),
  wifiSSID: z.string().optional(),
  biometricToken: z.string().optional(),
  deviceId: z.string().optional(),
  ipAddress: z.string().ip().optional()
})

function sanitizeInput(input: string): string {
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

describe('Validation Schemas', () => {
  describe('UUID Validation', () => {
    it('should validate correct UUID format', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000'
      const result = uuidSchema.safeParse(validUUID)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID format', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716',
        '550e8400e29b41d4a716446655440000',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      ]

      invalidUUIDs.forEach(uuid => {
        const result = uuidSchema.safeParse(uuid)
        expect(result.success).toBe(false)
      })
    })

    it('should prevent SQL injection in UUID', () => {
      const maliciousUUIDs = [
        "550e8400-e29b-41d4-a716-446655440000'; DROP TABLE users; --",
        "550e8400-e29b-41d4-a716-446655440000' OR '1'='1",
        "550e8400-e29b-41d4-a716-446655440000\" OR \"1\"=\"1"
      ]

      maliciousUUIDs.forEach(uuid => {
        const result = uuidSchema.safeParse(uuid)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Date Validation', () => {
    it('should validate correct date format', () => {
      const validDates = ['2025-01-01', '2025-12-31', '2000-02-29']
      
      validDates.forEach(date => {
        const result = dateSchema.safeParse(date)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid date format', () => {
      const invalidDates = [
        '01-01-2025',
        '2025/01/01',
        '2025-1-1',
        '2025-13-01',
        'today',
        '2025-01-01T00:00:00'
      ]

      invalidDates.forEach(date => {
        const result = dateSchema.safeParse(date)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Time Validation', () => {
    it('should validate correct time format', () => {
      const validTimes = ['09:00', '00:00', '23:59', '12:30']
      
      validTimes.forEach(time => {
        const result = timeSchema.safeParse(time)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid time format', () => {
      const invalidTimes = [
        '9:00',
        '24:00',
        '23:60',
        '9:30 AM',
        '09-00',
        '09:00:00'
      ]

      invalidTimes.forEach(time => {
        const result = timeSchema.safeParse(time)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      const validEmails = [
        'user@example.com',
        'test.user@company.co.kr',
        'admin+test@subdomain.example.org'
      ]
      
      validEmails.forEach(email => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user..test@example.com',
        'user@.com'
      ]

      invalidEmails.forEach(email => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Role Validation', () => {
    it('should validate allowed roles', () => {
      const validRoles = ['master_admin', 'admin', 'manager', 'worker']
      
      validRoles.forEach(role => {
        const result = roleSchema.safeParse(role)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid roles', () => {
      const invalidRoles = ['superadmin', 'user', 'guest', 'ADMIN', '']
      
      invalidRoles.forEach(role => {
        const result = roleSchema.safeParse(role)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Attendance Request Validation', () => {
    it('should validate complete valid request', () => {
      const validRequest = {
        action: 'check_in',
        employeeId: '550e8400-e29b-41d4-a716-446655440000',
        location: { lat: 37.5665, lng: 126.9780 },
        verificationMethod: 'gps',
        deviceId: 'device123',
        ipAddress: '192.168.1.1'
      }

      const result = attendanceRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should validate request with optional fields', () => {
      const minimalRequest = {
        action: 'check_out',
        employeeId: '550e8400-e29b-41d4-a716-446655440000',
        verificationMethod: 'manual'
      }

      const result = attendanceRequestSchema.safeParse(minimalRequest)
      expect(result.success).toBe(true)
    })

    it('should reject request with invalid location', () => {
      const invalidRequest = {
        action: 'check_in',
        employeeId: '550e8400-e29b-41d4-a716-446655440000',
        location: { lat: 91, lng: 181 }, // Invalid coordinates
        verificationMethod: 'gps'
      }

      const result = attendanceRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should reject request with SQL injection attempts', () => {
      const maliciousRequest = {
        action: 'check_in',
        employeeId: "550e8400-e29b-41d4-a716-446655440000'; DROP TABLE attendance; --",
        verificationMethod: 'manual'
      }

      const result = attendanceRequestSchema.safeParse(maliciousRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('Input Sanitization', () => {
    it('should sanitize SQL injection attempts', () => {
      const inputs = [
        { input: "admin' OR '1'='1", expected: "admin OR 1=1" },
        { input: "user; DROP TABLE users; --", expected: "user DROP TABLE users " },
        { input: "/* comment */ SELECT * FROM users", expected: " comment  SELECT * FROM users" },
        { input: "xp_cmdshell", expected: "" },
        { input: "sp_executesql", expected: "" }
      ]

      inputs.forEach(({ input, expected }) => {
        const sanitized = sanitizeInput(input)
        expect(sanitized).toBe(expected)
      })
    })

    it('should preserve safe input', () => {
      const safeInputs = [
        'John Doe',
        'user@example.com',
        '123 Main Street',
        'This is a normal comment'
      ]

      safeInputs.forEach(input => {
        const sanitized = sanitizeInput(input)
        expect(sanitized).toBe(input)
      })
    })

    it('should handle special characters safely', () => {
      const input = "O'Brien's & Sons <Company>"
      const sanitized = sanitizeInput(input)
      expect(sanitized).toBe("O''Brien''s & Sons <Company>")
    })
  })

  describe('IP Address Validation', () => {
    it('should validate IPv4 addresses', () => {
      const validIPs = [
        '192.168.1.1',
        '10.0.0.0',
        '255.255.255.255',
        '127.0.0.1'
      ]

      validIPs.forEach(ip => {
        const schema = z.string().ip()
        const result = schema.safeParse(ip)
        expect(result.success).toBe(true)
      })
    })

    it('should validate IPv6 addresses', () => {
      const validIPs = [
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '::1',
        'fe80::1',
        '::ffff:192.0.2.1'
      ]

      validIPs.forEach(ip => {
        const schema = z.string().ip()
        const result = schema.safeParse(ip)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid IP addresses', () => {
      const invalidIPs = [
        '256.256.256.256',
        '192.168.1',
        'not.an.ip.address',
        '192.168.1.1.1'
      ]

      invalidIPs.forEach(ip => {
        const schema = z.string().ip()
        const result = schema.safeParse(ip)
        expect(result.success).toBe(false)
      })
    })
  })
})

describe('Complex Validation Scenarios', () => {
  it('should handle nested validation errors gracefully', () => {
    const complexSchema = z.object({
      user: z.object({
        id: uuidSchema,
        email: emailSchema,
        role: roleSchema
      }),
      metadata: z.object({
        createdAt: dateSchema,
        updatedAt: dateSchema,
        version: z.number().positive()
      })
    })

    const invalidData = {
      user: {
        id: 'not-a-uuid',
        email: 'invalid-email',
        role: 'superuser'
      },
      metadata: {
        createdAt: '01/01/2025',
        updatedAt: '01/02/2025',
        version: -1
      }
    }

    const result = complexSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0)
      expect(result.error.errors.some(e => e.path.includes('id'))).toBe(true)
      expect(result.error.errors.some(e => e.path.includes('email'))).toBe(true)
      expect(result.error.errors.some(e => e.path.includes('role'))).toBe(true)
    }
  })

  it('should validate array of UUIDs', () => {
    const arraySchema = z.array(uuidSchema)
    
    const validArray = [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002'
    ]

    const result = arraySchema.safeParse(validArray)
    expect(result.success).toBe(true)

    const invalidArray = [
      '550e8400-e29b-41d4-a716-446655440000',
      'not-a-uuid',
      '550e8400-e29b-41d4-a716-446655440002'
    ]

    const invalidResult = arraySchema.safeParse(invalidArray)
    expect(invalidResult.success).toBe(false)
  })
})