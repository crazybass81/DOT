import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';

export interface ValidationTarget {
  id: string;
  email?: string;
  current_role: UserRole;
  organization_id?: string;
}

export interface ValidationOptions {
  currentUserRole: UserRole;
  currentUserOrgId?: string;
  targetUsers: ValidationTarget[];
  newRole: UserRole;
  requiresElevation?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresAdditionalAuth: boolean;
  authMethods: ('password' | 'mfa')[];
  validatedUsers: ValidationTarget[];
  invalidUsers: { user: ValidationTarget; reason: string }[];
}

export class RoleChangeValidator {
  private supabase = createClientComponentClient();
  private options: ValidationOptions;
  private roleHierarchy: Record<UserRole, number> = {
    EMPLOYEE: 1,
    MANAGER: 2,
    ADMIN: 3,
    MASTER_ADMIN: 4
  };

  constructor(options: ValidationOptions) {
    this.options = options;
  }

  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresAdditionalAuth: false,
      authMethods: [],
      validatedUsers: [],
      invalidUsers: []
    };

    // Check role hierarchy
    if (!this.canAssignRole(this.options.currentUserRole, this.options.newRole)) {
      result.errors.push('Cannot assign role higher than your own');
      result.isValid = false;
      return result;
    }

    // Check for last MASTER_ADMIN
    if (await this.isRemovingLastMasterAdmin()) {
      result.errors.push('Cannot remove the last MASTER_ADMIN');
      result.isValid = false;
      return result;
    }

    // Validate each target user
    for (const user of this.options.targetUsers) {
      const userValidation = await this.validateUser(user);
      if (userValidation.isValid) {
        result.validatedUsers.push(user);
      } else {
        result.invalidUsers.push({
          user,
          reason: userValidation.reason
        });
        result.warnings.push(`User ${user.email || user.id}: ${userValidation.reason}`);
      }
    }

    // Check if elevation is required
    if (this.isPrivilegeEscalation()) {
      result.requiresAdditionalAuth = true;
      result.authMethods = await this.getRequiredAuthMethods();
    }

    // Check organization scope
    if (!await this.validateOrganizationScope()) {
      result.errors.push('Cannot change roles outside your organization');
      result.isValid = false;
    }

    // Validate bulk operation limits
    if (this.options.targetUsers.length > 100) {
      result.warnings.push('Large batch operation may take several minutes');
    }

    // Check for suspicious patterns
    const suspiciousPattern = this.detectSuspiciousPatterns();
    if (suspiciousPattern) {
      result.warnings.push(suspiciousPattern);
      result.requiresAdditionalAuth = true;
    }

    result.isValid = result.errors.length === 0 && result.validatedUsers.length > 0;
    return result;
  }

  private canAssignRole(currentRole: UserRole, targetRole: UserRole): boolean {
    // MASTER_ADMIN can assign any role
    if (currentRole === 'MASTER_ADMIN') return true;
    
    // Others can only assign roles equal to or lower than their own
    return this.roleHierarchy[targetRole] <= this.roleHierarchy[currentRole];
  }

  private async isRemovingLastMasterAdmin(): Promise<boolean> {
    // Check if any target users are MASTER_ADMIN being downgraded
    const masterAdminsBeingDowngraded = this.options.targetUsers.filter(
      user => user.current_role === 'MASTER_ADMIN' && this.options.newRole !== 'MASTER_ADMIN'
    );

    if (masterAdminsBeingDowngraded.length === 0) return false;

    // Count remaining MASTER_ADMINs
    const { data: masterAdmins, error } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('role', 'MASTER_ADMIN');

    if (error || !masterAdmins) return true; // Err on the side of caution

    const remainingMasterAdmins = masterAdmins.length - masterAdminsBeingDowngraded.length;
    return remainingMasterAdmins === 0;
  }

  private async validateUser(user: ValidationTarget): Promise<{ isValid: boolean; reason: string }> {
    // Check if user exists
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('id, role, organization_id, is_active')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return { isValid: false, reason: 'User not found' };
    }

    if (!profile.is_active) {
      return { isValid: false, reason: 'User is inactive' };
    }

    // Verify current role matches
    if (profile.role !== user.current_role) {
      return { isValid: false, reason: 'Role has been changed by another admin' };
    }

    // Check organization scope if not MASTER_ADMIN
    if (this.options.currentUserRole !== 'MASTER_ADMIN' && this.options.currentUserOrgId) {
      if (profile.organization_id !== this.options.currentUserOrgId) {
        return { isValid: false, reason: 'User is in a different organization' };
      }
    }

    return { isValid: true, reason: '' };
  }

  private async validateOrganizationScope(): Promise<boolean> {
    // MASTER_ADMIN can change roles across organizations
    if (this.options.currentUserRole === 'MASTER_ADMIN') return true;

    // Others can only change within their organization
    if (!this.options.currentUserOrgId) return false;

    for (const user of this.options.targetUsers) {
      if (user.organization_id && user.organization_id !== this.options.currentUserOrgId) {
        return false;
      }
    }

    return true;
  }

  private isPrivilegeEscalation(): boolean {
    // Check if any user is being promoted to a higher role
    for (const user of this.options.targetUsers) {
      if (this.roleHierarchy[this.options.newRole] > this.roleHierarchy[user.current_role]) {
        // Promoting to ADMIN or MASTER_ADMIN always requires elevation
        if (this.options.newRole === 'ADMIN' || this.options.newRole === 'MASTER_ADMIN') {
          return true;
        }
        // Promoting from EMPLOYEE to MANAGER requires elevation if batch > 5
        if (user.current_role === 'EMPLOYEE' && this.options.targetUsers.length > 5) {
          return true;
        }
      }
    }
    return false;
  }

  private async getRequiredAuthMethods(): Promise<('password' | 'mfa')[]> {
    const methods: ('password' | 'mfa')[] = ['password'];

    // Check if user has MFA enabled
    const { data: { user } } = await this.supabase.auth.getUser();
    if (user?.user_metadata?.mfa_enabled) {
      methods.push('mfa');
    }

    return methods;
  }

  private detectSuspiciousPatterns(): string | null {
    // Large batch privilege escalation
    if (this.options.targetUsers.length > 20 && this.isPrivilegeEscalation()) {
      return 'Unusual bulk privilege escalation detected';
    }

    // Multiple MASTER_ADMIN assignments
    if (this.options.newRole === 'MASTER_ADMIN' && this.options.targetUsers.length > 1) {
      return 'Multiple MASTER_ADMIN assignments require extra verification';
    }

    // Rapid role changes (would need timestamp tracking in production)
    // This is a placeholder for demonstration
    const recentChanges = this.getRecentRoleChanges();
    if (recentChanges > 10) {
      return 'High frequency of role changes detected';
    }

    return null;
  }

  private getRecentRoleChanges(): number {
    // In production, this would query audit logs for recent changes
    // For now, return a mock value
    return 0;
  }

  async acquireLock(userId: string): Promise<boolean> {
    // Implement distributed lock to prevent concurrent changes
    const { data, error } = await this.supabase.rpc('acquire_role_change_lock', {
      user_ids: this.options.targetUsers.map(u => u.id),
      lock_duration_seconds: 30
    });

    return !error && data;
  }

  async releaseLock(): Promise<void> {
    await this.supabase.rpc('release_role_change_lock', {
      user_ids: this.options.targetUsers.map(u => u.id)
    });
  }
}