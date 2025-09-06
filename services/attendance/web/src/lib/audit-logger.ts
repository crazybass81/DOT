import { createClient } from '@/lib/supabase/server';

export enum AuditAction {
  // 사용자 관련
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_SIGNUP = 'USER_SIGNUP',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_LIST_ACCESS = 'USER_LIST_ACCESS',
  USER_DETAIL_ACCESS = 'USER_DETAIL_ACCESS',
  USER_ACTIVITY_STATS_ACCESS = 'USER_ACTIVITY_STATS_ACCESS',
  
  // 조직 관련
  ORGANIZATION_CREATE = 'ORGANIZATION_CREATE',
  ORGANIZATION_UPDATE = 'ORGANIZATION_UPDATE',
  ORGANIZATION_DELETE = 'ORGANIZATION_DELETE',
  ORGANIZATION_VIEW = 'ORGANIZATION_VIEW',
  ORGANIZATION_STATUS_CHANGE = 'ORGANIZATION_STATUS_CHANGE',
  ORGANIZATION_BULK_STATUS_CHANGE = 'ORGANIZATION_BULK_STATUS_CHANGE',
  ORGANIZATION_STATUS_UNDO = 'ORGANIZATION_STATUS_UNDO',
  
  // 역할 관련
  ROLE_ASSIGN = 'ROLE_ASSIGN',
  ROLE_UPDATE = 'ROLE_UPDATE',
  ROLE_REVOKE = 'ROLE_REVOKE',
  
  // 출근 관련
  ATTENDANCE_CHECK_IN = 'ATTENDANCE_CHECK_IN',
  ATTENDANCE_CHECK_OUT = 'ATTENDANCE_CHECK_OUT',
  ATTENDANCE_UPDATE = 'ATTENDANCE_UPDATE',
  ATTENDANCE_DELETE = 'ATTENDANCE_DELETE',
  
  // 시스템 관리
  SYSTEM_CONFIG_UPDATE = 'SYSTEM_CONFIG_UPDATE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  
  // WebSocket 관련
  WEBSOCKET_CONNECT = 'WEBSOCKET_CONNECT',
  WEBSOCKET_DISCONNECT = 'WEBSOCKET_DISCONNECT',
  WEBSOCKET_AUTH = 'WEBSOCKET_AUTH',
}

export enum AuditResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
}

export interface AuditLogData {
  user_id: string;
  organization_id?: string;
  action: AuditAction;
  result: AuditResult;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

/**
 * 감사 로그를 기록하는 클래스
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private supabase: ReturnType<typeof createClient>;

  private constructor() {
    this.supabase = createClient();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * 감사 로그 기록
   */
  async log(auditData: AuditLogData): Promise<{ success: boolean; error?: string }> {
    try {
      const logEntry = {
        ...auditData,
        created_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('audit_logs')
        .insert([logEntry]);

      if (error) {
        console.error('감사 로그 저장 실패:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('감사 로그 처리 중 오류:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 로그인 성공 기록
   */
  async logLoginSuccess(userId: string, ipAddress?: string, userAgent?: string) {
    return this.log({
      user_id: userId,
      action: AuditAction.USER_LOGIN,
      result: AuditResult.SUCCESS,
      ip_address: ipAddress,
      user_agent: userAgent,
      details: { login_time: new Date().toISOString() }
    });
  }

  /**
   * 로그인 실패 기록
   */
  async logLoginFailure(email: string, reason: string, ipAddress?: string, userAgent?: string) {
    return this.log({
      user_id: 'anonymous',
      action: AuditAction.USER_LOGIN,
      result: AuditResult.FAILURE,
      ip_address: ipAddress,
      user_agent: userAgent,
      details: { 
        attempted_email: email,
        failure_reason: reason,
        attempt_time: new Date().toISOString()
      }
    });
  }

  /**
   * 권한 거부 기록
   */
  async logPermissionDenied(
    userId: string, 
    action: string, 
    resourceType?: string, 
    resourceId?: string,
    organizationId?: string
  ) {
    return this.log({
      user_id: userId,
      organization_id: organizationId,
      action: AuditAction.PERMISSION_DENIED,
      result: AuditResult.FAILURE,
      resource_type: resourceType,
      resource_id: resourceId,
      details: { 
        attempted_action: action,
        denied_at: new Date().toISOString()
      }
    });
  }

  /**
   * 조직 생성 기록
   */
  async logOrganizationCreate(
    userId: string,
    organizationId: string,
    organizationName: string,
    details?: Record<string, any>
  ) {
    return this.log({
      user_id: userId,
      organization_id: organizationId,
      action: AuditAction.ORGANIZATION_CREATE,
      result: AuditResult.SUCCESS,
      resource_type: 'organization',
      resource_id: organizationId,
      details: {
        organization_name: organizationName,
        ...details
      }
    });
  }

  /**
   * 역할 할당 기록
   */
  async logRoleAssign(
    userId: string,
    targetUserId: string,
    organizationId: string,
    role: string,
    details?: Record<string, any>
  ) {
    return this.log({
      user_id: userId,
      organization_id: organizationId,
      action: AuditAction.ROLE_ASSIGN,
      result: AuditResult.SUCCESS,
      resource_type: 'user_role',
      resource_id: targetUserId,
      details: {
        assigned_role: role,
        target_user_id: targetUserId,
        ...details
      }
    });
  }

  /**
   * 출근 체크인 기록
   */
  async logAttendanceCheckIn(
    userId: string,
    organizationId: string,
    attendanceId: string,
    location?: { lat: number; lng: number; address?: string }
  ) {
    return this.log({
      user_id: userId,
      organization_id: organizationId,
      action: AuditAction.ATTENDANCE_CHECK_IN,
      result: AuditResult.SUCCESS,
      resource_type: 'attendance',
      resource_id: attendanceId,
      details: {
        check_in_time: new Date().toISOString(),
        location
      }
    });
  }

  /**
   * 출근 체크아웃 기록
   */
  async logAttendanceCheckOut(
    userId: string,
    organizationId: string,
    attendanceId: string,
    totalHours?: number,
    overtimeHours?: number
  ) {
    return this.log({
      user_id: userId,
      organization_id: organizationId,
      action: AuditAction.ATTENDANCE_CHECK_OUT,
      result: AuditResult.SUCCESS,
      resource_type: 'attendance',
      resource_id: attendanceId,
      details: {
        check_out_time: new Date().toISOString(),
        total_hours: totalHours,
        overtime_hours: overtimeHours
      }
    });
  }

  /**
   * 데이터 내보내기 기록
   */
  async logDataExport(
    userId: string,
    organizationId: string,
    dataType: string,
    recordCount: number,
    format: string
  ) {
    return this.log({
      user_id: userId,
      organization_id: organizationId,
      action: AuditAction.DATA_EXPORT,
      result: AuditResult.SUCCESS,
      resource_type: dataType,
      details: {
        export_time: new Date().toISOString(),
        record_count: recordCount,
        format,
        data_type: dataType
      }
    });
  }

  /**
   * 감사 로그 조회
   */
  async getLogs(filters: {
    user_id?: string;
    organization_id?: string;
    action?: AuditAction;
    result?: AuditResult;
    resource_type?: string;
    date_from?: Date;
    date_to?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = this.supabase
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
          session_id,
          created_at,
          users (
            id,
            name,
            email
          ),
          organizations (
            id,
            name
          )
        `);

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.organization_id) {
        query = query.eq('organization_id', filters.organization_id);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.result) {
        query = query.eq('result', filters.result);
      }

      if (filters.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from.toISOString());
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to.toISOString());
      }

      query = query
        .order('created_at', { ascending: false })
        .range(
          filters.offset || 0, 
          (filters.offset || 0) + (filters.limit || 50) - 1
        );

      const { data, error, count } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data,
        totalCount: count
      };
    } catch (error) {
      console.error('감사 로그 조회 중 오류:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 감사 로그 통계 조회
   */
  async getLogStats(organizationId?: string, dateFrom?: Date, dateTo?: Date) {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('action, result');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      // 액션별, 결과별 통계 계산
      const actionStats: Record<string, number> = {};
      const resultStats: Record<string, number> = {};

      data?.forEach(log => {
        actionStats[log.action] = (actionStats[log.action] || 0) + 1;
        resultStats[log.result] = (resultStats[log.result] || 0) + 1;
      });

      return {
        success: true,
        data: {
          total: data?.length || 0,
          actionStats,
          resultStats
        }
      };
    } catch (error) {
      console.error('감사 로그 통계 조회 중 오류:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const auditLogger = AuditLogger.getInstance();