/**
 * 마스터 어드민 사용자 목록 조회 및 검색 API 엔드포인트
 * GET /api/master-admin/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { auditLogger, AuditAction, AuditResult } from '@/src/lib/audit-logger';

interface UserSearchParams {
  search?: string;
  role?: string;
  status?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'name' | 'created_at' | 'last_login' | 'email';
  sortOrder?: 'asc' | 'desc';
  page?: string;
  limit?: string;
}

interface UserListItem {
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
  organizations: Array<{
    id: string;
    name: string;
    role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
    status: string;
    joined_at: string;
  }>;
}

interface UserListResponse {
  success: true;
  users: UserListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  searchQuery?: string;
  filters: Record<string, any>;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

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
        'USER_LIST_ACCESS',
        'user',
        'all'
      );

      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '접근 권한이 없습니다. MASTER_ADMIN 권한이 필요합니다.'
      }, { status: 403 });
    }

    // 검색 및 필터 파라미터 파싱
    const params: UserSearchParams = {
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      status: searchParams.get('status') || undefined,
      organizationId: searchParams.get('organizationId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20'
    };

    // 페이지네이션 설정
    const page = Math.max(1, parseInt(params.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20'))); // 최대 100개로 제한
    const offset = (page - 1) * limit;

    // IP 주소 추출 (감사 로그용)
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 기본 쿼리 구성
    let query = supabase
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
        user_organizations!inner(
          organization_id,
          role,
          status,
          joined_at,
          organizations(
            id,
            name
          )
        )
      `);

    // 텍스트 검색 적용
    if (params.search && params.search.trim()) {
      const searchTerm = params.search.trim();
      query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    // 상태 필터 적용
    if (params.status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(params.status)) {
      query = query.eq('status', params.status);
    }

    // 날짜 범위 필터 적용
    if (params.startDate) {
      try {
        const startDate = new Date(params.startDate);
        if (!isNaN(startDate.getTime())) {
          query = query.gte('created_at', startDate.toISOString());
        }
      } catch (error) {
        return NextResponse.json<ErrorResponse>({
          success: false,
          error: '시작 날짜 형식이 올바르지 않습니다.'
        }, { status: 400 });
      }
    }

    if (params.endDate) {
      try {
        const endDate = new Date(params.endDate);
        if (!isNaN(endDate.getTime())) {
          // 종료 날짜의 끝까지 포함하기 위해 하루 추가
          endDate.setDate(endDate.getDate() + 1);
          query = query.lt('created_at', endDate.toISOString());
        }
      } catch (error) {
        return NextResponse.json<ErrorResponse>({
          success: false,
          error: '종료 날짜 형식이 올바르지 않습니다.'
        }, { status: 400 });
      }
    }

    // 역할 필터 적용 (조인된 user_organizations 테이블에서)
    if (params.role && ['EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'].includes(params.role)) {
      query = query.eq('user_organizations.role', params.role);
    }

    // 조직 필터 적용
    if (params.organizationId) {
      query = query.eq('user_organizations.organization_id', params.organizationId);
    }

    // 정렬 적용
    const sortColumn = params.sortBy === 'name' ? 'full_name' : params.sortBy;
    query = query.order(sortColumn!, { ascending: params.sortOrder === 'asc' });

    // 전체 카운트 조회 (페이지네이션용)
    const { count: totalCount, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('사용자 카운트 조회 오류:', countError);
      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '사용자 목록 조회 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    // 페이지네이션 적용하여 데이터 조회
    const { data: users, error: queryError } = await query
      .range(offset, offset + limit - 1);

    if (queryError) {
      console.error('사용자 목록 조회 오류:', queryError);
      return NextResponse.json<ErrorResponse>({
        success: false,
        error: queryError.code === 'PGRST103' 
          ? '검색 조건에 맞는 사용자를 찾을 수 없습니다.'
          : '사용자 목록 조회 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    // 데이터 변환
    const transformedUsers: UserListItem[] = (users || []).map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      profile_image: user.profile_image,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      status: user.status,
      email_verified: user.email_verified,
      organizations: Array.isArray(user.user_organizations)
        ? user.user_organizations.map((org: any) => ({
            id: org.organizations?.id || org.organization_id,
            name: org.organizations?.name || 'Unknown Organization',
            role: org.role,
            status: org.status,
            joined_at: org.joined_at
          }))
        : []
    }));

    // 페이지네이션 정보 계산
    const totalPages = Math.ceil((totalCount || 0) / limit);
    const hasNextPage = page < totalPages;

    // 감사 로그 기록
    await auditLogger.log({
      user_id: user.id,
      action: AuditAction.USER_LIST_ACCESS,
      result: AuditResult.SUCCESS,
      resource_type: 'user',
      resource_id: 'list',
      details: {
        search_query: params.search,
        filters: {
          role: params.role,
          status: params.status,
          organizationId: params.organizationId,
          dateRange: params.startDate || params.endDate ? {
            startDate: params.startDate,
            endDate: params.endDate
          } : null
        },
        pagination: { page, limit },
        result_count: transformedUsers.length
      },
      ip_address: ipAddress,
      user_agent: request.headers.get('user-agent') || 'unknown'
    });

    const response: UserListResponse = {
      success: true,
      users: transformedUsers,
      totalCount: totalCount || 0,
      page,
      limit,
      totalPages,
      hasNextPage,
      searchQuery: params.search,
      filters: {
        role: params.role,
        status: params.status,
        organizationId: params.organizationId,
        startDate: params.startDate,
        endDate: params.endDate,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('사용자 목록 조회 API 오류:', error);
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