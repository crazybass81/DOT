import { supabaseAuthService, User as SupabaseUser } from './supabaseAuthService';

export interface UnifiedUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  approvalStatus?: string;
  employee?: any;
  authProvider: 'supabase';
  metadata?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  user?: UnifiedUser;
  error?: string;
  requiresAction?: 'verify_email' | 'change_password' | 'setup_mfa';
}

/**
 * Unified Authentication Service
 * Uses Supabase as the single authentication provider
 */
export class UnifiedAuthService {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, metadata?: { name?: string; role?: string }): Promise<AuthResult> {
    try {
      const result = await supabaseAuthService.signUp(email, password, metadata);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Sign up failed'
        };
      }

      const user = await this.mapSupabaseUserToUnified(result.user);
      
      return {
        success: true,
        user,
        requiresAction: result.emailVerificationRequired ? 'verify_email' : undefined
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error.message || 'Sign up failed'
      };
    }
  }

  /**
   * Verify email with confirmation code
   */
  async verifySignUp(email: string, code: string): Promise<AuthResult> {
    try {
      const result = await supabaseAuthService.verifyOtp(email, code);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Email verification failed'
        };
      }

      const user = result.user ? await this.mapSupabaseUserToUnified(result.user) : undefined;
      
      return {
        success: true,
        user
      };
    } catch (error: any) {
      console.error('Email verification error:', error);
      return {
        success: false,
        error: error.message || 'Email verification failed'
      };
    }
  }

  /**
   * Sign in user
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const user = await supabaseAuthService.signIn(email, password);
      
      if (!user) {
        return {
          success: false,
          error: 'Sign in failed'
        };
      }

      const unifiedUser = await this.mapSupabaseUserToUnified(user);
      
      return {
        success: true,
        user: unifiedUser
      };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message || 'Sign in failed'
      };
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      await supabaseAuthService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if signout fails, we should clear local state
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<UnifiedUser | null> {
    try {
      const supabaseUser = await supabaseAuthService.getCurrentUser();
      if (supabaseUser) {
        return await this.mapSupabaseUserToUnified(supabaseUser);
      }
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get session token
   */
  async getSessionToken(): Promise<string | null> {
    try {
      return await supabaseAuthService.getSessionToken();
    } catch (error) {
      console.error('Get session token error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<AuthResult> {
    try {
      const result = await supabaseAuthService.resetPasswordForEmail(email);
      
      return {
        success: result.success,
        error: result.error
      };
    } catch (error: any) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        error: error.message || 'Password reset request failed'
      };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      const result = await supabaseAuthService.updatePassword(newPassword);
      
      return {
        success: result.success,
        error: result.error
      };
    } catch (error: any) {
      console.error('Update password error:', error);
      return {
        success: false,
        error: error.message || 'Password update failed'
      };
    }
  }

  /**
   * Map Supabase user to unified format
   */
  private async mapSupabaseUserToUnified(supabaseUser: SupabaseUser | null | undefined): Promise<UnifiedUser | undefined> {
    if (!supabaseUser) return undefined;

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.name || supabaseUser.email?.split('@')[0],
      role: supabaseUser.role || 'employee',
      approvalStatus: supabaseUser.approvalStatus,
      employee: supabaseUser.employee,
      authProvider: 'supabase',
      metadata: supabaseUser.user_metadata || {}
    };
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<AuthResult> {
    try {
      const session = await supabaseAuthService.refreshSession();
      
      if (!session) {
        return {
          success: false,
          error: 'Session refresh failed'
        };
      }

      const user = await supabaseAuthService.getCurrentUser();
      const unifiedUser = await this.mapSupabaseUserToUnified(user);

      return {
        success: true,
        user: unifiedUser
      };
    } catch (error: any) {
      console.error('Session refresh error:', error);
      return {
        success: false,
        error: error.message || 'Session refresh failed'
      };
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: 'google' | 'github' | 'facebook'): Promise<AuthResult> {
    try {
      const result = await supabaseAuthService.signInWithOAuth(provider);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'OAuth sign in failed'
        };
      }

      // OAuth redirects, so user will be available after redirect
      return {
        success: true
      };
    } catch (error: any) {
      console.error('OAuth sign in error:', error);
      return {
        success: false,
        error: error.message || 'OAuth sign in failed'
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: { name?: string; metadata?: Record<string, any> }): Promise<AuthResult> {
    try {
      const result = await supabaseAuthService.updateUser(updates);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Profile update failed'
        };
      }

      const user = await supabaseAuthService.getCurrentUser();
      const unifiedUser = await this.mapSupabaseUserToUnified(user);

      return {
        success: true,
        user: unifiedUser
      };
    } catch (error: any) {
      console.error('Profile update error:', error);
      return {
        success: false,
        error: error.message || 'Profile update failed'
      };
    }
  }
}

// Export singleton instance
export const unifiedAuthService = new UnifiedAuthService();