import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Service Role Client - bypasses RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, fullName } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email' },
        { status: 400 }
      );
    }

    console.log('🔧 Server-side 프로필 생성 시작:', { userId, email, fullName });

    // 1. 기본 조직 확인
    let { data: defaultOrg, error: orgError } = await supabaseAdmin
      .from('organizations_v3')
      .select('*')
      .eq('name', 'default-org')
      .maybeSingle();

    if (orgError) {
      console.error('❌ 기본 조직 확인 중 오류:', orgError);
      return NextResponse.json(
        { error: '기본 조직 확인 실패', details: orgError.message },
        { status: 500 }
      );
    }

    if (!defaultOrg) {
      console.log('⚠️ 기본 조직이 없음. 생성 중...');
      
      // 기본 조직 생성
      const { data: newOrg, error: createOrgError } = await supabaseAdmin
        .from('organizations_v3')
        .insert({
          name: 'default-org',
          display_name: 'DOT 기본 조직',
          description: 'DOT 출석 관리 시스템 기본 조직',
          is_active: true,
          settings: {
            timezone: 'Asia/Seoul',
            work_hours: {
              start: '09:00',
              end: '18:00'
            },
            features: {
              qr_enabled: true,
              gps_enabled: true,
              biometric_enabled: true,
              offline_enabled: true
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createOrgError) {
        console.error('❌ 기본 조직 생성 실패:', createOrgError);
        return NextResponse.json(
          { error: '기본 조직 생성 실패', details: createOrgError.message },
          { status: 500 }
        );
      }

      console.log('✅ 기본 조직 생성 완료:', newOrg.display_name);
      
      // 새로 생성된 조직을 사용
      defaultOrg = newOrg;
    }

    console.log('✅ 기본 조직 확인:', defaultOrg.display_name);

    // 2. unified_identities 생성
    const identityData = {
      email,
      full_name: fullName || '사용자',
      auth_user_id: userId,
      is_active: true,
      is_verified: false, // 이메일 인증 대기
      id_type: 'EMPLOYEE' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: identity, error: identityError } = await supabaseAdmin
      .from('unified_identities')
      .insert(identityData)
      .select()
      .single();

    if (identityError) {
      console.error('❌ unified_identities 생성 실패:', identityError);
      return NextResponse.json(
        { error: 'unified_identities 생성 실패', details: identityError.message },
        { status: 500 }
      );
    }

    console.log('✅ unified_identities 생성 완료:', identity.id);

    // 3. role_assignments 생성
    const roleData = {
      identity_id: identity.id,
      organization_id: defaultOrg.id,
      role: 'WORKER' as const,
      is_active: true,
      is_primary: true,
      employee_code: `EMP${Date.now()}`,
      department: '기본부서',
      position: '사원',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: roleAssignment, error: roleError } = await supabaseAdmin
      .from('role_assignments')
      .insert(roleData)
      .select()
      .single();

    if (roleError) {
      console.error('❌ role_assignments 생성 실패:', roleError);
      
      // identity는 생성되었지만 role_assignment 실패한 경우에도 성공으로 처리
      // 나중에 role을 수동으로 할당할 수 있음
      console.log('⚠️ role_assignment 실패했지만 identity는 생성됨');
      
      return NextResponse.json({
        success: true,
        identity,
        roleAssignment: null,
        warning: 'role_assignment 생성 실패 - 수동 할당 필요'
      });
    }

    console.log('✅ role_assignments 생성 완료:', roleAssignment.role);

    // 4. profiles 테이블에도 레코드 생성 (기존 트리거가 작동하지 않는 경우 대비)
    const profileData = {
      id: userId,
      email,
      name: fullName || '사용자',
      role: 'WORKER' as const,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error('⚠️ profiles 생성 실패 (선택사항):', profileError);
      // profiles 실패는 치명적이지 않음 - 다른 데이터가 있으면 충분
    } else {
      console.log('✅ profiles 생성 완료:', profile.id);
    }

    // 성공 응답
    return NextResponse.json({
      success: true,
      message: '프로필 생성 완료',
      data: {
        identity,
        roleAssignment,
        profile: profile || null,
        organization: {
          id: defaultOrg.id,
          name: defaultOrg.display_name
        }
      }
    });

  } catch (error) {
    console.error('❌ API 라우트 오류:', error);
    
    return NextResponse.json(
      { 
        error: '서버 내부 오류',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}