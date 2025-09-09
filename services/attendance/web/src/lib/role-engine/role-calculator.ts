/**
 * Role Calculation Engine - Core business logic implementation
 * Implements the confirmed ID-ROLE-PAPER architecture for role computation
 * 
 * This implements the role calculation rules defined in Final-ID-ROLE-PAPER-Architecture.md
 * with Personal/Corporate IDs, 7 roles, and 6 paper types
 */

import {
  IdType,
  RoleType,
  PaperType,
  BusinessType,
  UnifiedIdentity,
  BusinessRegistration,
  Paper,
  ComputedRole,
  RoleCalculationContext,
  RoleCalculationResult,
  ROLE_CALCULATION_RULES,
  ROLE_HIERARCHY,
  ROLE_DEPENDENCIES,
  CORPORATE_ID_RULES,
  IdRolePaperError,
  IdRolePaperErrorType,
  isPersonalId,
  isCorporateId
} from '../../types/id-role-paper';

/**
 * Core Role Calculation Engine
 * Implements business rules for dynamic role assignment based on papers
 */
export class RoleCalculator {
  /**
   * Calculate roles for an identity based on their papers and business registrations
   */
  static calculateRoles(context: RoleCalculationContext): RoleCalculationResult {
    const { identity, papers, businessRegistrations } = context;
    const result: RoleCalculationResult = {
      identity,
      calculatedRoles: [],
      warnings: [],
      errors: []
    };

    try {
      // Validate identity type constraints
      this.validateIdentityConstraints(identity, papers, result);

      // Get active papers for this identity
      const activePapers = papers.filter(paper => 
        paper.ownerIdentityId === identity.id && paper.isActive
      );

      // Calculate roles for each business context
      const businessContexts = this.getBusinessContexts(identity, activePapers, businessRegistrations);
      
      for (const businessContext of businessContexts) {
        const contextRoles = this.calculateRolesForBusinessContext(
          identity,
          businessContext.papers,
          businessContext.business,
          result
        );
        result.calculatedRoles.push(...contextRoles);
      }

      // If no business contexts, check for global roles (SEEKER)
      if (businessContexts.length === 0) {
        const globalRoles = this.calculateGlobalRoles(identity, activePapers, result);
        result.calculatedRoles.push(...globalRoles);
      }

      // Remove duplicate roles and validate dependencies
      result.calculatedRoles = this.deduplicateAndValidateRoles(result.calculatedRoles, result);

    } catch (error) {
      result.errors?.push(`Role calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate identity type constraints
   */
  private static validateIdentityConstraints(
    identity: UnifiedIdentity,
    papers: Paper[],
    result: RoleCalculationResult
  ): void {
    if (isCorporateId(identity)) {
      // Corporate IDs cannot hold Employment Contracts
      const employmentPapers = papers.filter(p => 
        p.ownerIdentityId === identity.id && 
        p.paperType === PaperType.EMPLOYMENT_CONTRACT &&
        p.isActive
      );

      if (employmentPapers.length > 0) {
        result.errors?.push(this.createError(
          IdRolePaperErrorType.CORPORATE_ID_CANNOT_HAVE_EMPLOYMENT_CONTRACT,
          'Corporate IDs cannot directly hold Employment Contracts',
          { identityId: identity.id }
        ).message);
      }

      // Corporate IDs must be linked to Personal IDs
      if (!identity.linkedPersonalId) {
        result.warnings?.push('Corporate ID should be linked to a Personal ID owner');
      }
    }
  }

  /**
   * Get business contexts for role calculation
   */
  private static getBusinessContexts(
    identity: UnifiedIdentity,
    papers: Paper[],
    businessRegistrations: BusinessRegistration[]
  ): Array<{ business?: BusinessRegistration; papers: Paper[] }> {
    const contexts: Array<{ business?: BusinessRegistration; papers: Paper[] }> = [];
    
    // Group papers by business context
    const papersByBusiness = new Map<string, Paper[]>();
    
    for (const paper of papers) {
      if (paper.relatedBusinessId) {
        const businessPapers = papersByBusiness.get(paper.relatedBusinessId) || [];
        businessPapers.push(paper);
        papersByBusiness.set(paper.relatedBusinessId, businessPapers);
      }
    }

    // Create context for each business
    for (const [businessId, businessPapers] of papersByBusiness) {
      const business = businessRegistrations.find(b => b.id === businessId);
      if (business) {
        contexts.push({ business, papers: businessPapers });
      }
    }

    return contexts;
  }

  /**
   * Calculate roles for a specific business context
   */
  private static calculateRolesForBusinessContext(
    identity: UnifiedIdentity,
    papers: Paper[],
    business?: BusinessRegistration,
    result?: RoleCalculationResult
  ): Array<{
    role: RoleType;
    sourcePapers: string[];
    businessContext?: string;
    metadata?: Record<string, any>;
  }> {
    const roles: Array<{
      role: RoleType;
      sourcePapers: string[];
      businessContext?: string;
      metadata?: Record<string, any>;
    }> = [];

    const paperTypes = papers.map(p => p.paperType);
    
    // Sort rules by role hierarchy (highest first) to get the most specific role
    const sortedRules = [...ROLE_CALCULATION_RULES].sort((a, b) => 
      (ROLE_HIERARCHY[b.resultRole] || 0) - (ROLE_HIERARCHY[a.resultRole] || 0)
    );

    // Find all matching roles
    const matchingRoles: typeof roles = [];
    
    for (const rule of sortedRules) {
      if (this.checkRuleMatch(paperTypes, rule.papers)) {
        const role = {
          role: rule.resultRole,
          sourcePapers: papers
            .filter(p => rule.papers.includes(p.paperType))
            .map(p => p.id),
          businessContext: business?.id,
          metadata: {
            ruleName: rule.description,
            businessName: business?.businessName,
            businessType: business?.businessType,
            hierarchy: ROLE_HIERARCHY[rule.resultRole] || 0
          }
        };
        matchingRoles.push(role);
      }
    }

    // Apply role hierarchy logic
    if (matchingRoles.length > 0) {
      // Group by role family
      const businessOwnershipRoles = [RoleType.OWNER, RoleType.FRANCHISEE, RoleType.FRANCHISOR];
      const employmentRoles = [RoleType.WORKER, RoleType.MANAGER, RoleType.SUPERVISOR];

      const ownershipMatches = matchingRoles.filter(r => businessOwnershipRoles.includes(r.role));
      const employmentMatches = matchingRoles.filter(r => employmentRoles.includes(r.role));

      // For business ownership roles, only assign the highest one
      if (ownershipMatches.length > 0) {
        const highestOwnership = ownershipMatches.reduce((highest, current) => 
          (current.metadata?.hierarchy || 0) > (highest.metadata?.hierarchy || 0) ? current : highest
        );
        roles.push(highestOwnership);
      }

      // For employment roles, assign all applicable (WORKER + MANAGER/SUPERVISOR)
      if (employmentMatches.length > 0) {
        // Always include WORKER if present
        const workerRole = employmentMatches.find(r => r.role === RoleType.WORKER);
        if (workerRole) {
          roles.push(workerRole);
        }

        // Add the highest management role
        const managementRoles = employmentMatches.filter(r => r.role !== RoleType.WORKER);
        if (managementRoles.length > 0) {
          const highestManagement = managementRoles.reduce((highest, current) => 
            (current.metadata?.hierarchy || 0) > (highest.metadata?.hierarchy || 0) ? current : highest
          );
          roles.push(highestManagement);
        }
      }

      // Handle SEEKER role separately
      const seekerRole = matchingRoles.find(r => r.role === RoleType.SEEKER);
      if (seekerRole && roles.length === 0) {
        roles.push(seekerRole);
      }
    }

    return roles;
  }

  /**
   * Calculate global roles (roles not requiring business context)
   */
  private static calculateGlobalRoles(
    identity: UnifiedIdentity,
    papers: Paper[],
    result?: RoleCalculationResult
  ): Array<{
    role: RoleType;
    sourcePapers: string[];
    businessContext?: string;
    metadata?: Record<string, any>;
  }> {
    // If no papers at all, user gets SEEKER role
    if (papers.length === 0) {
      return [{
        role: RoleType.SEEKER,
        sourcePapers: [],
        metadata: {
          ruleName: 'Default role for users without any papers',
          reason: 'No active papers found'
        }
      }];
    }

    return [];
  }

  /**
   * Check if paper types match a rule's required papers
   */
  private static checkRuleMatch(actualPapers: PaperType[], requiredPapers: PaperType[]): boolean {
    if (requiredPapers.length === 0) {
      // Special case for SEEKER role - only applies when no papers at all
      return actualPapers.length === 0;
    }

    // Check if all required papers are present
    return requiredPapers.every(required => actualPapers.includes(required));
  }

  /**
   * Check role dependencies are satisfied
   */
  private static checkRoleDependencies(
    requiredRoles: RoleType[],
    currentRoles: RoleType[],
    paperTypes: PaperType[]
  ): boolean {
    // Check if required roles are already assigned or can be derived from papers
    for (const requiredRole of requiredRoles) {
      if (currentRoles.includes(requiredRole)) {
        continue; // Already have this role
      }

      // Check if papers can grant this required role
      const canGrantRole = ROLE_CALCULATION_RULES.some(rule => 
        rule.resultRole === requiredRole &&
        this.checkRuleMatch(paperTypes, rule.papers)
      );

      if (!canGrantRole) {
        return false; // Missing required role and can't derive it
      }
    }

    return true;
  }

  /**
   * Remove duplicate roles and validate all dependencies
   */
  private static deduplicateAndValidateRoles(
    roles: Array<{
      role: RoleType;
      sourcePapers: string[];
      businessContext?: string;
      metadata?: Record<string, any>;
    }>,
    result: RoleCalculationResult
  ): Array<{
    role: RoleType;
    sourcePapers: string[];
    businessContext?: string;
    metadata?: Record<string, any>;
  }> {
    // Remove duplicates based on role + business context
    const uniqueRoles = new Map<string, typeof roles[0]>();
    
    for (const role of roles) {
      const key = `${role.role}-${role.businessContext || 'global'}`;
      if (!uniqueRoles.has(key)) {
        uniqueRoles.set(key, role);
      } else {
        // Merge source papers if same role in same context
        const existing = uniqueRoles.get(key)!;
        existing.sourcePapers = [...new Set([...existing.sourcePapers, ...role.sourcePapers])];
      }
    }

    const deduplicatedRoles = Array.from(uniqueRoles.values());

    // Validate role dependencies
    this.validateRoleDependencies(deduplicatedRoles, result);

    return deduplicatedRoles;
  }

  /**
   * Validate role dependencies are satisfied
   */
  private static validateRoleDependencies(
    roles: Array<{ role: RoleType; businessContext?: string }>,
    result: RoleCalculationResult
  ): void {
    for (const dependency of ROLE_DEPENDENCIES) {
      const childRoles = roles.filter(r => r.role === dependency.childRole);
      
      for (const childRole of childRoles) {
        const hasParentRole = roles.some(r => 
          r.role === dependency.parentRole && 
          r.businessContext === childRole.businessContext
        );

        if (!hasParentRole) {
          result.warnings?.push(
            `Role ${dependency.childRole} requires ${dependency.parentRole} in the same business context`
          );
        }
      }
    }
  }

  /**
   * Get the highest priority role for an identity
   */
  static getHighestRole(roles: ComputedRole[]): RoleType {
    if (roles.length === 0) {
      return RoleType.SEEKER;
    }

    return roles.reduce((highest, current) => {
      const highestLevel = ROLE_HIERARCHY[highest.role] || 0;
      const currentLevel = ROLE_HIERARCHY[current.role] || 0;
      return currentLevel > highestLevel ? current : highest;
    }).role;
  }

  /**
   * Get the highest priority role from an array of role types
   */
  static getHighestPriorityRole(roles: RoleType[]): RoleType {
    if (roles.length === 0) {
      return RoleType.SEEKER;
    }

    return roles.reduce((highest, current) => {
      const highestLevel = ROLE_HIERARCHY[highest] || 0;
      const currentLevel = ROLE_HIERARCHY[current] || 0;
      return currentLevel > highestLevel ? current : highest;
    });
  }

  /**
   * Check if an identity has a specific role in any business context
   */
  static hasRole(roles: ComputedRole[], targetRole: RoleType): boolean {
    return roles.some(role => role.role === targetRole && role.isActive);
  }

  /**
   * Check if an identity has a role in a specific business context
   */
  static hasRoleInBusiness(
    roles: ComputedRole[], 
    targetRole: RoleType, 
    businessId: string
  ): boolean {
    return roles.some(role => 
      role.role === targetRole && 
      role.businessContextId === businessId && 
      role.isActive
    );
  }

  /**
   * Get all roles for a specific business context
   */
  static getRolesForBusiness(roles: ComputedRole[], businessId: string): ComputedRole[] {
    return roles.filter(role => 
      role.businessContextId === businessId && role.isActive
    );
  }

  /**
   * Validate paper combination is valid for role assignment
   */
  static validatePaperCombination(papers: Paper[] | PaperType[], expectedRoles?: RoleType[]): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
    possibleRoles: RoleType[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const possibleRoles: RoleType[] = [];

    // Extract paper types from Paper objects or use PaperType array directly
    const paperTypes = Array.isArray(papers) && papers.length > 0 && typeof papers[0] === 'object' && 'paperType' in papers[0]
      ? (papers as Paper[]).map(p => p.paperType)
      : papers as PaperType[];

    // Check each rule to see what roles these papers could grant
    for (const rule of ROLE_CALCULATION_RULES) {
      if (this.checkRuleMatch(paperTypes, rule.papers)) {
        possibleRoles.push(rule.resultRole);
      }
    }

    // If expected roles are provided, check if papers can achieve them
    if (expectedRoles && expectedRoles.length > 0) {
      for (const expectedRole of expectedRoles) {
        if (!possibleRoles.includes(expectedRole)) {
          const rule = ROLE_CALCULATION_RULES.find(r => r.resultRole === expectedRole);
          if (rule) {
            const missingPapers = rule.papers.filter(p => !paperTypes.includes(p));
            if (missingPapers.length > 0) {
              issues.push(`Missing papers for ${expectedRole}: ${missingPapers.join(', ')}`);
              suggestions.push(`Add ${missingPapers.join(', ')} to achieve ${expectedRole} role`);
            }
          }
        }
      }
    }

    // Validate paper combinations are logical
    if (paperTypes.includes(PaperType.EMPLOYMENT_CONTRACT) && 
        paperTypes.includes(PaperType.BUSINESS_REGISTRATION)) {
      issues.push('Cannot have both Employment Contract and Business Registration for same identity');
    }

    if (paperTypes.includes(PaperType.AUTHORITY_DELEGATION) && 
        !paperTypes.includes(PaperType.EMPLOYMENT_CONTRACT)) {
      issues.push('Authority Delegation requires Employment Contract');
      suggestions.push('Add Employment Contract to use Authority Delegation');
    }

    if (paperTypes.includes(PaperType.SUPERVISOR_AUTHORITY_DELEGATION) && 
        !paperTypes.includes(PaperType.EMPLOYMENT_CONTRACT)) {
      issues.push('Supervisor Authority Delegation requires Employment Contract');
      suggestions.push('Add Employment Contract to use Supervisor Authority Delegation');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
      possibleRoles
    };
  }

  /**
   * Get dependent roles (roles that depend on the given role)
   */
  static getDependentRoles(role: RoleType): RoleType[] {
    return ROLE_DEPENDENCIES
      .filter(dep => dep.parentRole === role)
      .map(dep => dep.childRole);
  }

  /**
   * Get prerequisite roles (roles required for the given role)
   */
  static getPrerequisiteRoles(role: RoleType): RoleType[] {
    return ROLE_DEPENDENCIES
      .filter(dep => dep.childRole === role)
      .map(dep => dep.parentRole);
  }

  /**
   * Check if a role has a dependency on another role
   */
  static roleHasDependency(childRole: RoleType, parentRole: RoleType): boolean {
    return ROLE_DEPENDENCIES.some(dep => 
      dep.childRole === childRole && dep.parentRole === parentRole
    );
  }

  /**
   * Analyze role potential for an identity
   */
  static analyzeRolePotential(papers: Paper[] | PaperType[]): {
    currentRoles: RoleType[];
    potentialRoles: RoleType[];
    nextSteps: Array<{ action: string; targetRole: RoleType; requiredPapers: PaperType[] }>;
    missingPapers: Record<RoleType, PaperType[]>;
  } {
    const currentRoles: RoleType[] = [];
    const potentialRoles: RoleType[] = [];
    const nextSteps: Array<{ action: string; targetRole: RoleType; requiredPapers: PaperType[] }> = [];
    const missingPapers: Record<RoleType, PaperType[]> = {} as Record<RoleType, PaperType[]>;

    // Extract paper types from Paper objects or use PaperType array directly
    const paperTypes = Array.isArray(papers) && papers.length > 0 && typeof papers[0] === 'object' && 'paperType' in papers[0]
      ? (papers as Paper[]).map(p => p.paperType)
      : papers as PaperType[];

    // Find current roles
    for (const rule of ROLE_CALCULATION_RULES) {
      if (this.checkRuleMatch(paperTypes, rule.papers)) {
        currentRoles.push(rule.resultRole);
      } else {
        // Find missing papers for potential roles
        const missingForRole = rule.papers.filter(p => !paperTypes.includes(p));
        if (missingForRole.length > 0 && missingForRole.length <= 2) { // Only consider achievable roles
          potentialRoles.push(rule.resultRole);
          missingPapers[rule.resultRole] = missingForRole;
          
          // Add next steps for achievable roles
          nextSteps.push({
            action: 'obtain',
            targetRole: rule.resultRole,
            requiredPapers: missingForRole
          });
        }
      }
    }

    return { currentRoles, potentialRoles, nextSteps, missingPapers };
  }

  /**
   * Generate role transition plan
   */
  static generateRoleTransitionPlan(currentPapers: PaperType[], targetRole: RoleType): {
    isAchievable: boolean;
    requiredActions: Array<{ action: string; paperType: PaperType; description: string }>;
    estimatedSteps: number;
  } {
    const rule = ROLE_CALCULATION_RULES.find(r => r.resultRole === targetRole);
    if (!rule) {
      return {
        isAchievable: false,
        requiredActions: [],
        estimatedSteps: 0
      };
    }

    const missingPapers = rule.papers.filter(p => !currentPapers.includes(p));
    const requiredActions = missingPapers.map(paperType => ({
      action: 'obtain',
      paperType,
      description: `Obtain ${paperType} to qualify for ${targetRole} role`
    }));

    return {
      isAchievable: true,
      requiredActions,
      estimatedSteps: requiredActions.length
    };
  }

  /**
   * Create structured error object
   */
  private static createError(
    type: IdRolePaperErrorType,
    message: string,
    details?: Record<string, any>
  ): IdRolePaperError {
    return {
      type,
      message,
      details
    };
  }
}

/**
 * Utility functions for role calculations
 */
export class RoleCalculationUtils {
  /**
   * Get role display information
   */
  static getRoleInfo(role: RoleType): {
    displayName: string;
    hierarchy: number;
    description: string;
  } {
    const displayNames: Record<RoleType, string> = {
      [RoleType.SEEKER]: '구직자',
      [RoleType.WORKER]: '워커',
      [RoleType.MANAGER]: '매니저',
      [RoleType.OWNER]: '사업자관리자',
      [RoleType.FRANCHISEE]: '가맹점주',
      [RoleType.FRANCHISOR]: '가맹본부관리자',
      [RoleType.SUPERVISOR]: '수퍼바이저'
    };

    const descriptions: Record<RoleType, string> = {
      [RoleType.SEEKER]: '구직중이거나 어떤 PAPER도 갖지 않은 상태',
      [RoleType.WORKER]: '근로계약서를 보유한 직원',
      [RoleType.MANAGER]: '근로계약서 + 권한위임장을 보유한 관리자',
      [RoleType.OWNER]: '사업자등록증을 보유한 사업자',
      [RoleType.FRANCHISEE]: '가맹계약을 체결한 가맹점주',
      [RoleType.FRANCHISOR]: '가맹본부 등록증을 보유한 가맹본부',
      [RoleType.SUPERVISOR]: '근로계약서 + 수퍼바이저 권한위임장을 보유한 수퍼바이저'
    };

    return {
      displayName: displayNames[role],
      hierarchy: ROLE_HIERARCHY[role],
      description: descriptions[role]
    };
  }

  /**
   * Compare roles by hierarchy
   */
  static compareRoles(roleA: RoleType, roleB: RoleType): number {
    const levelA = ROLE_HIERARCHY[roleA] || 0;
    const levelB = ROLE_HIERARCHY[roleB] || 0;
    return levelB - levelA; // Higher level first
  }

  /**
   * Check if roleA is higher than roleB in hierarchy
   */
  static isHigherRole(roleA: RoleType, roleB: RoleType): boolean {
    const levelA = ROLE_HIERARCHY[roleA] || 0;
    const levelB = ROLE_HIERARCHY[roleB] || 0;
    return levelA > levelB;
  }

  /**
   * Get required papers for a specific role
   */
  static getRequiredPapersForRole(role: RoleType): PaperType[][] {
    return ROLE_CALCULATION_RULES
      .filter(rule => rule.resultRole === role)
      .map(rule => rule.papers);
  }

  /**
   * Get role dependencies
   */
  static getRoleDependencies(role: RoleType): RoleType[] {
    return ROLE_DEPENDENCIES
      .filter(dep => dep.childRole === role)
      .map(dep => dep.parentRole);
  }
}

/**
 * Role Calculator Service - Singleton wrapper for role calculation functionality
 */
export class RoleCalculatorService {
  private static instance: RoleCalculatorService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): RoleCalculatorService {
    if (!RoleCalculatorService.instance) {
      RoleCalculatorService.instance = new RoleCalculatorService();
    }
    return RoleCalculatorService.instance;
  }

  /**
   * Calculate roles with validation
   */
  async calculateRoles(context: RoleCalculationContext): Promise<RoleCalculationResult> {
    return RoleCalculator.calculateRoles(context);
  }

  /**
   * Calculate roles with additional validation
   */
  async calculateRolesWithValidation(context: RoleCalculationContext): Promise<RoleCalculationResult> {
    return RoleCalculator.calculateRoles(context);
  }

  /**
   * Get role hierarchy information
   */
  getRoleHierarchy(): Record<RoleType, number> {
    return ROLE_HIERARCHY;
  }

  /**
   * Get role calculation rules
   */
  getRoleCalculationRules() {
    return ROLE_CALCULATION_RULES;
  }

  /**
   * Get role dependencies
   */
  getRoleDependencies() {
    return ROLE_DEPENDENCIES;
  }

  /**
   * Validate role assignment
   */
  validateRoleAssignment(papers: PaperType[], role: RoleType): boolean {
    const rule = ROLE_CALCULATION_RULES.find(r => r.resultRole === role);
    if (!rule) return false;
    return RoleCalculator['checkRuleMatch'](papers, rule.papers);
  }

  /**
   * Get role information
   */
  getRoleInfo(role: RoleType) {
    return RoleCalculationUtils.getRoleInfo(role);
  }
}