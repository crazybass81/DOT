/**
 * Role Calculator Engine
 * 
 * Core engine for calculating roles based on owned PAPER documents.
 * Implements the business logic defined in Final-ID-ROLE-PAPER-Architecture.md
 */

import {
  RoleType,
  PaperType,
  Paper,
  ComputedRole,
  UnifiedIdentity,
  RoleCalculationRule,
  RoleCalculationContext,
  RoleCalculationResult,
  ROLE_CALCULATION_RULES,
  ROLE_HIERARCHY,
  ROLE_DEPENDENCIES,
  IdRolePaperError,
  IdRolePaperErrorType
} from '../../types/id-role-paper';

export class RoleCalculator {
  /**
   * Calculate roles for an identity based on their papers
   */
  static calculateRoles(context: RoleCalculationContext): RoleCalculationResult {
    const { identity, papers, businessRegistrations } = context;
    const activePapers = papers.filter(p => p.isActive);
    const result: RoleCalculationResult = {
      identity,
      calculatedRoles: [],
      warnings: [],
      errors: []
    };

    try {
      // Group papers by business context
      const papersByBusiness = this.groupPapersByBusiness(activePapers);
      
      // Calculate roles for each business context
      for (const [businessId, businessPapers] of papersByBusiness.entries()) {
        const businessRoles = this.calculateRolesForBusiness(
          businessPapers,
          businessId,
          businessRegistrations
        );
        result.calculatedRoles.push(...businessRoles);
      }

      // If no roles were calculated, assign SEEKER
      if (result.calculatedRoles.length === 0) {
        result.calculatedRoles.push({
          role: RoleType.SEEKER,
          sourcePapers: [],
          metadata: { reason: 'no_papers_held' }
        });
      }

      // Validate role dependencies
      this.validateRoleDependencies(result);

    } catch (error) {
      result.errors?.push(`Role calculation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Group papers by business context
   */
  private static groupPapersByBusiness(papers: Paper[]): Map<string | null, Paper[]> {
    const papersByBusiness = new Map<string | null, Paper[]>();
    
    for (const paper of papers) {
      const businessId = paper.relatedBusinessId || null;
      if (!papersByBusiness.has(businessId)) {
        papersByBusiness.set(businessId, []);
      }
      papersByBusiness.get(businessId)!.push(paper);
    }
    
    return papersByBusiness;
  }

  /**
   * Calculate roles for a specific business context
   */
  private static calculateRolesForBusiness(
    papers: Paper[],
    businessId: string | null,
    businessRegistrations: any[]
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
    const paperIds = papers.map(p => p.id);

    // Apply role calculation rules in order of complexity (most papers first)
    const sortedRules = [...ROLE_CALCULATION_RULES].sort((a, b) => b.papers.length - a.papers.length);

    for (const rule of sortedRules) {
      if (this.doesRuleApply(rule, paperTypes)) {
        const roleData = {
          role: rule.resultRole,
          sourcePapers: this.getSourcePapersForRule(rule, papers),
          businessContext: businessId || undefined,
          metadata: {
            rule_description: rule.description,
            applied_papers: rule.papers,
            business_context_required: rule.businessContext
          }
        };

        // Handle role dependencies
        if (rule.dependencies) {
          for (const dependencyRole of rule.dependencies) {
            const dependencyPapers = this.getPapersForRole(dependencyRole, papers);
            if (dependencyPapers.length > 0) {
              roles.push({
                role: dependencyRole,
                sourcePapers: dependencyPapers.map(p => p.id),
                businessContext: businessId || undefined,
                metadata: {
                  rule_description: `Prerequisite role for ${rule.resultRole}`,
                  is_dependency: true
                }
              });
            }
          }
        }

        roles.push(roleData);
      }
    }

    return roles;
  }

  /**
   * Check if a rule applies to the given paper types
   */
  private static doesRuleApply(rule: RoleCalculationRule, paperTypes: PaperType[]): boolean {
    if (rule.papers.length === 0) {
      return paperTypes.length === 0; // SEEKER rule
    }
    
    return rule.papers.every(requiredPaper => paperTypes.includes(requiredPaper));
  }

  /**
   * Get source papers for a specific rule
   */
  private static getSourcePapersForRule(rule: RoleCalculationRule, papers: Paper[]): string[] {
    if (rule.papers.length === 0) {
      return [];
    }
    
    return papers
      .filter(p => rule.papers.includes(p.paperType))
      .map(p => p.id);
  }

  /**
   * Get papers that would grant a specific role
   */
  private static getPapersForRole(role: RoleType, papers: Paper[]): Paper[] {
    const rule = ROLE_CALCULATION_RULES.find(r => r.resultRole === role);
    if (!rule || rule.papers.length === 0) return [];
    
    return papers.filter(p => rule.papers.includes(p.paperType));
  }

  /**
   * Validate role dependencies are satisfied
   */
  private static validateRoleDependencies(result: RoleCalculationResult): void {
    const assignedRoles = result.calculatedRoles.map(r => r.role);
    
    for (const dependency of ROLE_DEPENDENCIES) {
      const hasChildRole = assignedRoles.includes(dependency.childRole);
      const hasParentRole = assignedRoles.includes(dependency.parentRole);
      
      if (hasChildRole && !hasParentRole) {
        result.warnings?.push(
          `Role dependency violation: ${dependency.childRole} requires ${dependency.parentRole} but it's not assigned`
        );
      }
    }
  }

  /**
   * Get the highest priority role from a list of roles
   */
  static getHighestPriorityRole(roles: RoleType[]): RoleType {
    if (roles.length === 0) return RoleType.SEEKER;
    
    return roles.reduce((highest, current) => 
      ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest
    );
  }

  /**
   * Check if a role has a specific dependency
   */
  static roleHasDependency(role: RoleType, dependency: RoleType): boolean {
    return ROLE_DEPENDENCIES.some(dep => 
      dep.childRole === role && dep.parentRole === dependency
    );
  }

  /**
   * Get all roles that depend on a given role
   */
  static getDependentRoles(role: RoleType): RoleType[] {
    return ROLE_DEPENDENCIES
      .filter(dep => dep.parentRole === role)
      .map(dep => dep.childRole);
  }

  /**
   * Get all prerequisite roles for a given role
   */
  static getPrerequisiteRoles(role: RoleType): RoleType[] {
    return ROLE_DEPENDENCIES
      .filter(dep => dep.childRole === role)
      .map(dep => dep.parentRole);
  }

  /**
   * Validate that a set of papers can grant the expected roles
   */
  static validatePaperCombination(papers: Paper[], expectedRoles: RoleType[]): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    const paperTypes = papers.filter(p => p.isActive).map(p => p.paperType);
    
    // Check each expected role
    for (const expectedRole of expectedRoles) {
      const rule = ROLE_CALCULATION_RULES.find(r => r.resultRole === expectedRole);
      
      if (!rule) {
        issues.push(`No rule found for role: ${expectedRole}`);
        continue;
      }
      
      // Check if papers satisfy the rule
      const hasAllRequiredPapers = rule.papers.every(required => 
        paperTypes.includes(required)
      );
      
      if (!hasAllRequiredPapers) {
        const missingPapers = rule.papers.filter(required => 
          !paperTypes.includes(required)
        );
        issues.push(`Missing papers for ${expectedRole}: ${missingPapers.join(', ')}`);
        suggestions.push(`To get ${expectedRole} role, add: ${missingPapers.join(', ')}`);
      }
      
      // Check dependencies
      if (rule.dependencies) {
        for (const dependency of rule.dependencies) {
          if (!expectedRoles.includes(dependency)) {
            issues.push(`${expectedRole} requires ${dependency} role as prerequisite`);
            suggestions.push(`Add papers to grant ${dependency} role first`);
          }
        }
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Analyze what roles a person can achieve with their current papers
   */
  static analyzeRolePotential(papers: Paper[]): {
    currentRoles: RoleType[];
    potentialRoles: RoleType[];
    nextSteps: Array<{
      targetRole: RoleType;
      requiredPapers: PaperType[];
      description: string;
    }>;
  } {
    const activePapers = papers.filter(p => p.isActive);
    const paperTypes = activePapers.map(p => p.paperType);
    
    // Calculate current roles
    const currentRoles: RoleType[] = [];
    for (const rule of ROLE_CALCULATION_RULES) {
      if (this.doesRuleApply(rule, paperTypes)) {
        currentRoles.push(rule.resultRole);
      }
    }
    
    // Find potential roles (one additional paper away)
    const potentialRoles: RoleType[] = [];
    const nextSteps: Array<{
      targetRole: RoleType;
      requiredPapers: PaperType[];
      description: string;
    }> = [];
    
    for (const rule of ROLE_CALCULATION_RULES) {
      if (currentRoles.includes(rule.resultRole)) continue;
      
      const missingPapers = rule.papers.filter(required => 
        !paperTypes.includes(required)
      );
      
      if (missingPapers.length === 1) {
        potentialRoles.push(rule.resultRole);
        nextSteps.push({
          targetRole: rule.resultRole,
          requiredPapers: missingPapers,
          description: `Add ${missingPapers[0]} to become ${rule.resultRole}`
        });
      }
    }
    
    return {
      currentRoles: currentRoles.length > 0 ? currentRoles : [RoleType.SEEKER],
      potentialRoles,
      nextSteps
    };
  }

  /**
   * Generate role transition recommendations
   */
  static generateRoleTransitionPlan(
    currentPapers: Paper[],
    targetRole: RoleType
  ): {
    isAchievable: boolean;
    requiredActions: Array<{
      action: 'add_paper' | 'remove_paper' | 'modify_paper';
      paperType: PaperType;
      description: string;
      priority: number;
    }>;
    warnings: string[];
  } {
    const targetRule = ROLE_CALCULATION_RULES.find(r => r.resultRole === targetRole);
    
    if (!targetRule) {
      return {
        isAchievable: false,
        requiredActions: [],
        warnings: [`No rule found for target role: ${targetRole}`]
      };
    }
    
    const currentPaperTypes = currentPapers.filter(p => p.isActive).map(p => p.paperType);
    const requiredPapers = targetRule.papers;
    const missingPapers = requiredPapers.filter(required => 
      !currentPaperTypes.includes(required)
    );
    
    const requiredActions = missingPapers.map((paperType, index) => ({
      action: 'add_paper' as const,
      paperType,
      description: `Obtain ${paperType} to qualify for ${targetRole} role`,
      priority: index + 1
    }));
    
    const warnings: string[] = [];
    
    // Check for role dependencies
    if (targetRule.dependencies) {
      for (const dependency of targetRule.dependencies) {
        const dependencyRule = ROLE_CALCULATION_RULES.find(r => r.resultRole === dependency);
        if (dependencyRule) {
          const dependencyMissing = dependencyRule.papers.filter(required => 
            !currentPaperTypes.includes(required)
          );
          
          if (dependencyMissing.length > 0) {
            warnings.push(`${targetRole} requires ${dependency} role first`);
            dependencyMissing.forEach((paperType, index) => {
              requiredActions.unshift({
                action: 'add_paper',
                paperType,
                description: `Obtain ${paperType} for prerequisite ${dependency} role`,
                priority: -(dependencyMissing.length - index) // Negative priority for prerequisites
              });
            });
          }
        }
      }
    }
    
    return {
      isAchievable: true,
      requiredActions: requiredActions.sort((a, b) => a.priority - b.priority),
      warnings
    };
  }
}

/**
 * Role Calculator Service - Singleton for easy access
 */
export class RoleCalculatorService {
  private static instance: RoleCalculatorService;
  
  static getInstance(): RoleCalculatorService {
    if (!this.instance) {
      this.instance = new RoleCalculatorService();
    }
    return this.instance;
  }
  
  /**
   * Calculate roles with caching and validation
   */
  async calculateRolesWithValidation(context: RoleCalculationContext): Promise<RoleCalculationResult> {
    try {
      const result = RoleCalculator.calculateRoles(context);
      
      // Additional validation can be added here
      if (result.errors && result.errors.length > 0) {
        console.error('Role calculation errors:', result.errors);
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Role calculation warnings:', result.warnings);
      }
      
      return result;
    } catch (error) {
      console.error('Role calculation service error:', error);
      throw new Error(`Role calculation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get role hierarchy information
   */
  getRoleHierarchy(): Record<RoleType, number> {
    return { ...ROLE_HIERARCHY };
  }
  
  /**
   * Get role calculation rules
   */
  getRoleCalculationRules(): RoleCalculationRule[] {
    return [...ROLE_CALCULATION_RULES];
  }
  
  /**
   * Get role dependencies
   */
  getRoleDependencies(): typeof ROLE_DEPENDENCIES {
    return [...ROLE_DEPENDENCIES];
  }
}

export default RoleCalculator;