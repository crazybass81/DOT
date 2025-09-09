/**
 * Unified Authentication Service
 * Consolidates all authentication functionality for the DOT Attendance Service
 * 
 * Features:
 * - Supabase Auth integration with RLS policies
 * - 4-tier role hierarchy (MASTER_ADMIN, ADMIN, MANAGER, WORKER)
 * - Multi-tenant organization isolation
 * - Real-time auth state management
 * - TypeScript support with comprehensive error handling
 * - Production-ready security practices
 */

import { 
  createClient,
  SupabaseClient,
  AuthResponse, 
  AuthError, 
  Session, 
  User as SupabaseUser,
  AuthChangeEvent
} from '@supabase/supabase-js';
import { UserRole } from '../types/user.types';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Unified User interface
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  roles?: string[];
  approvalStatus?: string;
  employee?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    position?: string;
    is_active: boolean;
    organization_id?: string;
  };
  organizationId?: string;
  isVerified?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error?: string;
}

/**
 * Sign up result interface
 */
export interface SignUpResult {
  user: User | null;
  session: Session | null;
  needsVerification: boolean;
  error?: string;
}

/**
 * Authentication service class
 */
export class AuthService {
  private static instance: AuthService;
  private supabase: SupabaseClient;
  private authStateChangeCallbacks: ((event: AuthChangeEvent, session: Session | null) => void)[] = [];

  private constructor() {
    this.supabase = supabase;
    this.initializeAuthListener();
  }

  /**
   * Singleton instance getter
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize auth state listener
   */
  private initializeAuthListener(): void {
    try {
      this.supabase.auth.onAuthStateChange((event, session) => {
        // Notify all registered callbacks
        this.authStateChangeCallbacks.forEach(callback => {
          callback(event, session);
        });
      });
    } catch (error) {
      console.error('Failed to initialize auth listener:', error);
    }
  }

  /**
   * Register auth state change callback
   */
  public onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
    this.authStateChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Sign up a new user
   */
  public async signUp(
    email: string, 
    password: string, 
    metadata?: { name?: string; role?: string }
  ): Promise<SignUpResult> {
    try {
      const result = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: metadata?.name || email.split('@')[0],
            full_name: metadata?.name || email.split('@')[0]
          },
          emailRedirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/verify`
            : undefined
        }
      });

      const { data, error } = result;

      if (error) {
        console.error('Sign up error:', error);
        return {
          user: null,
          session: null,
          needsVerification: false,
          error: error.message
        };
      }

      if (!data.user) {
        return {
          user: null,
          session: null,
          needsVerification: false,
          error: 'Failed to create user'
        };
      }

      const needsVerification = !data.session && !!data.user && !data.user.email_confirmed_at;
      const user = data.user ? await this.mapSupabaseUserToUser(data.user) : null;

      return {
        user,
        session: data.session,
        needsVerification
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return {
        user: null,
        session: null,
        needsVerification: false,
        error: error.message || 'Failed to sign up'
      };
    }
  }

  /**
   * Verify email with OTP
   */
  public async verifyOtp(email: string, token: string): Promise<{ user: User | null; session: Session | null }> {
    try {
      const { data, error }: AuthResponse = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) {
        console.error('OTP verification error:', error);
        throw new Error(error.message);
      }

      const user = data.user ? await this.mapSupabaseUserToUser(data.user) : null;

      return {
        user,
        session: data.session
      };
    } catch (error: any) {
      console.error('OTP verification error:', error);
      throw new Error(error.message || 'Failed to verify email');
    }
  }

  /**
   * Sign in a user
   */
  public async signIn(email: string, password: string): Promise<User> {
    try {
      const result = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      const { data, error } = result;

      if (error) {
        console.error('Sign in error:', error);
        // Handle email not confirmed case gracefully
        if (error.message === 'Email not confirmed') {
          console.log('Email not confirmed but proceeding with login');
          const { data: userData } = await this.supabase.auth.getUser();
          if (userData?.user) {
            const user = await this.mapSupabaseUserToUser(userData.user);
            if (user) return user;
          }
        }
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('Invalid credentials');
      }

      const user = await this.mapSupabaseUserToUser(data.user);
      
      if (!user) {
        throw new Error('Failed to load user data');
      }

      return user;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  /**
   * Sign out the current user
   */
  public async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  /**
   * Get the current authenticated user
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user: supabaseUser }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        console.error('Get user error:', error);
        return null;
      }

      if (!supabaseUser) {
        return null;
      }

      return await this.mapSupabaseUserToUser(supabaseUser);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get the current session
   */
  public async getSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('Get session error:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * Get the current session token
   */
  public async getSessionToken(): Promise<string | null> {
    try {
      const session = await this.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Failed to get session token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    try {
      const session = await this.getSession();
      return !!session?.user;
    } catch {
      return false;
    }
  }

  /**
   * Reset password
   */
  public async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' 
          ? `${window.location.origin}/auth/reset-password`
          : undefined
      });

      if (error) {
        console.error('Reset password error:', error);
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Failed to send reset password email');
    }
  }

  /**
   * Update password
   */
  public async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Update password error:', error);
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Update password error:', error);
      throw new Error(error.message || 'Failed to update password');
    }
  }

  /**
   * Check if user has master admin privileges
   */
  public async isMasterAdmin(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      // Check for master admin role in role_assignments via unified_identities
      const { data: roles, error } = await this.supabase
        .from('role_assignments')
        .select(`
          role,
          is_active,
          unified_identities!inner (
            auth_user_id
          )
        `)
        .eq('role', 'master_admin')
        .eq('is_active', true)
        .eq('unified_identities.auth_user_id', user.id)
        .limit(1);

      if (error) {
        console.log('Master admin check error:', error.message);
        return false;
      }

      return roles && roles.length > 0;
    } catch (error) {
      console.error('Master admin check error:', error);
      return false;
    }
  }

  /**
   * Check if user is verified
   */
  public async isVerified(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      // Check verification status in unified_identities
      const { data: identity, error } = await this.supabase
        .from('unified_identities')
        .select('is_verified, business_verification_status')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !identity) {
        console.log('Verification check error:', error?.message);
        return false;
      }

      return identity.is_verified || identity.business_verification_status === 'verified';
    } catch (error) {
      console.error('Verification check error:', error);
      return false;
    }
  }

  /**
   * Check if user has specific role
   */
  public async hasRole(role: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      // Check for specific role in role_assignments via unified_identities
      const { data: roles, error } = await this.supabase
        .from('role_assignments')
        .select(`
          role,
          is_active,
          unified_identities!inner (
            auth_user_id
          )
        `)
        .eq('role', role.toLowerCase())
        .eq('is_active', true)
        .eq('unified_identities.auth_user_id', user.id)
        .limit(1);

      if (error) {
        console.log(`Role check error for ${role}:`, error.message);
        return false;
      }

      return roles && roles.length > 0;
    } catch (error) {
      console.error(`Role check error for ${role}:`, error);
      return false;
    }
  }

  /**
   * Get user's roles
   */
  public async getUserRoles(): Promise<string[]> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return [];

      // Get all active roles for user via unified_identities
      const { data: roles, error } = await this.supabase
        .from('role_assignments')
        .select(`
          role,
          is_active,
          organization_id,
          unified_identities!inner (
            auth_user_id
          )
        `)
        .eq('is_active', true)
        .eq('unified_identities.auth_user_id', user.id);

      if (error) {
        console.log('Get user roles error:', error.message);
        return [];
      }

      return (roles || []).map(r => r.role);
    } catch (error) {
      console.error('Get user roles error:', error);
      return [];
    }
  }

  /**
   * Link employee account to Supabase user
   */
  public async linkEmployeeAccount(employeeData: {
    name: string;
    phone?: string;
    employeeCode?: string;
    branchId?: string;
    departmentId?: string;
    positionId?: string;
  }): Promise<any> {
    try {
      const session = await this.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      // Check if unified identity already exists
      const { data: existingIdentity } = await this.supabase
        .from('unified_identities')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();

      if (existingIdentity) {
        // Return existing identity mapped to Employee interface
        return {
          id: existingIdentity.id,
          user_id: session.user.id,
          name: existingIdentity.full_name,
          email: existingIdentity.email,
          phone: existingIdentity.phone,
          employee_code: employeeData.employeeCode || null,
          position: 'EMPLOYEE',
          is_active: existingIdentity.is_active,
          organization_id: null,
          created_at: existingIdentity.created_at,
          updated_at: existingIdentity.updated_at
        };
      }

      // Create new unified identity
      const { data: identity, error } = await this.supabase
        .from('unified_identities')
        .insert({
          auth_user_id: session.user.id,
          email: session.user.email!,
          full_name: employeeData.name,
          phone: employeeData.phone,
          id_type: 'personal',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Link employee account error:', error);
        throw new Error(error.message);
      }

      // Return unified identity mapped to Employee interface for backward compatibility
      return {
        id: identity.id,
        user_id: session.user.id,
        name: identity.full_name,
        email: identity.email,
        phone: identity.phone,
        employee_code: employeeData.employeeCode || null,
        position: 'EMPLOYEE',
        is_active: identity.is_active,
        organization_id: null,
        created_at: identity.created_at,
        updated_at: identity.updated_at
      };
    } catch (error: any) {
      console.error('Link employee account error:', error);
      throw new Error(error.message || 'Failed to link employee account');
    }
  }

  /**
   * Legacy method compatibility for backward compatibility
   */
  public async confirmSignUp(email: string, code: string): Promise<boolean> {
    try {
      const result = await this.verifyOtp(email, code);
      return !!result.user;
    } catch (error) {
      console.error('Confirm sign up error:', error);
      return false;
    }
  }

  /**
   * Legacy method - returns null for synchronous access
   */
  public getAccessToken(): string | null {
    // Synchronous method for backward compatibility
    // Returns null and should be replaced with async getSessionToken
    return null;
  }

  /**
   * Map Supabase user to our User interface
   */
  private async mapSupabaseUserToUser(supabaseUser: SupabaseUser): Promise<User | null> {
    try {
      // Base user information
      const baseUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.full_name || 
              supabaseUser.user_metadata?.name || 
              supabaseUser.email?.split('@')[0] || 
              'User'
      };

      // Get unified identity information
      try {
        const { data: identity, error } = await this.supabase
          .from('unified_identities')
          .select(`
            id, 
            email, 
            full_name, 
            phone, 
            id_type,
            is_verified, 
            is_active,
            profile_data
          `)
          .eq('auth_user_id', supabaseUser.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!error && identity) {
          // Update user with identity info
          baseUser.name = identity.full_name || baseUser.name;
          baseUser.isVerified = identity.is_verified;
          baseUser.role = 'EMPLOYEE'; // Default role

          // Get role assignments for this identity
          try {
            const { data: roles, error: roleError } = await this.supabase
              .from('role_assignments')
              .select(`
                role,
                is_primary,
                is_active,
                organization_id
              `)
              .eq('identity_id', identity.id)
              .eq('is_active', true)
              .order('is_primary', { ascending: false });

            if (!roleError && roles && roles.length > 0) {
              // Use primary role, or first active role
              const primaryRole = roles.find(r => r.is_primary) || roles[0];
              baseUser.role = primaryRole.role.toUpperCase();
              baseUser.roles = roles.map(r => r.role);
              baseUser.organizationId = primaryRole.organization_id;
            }
          } catch (roleError) {
            console.log('Role lookup error, using default role');
          }

          // Store employee info for backward compatibility
          baseUser.employee = {
            id: identity.id,
            name: identity.full_name,
            email: identity.email,
            phone: identity.phone,
            position: baseUser.role,
            is_active: identity.is_active,
            organization_id: baseUser.organizationId
          };

        } else if (error && !error.message.includes('No rows found')) {
          console.log('Unified identity query error:', error.message);
        } else {
          // Auto-create unified identity if none exists
          console.log('No unified identity found, attempting auto-creation');
          await this.autoCreateUnifiedIdentity(supabaseUser);
        }
      } catch (identityError) {
        console.log('Unified identity lookup error:', identityError);
      }

      return baseUser;
    } catch (error) {
      console.error('Error mapping Supabase user:', error);
      // Return basic info in worst case
      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.email?.split('@')[0] || 'User'
      };
    }
  }

  /**
   * Auto-create unified identity for auth user
   */
  private async autoCreateUnifiedIdentity(supabaseUser: SupabaseUser): Promise<void> {
    try {
      console.log('Auto-creating unified identity for:', supabaseUser.email);

      const identityData = {
        auth_user_id: supabaseUser.id,
        email: supabaseUser.email!,
        full_name: supabaseUser.user_metadata?.full_name || 
                   supabaseUser.user_metadata?.name || 
                   supabaseUser.email?.split('@')[0] || 
                   'User',
        phone: supabaseUser.user_metadata?.phone || null,
        id_type: 'personal',
        business_verification_status: 'verified',
        is_verified: true,
        is_active: true,
        profile_data: {}
      };

      const { data: identity, error } = await this.supabase
        .from('unified_identities')
        .insert(identityData)
        .select()
        .single();

      if (!error && identity) {
        console.log('Unified identity auto-created:', identity.id);
        
        // Try to create default worker role assignment
        try {
          await this.supabase
            .from('role_assignments')
            .insert({
              identity_id: identity.id,
              organization_id: null,
              role: 'worker',
              is_active: true,
              is_primary: true,
              assigned_at: new Date().toISOString()
            });
          console.log('Default role assigned');
        } catch (roleError) {
          console.log('Default role assignment failed (will be done by admin)');
        }
      } else {
        console.log('Failed to auto-create unified identity:', error?.message);
      }
    } catch (error) {
      console.error('Auto-create unified identity error:', error);
    }
  }

  /**
   * Get Supabase client instance
   */
  public getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Export legacy interfaces for backward compatibility
export { supabase };
export const supabaseAuthService = authService;
export type { AuthChangeEvent, Session, SupabaseUser };