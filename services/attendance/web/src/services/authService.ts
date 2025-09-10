/**
 * Authentication Service
 * Client-side authentication service with comprehensive error handling and session management
 */

import { 
  type LoginFormData, 
  type LoginResponse,
  type LogoutResponse,
  type User,
  type UserRole,
  validateLoginForm,
  AUTH_ERROR_MESSAGES,
  getDefaultRedirectUrl,
} from '@/src/schemas/auth.schema';

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  redirectUrl?: string;
  message?: string;
  error?: AuthError;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
}

class AuthService {
  private baseUrl: string;
  private listeners: Set<(state: AuthState) => void> = new Set();

  constructor() {
    this.baseUrl = '/api/auth';
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(state: AuthState): void {
    this.listeners.forEach(listener => listener(state));
  }

  /**
   * Login user with email and password
   */
  async login(credentials: LoginFormData, rememberMe = false): Promise<LoginResult> {
    try {
      // Validate credentials on client side first
      const validation = validateLoginForm(credentials);
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: firstError.message,
            details: validation.error.errors,
          },
        };
      }

      // Send login request
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          rememberMe,
        }),
        credentials: 'include', // Include cookies
      });

      const result: LoginResponse = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Store user data in session storage
      if (result.data.user) {
        sessionStorage.setItem('user', JSON.stringify(result.data.user));
        
        // Store session info if remember me is enabled
        if (rememberMe && result.data.session) {
          localStorage.setItem('session_info', JSON.stringify({
            expiresAt: result.data.session.expiresAt,
            rememberMe: true,
          }));
        }
      }

      // Notify listeners of successful login
      this.notifyListeners({
        user: result.data.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });

      return {
        success: true,
        user: result.data.user,
        redirectUrl: result.data.redirectUrl,
        message: result.data.message,
      };

    } catch (error: any) {
      console.error('Login request failed:', error);
      
      const authError: AuthError = {
        code: 'NETWORK_ERROR',
        message: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
        details: error.message,
      };

      this.notifyListeners({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: authError,
      });

      return {
        success: false,
        error: authError,
      };
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<{ success: boolean; message: string; error?: AuthError }> {
    try {
      // Update state immediately for better UX
      this.notifyListeners({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        error: null,
      });

      const response = await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      const result: LogoutResponse = await response.json();

      // Clear all stored data
      sessionStorage.removeItem('user');
      localStorage.removeItem('session_info');
      
      // Clear any other auth-related data
      const authKeys = ['auth_token', 'user_profile', 'permissions'];
      authKeys.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });

      // Final state update
      this.notifyListeners({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      return {
        success: result.success,
        message: result.message,
      };

    } catch (error: any) {
      console.error('Logout request failed:', error);
      
      // Even if logout request fails, clear local state
      sessionStorage.removeItem('user');
      localStorage.removeItem('session_info');
      
      this.notifyListeners({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      return {
        success: true, // Return success to prevent logout failures
        message: '로그아웃이 완료되었습니다',
      };
    }
  }

  /**
   * Get current user from session storage
   */
  getCurrentUser(): User | null {
    try {
      const userStr = sessionStorage.getItem('user');
      if (!userStr) return null;

      const user: User = JSON.parse(userStr);
      
      // Validate user data structure
      if (!user.id || !user.email || !user.role) {
        console.warn('Invalid user data in session storage');
        sessionStorage.removeItem('user');
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      sessionStorage.removeItem('user');
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Check session expiration if remember me was used
    try {
      const sessionInfoStr = localStorage.getItem('session_info');
      if (sessionInfoStr) {
        const sessionInfo = JSON.parse(sessionInfoStr);
        if (sessionInfo.expiresAt && Date.now() > sessionInfo.expiresAt) {
          // Session expired
          this.clearSession();
          return false;
        }
      }
    } catch (error) {
      console.error('Error checking session expiration:', error);
    }

    return true;
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    sessionStorage.removeItem('user');
    localStorage.removeItem('session_info');
    
    this.notifyListeners({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }

  /**
   * Get user role
   */
  getUserRole(): UserRole | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  /**
   * Check if user has specific role or higher
   */
  hasRole(requiredRole: UserRole): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    const roleHierarchy = { worker: 1, manager: 2, admin: 3, master: 4 };
    const userLevel = roleHierarchy[user.role];
    const requiredLevel = roleHierarchy[requiredRole];

    return userLevel >= requiredLevel;
  }

  /**
   * Get redirect URL for user role
   */
  getRedirectUrl(role?: UserRole, organizationId?: string): string {
    const userRole = role || this.getUserRole();
    if (!userRole) return '/';
    
    return getDefaultRedirectUrl(userRole, organizationId);
  }

  /**
   * Initialize auth state from storage
   */
  initializeAuth(): AuthState {
    const user = this.getCurrentUser();
    const isAuthenticated = this.isAuthenticated();

    const state: AuthState = {
      user: isAuthenticated ? user : null,
      isLoading: false,
      isAuthenticated,
      error: null,
    };

    // Notify listeners of initial state
    this.notifyListeners(state);
    return state;
  }

  /**
   * Refresh user session
   */
  async refreshSession(): Promise<boolean> {
    try {
      // In a real implementation, this would call a refresh token endpoint
      const user = this.getCurrentUser();
      if (!user) return false;

      // For now, just verify the current session is still valid
      return this.isAuthenticated();
    } catch (error) {
      console.error('Session refresh failed:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Password reset request
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; error?: AuthError }> {
    try {
      const response = await fetch(`${this.baseUrl}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Password reset request failed:', error);
      return {
        success: false,
        message: '비밀번호 재설정 요청에 실패했습니다',
        error: {
          code: 'NETWORK_ERROR',
          message: '네트워크 오류가 발생했습니다',
          details: error.message,
        },
      };
    }
  }

  /**
   * Get auth error message in Korean
   */
  getErrorMessage(errorCode: string): string {
    return AUTH_ERROR_MESSAGES[errorCode as keyof typeof AUTH_ERROR_MESSAGES] || 
           '알 수 없는 오류가 발생했습니다';
  }
}

// Export singleton instance
export const authService = new AuthService();
export type { AuthState, LoginResult, AuthError };