/**
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