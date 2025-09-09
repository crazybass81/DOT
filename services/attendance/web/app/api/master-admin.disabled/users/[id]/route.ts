/**
 * 마스터 어드민 사용자 상세 정보 조회 API 엔드포인트
 * GET /api/master-admin/users/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auditLogger, AuditAction, AuditResult } from '@/lib/audit-logger';

interface RouteParams {
  params: {
    id: string;
  };
}

interface UserDetailInfo {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  email_verified: boolean;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  timezone: string | null;
  locale: string | null;
  metadata: Record<string, any> | null;
  organizations: Array<{
    id: string;
    name: string;
    role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
    status: string;
    joined_at: string;
    approved_at: string | null;
    approved_by: string | null;
    organization_status: string;
  }>;
  recent_activities: Array<{
    id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    timestamp: string;
    ip_address: string;
    user_agent: string;
    details: Record<string, any> | null;
  }>;
}

interface UserDetailResponse {
  success: true;
  user: UserDetailInfo;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const userId = params.id;

    // 현재 사용자 권한 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 });
    }

    // MASTER_ADMIN 권한 확인
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'MASTER_ADMIN')
      .maybeSingle();

    if (roleError) {
      console.error('권한 조회 오류:', roleError);
      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '권한 확인 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    if (!userRole) {
      await auditLogger.logPermissionDenied(
        user.id,
        'USER_DETAIL_ACCESS',
        'user',
        userId
      );

      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '이 사용자의 정보를 볼 권한이 없습니다.'
      }, { status: 403 });
    }

    // 사용자 ID 유효성 검증
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '유효하지 않은 사용자 ID입니다.'
      }, { status: 400 });
    }

    // IP 주소 추출 (감사 로그용)
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 사용자 기본 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        profile_image,
        created_at,
        updated_at,
        last_login,
        status,
        email_verified,
        phone_verified,
        two_factor_enabled,
        timezone,
        locale,
        metadata
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('사용자 정보 조회 오류:', userError);
      
      if (userError.code === 'PGRST116') {
        return NextResponse.json<ErrorResponse>({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        }, { status: 404 });
      }

      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '사용자 정보 조회 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    // 사용자 조직 멤버십 정보 조회
    const { data: organizationData, error: orgError } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        status,
        joined_at,
        approved_at,
        approved_by,
        organizations(
          id,
          name,
          status
        )
      `)
      .eq('user_id', userId);

    if (orgError) {
      console.error('조직 멤버십 조회 오류:', orgError);
      // 조직 정보 조회 실패는 전체 요청을 실패시키지 않음
    }

    // 최근 활동 내역 조회 (최근 50개)
    const { data: activityData, error: activityError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        created_at,
        ip_address,
        user_agent,
        details
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activityError) {
      console.error('활동 내역 조회 오류:', activityError);
      // 활동 내역 조회 실패는 전체 요청을 실패시키지 않음
    }

    // 데이터 변환
    const userDetail: UserDetailInfo = {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      phone: userData.phone,
      profile_image: userData.profile_image,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
      last_login: userData.last_login,
      status: userData.status,
      email_verified: userData.email_verified,
      phone_verified: userData.phone_verified || false,
      two_factor_enabled: userData.two_factor_enabled || false,
      timezone: userData.timezone,
      locale: userData.locale,
      metadata: userData.metadata,
      organizations: (organizationData || []).map(org => ({
        id: org.organizations?.id || org.organization_id,
        name: org.organizations?.name || 'Unknown Organization',
        role: org.role,
        status: org.status,
        joined_at: org.joined_at,
        approved_at: org.approved_at,
        approved_by: org.approved_by,
        organization_status: org.organizations?.status || 'UNKNOWN'
      })),
      recent_activities: (activityData || []).map(activity => ({
        id: activity.id,
        action: activity.action,
        resource_type: activity.resource_type,
        resource_id: activity.resource_id,
        timestamp: activity.created_at,
        ip_address: activity.ip_address,
        user_agent: activity.user_agent,
        details: activity.details
      }))
    };

    // 감사 로그 기록
    await auditLogger.log({
      user_id: user.id,
      action: AuditAction.USER_DETAIL_ACCESS,
      result: AuditResult.SUCCESS,
      resource_type: 'user',
      resource_id: userId,
      details: {
        target_user_email: userData.email,
        target_user_status: userData.status,
        organization_count: userDetail.organizations.length,
        activity_count: userDetail.recent_activities.length
      },
      ip_address: ipAddress,
      user_agent: request.headers.get('user-agent') || 'unknown'
    });

    const response: UserDetailResponse = {
      success: true,
      user: userDetail
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('사용자 상세 정보 조회 API 오류:', error);
    return NextResponse.json<ErrorResponse>({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// OPTIONS 메서드 (CORS 지원)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}