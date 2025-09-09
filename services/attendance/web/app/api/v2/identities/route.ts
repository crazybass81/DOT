/**
 * Identity Management API v2
 * RESTful API for unified identity management
 * Enhanced with Zod runtime validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { identityService } from '@/src/services/identityService'
import { CreateIdentityRequest, VALIDATION_PATTERNS, ERROR_CODES } from '@/src/types/unified.types'
import { 
  CreateIdentityRequestSchema,
  CreateIdentityResponseSchema 
} from '@/src/schemas/user.schema'
import { 
  validateRequestBody,
  validateSearchParams,
  createValidationErrorResponse,
  createSuccessResponse,
  createErrorResponse
} from '@/src/lib/validation'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    // Runtime validation with Zod schema
    const bodyValidation = await validateRequestBody(request, CreateIdentityRequestSchema)
    
    if (!bodyValidation.success) {
      return createValidationErrorResponse(bodyValidation)
    }
    
    const body = bodyValidation.data!

    // Create identity
    const result = await identityService.createIdentity(body)

    if (!result.success) {
      return createErrorResponse(result.error, 'CREATION_FAILED', 400)
    }

    // Validate response with schema
    const responseValidation = CreateIdentityResponseSchema.safeParse(result)
    
    if (!responseValidation.success) {
      console.error('Response validation failed:', responseValidation.error)
      return createErrorResponse('응답 데이터 형식 오류', 'RESPONSE_VALIDATION_ERROR')
    }

    return createSuccessResponse({
      identity: result.identity,
      requiresVerification: result.requiresVerification,
      verificationMethod: result.verificationMethod
    }, '신원 정보가 성공적으로 생성되었습니다', 201)

  } catch (error) {
    console.error('Error in POST /api/v2/identities:', error)
    return createErrorResponse(
      'Identity 생성 중 서버 오류가 발생했습니다',
      ERROR_CODES.INTERNAL_ERROR
    )
  }
}

// Query parameter schema for GET requests
const IdentityQuerySchema = z.object({
  id: z.string().uuid('올바른 UUID 형식이 아닙니다').optional(),
  authUserId: z.string().uuid('올바른 UUID 형식이 아닙니다').optional()
}).refine(data => data.id || data.authUserId, {
  message: 'id 또는 authUserId 매개변수가 필요합니다'
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = validateSearchParams(searchParams, IdentityQuerySchema)
    
    if (!queryValidation.success) {
      return createValidationErrorResponse(queryValidation)
    }
    
    const { id, authUserId } = queryValidation.data!

    let identity
    if (id) {
      identity = await identityService.getById(id)
    } else if (authUserId) {
      identity = await identityService.getByAuthUserId(authUserId)
    }

    if (!identity) {
      return createErrorResponse(
        'Identity를 찾을 수 없습니다',
        ERROR_CODES.IDENTITY_NOT_FOUND,
        404
      )
    }

    return createSuccessResponse(
      { identity },
      'Identity 조회가 완료되었습니다'
    )

  } catch (error) {
    console.error('Error in GET /api/v2/identities:', error)
    return createErrorResponse(
      'Identity 조회 중 서버 오류가 발생했습니다',
      ERROR_CODES.INTERNAL_ERROR
    )
  }
}