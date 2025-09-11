/**
 * 조직 생성 API 엔드포인트
 * POST /api/organization/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { organizationService, CreateOrganizationData } from '@/lib/services/organization.service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자 정보 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다.' },
        { status: 401 }
      );
    }

    // 요청 데이터 파싱
    const body = await request.json();
    const organizationData: CreateOrganizationData = {
      name: body.name,
      type: body.type || 'business',
      business_registration_number: body.business_registration_number,
      primary_address: body.primary_address,
      gps_latitude: body.gps_latitude,
      gps_longitude: body.gps_longitude,
      attendance_radius: body.attendance_radius || 100,
      work_hours_policy: body.work_hours_policy,
      break_time_policy: body.break_time_policy
    };

    // 데이터 검증
    if (!organizationData.name || organizationData.name.trim().length === 0) {
      return NextResponse.json(
        { error: '조직명은 필수입니다.' },
        { status: 400 }
      );
    }

    if (organizationData.name.length > 100) {
      return NextResponse.json(
        { error: '조직명은 100자를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 조직 생성
    const organization = await organizationService.createOrganization(
      organizationData,
      user.id
    );

    return NextResponse.json({
      success: true,
      data: organization,
      message: '조직이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('Organization creation API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '조직 생성에 실패했습니다.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    );
  }
}