/**
 * Business Document Upload API
 * 사업자등록증 및 관련 서류 업로드 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createKoreanOrganizationService } from '@/src/lib/services/korean-organization.service'

/**
 * POST /api/korean-business/documents/upload
 * 사업자등록증 파일 업로드
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

    // FormData 파싱
    const formData = await request.formData()
    const file = formData.get('file') as File
    const organizationId = formData.get('organizationId') as string
    const documentType = formData.get('documentType') as string

    // 입력 검증
    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 제공되지 않았습니다' },
        { status: 400 }
      )
    }

    if (!organizationId || !documentType) {
      return NextResponse.json(
        { success: false, error: '조직 ID와 문서 타입이 필요합니다' },
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

    // 문서 타입 검증
    const validDocumentTypes = ['business_certificate', 'corporate_seal']
    if (!validDocumentTypes.includes(documentType)) {
      return NextResponse.json(
        { success: false, error: '올바르지 않은 문서 타입입니다' },
        { status: 400 }
      )
    }

    // 파일 기본 검증
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'JPG, PNG, GIF, PDF 파일만 업로드 가능합니다' },
        { status: 400 }
      )
    }

    const maxFileSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { success: false, error: '파일 크기는 10MB 이하여야 합니다' },
        { status: 400 }
      )
    }

    // 조직 권한 확인
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

    // 관리자 권한 확인
    const adminRoles = ['admin', 'owner', 'master']
    if (!adminRoles.includes(userRole.role)) {
      return NextResponse.json(
        { success: false, error: '문서 업로드 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 파일 업로드 처리
    const organizationService = createKoreanOrganizationService(supabase)
    const uploadResult = await organizationService.uploadBusinessCertificate(
      organizationId,
      file,
      documentType as 'business_certificate' | 'corporate_seal'
    )

    if (!uploadResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: uploadResult.error || '파일 업로드에 실패했습니다'
        },
        { status: 400 }
      )
    }

    // 성공 응답
    return NextResponse.json(
      {
        success: true,
        message: '파일이 성공적으로 업로드되었습니다',
        data: {
          fileUrl: uploadResult.fileUrl,
          fileName: uploadResult.fileName
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Document upload error:', error)
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
 * GET /api/korean-business/documents/upload?organizationId=uuid
 * 조직의 업로드된 문서 목록 조회
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

    // 조직 권한 확인
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

    // 문서 목록 조회
    const { data: documents, error: documentsError } = await supabase
      .from('business_documents')
      .select(`
        id,
        document_type,
        file_name,
        file_url,
        file_size,
        mime_type,
        verification_status,
        verification_notes,
        verified_at,
        uploaded_at
      `)
      .eq('organization_id', organizationId)
      .order('uploaded_at', { ascending: false })

    if (documentsError) {
      return NextResponse.json(
        { success: false, error: `문서 조회 실패: ${documentsError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: documents || []
    })

  } catch (error) {
    console.error('Document retrieval error:', error)
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