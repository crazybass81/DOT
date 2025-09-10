/**
 * Zod-based User Schema - Single Source of Truth
 * 
 * Runtime validation + Compile-time type generation
 * 이 스키마가 모든 User 관련 타입의 원천입니다
 */

import { z } from 'zod';

// Core Role Schema - 4-tier hierarchy
export const RoleSchema = z.enum(['master', 'admin', 'manager', 'worker']);

// Identity type schema
export const IdTypeSchema = z.enum(['corporate', 'personal']);

// User status schema  
export const UserStatusSchema = z.enum(['active', 'inactive', 'suspended']);

// Organization type schema
export const OrgTypeSchema = z.enum(['company', 'individual', 'branch']);

// Base Identity Schema
export const UnifiedIdentitySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(1).max(100),
  phone: z.string().nullable(),
  auth_user_id: z.string().uuid().nullable(),
  id_type: IdTypeSchema,
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.any()).nullable()
});

// Role Assignment Schema
export const RoleAssignmentSchema = z.object({
  id: z.string().uuid(),
  identity_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  role: RoleSchema,
  assigned_by: z.string().uuid().nullable(),
  assigned_at: z.string().datetime(),
  revoked_at: z.string().datetime().nullable(),
  is_active: z.boolean(),
  employee_code: z.string().min(1).max(50),
  department: z.string().min(1).max(100),
  position: z.string().min(1).max(100)
});

// User with Role (joined data)
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string(),
  phone: z.string().nullable(),
  auth_user_id: z.string().uuid().nullable(),
  id_type: IdTypeSchema,
  is_active: z.boolean(),
  role: RoleSchema,
  organization_id: z.string().uuid(),
  employee_code: z.string(),
  department: z.string(),
  position: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.any()).nullable()
});

// Authentication schemas
export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  aud: z.string(),
  role: z.string(),
  email_confirmed_at: z.string().datetime().nullable(),
  phone_confirmed_at: z.string().datetime().nullable(),
  confirmation_sent_at: z.string().datetime().nullable(),
  recovery_sent_at: z.string().datetime().nullable(),
  email_change_sent_at: z.string().datetime().nullable(),
  new_email: z.string().email().nullable(),
  invited_at: z.string().datetime().nullable(),
  action_link: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  raw_app_meta_data: z.record(z.any()).nullable(),
  raw_user_meta_data: z.record(z.any()).nullable(),
  is_super_admin: z.boolean().nullable(),
  last_sign_in_at: z.string().datetime().nullable()
});

export const AuthSessionSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  user: AuthUserSchema
});

// Request/Response schemas
export const CreateIdentityRequestSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(100),
  phone: z.string().nullable(),
  id_type: IdTypeSchema,
  metadata: z.record(z.any()).optional()
});

export const AssignRoleRequestSchema = z.object({
  identity_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  role: RoleSchema,
  employee_code: z.string().min(1).max(50),
  department: z.string().min(1).max(100),
  position: z.string().min(1).max(100)
});

export const CreateIdentityResponseSchema = z.object({
  success: z.boolean(),
  data: UnifiedIdentitySchema.optional(),
  error: z.string().optional()
});

export const AssignRoleResponseSchema = z.object({
  success: z.boolean(),
  data: RoleAssignmentSchema.optional(),
  error: z.string().optional()
});

// Type exports
export type Role = z.infer<typeof RoleSchema>;
export type IdType = z.infer<typeof IdTypeSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type OrgType = z.infer<typeof OrgTypeSchema>;
export type UnifiedIdentity = z.infer<typeof UnifiedIdentitySchema>;
export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;
export type User = z.infer<typeof UserSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type CreateIdentityRequest = z.infer<typeof CreateIdentityRequestSchema>;
export type AssignRoleRequest = z.infer<typeof AssignRoleRequestSchema>;
export type CreateIdentityResponse = z.infer<typeof CreateIdentityResponseSchema>;
export type AssignRoleResponse = z.infer<typeof AssignRoleResponseSchema>;

// Validation functions
export const validateUnifiedIdentity = (data: unknown) => {
  return UnifiedIdentitySchema.safeParse(data);
};

export const validateRoleAssignment = (data: unknown) => {
  return RoleAssignmentSchema.safeParse(data);
};

export const validateUser = (data: unknown) => {
  return UserSchema.safeParse(data);
};

export const validateAuthUser = (data: unknown) => {
  return AuthUserSchema.safeParse(data);
};

export const validateCreateIdentityRequest = (data: unknown) => {
  return CreateIdentityRequestSchema.safeParse(data);
};

export const validateAssignRoleRequest = (data: unknown) => {
  return AssignRoleRequestSchema.safeParse(data);
};

// Type guards
export const isRole = (value: string): value is Role => {
  return RoleSchema.safeParse(value).success;
};

export const isIdType = (value: string): value is IdType => {
  return IdTypeSchema.safeParse(value).success;
};

export const isUserStatus = (value: string): value is UserStatus => {
  return UserStatusSchema.safeParse(value).success;
};

export const isUnifiedIdentity = (data: unknown): data is UnifiedIdentity => {
  return UnifiedIdentitySchema.safeParse(data).success;
};

export const isRoleAssignment = (data: unknown): data is RoleAssignment => {
  return RoleAssignmentSchema.safeParse(data).success;
};

export const isUser = (data: unknown): data is User => {
  return UserSchema.safeParse(data).success;
};