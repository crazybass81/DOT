/**
 * Zod Validation Schemas for ID-ROLE-PAPER System
 * Comprehensive form validation with Korean business rules
 */

import { z } from 'zod';
import { RoleType, PaperType } from '../types/id-role-paper';

// Korean phone number validation
const koreanPhoneRegex = /^010-\d{4}-\d{4}$/;

// Korean business number validation patterns
const individualBusinessNumberRegex = /^\d{3}-\d{2}-\d{5}$/;
const corporateBusinessNumberRegex = /^\d{3}-\d{2}-\d{5}$/;

// Email validation
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Common validations
export const phoneNumberSchema = z
  .string()
  .regex(koreanPhoneRegex, '올바른 휴대폰 번호 형식을 입력해주세요 (010-0000-0000)');

export const emailSchema = z
  .string()
  .regex(emailRegex, '올바른 이메일 형식을 입력해주세요')
  .optional()
  .or(z.literal(''));

export const koreanNameSchema = z
  .string()
  .min(2, '이름은 2자 이상이어야 합니다')
  .max(50, '이름은 50자 이하여야 합니다')
  .refine(
    (name) => !/[!@#$%^&*(),.?":{}|<>]/g.test(name),
    '이름에 특수문자는 포함될 수 없습니다'
  );

export const businessNumberSchema = z
  .string()
  .refine(
    (number) => {
      // Remove hyphens for validation
      const cleaned = number.replace(/-/g, '');
      return cleaned.length === 10 || cleaned.length === 13;
    },
    '올바른 사업자등록번호 형식을 입력해주세요'
  )
  .transform((number) => {
    // Auto-format business number
    const cleaned = number.replace(/-/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
    }
    return number;
  });

// Identity validation schemas
export const personalInfoSchema = z.object({
  phone: phoneNumberSchema,
  address: z.string().min(10, '주소는 10자 이상이어야 합니다').max(200, '주소는 200자 이하여야 합니다'),
  birthDate: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  emergencyContact: z.object({
    name: koreanNameSchema,
    phone: phoneNumberSchema,
    relationship: z.string().min(1, '관계를 입력해주세요')
  }).optional()
});

export const corporateInfoSchema = z.object({
  businessNumber: businessNumberSchema,
  representativeName: koreanNameSchema,
  businessType: z.string().min(1, '사업 유형을 입력해주세요'),
  incorporationDate: z.string().optional(),
  registeredAddress: z.string().min(10, '등록 주소는 10자 이상이어야 합니다')
});

export const createIdentitySchema = z.object({
  identityType: z.enum(['personal', 'corporate'], {
    required_error: '신원 유형을 선택해주세요'
  }),
  fullName: koreanNameSchema,
  personalInfo: personalInfoSchema.optional(),
  corporateInfo: corporateInfoSchema.optional()
}).refine(
  (data) => {
    if (data.identityType === 'personal') {
      return data.personalInfo !== undefined;
    }
    if (data.identityType === 'corporate') {
      return data.corporateInfo !== undefined;
    }
    return false;
  },
  {
    message: '선택한 신원 유형에 맞는 정보를 입력해주세요',
    path: ['identityType']
  }
);

// Business validation schemas
export const createBusinessSchema = z.object({
  name: z.string().min(2, '사업체명은 2자 이상이어야 합니다').max(100, '사업체명은 100자 이하여야 합니다'),
  businessType: z.enum(['individual', 'corporate'], {
    required_error: '사업자 유형을 선택해주세요'
  }),
  businessNumber: businessNumberSchema,
  ownerIdentityId: z.string().uuid('올바른 소유자를 선택해주세요'),
  address: z.string().min(10, '주소는 10자 이상이어야 합니다').max(200, '주소는 200자 이하여야 합니다'),
  phone: phoneNumberSchema,
  email: emailSchema
});

// Paper validation schemas  
export const createPaperSchema = z.object({
  businessId: z.string().uuid('사업체를 선택해주세요'),
  paperType: z.nativeEnum(PaperType, {
    required_error: '문서 유형을 선택해주세요'
  }),
  title: z.string().min(2, '문서 제목은 2자 이상이어야 합니다').max(100, '문서 제목은 100자 이하여야 합니다'),
  documentNumber: z.string().optional(),
  issuedBy: z.string().optional(),
  issuedDate: z.string().optional(),
  validFrom: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    '올바른 시작 날짜를 입력해주세요'
  ),
  validUntil: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    '올바른 종료 날짜를 입력해주세요'  
  ),
  notes: z.string().max(500, '비고는 500자 이하여야 합니다').optional()
}).refine(
  (data) => {
    const validFrom = new Date(data.validFrom);
    const validUntil = new Date(data.validUntil);
    return validUntil >= validFrom;
  },
  {
    message: '종료 날짜는 시작 날짜보다 같거나 늦어야 합니다',
    path: ['validUntil']
  }
);

// Permission validation schemas
export const permissionCheckSchema = z.object({
  identityId: z.string().uuid('신원을 선택해주세요'),
  resource: z.string().min(1, '리소스를 입력해주세요'),
  action: z.string().min(1, '액션을 입력해주세요'),
  businessId: z.string().uuid().optional()
});

export const bulkPermissionCheckSchema = z.object({
  identityId: z.string().uuid('신원을 선택해주세요'),
  permissions: z.array(z.object({
    resource: z.string().min(1, '리소스를 입력해주세요'),
    action: z.string().min(1, '액션을 입력해주세요'),
    businessId: z.string().uuid().optional()
  })).min(1, '최소 1개의 권한을 확인해야 합니다')
});

// Role validation schemas
export const createRoleSchema = z.object({
  identityId: z.string().uuid('신원을 선택해주세요'),
  roleType: z.nativeEnum(RoleType, {
    required_error: '역할 유형을 선택해주세요'
  }),
  businessId: z.string().uuid().optional(),
  expiresAt: z.string().refine(
    (date) => !date || !isNaN(Date.parse(date)),
    '올바른 만료 날짜를 입력해주세요'
  ).optional()
}).refine(
  (data) => {
    // Business-specific roles require businessId
    const businessRoles: RoleType[] = [RoleType.OWNER, RoleType.MANAGER, RoleType.SUPERVISOR, RoleType.WORKER];
    if (businessRoles.includes(data.roleType)) {
      return data.businessId !== undefined;
    }
    return true;
  },
  {
    message: '선택한 역할은 사업체 지정이 필요합니다',
    path: ['businessId']
  }
);

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다')
});

export const signupSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string()
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '비밀번호는 대소문자와 숫자를 포함해야 합니다'),
  confirmPassword: z.string()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword']
  }
);

// Search and filter schemas
export const identitySearchSchema = z.object({
  search: z.string().optional(),
  identityType: z.enum(['personal', 'corporate']).optional(),
  roleType: z.nativeEnum(RoleType).optional(),
  businessId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

export const businessSearchSchema = z.object({
  search: z.string().optional(),
  businessType: z.enum(['individual', 'corporate']).optional(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

export const paperSearchSchema = z.object({
  search: z.string().optional(),
  paperType: z.nativeEnum(PaperType).optional(),
  businessId: z.string().uuid().optional(),
  isValid: z.boolean().optional(),
  validUntil: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
);

// Validation helper functions
export const validateKoreanBusinessNumber = (number: string): boolean => {
  const cleaned = number.replace(/-/g, '');
  
  if (cleaned.length !== 10) {
    return false;
  }

  // Check digit validation for Korean business numbers
  const digits = cleaned.split('').map(Number);
  const checkDigit = digits[9];
  
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }
  
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit === calculatedCheckDigit;
};

export const formatKoreanBusinessNumber = (number: string): string => {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }
  return number;
};

export const validateKoreanPhoneNumber = (phone: string): boolean => {
  return koreanPhoneRegex.test(phone);
};

export const formatKoreanPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('010')) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

// Export validation error helper
export const getValidationError = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return errors;
};