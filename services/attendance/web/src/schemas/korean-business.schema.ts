/**
 * Korean Business Registration Schema
 * Enhanced Korean business registration system with document upload and validation
 */

import { z } from 'zod'

// =====================================================
// Korean Business Number Validation Patterns
// =====================================================

export const KOREAN_BUSINESS_PATTERNS = {
  // 개인사업자등록번호: 000-00-00000 (10자리)
  personalBusiness: /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/,
  // 법인등록번호: 000000-0000000 (13자리)  
  corporate: /^[0-9]{6}-[0-9]{7}$/,
  // 전화번호: 02-0000-0000, 031-000-0000, 010-0000-0000
  phoneNumber: /^(02|0[3-9][0-9]|01[0-9])-?[0-9]{3,4}-?[0-9]{4}$/,
  // 우편번호: 00000 (5자리)
  postalCode: /^[0-9]{5}$/
}

// =====================================================
// Korean Address Schema
// =====================================================

export const KoreanAddressSchema = z.object({
  postalCode: z.string()
    .regex(KOREAN_BUSINESS_PATTERNS.postalCode, '우편번호는 5자리 숫자여야 합니다')
    .optional(),
  roadAddress: z.string()
    .min(1, '도로명주소를 입력해주세요')
    .max(200, '주소가 너무 깁니다'),
  detailAddress: z.string()
    .max(100, '상세주소가 너무 깁니다')
    .optional(),
  sido: z.string().max(20), // 시/도
  sigungu: z.string().max(20), // 시/군/구
  dong: z.string().max(20).optional(), // 동/면/읍
  buildingName: z.string().max(50).optional()
})

// =====================================================
// Business Registration Certificate Schema
// =====================================================

export const BusinessCertificateSchema = z.object({
  // 파일 정보
  fileName: z.string().min(1, '파일명이 필요합니다'),
  fileSize: z.number().min(1, '파일 크기가 필요합니다').max(10 * 1024 * 1024, '파일 크기는 10MB 이하여야 합니다'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'application/pdf'], {
    errorMap: () => ({ message: 'JPG, PNG, GIF, PDF 파일만 업로드 가능합니다' })
  }),
  fileUrl: z.string().url('올바른 파일 URL이 아닙니다'),
  // 인증 정보
  uploadedAt: z.date(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected', 'expired'], {
    errorMap: () => ({ message: '올바른 인증 상태가 아닙니다' })
  }).default('pending'),
  verifiedAt: z.date().optional(),
  verificationNotes: z.string().max(500).optional(),
  rejectionReason: z.string().max(500).optional()
})

// =====================================================
// Korean Business Registration Schema
// =====================================================

export const KoreanBusinessRegistrationSchema = z.object({
  // 기본 사업자 정보
  businessNumber: z.string()
    .regex(KOREAN_BUSINESS_PATTERNS.personalBusiness, '사업자등록번호는 000-00-00000 형식이어야 합니다'),
  corporateNumber: z.string()
    .regex(KOREAN_BUSINESS_PATTERNS.corporate, '법인등록번호는 000000-0000000 형식이어야 합니다')
    .optional(),
  
  // 사업체 정보
  businessName: z.string()
    .min(1, '상호명을 입력해주세요')
    .max(100, '상호명은 100자 이하여야 합니다'),
  businessNameEng: z.string()
    .max(100, '영문 상호명은 100자 이하여야 합니다')
    .optional(),
  businessType: z.string()
    .min(1, '업태를 입력해주세요')
    .max(100, '업태는 100자 이하여야 합니다'),
  businessItem: z.string()
    .min(1, '종목을 입력해주세요')
    .max(200, '종목은 200자 이하여야 합니다'),
  
  // 대표자 정보
  representativeName: z.string()
    .min(1, '대표자명을 입력해주세요')
    .max(50, '대표자명은 50자 이하여야 합니다'),
  representativeNameEng: z.string()
    .max(50, '영문 대표자명은 50자 이하여야 합니다')
    .optional(),
  
  // 사업장 정보
  businessAddress: KoreanAddressSchema,
  headOfficeAddress: KoreanAddressSchema.optional(),
  
  // 연락처 정보
  phoneNumber: z.string()
    .regex(KOREAN_BUSINESS_PATTERNS.phoneNumber, '올바른 전화번호 형식이 아닙니다')
    .optional(),
  faxNumber: z.string()
    .regex(KOREAN_BUSINESS_PATTERNS.phoneNumber, '올바른 팩스번호 형식이 아닙니다')
    .optional(),
  email: z.string()
    .email('올바른 이메일 주소가 아닙니다')
    .optional(),
  website: z.string()
    .url('올바른 웹사이트 주소가 아닙니다')
    .optional(),
  
  // 사업 관련 정보
  establishedDate: z.date(),
  openingDate: z.date().optional(),
  capitalAmount: z.number()
    .min(0, '자본금은 0원 이상이어야 합니다')
    .optional(),
  employeeCount: z.number()
    .min(0, '직원 수는 0명 이상이어야 합니다')
    .optional(),
  
  // 인증서류
  businessCertificate: BusinessCertificateSchema.optional(),
  corporateSeal: BusinessCertificateSchema.optional(),
  
  // 추가 정보
  taxOffice: z.string().max(50).optional(), // 관할세무서
  socialInsuranceOffice: z.string().max(50).optional(), // 관할고용노동청
  isHeadOffice: z.boolean().default(true), // 본점 여부
  branchInfo: z.object({
    parentBusinessNumber: z.string().regex(KOREAN_BUSINESS_PATTERNS.personalBusiness).optional(),
    branchCode: z.string().max(10).optional()
  }).optional()
})

// =====================================================
// GPS Location Schema for Workplace
// =====================================================

export const WorkplaceLocationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, '사업장명을 입력해주세요').max(100),
  address: KoreanAddressSchema,
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),
  // GPS 출근 체크 반경 (미터)
  checkInRadius: z.number()
    .min(10, '최소 반경은 10m입니다')
    .max(1000, '최대 반경은 1000m입니다')
    .default(100),
  // 근무 시간
  businessHours: z.object({
    monday: z.object({ 
      start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다'), 
      end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다'),
      isWorkingDay: z.boolean().default(true)
    }).optional(),
    tuesday: z.object({ 
      start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), 
      end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      isWorkingDay: z.boolean().default(true)
    }).optional(),
    wednesday: z.object({ 
      start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), 
      end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      isWorkingDay: z.boolean().default(true)
    }).optional(),
    thursday: z.object({ 
      start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), 
      end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      isWorkingDay: z.boolean().default(true)
    }).optional(),
    friday: z.object({ 
      start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), 
      end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      isWorkingDay: z.boolean().default(true)
    }).optional(),
    saturday: z.object({ 
      start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), 
      end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      isWorkingDay: z.boolean().default(false)
    }).optional(),
    sunday: z.object({ 
      start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), 
      end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      isWorkingDay: z.boolean().default(false)
    }).optional()
  }).default({
    monday: { start: '09:00', end: '18:00', isWorkingDay: true },
    tuesday: { start: '09:00', end: '18:00', isWorkingDay: true },
    wednesday: { start: '09:00', end: '18:00', isWorkingDay: true },
    thursday: { start: '09:00', end: '18:00', isWorkingDay: true },
    friday: { start: '09:00', end: '18:00', isWorkingDay: true },
    saturday: { start: '09:00', end: '18:00', isWorkingDay: false },
    sunday: { start: '09:00', end: '18:00', isWorkingDay: false }
  }),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).default({})
})

// =====================================================
// Organization Creation Schema with Korean Business Support
// =====================================================

export const KoreanOrganizationCreationSchema = z.object({
  // 기본 조직 정보
  organizationName: z.string()
    .min(2, '조직명은 최소 2자 이상이어야 합니다')
    .max(100, '조직명은 100자 이하여야 합니다'),
  organizationType: z.enum(['personal', 'corporate', 'franchise', 'branch'], {
    errorMap: () => ({ message: '올바른 조직 타입을 선택해주세요' })
  }),
  description: z.string().max(500).optional(),
  
  // 한국 사업자 등록 정보 (필수)
  businessRegistration: KoreanBusinessRegistrationSchema,
  
  // 사업장 위치 정보 (GPS 기반)
  workplaceLocations: z.array(WorkplaceLocationSchema)
    .min(1, '최소 1개 이상의 사업장을 등록해야 합니다')
    .max(10, '최대 10개까지 사업장을 등록할 수 있습니다'),
  
  // 조직 계층 구조
  parentOrganizationId: z.string().uuid().optional(),
  
  // 근태 정책 설정
  attendancePolicy: z.object({
    // 근무시간 정책
    workTimePolicy: z.object({
      standardWorkHours: z.number().min(1).max(24).default(8), // 표준 근무시간
      maxOvertimeHours: z.number().min(0).max(12).default(4), // 최대 연장근무시간
      breakTimeMinutes: z.number().min(0).max(120).default(60), // 휴게시간
      flexTimeMinutes: z.number().min(0).max(60).default(10) // 출근 허용 지연시간
    }),
    // 출근체크 정책
    checkInPolicy: z.object({
      allowEarlyCheckIn: z.boolean().default(true),
      allowLateCheckIn: z.boolean().default(true),
      requireGPS: z.boolean().default(true),
      requireQR: z.boolean().default(false),
      requirePhoto: z.boolean().default(false)
    }),
    // 휴가 정책
    leavePolicy: z.object({
      annualLeaves: z.number().min(0).max(30).default(15), // 연차
      sickLeaves: z.number().min(0).max(30).default(3), // 병가
      personalLeaves: z.number().min(0).max(30).default(3) // 개인사유 휴가
    })
  }).default({
    workTimePolicy: {
      standardWorkHours: 8,
      maxOvertimeHours: 4,
      breakTimeMinutes: 60,
      flexTimeMinutes: 10
    },
    checkInPolicy: {
      allowEarlyCheckIn: true,
      allowLateCheckIn: true,
      requireGPS: true,
      requireQR: false,
      requirePhoto: false
    },
    leavePolicy: {
      annualLeaves: 15,
      sickLeaves: 3,
      personalLeaves: 3
    }
  }),
  
  // 관리자 설정
  adminSettings: z.object({
    maxAdmins: z.number().min(1).max(10).default(3),
    adminRoles: z.array(z.enum(['owner', 'admin', 'manager', 'hr'])).default(['owner'])
  }),
  
  // 직원 초대 설정
  invitationSettings: z.object({
    enableQRInvitation: z.boolean().default(true),
    enableEmailInvitation: z.boolean().default(true),
    invitationExpiryHours: z.number().min(1).max(168).default(72), // 기본 72시간
    maxPendingInvitations: z.number().min(1).max(100).default(50)
  }),
  
  // 추가 메타데이터
  metadata: z.record(z.any()).default({})
})

// =====================================================
// Employee Invitation Schema
// =====================================================

export const EmployeeInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  inviterUserId: z.string().uuid(),
  inviteeName: z.string().min(1, '초대할 직원 이름을 입력해주세요').max(50),
  inviteeEmail: z.string().email('올바른 이메일 주소를 입력해주세요').optional(),
  inviteePhone: z.string()
    .regex(KOREAN_BUSINESS_PATTERNS.phoneNumber, '올바른 전화번호 형식이 아닙니다')
    .optional(),
  role: z.enum(['worker', 'manager', 'admin'], {
    errorMap: () => ({ message: '올바른 역할을 선택해주세요' })
  }),
  department: z.string().max(50).optional(),
  position: z.string().max(50).optional(),
  workplaceLocationId: z.string().uuid().optional(),
  invitationMessage: z.string().max(200).optional(),
  expiresAt: z.date(),
  metadata: z.record(z.any()).default({})
})

// =====================================================
// Business Registration Number Validation Functions
// =====================================================

/**
 * 사업자등록번호 유효성 검사 (체크섬 포함)
 */
export function validateKoreanBusinessNumber(businessNumber: string): boolean {
  // 하이픈 제거 후 10자리 숫자인지 확인
  const cleanNumber = businessNumber.replace(/-/g, '')
  if (!/^[0-9]{10}$/.test(cleanNumber)) {
    return false
  }

  // 체크섬 계산
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
  let sum = 0
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanNumber[i]) * weights[i]
  }
  
  // 마지막 자리 계산
  const remainder = sum % 10
  const checkDigit = remainder === 0 ? 0 : 10 - remainder
  
  return checkDigit === parseInt(cleanNumber[9])
}

/**
 * 법인등록번호 유효성 검사 (체크섬 포함)
 */
export function validateKoreanCorporateNumber(corporateNumber: string): boolean {
  // 하이픈 제거 후 13자리 숫자인지 확인
  const cleanNumber = corporateNumber.replace(/-/g, '')
  if (!/^[0-9]{13}$/.test(cleanNumber)) {
    return false
  }

  // 체크섬 계산
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2]
  let sum = 0
  
  for (let i = 0; i < 12; i++) {
    let temp = parseInt(cleanNumber[i]) * weights[i]
    if (temp >= 10) {
      temp = Math.floor(temp / 10) + (temp % 10)
    }
    sum += temp
  }
  
  // 마지막 자리 계산
  const remainder = sum % 10
  const checkDigit = remainder === 0 ? 0 : 10 - remainder
  
  return checkDigit === parseInt(cleanNumber[12])
}

/**
 * 주소 API 연동을 위한 주소 정규화
 */
export function normalizeKoreanAddress(address: KoreanAddressSchema['_type']): string {
  const parts = [
    address.sido,
    address.sigungu,
    address.dong,
    address.roadAddress,
    address.detailAddress,
    address.buildingName
  ].filter(Boolean)
  
  return parts.join(' ')
}

// =====================================================
// Type Exports
// =====================================================

export type KoreanAddress = z.infer<typeof KoreanAddressSchema>
export type BusinessCertificate = z.infer<typeof BusinessCertificateSchema>
export type KoreanBusinessRegistration = z.infer<typeof KoreanBusinessRegistrationSchema>
export type WorkplaceLocation = z.infer<typeof WorkplaceLocationSchema>
export type KoreanOrganizationCreation = z.infer<typeof KoreanOrganizationCreationSchema>
export type EmployeeInvitation = z.infer<typeof EmployeeInvitationSchema>