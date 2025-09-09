/**
 * 조직 상태 변경 실행 취소 API 엔드포인트
 * POST /api/master-admin/organizations/undo-status-change
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { auditLogger, AuditAction, AuditResult } from '@/lib/audit-logger';
import { notificationManager, NotificationType } from '@/lib/notification-manager';
import { 
  UndoStatusChangeRequest,
  UndoStatusChangeResponse
} from '@/types/organization.types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // 요청 본문 파싱
    const body: UndoStatusChangeRequest = await request.json();
    const { auditLogId, reason, undoneBy } = body;

    // 입력 유효성 검증
    if (!auditLogId || !undoneBy) {
      return NextResponse.json({
        success: false,
        error: 'auditLogId and undoneBy are required'
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

    // MASTER_ADMIN 권한 확인
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

    if (!userRole) {
      return NextResponse.json({
        success: false,
        error: 'MASTER_ADMIN permission required'
      }, { status: 403 });
    }

    // 감사 로그 조회
    const { data: auditLog, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', auditLogId)
      .single();

    if (auditError || !auditLog) {
      return NextResponse.json({
        success: false,
        error: 'Audit log not found'
      }, { status: 404 });
    }

    // 실행 취소 가능한 액션인지 확인
    if (![AuditAction.ORGANIZATION_STATUS_CHANGE, AuditAction.ORGANIZATION_BULK_STATUS_CHANGE].includes(auditLog.action)) {
      return NextResponse.json({
        success: false,
        error: 'This action cannot be undone'
      }, { status: 400 });
    }

    const details = auditLog.details || {};
    
    // 실행 취소 가능 여부 및 만료 시간 확인
    if (!details.can_undo) {
      return NextResponse.json({
        success: false,
        error: 'This change cannot be undone'
      }, { status: 400 });
    }

    const undoExpiresAt = details.undo_expires_at ? new Date(details.undo_expires_at) : null;
    if (undoExpiresAt && undoExpiresAt < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Undo period has expired'
      }, { status: 400 });
    }

    // 이미 실행 취소된 변경인지 확인
    const { data: existingUndo, error: undoCheckError } = await supabase
      .from('audit_logs')
      .select('id')
      .eq('action', AuditAction.ORGANIZATION_STATUS_UNDO)
      .contains('details', { original_audit_log_id: auditLogId })
      .maybeSingle();

    if (undoCheckError && undoCheckError.code !== 'PGRST116') {
      console.error('실행 취소 중복 확인 오류:', undoCheckError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check undo status'
      }, { status: 500 });
    }

    if (existingUndo) {
      return NextResponse.json({
        success: false,
        error: 'This change has already been undone'
      }, { status: 400 });
    }

    const organizationId = auditLog.organization_id;
    const previousStatus = details.new_status; // 현재 상태 (되돌릴 때는 new_status가 현재 상태)
    const restoredStatus = details.previous_status; // 원래 상태로 되돌림

    // 조직 현재 정보 조회
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

    // 현재 상태가 예상한 상태와 다르면 실행 취소 불가
    if (currentOrg.status !== previousStatus) {
      return NextResponse.json({
        success: false,
        error: `Organization status has changed since the original operation. Expected: ${previousStatus}, Current: ${currentOrg.status}`
      }, { status: 400 });
    }

    // IP 주소 및 User-Agent 추출
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 조직 상태를 원래 상태로 되돌리기
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        status: restoredStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('조직 상태 되돌리기 오류:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to undo organization status change'
      }, { status: 500 });
    }

    // 필요한 경우 직원 상태도 되돌리기 (ACTIVE → INACTIVE 되돌릴 때)
    if (previousStatus === 'ACTIVE' && restoredStatus === 'INACTIVE') {
      const { error: employeeUpdateError } = await supabase
        .from('employees')
        .update({
          status: 'INACTIVE',
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)
        .eq('status', 'ACTIVE');

      if (employeeUpdateError) {
        console.error('직원 상태 되돌리기 오류:', employeeUpdateError);
        // 로그만 기록하고 전체 프로세스는 계속 진행
      }
    }

    // 실행 취소 감사 로그 기록
    const undoAuditResult = await auditLogger.log({
      user_id: user.id,
      organization_id: organizationId,
      action: AuditAction.ORGANIZATION_STATUS_UNDO,
      result: AuditResult.SUCCESS,
      resource_type: 'organization',
      resource_id: organizationId,
      details: {
        original_audit_log_id: auditLogId,
        restored_from_status: previousStatus,
        restored_to_status: restoredStatus,
        undo_reason: reason || null,
        undone_at: new Date().toISOString()
      },
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // 원래 감사 로그의 can_undo를 false로 변경
    await supabase
      .from('audit_logs')
      .update({
        details: {
          ...details,
          can_undo: false,
          undone_at: new Date().toISOString(),
          undone_by: user.id
        }
      })
      .eq('id', auditLogId);

    // 조직 관리자들에게 실행 취소 알림 발송
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

    let notificationId: string | undefined;
    if (orgAdmins && orgAdmins.length > 0) {
      const notificationResult = await notificationManager.sendOrganizationStatusChange({
        organizationId,
        organizationName: currentOrg.name,
        previousStatus,
        newStatus: restoredStatus,
        reason: `상태 변경 실행 취소${reason ? `: ${reason}` : ''}`,
        changedBy: user.id,
        changedByName: user.user_metadata?.name || user.email || 'Unknown',
        targetUsers: orgAdmins.map(admin => admin.user_id)
      }, NotificationType.ORGANIZATION_STATUS_CHANGED);

      if (notificationResult.success) {
        notificationId = notificationResult.notificationId;
      }
    }

    const response: UndoStatusChangeResponse = {
      success: true,
      organizationId,
      restoredStatus,
      auditLogId: undoAuditResult.success ? 'generated' : auditLogId,
      notificationId
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('상태 변경 실행 취소 오류:', error);
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