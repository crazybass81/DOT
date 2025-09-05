/**
 * @jest-environment jsdom
 */

jest.mock('../../src/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis()
    }))
  }))
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
    });

    test('로그인 성공 로깅', async () => {
      const result = await auditLogger.logLoginSuccess('user-1', '192.168.1.1', 'Mozilla/5.0');
      expect(result.success).toBe(true);
    });

    test('로그인 실패 로깅', async () => {
      const result = await auditLogger.logLoginFailure('test@example.com', 'Invalid password', '192.168.1.1');
      expect(result.success).toBe(true);
    });

    test('권한 거부 로깅', async () => {
      const result = await auditLogger.logPermissionDenied(
        'user-1',
        'DELETE /api/organizations',
        'organization',
        'org-1',
        'org-1'
      );
      expect(result.success).toBe(true);
    });

    test('조직 생성 로깅', async () => {
      const result = await auditLogger.logOrganizationCreate(
        'user-1',
        'org-new',
        '새 조직',
        { type: 'FRANCHISE' }
      );
      expect(result.success).toBe(true);
    });

    test('역할 할당 로깅', async () => {
      const result = await auditLogger.logRoleAssign(
        'admin-1',
        'user-2',
        'org-1',
        'MANAGER',
        { start_date: '2024-01-01' }
      );
      expect(result.success).toBe(true);
    });

    test('출근 체크인 로깅', async () => {
      const location = {
        lat: 37.5665,
        lng: 126.9780,
        address: '서울시 중구'
      };

      const result = await auditLogger.logAttendanceCheckIn('user-1', 'org-1', 'att-1', location);
      expect(result.success).toBe(true);
    });

    test('출근 체크아웃 로깅', async () => {
      const result = await auditLogger.logAttendanceCheckOut('user-1', 'org-1', 'att-1', 8.5, 0.5);
      expect(result.success).toBe(true);
    });

    test('데이터 내보내기 로깅', async () => {
      const result = await auditLogger.logDataExport('user-1', 'org-1', 'attendance', 100, 'CSV');
      expect(result.success).toBe(true);
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