/**
 * Employee Invitation API
 * 직원 초대 관리 API (QR 코드 지원)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { EmployeeInvitationSchema, EmployeeInvitation } from '@/src/schemas/korean-business.schema'
import { createKoreanOrganizationService } from '@/src/lib/services/korean-organization.service'

/**
 * POST /api/korean-business/invitations
 * 직원 초대 생성 (QR 코드 포함)
 */
export async function POST(request: NextRequest) {
  try {
    // Supabase 클라이언트 초기화
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 사용자 정보 조회
    const { data: userIdentity, error: identityError } = await supabase
      .from('unified_identities')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (identityError || !userIdentity) {
      return NextResponse.json(
        { success: false, error: '사용자 정보를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 요청 본문 파싱
    const body = await request.json()
    
    // 초대자 ID 설정
    const invitationData = {
      ...body,
      inviterUserId: userIdentity.id,
      expiresAt: new Date(body.expiresAt || Date.now() + 72 * 60 * 60 * 1000) // 기본 72시간
    }

    // 스키마 검증
    const validationResult = EmployeeInvitationSchema.safeParse(invitationData)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ')
      
      return NextResponse.json(
        { 
          success: false, 
          error: '입력 데이터가 올바르지 않습니다',
          details: errors
        },
        { status: 400 }
      )
    }

    const invitation: EmployeeInvitation = validationResult.data

    // 조직 권한 확인
    const { data: userRole, error: roleError } = await supabase
      .from('role_assignments')
      .select('role, is_active')
      .eq('organization_id', invitation.organizationId)
      .eq('identity_id', userIdentity.id)
      .eq('is_active', true)
      .maybeSingle()

    if (roleError || !userRole) {
      return NextResponse.json(
        { success: false, error: '이 조직에 접근할 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 초대 권한 확인 (admin, owner, manager만 초대 가능)
    const inviteRoles = ['admin', 'owner', 'master', 'manager']
    if (!inviteRoles.includes(userRole.role)) {
      return NextResponse.json(
        { success: false, error: '직원 초대 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 조직의 최대 초대 수 확인
    const { data: orgSettings } = await supabase
      .from('organizations_v3')
      .select('settings')
      .eq('id', invitation.organizationId)
      .single()

    const maxPendingInvitations = orgSettings?.settings?.invitationSettings?.maxPendingInvitations || 50

    // 현재 대기 중인 초대 수 확인
    const { count: pendingCount, error: countError } = await supabase
      .from('employee_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', invitation.organizationId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (countError) {
      return NextResponse.json(
        { success: false, error: '초대 상태 확인 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    if ((pendingCount || 0) >= maxPendingInvitations) {
      return NextResponse.json(
        { success: false, error: `최대 ${maxPendingInvitations}개의 대기 중인 초대만 허용됩니다` },
        { status: 400 }
      )
    }

    // 중복 초대 확인 (같은 이메일 또는 전화번호)
    if (invitation.inviteeEmail || invitation.inviteePhone) {
      let duplicateQuery = supabase
        .from('employee_invitations')
        .select('id')
        .eq('organization_id', invitation.organizationId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())

      if (invitation.inviteeEmail) {
        duplicateQuery = duplicateQuery.eq('invitee_email', invitation.inviteeEmail)
      } else if (invitation.inviteePhone) {
        duplicateQuery = duplicateQuery.eq('invitee_phone', invitation.inviteePhone)
      }

      const { data: duplicate } = await duplicateQuery.maybeSingle()
      
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: '이미 초대된 사용자입니다' },
          { status: 400 }
        )
      }
    }

    // 초대 생성
    const organizationService = createKoreanOrganizationService(supabase)
    const result = await organizationService.createEmployeeInvitation(invitation)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || '초대 생성에 실패했습니다'
        },
        { status: 400 }
      )
    }

    // 성공 응답
    return NextResponse.json(
      {
        success: true,
        message: '직원 초대가 성공적으로 생성되었습니다',
        data: {
          invitationId: result.invitationId,
          invitationUrl: result.invitationUrl,
          qrCodeData: result.qrCodeData
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Employee invitation creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/korean-business/invitations?organizationId=uuid
 * 조직의 초대 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // URL 파라미터 추출
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: '조직 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(organizationId)) {
      return NextResponse.json(
        { success: false, error: '올바른 조직 ID 형식이 아닙니다' },
        { status: 400 }
      )
    }

    // 사용자 정보 조회
    const { data: userIdentity, error: identityError } = await supabase
      .from('unified_identities')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (identityError || !userIdentity) {
      return NextResponse.json(
        { success: false, error: '사용자 정보를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 조직 권한 확인
    const { data: userRole, error: roleError } = await supabase
      .from('role_assignments')
      .select('role, is_active')
      .eq('organization_id', organizationId)
      .eq('identity_id', userIdentity.id)
      .eq('is_active', true)
      .maybeSingle()

    if (roleError || !userRole) {
      return NextResponse.json(
        { success: false, error: '이 조직에 접근할 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 쿼리 구성
    let query = supabase
      .from('employee_invitations')
      .select(`
        id,
        invitee_name,
        invitee_email,
        invitee_phone,
        role,
        department,
        position,
        invitation_message,
        status,
        created_at,
        expires_at,
        accepted_at,
        rejected_at,
        workplace_locations (
          id,
          name
        )
      `)
      .eq('organization_id', organizationId)

    // 상태 필터 적용
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // 페이지네이션 적용
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: invitations, error: invitationsError } = await query

    if (invitationsError) {
      return NextResponse.json(
        { success: false, error: `초대 목록 조회 실패: ${invitationsError.message}` },
        { status: 500 }
      )
    }

    // 총 개수 조회
    let countQuery = supabase
      .from('employee_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      return NextResponse.json(
        { success: false, error: '초대 개수 조회에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        invitations: invitations || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
          hasNext: offset + limit < (totalCount || 0),
          hasPrev: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Invitations retrieval error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}