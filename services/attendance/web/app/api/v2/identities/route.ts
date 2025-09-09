/**
 * Identity Management API v2
 * RESTful API for unified identity management
 */

import { NextRequest, NextResponse } from 'next/server'
import { identityService } from '@/src/services/identityService'
import { CreateIdentityRequest, VALIDATION_PATTERNS, ERROR_CODES } from '@/src/types/unified.types'

export async function POST(request: NextRequest) {
  try {
    const body: CreateIdentityRequest = await request.json()

    // Validate required fields
    if (!body.email || !body.phone || !body.fullName || !body.birthDate || !body.idType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Create identity
    const result = await identityService.createIdentity(body)

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
        identity: result.identity,
        requiresVerification: result.requiresVerification,
        verificationMethod: result.verificationMethod
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/v2/identities:', error)
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
    const authUserId = searchParams.get('authUserId')

    if (!id && !authUserId) {
      return NextResponse.json({
        success: false,
        error: 'Either id or authUserId parameter is required',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    let identity
    if (id) {
      identity = await identityService.getById(id)
    } else if (authUserId) {
      identity = await identityService.getByAuthUserId(authUserId)
    }

    if (!identity) {
      return NextResponse.json({
        success: false,
        error: 'Identity not found',
        code: 'NOT_FOUND'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { identity }
    })

  } catch (error) {
    console.error('Error in GET /api/v2/identities:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}