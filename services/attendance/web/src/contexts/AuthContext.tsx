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
  signUp: (email: string, password: string, metadata?: { name?: string }) => Promise<{
    user?: User;
    needsVerification?: boolean;
    error?: AuthError;
  }>;
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
   * Sign up new user
   */
  const signUp = async (email: string, password: string, metadata?: { name?: string }) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('🚀 회원가입 시작:', email);
      
      const { data, error } = await supabaseAuthService.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata ? { name: metadata.name } : undefined
        }
      });

      if (error) {
        console.error('❌ Supabase Auth 회원가입 실패:', error);
        const authError: AuthError = {
          code: error.message,
          message: '회원가입에 실패했습니다',
          details: error.message,
        };

        return { error: authError };
      }

      if (data.user) {
        console.log('✅ Supabase Auth 사용자 생성 성공:', data.user.id);
        
        // 이메일 인증이 필요한 경우와 즉시 로그인 가능한 경우 모두 처리
        let profileCreated = false;
        
        // 기본 조직 확인
        console.log('🏢 기본 조직 확인 중...');
        const { data: defaultOrg, error: orgError } = await supabaseAuthService.supabase
          .from('organizations_v3')
          .select('*')
          .eq('name', 'default-org')
          .maybeSingle();

        if (orgError || !defaultOrg) {
          console.warn('⚠️  기본 조직을 찾을 수 없습니다. 수동으로 생성해야 합니다.');
          
          // 기본 조직이 없으면 회원가입은 성공했지만 프로필 생성은 보류
          if (!data.session) {
            return { 
              needsVerification: true,
              user: undefined,
              error: {
                code: 'MISSING_ORGANIZATION',
                message: '기본 조직을 생성한 후 이메일 인증을 완료해주세요.',
              }
            };
          }
        } else {
          console.log('✅ 기본 조직 확인:', defaultOrg.display_name);
          
          // unified_identities 생성 시도
          try {
            console.log('👤 unified_identities 생성 중...');
            
            const { data: existingIdentity } = await supabaseAuthService.supabase
              .from('unified_identities')
              .select('*')
              .eq('auth_user_id', data.user.id)
              .maybeSingle();

            if (existingIdentity) {
              console.log('ℹ️  이미 unified_identities가 존재합니다.');
            } else {
              // API Route를 통해 서버사이드에서 생성
              console.log('🔧 서버사이드 프로필 생성 API 호출...');
              
              const response = await fetch('/api/auth/create-profile', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: data.user.id,
                  email: data.user.email,
                  name: metadata?.name || '사용자',
                  organizationId: defaultOrg.id
                }),
              });

              if (response.ok) {
                const result = await response.json();
                console.log('✅ 서버사이드 프로필 생성 성공:', result);
                profileCreated = true;
              } else {
                console.warn('⚠️  서버사이드 프로필 생성 실패, 클라이언트 방식으로 시도...');
                
                // 클라이언트에서 직접 시도 (RLS 정책에 막힐 수 있음)
                const identityData = {
                  email: data.user.email,
                  full_name: metadata?.name || '사용자',
                  auth_user_id: data.user.id,
                  is_active: true
                };

                const { data: newIdentity, error: identityError } = await supabaseAuthService.supabase
                  .from('unified_identities')
                  .insert(identityData)
                  .select()
                  .single();

                if (identityError) {
                  console.warn('⚠️  클라이언트 unified_identities 생성 실패:', identityError.message);
                } else {
                  console.log('✅ 클라이언트 unified_identities 생성 성공');
                  profileCreated = true;

                  // role_assignments 생성
                  const roleData = {
                    identity_id: newIdentity.id,
                    organization_id: defaultOrg.id,
                    role: 'WORKER',
                    is_active: true,
                    employee_code: `EMP${Date.now()}`,
                    department: '일반',
                    position: '사원'
                  };

                  const { error: roleError } = await supabaseAuthService.supabase
                    .from('role_assignments')
                    .insert(roleData);

                  if (roleError) {
                    console.warn('⚠️  role_assignments 생성 실패:', roleError.message);
                  } else {
                    console.log('✅ role_assignments 생성 성공');
                  }
                }
              }
            }
          } catch (profileError) {
            console.error('❌ 프로필 생성 중 오류:', profileError);
          }
        }

        // 이메일 인증이 필요한 경우
        if (!data.session) {
          console.log('📧 이메일 인증 필요');
          return { 
            needsVerification: true,
            user: undefined 
          };
        }

        // 즉시 로그인된 경우 - unified_identities에서 사용자 정보 조회
        console.log('🔍 사용자 정보 조회 중...');
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

        let user: User | undefined;
        if (identity) {
          const primaryRole = identity.role_assignments?.[0];
          user = {
            id: identity.id,
            email: identity.email || '',
            name: identity.full_name || metadata?.name || '',
            role: primaryRole?.role || 'WORKER',
            approvalStatus: 'APPROVED',
            employee: {
              ...identity,
              employee_code: primaryRole?.employee_code,
              department: primaryRole?.department,
              position: primaryRole?.position,
              organization: primaryRole?.organizations_v3
            }
          };
          console.log('✅ 사용자 정보 매핑 완료:', user.name);
        } else {
          console.warn('⚠️  unified_identities에서 사용자를 찾을 수 없습니다.');
          // 기본 사용자 객체라도 반환
          user = {
            id: data.user.id,
            email: data.user.email || '',
            name: metadata?.name || '사용자',
            role: 'WORKER',
            approvalStatus: 'PENDING'
          };
        }

        return { user };
      }

      return { 
        error: {
          code: 'SIGNUP_FAILED',
          message: '회원가입에 실패했습니다',
        }
      };
    } catch (error: any) {
      console.error('❌ SignUp error in context:', error);
      
      const authError: AuthError = {
        code: 'UNEXPECTED_ERROR',
        message: '예상치 못한 오류가 발생했습니다',
        details: error.message,
      };

      return { error: authError };
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
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
    signUp,
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