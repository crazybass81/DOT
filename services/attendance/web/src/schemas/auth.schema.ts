/**
 * Authentication Schemas for Login System
 * Comprehensive validation for Korean authentication system with role-based access
 */

import { z } from 'zod';

// Login form schema
export const LoginFormSchema = z.object({
  email: z
    .string()
    .email('올바른 이메일 형식이 아닙니다')
    .min(5, '이메일은 5글자 이상이어야 합니다')
    .max(100, '이메일은 100글자 이하여야 합니다')
    .toLowerCase(),
  
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요')
    .max(128, '비밀번호는 128글자 이하여야 합니다'),
});

// Login API request schema
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

// User roles in hierarchy order
export const UserRoleSchema = z.enum(['master', 'admin', 'manager', 'worker'], {
  errorMap: () => ({ message: '올바른 사용자 역할이 아닙니다' }),
});

// User data schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: UserRoleSchema,
  organizationId: z.string().uuid().optional(),
  isVerified: z.boolean(),
  isActive: z.boolean(),
  lastLoginAt: z.string().optional(),
  createdAt: z.string(),
});

// Session data schema
export const SessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  expiresIn: z.number(),
  tokenType: z.string().default('bearer'),
});

// Login success response schema
export const LoginSuccessSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: UserSchema,
    session: SessionSchema,
    redirectUrl: z.string(),
    message: z.string(),
  }),
});

// Login error response schema
export const LoginErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
});

// Login response schema (union of success and error)
export const LoginResponseSchema = z.union([
  LoginSuccessSchema,
  LoginErrorSchema,
]);

// Logout response schema
export const LogoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// Password reset request schema
export const PasswordResetRequestSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
});

// Password reset response schema
export const PasswordResetResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// Change password schema
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: z
    .string()
    .min(8, '새 비밀번호는 8글자 이상이어야 합니다')
    .max(128, '새 비밀번호는 128글자 이하여야 합니다')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '새 비밀번호는 영문 대소문자, 숫자, 특수문자를 모두 포함해야 합니다'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

// Role hierarchy for access control
export const ROLE_HIERARCHY = {
  master: 4,
  admin: 3,
  manager: 2,
  worker: 1,
} as const;

// Role permissions
export const ROLE_PERMISSIONS = {
  master: [
    'system:admin',
    'organization:create',
    'organization:manage',
    'user:manage',
    'role:assign',
    'attendance:admin',
    'reports:admin',
  ],
  admin: [
    'organization:manage',
    'user:create',
    'user:edit',
    'role:assign:lower',
    'attendance:manage',
    'reports:view',
  ],
  manager: [
    'user:view',
    'attendance:view',
    'attendance:manage:team',
    'reports:team',
  ],
  worker: [
    'attendance:own',
    'profile:edit',
  ],
} as const;

// Type exports
export type LoginFormData = z.infer<typeof LoginFormSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type LoginSuccess = z.infer<typeof LoginSuccessSchema>;
export type LoginError = z.infer<typeof LoginErrorSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordResetResponse = z.infer<typeof PasswordResetResponseSchema>;
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;

// Validation functions
export const validateLoginForm = (data: unknown) => {
  return LoginFormSchema.safeParse(data);
};

export const validateLoginRequest = (data: unknown) => {
  return LoginRequestSchema.safeParse(data);
};

export const validateLoginResponse = (data: unknown) => {
  return LoginResponseSchema.safeParse(data);
};

// Utility functions
export const getRoleLevel = (role: UserRole): number => {
  return ROLE_HIERARCHY[role];
};

export const canAccessRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
};

export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.includes(permission as any);
};

export const getDefaultRedirectUrl = (role: UserRole, organizationId?: string): string => {
  const orgPrefix = organizationId ? `/org/${organizationId}` : '';
  
  switch (role) {
    case 'master':
      return '/super-admin/dashboard';
    case 'admin':
      return `${orgPrefix}/admin/dashboard`;
    case 'manager':
      return `${orgPrefix}/manager/dashboard`;
    case 'worker':
    default:
      return `/attendance`;
  }
};

// Error codes for authentication
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_CONFIRMED: 'EMAIL_NOT_CONFIRMED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_CODES;

// Error messages (Korean)
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다',
  EMAIL_NOT_CONFIRMED: '이메일 인증이 완료되지 않았습니다',
  ACCOUNT_DISABLED: '비활성화된 계정입니다. 관리자에게 문의하세요',
  ACCOUNT_NOT_VERIFIED: '계정 승인이 완료되지 않았습니다. 관리자에게 문의하세요',
  TOO_MANY_REQUESTS: '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요',
  SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요',
  INSUFFICIENT_PERMISSIONS: '접근 권한이 부족합니다',
  VALIDATION_ERROR: '입력 데이터가 올바르지 않습니다',
  INTERNAL_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
};