/**
 * Authentication Context Provider
 * React context for managing authentication state across the application
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SupabaseAuthService, type User, type AuthState } from '@/src/services/supabaseAuthService';
import { type LoginFormData, type AuthError, type LoginResult } from '@/src/schemas/auth.schema';
import { type LoginFormData, type User, type UserRole } from '@/src/schemas/auth.schema';

interface AuthContextType extends AuthState {
  login: (credentials: LoginFormData, rememberMe?: boolean) => Promise<LoginResult>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: UserRole) => boolean;
  refreshSession: () => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true, // Start with loading state
    isAuthenticated: false,
    error: null,
  });
  
  const router = useRouter();

  // Initialize auth state on component mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Initialize auth service and get current state
        const initialState = authService.initializeAuth();
        
        if (mounted) {
          setAuthState({
            ...initialState,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        
        if (mounted) {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: {
              code: 'INIT_ERROR',
              message: '인증 시스템 초기화에 실패했습니다',
            },
          });
        }
      }
    };

    initializeAuth();

    // Subscribe to auth service state changes
    const unsubscribe = authService.subscribe((newState: AuthState) => {
      if (mounted) {
        setAuthState(newState);
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  /**
   * Login user and handle redirect
   */
  const login = async (credentials: LoginFormData, rememberMe = false): Promise<LoginResult> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await authService.login(credentials, rememberMe);
      
      if (result.success && result.redirectUrl) {
        // Use setTimeout to allow state updates to complete
        setTimeout(() => {
          router.push(result.redirectUrl!);
        }, 100);
      }
      
      return result;
    } catch (error: any) {
      console.error('Login error in context:', error);
      
      const authError: AuthError = {
        code: 'UNEXPECTED_ERROR',
        message: '예상치 못한 오류가 발생했습니다',
        details: error.message,
      };

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: authError,
      }));

      return {
        success: false,
        error: authError,
      };
    }
  };

  /**
   * Logout user and redirect to home
   */
  const logout = async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      await authService.logout();
      
      // Redirect to home page after logout
      router.push('/');
    } catch (error) {
      console.error('Logout error in context:', error);
      
      // Still redirect even if logout request fails
      router.push('/');
    }
  };

  /**
   * Clear current error
   */
  const clearError = (): void => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  /**
   * Check if user has specific role or higher
   */
  const hasRole = (role: UserRole): boolean => {
    return authService.hasRole(role);
  };

  /**
   * Refresh user session
   */
  const refreshSession = async (): Promise<boolean> => {
    try {
      return await authService.refreshSession();
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  };

  // Context value
  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    clearError,
    hasRole,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to check if user is authenticated
 */
export function useRequireAuth(): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push('/');
    }
  }, [auth.isAuthenticated, auth.isLoading, router]);

  return auth;
}

/**
 * Hook to require specific role
 */
export function useRequireRole(requiredRole: UserRole): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        router.push('/');
      } else if (!auth.hasRole(requiredRole)) {
        // Redirect to appropriate page based on current role
        const redirectUrl = authService.getRedirectUrl();
        router.push(redirectUrl);
      }
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user?.role, requiredRole, router]);

  return auth;
}

/**
 * Higher-order component to wrap components with auth requirement
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const auth = requiredRole ? useRequireRole(requiredRole) : useRequireAuth();

    // Show loading state
    if (auth.isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">인증 정보를 확인하는 중...</p>
          </div>
        </div>
      );
    }

    // Don't render if not authenticated or insufficient role
    if (!auth.isAuthenticated || (requiredRole && !auth.hasRole(requiredRole))) {
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * Component to show only to authenticated users
 */
interface AuthenticatedProps {
  children: ReactNode;
  fallback?: ReactNode;
  role?: UserRole;
}

export function Authenticated({ children, fallback = null, role }: AuthenticatedProps) {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  if (!auth.isAuthenticated || (role && !auth.hasRole(role))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component to show only to non-authenticated users
 */
interface NotAuthenticatedProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function NotAuthenticated({ children, fallback = null }: NotAuthenticatedProps) {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Export types
export type { AuthContextType, AuthState, LoginResult, AuthError };