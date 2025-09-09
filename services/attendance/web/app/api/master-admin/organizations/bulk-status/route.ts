/**
 * 조직 벌크 상태 변경 API 엔드포인트
 * POST /api/master-admin/organizations/bulk-status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auditLogger, AuditAction, AuditResult } from '@/lib/audit-logger';
import { notificationManager, NotificationType } from '@/lib/notification-manager';
import { 
  OrganizationStatus, 
  BulkOrganizationStatusChangeRequest,
  BulkOrganizationStatusChangeResponse,
  OrganizationStatusChangeResponse
} from '@/types/organization.types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // 요청 본문 파싱
    const body: BulkOrganizationStatusChangeRequest = await request.json();
    const { organizationIds, newStatus, reason, changedBy } = body;

    // 입력 유효성 검증
    if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'organizationIds array is required and cannot be empty'
      }, { status: 400 });
    }

    if (!newStatus || !changedBy) {
      return NextResponse.json({
        success: false,
        error: 'newStatus and changedBy are required'
      }, { status: 400 });
    }

    // 유효한 상태 값인지 검증
    if (!Object.values(OrganizationStatus).includes(newStatus)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid organization status'
      }, { status: 400 });
    }

    // 조직 ID 개수 제한 (너무 많은 요청 방지)
    if (organizationIds.length > 100) {
      return NextResponse.json({
        success: false,
        error: 'Cannot process more than 100 organizations at once'
      }, { status: 400 });
    }

    // 현재 사용자 권한 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // 사용자 권한 조회
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'MASTER_ADMIN')
      .maybeSingle();

    if (roleError) {
      console.error('권한 조회 오류:', roleError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check user permissions'
      }, { status: 500 });
    }

    // SUSPENDED 상태는 MASTER_ADMIN만 설정 가능
    if (newStatus === OrganizationStatus.SUSPENDED && !userRole) {
      await auditLogger.logPermissionDenied(
        user.id,
        'ORGANIZATION_BULK_STATUS_CHANGE',
        'organization',
        organizationIds.join(',')
      );

      return NextResponse.json({
        success: false,
        error: 'Only MASTER_ADMIN can set organization status to SUSPENDED'
      }, { status: 403 });
    }

    // 현재 조직들 정보 조회
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, status')
      .in('id', organizationIds);

    if (orgError) {
      console.error('조직 조회 오류:', orgError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch organizations'
      }, { status: 500 });
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No organizations found'
      }, { status: 404 });
    }

    // IP 주소 및 User-Agent 추출
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const results: OrganizationStatusChangeResponse[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    // 각 조직의 상태를 개별적으로 업데이트
    for (const org of organizations) {
      try {
        // 상태가 이미 동일하면 건너뛰기
        if (org.status === newStatus) {
          results.push({
            success: true,
            organizationId: org.id,
            previousStatus: org.status,
            newStatus,
            auditLogId: '',
            message: 'No status change needed'
          });
          successCount++;
          continue;
        }

        // 조직 상태 업데이트
        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', org.id);

        if (updateError) {
          console.error(`조직 ${org.id} 상태 업데이트 오류:`, updateError);
          errors.push(`Failed to update organization ${org.name}: ${updateError.message}`);
          results.push({
            success: false,
            organizationId: org.id,
            previousStatus: org.status,
            newStatus,
            auditLogId: '',
            error: updateError.message
          });
          failureCount++;
          continue;
        }

        // 감사 로그 기록
        const auditResult = await auditLogger.log({
          user_id: user.id,
          organization_id: org.id,
          action: AuditAction.ORGANIZATION_BULK_STATUS_CHANGE,
          result: AuditResult.SUCCESS,
          resource_type: 'organization',
          resource_id: org.id,
          details: {
            previous_status: org.status,
            new_status: newStatus,
            reason: reason || null,
            bulk_operation: true,
            total_organizations: organizationIds.length,
            can_undo: true,
            undo_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          ip_address: ipAddress,
          user_agent: userAgent
        });

        // INACTIVE → ACTIVE 전환 시 해당 조직의 모든 직원 재활성화
        if (org.status === OrganizationStatus.INACTIVE && newStatus === OrganizationStatus.ACTIVE) {
          const { error: employeeUpdateError } = await supabase
            .from('employees')
            .update({
              status: 'ACTIVE',
              updated_at: new Date().toISOString()
            })
            .eq('organization_id', org.id)
            .eq('status', 'INACTIVE');

          if (employeeUpdateError) {
            console.error(`조직 ${org.id} 직원 재활성화 오류:`, employeeUpdateError);
            // 로그만 기록하고 전체 프로세스는 계속 진행
          }
        }

        // 조직 관리자들에게 알림 발송
        const { data: orgAdmins } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            users (
              id,
              name,
              email
            )
          `)
          .eq('organization_id', org.id)
          .in('role', ['ADMIN', 'MANAGER']);

        let notificationId: string | undefined;
        if (orgAdmins && orgAdmins.length > 0) {
          const notificationType = newStatus === OrganizationStatus.SUSPENDED 
            ? NotificationType.ORGANIZATION_SUSPENDED
            : newStatus === OrganizationStatus.ACTIVE 
            ? NotificationType.ORGANIZATION_REACTIVATED
            : NotificationType.ORGANIZATION_STATUS_CHANGED;

          const notificationResult = await notificationManager.sendOrganizationStatusChange({
            organizationId: org.id,
            organizationName: org.name,
            previousStatus: org.status,
            newStatus,
            reason,
            changedBy: user.id,
            changedByName: user.user_metadata?.name || user.email || 'Unknown',
            targetUsers: orgAdmins.map(admin => admin.user_id)
          }, notificationType);

          if (notificationResult.success) {
            notificationId = notificationResult.notificationId;
          }
        }

        results.push({
          success: true,
          organizationId: org.id,
          previousStatus: org.status,
          newStatus,
          auditLogId: auditResult.success ? 'generated' : '',
          notificationId
        });
        successCount++;

      } catch (error) {
        console.error(`조직 ${org.id} 처리 중 오류:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to process organization ${org.name}: ${errorMessage}`);
        results.push({
          success: false,
          organizationId: org.id,
          previousStatus: org.status,
          newStatus,
          auditLogId: '',
          error: errorMessage
        });
        failureCount++;
      }
    }

    // 전체 벌크 작업에 대한 감사 로그 기록
    await auditLogger.log({
      user_id: user.id,
      action: AuditAction.ORGANIZATION_BULK_STATUS_CHANGE,
      result: failureCount === 0 ? AuditResult.SUCCESS : 
              successCount === 0 ? AuditResult.FAILURE : AuditResult.PARTIAL,
      resource_type: 'bulk_organization_status',
      details: {
        target_status: newStatus,
        total_organizations: organizationIds.length,
        success_count: successCount,
        failure_count: failureCount,
        reason: reason || null,
        organization_ids: organizationIds
      },
      ip_address: ipAddress,
      user_agent: userAgent
    });

    const response: BulkOrganizationStatusChangeResponse = {
      success: failureCount === 0,
      results,
      totalCount: organizationIds.length,
      successCount,
      failureCount,
      errors
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('벌크 조직 상태 변경 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// OPTIONS 메서드 (CORS 지원)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}