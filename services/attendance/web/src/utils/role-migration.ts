/**
 * Role Migration Utilities
 * 
 * Legacy 시스템과 새로운 ID-ROLE-PAPER 시스템 간의 변환 및 호환성 유틸리티
 * Phase 1 마이그레이션의 핵심 컴포넌트
 * 
 * Features:
 * - Legacy role → New role 변환
 * - 역할 계층 검증 및 비교
 * - 권한 매핑 및 검증
 * - 마이그레이션 무결성 확인
 */

import {
  RoleType,
  IdType,
  PaperType,
  UnifiedIdentity,
  Paper,
  BusinessRegistration,
  LEGACY_ROLE_MAPPING,
  ROLE_HIERARCHY,
  ROLE_DISPLAY_NAMES,
  PAPER_DISPLAY_NAMES,
  ROLE_CALCULATION_RULES,
  isPersonalId,
  isCorporateId,
  IdRolePaperErrorType,
  IdRolePaperError,
  MIGRATION_FEATURE_FLAGS
} from '../types/id-role-paper-unified';

/**
 * Legacy Role Migration Utility Class
 * 기존 시스템에서 새로운 시스템으로의 원활한 전환을 지원
 */
export class RoleMigrationUtils {
  
  /**
   * Convert legacy role to new RoleType
   * 기존 시스템의 역할을 새로운 RoleType으로 변환
   */
  static convertLegacyRole(legacyRole: string): RoleType {
    // 정확한 매칭 시도
    const exactMatch = LEGACY_ROLE_MAPPING[legacyRole];
    if (exactMatch) {
      return exactMatch;
    }

    // 대소문자 무관 매칭 시도
    const lowercaseMatch = LEGACY_ROLE_MAPPING[legacyRole.toLowerCase()];
    if (lowercaseMatch) {
      return lowercaseMatch;
    }

    // 부분 매칭 시도
    const partialMatches = Object.entries(LEGACY_ROLE_MAPPING).filter(
      ([key, _]) => key.toLowerCase().includes(legacyRole.toLowerCase()) ||
                   legacyRole.toLowerCase().includes(key.toLowerCase())
    );

    if (partialMatches.length === 1) {
      console.warn(`Partial role match: ${legacyRole} → ${partialMatches[0][1]}`);
      return partialMatches[0][1];
    }

    // 매칭 실패시 기본값
    console.error(`Unknown legacy role: ${legacyRole}, defaulting to SEEKER`);
    return RoleType.SEEKER;
  }

  /**
   * Convert new role back to legacy format (for compatibility)
   * 새로운 역할을 기존 형식으로 역변환 (호환성용)
   */
  static convertToLegacyRole(newRole: RoleType): string {
    const reverseMappingTable: Record<RoleType, string> = {
      [RoleType.FRANCHISOR]: 'MASTER_ADMIN',
      [RoleType.FRANCHISEE]: 'ADMIN', 
      [RoleType.OWNER]: 'ADMIN',
      [RoleType.MANAGER]: 'MANAGER',
      [RoleType.SUPERVISOR]: 'MANAGER', // Map to closest legacy equivalent
      [RoleType.WORKER]: 'WORKER',
      [RoleType.SEEKER]: 'WORKER' // Default to minimum legacy role
    };

    return reverseMappingTable[newRole] || 'WORKER';
  }

  /**
   * Get user-friendly display name for role
   * 역할의 사용자 친화적 표시명 반환
   */
  static getRoleDisplayName(role: RoleType, language: 'ko' | 'en' = 'ko'): string {
    if (language === 'ko') {
      return ROLE_DISPLAY_NAMES[role] || role;
    }
    
    // English display names
    const englishNames: Record<RoleType, string> = {
      [RoleType.SEEKER]: 'Job Seeker',
      [RoleType.WORKER]: 'Worker',
      [RoleType.MANAGER]: 'Manager',
      [RoleType.SUPERVISOR]: 'Supervisor',
      [RoleType.OWNER]: 'Business Owner',
      [RoleType.FRANCHISEE]: 'Franchisee',
      [RoleType.FRANCHISOR]: 'Franchisor'
    };
    
    return englishNames[role] || role;
  }

  /**
   * Get paper document display name
   * 문서 타입의 표시명 반환
   */
  static getPaperDisplayName(paperType: PaperType, language: 'ko' | 'en' = 'ko'): string {
    if (language === 'ko') {
      return PAPER_DISPLAY_NAMES[paperType] || paperType;
    }
    return paperType; // English names are already in enum
  }

  /**
   * Validate role transition
   * 역할 전환의 유효성 검증
   */
  static validateRoleTransition(fromRole: RoleType, toRole: RoleType): {
    isValid: boolean;
    reason?: string;
    requiredPapers?: PaperType[];
  } {
    const fromLevel = ROLE_HIERARCHY[fromRole];
    const toLevel = ROLE_HIERARCHY[toRole];

    // 동일 레벨 또는 하향 전환은 항상 허용
    if (toLevel <= fromLevel) {
      return { isValid: true };
    }

    // 상향 전환의 경우 필요한 papers 확인
    const targetRule = ROLE_CALCULATION_RULES.find(rule => rule.resultRole === toRole);
    if (!targetRule) {
      return {
        isValid: false,
        reason: `No calculation rule found for role: ${toRole}`
      };
    }

    // 의존성 확인
    if (targetRule.dependencies && !targetRule.dependencies.includes(fromRole)) {
      return {
        isValid: false,
        reason: `Role ${toRole} requires prerequisite role from: ${targetRule.dependencies.join(', ')}`,
        requiredPapers: targetRule.papers
      };
    }

    return {
      isValid: true,
      requiredPapers: targetRule.papers
    };
  }

  /**
   * Calculate role from papers
   * Papers 조합으로부터 역할을 계산
   */
  static calculateRoleFromPapers(
    papers: Paper[], 
    businessContext?: string
  ): RoleType[] {
    if (!papers || papers.length === 0) {
      return [RoleType.SEEKER];
    }

    const activePapers = papers.filter(paper => 
      paper.isActive && 
      (!paper.validUntil || new Date(paper.validUntil) > new Date())
    );

    const paperTypes = activePapers.map(p => p.paperType);
    const matchingRoles: RoleType[] = [];

    // 각 규칙에 대해 매칭 확인
    for (const rule of ROLE_CALCULATION_RULES) {
      if (rule.papers.length === 0 && paperTypes.length === 0) {
        // SEEKER 규칙
        matchingRoles.push(rule.resultRole);
        continue;
      }

      // 필요한 모든 papers가 있는지 확인
      const hasAllRequiredPapers = rule.papers.every(requiredPaper =>
        paperTypes.includes(requiredPaper)
      );

      if (hasAllRequiredPapers) {
        // 비즈니스 컨텍스트 확인
        if (rule.businessContext && !businessContext) {
          continue; // Skip if business context required but not provided
        }

        matchingRoles.push(rule.resultRole);
      }
    }

    // 중복 제거 및 계층 순 정렬
    const uniqueRoles = Array.from(new Set(matchingRoles));
    return uniqueRoles.sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
  }

  /**
   * Get highest role from role array
   * 역할 배열에서 최고 권한 역할 반환
   */
  static getHighestRole(roles: RoleType[]): RoleType {
    if (!roles || roles.length === 0) {
      return RoleType.SEEKER;
    }

    return roles.reduce((highest, current) => 
      ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest
    );
  }

  /**
   * Check if role has specific permission
   * 역할이 특정 권한을 가지고 있는지 확인
   */
  static hasPermission(role: RoleType, resource: string, action: string): boolean {
    // 기본 권한 매트릭스 (확장 가능)
    const permissionMatrix: Record<RoleType, Record<string, string[]>> = {
      [RoleType.FRANCHISOR]: {
        '*': ['*'] // All permissions
      },
      [RoleType.FRANCHISEE]: {
        'franchise': ['read', 'write', 'manage'],
        'attendance': ['read', 'write', 'manage'],
        'reports': ['read', 'create'],
        'users': ['read', 'write']
      },
      [RoleType.OWNER]: {
        'business': ['read', 'write', 'manage'],
        'attendance': ['read', 'write', 'manage'],
        'reports': ['read', 'create'],
        'users': ['read', 'write']
      },
      [RoleType.MANAGER]: {
        'attendance': ['read', 'write'],
        'reports': ['read'],
        'users': ['read']
      },
      [RoleType.SUPERVISOR]: {
        'attendance': ['read', 'write'],
        'reports': ['read'],
        'users': ['read']
      },
      [RoleType.WORKER]: {
        'attendance': ['read'],
        'profile': ['read', 'write']
      },
      [RoleType.SEEKER]: {
        'profile': ['read']
      }
    };

    const rolePermissions = permissionMatrix[role];
    if (!rolePermissions) return false;

    // Wildcard permission check
    if (rolePermissions['*'] && rolePermissions['*'].includes('*')) {
      return true;
    }

    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes('*') || resourcePermissions.includes(action);
  }

  /**
   * Migrate user data structure
   * 사용자 데이터 구조를 새로운 형식으로 마이그레이션
   */
  static migrateUserData(legacyUser: any): Partial<UnifiedIdentity> {
    return {
      id: legacyUser.id,
      idType: legacyUser.idType || IdType.PERSONAL, // Default to PERSONAL
      email: legacyUser.email,
      phone: legacyUser.phone,
      fullName: legacyUser.full_name || legacyUser.name,
      authUserId: legacyUser.auth_user_id || legacyUser.user_id,
      isVerified: legacyUser.is_verified || false,
      isActive: legacyUser.is_active !== false, // Default to true
      profileData: legacyUser.profile_data || legacyUser.metadata || {},
      createdAt: new Date(legacyUser.created_at),
      updatedAt: new Date(legacyUser.updated_at || legacyUser.created_at)
    };
  }

  /**
   * Validate Corporate ID constraints
   * 기업 ID의 제약조건 검증
   */
  static validateCorporateIdConstraints(identity: UnifiedIdentity, papers: Paper[]): IdRolePaperError[] {
    const errors: IdRolePaperError[] = [];

    if (!isCorporateId(identity)) {
      return errors; // Not a corporate ID, no constraints
    }

    // Corporate ID는 Personal ID 링크가 필요
    if (!identity.linkedPersonalId) {
      errors.push({
        type: IdRolePaperErrorType.CORPORATE_ID_REQUIRES_PERSONAL_LINK,
        message: 'Corporate ID must be linked to a Personal ID',
        identityId: identity.id
      });
    }

    // Corporate ID는 직접 Employment Contract를 가질 수 없음
    const hasEmploymentContract = papers.some(p => 
      p.paperType === PaperType.EMPLOYMENT_CONTRACT && p.ownerIdentityId === identity.id
    );

    if (hasEmploymentContract) {
      errors.push({
        type: IdRolePaperErrorType.CORPORATE_ID_CANNOT_HAVE_EMPLOYMENT_CONTRACT,
        message: 'Corporate ID cannot directly hold Employment Contract',
        identityId: identity.id,
        paperType: PaperType.EMPLOYMENT_CONTRACT
      });
    }

    return errors;
  }

  /**
   * Generate migration report
   * 마이그레이션 보고서 생성
   */
  static generateMigrationReport(
    legacyUsers: any[], 
    migratedUsers: UnifiedIdentity[]
  ): {
    totalUsers: number;
    successfulMigrations: number;
    failedMigrations: number;
    roleMappings: Record<string, number>;
    errors: string[];
  } {
    const roleMappings: Record<string, number> = {};
    const errors: string[] = [];
    
    let successfulMigrations = 0;
    let failedMigrations = 0;

    legacyUsers.forEach((legacyUser, index) => {
      try {
        const migratedUser = migratedUsers[index];
        if (migratedUser) {
          successfulMigrations++;
          
          // Count role mappings
          const legacyRole = legacyUser.role || 'UNKNOWN';
          roleMappings[legacyRole] = (roleMappings[legacyRole] || 0) + 1;
        } else {
          failedMigrations++;
          errors.push(`Failed to migrate user ${legacyUser.id || index}`);
        }
      } catch (error) {
        failedMigrations++;
        errors.push(`Error migrating user ${legacyUser.id || index}: ${error}`);
      }
    });

    return {
      totalUsers: legacyUsers.length,
      successfulMigrations,
      failedMigrations,
      roleMappings,
      errors
    };
  }

  /**
   * Debug role calculation
   * 역할 계산 과정 디버깅 (개발용)
   */
  static debugRoleCalculation(
    identity: UnifiedIdentity,
    papers: Paper[],
    businessRegistrations: BusinessRegistration[]
  ): {
    identity: UnifiedIdentity;
    papers: Paper[];
    appliedRules: Array<{
      rule: any;
      matched: boolean;
      reason: string;
    }>;
    finalRoles: RoleType[];
    highestRole: RoleType;
    warnings: string[];
  } {
    const appliedRules: any[] = [];
    const warnings: string[] = [];
    
    if (!MIGRATION_FEATURE_FLAGS.DEBUG_ROLE_CALCULATION) {
      console.warn('Debug mode not enabled. Set NEXT_PUBLIC_DEBUG_ROLES=true');
    }

    const activePapers = papers.filter(p => p.isActive);
    const paperTypes = activePapers.map(p => p.paperType);

    // Test each rule
    ROLE_CALCULATION_RULES.forEach(rule => {
      let matched = false;
      let reason = '';

      if (rule.papers.length === 0) {
        matched = paperTypes.length === 0;
        reason = matched ? 'No papers required (SEEKER)' : 'Has papers, not SEEKER';
      } else {
        const hasAllPapers = rule.papers.every(required => paperTypes.includes(required));
        matched = hasAllPapers;
        reason = hasAllPapers 
          ? `Has all required papers: ${rule.papers.join(', ')}` 
          : `Missing papers: ${rule.papers.filter(p => !paperTypes.includes(p)).join(', ')}`;
      }

      appliedRules.push({
        rule: {
          papers: rule.papers,
          resultRole: rule.resultRole,
          description: rule.description
        },
        matched,
        reason
      });
    });

    const calculatedRoles = this.calculateRoleFromPapers(papers);
    const highestRole = this.getHighestRole(calculatedRoles);

    return {
      identity,
      papers: activePapers,
      appliedRules,
      finalRoles: calculatedRoles,
      highestRole,
      warnings
    };
  }
}

/**
 * Migration Batch Processor
 * 대량 마이그레이션 처리를 위한 배치 프로세서
 */
export class MigrationBatchProcessor {
  private batchSize = 100;
  private processed = 0;
  private errors: string[] = [];

  /**
   * Process users in batches
   * 사용자를 배치 단위로 처리
   */
  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    const totalItems = items.length;

    for (let i = 0; i < totalItems; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      try {
        const batchResults = await Promise.all(
          batch.map(item => processor(item))
        );
        
        results.push(...batchResults);
        this.processed += batch.length;
        
        if (onProgress) {
          onProgress(this.processed, totalItems);
        }
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        this.errors.push(`Batch processing error at index ${i}: ${error}`);
        console.error(`Batch processing failed at index ${i}:`, error);
      }
    }

    return results;
  }

  getErrors(): string[] {
    return this.errors;
  }

  getProcessedCount(): number {
    return this.processed;
  }
}

// Export utility functions for direct use
export const convertLegacyRole = RoleMigrationUtils.convertLegacyRole;
export const convertToLegacyRole = RoleMigrationUtils.convertToLegacyRole;
export const getRoleDisplayName = RoleMigrationUtils.getRoleDisplayName;
export const validateRoleTransition = RoleMigrationUtils.validateRoleTransition;
export const calculateRoleFromPapers = RoleMigrationUtils.calculateRoleFromPapers;
export const getHighestRole = RoleMigrationUtils.getHighestRole;
export const hasPermission = RoleMigrationUtils.hasPermission;