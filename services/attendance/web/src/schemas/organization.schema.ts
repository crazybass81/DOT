/**
 * Organization Schema - Zod validation schemas for organization-related operations
 * 조직 및 역할 관리를 위한 Zod 스키마 정의
 */

import { z } from 'zod'
import { VALIDATION_PATTERNS } from '@/src/types/unified.types'
import { 
  OrgTypeSchema, 
  UnifiedRoleSchema, 
  IdTypeSchema,
  OrganizationSettingsSchema 
} from './user.schema'

// =====================================================
// Organization Core Schemas
// =====================================================

export const OrganizationCodeSchema = z.string()
  .length(4, '조직 코드는 4자리여야 합니다')
  .regex(/^[A-Z0-9]+$/, '조직 코드는 영대문자와 숫자만 사용 가능합니다')

export const OrganizationNameSchema = z.string()
  .min(2, '조직명은 최소 2자 이상이어야 합니다')
  .max(100, '조직명은 100자 이하여야 합니다')
  .regex(/^[가-힣a-zA-Z0-9\s\-_().&]+$/, '조직명에 특수문자는 사용할 수 없습니다')

// =====================================================
// Business Registration Schemas
// =====================================================

export const BusinessRegistrationSchema = z.object({
  businessNumber: z.string()
    .regex(VALIDATION_PATTERNS.businessNumber, '사업자등록번호는 000-00-00000 형식이어야 합니다')
    .optional(),
  corporateNumber: z.string()
    .regex(VALIDATION_PATTERNS.corporateNumber, '법인등록번호는 000000-0000000 형식이어야 합니다')
    .optional(),
  businessName: z.string().max(100).optional(),
  businessType: z.string().max(50).optional(),
  establishedAt: z.date().optional(),
  address: z.object({
    postal: z.string().max(10).optional(),
    address1: z.string().max(100).optional(),
    address2: z.string().max(100).optional(),
    city: z.string().max(50).optional(),
    region: z.string().max(50).optional()
  }).optional(),
  ceo: z.string().max(50).optional(),
  phoneNumber: z.string()
    .regex(/^0\d{1,2}-?\d{3,4}-?\d{4}$/, '올바른 전화번호 형식이 아닙니다')
    .optional(),
  website: z.string().url('올바른 URL 형식이 아닙니다').optional()
})

// =====================================================
// Subscription & Billing Schemas
// =====================================================

export const SubscriptionTierSchema = z.enum([
  'free',
  'basic', 
  'standard',
  'premium',
  'enterprise'
], {
  errorMap: () => ({ message: '올바른 구독 티어를 선택해주세요' })
})

export const BillingDataSchema = z.object({
  plan: SubscriptionTierSchema,
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  price: z.number().min(0).default(0),
  currency: z.string().length(3).default('KRW'),
  paymentMethod: z.enum(['card', 'bank', 'invoice']).optional(),
  nextBillingDate: z.date().optional(),
  discountCode: z.string().max(20).optional(),
  discountAmount: z.number().min(0).default(0)
})

// =====================================================
// Enhanced Organization Schema
// =====================================================

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  code: OrganizationCodeSchema,
  name: OrganizationNameSchema,
  displayName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url('올바른 URL 형식이 아닙니다').optional(),
  orgType: OrgTypeSchema,
  parentOrgId: z.string().uuid().optional(),
  ownerIdentityId: z.string().uuid(),
  businessRegistration: BusinessRegistrationSchema.default({}),
  businessVerificationStatus: z.enum(['pending', 'verified', 'rejected', 'expired'], {
    errorMap: () => ({ message: '올바른 인증 상태가 아닙니다' })
  }).default('pending'),
  settings: OrganizationSettingsSchema,
  maxEmployees: z.number().min(1).max(10000).optional(),
  maxLocations: z.number().min(1).max(100).optional(),
  subscriptionTier: SubscriptionTierSchema.optional(),
  subscriptionExpiresAt: z.date().optional(),
  billingData: BillingDataSchema.default({
    plan: 'free',
    billingCycle: 'monthly',
    price: 0,
    currency: 'KRW',
    discountAmount: 0
  }),
  isActive: z.boolean().default(true),
  suspendedAt: z.date().optional(),
  suspensionReason: z.string().max(200).optional(),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date()
})

// =====================================================
// Organization Request Schemas
// =====================================================

export const CreateOrganizationRequestSchema = z.object({
  name: OrganizationNameSchema,
  displayName: z.string().max(100).optional(),
  orgType: OrgTypeSchema,
  ownerIdentityId: z.string().uuid(),
  businessNumber: z.string()
    .regex(VALIDATION_PATTERNS.businessNumber, '사업자등록번호는 000-00-00000 형식이어야 합니다')
    .optional(),
  settings: OrganizationSettingsSchema.partial().optional(),
  parentOrgId: z.string().uuid().optional(),
  description: z.string().max(500).optional()
})

export const CreateOrganizationResponseSchema = z.object({
  success: z.boolean(),
  organization: OrganizationSchema.optional(),
  code: z.string().optional(),
  error: z.string().optional()
})

export const UpdateOrganizationRequestSchema = z.object({
  name: OrganizationNameSchema.optional(),
  displayName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  settings: OrganizationSettingsSchema.partial().optional(),
  maxEmployees: z.number().min(1).max(10000).optional(),
  maxLocations: z.number().min(1).max(100).optional(),
  metadata: z.record(z.any()).optional()
})

export const OrganizationQuerySchema = z.object({
  id: z.string().uuid().optional(),
  code: OrganizationCodeSchema.optional(),
  name: z.string().optional(),
  orgType: OrgTypeSchema.optional(),
  isActive: z.boolean().optional(),
  parentOrgId: z.string().uuid().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// =====================================================
// Role Management Schemas
// =====================================================

export const RoleHierarchySchema = z.object({
  role: UnifiedRoleSchema,
  level: z.number().min(0).max(100),
  permissions: z.array(z.string()),
  canAssignRoles: z.array(UnifiedRoleSchema)
})

export const PermissionSchema = z.object({
  resource: z.string(),
  action: z.enum(['create', 'read', 'update', 'delete', 'manage']),
  conditions: z.record(z.any()).optional()
})

export const CustomRoleSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  baseRole: UnifiedRoleSchema,
  permissions: z.array(PermissionSchema),
  isActive: z.boolean().default(true),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// =====================================================
// Employee Management Schemas
// =====================================================

export const EmployeeStatusSchema = z.enum([
  'active',
  'inactive', 
  'suspended',
  'terminated'
], {
  errorMap: () => ({ message: '올바른 직원 상태를 선택해주세요' })
})

export const EmployeeSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  identityId: z.string().uuid(),
  employeeNumber: z.string().max(20).optional(),
  department: z.string().max(50).optional(),
  position: z.string().max(50).optional(),
  hireDate: z.date(),
  salary: z.number().min(0).optional(),
  workingHours: z.object({
    start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    breakTime: z.number().min(0).default(60)
  }).optional(),
  status: EmployeeStatusSchema.default('active'),
  role: UnifiedRoleSchema,
  customRoleId: z.string().uuid().optional(),
  permissions: z.record(z.boolean()).default({}),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date()
})

// =====================================================
// Location Management Schemas
// =====================================================

export const LocationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(100),
  address: z.string().max(200),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),
  radius: z.number().min(10).max(1000).default(100),
  isActive: z.boolean().default(true),
  workingHours: z.object({
    monday: z.object({ start: z.string(), end: z.string() }).optional(),
    tuesday: z.object({ start: z.string(), end: z.string() }).optional(),
    wednesday: z.object({ start: z.string(), end: z.string() }).optional(),
    thursday: z.object({ start: z.string(), end: z.string() }).optional(),
    friday: z.object({ start: z.string(), end: z.string() }).optional(),
    saturday: z.object({ start: z.string(), end: z.string() }).optional(),
    sunday: z.object({ start: z.string(), end: z.string() }).optional()
  }).optional(),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date()
})

// =====================================================
// Response Schemas
// =====================================================

export const OrganizationResponseSchema = z.object({
  success: z.boolean(),
  data: OrganizationSchema.optional(),
  error: z.string().optional(),
  code: z.string().optional()
})

export const OrganizationListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(OrganizationSchema).optional(),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number()
  }).optional(),
  error: z.string().optional(),
  code: z.string().optional()
})

export const EmployeeResponseSchema = z.object({
  success: z.boolean(),
  data: EmployeeSchema.optional(),
  error: z.string().optional(),
  code: z.string().optional()
})

export const LocationResponseSchema = z.object({
  success: z.boolean(),
  data: LocationSchema.optional(),
  error: z.string().optional(),
  code: z.string().optional()
})

// =====================================================
// Type Exports (Inferred from Schemas)
// =====================================================

export type Organization = z.infer<typeof OrganizationSchema>
export type BusinessRegistration = z.infer<typeof BusinessRegistrationSchema>
export type BillingData = z.infer<typeof BillingDataSchema>
export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationRequestSchema>
export type UpdateOrganizationRequest = z.infer<typeof UpdateOrganizationRequestSchema>
export type OrganizationQuery = z.infer<typeof OrganizationQuerySchema>
export type Employee = z.infer<typeof EmployeeSchema>
export type Location = z.infer<typeof LocationSchema>
export type CustomRole = z.infer<typeof CustomRoleSchema>
export type Permission = z.infer<typeof PermissionSchema>
export type EmployeeStatus = z.infer<typeof EmployeeStatusSchema>
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>

// =====================================================
// Validation Utility Functions
// =====================================================

/**
 * 조직 생성 권한 검증
 */
export function validateOrganizationCreationPermission(
  userRole: UnifiedRole, 
  userIdType: IdType, 
  orgType: OrgType
): boolean {
  try {
    UnifiedRoleSchema.parse(userRole)
    IdTypeSchema.parse(userIdType)
    OrgTypeSchema.parse(orgType)

    // Master can create any organization
    if (userRole === 'master') return true

    // Business ownership rules
    switch (orgType) {
      case 'personal':
        return true
      case 'business_owner':
        return userIdType === 'business_owner'
      case 'corporation':
        return userIdType === 'corporation'
      case 'franchise_hq':
        return userIdType === 'business_owner' || userIdType === 'corporation'
      case 'franchise_store':
        return userRole === 'franchise_admin' || userRole === 'admin'
      default:
        return false
    }
  } catch {
    return false
  }
}

/**
 * 조직 계층 구조 검증
 */
export function validateOrganizationHierarchy(
  parentOrgType: OrgType | null, 
  childOrgType: OrgType
): boolean {
  try {
    if (parentOrgType) {
      OrgTypeSchema.parse(parentOrgType)
    }
    OrgTypeSchema.parse(childOrgType)

    if (!parentOrgType) return true

    // Franchise hierarchy rules
    if (childOrgType === 'franchise_store') {
      return parentOrgType === 'franchise_hq'
    }

    // Other hierarchies are generally allowed
    return true
  } catch {
    return false
  }
}

/**
 * 직원 수 제한 검증
 */
export function validateEmployeeLimit(
  currentCount: number,
  maxEmployees: number | undefined,
  subscriptionTier: SubscriptionTier
): boolean {
  if (maxEmployees && currentCount >= maxEmployees) {
    return false
  }

  // Subscription-based limits
  const tierLimits = {
    free: 5,
    basic: 25,
    standard: 100,
    premium: 500,
    enterprise: 10000
  }

  return currentCount < tierLimits[subscriptionTier]
}

/**
 * 구독 만료 검증
 */
export function validateSubscriptionStatus(
  subscriptionExpiresAt: Date | undefined,
  subscriptionTier: SubscriptionTier
): boolean {
  // Free tier never expires
  if (subscriptionTier === 'free') return true
  
  if (!subscriptionExpiresAt) return false
  
  return subscriptionExpiresAt > new Date()
}