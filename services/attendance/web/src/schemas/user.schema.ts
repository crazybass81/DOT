/**
<<<<<<< HEAD
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
=======
 * Zod-based User Schema - Single Source of Truth
 * 
 * Runtime validation + Compile-time type generation
 * 이 스키마가 모든 User 관련 타입의 원천입니다
 */

import { z } from 'zod';

// ============================================
// Core Role Schema - 4-tier hierarchy
// ============================================
export const CoreUserRoleSchema = z.enum([
  'master_admin',
  'admin',
  'manager',
  'worker'
]);

// ============================================
// Legacy Role Schema - For backward compatibility
// ============================================
export const LegacyUserRoleSchema = z.enum([
  'EMPLOYEE',
  'BUSINESS_ADMIN',
  'SUPER_ADMIN'
]);

// ============================================
// ID-ROLE-PAPER Dynamic Role Schema
// ============================================
export const DynamicRoleSchema = z.enum([
  'SEEKER',
  'WORKER',
  'MANAGER',
  'SUPERVISOR',
  'OWNER',
  'FRANCHISEE',
  'FRANCHISOR'
]);

// ============================================
// Unified Role Schema with discriminated union
// ============================================
export const UnifiedRoleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('core'),
    value: CoreUserRoleSchema
  }),
  z.object({
    type: z.literal('legacy'),
    value: LegacyUserRoleSchema
  }),
  z.object({
    type: z.literal('dynamic'),
    value: DynamicRoleSchema
  })
]);

// ============================================
// User Schema - Comprehensive definition
// ============================================
export const UserSchema = z.object({
  // Required fields
  id: z.string().uuid(),
  email: z.string().email(),
  
  // Role can be any of the three systems
  role: z.union([
    CoreUserRoleSchema,
    LegacyUserRoleSchema,
    DynamicRoleSchema
  ]),
  
  // Optional fields
  name: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  
  // Database compatibility fields (snake_case)
  organization_id: z.string().uuid().optional(),
  
  // Timestamps - flexible format
  createdAt: z.union([z.string(), z.date()]).optional(),
  created_at: z.string().optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
  updated_at: z.string().optional(),
  
  // Status
  isActive: z.boolean().default(true),
  is_active: z.boolean().optional(),
  
  // Metadata
  metadata: z.record(z.any()).optional()
});

// ============================================
// Type exports - Generated from schemas
// ============================================
export type CoreUserRole = z.infer<typeof CoreUserRoleSchema>;
export type LegacyUserRole = z.infer<typeof LegacyUserRoleSchema>;
export type DynamicRole = z.infer<typeof DynamicRoleSchema>;
export type UnifiedRole = z.infer<typeof UnifiedRoleSchema>;
export type User = z.infer<typeof UserSchema>;

// ============================================
// Validation functions
// ============================================
export const validateUser = (data: unknown): User => {
  return UserSchema.parse(data);
};

export const validateUserSafe = (data: unknown): 
  { success: true; data: User } | 
  { success: false; error: z.ZodError } => {
  const result = UserSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
};

// ============================================
// Role conversion utilities
// ============================================
export class RoleConverter {
  private static readonly ROLE_MAP = {
    // Legacy to Core
    'EMPLOYEE': 'worker',
    'BUSINESS_ADMIN': 'admin',
    'SUPER_ADMIN': 'master_admin',
    
    // Dynamic to Core
    'SEEKER': 'worker',
    'WORKER': 'worker',
    'MANAGER': 'manager',
    'SUPERVISOR': 'manager',
    'OWNER': 'admin',
    'FRANCHISEE': 'admin',
    'FRANCHISOR': 'master_admin'
  } as const;
  
  static toCore(role: string): CoreUserRole {
    const mapped = this.ROLE_MAP[role as keyof typeof this.ROLE_MAP];
    if (mapped && CoreUserRoleSchema.safeParse(mapped).success) {
      return mapped as CoreUserRole;
    }
    
    // If already a core role
    const parsed = CoreUserRoleSchema.safeParse(role);
    if (parsed.success) {
      return parsed.data;
    }
    
    // Default fallback
    return 'worker';
  }
  
  static isValidRole(role: unknown): boolean {
    return CoreUserRoleSchema.safeParse(role).success ||
           LegacyUserRoleSchema.safeParse(role).success ||
           DynamicRoleSchema.safeParse(role).success;
  }
}

// ============================================
// Database mapping utilities
// ============================================
export class DatabaseMapper {
  /**
   * Convert database user to application user
   * Handles snake_case to camelCase conversion
   */
  static fromDatabase(dbUser: any): User {
    return UserSchema.parse({
      id: dbUser.id,
      email: dbUser.email,
      role: RoleConverter.toCore(dbUser.role),
      name: dbUser.name || dbUser.full_name,
      organizationId: dbUser.organization_id,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      isActive: dbUser.is_active ?? true,
      metadata: dbUser.metadata
    });
  }
  
  /**
   * Convert application user to database format
   * Handles camelCase to snake_case conversion
   */
  static toDatabase(user: User): any {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      organization_id: user.organizationId || user.organization_id,
      created_at: user.createdAt || user.created_at,
      updated_at: user.updatedAt || user.updated_at,
      is_active: user.isActive ?? user.is_active ?? true,
      metadata: user.metadata
    };
  }
}

// ============================================
// Type guards
// ============================================
export const isCoreRole = (role: unknown): role is CoreUserRole => {
  return CoreUserRoleSchema.safeParse(role).success;
};

export const isLegacyRole = (role: unknown): role is LegacyUserRole => {
  return LegacyUserRoleSchema.safeParse(role).success;
};

export const isDynamicRole = (role: unknown): role is DynamicRole => {
  return DynamicRoleSchema.safeParse(role).success;
};

export const isUser = (data: unknown): data is User => {
  return UserSchema.safeParse(data).success;
};
>>>>>>> a75ba123 ([Auto-sync] 2025-09-09 22:34:51)
