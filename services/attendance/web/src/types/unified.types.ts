/**
 * Unified Types - DEPRECATED: Use id-role-paper-unified.ts instead
 * Migration Phase 1: All types here are deprecated and will be removed
 * 
 * 기존 Unified Types → ID-ROLE-PAPER 통합 타입 시스템으로 전환
 * @deprecated Use id-role-paper-unified.ts for all new development
 */

import { 
  IdType, 
  RoleType, 
  BusinessType,
  UnifiedIdentity,
  BusinessRegistration,
  Paper,
  ComputedRole,
  VerificationStatus
} from './id-role-paper-unified';

// =====================================================
// Core Identity Types
// =====================================================

// Legacy IdType - DEPRECATED: Use IdType from id-role-paper-unified.ts
/** @deprecated Use IdType from id-role-paper-unified.ts instead */
export type LegacyIdType = 
  | 'personal'           // 개인
  | 'business_owner'     // 사업자
  | 'corporation'        // 법인
  | 'franchise_hq'       // 프랜차이즈 본사

// Mapping from legacy IdType to new IdType
export const LEGACY_ID_TYPE_MAPPING: Record<LegacyIdType, IdType> = {
  'personal': IdType.PERSONAL,
  'business_owner': IdType.CORPORATE,
  'corporation': IdType.CORPORATE,
  'franchise_hq': IdType.CORPORATE,
};

// Legacy UnifiedRole - DEPRECATED: Use RoleType from id-role-paper-unified.ts
/** @deprecated Use RoleType from id-role-paper-unified.ts instead */
export type UnifiedRole = 
  | 'master'           // 마스터 관리자 (시스템 전체)
  | 'admin'            // 사업자/관리자 (조직 내)
  | 'manager'          // 매니저 (부서/팀 관리)
  | 'worker'           // 워커 (일반 직원)
  | 'franchise_admin'  // 프랜차이즈 본사 관리자

// Mapping from legacy UnifiedRole to new RoleType
export const LEGACY_UNIFIED_ROLE_MAPPING: Record<UnifiedRole, RoleType> = {
  'master': RoleType.FRANCHISOR,
  'franchise_admin': RoleType.FRANCHISOR,
  'admin': RoleType.OWNER,
  'manager': RoleType.MANAGER,
  'worker': RoleType.WORKER,
};

// Legacy compatibility exports for migration period
/** @deprecated All interfaces below are deprecated. Use types from id-role-paper-unified.ts */

// Re-export new types for compatibility
export type { UnifiedIdentity as Identity } from './id-role-paper-unified';
export type { BusinessRegistration as Organization } from './id-role-paper-unified';

/**
 * Generate unique organization code (legacy utility)
 * @deprecated This function will be moved to a utility module
 */
export function generateOrgCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// All remaining functions are deprecated and should use the new ID-ROLE-PAPER system
// This file serves only as a compatibility layer during migration

export default {
  // Export mappings for easy reference during migration
  LEGACY_ID_TYPE_MAPPING,
  LEGACY_UNIFIED_ROLE_MAPPING,
};
