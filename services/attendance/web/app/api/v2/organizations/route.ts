/**
 * Organization Management API v2
 * RESTful API for organization and role management
 */

import { NextRequest, NextResponse } from 'next/server'
import { organizationService } from '@/services/organizationService'
import { CreateOrganizationRequest, AssignRoleRequest } from '@/types/unified.types'

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrganizationRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.orgType || !body.ownerIdentityId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, orgType, ownerIdentityId',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Create organization
    const result = await organizationService.createOrganization(body)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        code: 'CREATION_FAILED'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: result.organization,
        code: result.code
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/v2/organizations:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const code = searchParams.get('code')

    if (!id && !code) {
      return NextResponse.json({
        success: false,
        error: 'Either id or code parameter is required',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    let organization
    if (id) {
      organization = await organizationService.getById(id)
    } else if (code) {
      organization = await organizationService.getByCode(code)
    }

    if (!organization) {
      return NextResponse.json({
        success: false,
        error: 'Organization not found',
        code: 'NOT_FOUND'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { organization }
    })

  } catch (error) {
    console.error('Error in GET /api/v2/organizations:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}