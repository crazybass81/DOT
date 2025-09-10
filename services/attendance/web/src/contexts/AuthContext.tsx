'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService, type AuthState, type LoginResult, type AuthError } from '@/src/services/authService';
import { type LoginFormData, type User, type UserRole } from '@/src/schemas/auth.schema';

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  identity: any | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

/**
 * Authentication actions
 */
export type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User | null; session: Session | null } }
  | { type: 'SET_IDENTITY'; payload: any | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SIGN_OUT' };

/**
 * Initial auth state
 */
const initialState: AuthState = {
  user: null,
  session: null,
  identity: null,
  loading: true,
  error: null,
  initialized: false,
};

/**
 * Auth reducer
 */
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        session: action.payload.session,
        loading: false,
        error: null,
      };
    
    case 'SET_IDENTITY':
      return { ...state, identity: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload };
    
    case 'SIGN_OUT':
      return {
        ...state,
        user: null,
        session: null,
        identity: null,
        loading: false,
        error: null,
      };
    
    default:
      return state;
  }
}

/**
 * Authentication context type
 */
interface AuthContextType {
  // State
  user: User | null;
  session: Session | null;
  identity: any | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  
  // Methods
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  
  // Utility methods
  isAuthenticated: () => boolean;
  hasRole: (role: UserRole | string) => boolean;
  hasPermission: (permission: string) => boolean;
  getUserRole: () => UserRole | null;
}

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * Initialize auth state
   */
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const session = await authService.getSession();
        
        if (isMounted) {
          if (session?.user) {
            // Get user with identity context
            const user = await authService.getCurrentUser();
            dispatch({
              type: 'SET_USER',
              payload: { user, session },
            });

            if (user) {
              dispatch({ type: 'SET_IDENTITY', payload: user.employee });
            }
          } else {
            dispatch({
              type: 'SET_USER',
              payload: { user: null, session: null },
            });
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (isMounted) {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication' });
        }
      } finally {
        if (isMounted) {
          dispatch({ type: 'SET_INITIALIZED', payload: true });
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        if (session?.user) {
          const user = await authService.getCurrentUser();
          dispatch({
            type: 'SET_USER',
            payload: { user, session },
          });

          if (event === 'SIGNED_IN' && user) {
            dispatch({ type: 'SET_IDENTITY', payload: user.employee });
          }
        } else {
          dispatch({
            type: 'SET_USER',
            payload: { user: null, session: null },
          });
          
          if (event === 'SIGNED_OUT') {
            dispatch({ type: 'SET_IDENTITY', payload: null });
          }
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  /**
   * Sign in method
   */
  const signIn = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const user = await authService.signIn(email, password);
      // The auth state change listener will handle updating the state
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Sign out method
   */
  const signOut = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await authService.signOut();
      dispatch({ type: 'SIGN_OUT' });
    } catch (error: any) {
      console.error('Sign out error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Sign out failed' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Refresh authentication
   */
  const refresh = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const session = await authService.getSession();
      if (session?.user) {
        const user = await authService.getCurrentUser();
        dispatch({
          type: 'SET_USER',
          payload: { user, session },
        });
        if (user) {
          dispatch({ type: 'SET_IDENTITY', payload: user.employee });
        }
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Session refresh failed' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Clear error
   */
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = (): boolean => {
    return !!(state.user && state.session);
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role: UserRole | string): boolean => {
    if (!state.user?.roles) {
      // Fallback to single role check
      return state.user?.role?.toLowerCase() === role.toString().toLowerCase();
    }
    return state.user.roles.some((r: string) => r.toLowerCase() === role.toString().toLowerCase());
  };

  /**
   * Check if user has specific permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!state.user) return false;
    
    // Super admin has all permissions
    if (hasRole(UserRole.SUPER_ADMIN)) return true;
    
    // Business admin has business-level permissions
    if (hasRole(UserRole.BUSINESS_ADMIN)) {
      const businessPermissions = [
        'manage_employees',
        'view_reports',
        'approve_registrations',
        'manage_settings'
      ];
      return businessPermissions.includes(permission);
    }
    
    // Employee has limited permissions
    if (hasRole(UserRole.EMPLOYEE)) {
      const employeePermissions = [
        'check_in',
        'check_out',
        'view_own_records'
      ];
      return employeePermissions.includes(permission);
    }
    
    return false;
  };

  /**
   * Get user's primary role
   */
  const getUserRole = (): UserRole | null => {
    if (!state.user?.role) {
      return null;
    }
    
    const role = state.user.role.toUpperCase();
    
    if (role === UserRole.SUPER_ADMIN) return UserRole.SUPER_ADMIN;
    if (role === UserRole.BUSINESS_ADMIN) return UserRole.BUSINESS_ADMIN;
    if (role === UserRole.EMPLOYEE) return UserRole.EMPLOYEE;
    
    return null;
  };

  const contextValue: AuthContextType = {
    // State
    user: state.user,
    session: state.session,
    identity: state.identity,
    loading: state.loading,
    error: state.error,
    initialized: state.initialized,
    
    // Methods
    signIn,
    signOut,
    refresh,
    clearError,
    
    // Utility methods
    isAuthenticated,
    hasRole,
    hasPermission,
    getUserRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Authentication hook
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Authentication guard hook
 */
export function useAuthGuard(requiredRole?: UserRole | string) {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.initialized || auth.loading) return;
    
    if (!auth.isAuthenticated()) {
      // Redirect to login or show login modal
      window.location.href = '/login';
      return;
    }
    
    if (requiredRole && !auth.hasRole(requiredRole)) {
      // Redirect to unauthorized page
      window.location.href = '/unauthorized';
      return;
    }
  }, [auth.initialized, auth.loading, auth.user, requiredRole]);
  
  return {
    isAuthenticated: auth.isAuthenticated(),
    hasRequiredRole: requiredRole ? auth.hasRole(requiredRole) : true,
    loading: auth.loading || !auth.initialized,
  };
}