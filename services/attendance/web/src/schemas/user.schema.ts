/**
 * User Schema - Zod validation schemas for user-related operations
 * 기존 unified.types.ts의 TypeScript 타입을 Zod 스키마로 변환
 */

import { z } from 'zod'
import { VALIDATION_PATTERNS, ERROR_CODES } from '@/src/types/unified.types'

// =====================================================
// Core Enum Schemas
// =====================================================

export const IdTypeSchema = z.enum([
  'personal',
  'business_owner', 
  'corporation',
  'franchise_hq'
], {
  errorMap: () => ({ message: '올바른 ID 타입을 선택해주세요' })
})

export const UnifiedRoleSchema = z.enum([
  'master',
  'admin', 
  'manager',
  'worker',
  'franchise_admin'
], {
  errorMap: () => ({ message: '올바른 역할을 선택해주세요' })
})

export const OrgTypeSchema = z.enum([
  'personal',
  'business_owner',
  'corporation', 
  'franchise_hq',
  'franchise_store'
], {
  errorMap: () => ({ message: '올바른 조직 타입을 선택해주세요' })
})

// =====================================================
// Validation Patterns as Zod Schemas
// =====================================================

export const EmailSchema = z.string()
  .email('올바른 이메일 형식이 아닙니다')
  .regex(VALIDATION_PATTERNS.email, '이메일 형식이 올바르지 않습니다')

export const PhoneSchema = z.string()
  .regex(VALIDATION_PATTERNS.phone, '전화번호는 010-0000-0000 형식이어야 합니다')
  .optional()

export const BusinessNumberSchema = z.string()
  .regex(VALIDATION_PATTERNS.businessNumber, '사업자등록번호는 000-00-00000 형식이어야 합니다')
  .optional()

export const CorporateNumberSchema = z.string()
  .regex(VALIDATION_PATTERNS.corporateNumber, '법인등록번호는 000000-0000000 형식이어야 합니다')
  .optional()

// =====================================================
// Organization Settings Schema
// =====================================================

export const OrganizationSettingsSchema = z.object({
  workingHours: z.object({
    start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다 (HH:mm)'),
    end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다 (HH:mm)')
  }),
  overtimePolicy: z.object({
    enabled: z.boolean().default(false),
    threshold: z.number().min(0).max(24).default(8)
  }),
  gpsTracking: z.object({
    enabled: z.boolean().default(true),
    radius: z.number().min(10).max(1000).default(100)
  }),
  approvalRequired: z.boolean().default(false),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false)
  })
})

// =====================================================
// Identity Schema
// =====================================================

export const IdentitySchema = z.object({
  id: z.string().uuid('올바른 UUID 형식이 아닙니다'),
  email: EmailSchema,
  phone: PhoneSchema,
  fullName: z.string()
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(50, '이름은 50자 이하여야 합니다'),
  birthDate: z.string()
    .datetime('올바른 날짜 형식이 아닙니다')
    .optional(),
  idType: IdTypeSchema,
  idNumber: z.string().optional(),
  businessVerificationStatus: z.enum(['pending', 'verified', 'rejected'], {
    errorMap: () => ({ message: '올바른 인증 상태가 아닙니다' })
  }),
  businessVerificationData: z.record(z.any()).default({}),
  authUserId: z.string().uuid().optional(),
  profileData: z.record(z.any()).default({}),
  isVerified: z.boolean().default(false),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
})

// =====================================================
// Role Assignment Schema
// =====================================================

export const RoleAssignmentSchema = z.object({
  id: z.string().uuid(),
  identityId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  role: UnifiedRoleSchema,
  isActive: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
  customPermissions: z.record(z.any()).default({}),
  accessRestrictions: z.record(z.any()).default({}),
  assignedAt: z.date(),
  assignedBy: z.string().uuid(),
  revokedAt: z.date().optional(),
  revokedBy: z.string().uuid().optional(),
  revocationReason: z.string().max(200).optional(),
  metadata: z.record(z.any()).default({})
})

// =====================================================
// Request Schemas
// =====================================================

export const CreateIdentityRequestSchema = z.object({
  email: EmailSchema,
  phone: PhoneSchema,
  fullName: z.string()
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(50, '이름은 50자 이하여야 합니다'),
  birthDate: z.string()
    .datetime('올바른 날짜 형식이 아닙니다')
    .optional(),
  idType: IdTypeSchema,
  idNumber: z.string().optional(),
  businessData: z.record(z.any()).optional(),
  authUserId: z.string().uuid().optional(),
  profileData: z.record(z.any()).optional()
})

export const AssignRoleRequestSchema = z.object({
  identityId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  role: UnifiedRoleSchema,
  assignedBy: z.string().uuid(),
  customPermissions: z.record(z.any()).optional()
})

// =====================================================
// Response Schemas
// =====================================================

export const CreateIdentityResponseSchema = z.object({
  success: z.boolean(),
  identity: IdentitySchema.optional(),
  requiresVerification: z.boolean().optional(),
  verificationMethod: z.string().optional(),
  error: z.string().optional()
})

export const AssignRoleResponseSchema = z.object({
  success: z.boolean(),
  roleAssignment: RoleAssignmentSchema.optional(),
  error: z.string().optional()
})

// =====================================================
// Auth Schemas
// =====================================================

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: EmailSchema,
  name: z.string().optional(),
  role: UnifiedRoleSchema.optional(),
  identityId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  permissions: z.record(z.boolean()).optional()
})

export const AuthSessionSchema = z.object({
  user: AuthUserSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.date()
})

// =====================================================
// Type Exports (Inferred from Schemas)
// =====================================================

export type Identity = z.infer<typeof IdentitySchema>
export type OrganizationSettings = z.infer<typeof OrganizationSettingsSchema>
export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>
export type CreateIdentityRequest = z.infer<typeof CreateIdentityRequestSchema>
export type AssignRoleRequest = z.infer<typeof AssignRoleRequestSchema>
export type CreateIdentityResponse = z.infer<typeof CreateIdentityResponseSchema>
export type AssignRoleResponse = z.infer<typeof AssignRoleResponseSchema>
export type AuthUser = z.infer<typeof AuthUserSchema>
export type AuthSession = z.infer<typeof AuthSessionSchema>
export type IdType = z.infer<typeof IdTypeSchema>
export type UnifiedRole = z.infer<typeof UnifiedRoleSchema>
export type OrgType = z.infer<typeof OrgTypeSchema>