/**
 * 조직 초대 관리 API 엔드포인트
 * GET /api/organization/[id]/invitations - 초대 목록 조회
 * POST /api/organization/[id]/invitations - 새 초대 생성
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

    // 조직 접근 권한 확인 (관리자만 초대 목록 조회 가능)
    const { data: roleData, error: roleError } = await supabase
      .from('role_assignments')
      .select('role')
      .eq('identity_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (roleError || !roleData || !['admin', 'manager', 'master'].includes(roleData.role)) {
      return NextResponse.json(
        { error: '초대 목록 조회 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 초대 목록 조회
    const invitations = await organizationService.getInvitations(organizationId);

    return NextResponse.json({
      success: true,
      data: invitations
    });

  } catch (error) {
    console.error('Get invitations API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '초대 목록 조회에 실패했습니다.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    );
  }
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

    // 초대 권한 확인 (관리자만 초대 가능)
    const { data: roleData, error: roleError } = await supabase
      .from('role_assignments')
      .select('role')
      .eq('identity_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (roleError || !roleData || !['admin', 'manager', 'master'].includes(roleData.role)) {
      return NextResponse.json(
        { error: '직원 초대 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱
    const body = await request.json();
    
    // 데이터 검증
    if (!body.email || !body.full_name) {
      return NextResponse.json(
        { error: '이메일과 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    if (!['worker', 'manager', 'admin'].includes(body.role)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할입니다.' },
        { status: 400 }
      );
    }

    // 이미 조직에 속한 사용자인지 확인
    const { data: existingUser, error: existingUserError } = await supabase
      .from('unified_identities')
      .select('id')
      .eq('email', body.email.trim().toLowerCase())
      .single();

    if (existingUser) {
      // 이미 이 조직에 속해 있는지 확인
      const { data: existingRole, error: existingRoleError } = await supabase
        .from('role_assignments')
        .select('id')
        .eq('identity_id', existingUser.id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (existingRole) {
        return NextResponse.json(
          { error: '이미 조직에 속한 사용자입니다.' },
          { status: 400 }
        );
      }
    }

    // 기존 초대가 있는지 확인
    const { data: existingInvitation, error: existingInvitationError } = await supabase
      .from('employee_invitations')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('email', body.email.trim().toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: '이미 대기 중인 초대가 있습니다.' },
        { status: 400 }
      );
    }

    // 직원코드 중복 확인
    if (body.employee_code) {
      const { data: existingCode, error: existingCodeError } = await supabase
        .from('role_assignments')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('employee_code', body.employee_code.trim())
        .eq('is_active', true)
        .single();

      if (existingCode) {
        return NextResponse.json(
          { error: '이미 사용 중인 직원코드입니다.' },
          { status: 400 }
        );
      }

      // 대기 중인 초대에서도 확인
      const { data: existingInviteCode, error: existingInviteCodeError } = await supabase
        .from('employee_invitations')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('employee_code', body.employee_code.trim())
        .eq('status', 'pending')
        .single();

      if (existingInviteCode) {
        return NextResponse.json(
          { error: '이미 사용 중인 직원코드입니다.' },
          { status: 400 }
        );
      }
    }

    // 초대 생성
    const invitationData = {
      organization_id: organizationId,
      invited_by: user.id,
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim(),
      full_name: body.full_name.trim(),
      role: body.role,
      department_id: body.department_id || null,
      position: body.position?.trim(),
      employee_code: body.employee_code?.trim()
    };

    const invitation = await organizationService.inviteEmployee(invitationData);

    return NextResponse.json({
      success: true,
      data: invitation,
      message: '초대가 성공적으로 전송되었습니다.'
    });

  } catch (error) {
    console.error('Create invitation API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '초대 생성에 실패했습니다.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    );
  }
}