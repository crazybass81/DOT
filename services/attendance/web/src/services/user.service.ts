/**
 * User Service - Compatibility layer for user management
 * Updated to work with unified auth service
 */

import { authService, User } from './auth.service';
import { UserRole } from '../types/user.types';

class UserService {
  private static instance: UserService;
  
  private constructor() {}
  
  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get current user (synchronous compatibility method)
   * Note: For real implementations, use authService.getCurrentUser() which is async
   */
  getCurrentUser(): User | null {
    // This is a synchronous compatibility method
    // In practice, auth data should be fetched asynchronously
    return null;
  }

  /**
   * Get current user (async - recommended)
   */
  async getCurrentUserAsync(): Promise<User | null> {
    return await authService.getCurrentUser();
  }

  /**
   * Static method for backward compatibility
   */
  static getCurrentUser(): User | null {
    return UserService.getInstance().getCurrentUser();
  }

  /**
   * Check if current user is admin (synchronous compatibility)
   */
  static isAdmin(): boolean {
    // Synchronous compatibility method
    // For real implementations, use authService.hasRole() or authService.isMasterAdmin()
    return false;
  }

  /**
   * Check if current user is admin (async - recommended)
   */
  static async isAdminAsync(): Promise<boolean> {
    const isAdmin = await authService.hasRole('admin') || 
                    await authService.hasRole('master_admin') ||
                    await authService.isMasterAdmin();
    return isAdmin;
  }

  /**
   * Check if current user is business admin
   */
  static isBusinessAdmin(): boolean {
    return false; // Synchronous compatibility - use async version
  }

  /**
   * Check if current user is business admin (async)
   */
  static async isBusinessAdminAsync(): Promise<boolean> {
    return await authService.hasRole(UserRole.BUSINESS_ADMIN) ||
           await authService.hasRole(UserRole.ADMIN);
  }

  /**
   * Check if current user is super admin
   */
  static isSuperAdmin(): boolean {
    return false; // Synchronous compatibility - use async version
  }

  /**
   * Check if current user is super admin (async)
   */
  static async isSuperAdminAsync(): Promise<boolean> {
    return await authService.hasRole(UserRole.SUPER_ADMIN) ||
           await authService.hasRole(UserRole.MASTER_ADMIN) ||
           await authService.isMasterAdmin();
  }

  /**
   * Check if current user is employee
   */
  static isEmployee(): boolean {
    return false; // Synchronous compatibility - use async version
  }

  /**
   * Check if current user is employee (async)
   */
  static async isEmployeeAsync(): Promise<boolean> {
    return await authService.hasRole(UserRole.EMPLOYEE) ||
           await authService.hasRole(UserRole.WORKER);
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(permission: string): boolean {
    // Synchronous compatibility method
    return false;
  }

  /**
   * Check if user has specific permission (async)
   */
  static async hasPermissionAsync(permission: string): Promise<boolean> {
    const user = await authService.getCurrentUser();
    if (!user) return false;
    
    // Master/Super admin has all permissions
    if (await authService.isMasterAdmin() || 
        await authService.hasRole(UserRole.SUPER_ADMIN)) {
      return true;
    }
    
    // Admin has business-level permissions
    if (await authService.hasRole(UserRole.ADMIN) ||
        await authService.hasRole(UserRole.BUSINESS_ADMIN)) {
      const businessPermissions = [
        'manage_employees',
        'view_reports',
        'approve_registrations',
        'manage_settings'
      ];
      return businessPermissions.includes(permission);
    }
    
    // Manager has mid-level permissions
    if (await authService.hasRole(UserRole.MANAGER)) {
      const managerPermissions = [
        'view_reports',
        'approve_registrations'
      ];
      return managerPermissions.includes(permission);
    }
    
    // Worker/Employee has limited permissions
    if (await authService.hasRole(UserRole.WORKER) ||
        await authService.hasRole(UserRole.EMPLOYEE)) {
      const workerPermissions = [
        'check_in',
        'check_out',
        'view_own_records'
      ];
      return workerPermissions.includes(permission);
    }
    
    return false;
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    return await authService.isAuthenticated();
  }
}

export const userService = UserService;