// API Service - Basic implementation for build compatibility

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiService {
  static async get<T>(url: string): Promise<ApiResponse<T>> {
    // Placeholder implementation
    return { success: false, error: 'Not implemented' };
  }

  static async post<T>(url: string, data: any): Promise<ApiResponse<T>> {
    // Placeholder implementation
    return { success: false, error: 'Not implemented' };
  }

  static async put<T>(url: string, data: any): Promise<ApiResponse<T>> {
    // Placeholder implementation
    return { success: false, error: 'Not implemented' };
  }

  static async delete<T>(url: string): Promise<ApiResponse<T>> {
    // Placeholder implementation
    return { success: false, error: 'Not implemented' };
  }
}

// Legacy compatibility
export const apiService = ApiService;

export default ApiService;