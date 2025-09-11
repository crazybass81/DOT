/**
 * 조직 직원 목록 API 엔드포인트
 * GET /api/organization/[id]/employees
 */

import { NextRequest, NextResponse } from 'next/server';
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

    // 조직 접근 권한 확인
    const { data: roleData, error: roleError } = await supabase
      .from('role_assignments')
      .select('role')
      .eq('identity_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json(
        { error: '조직에 대한 접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 직원 목록 조회
    const { data: employees, error: employeesError } = await supabase
      .from('role_assignments')
      .select(`
        identity_id,
        role,
        department,
        position,
        employee_code,
        is_active,
        created_at,
        unified_identities!inner(
          id,
          full_name,
          email,
          phone,
          created_at,
          last_sign_in_at
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (employeesError) {
      throw new Error(`직원 목록 조회 실패: ${employeesError.message}`);
    }

    // 데이터 변환
    const formattedEmployees = employees?.map(emp => ({
      id: emp.identity_id,
      full_name: emp.unified_identities.full_name,
      email: emp.unified_identities.email,
      phone: emp.unified_identities.phone,
      role: emp.role,
      department: emp.department,
      position: emp.position,
      employee_code: emp.employee_code,
      is_active: emp.is_active,
      created_at: emp.created_at,
      last_login: emp.unified_identities.last_sign_in_at
    })) || [];

    return NextResponse.json({
      success: true,
      data: formattedEmployees
    });

  } catch (error) {
    console.error('Get employees API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : '직원 목록 조회에 실패했습니다.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    );
  }
}