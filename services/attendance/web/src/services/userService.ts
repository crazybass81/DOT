import { UserRole } from '@/src/types/user.types';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  businessId?: string;
  employeeId?: string;
}

class UserService {
  private static instance: UserService;
  
  private constructor() {}
  
  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  getCurrentUser(): User | null {
    // In real implementation, this would get from session/token
    // For now, return mock data based on localStorage
    const userEmail = localStorage.getItem('userEmail');
    
    if (!userEmail) return null;
    
    // Mock user data - in production, this would come from API/token
    if (userEmail === 'admin@dotattendance.com') {
      return {
        id: 'admin-001',
        email: userEmail,
        name: '관리자',
        role: UserRole.BUSINESS_ADMIN,
        businessId: 'biz-001',
        employeeId: 'emp-admin'
      };
    }
    
    if (userEmail === 'superadmin@dotattendance.com') {
      return {
        id: 'super-001',
        email: userEmail,
        name: '서비스 관리자',
        role: UserRole.SUPER_ADMIN
      };
    }
    
    // Default employee user
    return {
      id: 'emp-001',
      email: userEmail,
      name: userEmail.split('@')[0],
      role: UserRole.EMPLOYEE,
      businessId: 'biz-001',
      employeeId: 'emp-001'
    };
  }

  static getCurrentUser(): User | null {
    return UserService.getInstance().getCurrentUser();
  }

  static isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === UserRole.BUSINESS_ADMIN || user?.role === UserRole.SUPER_ADMIN;
  }

  static isBusinessAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === UserRole.BUSINESS_ADMIN;
  }

  static isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === UserRole.SUPER_ADMIN;
  }

  static isEmployee(): boolean {
    const user = this.getCurrentUser();
    return user?.role === UserRole.EMPLOYEE;
  }

  static hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === UserRole.SUPER_ADMIN) return true;
    
    // Business admin has all business-level permissions
    if (user.role === UserRole.BUSINESS_ADMIN) {
      const businessPermissions = [
        'manage_employees',
        'view_reports',
        'approve_registrations',
        'manage_settings'
      ];
      return businessPermissions.includes(permission);
    }
    
    // Employee has limited permissions
    if (user.role === UserRole.EMPLOYEE) {
      const employeePermissions = [
        'check_in',
        'check_out',
        'view_own_records'
      ];
      return employeePermissions.includes(permission);
    }
    
    return false;
  }
}

export const userService = UserService;