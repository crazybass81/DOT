/**
 * Type Registry - Central Type Management System
 * 
 * 타입 충돌을 방지하는 중앙 집중식 타입 레지스트리
 * 모든 타입은 명시적 네임스페이스를 통해 접근
 */

// Core type definitions
export * as Core from './core';
export * as Legacy from './legacy';
export * as IdRolePaper from './id-role-paper';
export * as Database from './database';
export * as Schemas from './schemas';

// Type adapters for conversion
export { TypeAdapter } from './adapters';
export { TypeValidator } from './validators';

// Re-export commonly used types with explicit naming
export type { CoreUser, CoreUserRole } from './core';
export type { DynamicRole, Identity } from './id-role-paper';
export type { DatabaseUser, DatabaseOrganization } from './database';

/**
 * Usage Examples:
 * 
 * import { Core, IdRolePaper, TypeAdapter } from '@/types/registry';
 * 
 * const user: Core.User = { ... };
 * const role: IdRolePaper.RoleType = IdRolePaper.RoleType.WORKER;
 * 
 * // Convert between types
 * const coreRole = TypeAdapter.toCoreRole(role);
 */