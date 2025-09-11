/**
 * Authentication Context Provider
 * React context for managing authentication state across the application
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SupabaseAuthService, type User, type AuthState } from '@/src/services/supabaseAuthService';
import { type LoginFormData, type UserRole, type AuthError, type LoginResult } from '@/src/schemas/auth.schema';

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
    session: null,
    isLoading: true, // Start with loading state
    isAuthenticated: false,
  });
  
  const router = useRouter();
  const supabaseAuthService = new SupabaseAuthService();

  // Initialize auth state on component mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 AuthContext: 인증 상태 초기화 중...');
        
        // Get initial session
        const { data: { session } } = await supabaseAuthService.supabase.auth.getSession();
        console.log('🔐 AuthContext: 세션 확인 결과:', session ? `로그인됨 (${session.user.email})` : '로그인되지 않음');
        
        let user: User | null = null;
        if (session?.user) {
          console.log('👤 AuthContext: 사용자 정보 매핑 중...');
          // Fetch identity and role data from unified tables
          const { data: identity } = await supabaseAuthService.supabase
            .from('unified_identities')
            .select(`
              *,
              role_assignments!inner(
                role,
                organization_id,
                is_active,
                employee_code,
                department,
                position,
                organizations_v3(name)
              )
            `)
            .eq('auth_user_id', session.user.id)
            .eq('role_assignments.is_active', true)
            .single();

          if (identity) {
            const primaryRole = identity.role_assignments?.[0];
            user = {
              id: identity.id,
              email: identity.email || '',
              name: identity.full_name,
              role: primaryRole?.role,
              approvalStatus: 'APPROVED',
              employee: {
                ...identity,
                employee_code: primaryRole?.employee_code,
                department: primaryRole?.department,
                position: primaryRole?.position,
                organization: primaryRole?.organizations_v3
              }
            };
          }
        }
        
        if (mounted) {
          setAuthState({
            user,
            session,
            isLoading: false,
            isAuthenticated: !!session,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabaseAuthService.supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        let user: User | null = null;
        if (session?.user) {
          // Fetch identity and role data from unified tables
          const { data: identity } = await supabaseAuthService.supabase
            .from('unified_identities')
            .select(`
              *,
              role_assignments!inner(
                role,
                organization_id,
                is_active,
                employee_code,
                department,
                position,
                organizations_v3(name)
              )
            `)
            .eq('auth_user_id', session.user.id)
            .eq('role_assignments.is_active', true)
            .single();

          if (identity) {
            const primaryRole = identity.role_assignments?.[0];
            user = {
              id: identity.id,
              email: identity.email || '',
              name: identity.full_name,
              role: primaryRole?.role,
              approvalStatus: 'APPROVED',
              employee: {
                ...identity,
                employee_code: primaryRole?.employee_code,
                department: primaryRole?.department,
                position: primaryRole?.position,
                organization: primaryRole?.organizations_v3
              }
            };
          }
        }

        setAuthState({
          user,
          session,
          isLoading: false,
          isAuthenticated: !!session,
        });
      }
    );

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Login user and handle redirect
   */
  const login = async (credentials: LoginFormData, rememberMe = false): Promise<LoginResult> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabaseAuthService.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        const authError: AuthError = {
          code: error.message,
          message: '로그인에 실패했습니다',
          details: error.message,
        };

        return {
          success: false,
          error: authError,
        };
      }

      if (data.user) {
        // Fetch identity and role data
        const { data: identity } = await supabaseAuthService.supabase
          .from('unified_identities')
          .select(`
            *,
            role_assignments!inner(
              role,
              organization_id,
              is_active,
              employee_code,
              department,
              position,
              organizations_v3(name)
            )
          `)
          .eq('auth_user_id', data.user.id)
          .eq('role_assignments.is_active', true)
          .single();

        if (!identity) {
          return {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: '사용자 정보를 찾을 수 없습니다',
            },
          };
        }

        const primaryRole = identity.role_assignments?.[0];
        const user: User = {
          id: identity.id,
          email: identity.email || '',
          name: identity.full_name,
          role: primaryRole?.role,
          approvalStatus: 'APPROVED',
          employee: {
            ...identity,
            employee_code: primaryRole?.employee_code,
            department: primaryRole?.department,
            position: primaryRole?.position,
            organization: primaryRole?.organizations_v3
          }
        };

        // Determine redirect URL based on role
        const getRedirectUrlForRole = (role: string) => {
          switch (role) {
            case 'master':
              return '/super-admin/dashboard';
            case 'admin':
              return '/admin/dashboard';
            case 'manager':
              return '/manager/dashboard';
            case 'worker':
            default:
              return '/attendance';
          }
        };

        const redirectUrl = getRedirectUrlForRole(user.role || 'worker');

        // Use setTimeout to allow state updates to complete
        setTimeout(() => {
          router.push(redirectUrl);
        }, 100);

        return {
          success: true,
          user,
          redirectUrl,
        };
      }

      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: '로그인에 실패했습니다',
        },
      };
    } catch (error: any) {
      console.error('Login error in context:', error);
      
      const authError: AuthError = {
        code: 'UNEXPECTED_ERROR',
        message: '예상치 못한 오류가 발생했습니다',
        details: error.message,
      };

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
      await supabaseAuthService.supabase.auth.signOut();
      
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
    if (!authState.user?.role) return false;

    const roleHierarchy = { worker: 1, manager: 2, admin: 3, master: 4 };
    const userLevel = roleHierarchy[authState.user.role as keyof typeof roleHierarchy];
    const requiredLevel = roleHierarchy[role as keyof typeof roleHierarchy];

    return userLevel >= requiredLevel;
  };

  /**
   * Refresh user session
   */
  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabaseAuthService.supabase.auth.refreshSession();
      return !error && !!data.session;
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
        const getRedirectUrlForRole = (role: string) => {
          switch (role) {
            case 'master':
              return '/super-admin/dashboard';
            case 'admin':
              return '/admin/dashboard';
            case 'manager':
              return '/manager/dashboard';
            case 'worker':
            default:
              return '/attendance';
          }
        };
        const redirectUrl = getRedirectUrlForRole(auth.user?.role || 'worker');
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