import { createClient } from '@/lib/supabase/server';
import { webSocketServer } from './websocket-server';
import { auditLogger, AuditAction, AuditResult } from './audit-logger';

// 알림 타입 열거형
export enum NotificationType {
  // 출근/퇴근 알림
  ATTENDANCE_CHECK_IN = 'ATTENDANCE_CHECK_IN',
  ATTENDANCE_CHECK_OUT = 'ATTENDANCE_CHECK_OUT',
  ATTENDANCE_LATE = 'ATTENDANCE_LATE',
  ATTENDANCE_ABSENT = 'ATTENDANCE_ABSENT',

  // 역할 변경 알림
  ROLE_CHANGED = 'ROLE_CHANGED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REVOKED = 'ROLE_REVOKED',

  // 조직 관련 알림
  ORGANIZATION_INVITED = 'ORGANIZATION_INVITED',
  ORGANIZATION_APPROVED = 'ORGANIZATION_APPROVED',
  ORGANIZATION_REJECTED = 'ORGANIZATION_REJECTED',
  ORGANIZATION_ANNOUNCEMENT = 'ORGANIZATION_ANNOUNCEMENT',

  // 시스템 알림
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',

  // 기타 알림
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  REPORT_READY = 'REPORT_READY'
}

// 알림 우선순위
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// 알림 데이터 기본 인터페이스
export interface NotificationData {
  userId?: string;
  userName?: string;
  organizationId?: string;
  organizationName?: string;
  [key: string]: any;
}

// 알림 메시지 인터페이스
export interface NotificationMessage {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  priority: NotificationPriority;
  createdAt: string;
  readAt?: string;
  validUntil?: string;
  targetUsers?: string[];
  targetOrganizations?: string[];
  createdBy: string;
  createdByName?: string;
}

// 출근 체크인 데이터
export interface AttendanceCheckInData extends NotificationData {
  userId: string;
  userName: string;
  organizationId: string;
  checkInTime: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

// 퇴근 체크아웃 데이터
export interface AttendanceCheckOutData extends NotificationData {
  userId: string;
  userName: string;
  organizationId: string;
  checkOutTime: string;
  workHours: number;
  overtimeHours?: number;
}

// 역할 변경 데이터
export interface RoleChangeData extends NotificationData {
  userId: string;
  userName: string;
  organizationId: string;
  oldRole?: string;
  newRole: string;
  changedBy?: string;
  changedByName?: string;
  assignedBy?: string;
  assignedByName?: string;
}

// 조직 초대 데이터
export interface OrganizationInvitationData extends NotificationData {
  userId: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  invitedBy: string;
  invitedByName: string;
  role: string;
  invitationToken: string;
}

// 조직 승인 데이터
export interface OrganizationApprovalData extends NotificationData {
  userId: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  approvedBy: string;
  approvedByName: string;
  role: string;
}

// 시스템 공지 데이터
export interface SystemAnnouncementData extends NotificationData {
  title: string;
  message: string;
  priority: NotificationPriority;
  validUntil?: string;
  createdBy: string;
}

// 조직 공지 데이터
export interface OrganizationAnnouncementData extends NotificationData {
  organizationId: string;
  organizationName: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  validUntil?: string;
  createdBy: string;
  createdByName: string;
}

// 알림 조회 옵션
export interface NotificationQuery {
  limit?: number;
  offset?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
  organizationId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * 알림 관리 클래스
 * 실시간 알림 전송 및 이력 관리
 */
export class NotificationManager {
  private static instance: NotificationManager;
  private supabase: ReturnType<typeof createClient>;

  private constructor() {
    this.supabase = createClient();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 출근 체크인 알림 전송
   */
  async sendAttendanceCheckIn(data: AttendanceCheckInData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const notification: NotificationMessage = {
        type: NotificationType.ATTENDANCE_CHECK_IN,
        title: '출근 알림',
        message: `${data.userName}님이 출근했습니다.`,
        data,
        priority: NotificationPriority.LOW,
        createdAt: new Date().toISOString(),
        createdBy: data.userId,
        createdByName: data.userName,
        targetOrganizations: [data.organizationId]
      };

      // 데이터베이스에 저장
      const saveResult = await this.saveNotification(notification);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      // WebSocket으로 실시간 전송
      webSocketServer.broadcastToOrganization(
        data.organizationId,
        'attendance_notification',
        notification
      );

      // 감사 로그 기록
      await auditLogger.log({
        user_id: data.userId,
        organization_id: data.organizationId,
        action: AuditAction.ATTENDANCE_CHECK_IN,
        result: AuditResult.SUCCESS,
        resource_type: 'notification',
        resource_id: saveResult.notificationId,
        details: {
          notification_type: NotificationType.ATTENDANCE_CHECK_IN,
          check_in_time: data.checkInTime,
          location: data.location
        }
      });

      return { success: true, notificationId: saveResult.notificationId };
    } catch (error) {
      console.error('출근 체크인 알림 전송 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 퇴근 체크아웃 알림 전송
   */
  async sendAttendanceCheckOut(data: AttendanceCheckOutData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const overtimeText = data.overtimeHours && data.overtimeHours > 0 
        ? ` (연장근무 ${data.overtimeHours}시간)` 
        : '';

      const notification: NotificationMessage = {
        type: NotificationType.ATTENDANCE_CHECK_OUT,
        title: '퇴근 알림',
        message: `${data.userName}님이 퇴근했습니다. 근무시간: ${data.workHours}시간${overtimeText}`,
        data,
        priority: NotificationPriority.LOW,
        createdAt: new Date().toISOString(),
        createdBy: data.userId,
        createdByName: data.userName,
        targetOrganizations: [data.organizationId]
      };

      // 데이터베이스에 저장
      const saveResult = await this.saveNotification(notification);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      // WebSocket으로 실시간 전송
      webSocketServer.broadcastToOrganization(
        data.organizationId,
        'attendance_notification',
        notification
      );

      return { success: true, notificationId: saveResult.notificationId };
    } catch (error) {
      console.error('퇴근 체크아웃 알림 전송 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 역할 변경 알림 전송
   */
  async sendRoleChange(data: RoleChangeData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const changeText = data.oldRole 
        ? `${data.oldRole}에서 ${data.newRole}로 변경` 
        : `${data.newRole} 역할 부여`;

      const notification: NotificationMessage = {
        type: NotificationType.ROLE_CHANGED,
        title: '역할 변경 알림',
        message: `귀하의 역할이 ${changeText}되었습니다. 변경자: ${data.changedByName}`,
        data,
        priority: NotificationPriority.MEDIUM,
        createdAt: new Date().toISOString(),
        createdBy: data.changedBy,
        createdByName: data.changedByName,
        targetUsers: [data.userId]
      };

      const saveResult = await this.saveNotification(notification);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      // 개인 알림 전송
      webSocketServer.sendToUser(data.userId, 'role_notification', notification);

      return { success: true, notificationId: saveResult.notificationId };
    } catch (error) {
      console.error('역할 변경 알림 전송 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 역할 할당 알림 전송
   */
  async sendRoleAssign(data: RoleChangeData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const notification: NotificationMessage = {
        type: NotificationType.ROLE_ASSIGNED,
        title: '새 역할 할당',
        message: `${data.organizationName || '조직'}에서 ${data.newRole} 역할이 부여되었습니다. 할당자: ${data.assignedByName || data.changedByName}`,
        data,
        priority: NotificationPriority.MEDIUM,
        createdAt: new Date().toISOString(),
        createdBy: data.assignedBy,
        createdByName: data.assignedByName,
        targetUsers: [data.userId]
      };

      const saveResult = await this.saveNotification(notification);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      webSocketServer.sendToUser(data.userId, 'role_notification', notification);

      return { success: true, notificationId: saveResult.notificationId };
    } catch (error) {
      console.error('역할 할당 알림 전송 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 조직 초대 알림 전송
   */
  async sendOrganizationInvitation(data: OrganizationInvitationData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const notification: NotificationMessage = {
        type: NotificationType.ORGANIZATION_INVITED,
        title: '조직 초대',
        message: `${data.organizationName}에서 ${data.role} 역할로 초대되었습니다. 초대자: ${data.invitedByName}`,
        data,
        priority: NotificationPriority.MEDIUM,
        createdAt: new Date().toISOString(),
        createdBy: data.invitedBy,
        createdByName: data.invitedByName,
        targetUsers: [data.userId]
      };

      const saveResult = await this.saveNotification(notification);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      webSocketServer.sendToUser(data.userId, 'organization_notification', notification);

      return { success: true, notificationId: saveResult.notificationId };
    } catch (error) {
      console.error('조직 초대 알림 전송 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 조직 승인 알림 전송
   */
  async sendOrganizationApproval(data: OrganizationApprovalData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const notification: NotificationMessage = {
        type: NotificationType.ORGANIZATION_APPROVED,
        title: '조직 가입 승인',
        message: `${data.organizationName} 가입이 승인되었습니다. ${data.role} 역할로 활동할 수 있습니다. 승인자: ${data.approvedByName}`,
        data,
        priority: NotificationPriority.MEDIUM,
        createdAt: new Date().toISOString(),
        createdBy: data.approvedBy,
        createdByName: data.approvedByName,
        targetUsers: [data.userId]
      };

      const saveResult = await this.saveNotification(notification);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      webSocketServer.sendToUser(data.userId, 'organization_notification', notification);

      return { success: true, notificationId: saveResult.notificationId };
    } catch (error) {
      console.error('조직 승인 알림 전송 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 시스템 전체 공지사항 브로드캐스트
   */
  async broadcastSystemAnnouncement(data: SystemAnnouncementData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const notification: NotificationMessage = {
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: data.title,
        message: data.message,
        data,
        priority: data.priority,
        createdAt: new Date().toISOString(),
        validUntil: data.validUntil,
        createdBy: data.createdBy
      };

      const saveResult = await this.saveNotification(notification);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      // 모든 연결된 클라이언트에게 브로드캐스트
      const socketServer = webSocketServer.getSocketIOServer();
      if (socketServer) {
        socketServer.emit('system_notification', notification);
      }

      return { success: true, notificationId: saveResult.notificationId };
    } catch (error) {
      console.error('시스템 공지사항 브로드캐스트 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 조직별 공지사항 전송
   */
  async sendOrganizationAnnouncement(data: OrganizationAnnouncementData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const notification: NotificationMessage = {
        type: NotificationType.ORGANIZATION_ANNOUNCEMENT,
        title: data.title,
        message: data.message,
        data,
        priority: data.priority,
        createdAt: new Date().toISOString(),
        validUntil: data.validUntil,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        targetOrganizations: [data.organizationId]
      };

      const saveResult = await this.saveNotification(notification);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      // 조직 멤버들에게 브로드캐스트
      webSocketServer.broadcastToOrganization(
        data.organizationId,
        'organization_notification',
        notification
      );

      return { success: true, notificationId: saveResult.notificationId };
    } catch (error) {
      console.error('조직 공지사항 전송 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 알림을 데이터베이스에 저장
   */
  private async saveNotification(notification: NotificationMessage): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert([{
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          created_at: notification.createdAt,
          valid_until: notification.validUntil,
          target_users: notification.targetUsers,
          target_organizations: notification.targetOrganizations,
          created_by: notification.createdBy,
          created_by_name: notification.createdByName
        }])
        .select('id')
        .single();

      if (error) {
        console.error('알림 저장 실패:', error);
        return { success: false, error: error.message };
      }

      return { success: true, notificationId: data.id };
    } catch (error) {
      console.error('알림 저장 중 오류:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 사용자별 알림 조회
   */
  async getUserNotifications(userId: string, query: NotificationQuery = {}): Promise<{
    success: boolean;
    notifications?: any[];
    totalCount?: number;
    error?: string;
  }> {
    try {
      const {
        limit = 20,
        offset = 0,
        type,
        unreadOnly = false,
        organizationId,
        dateFrom,
        dateTo
      } = query;

      let supabaseQuery = this.supabase
        .from('notifications')
        .select('*')
        .or(`target_users.cs.{${userId}},target_organizations.is.null`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        supabaseQuery = supabaseQuery.eq('type', type);
      }

      if (unreadOnly) {
        supabaseQuery = supabaseQuery.is('read_at', null);
      }

      if (organizationId) {
        supabaseQuery = supabaseQuery.contains('target_organizations', [organizationId]);
      }

      if (dateFrom) {
        supabaseQuery = supabaseQuery.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        supabaseQuery = supabaseQuery.lte('created_at', dateTo.toISOString());
      }

      const { data, error, count } = await supabaseQuery;

      if (error) {
        console.error('알림 조회 실패:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        notifications: data || [],
        totalCount: count || 0
      };
    } catch (error) {
      console.error('알림 조회 중 오류:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 알림을 읽음 상태로 표시
   */
  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('user_notifications')
        .upsert([{
          notification_id: notificationId,
          user_id: userId,
          read_at: new Date().toISOString()
        }], {
          onConflict: 'notification_id,user_id'
        });

      if (error) {
        console.error('알림 읽음 표시 실패:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('알림 읽음 표시 중 오류:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }

  /**
   * 여러 알림을 일괄 읽음 처리
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const readRecords = notificationIds.map(id => ({
        notification_id: id,
        user_id: userId,
        read_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('user_notifications')
        .upsert(readRecords, {
          onConflict: 'notification_id,user_id'
        });

      if (error) {
        console.error('일괄 알림 읽음 표시 실패:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('일괄 알림 읽음 표시 중 오류:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const notificationManager = NotificationManager.getInstance();