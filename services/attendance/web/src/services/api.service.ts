// API Service - Basic implementation for build compatibility

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const apiService = {
  async get<T>(url: string): Promise<ApiResponse<T>> {
    // Placeholder implementation
    return { success: false, error: 'Not implemented' };
  },

  async post<T>(url: string, data: any): Promise<ApiResponse<T>> {
    // Placeholder implementation
    return { success: false, error: 'Not implemented' };
  },

  async put<T>(url: string, data: any): Promise<ApiResponse<T>> {
    // Placeholder implementation
    return { success: false, error: 'Not implemented' };
  },

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    // Placeholder implementation
    return { success: false, error: 'Not implemented' };
  }
};