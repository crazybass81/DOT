import { 
  AuthResponse, 
  AuthError, 
  Session, 
  User as SupabaseUser,
  AuthChangeEvent
} from '@supabase/supabase-js';
import { supabase, Employee } from '@/lib/supabase-config';

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
    supabase.auth.onAuthStateChange((event, session) => {
      // Notify all registered callbacks
      this.authStateChangeCallbacks.forEach(callback => {
        callback(event, session);
      });
    });
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
      const { data, error }: AuthResponse = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: metadata?.name || email.split('@')[0]
          },
          emailRedirectTo: `${window.location.origin}/auth/verify`
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Failed to create user');
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
      const { data, error }: AuthResponse = await supabase.auth.signInWithPassword({
        email,
        password
      });

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
      const { error } = await supabase.auth.signOut();
      
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
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      
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
      const { data: { session }, error } = await supabase.auth.getSession();
      
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
   * Link employee account to Supabase user
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

      // Check if employee record already exists
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();

      if (existingEmployee) {
        return existingEmployee;
      }

      // Create new employee record
      const { data: employee, error } = await supabase
        .from('employees')
        .insert({
          auth_user_id: session.user.id,
          organization_id: '00000000-0000-0000-0000-000000000001', // Default org
          branch_id: employeeData.branchId || '00000000-0000-0000-0000-000000000002',
          department_id: employeeData.departmentId || '00000000-0000-0000-0000-000000000003',
          position_id: employeeData.positionId || '00000000-0000-0000-0000-000000000004',
          employee_code: employeeData.employeeCode,
          name: employeeData.name,
          email: session.user.email!,
          phone: employeeData.phone,
          approval_status: 'PENDING',
          role: 'EMPLOYEE',
          is_master_admin: false,
          is_active: false
        })
        .select()
        .single();

      if (error) {
        console.error('Link employee account error:', error);
        throw new Error(error.message);
      }

      return employee;
    } catch (error: any) {
      console.error('Link employee account error:', error);
      throw new Error(error.message || 'Failed to link employee account');
    }
  }

  /**
   * Map Supabase user to our User interface
   */
  private async mapSupabaseUserToUser(supabaseUser: SupabaseUser): Promise<User | null> {
    try {
      const baseUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0]
      };

      // Try to get employee data - user_id 컬럼 사용
      try {
        const { data: employee, error } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', supabaseUser.id)
          .single();

        if (!error && employee) {
          baseUser.role = employee.position || 'EMPLOYEE';
          baseUser.employee = employee;
          baseUser.name = employee.name || baseUser.name;
        }
      } catch (empError) {
        // employees 테이블 조회 실패는 무시
        console.log('Employee data not found or table error');
      }

      return baseUser;
    } catch (error) {
      console.error('Error mapping Supabase user:', error);
      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0]
      };
    }
  }

  /**
   * Check if user has master admin privileges
   */
  async isMasterAdmin(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user?.employee?.is_master_admin === true;
    } catch {
      return false;
    }
  }

  /**
   * Check if user is approved
   */
  async isApproved(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user?.approvalStatus === 'APPROVED';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const supabaseAuthService = new SupabaseAuthService();