/**
 * 조직 개별 상태 변경 API 엔드포인트
 * PATCH /api/master-admin/organizations/:id/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { auditLogger, AuditAction, AuditResult } from '@/lib/audit-logger';
import { notificationManager, NotificationType } from '@/lib/notification-manager';
import { OrganizationStatus, OrganizationStatusChangeRequest, OrganizationStatusChangeResponse } from '@/types/organization.types';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const organizationId = params.id;
    
    // 요청 본문 파싱
    const body: Omit<OrganizationStatusChangeRequest, 'organizationId'> = await request.json();
    const { newStatus, reason, changedBy } = body;

    // 입력 유효성 검증
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
        'ORGANIZATION_STATUS_CHANGE',
        'organization',
        organizationId
      );

      return NextResponse.json({
        success: false,
        error: 'Only MASTER_ADMIN can set organization status to SUSPENDED'
      }, { status: 403 });
    }

    // 현재 조직 정보 조회
    const { data: currentOrg, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !currentOrg) {
      return NextResponse.json({
        success: false,
        error: 'Organization not found'
      }, { status: 404 });
    }

    // 상태가 같으면 변경하지 않음
    if (currentOrg.status === newStatus) {
      return NextResponse.json({
        success: true,
        organizationId,
        previousStatus: currentOrg.status,
        newStatus,
        auditLogId: '',
        message: 'No status change needed'
      });
    }

    // IP 주소 및 User-Agent 추출
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 조직 상태 업데이트
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('조직 상태 업데이트 오류:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update organization status'
      }, { status: 500 });
    }

    // 감사 로그 기록
    const auditResult = await auditLogger.log({
      user_id: user.id,
      organization_id: organizationId,
      action: AuditAction.ORGANIZATION_STATUS_CHANGE,
      result: AuditResult.SUCCESS,
      resource_type: 'organization',
      resource_id: organizationId,
      details: {
        previous_status: currentOrg.status,
        new_status: newStatus,
        reason: reason || null,
        can_undo: true,
        undo_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24시간 후 만료
      },
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // INACTIVE → ACTIVE 전환 시 모든 직원 재활성화
    if (currentOrg.status === OrganizationStatus.INACTIVE && newStatus === OrganizationStatus.ACTIVE) {
      const { error: employeeUpdateError } = await supabase
        .from('employees')
        .update({
          status: 'ACTIVE',
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)
        .eq('status', 'INACTIVE');

      if (employeeUpdateError) {
        console.error('직원 재활성화 오류:', employeeUpdateError);
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
      .eq('organization_id', organizationId)
      .in('role', ['ADMIN', 'MANAGER']);

    // 알림 발송
    let notificationId: string | undefined;
    if (orgAdmins && orgAdmins.length > 0) {
      const notificationType = newStatus === OrganizationStatus.SUSPENDED 
        ? NotificationType.ORGANIZATION_SUSPENDED
        : newStatus === OrganizationStatus.ACTIVE 
        ? NotificationType.ORGANIZATION_REACTIVATED
        : NotificationType.ORGANIZATION_STATUS_CHANGED;

      const notificationResult = await notificationManager.sendOrganizationStatusChange({
        organizationId,
        organizationName: currentOrg.name,
        previousStatus: currentOrg.status,
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

    const response: OrganizationStatusChangeResponse = {
      success: true,
      organizationId,
      previousStatus: currentOrg.status,
      newStatus,
      auditLogId: auditResult.success ? 'generated' : '',
      notificationId
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('조직 상태 변경 오류:', error);
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
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}