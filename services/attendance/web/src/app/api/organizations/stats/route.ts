/**
 * 조직 통계 API
 * 마스터 어드민용 조직 통계 정보 제공
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withRBAC } from '@/middleware/rbac-middleware';
import { RoleType } from '@/types/multi-role';
import { OrganizationType, OrganizationStatus } from '@/types/organization.types';

/**
 * 조직 통계 조회 API
 * - MASTER_ADMIN 권한 필요
 */
export async function GET(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();

      try {
        // 마스터 어드민 권한 검증
        const isMasterAdmin = user.isMasterAdmin || user.is_master_admin;
        if (!isMasterAdmin) {
          return NextResponse.json(
            { error: 'Master admin access required' },
            { status: 403 }
          );
        }

        // 병렬로 여러 통계 쿼리 실행
        const [
          organizationsResult,
          employeeCountResult,
          recentOrganizationsResult
        ] = await Promise.all([
          // 전체 조직 수 및 상태별 분포
          supabase
            .from('organizations')
            .select('id, type, status, created_at'),

          // 전체 활성 직원 수
          supabase
            .from('user_roles')
            .select('id, organization_id')
            .eq('is_active', true),

          // 최근 7일간 생성된 조직
          supabase
            .from('organizations')
            .select('id')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        if (organizationsResult.error) {
          throw organizationsResult.error;
        }

        if (employeeCountResult.error) {
          throw employeeCountResult.error;
        }

        if (recentOrganizationsResult.error) {
          throw recentOrganizationsResult.error;
        }

        const organizations = organizationsResult.data || [];
        const employees = employeeCountResult.data || [];
        const recentOrganizations = recentOrganizationsResult.data || [];

        // 기본 통계 계산
        const totalOrganizations = organizations.length;
        const totalEmployees = employees.length;
        const recentCreations = recentOrganizations.length;

        // 상태별 조직 수 계산
        const statusCounts = organizations.reduce((acc, org) => {
          const status = org.status || OrganizationStatus.ACTIVE;
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<OrganizationStatus, number>);

        const activeOrganizations = statusCounts[OrganizationStatus.ACTIVE] || 0;
        const inactiveOrganizations = statusCounts[OrganizationStatus.INACTIVE] || 0;
        const suspendedOrganizations = statusCounts[OrganizationStatus.SUSPENDED] || 0;
        const pendingOrganizations = statusCounts[OrganizationStatus.PENDING] || 0;

        // 타입별 조직 수 계산
        const typeCounts = organizations.reduce((acc, org) => {
          const type = org.type || OrganizationType.PERSONAL;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<OrganizationType, number>);

        const organizationsByType = {
          [OrganizationType.CORP]: typeCounts[OrganizationType.CORP] || 0,
          [OrganizationType.PERSONAL]: typeCounts[OrganizationType.PERSONAL] || 0,
          [OrganizationType.FRANCHISE]: typeCounts[OrganizationType.FRANCHISE] || 0
        };

        // 통계 응답 구성
        const stats = {
          totalOrganizations,
          activeOrganizations,
          inactiveOrganizations: inactiveOrganizations + suspendedOrganizations, // 비활성 + 정지
          pendingOrganizations,
          totalEmployees,
          organizationsByType,
          recentCreations
        };

        return NextResponse.json(stats);

      } catch (error) {
        console.error('조직 통계 조회 중 오류 발생:', error);
        return NextResponse.json(
          { error: '조직 통계 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    },
    {
      requiredRoles: [RoleType.FRANCHISE], // 마스터 어드민은 별도 검증
      action: 'read',
      enableAuditLog: true,
      enableCache: true
    }
  )(request);
}