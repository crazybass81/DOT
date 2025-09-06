import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    employeeId?: string;
    organizationId?: string;
    role?: string;
  };
}

/**
 * 인증 미들웨어 - API 엔드포인트 보안 강화
 * JWT 토큰 검증 및 사용자 권한 확인
 */
export async function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options: {
    requireEmployeeId?: boolean;
    requireOrganizationId?: boolean;
    allowedRoles?: string[];
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Supabase 클라이언트 생성
      const supabase = createRouteHandlerClient({ cookies });
      
      // 세션 확인
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        return NextResponse.json(
          { 
            error: '인증이 필요합니다',
            code: 'AUTHENTICATION_REQUIRED' 
          }, 
          { status: 401 }
        );
      }

      // 사용자 프로필 정보 가져오기
      const { data: profile, error: profileError } = await supabase
        .from('employees')
        .select('id, employee_id, organization_id, role, is_active')
        .eq('user_id', session.user.id)
        .single();

      if (profileError || !profile || !profile.is_active) {
        return NextResponse.json(
          { 
            error: '유효하지 않은 사용자입니다',
            code: 'INVALID_USER' 
          }, 
          { status: 403 }
        );
      }

      // 필수 필드 검증
      if (options.requireEmployeeId && !profile.employee_id) {
        return NextResponse.json(
          { 
            error: '직원 정보가 필요합니다',
            code: 'EMPLOYEE_ID_REQUIRED' 
          }, 
          { status: 400 }
        );
      }

      if (options.requireOrganizationId && !profile.organization_id) {
        return NextResponse.json(
          { 
            error: '조직 정보가 필요합니다',
            code: 'ORGANIZATION_ID_REQUIRED' 
          }, 
          { status: 400 }
        );
      }

      // 역할 권한 검증
      if (options.allowedRoles && !options.allowedRoles.includes(profile.role)) {
        return NextResponse.json(
          { 
            error: '권한이 부족합니다',
            code: 'INSUFFICIENT_PERMISSIONS' 
          }, 
          { status: 403 }
        );
      }

      // 인증된 사용자 정보를 request에 추가
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = {
        id: session.user.id,
        email: session.user.email!,
        employeeId: profile.employee_id,
        organizationId: profile.organization_id,
        role: profile.role,
      };

      // 핸들러 실행
      return await handler(authenticatedRequest);

    } catch (error) {
      console.error('인증 미들웨어 에러:', error);
      return NextResponse.json(
        { 
          error: '인증 처리 중 오류가 발생했습니다',
          code: 'AUTH_MIDDLEWARE_ERROR' 
        }, 
        { status: 500 }
      );
    }
  };
}

/**
 * 입력 데이터 검증 유틸리티
 */
export function validateRequestData<T>(
  data: any,
  requiredFields: string[]
): { isValid: boolean; errors: string[]; data: T } {
  const errors: string[] = [];

  // 필수 필드 검증
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`${field}는(은) 필수 항목입니다`);
    }
  }

  // 이메일 형식 검증
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('올바른 이메일 형식이 아닙니다');
  }

  // 위도/경도 검증
  if (data.location) {
    if (typeof data.location.latitude !== 'number' || 
        data.location.latitude < -90 || data.location.latitude > 90) {
      errors.push('유효하지 않은 위도입니다');
    }
    if (typeof data.location.longitude !== 'number' || 
        data.location.longitude < -180 || data.location.longitude > 180) {
      errors.push('유효하지 않은 경도입니다');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: data as T
  };
}

/**
 * 조직 접근 권한 검증
 */
export function validateOrganizationAccess(
  userOrganizationId: string,
  requestedOrganizationId: string
): boolean {
  return userOrganizationId === requestedOrganizationId;
}

/**
 * 직원 접근 권한 검증 (본인 또는 관리자)
 */
export function validateEmployeeAccess(
  userEmployeeId: string,
  requestedEmployeeId: string,
  userRole: string
): boolean {
  // 본인의 데이터이거나 관리자 권한이 있는 경우
  return userEmployeeId === requestedEmployeeId || 
         ['ADMIN', 'MANAGER', 'HR'].includes(userRole);
}