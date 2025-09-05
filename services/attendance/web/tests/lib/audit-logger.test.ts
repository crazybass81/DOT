/**
 * @jest-environment jsdom
 */

// Supabase 클라이언트 모킹을 먼저 정의
const mockSupabaseClient = {
  from: jest.fn(() => ({
    insert: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    mockResolvedValue: jest.fn()
  }))
};

jest.mock('../../src/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

import { AuditLogger, AuditAction, AuditResult } from '../../src/lib/audit-logger';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = AuditLogger.getInstance();
    jest.clearAllMocks();
  });

  describe('기본 로그 기능', () => {
    test('감사 로그 기록 성공', async () => {
      const logData = {
        user_id: 'user-1',
        organization_id: 'org-1',
        action: AuditAction.USER_LOGIN,
        result: AuditResult.SUCCESS,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...'
      };

      const result = await auditLogger.log(logData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          ...logData,
          created_at: expect.any(String)
        })
      ]);
    });

    test('데이터베이스 오류 시 실패 반환', async () => {
      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        error: { message: 'Database error' }
      });

      const logData = {
        user_id: 'user-1',
        action: AuditAction.USER_LOGIN,
        result: AuditResult.SUCCESS
      };

      const result = await auditLogger.log(logData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('특정 액션 로깅', () => {
    test('로그인 성공 로깅', async () => {
      await auditLogger.logLoginSuccess('user-1', '192.168.1.1', 'Mozilla/5.0');

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'user-1',
          action: AuditAction.USER_LOGIN,
          result: AuditResult.SUCCESS,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          details: expect.objectContaining({
            login_time: expect.any(String)
          })
        })
      ]);
    });

    test('로그인 실패 로깅', async () => {
      await auditLogger.logLoginFailure('test@example.com', 'Invalid password', '192.168.1.1');

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'anonymous',
          action: AuditAction.USER_LOGIN,
          result: AuditResult.FAILURE,
          ip_address: '192.168.1.1',
          details: expect.objectContaining({
            attempted_email: 'test@example.com',
            failure_reason: 'Invalid password'
          })
        })
      ]);
    });

    test('권한 거부 로깅', async () => {
      await auditLogger.logPermissionDenied(
        'user-1',
        'DELETE /api/organizations',
        'organization',
        'org-1',
        'org-1'
      );

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'user-1',
          organization_id: 'org-1',
          action: AuditAction.PERMISSION_DENIED,
          result: AuditResult.FAILURE,
          resource_type: 'organization',
          resource_id: 'org-1',
          details: expect.objectContaining({
            attempted_action: 'DELETE /api/organizations'
          })
        })
      ]);
    });

    test('조직 생성 로깅', async () => {
      await auditLogger.logOrganizationCreate(
        'user-1',
        'org-new',
        '새 조직',
        { type: 'FRANCHISE' }
      );

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'user-1',
          organization_id: 'org-new',
          action: AuditAction.ORGANIZATION_CREATE,
          result: AuditResult.SUCCESS,
          resource_type: 'organization',
          resource_id: 'org-new',
          details: expect.objectContaining({
            organization_name: '새 조직',
            type: 'FRANCHISE'
          })
        })
      ]);
    });

    test('역할 할당 로깅', async () => {
      await auditLogger.logRoleAssign(
        'admin-1',
        'user-2',
        'org-1',
        'MANAGER',
        { start_date: '2024-01-01' }
      );

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'admin-1',
          organization_id: 'org-1',
          action: AuditAction.ROLE_ASSIGN,
          result: AuditResult.SUCCESS,
          resource_type: 'user_role',
          resource_id: 'user-2',
          details: expect.objectContaining({
            assigned_role: 'MANAGER',
            target_user_id: 'user-2',
            start_date: '2024-01-01'
          })
        })
      ]);
    });

    test('출근 체크인 로깅', async () => {
      const location = {
        lat: 37.5665,
        lng: 126.9780,
        address: '서울시 중구'
      };

      await auditLogger.logAttendanceCheckIn('user-1', 'org-1', 'att-1', location);

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'user-1',
          organization_id: 'org-1',
          action: AuditAction.ATTENDANCE_CHECK_IN,
          result: AuditResult.SUCCESS,
          resource_type: 'attendance',
          resource_id: 'att-1',
          details: expect.objectContaining({
            check_in_time: expect.any(String),
            location
          })
        })
      ]);
    });

    test('출근 체크아웃 로깅', async () => {
      await auditLogger.logAttendanceCheckOut('user-1', 'org-1', 'att-1', 8.5, 0.5);

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'user-1',
          organization_id: 'org-1',
          action: AuditAction.ATTENDANCE_CHECK_OUT,
          result: AuditResult.SUCCESS,
          resource_type: 'attendance',
          resource_id: 'att-1',
          details: expect.objectContaining({
            check_out_time: expect.any(String),
            total_hours: 8.5,
            overtime_hours: 0.5
          })
        })
      ]);
    });

    test('데이터 내보내기 로깅', async () => {
      await auditLogger.logDataExport('user-1', 'org-1', 'attendance', 100, 'CSV');

      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'user-1',
          organization_id: 'org-1',
          action: AuditAction.DATA_EXPORT,
          result: AuditResult.SUCCESS,
          resource_type: 'attendance',
          details: expect.objectContaining({
            export_time: expect.any(String),
            record_count: 100,
            format: 'CSV',
            data_type: 'attendance'
          })
        })
      ]);
    });
  });

  describe('로그 조회 기능', () => {
    beforeEach(() => {
      // 체이닝 메서드들 모킹
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'log-1',
              user_id: 'user-1',
              action: AuditAction.USER_LOGIN,
              result: AuditResult.SUCCESS,
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null,
          count: 1
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);
    });

    test('필터 조건으로 로그 조회', async () => {
      const filters = {
        user_id: 'user-1',
        organization_id: 'org-1',
        action: AuditAction.USER_LOGIN,
        result: AuditResult.SUCCESS,
        date_from: new Date('2024-01-01'),
        date_to: new Date('2024-01-31'),
        limit: 20,
        offset: 10
      };

      const result = await auditLogger.getLogs(filters);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
    });

    test('로그 통계 조회', async () => {
      // 통계 조회용 모킹
      const mockStatsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [
            { action: AuditAction.USER_LOGIN, result: AuditResult.SUCCESS },
            { action: AuditAction.USER_LOGIN, result: AuditResult.SUCCESS },
            { action: AuditAction.USER_LOGOUT, result: AuditResult.SUCCESS },
          ],
          error: null
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockStatsQuery);

      const result = await auditLogger.getLogStats('org-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.total).toBe(3);
      expect(result.data?.actionStats).toHaveProperty(AuditAction.USER_LOGIN);
      expect(result.data?.resultStats).toHaveProperty(AuditResult.SUCCESS);
    });
  });

  describe('싱글톤 패턴', () => {
    test('동일한 인스턴스 반환', () => {
      const instance1 = AuditLogger.getInstance();
      const instance2 = AuditLogger.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});