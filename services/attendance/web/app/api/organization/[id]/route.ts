/**
 * 조직 정보 조회/업데이트 API 엔드포인트
 * GET /api/organization/[id] - 조직 정보 조회
 * PUT /api/organization/[id] - 조직 정보 업데이트
 */

import { NextRequest, NextResponse } from 'next/server';
import { organizationService } from '@/lib/services/organization.service';
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

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 조직 정보 조회
    const organization = await organizationService.getOrganization(organizationId);
    
    if (!organization) {
      return NextResponse.json(
        { error: '조직을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 조직 통계 조회
    const stats = await organizationService.getOrganizationStats(organizationId);

    return NextResponse.json({
      success: true,
      data: {
        ...organization,
        stats
      }
    });

  } catch (error) {
    console.error('Get organization API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '조직 조회에 실패했습니다.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // 권한 확인 (관리자만 수정 가능)
    const { data: roleData, error: roleError } = await supabase
      .from('role_assignments')
      .select('role')
      .eq('identity_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (roleError || !roleData || !['admin', 'manager', 'master'].includes(roleData.role)) {
      return NextResponse.json(
        { error: '조직 수정 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱
    const body = await request.json();
    const updateData = {
      name: body.name,
      business_registration_number: body.business_registration_number,
      primary_location: body.primary_location,
      attendance_radius_meters: body.attendance_radius_meters,
      work_hours_policy: body.work_hours_policy,
      break_time_policy: body.break_time_policy,
      organization_settings: body.organization_settings
    };

    // 데이터 검증
    if (updateData.name && updateData.name.trim().length === 0) {
      return NextResponse.json(
        { error: '조직명은 필수입니다.' },
        { status: 400 }
      );
    }

    if (updateData.name && updateData.name.length > 100) {
      return NextResponse.json(
        { error: '조직명은 100자를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 조직 정보 업데이트
    const updatedOrganization = await organizationService.updateOrganizationSettings(
      organizationId,
      updateData
    );

    return NextResponse.json({
      success: true,
      data: updatedOrganization,
      message: '조직 정보가 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('Update organization API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '조직 정보 업데이트에 실패했습니다.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    );
  }
}