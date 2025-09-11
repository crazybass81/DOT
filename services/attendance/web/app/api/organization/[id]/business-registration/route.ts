/**
 * 사업자등록증 업로드 API 엔드포인트
 * POST /api/organization/[id]/business-registration
 */

import { NextRequest, NextResponse } from 'next/server';
import { organizationService, UploadBusinessRegistrationData } from '@/lib/services/organization.service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const organizationId = params.id;

    // 인증 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다.' },
        { status: 401 }
      );
    }

    // 권한 확인 (관리자만 업로드 가능)
    const { data: roleData, error: roleError } = await supabase
      .from('role_assignments')
      .select('role')
      .eq('identity_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (roleError || !roleData || !['admin', 'master'].includes(roleData.role)) {
      return NextResponse.json(
        { error: '사업자등록증 업로드 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const registrationNumber = formData.get('registration_number') as string;
    const businessName = formData.get('business_name') as string;
    const businessType = formData.get('business_type') as string;
    const address = formData.get('address') as string;
    const representativeName = formData.get('representative_name') as string;

    // 데이터 검증
    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    if (!registrationNumber || registrationNumber.trim().length === 0) {
      return NextResponse.json(
        { error: '사업자등록번호는 필수입니다.' },
        { status: 400 }
      );
    }

    if (!businessName || businessName.trim().length === 0) {
      return NextResponse.json(
        { error: '상호명은 필수입니다.' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '지원되지 않는 파일 형식입니다. (JPEG, PNG, PDF만 허용)' },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 10MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 사업자등록증 업로드
    const uploadData: UploadBusinessRegistrationData = {
      organization_id: organizationId,
      registration_number: registrationNumber.trim(),
      business_name: businessName.trim(),
      business_type: businessType?.trim(),
      address: address?.trim(),
      representative_name: representativeName?.trim(),
      file: file
    };

    const businessRegistration = await organizationService.uploadBusinessRegistration(uploadData);

    return NextResponse.json({
      success: true,
      data: businessRegistration,
      message: '사업자등록증이 성공적으로 업로드되었습니다. 검토 후 승인됩니다.'
    });

  } catch (error) {
    console.error('Business registration upload API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '사업자등록증 업로드에 실패했습니다.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    );
  }
}