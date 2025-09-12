/**
 * Validation Utilities - Runtime validation using Zod schemas
 * API 경계에서 런타임 검증을 위한 유틸리티 함수들
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { ERROR_CODES } from '@/src/types/unified.types'

// =====================================================
// Validation Result Types
// =====================================================

export interface ValidationResult<T = any> {
  success: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string[]>
  code?: string
}

export interface ApiValidationError {
  field: string
  message: string
  code?: string
}

// =====================================================
// Core Validation Functions
// =====================================================

/**
 * 스키마를 사용한 데이터 검증
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data)
    return {
      success: true,
      data: validatedData
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {}
      
      error.errors.forEach((err) => {
        const field = err.path.join('.')
        if (!fieldErrors[field]) {
          fieldErrors[field] = []
        }
        fieldErrors[field].push(err.message)
      })

      return {
        success: false,
        error: '입력 데이터 검증에 실패했습니다',
        fieldErrors,
        code: ERROR_CODES.VALIDATION_ERROR
      }
    }

    return {
      success: false,
      error: '알 수 없는 검증 오류가 발생했습니다',
      code: ERROR_CODES.INTERNAL_ERROR
    }
  }
}

/**
 * NextRequest body 검증
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    return validateWithSchema(schema, body)
  } catch (error) {
    return {
      success: false,
      error: '잘못된 JSON 형식입니다',
      code: ERROR_CODES.VALIDATION_ERROR
    }
  }
}

/**
 * URL 검색 매개변수 검증
 */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  const params: Record<string, any> = {}
  
  for (const [key, value] of searchParams.entries()) {
    // Convert string values to appropriate types
    if (value === 'true') {
      params[key] = true
    } else if (value === 'false') {
      params[key] = false
    } else if (!isNaN(Number(value)) && value !== '') {
      params[key] = Number(value)
    } else {
      params[key] = value
    }
  }
  
  return validateWithSchema(schema, params)
}

// =====================================================
// HTTP Response Helpers
// =====================================================

/**
 * 검증 오류 응답 생성
 */
export function createValidationErrorResponse(
  result: ValidationResult
): NextResponse {
  return NextResponse.json({
    success: false,
    error: result.error || '검증 실패',
    code: result.code || ERROR_CODES.VALIDATION_ERROR,
    fieldErrors: result.fieldErrors
  }, { status: 400 })
}

/**
 * 성공 응답 생성
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message
  }, { status })
}

/**
 * 오류 응답 생성
 */
export function createErrorResponse(
  error: string,
  code?: string,
  status: number = 500
): NextResponse {
  return NextResponse.json({
    success: false,
    error,
    code: code || ERROR_CODES.INTERNAL_ERROR
  }, { status })
}

// =====================================================
// Middleware Helpers
// =====================================================

/**
 * API 경로용 검증 미들웨어 생성
 */
export function createValidationMiddleware<TBody = any, TQuery = any>(
  options: {
    bodySchema?: z.ZodSchema<TBody>
    querySchema?: z.ZodSchema<TQuery>
    requireAuth?: boolean
  }
) {
  return async (
    request: NextRequest,
    handler: (
      validatedData: {
        body?: TBody
        query?: TQuery
        searchParams: URLSearchParams
      }
    ) => Promise<NextResponse>
  ) => {
    try {
      const searchParams = new URL(request.url).searchParams
      let validatedBody: TBody | undefined
      let validatedQuery: TQuery | undefined

      // Body validation
      if (options.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const bodyResult = await validateRequestBody(request, options.bodySchema)
        if (!bodyResult.success) {
          return createValidationErrorResponse(bodyResult)
        }
        validatedBody = bodyResult.data
      }

      // Query validation
      if (options.querySchema) {
        const queryResult = validateSearchParams(searchParams, options.querySchema)
        if (!queryResult.success) {
          return createValidationErrorResponse(queryResult)
        }
        validatedQuery = queryResult.data
      }

      return await handler({
        body: validatedBody,
        query: validatedQuery,
        searchParams
      })

    } catch (error) {
      console.error('Validation middleware error:', error)
      return createErrorResponse(
        '요청 처리 중 오류가 발생했습니다',
        ERROR_CODES.INTERNAL_ERROR
      )
    }
  }
}

// =====================================================
// Enhanced Validation Functions
// =====================================================

/**
 * 조건부 검증 (특정 조건에서만 검증)
 */
export function validateConditionally<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  condition: boolean
): ValidationResult<T | undefined> {
  if (!condition) {
    return { success: true, data: undefined }
  }
  return validateWithSchema(schema, data)
}

/**
 * 부분 검증 (일부 필드만 검증)
 */
export function validatePartial<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  data: Partial<T>
): ValidationResult<Partial<T>> {
  const partialSchema = schema.partial()
  return validateWithSchema(partialSchema, data)
}

/**
 * 배열 검증
 */
export function validateArray<T>(
  itemSchema: z.ZodSchema<T>,
  data: unknown[]
): ValidationResult<T[]> {
  const arraySchema = z.array(itemSchema)
  return validateWithSchema(arraySchema, data)
}

/**
 * UUID 검증 (단일)
 */
export function validateUUID(value: string): ValidationResult<string> {
  const uuidSchema = z.string().uuid('올바른 UUID 형식이 아닙니다')
  return validateWithSchema(uuidSchema, value)
}

/**
 * 다중 UUID 검증
 */
export function validateUUIDs(values: string[]): ValidationResult<string[]> {
  const uuidArraySchema = z.array(z.string().uuid('올바른 UUID 형식이 아닙니다'))
  return validateWithSchema(uuidArraySchema, values)
}

// =====================================================
// Custom Validation Rules
// =====================================================

/**
 * 한국어 이름 검증
 */
export const KoreanNameSchema = z.string()
  .min(2, '이름은 최소 2자 이상이어야 합니다')
  .max(10, '이름은 10자 이하여야 합니다')
  .regex(/^[가-힣a-zA-Z\s]+$/, '이름은 한글, 영문, 공백만 사용 가능합니다')

/**
 * 한국 전화번호 검증
 */
export const KoreanPhoneSchema = z.string()
  .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '올바른 휴대폰 번호 형식이 아닙니다')

/**
 * 사업자등록번호 검증 (체크섬 포함)
 */
export function validateBusinessNumber(value: string): ValidationResult<string> {
  const businessNumberSchema = z.string()
    .regex(/^\d{3}-?\d{2}-?\d{5}$/, '사업자등록번호는 000-00-00000 형식이어야 합니다')
    .refine((val) => {
      const numbers = val.replace(/-/g, '')
      const checkSum = [1, 3, 7, 1, 3, 7, 1, 3, 5, 1]
      let sum = 0
      
      for (let i = 0; i < 9; i++) {
        sum += parseInt(numbers[i]) * checkSum[i]
      }
      
      sum += Math.floor((parseInt(numbers[8]) * 5) / 10)
      const remainder = sum % 10
      const checkDigit = remainder === 0 ? 0 : 10 - remainder
      
      return parseInt(numbers[9]) === checkDigit
    }, '유효하지 않은 사업자등록번호입니다')

  return validateWithSchema(businessNumberSchema, value)
}

/**
 * 날짜 범위 검증
 */
export function createDateRangeSchema(
  minDate?: Date,
  maxDate?: Date,
  errorMessage?: string
) {
  let schema = z.date()
  
  if (minDate) {
    schema = schema.min(minDate, errorMessage || `${minDate.toLocaleDateString()} 이후 날짜여야 합니다`)
  }
  
  if (maxDate) {
    schema = schema.max(maxDate, errorMessage || `${maxDate.toLocaleDateString()} 이전 날짜여야 합니다`)
  }
  
  return schema
}

// =====================================================
// Type Guards with Runtime Validation
// =====================================================

/**
 * 런타임 타입 가드 생성기
 */
export function createTypeGuard<T>(schema: z.ZodSchema<T>) {
  return (value: unknown): value is T => {
    return schema.safeParse(value).success
  }
}

// =====================================================
// Error Formatting
// =====================================================

/**
 * Zod 에러를 사용자 친화적 메시지로 변환
 */
export function formatZodError(error: ZodError): ApiValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }))
}

/**
 * 필드별 에러 메시지 생성
 */
export function createFieldErrorMap(errors: ApiValidationError[]): Record<string, string> {
  return errors.reduce((map, error) => {
    map[error.field] = error.message
    return map
  }, {} as Record<string, string>)
}