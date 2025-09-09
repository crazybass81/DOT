/**
 * Centralized API Client for ID-ROLE-PAPER System
 * Provides consistent error handling, authentication, and request configuration
 * 
 * Features:
 * - JWT Bearer token authentication
 * - Automatic error handling with user-friendly messages
 * - Request/response type safety
 * - Centralized configuration management
 * - Korean error message localization
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    let data: any;

    try {
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (error) {
      throw new Error('응답 파싱 중 오류가 발생했습니다.');
    }

    if (!response.ok) {
      throw {
        message: this.getErrorMessage(response.status, data),
        status: response.status,
        details: data
      } as ApiError;
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message
    };
  }

  private getErrorMessage(status: number, data: any): string {
    const errorMessages: Record<number, string> = {
      400: '잘못된 요청입니다.',
      401: '인증이 필요합니다. 다시 로그인해주세요.',
      403: '권한이 없습니다.',
      404: '요청한 리소스를 찾을 수 없습니다.',
      409: '데이터 충돌이 발생했습니다.',
      422: '입력 데이터가 올바르지 않습니다.',
      500: '서버 오류가 발생했습니다.',
      503: '서비스를 사용할 수 없습니다.'
    };

    // Try to get error message from response data first
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    
    // Fall back to standard status messages
    return errorMessages[status] || `오류가 발생했습니다. (${status})`;
  }

  async get<T = any>(endpoint: string, options?: {
    params?: Record<string, any>;
    headers?: Record<string, string>;
  }): Promise<ApiResponse<T>> {
    try {
      let url = `${this.baseUrl}${endpoint}`;
      
      if (options?.params) {
        const searchParams = new URLSearchParams();
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        url += `?${searchParams.toString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(options?.headers),
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error || (error as ApiError).status) {
        throw error;
      }
      throw new Error('네트워크 오류가 발생했습니다.');
    }
  }

  async post<T = any>(endpoint: string, data?: any, options?: {
    headers?: Record<string, string>;
  }): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(options?.headers),
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error || (error as ApiError).status) {
        throw error;
      }
      throw new Error('네트워크 오류가 발생했습니다.');
    }
  }

  async put<T = any>(endpoint: string, data?: any, options?: {
    headers?: Record<string, string>;
  }): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(options?.headers),
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error || (error as ApiError).status) {
        throw error;
      }
      throw new Error('네트워크 오류가 발생했습니다.');
    }
  }

  async delete<T = any>(endpoint: string, options?: {
    headers?: Record<string, string>;
  }): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(options?.headers),
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error || (error as ApiError).status) {
        throw error;
      }
      throw new Error('네트워크 오류가 발생했습니다.');
    }
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient('/api');

// Convenience methods for common API operations
export const api = {
  // Identity API
  identity: {
    getAll: (params?: { limit?: number; offset?: number; type?: string }) =>
      apiClient.get('/identity', { params }),
    
    getById: (id: string) =>
      apiClient.get(`/identity/${id}`),
    
    getByUserId: (userId: string) =>
      apiClient.get('/identity', { params: { userId } }),
    
    create: (data: any) =>
      apiClient.post('/identity', data),
    
    update: (id: string, data: any) =>
      apiClient.put(`/identity/${id}`, data),
    
    delete: (id: string) =>
      apiClient.delete(`/identity/${id}`)
  },

  // Business API
  business: {
    getAll: (params?: { limit?: number; offset?: number; type?: string }) =>
      apiClient.get('/business', { params }),
    
    getById: (id: string) =>
      apiClient.get(`/business/${id}`),
    
    create: (data: any) =>
      apiClient.post('/business', data),
    
    update: (id: string, data: any) =>
      apiClient.put(`/business/${id}`, data),
    
    delete: (id: string) =>
      apiClient.delete(`/business/${id}`),
    
    verify: (id: string) =>
      apiClient.post(`/business/${id}/verify`)
  },

  // Papers API
  papers: {
    getAll: (params?: { limit?: number; offset?: number; type?: string; businessId?: string }) =>
      apiClient.get('/papers', { params }),
    
    getById: (id: string) =>
      apiClient.get(`/papers/${id}`),
    
    create: (data: any) =>
      apiClient.post('/papers', data),
    
    update: (id: string, data: any) =>
      apiClient.put(`/papers/${id}`, data),
    
    delete: (id: string) =>
      apiClient.delete(`/papers/${id}`),
    
    validate: (id: string) =>
      apiClient.post(`/papers/${id}/validate`),
    
    extend: (id: string, data: { newValidUntil: string; reason: string }) =>
      apiClient.post(`/papers/${id}/extend`, data)
  },

  // Permissions API
  permissions: {
    check: (data: { identityId: string; resource: string; action: string; businessId?: string }) =>
      apiClient.post('/permissions/check', data),
    
    checkBulk: (data: { 
      identityId: string; 
      permissions: Array<{ resource: string; action: string; businessId?: string }> 
    }) =>
      apiClient.post('/permissions/check-bulk', data),
    
    getMatrix: (identityId: string, businessId?: string) =>
      apiClient.get('/permissions/matrix', { params: { identityId, businessId } })
  },

  // Auth API
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/auth/login', { email, password }),
    
    logout: () =>
      apiClient.post('/auth/logout'),
    
    refresh: () =>
      apiClient.post('/auth/refresh'),
    
    validate: () =>
      apiClient.get('/auth/validate')
  },

  // Health API
  health: {
    check: () =>
      apiClient.get('/health'),
    
    detailed: () =>
      apiClient.get('/health/detailed')
  }
};