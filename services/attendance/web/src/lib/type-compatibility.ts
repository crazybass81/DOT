/**
 * Type Compatibility Layer
 * 기존 TypeScript 타입과 Zod 스키마 간의 호환성을 보장하는 레이어
 */

import { z } from 'zod'

// Schema imports
import {
  IdentitySchema,
  OrganizationSchema,
  OrganizationSettingsSchema,
  RoleAssignmentSchema,
  CreateIdentityRequestSchema,
  CreateOrganizationRequestSchema,
  AssignRoleRequestSchema,
  AuthUserSchema,
  AuthSessionSchema,
  IdTypeSchema,
  UnifiedRoleSchema,
  OrgTypeSchema
} from '@/src/schemas/user.schema'

import {
  Organization as ZodOrganization,
  Employee as ZodEmployee,
  Location as ZodLocation,
  CustomRole as ZodCustomRole,
  BillingData as ZodBillingData,
  BusinessRegistration as ZodBusinessRegistration,
  EmployeeSchema,
  LocationSchema,
  CustomRoleSchema,
  BillingDataSchema,
  BusinessRegistrationSchema
} from '@/src/schemas/organization.schema'

// Legacy type imports
import {
  Identity as LegacyIdentity,
  Organization as LegacyOrganization,
  OrganizationSettings as LegacyOrganizationSettings,
  RoleAssignment as LegacyRoleAssignment,
  CreateIdentityRequest as LegacyCreateIdentityRequest,
  CreateOrganizationRequest as LegacyCreateOrganizationRequest,
  AssignRoleRequest as LegacyAssignRoleRequest,
  AuthUser as LegacyAuthUser,
  AuthSession as LegacyAuthSession,
  IdType as LegacyIdType,
  UnifiedRole as LegacyUnifiedRole,
  OrgType as LegacyOrgType
} from '@/src/types/unified.types'

// =====================================================
// Type Compatibility Assertions
// =====================================================

// Runtime type checking to ensure schema types match legacy types
type AssertEqual<T, U> = T extends U ? (U extends T ? true : false) : false

// Core type compatibility checks
type IdentityCompatible = AssertEqual<z.infer<typeof IdentitySchema>, LegacyIdentity>
type OrganizationCompatible = AssertEqual<z.infer<typeof OrganizationSchema>, LegacyOrganization>
type OrganizationSettingsCompatible = AssertEqual<z.infer<typeof OrganizationSettingsSchema>, LegacyOrganizationSettings>
type RoleAssignmentCompatible = AssertEqual<z.infer<typeof RoleAssignmentSchema>, LegacyRoleAssignment>

// Request type compatibility
type CreateIdentityRequestCompatible = AssertEqual<z.infer<typeof CreateIdentityRequestSchema>, LegacyCreateIdentityRequest>
type CreateOrganizationRequestCompatible = AssertEqual<z.infer<typeof CreateOrganizationRequestSchema>, LegacyCreateOrganizationRequest>
type AssignRoleRequestCompatible = AssertEqual<z.infer<typeof AssignRoleRequestSchema>, LegacyAssignRoleRequest>

// Auth type compatibility  
type AuthUserCompatible = AssertEqual<z.infer<typeof AuthUserSchema>, LegacyAuthUser>
type AuthSessionCompatible = AssertEqual<z.infer<typeof AuthSessionSchema>, LegacyAuthSession>

// Enum compatibility
type IdTypeCompatible = AssertEqual<z.infer<typeof IdTypeSchema>, LegacyIdType>
type UnifiedRoleCompatible = AssertEqual<z.infer<typeof UnifiedRoleSchema>, LegacyUnifiedRole>
type OrgTypeCompatible = AssertEqual<z.infer<typeof OrgTypeSchema>, LegacyOrgType>

// =====================================================
// Type Converters
// =====================================================

/**
 * Legacy 타입을 Zod 스키마로 변환하는 유틸리티
 */
export class TypeConverter {
  
  /**
   * Legacy Identity를 Zod Identity로 변환
   */
  static legacyIdentityToZod(legacy: LegacyIdentity): z.infer<typeof IdentitySchema> {
    return IdentitySchema.parse(legacy)
  }

  /**
   * Zod Identity를 Legacy Identity로 변환
   */
  static zodIdentityToLegacy(zod: z.infer<typeof IdentitySchema>): LegacyIdentity {
    return zod as LegacyIdentity
  }

  /**
   * Legacy Organization을 Zod Organization으로 변환
   */
  static legacyOrganizationToZod(legacy: LegacyOrganization): ZodOrganization {
    return OrganizationSchema.parse(legacy)
  }

  /**
   * Zod Organization을 Legacy Organization으로 변환
   */
  static zodOrganizationToLegacy(zod: ZodOrganization): LegacyOrganization {
    return zod as LegacyOrganization
  }

  /**
   * 제네릭 타입 변환기
   */
  static convertWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data)
  }

  /**
   * 안전한 타입 변환 (에러를 반환하는 버전)
   */
  static safeConvertWithSchema<T>(
    schema: z.ZodSchema<T>, 
    data: unknown
  ): { success: true; data: T } | { success: false; error: z.ZodError } {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    } else {
      return { success: false, error: result.error }
    }
  }
}

// =====================================================
// Migration Helpers
// =====================================================

/**
 * 기존 코드를 점진적으로 마이그레이션하기 위한 헬퍼 클래스
 */
export class MigrationHelper {
  
  /**
   * 기존 API 응답을 검증하고 변환
   */
  static validateApiResponse<T>(
    schema: z.ZodSchema<T>,
    response: unknown,
    fallback?: T
  ): T {
    const result = schema.safeParse(response)
    
    if (result.success) {
      return result.data
    }
    
    console.warn('API response validation failed:', result.error)
    
    if (fallback !== undefined) {
      return fallback
    }
    
    throw new Error('Invalid API response and no fallback provided')
  }

  /**
   * 기존 데이터베이스 레코드를 검증하고 변환
   */
  static validateDatabaseRecord<T>(
    schema: z.ZodSchema<T>,
    record: unknown,
    recordType: string = 'record'
  ): T | null {
    const result = schema.safeParse(record)
    
    if (result.success) {
      return result.data
    }
    
    console.error(`Database ${recordType} validation failed:`, result.error)
    return null
  }

  /**
   * 배치 데이터 검증
   */
  static validateBatch<T>(
    schema: z.ZodSchema<T>,
    items: unknown[],
    skipInvalid: boolean = false
  ): T[] {
    const validItems: T[] = []
    const errors: Array<{ index: number; error: z.ZodError }> = []

    items.forEach((item, index) => {
      const result = schema.safeParse(item)
      
      if (result.success) {
        validItems.push(result.data)
      } else {
        errors.push({ index, error: result.error })
        
        if (!skipInvalid) {
          throw new Error(`Batch validation failed at index ${index}: ${result.error.message}`)
        }
      }
    })

    if (errors.length > 0 && skipInvalid) {
      console.warn(`Batch validation: ${errors.length} invalid items skipped`, errors)
    }

    return validItems
  }
}

// =====================================================
// Runtime Type Guards
// =====================================================

/**
 * 런타임에서 타입을 확인하는 가드 함수들
 */
export class TypeGuards {
  
  /**
   * Identity 타입 가드
   */
  static isIdentity(value: unknown): value is z.infer<typeof IdentitySchema> {
    return IdentitySchema.safeParse(value).success
  }

  /**
   * Organization 타입 가드
   */
  static isOrganization(value: unknown): value is ZodOrganization {
    return OrganizationSchema.safeParse(value).success
  }

  /**
   * Employee 타입 가드
   */
  static isEmployee(value: unknown): value is ZodEmployee {
    return EmployeeSchema.safeParse(value).success
  }

  /**
   * Location 타입 가드
   */
  static isLocation(value: unknown): value is ZodLocation {
    return LocationSchema.safeParse(value).success
  }

  /**
   * 제네릭 타입 가드 생성기
   */
  static createGuard<T>(schema: z.ZodSchema<T>) {
    return (value: unknown): value is T => {
      return schema.safeParse(value).success
    }
  }

  /**
   * 엄격한 타입 가드 (에러 throw)
   */
  static strictGuard<T>(schema: z.ZodSchema<T>, value: unknown): T {
    return schema.parse(value)
  }
}

// =====================================================
// Schema Registry
// =====================================================

/**
 * 모든 스키마를 중앙 집중식으로 관리하는 레지스트리
 */
export class SchemaRegistry {
  private static schemas = new Map<string, z.ZodSchema<any>>()

  static register<T>(name: string, schema: z.ZodSchema<T>): void {
    this.schemas.set(name, schema)
  }

  static get<T>(name: string): z.ZodSchema<T> | undefined {
    return this.schemas.get(name)
  }

  static validate<T>(name: string, data: unknown): T {
    const schema = this.schemas.get(name)
    if (!schema) {
      throw new Error(`Schema '${name}' not found in registry`)
    }
    return schema.parse(data)
  }

  static safeValidate<T>(name: string, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
    const schema = this.schemas.get(name)
    if (!schema) {
      return {
        success: false,
        error: new z.ZodError([{
          code: 'custom',
          message: `Schema '${name}' not found in registry`,
          path: []
        }])
      }
    }
    
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    } else {
      return { success: false, error: result.error }
    }
  }
}

// =====================================================
// Initialize Schema Registry
// =====================================================

// Core schemas
SchemaRegistry.register('Identity', IdentitySchema)
SchemaRegistry.register('Organization', OrganizationSchema)
SchemaRegistry.register('OrganizationSettings', OrganizationSettingsSchema)
SchemaRegistry.register('RoleAssignment', RoleAssignmentSchema)

// Request schemas
SchemaRegistry.register('CreateIdentityRequest', CreateIdentityRequestSchema)
SchemaRegistry.register('CreateOrganizationRequest', CreateOrganizationRequestSchema)
SchemaRegistry.register('AssignRoleRequest', AssignRoleRequestSchema)

// Extended schemas
SchemaRegistry.register('Employee', EmployeeSchema)
SchemaRegistry.register('Location', LocationSchema)
SchemaRegistry.register('CustomRole', CustomRoleSchema)
SchemaRegistry.register('BillingData', BillingDataSchema)
SchemaRegistry.register('BusinessRegistration', BusinessRegistrationSchema)

// Auth schemas
SchemaRegistry.register('AuthUser', AuthUserSchema)
SchemaRegistry.register('AuthSession', AuthSessionSchema)

// =====================================================
// Backward Compatibility Exports
// =====================================================

/**
 * 기존 코드와의 호환성을 위한 re-export
 */
export {
  // Zod schemas as default exports
  IdentitySchema as Identity,
  OrganizationSchema as Organization,
  OrganizationSettingsSchema as OrganizationSettings,
  RoleAssignmentSchema as RoleAssignment,
  
  // Request schemas
  CreateIdentityRequestSchema as CreateIdentityRequest,
  CreateOrganizationRequestSchema as CreateOrganizationRequest,
  AssignRoleRequestSchema as AssignRoleRequest,
  
  // Extended schemas
  EmployeeSchema as Employee,
  LocationSchema as Location,
  CustomRoleSchema as CustomRole,
  BillingDataSchema as BillingData,
  BusinessRegistrationSchema as BusinessRegistration,
  
  // Auth schemas
  AuthUserSchema as AuthUser,
  AuthSessionSchema as AuthSession,
  
  // Type exports from schemas
  type ZodOrganization,
  type ZodEmployee,
  type ZodLocation,
  type ZodCustomRole,
  type ZodBillingData,
  type ZodBusinessRegistration
}

// =====================================================
// Compatibility Tests (Development Only)
// =====================================================

if (process.env.NODE_ENV === 'development') {
  // 컴파일 타임 호환성 테스트
  const compatibilityTests = {
    identity: true as IdentityCompatible,
    organization: true as OrganizationCompatible,
    organizationSettings: true as OrganizationSettingsCompatible,
    roleAssignment: true as RoleAssignmentCompatible,
    createIdentityRequest: true as CreateIdentityRequestCompatible,
    createOrganizationRequest: true as CreateOrganizationRequestCompatible,
    assignRoleRequest: true as AssignRoleRequestCompatible,
    authUser: true as AuthUserCompatible,
    authSession: true as AuthSessionCompatible,
    idType: true as IdTypeCompatible,
    unifiedRole: true as UnifiedRoleCompatible,
    orgType: true as OrgTypeCompatible
  }

  // 모든 테스트가 통과해야 함
  console.log('Type compatibility tests:', compatibilityTests)
}