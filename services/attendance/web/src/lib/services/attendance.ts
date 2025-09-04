import { LocationVerification, GeolocationPosition } from './location-verification';
import { QRVerification } from './qr-verification';

export interface CheckInData {
  employeeId: string;
  businessId: string;
  location: GeolocationPosition;
  verificationMethod: 'gps' | 'qr' | 'wifi' | 'manual';
  qrCode?: string;
}

export interface CheckOutData {
  employeeId: string;
  businessId: string;
  location: GeolocationPosition;
}

export interface AttendanceResult {
  success: boolean;
  message?: string;
  error?: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  workDuration?: number; // in minutes
}

export interface AttendanceStatus {
  isCheckedIn: boolean;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  breakTime?: number;
  workDuration?: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  businessId: string;
  date: Date;
  checkInTime: Date;
  checkOutTime: Date | null;
  breakStartTime?: Date;
  breakEndTime?: Date;
  status: 'present' | 'late' | 'early_leave' | 'absent' | 'holiday';
  verificationMethod: string;
  checkInLocation?: GeolocationPosition;
  checkOutLocation?: GeolocationPosition;
}

// In-memory storage for MVP (replace with database later)
const attendanceStore = new Map<string, AttendanceRecord[]>();

export class AttendanceService {
  private locationService: LocationVerification;
  private qrService: QRVerification;

  constructor() {
    this.locationService = new LocationVerification();
    this.qrService = new QRVerification();
  }

  /**
   * Process employee check-in
   */
  async checkIn(data: CheckInData): Promise<AttendanceResult> {
    try {
      // Check if already checked in today
      const todayRecord = this.getTodayRecord(data.employeeId);
      if (todayRecord && todayRecord.checkInTime) {
        return {
          success: false,
          error: '이미 출근 처리되었습니다'
        };
      }

      // Verify based on method
      let verificationResult: { valid: boolean; message: string };

      switch (data.verificationMethod) {
        case 'gps':
          // Get business location (mock for now)
          const businessLocation = await this.getBusinessLocation(data.businessId);
          const locationResult = await this.locationService.verifyLocation(
            data.location,
            businessLocation,
            50 // 50m radius
          );
          verificationResult = {
            valid: locationResult.valid,
            message: locationResult.message
          };
          
          // 디버깅용 로그
          console.log('GPS Verification:', {
            userLocation: data.location,
            businessLocation,
            distance: locationResult.distance,
            valid: locationResult.valid
          });
          break;

        case 'qr':
          if (!data.qrCode) {
            return {
              success: false,
              error: 'QR 코드가 제공되지 않았습니다'
            };
          }
          verificationResult = this.qrService.verifyQRCode(data.qrCode, data.businessId);
          break;

        case 'wifi':
          // WiFi verification implementation
          const wifiResult = await this.verifyWiFiConnection(data.businessId);
          verificationResult = {
            valid: wifiResult.valid,
            message: wifiResult.message
          };
          break;

        case 'manual':
          // Manual approval by manager
          verificationResult = { valid: true, message: '관리자 수동 승인' };
          break;

        default:
          return {
            success: false,
            error: '알 수 없는 검증 방법입니다'
          };
      }

      if (!verificationResult.valid) {
        return {
          success: false,
          error: `위치 확인 실패: ${verificationResult.message}`
        };
      }

      // Create attendance record
      const checkInTime = new Date();
      const record: AttendanceRecord = {
        id: `${data.employeeId}-${Date.now()}`,
        employeeId: data.employeeId,
        businessId: data.businessId,
        date: new Date(checkInTime.toDateString()),
        checkInTime,
        checkOutTime: null,
        status: this.determineStatus(checkInTime),
        verificationMethod: data.verificationMethod,
        checkInLocation: data.location
      };

      // Store the record
      this.storeAttendanceRecord(data.employeeId, record);

      return {
        success: true,
        message: '출근 처리가 완료되었습니다',
        checkInTime
      };
    } catch (error) {
      return {
        success: false,
        error: `출근 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }

  /**
   * Process employee check-out
   */
  async checkOut(data: CheckOutData): Promise<AttendanceResult> {
    try {
      const todayRecord = this.getTodayRecord(data.employeeId);
      
      if (!todayRecord || !todayRecord.checkInTime) {
        return {
          success: false,
          error: '출근 기록이 없습니다'
        };
      }

      if (todayRecord.checkOutTime) {
        return {
          success: false,
          error: '이미 퇴근 처리되었습니다'
        };
      }

      const checkOutTime = new Date();
      todayRecord.checkOutTime = checkOutTime;
      todayRecord.checkOutLocation = data.location;

      // Calculate work duration
      const workDurationMs = checkOutTime.getTime() - todayRecord.checkInTime.getTime();
      const workDuration = Math.floor(workDurationMs / (1000 * 60)); // Convert to minutes

      return {
        success: true,
        message: '퇴근 처리가 완료되었습니다',
        checkOutTime,
        workDuration
      };
    } catch (error) {
      return {
        success: false,
        error: `퇴근 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }

  /**
   * Get current attendance status for an employee
   */
  async getAttendanceStatus(employeeId: string): Promise<AttendanceStatus> {
    const todayRecord = this.getTodayRecord(employeeId);

    if (!todayRecord) {
      return {
        isCheckedIn: false,
        checkInTime: null,
        checkOutTime: null
      };
    }

    const workDuration = todayRecord.checkInTime && todayRecord.checkOutTime
      ? Math.floor((todayRecord.checkOutTime.getTime() - todayRecord.checkInTime.getTime()) / (1000 * 60))
      : undefined;

    return {
      isCheckedIn: !!todayRecord.checkInTime && !todayRecord.checkOutTime,
      checkInTime: todayRecord.checkInTime,
      checkOutTime: todayRecord.checkOutTime,
      workDuration
    };
  }

  /**
   * Get attendance history for an employee
   */
  async getAttendanceHistory(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AttendanceRecord[]> {
    const records = attendanceStore.get(employeeId) || [];
    
    return records.filter(record => {
      return record.date >= startDate && record.date <= endDate;
    });
  }

  /**
   * Helper: Get today's attendance record
   */
  private getTodayRecord(employeeId: string): AttendanceRecord | undefined {
    const records = attendanceStore.get(employeeId) || [];
    const today = new Date().toDateString();
    
    return records.find(record => 
      record.date.toDateString() === today
    );
  }

  /**
   * Helper: Store attendance record
   */
  private storeAttendanceRecord(employeeId: string, record: AttendanceRecord): void {
    const records = attendanceStore.get(employeeId) || [];
    
    // Update existing record or add new
    const existingIndex = records.findIndex(r => 
      r.date.toDateString() === record.date.toDateString()
    );

    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    attendanceStore.set(employeeId, records);
  }

  /**
   * Helper: Determine attendance status based on check-in time
   */
  private determineStatus(checkInTime: Date): 'present' | 'late' | 'early_leave' | 'absent' | 'holiday' {
    const hour = checkInTime.getHours();
    const minutes = checkInTime.getMinutes();
    const totalMinutes = hour * 60 + minutes;

    // Assuming standard work hours 9:00 AM
    const standardStartTime = 9 * 60; // 9:00 AM in minutes

    if (totalMinutes <= standardStartTime + 10) {
      return 'present';
    } else {
      return 'late';
    }
  }

  /**
   * Verify WiFi connection for attendance
   * Checks if device is connected to business WiFi network
   */
  private async verifyWiFiConnection(businessId: string): Promise<{ valid: boolean; message: string }> {
    try {
      // Check if Network Information API is available
      if (!('connection' in navigator) && !('mozConnection' in navigator) && !('webkitConnection' in navigator)) {
        // Fallback: Check if online and assume WiFi if not mobile
        if (!navigator.onLine) {
          return { valid: false, message: 'No network connection' };
        }
        
        // In production, would validate against registered WiFi SSID/BSSID
        // For now, we'll check if the connection type is wifi
        const connection = (navigator as any).connection || 
                          (navigator as any).mozConnection || 
                          (navigator as any).webkitConnection;
        
        if (connection && connection.type === 'wifi') {
          // Here we would validate the specific WiFi network
          // by checking SSID/BSSID against business WiFi configuration
          return { valid: true, message: 'WiFi connection verified' };
        }
        
        // If can't determine, check via backend API
        const response = await fetch('/api/attendance/verify-wifi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId })
        });
        
        if (response.ok) {
          const data = await response.json();
          return { valid: data.valid, message: data.message };
        }
      }
      
      // Default fallback for development
      return { valid: true, message: 'WiFi verification bypassed (development mode)' };
    } catch (error) {
      console.error('WiFi verification error:', error);
      return { valid: false, message: 'WiFi verification failed' };
    }
  }

  /**
   * Mock: Get business location
   * In production, this would fetch from database
   */
  private async getBusinessLocation(businessId: string): Promise<GeolocationPosition> {
    // 테스트용: 사용자의 현재 위치를 사업장 위치로 설정
    // 실제 운영시에는 DB에서 사업장 위치를 가져와야 함
    
    // localStorage에서 저장된 사업장 위치 확인
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('businessLocation');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    
    // 기본값: 서울시청 (테스트용)
    return {
      lat: 37.5663,
      lng: 126.9779
    };
  }
}