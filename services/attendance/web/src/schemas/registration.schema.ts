/**
 * Registration Schema for Individual User Registration
 * Comprehensive validation for Korean user registration system
 */

import { z } from 'zod';

// Korean phone number validation
const KOREAN_PHONE_REGEX = /^010-?[0-9]{4}-?[0-9]{4}$/;

// Korean name validation (한글, 영문, 숫자 허용)
const KOREAN_NAME_REGEX = /^[가-힣a-zA-Z\s]{2,20}$/;

// Birth date validation (18+ years old)
const validateAge = (birthDate: string): boolean => {
  const today = new Date();
  const birth = new Date(birthDate);
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

// Registration form schema
export const RegistrationFormSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 2글자 이상이어야 합니다')
    .max(20, '이름은 20글자 이하여야 합니다')
    .regex(KOREAN_NAME_REGEX, '올바른 이름 형식이 아닙니다 (한글, 영문만 허용)'),
  
  phone: z
    .string()
    .regex(KOREAN_PHONE_REGEX, '올바른 휴대폰 번호 형식이 아닙니다 (010-xxxx-xxxx)')
    .transform((val) => val.replace(/-/g, '')) // Remove dashes for storage
    .refine((val) => val.length === 11, '휴대폰 번호는 11자리여야 합니다'),
  
  birthDate: z
    .string()
    .min(1, '생년월일을 선택해주세요')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      return birthDate <= today;
    }, '미래 날짜는 선택할 수 없습니다')
    .refine(validateAge, '만 18세 이상만 등록 가능합니다'),
  
  email: z
    .string()
    .email('올바른 이메일 형식이 아닙니다')
    .min(5, '이메일은 5글자 이상이어야 합니다')
    .max(100, '이메일은 100글자 이하여야 합니다')
    .toLowerCase()
    .optional(),
  
  password: z
    .string()
    .min(8, '비밀번호는 8글자 이상이어야 합니다')
    .max(128, '비밀번호는 128글자 이하여야 합니다')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '비밀번호는 영문 대소문자, 숫자, 특수문자를 모두 포함해야 합니다'
    ),
  
  confirmPassword: z.string(),
  
  accountNumber: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => val === '' ? undefined : val),
  
  // Privacy and terms agreement
  agreeToTerms: z
    .boolean()
    .refine(val => val === true, '이용약관에 동의해주세요'),
  
  agreeToPrivacy: z
    .boolean()
    .refine(val => val === true, '개인정보 처리방침에 동의해주세요'),
  
  agreeToMarketing: z
    .boolean()
    .optional()
    .default(false),

  // QR code context (optional)
  qrContext: z.object({
    organizationId: z.string().uuid().optional(),
    locationId: z.string().optional(),
    inviteCode: z.string().optional(),
  }).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

// API request schema (subset of form data)
export const RegistrationRequestSchema = z.object({
  name: z.string().min(2).max(20),
  phone: z.string().length(11), // Already transformed
  birthDate: z.string(),
  email: z.string().email().optional(),
  password: z.string().min(8),
  accountNumber: z.string().optional(),
  qrContext: z.object({
    organizationId: z.string().uuid().optional(),
    locationId: z.string().optional(),
    inviteCode: z.string().optional(),
  }).optional(),
});

// Response schemas
export const RegistrationSuccessSchema = z.object({
  success: z.literal(true),
  data: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    requiresVerification: z.boolean(),
    verificationMethod: z.enum(['email', 'phone', 'none']).optional(),
  }),
  message: z.string(),
});

export const RegistrationErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
});

export const RegistrationResponseSchema = z.union([
  RegistrationSuccessSchema,
  RegistrationErrorSchema,
]);

// Phone number formatting utility
export const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/[^\d]/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};

// Type exports
export type RegistrationFormData = z.infer<typeof RegistrationFormSchema>;
export type RegistrationRequest = z.infer<typeof RegistrationRequestSchema>;
export type RegistrationResponse = z.infer<typeof RegistrationResponseSchema>;
export type RegistrationSuccess = z.infer<typeof RegistrationSuccessSchema>;
export type RegistrationError = z.infer<typeof RegistrationErrorSchema>;

// Validation functions
export const validateRegistrationForm = (data: unknown) => {
  return RegistrationFormSchema.safeParse(data);
};

export const validateRegistrationRequest = (data: unknown) => {
  return RegistrationRequestSchema.safeParse(data);
};

export const validateRegistrationResponse = (data: unknown) => {
  return RegistrationResponseSchema.safeParse(data);
};

// Field validation helpers
export const validatePhoneNumber = (phone: string): boolean => {
  return KOREAN_PHONE_REGEX.test(phone);
};

export const validateKoreanName = (name: string): boolean => {
  return KOREAN_NAME_REGEX.test(name);
};

export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('8글자 이상이어야 합니다');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('영문 소문자를 포함해야 합니다');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('영문 대문자를 포함해야 합니다');
  }
  
  if (!/\d/.test(password)) {
    errors.push('숫자를 포함해야 합니다');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('특수문자를 포함해야 합니다');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};