/**
 * 조직 감사 로그 조회 API 엔드포인트
 * GET /api/master-admin/organizations/:id/audit-logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { OrganizationAuditLogResponse, OrganizationAuditLogEntry } from '@/types/organization.types';
import { AuditAction } from '@/src/lib/audit-logger';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const organizationId = params.id;
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터 파싱
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const action = searchParams.get('action');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

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

    // 조직 존재 확인
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json({
        success: false,
        error: 'Organization not found'
      }, { status: 404 });
    }

    // 감사 로그 조회 쿼리 구성
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        organization_id,
        action,
        result,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent,
        created_at,
        users (
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .or(`action.eq.${AuditAction.ORGANIZATION_STATUS_CHANGE},action.eq.${AuditAction.ORGANIZATION_BULK_STATUS_CHANGE},action.eq.${AuditAction.ORGANIZATION_STATUS_UNDO}`)
      .order('created_at', { ascending: false });

    // 추가 필터 적용
    if (action) {
      query = query.eq('action', action);
    }

    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      query = query.lte('created_at', new Date(dateTo).toISOString());
    }

    // 페이지네이션 적용
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: auditLogs, error: logsError, count } = await query;

    if (logsError) {
      console.error('감사 로그 조회 오류:', logsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch audit logs'
      }, { status: 500 });
    }

    // 감사 로그 데이터 변환
    const transformedLogs: OrganizationAuditLogEntry[] = (auditLogs || []).map(log => {
      const details = log.details || {};
      const now = new Date();
      const undoExpiresAt = details.undo_expires_at ? new Date(details.undo_expires_at) : null;
      const canUndo = details.can_undo === true && undoExpiresAt && undoExpiresAt > now;

      return {
        id: log.id,
        organizationId: log.organization_id,
        action: log.action,
        previousStatus: details.previous_status,
        newStatus: details.new_status,
        changedBy: log.user_id,
        changedByName: log.users?.name || log.users?.email || 'Unknown',
        reason: details.reason,
        timestamp: new Date(log.created_at),
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        canUndo,
        undoExpiresAt
      };
    });

    const response: OrganizationAuditLogResponse = {
      auditLogs: transformedLogs,
      total: count || 0,
      page,
      pageSize
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('감사 로그 조회 오류:', error);
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}