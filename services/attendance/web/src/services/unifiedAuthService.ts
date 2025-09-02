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
   * Unified sign up - always uses Supabase for new users
   */
  async signUp(email: string, password: string, metadata?: { name?: string }): Promise<AuthResult> {
    try {
      const flags = this.getFeatureFlags();
      
      if (!flags.enableSupabaseAuth) {
        // Fallback to Cognito if Supabase is disabled
        const result = await cognitoAuthService.signUp(email, password, metadata?.name);
        const user = await this.mapCognitoUserToUnified(result.userId ? { id: result.userId, email, name: metadata?.name } : null, false);
        
        return {
          success: true,
          user,
          needsVerification: result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP'
        };
      }

      // Use Supabase for new sign-ups
      const result = await supabaseAuthService.signUp(email, password, metadata);
      const user = result.user ? await this.mapSupabaseUserToUnified(result.user, true) : undefined;

      return {
        success: true,
        user,
        needsVerification: result.needsVerification
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify email/phone verification
   */
  async verifySignUp(email: string, code: string): Promise<AuthResult> {
    try {
      const migrationStatus = await migrationService.checkMigrationStatus(email);
      
      if (migrationStatus.isMigrated || migrationStatus.supabaseUser) {
        // Use Supabase verification
        const result = await supabaseAuthService.verifyOtp(email, code);
        const user = result.user ? await this.mapSupabaseUserToUnified(result.user, true) : undefined;
        
        return {
          success: true,
          user
        };
      } else {
        // Use Cognito verification
        const result = await cognitoAuthService.confirmSignUp(email, code);
        // Get user after confirmation
        const cognitoUser = await cognitoAuthService.signIn(email, ''); // This will fail but we handle it
        const user = await this.mapCognitoUserToUnified(cognitoUser, false);
        
        return {
          success: result,
          user
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unified sign in with automatic migration detection
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const flags = this.getFeatureFlags();
      
      // Check migration status first
      const migrationStatus = await migrationService.checkMigrationStatus(email);
      
      if (migrationStatus.isMigrated) {
        // User is fully migrated, use Supabase
        try {
          const user = await supabaseAuthService.signIn(email, password);
          return {
            success: true,
            user: await this.mapSupabaseUserToUnified(user, true)
          };
        } catch (error: any) {
          // Supabase failed, maybe password changed - offer migration
          if (flags.enableCognitoFallback) {
            return await this.handleCognitoFallback(email, password, migrationStatus);
          }
          throw error;
        }
      }

      if (flags.enableMigrationFlow && migrationStatus.cognitoUser && !migrationStatus.isMigrated) {
        // User needs migration
        return {
          success: false,
          needsMigration: true,
          migrationStatus,
          error: 'Account migration required'
        };
      }

      // Try Supabase first for new accounts
      if (flags.enableSupabaseAuth) {
        try {
          const user = await supabaseAuthService.signIn(email, password);
          return {
            success: true,
            user: await this.mapSupabaseUserToUnified(user, true)
          };
        } catch (supabaseError: any) {
          // Supabase failed, try Cognito fallback if enabled
          if (flags.enableCognitoFallback) {
            try {
              const cognitoUser = await cognitoAuthService.signIn(email, password);
              return {
                success: true,
                user: await this.mapCognitoUserToUnified(cognitoUser, false),
                needsMigration: flags.enableMigrationFlow
              };
            } catch (cognitoError: any) {
              throw new Error(`Authentication failed: ${supabaseError.message}`);
            }
          }
          throw supabaseError;
        }
      }

      // Fallback to Cognito only
      const cognitoUser = await cognitoAuthService.signIn(email, password);
      return {
        success: true,
        user: await this.mapCognitoUserToUnified(cognitoUser, false),
        needsMigration: flags.enableMigrationFlow
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle Cognito fallback when Supabase fails
   */
  private async handleCognitoFallback(email: string, password: string, migrationStatus: MigrationStatus): Promise<AuthResult> {
    try {
      const cognitoUser = await cognitoAuthService.signIn(email, password);
      return {
        success: true,
        user: await this.mapCognitoUserToUnified(cognitoUser, false),
        needsMigration: true,
        migrationStatus
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Both authentication systems failed. Please contact support.`
      };
    }
  }

  /**
   * Unified sign out
   */
  async signOut(): Promise<void> {
    try {
      // Attempt to sign out from both systems to ensure clean state
      const promises = [];
      
      // Try Supabase signout
      try {
        promises.push(supabaseAuthService.signOut());
      } catch (error) {
        console.warn('Supabase signout error:', error);
      }

      // Try Cognito signout
      try {
        promises.push(cognitoAuthService.signOut());
      } catch (error) {
        console.warn('Cognito signout error:', error);
      }

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Unified signout error:', error);
      throw error;
    }
  }

  /**
   * Get current user from active auth system
   */
  async getCurrentUser(): Promise<UnifiedUser | null> {
    try {
      // Try Supabase first
      const supabaseUser = await supabaseAuthService.getCurrentUser();
      if (supabaseUser) {
        return await this.mapSupabaseUserToUnified(supabaseUser, true);
      }

      // Fall back to Cognito
      const flags = this.getFeatureFlags();
      if (flags.enableCognitoFallback) {
        const cognitoUser = await cognitoAuthService.getCurrentUser();
        if (cognitoUser) {
          return await this.mapCognitoUserToUnified(cognitoUser, false);
        }
      }

      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get session token from active auth system
   */
  async getSessionToken(): Promise<string | null> {
    try {
      // Try Supabase first
      const supabaseToken = await supabaseAuthService.getSessionToken();
      if (supabaseToken) {
        return supabaseToken;
      }

      // Fall back to Cognito
      const flags = this.getFeatureFlags();
      if (flags.enableCognitoFallback) {
        return await cognitoAuthService.getSessionToken();
      }

      return null;
    } catch (error) {
      console.error('Get session token error:', error);
      return null;
    }
  }

  /**
   * Check authentication status
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
   * Initiate user migration
   */
  async initiateUserMigration(email: string, password: string, additionalData?: any): Promise<AuthResult> {
    try {
      const result = await migrationService.migrateUser(email, password, additionalData);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      if (result.needsVerification) {
        return {
          success: true,
          needsVerification: true
        };
      }

      // Migration completed, get the new user
      const user = await supabaseAuthService.getCurrentUser();
      return {
        success: true,
        user: user ? await this.mapSupabaseUserToUnified(user, true) : undefined
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete migration after verification
   */
  async completeMigration(email: string, otp: string): Promise<AuthResult> {
    try {
      const result = await migrationService.completeMigrationAfterVerification(email, otp);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      const user = await supabaseAuthService.getCurrentUser();
      return {
        success: true,
        user: user ? await this.mapSupabaseUserToUnified(user, true) : undefined
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Map Cognito user to unified format
   */
  private async mapCognitoUserToUnified(cognitoUser: CognitoUser | null, isMigrated: boolean): Promise<UnifiedUser | undefined> {
    if (!cognitoUser) return undefined;

    return {
      id: cognitoUser.id,
      email: cognitoUser.email,
      name: cognitoUser.name,
      role: cognitoUser.role,
      authProvider: 'cognito',
      isMigrated
    };
  }

  /**
   * Map Supabase user to unified format
   */
  private async mapSupabaseUserToUnified(supabaseUser: SupabaseUser, isMigrated: boolean): Promise<UnifiedUser> {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.name,
      role: supabaseUser.role,
      approvalStatus: supabaseUser.approvalStatus,
      employee: supabaseUser.employee,
      authProvider: 'supabase',
      isMigrated
    };
  }

  /**
   * Admin methods for controlling migration
   */
  async enableSupabaseAuth(enable: boolean): Promise<void> {
    const flags = this.getFeatureFlags();
    flags.enableSupabaseAuth = enable;
    this.setFeatureFlags(flags);
  }

  async enableMigrationFlow(enable: boolean): Promise<void> {
    const flags = this.getFeatureFlags();
    flags.enableMigrationFlow = enable;
    this.setFeatureFlags(flags);
  }

  async enableCognitoFallback(enable: boolean): Promise<void> {
    const flags = this.getFeatureFlags();
    flags.enableCognitoFallback = enable;
    this.setFeatureFlags(flags);
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats() {
    return await migrationService.getMigrationStats();
  }
}

// Export singleton instance
export const unifiedAuthService = new UnifiedAuthService();