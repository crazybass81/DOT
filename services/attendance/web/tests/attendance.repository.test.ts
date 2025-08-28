import { AttendanceRepository } from '../src/lib/database/repositories/attendance.repository';
import { AttendanceStatus } from '../src/lib/database/models/attendance.model';
import { dynamoDBClient } from '../src/lib/database/dynamodb-client';

describe('AttendanceRepository', () => {
  let repository: AttendanceRepository;
  const testEmployeeId = 'test-employee-123';
  const testOrganizationId = 'test-org-123';

  beforeAll(() => {
    repository = new AttendanceRepository();
  });

  describe('Check-in/Check-out Operations', () => {
    it('should successfully check in an employee', async () => {
      const location = { latitude: 37.5665, longitude: 126.9780 }; // Seoul coordinates
      
      const result = await repository.checkIn(
        testEmployeeId,
        testOrganizationId,
        location
      );

      expect(result).toBeDefined();
      expect(result.employeeId).toBe(testEmployeeId);
      expect(result.organizationId).toBe(testOrganizationId);
      expect(result.status).toBe(AttendanceStatus.PRESENT);
      expect(result.checkInTime).toBeDefined();
      expect(result.checkInLocation).toEqual({
        ...location,
        timestamp: expect.any(String),
      });
    });

    it('should prevent duplicate check-in on the same day', async () => {
      const location = { latitude: 37.5665, longitude: 126.9780 };
      
      await expect(
        repository.checkIn(testEmployeeId, testOrganizationId, location)
      ).rejects.toThrow('Already checked in today');
    });

    it('should successfully check out an employee', async () => {
      const location = { latitude: 37.5665, longitude: 126.9780 };
      
      const result = await repository.checkOut(testEmployeeId, location);

      expect(result).toBeDefined();
      expect(result.checkOutTime).toBeDefined();
      expect(result.actualWorkHours).toBeGreaterThan(0);
      expect(result.checkOutLocation).toEqual({
        ...location,
        timestamp: expect.any(String),
      });
    });

    it('should prevent check-out without check-in', async () => {
      await expect(
        repository.checkOut('non-existent-employee')
      ).rejects.toThrow('No check-in record found for today');
    });

    it('should prevent duplicate check-out on the same day', async () => {
      await expect(
        repository.checkOut(testEmployeeId)
      ).rejects.toThrow('Already checked out today');
    });
  });

  describe('Attendance Queries', () => {
    it('should get today\'s attendance for an employee', async () => {
      const result = await repository.getTodayAttendance(testEmployeeId);

      expect(result).toBeDefined();
      expect(result?.employeeId).toBe(testEmployeeId);
      expect(result?.date).toBe(new Date().toISOString().split('T')[0]);
    });

    it('should get attendance by date range', async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      
      const results = await repository.getAttendanceByEmployeeAndDateRange(
        testEmployeeId,
        startDate.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should get all attendance records for a specific date', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const results = await repository.getAttendanceByDate(
        today,
        testOrganizationId
      );

      expect(Array.isArray(results)).toBe(true);
      results.forEach(record => {
        expect(record.date).toBe(today);
        expect(record.organizationId).toBe(testOrganizationId);
      });
    });
  });

  describe('Attendance Statistics', () => {
    it('should calculate monthly attendance statistics', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const stats = await repository.getAttendanceStatistics(
        testEmployeeId,
        currentMonth
      );

      expect(stats).toBeDefined();
      expect(stats.employeeId).toBe(testEmployeeId);
      expect(stats.period).toBe(currentMonth);
      expect(stats.totalDays).toBeGreaterThanOrEqual(1);
      expect(stats.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(stats.attendanceRate).toBeLessThanOrEqual(100);
    });

    it('should calculate yearly attendance statistics', async () => {
      const currentYear = new Date().getFullYear().toString();
      
      const stats = await repository.getAttendanceStatistics(
        testEmployeeId,
        currentYear
      );

      expect(stats).toBeDefined();
      expect(stats.employeeId).toBe(testEmployeeId);
      expect(stats.period).toBe(currentYear);
      expect(stats.totalWorkHours).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Attendance Updates', () => {
    let attendanceId: string;

    beforeEach(async () => {
      const record = await repository.createAttendance({
        employeeId: 'update-test-employee',
        organizationId: testOrganizationId,
        date: new Date().toISOString().split('T')[0],
        status: AttendanceStatus.PRESENT,
      });
      attendanceId = record.attendanceId;
    });

    it('should update attendance status', async () => {
      const result = await repository.updateAttendanceStatus(
        attendanceId,
        'update-test-employee',
        AttendanceStatus.LATE,
        'manager-123'
      );

      expect(result.status).toBe(AttendanceStatus.LATE);
      expect(result.modifiedBy).toBe('manager-123');
      expect(result.updatedAt).toBeDefined();
    });

    afterEach(async () => {
      await repository.deleteAttendance(attendanceId, 'update-test-employee');
    });
  });

  describe('Batch Operations', () => {
    it('should batch create multiple attendance records', async () => {
      const records = [
        {
          employeeId: 'batch-employee-1',
          organizationId: testOrganizationId,
          date: '2024-01-15',
          status: AttendanceStatus.PRESENT,
        },
        {
          employeeId: 'batch-employee-2',
          organizationId: testOrganizationId,
          date: '2024-01-15',
          status: AttendanceStatus.ABSENT,
        },
        {
          employeeId: 'batch-employee-3',
          organizationId: testOrganizationId,
          date: '2024-01-15',
          status: AttendanceStatus.LATE,
        },
      ];

      await expect(
        repository.batchCreateAttendance(records)
      ).resolves.not.toThrow();

      // Verify records were created
      const date = '2024-01-15';
      const results = await repository.getAttendanceByDate(date, testOrganizationId);
      
      const createdEmployeeIds = results.map(r => r.employeeId);
      expect(createdEmployeeIds).toContain('batch-employee-1');
      expect(createdEmployeeIds).toContain('batch-employee-2');
      expect(createdEmployeeIds).toContain('batch-employee-3');
    });

    it('should handle batch operations with more than 25 items', async () => {
      const records = Array.from({ length: 30 }, (_, i) => ({
        employeeId: `bulk-employee-${i}`,
        organizationId: testOrganizationId,
        date: '2024-01-16',
        status: AttendanceStatus.PRESENT,
      }));

      await expect(
        repository.batchCreateAttendance(records)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid attendance ID gracefully', async () => {
      const result = await repository.getAttendanceById(
        'non-existent-id',
        'non-existent-employee'
      );
      
      expect(result).toBeNull();
    });

    it('should handle empty date range queries', async () => {
      const futureDate = '2099-12-31';
      
      const results = await repository.getAttendanceByEmployeeAndDateRange(
        testEmployeeId,
        futureDate,
        futureDate
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });
});