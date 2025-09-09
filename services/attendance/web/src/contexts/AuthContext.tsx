'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { authService, User } from '../services/authService';
import { UserRole } from '../types/user.types';

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
  const supabase = createClientComponentClient();

  /**
   * Initialize auth state
   */
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth initialization error:', error);
          if (isMounted) {
            dispatch({ type: 'SET_ERROR', payload: error.message });
          }
          return;
        }

        if (isMounted) {
          dispatch({
            type: 'SET_USER',
            payload: { user: session?.user || null, session },
          });

          // Load identity if user exists
          if (session?.user) {
            await loadUserIdentity(session.user);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        dispatch({
          type: 'SET_USER',
          payload: { user: session?.user || null, session },
        });

        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserIdentity(session.user);
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'SET_IDENTITY', payload: null });
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  /**
   * Load user identity context
   */
  const loadUserIdentity = async (user: User) => {
    try {
      const response = await fetch('/api/auth', {
        headers: {
          Authorization: `Bearer ${user.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_IDENTITY', payload: data.identity });
      }
    } catch (error) {
      console.error('Failed to load user identity:', error);
    }
  };

  /**
   * Sign in method
   */
  const signIn = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // The auth state change listener will handle updating the state
        return { success: true };
      } else {
        const errorMessage = data.error || 'Login failed';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = 'Network error occurred';
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
      await fetch('/api/auth', { method: 'DELETE' });
      await supabase.auth.signOut();
      dispatch({ type: 'SIGN_OUT' });
    } catch (error) {
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
    if (!state.session?.refresh_token) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await fetch('/api/auth', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: state.session.refresh_token,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({
          type: 'SET_USER',
          payload: { user: data.user, session: data.session },
        });
        dispatch({ type: 'SET_IDENTITY', payload: data.identity });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
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
    if (!state.identity?.roles) return false;
    return state.identity.roles.some((r: any) => r.role === role);
  };

  /**
   * Check if user has specific permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!state.identity) return false;
    
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
    if (!state.identity?.roles || state.identity.roles.length === 0) {
      return null;
    }
    
    // Return the highest priority role
    const roles = state.identity.roles.map((r: any) => r.role);
    
    if (roles.includes(UserRole.SUPER_ADMIN)) return UserRole.SUPER_ADMIN;
    if (roles.includes(UserRole.BUSINESS_ADMIN)) return UserRole.BUSINESS_ADMIN;
    if (roles.includes(UserRole.EMPLOYEE)) return UserRole.EMPLOYEE;
    
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