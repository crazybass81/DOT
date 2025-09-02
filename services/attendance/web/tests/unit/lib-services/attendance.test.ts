import { AttendanceService } from '../attendance';
import { LocationVerification } from '../location-verification';
import { QRVerification } from '../qr-verification';

// Mock dependencies
jest.mock('../location-verification');
jest.mock('../qr-verification');

describe('AttendanceService', () => {
  let attendanceService: AttendanceService;
  let mockLocationService: jest.Mocked<LocationVerification>;
  let mockQRService: jest.Mocked<QRVerification>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    const LocationMock = LocationVerification as jest.MockedClass<typeof LocationVerification>;
    const QRMock = QRVerification as jest.MockedClass<typeof QRVerification>;
    
    mockLocationService = new LocationMock() as jest.Mocked<LocationVerification>;
    mockQRService = new QRMock() as jest.Mocked<QRVerification>;
    
    // Inject mocks into AttendanceService
    attendanceService = new AttendanceService();
    (attendanceService as any).locationService = mockLocationService;
    (attendanceService as any).qrService = mockQRService;
  });

  describe('checkIn', () => {
    const mockCheckInData = {
      employeeId: 'emp_123',
      businessId: 'biz_456',
      location: { lat: 37.5547, lng: 126.9707, accuracy: 10 },
      verificationMethod: 'gps' as const,
    };

    it('should successfully check in with valid GPS location', async () => {
      mockLocationService.verifyLocation.mockResolvedValue({
        valid: true,
        distance: 30,
        message: '위치 확인 완료'
      });

      const result = await attendanceService.checkIn(mockCheckInData);

      expect(result.success).toBe(true);
      expect(result.checkInTime).toBeDefined();
      expect(result.message).toBe('출근 처리가 완료되었습니다');
    });

    it('should reject check-in with invalid GPS location', async () => {
      mockLocationService.verifyLocation.mockResolvedValue({
        valid: false,
        distance: 100,
        message: '사업장에서 100m 떨어져 있습니다'
      });

      const result = await attendanceService.checkIn(mockCheckInData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('위치 확인 실패: 사업장에서 100m 떨어져 있습니다');
    });

    it('should successfully check in with valid QR code', async () => {
      const qrCheckInData = {
        ...mockCheckInData,
        verificationMethod: 'qr' as const,
        qrCode: 'valid_qr_token'
      };

      mockQRService.verifyQRCode.mockReturnValue({
        valid: true,
        message: '검증 성공'
      });

      const result = await attendanceService.checkIn(qrCheckInData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('출근 처리가 완료되었습니다');
    });

    it('should prevent duplicate check-in on same day', async () => {
      mockLocationService.verifyLocation.mockResolvedValue({
        valid: true,
        distance: 30,
        message: '위치 확인 완료'
      });

      // First check-in
      await attendanceService.checkIn(mockCheckInData);
      
      // Second check-in attempt
      const result = await attendanceService.checkIn(mockCheckInData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('이미 출근 처리되었습니다');
    });

    it('should handle check-in errors gracefully', async () => {
      mockLocationService.verifyLocation.mockRejectedValue(
        new Error('Network error')
      );

      const result = await attendanceService.checkIn(mockCheckInData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('출근 처리 중 오류가 발생했습니다');
    });
  });

  describe('checkOut', () => {
    const mockCheckOutData = {
      employeeId: 'emp_123',
      businessId: 'biz_456',
      location: { lat: 37.5547, lng: 126.9707, accuracy: 10 },
    };

    it('should successfully check out after check-in', async () => {
      // First check in
      mockLocationService.verifyLocation.mockResolvedValue({
        valid: true,
        distance: 30,
        message: '위치 확인 완료'
      });

      await attendanceService.checkIn({
        ...mockCheckOutData,
        verificationMethod: 'gps'
      });

      // Then check out
      const result = await attendanceService.checkOut(mockCheckOutData);

      expect(result.success).toBe(true);
      expect(result.checkOutTime).toBeDefined();
      expect(result.workDuration).toBeDefined();
      expect(result.message).toBe('퇴근 처리가 완료되었습니다');
    });

    it('should reject check-out without prior check-in', async () => {
      const result = await attendanceService.checkOut(mockCheckOutData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('출근 기록이 없습니다');
    });

    it('should calculate work duration correctly', async () => {
      mockLocationService.verifyLocation.mockResolvedValue({
        valid: true,
        distance: 30,
        message: '위치 확인 완료'
      });

      // Mock check-in at 9:00 AM
      const checkInTime = new Date();
      checkInTime.setHours(9, 0, 0, 0);
      
      jest.spyOn(Date, 'now').mockReturnValue(checkInTime.getTime());
      await attendanceService.checkIn({
        ...mockCheckOutData,
        verificationMethod: 'gps'
      });

      // Mock check-out at 6:00 PM (9 hours later)
      const checkOutTime = new Date();
      checkOutTime.setHours(18, 0, 0, 0);
      
      jest.spyOn(Date, 'now').mockReturnValue(checkOutTime.getTime());
      const result = await attendanceService.checkOut(mockCheckOutData);

      expect(result.success).toBe(true);
      expect(result.workDuration).toBe(9 * 60); // 540 minutes
    });
  });

  describe('getAttendanceStatus', () => {
    it('should return current attendance status', async () => {
      const employeeId = 'emp_123';
      
      // Check in first
      mockLocationService.verifyLocation.mockResolvedValue({
        valid: true,
        distance: 30,
        message: '위치 확인 완료'
      });

      await attendanceService.checkIn({
        employeeId,
        businessId: 'biz_456',
        location: { lat: 37.5547, lng: 126.9707, accuracy: 10 },
        verificationMethod: 'gps'
      });

      const status = await attendanceService.getAttendanceStatus(employeeId);

      expect(status.isCheckedIn).toBe(true);
      expect(status.checkInTime).toBeDefined();
      expect(status.checkOutTime).toBeNull();
    });

    it('should return not checked in status when no record exists', async () => {
      const status = await attendanceService.getAttendanceStatus('emp_999');

      expect(status.isCheckedIn).toBe(false);
      expect(status.checkInTime).toBeNull();
      expect(status.checkOutTime).toBeNull();
    });
  });

  describe('getAttendanceHistory', () => {
    it('should return attendance history for date range', async () => {
      const employeeId = 'emp_123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const history = await attendanceService.getAttendanceHistory(
        employeeId,
        startDate,
        endDate
      );

      expect(history).toBeInstanceOf(Array);
      expect(history.every(record => 
        record.date >= startDate && record.date <= endDate
      )).toBe(true);
    });

    it('should return empty array when no records exist', async () => {
      const history = await attendanceService.getAttendanceHistory(
        'emp_999',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(history).toEqual([]);
    });
  });
});