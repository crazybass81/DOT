import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabaseAuthService, User, AuthState } from '@/services/supabaseAuthService';

// Auth Context
interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, metadata?: { name?: string }) => Promise<{ user: User | null; session: Session | null; needsVerification: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<{ user: User | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  linkEmployeeAccount: (employeeData: {
    name: string;
    phone?: string;
    employeeCode?: string;
    branchId?: string;
    departmentId?: string;
    positionId?: string;
  }) => Promise<any>;
  refreshUser: () => Promise<void>;
  isMasterAdmin: () => Promise<boolean>;
  isApproved: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false
  });

  const refreshUser = async () => {
    try {
      const [user, session] = await Promise.all([
        supabaseAuthService.getCurrentUser(),
        supabaseAuthService.getSession()
      ]);

      setAuthState({
        user,
        session,
        isLoading: false,
        isAuthenticated: !!user
      });
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false
      });
    }
  };

  useEffect(() => {
    // Initial session check
    refreshUser();

    // Listen for auth changes
    const unsubscribe = supabaseAuthService.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false
          });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshUser();
        } else if (event === 'USER_UPDATED') {
          await refreshUser();
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    signUp: supabaseAuthService.signUp.bind(supabaseAuthService),
    verifyOtp: supabaseAuthService.verifyOtp.bind(supabaseAuthService),
    signIn: supabaseAuthService.signIn.bind(supabaseAuthService),
    signOut: supabaseAuthService.signOut.bind(supabaseAuthService),
    resetPassword: supabaseAuthService.resetPassword.bind(supabaseAuthService),
    updatePassword: supabaseAuthService.updatePassword.bind(supabaseAuthService),
    linkEmployeeAccount: supabaseAuthService.linkEmployeeAccount.bind(supabaseAuthService),
    refreshUser,
    isMasterAdmin: supabaseAuthService.isMasterAdmin.bind(supabaseAuthService),
    isApproved: supabaseAuthService.isApproved.bind(supabaseAuthService)
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within an AuthProvider');
  }
  return context;
}

// Standalone hook for non-context usage
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false
  });

  const refreshUser = async () => {
    try {
      const [user, session] = await Promise.all([
        supabaseAuthService.getCurrentUser(),
        supabaseAuthService.getSession()
      ]);

      setAuthState({
        user,
        session,
        isLoading: false,
        isAuthenticated: !!user
      });
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false
      });
    }
  };

  useEffect(() => {
    refreshUser();

    const unsubscribe = supabaseAuthService.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false
          });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await refreshUser();
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return {
    ...authState,
    refreshUser,
    signUp: supabaseAuthService.signUp.bind(supabaseAuthService),
    verifyOtp: supabaseAuthService.verifyOtp.bind(supabaseAuthService),
    signIn: supabaseAuthService.signIn.bind(supabaseAuthService),
    signOut: supabaseAuthService.signOut.bind(supabaseAuthService),
    resetPassword: supabaseAuthService.resetPassword.bind(supabaseAuthService),
    updatePassword: supabaseAuthService.updatePassword.bind(supabaseAuthService),
    linkEmployeeAccount: supabaseAuthService.linkEmployeeAccount.bind(supabaseAuthService),
    isMasterAdmin: supabaseAuthService.isMasterAdmin.bind(supabaseAuthService),
    isApproved: supabaseAuthService.isApproved.bind(supabaseAuthService)
  };
}