/**
 * Type Compatibility Layer
 * 타입 충돌 해결을 위한 임시 호환성 레이어
 * 
 * 이 파일은 중복된 타입 정의들을 통합하고 앨리어스를 제공합니다.
 * 점진적으로 모든 import를 이 파일로 통합해주세요.
 */

// Import all conflicting type definitions
import { UserRole as SimpleUserRole, User as SimpleUser } from './user.types';
import { 
  RoleType as IdRolePaperRole, 
  UnifiedIdentity,
  IdType,
  PaperType,
  BusinessType,
  VerificationStatus 
} from './id-role-paper';

// Import core types from the main types directory
// Note: Path might need adjustment based on actual structure
type CoreUserRole = 'master_admin' | 'admin' | 'manager' | 'worker';

/**
 * 통합 UserRole - 기본적으로 Core 타입 사용
 * ID-ROLE-PAPER 시스템과의 호환성을 위해 매핑 제공
 */
export enum UserRole {
  // Core roles (4-tier hierarchy)
  MASTER_ADMIN = 'master_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  WORKER = 'worker',
  
  // Legacy compatibility
  EMPLOYEE = 'worker',  // Maps to WORKER
  BUSINESS_ADMIN = 'admin',  // Maps to ADMIN
  SUPER_ADMIN = 'master_admin'  // Maps to MASTER_ADMIN
}

/**
 * ID-ROLE-PAPER 전용 Role 타입
 * 7가지 동적 역할 시스템
 */
export { IdRolePaperRole };
export type DynamicRole = IdRolePaperRole;

/**
 * 통합 User 인터페이스
 * 기본 필드 + 확장 가능한 구조
 */
export interface User {
  // Core fields
  id: string;
  email: string;
  role: UserRole;
  
  // Extended fields
  name?: string;
  organizationId?: string;
  organization_id?: string;  // DB compatibility
  
  // Timestamps
  createdAt?: string | Date;
  created_at?: string;  // DB compatibility
  updatedAt?: string | Date;
  updated_at?: string;  // DB compatibility
  
  // Status
  isActive?: boolean;
  is_active?: boolean;  // DB compatibility
}

/**
 * Role 매핑 유틸리티
 */
export class RoleMapper {
  /**
   * Legacy UserRole을 Core UserRole로 변환
   */
  static toCoreRole(role: SimpleUserRole | string): UserRole {
    const mapping: Record<string, UserRole> = {
      'EMPLOYEE': UserRole.WORKER,
      'BUSINESS_ADMIN': UserRole.ADMIN,
      'SUPER_ADMIN': UserRole.MASTER_ADMIN,
      'worker': UserRole.WORKER,
      'admin': UserRole.ADMIN,
      'manager': UserRole.MANAGER,
      'master_admin': UserRole.MASTER_ADMIN
    };
    return mapping[role] || UserRole.WORKER;
  }
  
  /**
   * ID-ROLE-PAPER Role을 Core UserRole로 변환
   */
  static fromDynamicRole(role: IdRolePaperRole): UserRole {
    const mapping: Record<IdRolePaperRole, UserRole> = {
      [IdRolePaperRole.SEEKER]: UserRole.WORKER,
      [IdRolePaperRole.WORKER]: UserRole.WORKER,
      [IdRolePaperRole.MANAGER]: UserRole.MANAGER,
      [IdRolePaperRole.SUPERVISOR]: UserRole.MANAGER,
      [IdRolePaperRole.OWNER]: UserRole.ADMIN,
      [IdRolePaperRole.FRANCHISEE]: UserRole.ADMIN,
      [IdRolePaperRole.FRANCHISOR]: UserRole.MASTER_ADMIN
    };
    return mapping[role];
  }
  
  /**
   * Core UserRole을 ID-ROLE-PAPER Role로 변환
   */
  static toDynamicRole(role: UserRole): IdRolePaperRole {
    const mapping: Record<UserRole, IdRolePaperRole> = {
      [UserRole.WORKER]: IdRolePaperRole.WORKER,
      [UserRole.MANAGER]: IdRolePaperRole.MANAGER,
      [UserRole.ADMIN]: IdRolePaperRole.OWNER,
      [UserRole.MASTER_ADMIN]: IdRolePaperRole.FRANCHISOR,
      // Legacy mappings
      [UserRole.EMPLOYEE]: IdRolePaperRole.WORKER,
      [UserRole.BUSINESS_ADMIN]: IdRolePaperRole.OWNER,
      [UserRole.SUPER_ADMIN]: IdRolePaperRole.FRANCHISOR
    };
    return mapping[role] || IdRolePaperRole.WORKER;
  }
}

/**
 * Database 타입 매퍼
 * snake_case <-> camelCase 변환
 */
export class DatabaseMapper {
  /**
   * Database User를 Application User로 변환
   */
  static toAppUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      role: RoleMapper.toCoreRole(dbUser.role),
      name: dbUser.name || dbUser.full_name,
      organizationId: dbUser.organization_id || dbUser.organizationId,
      createdAt: dbUser.created_at || dbUser.createdAt,
      updatedAt: dbUser.updated_at || dbUser.updatedAt,
      isActive: dbUser.is_active !== undefined ? dbUser.is_active : dbUser.isActive
    };
  }
  
  /**
   * Application User를 Database User로 변환
   */
  static toDbUser(appUser: User): any {
    return {
      id: appUser.id,
      email: appUser.email,
      role: appUser.role,
      name: appUser.name,
      organization_id: appUser.organizationId || appUser.organization_id,
      created_at: appUser.createdAt || appUser.created_at,
      updated_at: appUser.updatedAt || appUser.updated_at,
      is_active: appUser.isActive !== undefined ? appUser.isActive : appUser.is_active
    };
  }
}

/**
 * Re-export commonly used types
 */
export { UnifiedIdentity, IdType, PaperType, BusinessType, VerificationStatus };

/**
 * Type guards
 */
export const isUserRole = (value: any): value is UserRole => {
  return Object.values(UserRole).includes(value);
};

export const isDynamicRole = (value: any): value is IdRolePaperRole => {
  return Object.values(IdRolePaperRole).includes(value);
};

/**
 * Default exports for convenience
 */
export default {
  UserRole,
  User,
  RoleMapper,
  DatabaseMapper,
  isUserRole,
  isDynamicRole
};