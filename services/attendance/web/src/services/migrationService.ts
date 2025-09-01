import { supabaseAuthService } from './supabaseAuthService';
import { authService as cognitoAuthService } from './authService';
import { supabase } from '@/lib/supabase-config';

export interface MigrationStatus {
  isMigrated: boolean;
  cognitoUser?: any;
  supabaseUser?: any;
  error?: string;
}

export class MigrationService {
  private readonly MIGRATION_FLAG_KEY = 'auth_migration_status';
  private readonly MIGRATION_TOKEN_KEY = 'migration_temp_token';

  /**
   * Check if user is already migrated
   */
  async checkMigrationStatus(email: string): Promise<MigrationStatus> {
    try {
      // Check local storage first
      const localStatus = localStorage.getItem(`${this.MIGRATION_FLAG_KEY}_${email}`);
      if (localStatus === 'completed') {
        return { isMigrated: true };
      }

      // Check if user exists in Supabase
      const { data: supabaseUser } = await supabase.auth.admin.getUserByEmail(email);
      const hasSupabaseAuth = !!supabaseUser.user;

      // Check if employee record exists and is linked
      if (hasSupabaseAuth) {
        const { data: employee } = await supabase
          .from('employees')
          .select('*')
          .eq('auth_user_id', supabaseUser.user.id)
          .eq('email', email)
          .single();

        if (employee) {
          this.markMigrationComplete(email);
          return { 
            isMigrated: true, 
            supabaseUser: supabaseUser.user 
          };
        }
      }

      // Check Cognito user
      try {
        const cognitoUser = await cognitoAuthService.getCurrentUser();
        return {
          isMigrated: false,
          cognitoUser,
          supabaseUser: supabaseUser.user
        };
      } catch {
        return {
          isMigrated: false,
          supabaseUser: supabaseUser.user
        };
      }
    } catch (error: any) {
      return {
        isMigrated: false,
        error: error.message
      };
    }
  }

  /**
   * Migrate user from Cognito to Supabase
   */
  async migrateUser(email: string, password: string, additionalData?: {
    name?: string;
    phone?: string;
    employeeCode?: string;
  }): Promise<{ success: boolean; needsVerification?: boolean; error?: string }> {
    try {
      // Step 1: Verify Cognito credentials
      let cognitoUser;
      try {
        cognitoUser = await cognitoAuthService.signIn(email, password);
      } catch (error: any) {
        if (error.message.includes('User does not exist')) {
          // User might already be migrated, try Supabase directly
          try {
            await supabaseAuthService.signIn(email, password);
            this.markMigrationComplete(email);
            return { success: true };
          } catch (supabaseError: any) {
            return { 
              success: false, 
              error: 'User not found in either system' 
            };
          }
        }
        return { 
          success: false, 
          error: `Cognito authentication failed: ${error.message}` 
        };
      }

      // Step 2: Create Supabase user
      const signUpResult = await supabaseAuthService.signUp(
        email, 
        password,
        {
          name: additionalData?.name || cognitoUser.name || email.split('@')[0]
        }
      );

      if (signUpResult.needsVerification) {
        // Store migration token for post-verification completion
        this.storeMigrationToken(email, {
          cognitoUserId: cognitoUser.id,
          additionalData
        });

        return { 
          success: true, 
          needsVerification: true 
        };
      }

      // Step 3: Link employee account if user is verified
      if (signUpResult.user && signUpResult.session) {
        await this.completeEmployeeAccountLinking(email, additionalData);
        return { success: true };
      }

      return { 
        success: false, 
        error: 'Failed to create Supabase user' 
      };

    } catch (error: any) {
      console.error('Migration error:', error);
      return { 
        success: false, 
        error: error.message || 'Migration failed' 
      };
    }
  }

  /**
   * Complete migration after email verification
   */
  async completeMigrationAfterVerification(email: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify OTP
      const { user, session } = await supabaseAuthService.verifyOtp(email, otp);
      
      if (!user || !session) {
        return { 
          success: false, 
          error: 'Email verification failed' 
        };
      }

      // Get migration data
      const migrationData = this.getMigrationToken(email);
      
      // Complete employee account linking
      await this.completeEmployeeAccountLinking(email, migrationData?.additionalData);

      // Clean up
      this.clearMigrationToken(email);
      this.markMigrationComplete(email);

      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to complete migration' 
      };
    }
  }

  /**
   * Complete employee account linking
   */
  private async completeEmployeeAccountLinking(email: string, additionalData?: any): Promise<void> {
    try {
      // Check if employee record exists by email
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .single();

      const session = await supabaseAuthService.getSession();
      if (!session?.user) {
        throw new Error('No authenticated session');
      }

      if (existingEmployee && !existingEmployee.auth_user_id) {
        // Link existing employee record
        const { error } = await supabase
          .from('employees')
          .update({
            auth_user_id: session.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEmployee.id);

        if (error) {
          throw error;
        }
      } else if (!existingEmployee) {
        // Create new employee record
        await supabaseAuthService.linkEmployeeAccount({
          name: additionalData?.name || email.split('@')[0],
          phone: additionalData?.phone,
          employeeCode: additionalData?.employeeCode
        });
      }
    } catch (error) {
      console.error('Employee account linking error:', error);
      throw error;
    }
  }

  /**
   * Force complete migration for existing Supabase users
   */
  async forceCompleteMigration(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await supabaseAuthService.getCurrentUser();
      if (!user || user.email !== email) {
        return {
          success: false,
          error: 'User not authenticated or email mismatch'
        };
      }

      // Ensure employee account is linked
      if (!user.employee) {
        await supabaseAuthService.linkEmployeeAccount({
          name: user.name || email.split('@')[0]
        });
      }

      this.markMigrationComplete(email);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch migrate multiple users
   */
  async batchMigrate(users: Array<{ email: string; password: string; additionalData?: any }>): Promise<{
    successful: string[];
    failed: Array<{ email: string; error: string }>;
    needsVerification: string[];
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ email: string; error: string }>,
      needsVerification: [] as string[]
    };

    for (const userData of users) {
      try {
        const result = await this.migrateUser(
          userData.email, 
          userData.password, 
          userData.additionalData
        );

        if (result.success) {
          if (result.needsVerification) {
            results.needsVerification.push(userData.email);
          } else {
            results.successful.push(userData.email);
          }
        } else {
          results.failed.push({
            email: userData.email,
            error: result.error || 'Unknown error'
          });
        }
      } catch (error: any) {
        results.failed.push({
          email: userData.email,
          error: error.message || 'Migration failed'
        });
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Rollback migration (emergency only)
   */
  async rollbackMigration(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove migration flag
      localStorage.removeItem(`${this.MIGRATION_FLAG_KEY}_${email}`);
      
      // Note: We cannot delete Supabase users programmatically for security reasons
      // This would need to be done manually in Supabase dashboard or through admin API
      
      console.warn('Migration flag removed. Supabase user must be manually deleted if needed.');
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods for local storage management
  private markMigrationComplete(email: string): void {
    localStorage.setItem(`${this.MIGRATION_FLAG_KEY}_${email}`, 'completed');
  }

  private storeMigrationToken(email: string, data: any): void {
    localStorage.setItem(`${this.MIGRATION_TOKEN_KEY}_${email}`, JSON.stringify(data));
  }

  private getMigrationToken(email: string): any {
    const data = localStorage.getItem(`${this.MIGRATION_TOKEN_KEY}_${email}`);
    return data ? JSON.parse(data) : null;
  }

  private clearMigrationToken(email: string): void {
    localStorage.removeItem(`${this.MIGRATION_TOKEN_KEY}_${email}`);
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats(): Promise<{
    totalEmployees: number;
    migratedEmployees: number;
    pendingMigration: number;
    migrationProgress: number;
  }> {
    try {
      // Get total employees with email addresses
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null);

      // Get employees with linked Supabase auth
      const { count: migratedEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .not('auth_user_id', 'is', null);

      const pendingMigration = (totalEmployees || 0) - (migratedEmployees || 0);
      const migrationProgress = totalEmployees ? (migratedEmployees / totalEmployees) * 100 : 0;

      return {
        totalEmployees: totalEmployees || 0,
        migratedEmployees: migratedEmployees || 0,
        pendingMigration: Math.max(0, pendingMigration),
        migrationProgress: Math.round(migrationProgress * 100) / 100
      };
    } catch (error) {
      console.error('Failed to get migration stats:', error);
      return {
        totalEmployees: 0,
        migratedEmployees: 0,
        pendingMigration: 0,
        migrationProgress: 0
      };
    }
  }
}

// Export singleton instance
export const migrationService = new MigrationService();