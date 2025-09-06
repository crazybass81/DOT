// attendance-api.service.ts
// Single Responsibility: Edge Functions API 통신만 담당
// Phase 4.2.2에서 완성된 5개 Edge Functions와 연동

export interface AttendanceStatus {
  employeeId: string;
  currentStatus: 'NOT_WORKING' | 'WORKING' | 'ON_BREAK' | 'COMPLETED';
  today: {
    attendanceId: string;
    checkInTime: string;
    checkOutTime?: string;
    workingMinutes: number;
    breakMinutes: number;
    currentBreakStart?: string;
    totalWorkMinutes: number;
    actualWorkMinutes: number;
  } | null;
}

export interface CheckInData {
  employeeId: string;
  locationId: string;
  latitude: number;
  longitude: number;
}

export interface BreakData {
  employeeId: string;
  action: 'START' | 'END';
}

export interface AnalyticsRequest {
  type: 'summary' | 'trends' | 'employee' | 'department' | 'overtime' | 'patterns';
  organizationId: string;
  startDate: string;
  endDate: string;
  employeeId?: string;
  departmentId?: string;
}

export class AttendanceAPIService {
  private baseUrl: string;
  private authToken: string;

  constructor() {
    // 로컬 개발 환경에서는 Edge Functions 로컬 서버 사용
    this.baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://127.0.0.1:54321/functions/v1'
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
    
    this.authToken = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // attendance-checkin Edge Function 호출
  async checkIn(data: CheckInData) {
    return this.makeRequest('attendance-checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // attendance-checkout Edge Function 호출
  async checkOut(data: CheckInData) {
    return this.makeRequest('attendance-checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // attendance-break Edge Function 호출
  async manageBreak(data: BreakData) {
    return this.makeRequest('attendance-break', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // attendance-status Edge Function 호출 (GET 방식)
  async getAttendanceStatus(employeeId: string): Promise<AttendanceStatus> {
    const params = new URLSearchParams({ employeeId });
    const response = await this.makeRequest(`attendance-status?${params}`, {
      method: 'GET',
    });
    
    return response.data;
  }

  // attendance-analytics Edge Function 호출
  async getAnalytics(request: AnalyticsRequest, jwtToken: string) {
    return this.makeRequest('attendance-analytics', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`, // JWT 토큰 사용
      },
      body: JSON.stringify(request),
    });
  }

  // 실시간 상태 폴링을 위한 유틸리티 메서드
  startStatusPolling(employeeId: string, callback: (status: AttendanceStatus) => void, interval = 30000) {
    const poll = async () => {
      try {
        const status = await this.getAttendanceStatus(employeeId);
        callback(status);
      } catch (error) {
        console.error('Status polling error:', error);
      }
    };

    // 초기 호출
    poll();

    // 주기적 폴링
    const intervalId = setInterval(poll, interval);
    
    return () => clearInterval(intervalId);
  }
}

// Singleton 패턴으로 인스턴스 제공
export const attendanceAPI = new AttendanceAPIService();