import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAuthService } from '../../services/supabaseAuthService';
import { organizationService } from '../../services/organizationService';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    full_name: string;
    roles?: any[];
    organizations?: any[];
    hasRole?: (role: string) => boolean;
    hasPermission?: (permission: string) => boolean;
  };
}

/**
 * 인증 미들웨어 - API 엔드포인트 보안 강화
 * JWT 토큰 검증 및 사용자 권한 확인
 */
export async function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options: {
    requireOrganization?: boolean;
    allowedRoles?: string[];
    requiredPermissions?: string[];
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 통합 인증 시스템을 통한 사용자 확인
      const user = await supabaseAuthService.getCurrentUser();
      
      if (!user) {
        return NextResponse.json(
          { 
            error: '인증이 필요합니다',
            code: 'AUTHENTICATION_REQUIRED' 
          }, 
          { status: 401 }
        );
      }

      // 사용자 역할과 조직 정보 가져오기
      const userRoles = await organizationService.getUserRoles(user.id);
      const userOrganizations = await organizationService.getUserOrganizations(user.id);

      // 조직 필요 여부 검증
      if (options.requireOrganization && (!userOrganizations || userOrganizations.length === 0)) {
        return NextResponse.json(
          { 
            error: '조직 정보가 필요합니다',
            code: 'ORGANIZATION_REQUIRED' 
          }, 
          { status: 400 }
        );
      }

      // 역할 권한 검증
      if (options.allowedRoles) {
        const hasAllowedRole = userRoles.some(role => 
          options.allowedRoles!.includes(role.role)
        );
        
        if (!hasAllowedRole) {
          return NextResponse.json(
            { 
              error: '권한이 부족합니다',
              code: 'INSUFFICIENT_PERMISSIONS' 
            }, 
            { status: 403 }
          );
        }
      }

      // 권한 검증
      if (options.requiredPermissions) {
        const hasRequiredPermissions = options.requiredPermissions.every(permission => {
          // Super admin has all permissions
          if (userRoles.some(r => r.role === 'SUPER_ADMIN')) return true;
          
          // Business admin permissions
          if (userRoles.some(r => r.role === 'BUSINESS_ADMIN')) {
            const businessPermissions = [
              'manage_employees',
              'view_reports', 
              'approve_registrations',
              'manage_settings',
              'view_audit_logs',
              'manage_organizations'
            ];
            return businessPermissions.includes(permission);
          }
          
          // Employee permissions
          if (userRoles.some(r => r.role === 'EMPLOYEE')) {
            const employeePermissions = [
              'check_in',
              'check_out',
              'view_own_records',
              'view_schedule'
            ];
            return employeePermissions.includes(permission);
          }
          
          return false;
        });
        
        if (!hasRequiredPermissions) {
          return NextResponse.json(
            { 
              error: '필요한 권한이 없습니다',
              code: 'INSUFFICIENT_PERMISSIONS',
              required_permissions: options.requiredPermissions
            }, 
            { status: 403 }
          );
        }
      }

      // 인증된 사용자 정보를 request에 추가
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        roles: userRoles,
        organizations: userOrganizations,
        hasRole: (role: string) => userRoles.some(r => r.role === role),
        hasPermission: (permission: string) => {
          // TODO: 권한 체크 로직 구현
          return userRoles.some(r => ['admin', 'master'].includes(r.role));
        }
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
  userOrganizations: any[],
  requestedOrganizationId: string
): boolean {
  return userOrganizations.some(org => org.id === requestedOrganizationId);
}

/**
 * 신원 접근 권한 검증 (본인 또는 관리자)
 */
export function validateIdentityAccess(
  userId: string,
  requestedUserId: string,
  userRoles: any[]
): boolean {
  // 본인의 데이터이거나 관리자 권한이 있는 경우
  return userId === requestedUserId || 
         userRoles.some(role => ['admin', 'manager', 'master'].includes(role.role));
}

/**
 * 역할 기반 접근 권한 검증
 */
export function validateRoleAccess(
  userRoles: any[],
  requiredRoles: string[]
): boolean {
  return userRoles.some(role => requiredRoles.includes(role.role));
}