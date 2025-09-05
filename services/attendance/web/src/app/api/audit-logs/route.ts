import { NextRequest, NextResponse } from 'next/server';
import { withRBAC } from '@/middleware/rbac-middleware';
import { RoleType } from '@/types/multi-role';
import { auditLogger, AuditAction, AuditResult } from '@/lib/audit-logger';

/**
 * 감사 로그 조회 API
 * - FRANCHISE 권한 이상 필요 (마스터 어드민은 모든 로그 조회 가능)
 */
export async function GET(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      try {
        const { searchParams } = new URL(request.url);
        
        // 쿼리 파라미터 파싱
        const userId = searchParams.get('userId');
        const organizationId = searchParams.get('organizationId');
        const action = searchParams.get('action') as AuditAction | null;
        const result = searchParams.get('result') as AuditResult | null;
        const resourceType = searchParams.get('resourceType');
        const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
        const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // 마스터 어드민이 아닌 경우, 자신이 속한 조직의 로그만 조회 가능
        let finalOrganizationId = organizationId;
        if (!user.is_master_admin && !organizationId) {
          // 사용자가 속한 조직들 중 FRANCHISE 권한이 있는 조직 조회
          const userRoles = user.roles?.filter((role: any) => 
            role.roleType === RoleType.FRANCHISE && role.isActive
          ) || [];
          
          if (userRoles.length === 0) {
            return NextResponse.json(
              { error: '감사 로그 조회 권한이 없습니다.' },
              { status: 403 }
            );
          }
          
          // 첫 번째 FRANCHISE 조직의 로그만 조회
          finalOrganizationId = userRoles[0].organizationId;
        }

        // 감사 로그 조회
        const logResult = await auditLogger.getLogs({
          user_id: userId || undefined,
          organization_id: finalOrganizationId || undefined,
          action,
          result,
          resource_type: resourceType || undefined,
          date_from: dateFrom,
          date_to: dateTo,
          limit,
          offset
        });

        if (!logResult.success) {
          return NextResponse.json(
            { error: logResult.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          auditLogs: logResult.data,
          totalCount: logResult.totalCount,
          limit,
          offset
        });

      } catch (error) {
        console.error('감사 로그 조회 중 오류 발생:', error);
        return NextResponse.json(
          { error: '감사 로그 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    },
    {
      requiredRoles: [RoleType.FRANCHISE],
      action: 'read',
      enableAuditLog: true,
      enableCache: true
    }
  )(request);
}

/**
 * 감사 로그 통계 조회 API
 * - FRANCHISE 권한 이상 필요
 */
export async function POST(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      try {
        const body = await request.json();
        const { organizationId, dateFrom, dateTo } = body;

        // 마스터 어드민이 아닌 경우, 자신이 속한 조직의 통계만 조회 가능
        let finalOrganizationId = organizationId;
        if (!user.is_master_admin && !organizationId) {
          const userRoles = user.roles?.filter((role: any) => 
            role.roleType === RoleType.FRANCHISE && role.isActive
          ) || [];
          
          if (userRoles.length === 0) {
            return NextResponse.json(
              { error: '감사 로그 통계 조회 권한이 없습니다.' },
              { status: 403 }
            );
          }
          
          finalOrganizationId = userRoles[0].organizationId;
        }

        const statsResult = await auditLogger.getLogStats(
          finalOrganizationId,
          dateFrom ? new Date(dateFrom) : undefined,
          dateTo ? new Date(dateTo) : undefined
        );

        if (!statsResult.success) {
          return NextResponse.json(
            { error: statsResult.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          statistics: statsResult.data
        });

      } catch (error) {
        console.error('감사 로그 통계 조회 중 오류 발생:', error);
        return NextResponse.json(
          { error: '감사 로그 통계 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    },
    {
      requiredRoles: [RoleType.FRANCHISE],
      action: 'read',
      enableAuditLog: true
    }
  )(request);
}