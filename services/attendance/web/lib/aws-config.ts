import { Amplify } from '@aws-amplify/core';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from '@aws-amplify/auth';

// AWS Configuration
export const awsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-2',
  userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
  userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
  apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || '',
};

// Initialize Amplify
if (typeof window !== 'undefined') {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: awsConfig.userPoolId,
        userPoolClientId: awsConfig.userPoolClientId,
      }
    }
  });
}

// Authentication helpers
export const authService = {
  async signIn(email: string, password: string) {
    try {
      const { isSignedIn, nextStep } = await signIn({ 
        username: email, 
        password 
      });
      return { success: isSignedIn, nextStep };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  async signOut() {
    try {
      await signOut();
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const user = await getCurrentUser();
      return user;
    } catch {
      return null;
    }
  },

  async getAuthToken() {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch {
      return null;
    }
  }
};

// API helper
export const apiClient = {
  async request(path: string, options: RequestInit = {}) {
    const token = await authService.getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    };

    const response = await fetch(`${awsConfig.apiEndpoint}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  },

  // Attendance endpoints
  async checkIn(data: {
    employeeId: string;
    businessId: string;
    location: { lat: number; lng: number };
    verificationMethod: string;
  }) {
    return this.request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async checkOut(data: {
    employeeId: string;
    location: { lat: number; lng: number };
  }) {
    return this.request('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getAttendanceStatus(employeeId: string) {
    return this.request(`/attendance/status?employeeId=${employeeId}`);
  },

  async getAttendanceHistory(employeeId: string, startDate: string, endDate: string) {
    return this.request(`/attendance/history?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`);
  }
};