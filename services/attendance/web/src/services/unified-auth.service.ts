/**
 * Unified Authentication Service for ID-ROLE-PAPER System
 * 
 * Integrates Supabase authentication with the new ID-ROLE-PAPER architecture.
 * Provides unified authentication while supporting the 7-role system and
 * paper-based permission management.
 */

import { supabaseAuthService, User as SupabaseUser } from './supabase-auth.service';
import { identityService } from './identity.service';
import { permissionService, Resource, Action } from '../lib/permissions/role-permissions';
import {
  UnifiedIdentity,
  IdType,
  RoleType,
  IdentityWithContext,
  CreatePaperRequest,
  CreateBusinessRegistrationRequest
} from '../../../src/types/id-role-paper';

export interface UnifiedUser {
  id: string;
  email: string;
  name?: string;
  authProvider: 'supabase';
  
  // ID-ROLE-PAPER context
  identity?: UnifiedIdentity;
  primaryRole?: RoleType;
  availableRoles?: RoleType[];
  hasMultipleRoles?: boolean;
  businessContexts?: string[];
  
  // Legacy support for backward compatibility
  role?: string;
  approvalStatus?: string;
  employee?: any;
  metadata?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  user?: UnifiedUser;
  error?: string;
  requiresAction?: 'verify_email' | 'change_password' | 'setup_mfa' | 'create_identity' | 'verify_identity';
  identityRequired?: boolean;
}

export interface CreateIdentityOptions {
  idType: IdType;
  fullName: string;
  phone?: string;
  birthDate?: Date;
  idNumber?: string;
  linkedPersonalId?: string;
  profileData?: Record<string, any>;
}

/**
 * Unified Authentication Service with ID-ROLE-PAPER Integration
 */
export class UnifiedAuthService {
  private static instance: UnifiedAuthService;

  static getInstance(): UnifiedAuthService {
    if (!this.instance) {
      this.instance = new UnifiedAuthService();
    }
    return this.instance;
  }

  /**
   * Sign up a new user with optional identity creation
   */
  async signUp(
    email: string, 
    password: string, 
    metadata?: { name?: string; role?: string },
    identityOptions?: CreateIdentityOptions
  ): Promise<AuthResult> {
    try {
      const result = await supabaseAuthService.signUp(email, password, metadata);
      
      if (!result.user) {
        return {
          success: false,
          error: 'Sign up failed'
        };
      }

      let user = await this.mapSupabaseUserToUnified(result.user);

      // Create identity if options provided
      if (identityOptions && result.user.id) {
        try {
          const identity = await identityService.createIdentity({
            idType: identityOptions.idType,
            email: email,
            phone: identityOptions.phone,
            fullName: identityOptions.fullName,
            birthDate: identityOptions.birthDate,
            idNumber: identityOptions.idNumber,
            authUserId: result.user.id,
            linkedPersonalId: identityOptions.linkedPersonalId,
            profileData: identityOptions.profileData
          });

          // Update user with identity context
          user = await this.enrichUserWithIdentityContext(user, identity);
        } catch (identityError) {
          console.error('Failed to create identity during signup:', identityError);
          // Continue with auth success but mark identity as required
          return {
            success: true,
            user,
            requiresAction: 'create_identity',
            identityRequired: true
          };
        }
      }

      return {
        success: true,
        user,
        requiresAction: result.needsVerification ? 'verify_email' : undefined,
        identityRequired: !user.identity
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
   * Create identity for existing authenticated user
   */
  async createIdentity(options: CreateIdentityOptions): Promise<AuthResult> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        return {
          success: false,
          error: 'User must be authenticated to create identity'
        };
      }

      const identity = await identityService.createIdentity({
        idType: options.idType,
        email: currentUser.email,
        phone: options.phone,
        fullName: options.fullName,
        birthDate: options.birthDate,
        idNumber: options.idNumber,
        authUserId: currentUser.id,
        linkedPersonalId: options.linkedPersonalId,
        profileData: options.profileData
      });

      const enrichedUser = await this.enrichUserWithIdentityContext(currentUser, identity);

      return {
        success: true,
        user: enrichedUser,
        requiresAction: identity.isVerified ? undefined : 'verify_identity'
      };
    } catch (error: any) {
      console.error('Create identity error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create identity'
      };
    }
  }

  /**
   * Sign in user with ID-ROLE-PAPER context
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

      const unifiedUser = await this.mapSupabaseUserToUnified(user, true);
      
      return {
        success: true,
        user: unifiedUser,
        identityRequired: !unifiedUser.identity,
        requiresAction: !unifiedUser.identity ? 'create_identity' : undefined
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
   * Get current authenticated user with full context
   */
  async getCurrentUser(): Promise<UnifiedUser | null> {
    try {
      const supabaseUser = await supabaseAuthService.getCurrentUser();
      if (supabaseUser) {
        return await this.mapSupabaseUserToUnified(supabaseUser, true);
      }
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get user with full identity context
   */
  async getUserWithContext(userId?: string): Promise<IdentityWithContext | null> {
    try {
      const currentUser = userId ? { id: userId } : await this.getCurrentUser();
      if (!currentUser?.id) return null;

      // Get identity by auth user ID
      const identity = await identityService.getIdentityByAuthUser(currentUser.id);
      if (!identity) return null;

      return await identityService.getIdentityWithContext(identity.id);
    } catch (error) {
      console.error('Get user with context error:', error);
      return null;
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    resource: Resource | string,
    action: Action | string,
    context?: {
      businessContextId?: string;
      targetUserId?: string;
    }
  ): Promise<boolean> {
    try {
      const userContext = await this.getUserWithContext();
      if (!userContext) return false;

      const checkContext = {
        ...context,
        currentUserId: userContext.identity.authUserId,
        userVerified: userContext.identity.isVerified
      };

      // Check all available roles
      return permissionService.hasMultiRolePermission(
        userContext.availableRoles,
        resource,
        action,
        checkContext
      );
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Create paper for current user
   */
  async createPaper(paperRequest: CreatePaperRequest): Promise<{
    success: boolean;
    error?: string;
    rolesUpdated?: RoleType[];
  }> {
    try {
      const userContext = await this.getUserWithContext();
      if (!userContext) {
        return {
          success: false,
          error: 'User identity not found'
        };
      }

      await identityService.createPaper(userContext.identity.id, paperRequest);
      
      // Get updated roles after paper creation
      const updatedContext = await identityService.getIdentityWithContext(userContext.identity.id);
      
      return {
        success: true,
        rolesUpdated: updatedContext?.availableRoles || []
      };
    } catch (error: any) {
      console.error('Create paper error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create paper'
      };
    }
  }

  /**
   * Create business registration for current user
   */
  async createBusinessRegistration(businessRequest: CreateBusinessRegistrationRequest): Promise<{
    success: boolean;
    error?: string;
    businessId?: string;
    rolesUpdated?: RoleType[];
  }> {
    try {
      const userContext = await this.getUserWithContext();
      if (!userContext) {
        return {
          success: false,
          error: 'User identity not found'
        };
      }

      const business = await identityService.createBusinessRegistration(
        userContext.identity.id,
        businessRequest
      );

      // Get updated roles after business registration
      const updatedContext = await identityService.getIdentityWithContext(userContext.identity.id);
      
      return {
        success: true,
        businessId: business.id,
        rolesUpdated: updatedContext?.availableRoles || []
      };
    } catch (error: any) {
      console.error('Create business registration error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create business registration'
      };
    }
  }

  /**
   * Switch business context for multi-business users
   */
  async switchBusinessContext(businessId: string): Promise<{
    success: boolean;
    error?: string;
    availableRoles?: RoleType[];
  }> {
    try {
      const userContext = await this.getUserWithContext();
      if (!userContext) {
        return {
          success: false,
          error: 'User identity not found'
        };
      }

      // Verify user has access to this business
      const hasAccess = userContext.businessRegistrations.some(b => b.id === businessId);
      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied to business context'
        };
      }

      // Get roles specific to this business context
      const businessRoles = userContext.computedRoles
        .filter(role => role.businessContextId === businessId)
        .map(role => role.role);

      return {
        success: true,
        availableRoles: businessRoles
      };
    } catch (error: any) {
      console.error('Switch business context error:', error);
      return {
        success: false,
        error: error.message || 'Failed to switch business context'
      };
    }
  }

  // Legacy methods for backward compatibility

  /**
   * Verify email with confirmation code
   */
  async verifySignUp(email: string, code: string): Promise<AuthResult> {
    try {
      const result = await supabaseAuthService.verifyOtp(email, code);
      
      if (!result.user) {
        return {
          success: false,
          error: 'Email verification failed'
        };
      }

      const user = result.user ? await this.mapSupabaseUserToUnified(result.user, true) : undefined;
      
      return {
        success: true,
        user,
        identityRequired: !user?.identity
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
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      await supabaseAuthService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
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
      await supabaseAuthService.resetPassword(email);
      return { success: true };
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
      await supabaseAuthService.updatePassword(newPassword);
      return { success: true };
    } catch (error: any) {
      console.error('Update password error:', error);
      return {
        success: false,
        error: error.message || 'Password update failed'
      };
    }
  }

  // Private helper methods

  /**
   * Map Supabase user to unified format with identity context
   */
  private async mapSupabaseUserToUnified(
    supabaseUser: SupabaseUser | null | undefined,
    includeIdentityContext: boolean = false
  ): Promise<UnifiedUser> {
    if (!supabaseUser) {
      throw new Error('No Supabase user provided');
    }

    let user: UnifiedUser = {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.name || supabaseUser.email?.split('@')[0],
      authProvider: 'supabase',
      
      // Legacy support
      role: supabaseUser.role || 'employee',
      approvalStatus: supabaseUser.approvalStatus,
      employee: supabaseUser.employee,
      metadata: {}
    };

    if (includeIdentityContext) {
      try {
        const identity = await identityService.getIdentityByAuthUser(supabaseUser.id);
        if (identity) {
          user = await this.enrichUserWithIdentityContext(user, identity);
        }
      } catch (error) {
        console.error('Failed to load identity context:', error);
        // Continue without identity context
      }
    }

    return user;
  }

  /**
   * Enrich user with identity context
   */
  private async enrichUserWithIdentityContext(
    user: UnifiedUser,
    identity: UnifiedIdentity
  ): Promise<UnifiedUser> {
    try {
      const identityContext = await identityService.getIdentityWithContext(identity.id);
      
      if (!identityContext) {
        return {
          ...user,
          identity
        };
      }

      // Get unique business contexts
      const businessContexts = Array.from(new Set(
        identityContext.computedRoles
          .filter(role => role.businessContextId)
          .map(role => role.businessContextId!)
      ));

      return {
        ...user,
        identity: identityContext.identity,
        primaryRole: identityContext.primaryRole,
        availableRoles: identityContext.availableRoles,
        hasMultipleRoles: identityContext.availableRoles.length > 1,
        businessContexts,
        name: identity.fullName || user.name
      };
    } catch (error) {
      console.error('Failed to enrich user with identity context:', error);
      return {
        ...user,
        identity
      };
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<AuthResult> {
    try {
      const session = await supabaseAuthService.getSession();
      
      if (!session) {
        return {
          success: false,
          error: 'Session refresh failed'
        };
      }

      const user = await supabaseAuthService.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const unifiedUser = await this.mapSupabaseUserToUnified(user, true);

      return {
        success: true,
        user: unifiedUser,
        identityRequired: !unifiedUser.identity
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
   * Sign in with OAuth provider (placeholder)
   */
  async signInWithProvider(provider: 'google' | 'github' | 'facebook'): Promise<AuthResult> {
    return {
      success: false,
      error: 'OAuth sign-in not yet implemented'
    };
  }

  /**
   * Update user profile (placeholder)
   */
  async updateProfile(updates: { name?: string; metadata?: Record<string, any> }): Promise<AuthResult> {
    return {
      success: false,
      error: 'Profile update not yet implemented'
    };
  }
}

// Export singleton instance
export const unifiedAuthService = UnifiedAuthService.getInstance();