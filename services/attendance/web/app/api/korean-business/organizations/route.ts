/**
 * Korean Business Organization API
 * RESTful API for Korean business organization management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { 
  KoreanOrganizationCreationSchema,
  KoreanOrganizationCreation 
} from '@/src/schemas/korean-business.schema'
import { createKoreanOrganizationService } from '@/src/lib/services/korean-organization.service'

/**
 * POST /api/korean-business/organizations
 * 한국 사업자 등록정보와 함께 조직 생성
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

    // 요청 본문 파싱
    const body = await request.json()
    
    // 스키마 검증
    const validationResult = KoreanOrganizationCreationSchema.safeParse(body)
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

    const organizationData: KoreanOrganizationCreation = validationResult.data

    // 서비스 초기화 및 조직 생성
    const organizationService = createKoreanOrganizationService(supabase)
    const result = await organizationService.createOrganization(organizationData)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || '조직 생성에 실패했습니다',
          details: result.details
        },
        { status: 400 }
      )
    }

    // 성공 응답
    return NextResponse.json(
      {
        success: true,
        message: '조직이 성공적으로 생성되었습니다',
        data: {
          organizationId: result.organizationId,
          invitationCode: result.invitationCode,
          qrCodeData: result.qrCodeData
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Korean organization creation error:', error)
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
 * GET /api/korean-business/organizations?id=uuid
 * 조직 상세 정보 조회 (한국 사업자 정보 포함)
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
    const organizationId = searchParams.get('id')

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

    // 조직 정보 조회
    const { data: organization, error: orgError } = await supabase
      .from('organizations_v3')
      .select(`
        *,
        korean_business_registrations (*),
        workplace_locations (*),
        business_documents (*),
        attendance_policies (*)
      `)
      .eq('id', organizationId)
      .single()

    if (orgError) {
      if (orgError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: '조직을 찾을 수 없습니다' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: `조직 조회 실패: ${orgError.message}` },
        { status: 500 }
      )
    }

    // 권한 확인 - 해당 조직의 멤버인지 확인
    const { data: userRole, error: roleError } = await supabase
      .from('role_assignments')
      .select('role, is_active')
      .eq('organization_id', organizationId)
      .eq('identity_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (roleError || !userRole) {
      return NextResponse.json(
        { success: false, error: '이 조직에 접근할 권한이 없습니다' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: organization
    })

  } catch (error) {
    console.error('Organization retrieval error:', error)
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