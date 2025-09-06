import { supabaseAuthService } from './supabaseAuthService';

const API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co';

class ApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await supabaseAuthService.getSessionToken();
    
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  async checkIn(data: {
    location: { lat: number; lng: number };
    verificationMethod: 'gps' | 'qr';
  }) {
    const headers = await this.getAuthHeaders();
    const user = await supabaseAuthService.getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const requestData = {
      employeeId: user.employeeId,
      businessId: user.businessId,
      ...data
    };
    
    const response = await fetch(`${API_BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Check-in failed' }));
      throw new Error(error.error || 'Check-in failed');
    }

    return response.json();
  }

  async checkOut(data: {
    location: { lat: number; lng: number };
  }) {
    const headers = await this.getAuthHeaders();
    const user = await supabaseAuthService.getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const requestData = {
      employeeId: user.employeeId,
      businessId: user.businessId,
      ...data
    };
    
    const response = await fetch(`${API_BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Check-out failed' }));
      throw new Error(error.error || 'Check-out failed');
    }

    return response.json();
  }

  async verifyLocation(location: { lat: number; lng: number }) {
    const headers = await this.getAuthHeaders();
    const user = await supabaseAuthService.getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${API_BASE_URL}/location/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        businessId: user.businessId,
        location
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Location verification failed' }));
      throw new Error(error.error || 'Location verification failed');
    }

    return response.json();
  }

  async getAttendanceHistory(startDate?: string, endDate?: string) {
    const headers = await this.getAuthHeaders();
    const user = await supabaseAuthService.getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const params = new URLSearchParams();
    if (user.employeeId) params.append('employeeId', user.employeeId);
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${API_BASE_URL}/attendance/history?${params}`, {
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch attendance history' }));
      throw new Error(error.error || 'Failed to fetch attendance history');
    }

    return response.json();
  }

  async generateQRCode(data: {
    type: 'check-in' | 'check-out';
    validityMinutes?: number;
  }) {
    const headers = await this.getAuthHeaders();
    const user = await supabaseAuthService.getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const requestData = {
      businessId: user.businessId,
      ...data
    };
    
    const response = await fetch(`${API_BASE_URL}/qr/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'QR code generation failed' }));
      throw new Error(error.error || 'QR code generation failed');
    }

    return response.json();
  }

  async verifyQRCode(data: {
    code: string;
    signature: string;
    location: { lat: number; lng: number };
  }) {
    const headers = await this.getAuthHeaders();
    const user = await supabaseAuthService.getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const requestData = {
      employeeId: user.employeeId,
      ...data
    };
    
    const response = await fetch(`${API_BASE_URL}/qr/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'QR code verification failed' }));
      throw new Error(error.error || 'QR code verification failed');
    }

    return response.json();
  }

  // Admin APIs
  async getEmployees() {
    const headers = await this.getAuthHeaders();
    const user = await supabaseAuthService.getCurrentUser();
    
    if (!user || !(await supabaseAuthService.hasRole('admin'))) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    const response = await fetch(`${API_BASE_URL}/admin/employees?businessId=${user.businessId}`, {
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch employees' }));
      throw new Error(error.error || 'Failed to fetch employees');
    }

    return response.json();
  }

  async getAttendanceStats(period: 'daily' | 'weekly' | 'monthly') {
    const headers = await this.getAuthHeaders();
    const user = await supabaseAuthService.getCurrentUser();
    
    if (!user || !(await supabaseAuthService.hasRole('admin'))) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    const response = await fetch(`${API_BASE_URL}/admin/attendance/stats?businessId=${user.businessId}&period=${period}`, {
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch attendance stats' }));
      throw new Error(error.error || 'Failed to fetch attendance stats');
    }

    return response.json();
  }
}

export const apiService = new ApiService();