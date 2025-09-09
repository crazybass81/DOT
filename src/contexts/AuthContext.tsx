/**
 * Authentication Context Provider for ID-ROLE-PAPER System
 * Manages user authentication state, identity context, and permissions
 * 
 * Features:
 * - JWT token management with automatic refresh
 * - User identity and role context
 * - Permission checking and role validation
 * - Session persistence and cleanup
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { RoleType, IdentityWithContext } from '../types/id-role-paper';

interface AuthContextType {
  user: User | null;
  identity: IdentityWithContext | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshIdentity: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: RoleType) => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [identity, setIdentity] = useState<IdentityWithContext | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user and identity on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await loadUserIdentity(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIdentity(null);
        localStorage.removeItem('access_token');
      } else if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        localStorage.setItem('access_token', session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        localStorage.setItem('access_token', session.access_token);
        await loadUserIdentity(session.user.id);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserIdentity = async (userId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch('/api/identity?userId=' + userId, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          setIdentity(data.data[0]);
        }
      } else {
        console.warn('Failed to load user identity:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading user identity:', error);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session?.access_token) {
        localStorage.setItem('access_token', data.session.access_token);
        setUser(data.user);
        await loadUserIdentity(data.user.id);
        return { success: true };
      }

      return { success: false, error: 'Login failed - no session created' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIdentity(null);
      localStorage.removeItem('access_token');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if logout fails, clear local state
      setUser(null);
      setIdentity(null);
      localStorage.removeItem('access_token');
    }
  };

  const refreshIdentity = async () => {
    if (user?.id) {
      await loadUserIdentity(user.id);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!identity?.permissions) return false;
    
    return identity.permissions.some(p => 
      p.resource === permission || 
      p.action === permission ||
      `${p.resource}:${p.action}` === permission
    );
  };

  const hasRole = (role: RoleType): boolean => {
    if (!identity) return false;
    
    return identity.availableRoles.includes(role) || 
           identity.primaryRole === role;
  };

  const contextValue: AuthContextType = {
    user,
    identity,
    loading,
    login,
    logout,
    refreshIdentity,
    hasPermission,
    hasRole,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};