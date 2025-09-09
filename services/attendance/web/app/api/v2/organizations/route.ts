/**
 * Organization Management API v2
 * RESTful API for organization and role management
 * Enhanced with Zod runtime validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { organizationService } from '@/src/services/organizationService'
import { CreateOrganizationRequest, AssignRoleRequest, ERROR_CODES } from '@/src/types/unified.types'
import { 
  CreateOrganizationRequestSchema,
  CreateOrganizationResponseSchema,
  OrganizationQuerySchema
} from '@/src/schemas/organization.schema'
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
    const bodyValidation = await validateRequestBody(request, CreateOrganizationRequestSchema)
    
    if (!bodyValidation.success) {
      return createValidationErrorResponse(bodyValidation)
    }
    
    const body = bodyValidation.data!

    // Create organization
    const result = await organizationService.createOrganization(body)

    if (!result.success) {
      return createErrorResponse(result.error, 'CREATION_FAILED', 400)
    }

    // Validate response with schema
    const responseValidation = CreateOrganizationResponseSchema.safeParse(result)
    
    if (!responseValidation.success) {
      console.error('Response validation failed:', responseValidation.error)
      return createErrorResponse('응답 데이터 형식 오류', 'RESPONSE_VALIDATION_ERROR')
    }

    return createSuccessResponse({
      organization: result.organization,
      code: result.code
    }, '조직이 성공적으로 생성되었습니다', 201)

  } catch (error) {
    console.error('Error in POST /api/v2/organizations:', error)
    return createErrorResponse(
      '조직 생성 중 서버 오류가 발생했습니다',
      ERROR_CODES.INTERNAL_ERROR
    )
  }
}

// Query parameter schema for GET requests
const OrganizationGetQuerySchema = z.object({
  id: z.string().uuid('올바른 UUID 형식이 아닙니다').optional(),
  code: z.string().length(4, '조직 코드는 4자리여야 합니다').optional()
}).refine(data => data.id || data.code, {
  message: 'id 또는 code 매개변수가 필요합니다'
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const queryValidation = validateSearchParams(searchParams, OrganizationGetQuerySchema)
    
    if (!queryValidation.success) {
      return createValidationErrorResponse(queryValidation)
    }
    
    const { id, code } = queryValidation.data!

    let organization
    if (id) {
      organization = await organizationService.getById(id)
    } else if (code) {
      organization = await organizationService.getByCode(code)
    }

    if (!organization) {
      return createErrorResponse(
        '조직을 찾을 수 없습니다',
        ERROR_CODES.ORGANIZATION_NOT_FOUND,
        404
      )
    }

    return createSuccessResponse(
      { organization },
      '조직 조회가 완료되었습니다'
    )

  } catch (error) {
    console.error('Error in GET /api/v2/organizations:', error)
    return createErrorResponse(
      '조직 조회 중 서버 오류가 발생했습니다',
      ERROR_CODES.INTERNAL_ERROR
    )
  }
}