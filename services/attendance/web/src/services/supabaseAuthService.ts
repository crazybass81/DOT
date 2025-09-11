import { 
  AuthResponse, 
  AuthError, 
  Session, 
  User as SupabaseUser,
  AuthChangeEvent
} from '@supabase/supabase-js';
import { supabase, Employee } from '../lib/supabase-config';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  approvalStatus?: string;
  employee?: Employee;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export class SupabaseAuthService {
  public readonly supabase = supabase;
  private authStateChangeCallbacks: ((event: AuthChangeEvent, session: Session | null) => void)[] = [];

  constructor() {
    this.initializeAuthListener();
  }

  /**
   * Initialize auth state listener
   */
  private initializeAuthListener() {
    try {
      if (supabase?.auth?.onAuthStateChange && typeof supabase.auth.onAuthStateChange === 'function') {
        supabase.auth.onAuthStateChange((event, session) => {
          // Notify all registered callbacks
          this.authStateChangeCallbacks.forEach(callback => {
            callback(event, session);
          });
        });
      } else {
        console.log('⚠️ Auth state listener not available in current environment');
      }
    } catch (error) {
      console.error('❌ Failed to initialize auth listener:', error);
    }
  }

  /**
   * Register auth state change callback
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
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
  async signUp(
    email: string, 
    password: string, 
    metadata?: { name?: string }
  ): Promise<{ user: User | null; session: Session | null; needsVerification: boolean }> {
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: metadata?.name || email.split('@')[0],
            full_name: metadata?.name || email.split('@')[0]
          },
          emailRedirectTo: `${window.location.origin}/auth/verify`
        }
      });

      if (!result) {
        throw new Error('No response from authentication service');
      }

      const { data, error } = result;

      if (error) {
        console.error('Sign up error:', error);
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Failed to create user');
      }

      const needsVerification = !data.session && !!data.user && !data.user.email_confirmed_at;
      
      // If user is created and confirmed, create profile
      if (data.user && data.session) {
        await this.createUserProfile(data.user, metadata?.name);
      }
      
      const user = data.user ? await this.mapSupabaseUserToUser(data.user) : null;

      return {
        user,
        session: data.session,
        needsVerification
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  }

  /**
   * Verify email with OTP
   */
  async verifyOtp(email: string, token: string): Promise<{ user: User | null; session: Session | null }> {
    try {
      const { data, error }: AuthResponse = await supabase.auth.verifyOtp({
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
  async signIn(email: string, password: string): Promise<User> {
    try {
      const result = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!result) {
        throw new Error('No response from authentication service');
      }

      const { data, error } = result;

      if (error) {
        console.error('Sign in error:', error);
        // Email not confirmed 에러는 무시하고 진행
        if (error.message === 'Email not confirmed') {
          console.log('Email not confirmed but proceeding with login');
          // 사용자 정보를 직접 생성
          const { data: userData } = await supabase.auth.getUser();
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
  async signOut(): Promise<void> {
    try {
      const result = await supabase.auth.signOut();
      
      if (!result) {
        console.log('Sign out completed (no response object)');
        return;
      }

      const { error } = result;
      
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
  async getCurrentUser(): Promise<User | null> {
    try {
      const result = await supabase.auth.getUser();
      
      if (!result || !result.data) {
        return null;
      }

      const { data: { user: supabaseUser }, error } = result;
      
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
  async getSession(): Promise<Session | null> {
    try {
      const result = await supabase.auth.getSession();
      
      if (!result || !result.data) {
        return null;
      }

      const { data: { session }, error } = result;
      
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
  async getSessionToken(): Promise<string | null> {
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
  async isAuthenticated(): Promise<boolean> {
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
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
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
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
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
   * Link employee account to Supabase user - Updated for unified identity system
   */
  async linkEmployeeAccount(employeeData: {
    name: string;
    phone?: string;
    employeeCode?: string;
    branchId?: string;
    departmentId?: string;
    positionId?: string;
  }): Promise<Employee> {
    try {
      const session = await this.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      // Check if unified identity already exists
      const { data: existingIdentity } = await supabase
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
      const { data: identity, error } = await supabase
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
   * Map Supabase user to our User interface using profiles table
   */
  private async mapSupabaseUserToUser(supabaseUser: SupabaseUser): Promise<User | null> {
    try {
      // 기본 사용자 정보 설정
      const baseUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.full_name || 
              supabaseUser.user_metadata?.name || 
              supabaseUser.email?.split('@')[0] || 
              '사용자',
        role: 'WORKER' // Default role
      };

      // profiles 테이블에서 사용자 정보 가져오기 (RLS 회피를 위해 간단하게)
      try {
        console.log('Looking up profile for auth user:', supabaseUser.id);

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        if (!error && profile) {
          // Profile 정보가 있으면 사용
          if (profile.name) baseUser.name = profile.name;
          if (profile.full_name) baseUser.name = profile.full_name;
          if (profile.role) baseUser.role = profile.role.toUpperCase();
          console.log('✅ Profile found:', profile.id);

          // Store profile info for later use
          baseUser.employee = {
            id: profile.id,
            name: baseUser.name,
            email: baseUser.email,
            phone: profile.phone,
            position: baseUser.role,
            is_active: true
          } as any;

        } else {
          console.log('No profile found, will create one after signup');
        }
      } catch (profileError) {
        console.log('Profile lookup error, using basic info:', profileError);
      }

      return baseUser;
    } catch (error) {
      console.error('Error mapping Supabase user:', error);
      // 최악의 경우에도 기본 정보는 반환
      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.email?.split('@')[0] || '사용자',
        role: 'WORKER'
      };
    }
  }

  /**
   * Create user profile in profiles table
   */
  private async createUserProfile(supabaseUser: SupabaseUser, name?: string): Promise<void> {
    try {
      console.log('🚀 Creating user profile for:', supabaseUser.email);

      const profileData = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || '사용자',
        role: 'worker',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: profile, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (!error && profile) {
        console.log('✅ User profile created:', profile.id);
      } else {
        console.log('❌ Failed to create user profile:', error?.message);
        // Don't throw error, let authentication continue
      }
    } catch (error) {
      console.error('Create user profile error:', error);
      // Don't throw error, let authentication continue
    }
  }

  /**
   * Auto-create unified identity for auth user
   */
  private async autoCreateUnifiedIdentity(supabaseUser: SupabaseUser): Promise<void> {
    try {
      console.log('🚀 Auto-creating unified identity for:', supabaseUser.email);

      const identityData = {
        auth_user_id: supabaseUser.id,
        email: supabaseUser.email!,
        full_name: supabaseUser.user_metadata?.full_name || 
                   supabaseUser.user_metadata?.name || 
                   supabaseUser.email?.split('@')[0] || 
                   '사용자',
        phone: supabaseUser.user_metadata?.phone || null,
        id_type: 'personal', // Default to personal identity
        business_verification_status: 'verified', // Personal identities are auto-verified
        is_verified: true,
        is_active: true,
        profile_data: {}
      };

      const { data: identity, error } = await supabase
        .from('unified_identities')
        .insert(identityData)
        .select()
        .single();

      if (!error && identity) {
        console.log('✅ Unified identity auto-created:', identity.id);
        
        // Create default worker role assignment (no organization initially)
        // Note: This will fail due to RLS, but user can be assigned roles later by admin
        try {
          await supabase
            .from('role_assignments')
            .insert({
              identity_id: identity.id,
              organization_id: null, // No organization initially
              role: 'worker',
              is_active: true,
              is_primary: true,
              assigned_at: new Date().toISOString()
            });
          console.log('✅ Default role assigned');
        } catch (roleError) {
          console.log('⚠️ Default role assignment failed (will be done by admin)');
        }
      } else {
        console.log('❌ Failed to auto-create unified identity:', error?.message);
      }
    } catch (error) {
      console.error('Auto-create unified identity error:', error);
    }
  }

  /**
   * Check if user has master admin privileges using unified identity system
   */
  async isMasterAdmin(): Promise<boolean> {
    try {
      const result = await supabase.auth.getUser();
      
      if (!result || !result.data) {
        return false;
      }

      const { data: { user: supabaseUser } } = result;
      
      if (!supabaseUser) {
        return false;
      }

      // Check for master admin role in role_assignments
      const dbResult = await supabase
        .from('role_assignments')
        .select('role, is_active')
        .eq('role', 'master')
        .eq('is_active', true)
        .inner('unified_identities', 'identity_id', 'id', { 
          auth_user_id: supabaseUser.id 
        })
        .limit(1);

      if (!dbResult) {
        return false;
      }

      const { data: roles, error } = dbResult;

      if (error) {
        console.log('Master admin check error:', error.message);
        return false;
      }

      const hasMasterRole = roles && roles.length > 0;
      console.log('Master admin check result:', hasMasterRole);
      
      return hasMasterRole;
    } catch (error) {
      console.error('Master admin check error:', error);
      return false;
    }
  }

  /**
   * Check if user is verified (replaces approval status)
   */
  async isVerified(): Promise<boolean> {
    try {
      const result = await supabase.auth.getUser();
      
      if (!result || !result.data) {
        return false;
      }

      const { data: { user: supabaseUser } } = result;
      
      if (!supabaseUser) {
        return false;
      }

      // Check verification status in unified_identities
      const { data: identity, error } = await supabase
        .from('unified_identities')
        .select('is_verified, business_verification_status')
        .eq('auth_user_id', supabaseUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !identity) {
        console.log('Verification check error:', error?.message);
        return false;
      }

      const isVerified = identity.is_verified || 
                        identity.business_verification_status === 'verified';
      
      console.log('Verification check result:', isVerified);
      return isVerified;
    } catch (error) {
      console.error('Verification check error:', error);
      return false;
    }
  }

  /**
   * Check if user has specific role
   */
  async hasRole(role: string): Promise<boolean> {
    try {
      const result = await supabase.auth.getUser();
      
      if (!result || !result.data) {
        return false;
      }

      const { data: { user: supabaseUser } } = result;
      
      if (!supabaseUser) {
        return false;
      }

      // Check for specific role in role_assignments
      const { data: roles, error } = await supabase
        .from('role_assignments')
        .select('role, is_active')
        .eq('role', role.toLowerCase())
        .eq('is_active', true)
        .inner('unified_identities', 'identity_id', 'id', { 
          auth_user_id: supabaseUser.id 
        })
        .limit(1);

      if (error) {
        console.log(`Role check error for ${role}:`, error.message);
        return false;
      }

      const hasRole = roles && roles.length > 0;
      console.log(`Role check result for ${role}:`, hasRole);
      
      return hasRole;
    } catch (error) {
      console.error(`Role check error for ${role}:`, error);
      return false;
    }
  }

  /**
   * Get user's roles
   */
  async getUserRoles(): Promise<string[]> {
    try {
      const result = await supabase.auth.getUser();
      
      if (!result || !result.data) {
        return [];
      }

      const { data: { user: supabaseUser } } = result;
      
      if (!supabaseUser) {
        return [];
      }

      // Get all active roles for user
      const { data: roles, error } = await supabase
        .from('role_assignments')
        .select('role, is_active, organization_id')
        .eq('is_active', true)
        .inner('unified_identities', 'identity_id', 'id', { 
          auth_user_id: supabaseUser.id 
        });

      if (error) {
        console.log('Get user roles error:', error.message);
        return [];
      }

      const userRoles = (roles || []).map(r => r.role);
      console.log('User roles:', userRoles);
      
      return userRoles;
    } catch (error) {
      console.error('Get user roles error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const supabaseAuthService = new SupabaseAuthService();