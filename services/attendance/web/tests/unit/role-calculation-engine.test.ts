/**
 * Role Calculation Engine Unit Tests
 * TDD implementation for ID-ROLE-PAPER system role calculation
 */

import { 
  RoleCalculator,
  RoleCalculatorService 
} from '../../src/lib/role-engine/role-calculator';
import {
  RoleType,
  PaperType,
  IdType,
  BusinessType,
  UnifiedIdentity,
  Paper,
  BusinessRegistration,
  RoleCalculationContext,
  RoleCalculationResult,
  ROLE_HIERARCHY,
  ROLE_DEPENDENCIES
} from '../../src/types/id-role-paper';

describe('Role Calculation Engine', () => {
  let mockIdentity: UnifiedIdentity;
  let mockBusinessRegistration: BusinessRegistration;

  beforeEach(() => {
    mockIdentity = {
      id: 'identity-1',
      idType: IdType.PERSONAL,
      email: 'test@example.com',
      fullName: 'Test User',
      authUserId: 'auth-1',
      isVerified: true,
      isActive: true,
      profileData: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockBusinessRegistration = {
      id: 'business-1',
      registrationNumber: 'BRN-123456',
      businessName: 'Test Business',
      businessType: BusinessType.INDIVIDUAL,
      ownerIdentityId: 'identity-1',
      registrationData: {},
      verificationStatus: 'verified',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('Basic Role Assignment', () => {
    test('should assign SEEKER role when no papers are held', () => {
      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [],
        businessRegistrations: []
      };

      const result = RoleCalculator.calculateRoles(context);

      expect(result.calculatedRoles).toHaveLength(1);
      expect(result.calculatedRoles[0].role).toBe(RoleType.SEEKER);
      expect(result.calculatedRoles[0].sourcePapers).toEqual([]);
      expect(result.errors).toHaveLength(0);
    });

    test('should assign OWNER role for Business Registration paper', () => {
      const businessPaper: Paper = {
        id: 'paper-1',
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [businessPaper],
        businessRegistrations: [mockBusinessRegistration]
      };

      const result = RoleCalculator.calculateRoles(context);

      expect(result.calculatedRoles).toHaveLength(1);
      expect(result.calculatedRoles[0].role).toBe(RoleType.OWNER);
      expect(result.calculatedRoles[0].sourcePapers).toContain('paper-1');
      expect(result.calculatedRoles[0].businessContext).toBe('business-1');
    });

    test('should assign WORKER role for Employment Contract paper', () => {
      const employmentPaper: Paper = {
        id: 'paper-2',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [employmentPaper],
        businessRegistrations: [mockBusinessRegistration]
      };

      const result = RoleCalculator.calculateRoles(context);

      expect(result.calculatedRoles).toHaveLength(1);
      expect(result.calculatedRoles[0].role).toBe(RoleType.WORKER);
      expect(result.calculatedRoles[0].sourcePapers).toContain('paper-2');
      expect(result.calculatedRoles[0].businessContext).toBe('business-1');
    });
  });

  describe('Complex Role Assignment with Dependencies', () => {
    test('should assign both WORKER and MANAGER roles for Employment + Authority Delegation', () => {
      const employmentPaper: Paper = {
        id: 'paper-employment',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const authorityPaper: Paper = {
        id: 'paper-authority',
        paperType: PaperType.AUTHORITY_DELEGATION,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [employmentPaper, authorityPaper],
        businessRegistrations: [mockBusinessRegistration]
      };

      const result = RoleCalculator.calculateRoles(context);

      const assignedRoles = result.calculatedRoles.map(r => r.role);
      expect(assignedRoles).toContain(RoleType.WORKER);
      expect(assignedRoles).toContain(RoleType.MANAGER);
      
      // Check that WORKER role is assigned as prerequisite
      const workerRole = result.calculatedRoles.find(r => r.role === RoleType.WORKER);
      const managerRole = result.calculatedRoles.find(r => r.role === RoleType.MANAGER);
      
      expect(workerRole).toBeDefined();
      expect(managerRole).toBeDefined();
      expect(managerRole?.metadata?.is_dependency).toBeUndefined(); // Manager is primary, not dependency
    });

    test('should assign both WORKER and SUPERVISOR roles for Employment + Supervisor Authority', () => {
      const employmentPaper: Paper = {
        id: 'paper-employment',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const supervisorPaper: Paper = {
        id: 'paper-supervisor',
        paperType: PaperType.SUPERVISOR_AUTHORITY_DELEGATION,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [employmentPaper, supervisorPaper],
        businessRegistrations: [mockBusinessRegistration]
      };

      const result = RoleCalculator.calculateRoles(context);

      const assignedRoles = result.calculatedRoles.map(r => r.role);
      expect(assignedRoles).toContain(RoleType.WORKER);
      expect(assignedRoles).toContain(RoleType.SUPERVISOR);
    });
  });

  describe('Franchise Roles', () => {
    test('should assign FRANCHISEE role for Business Registration + Franchise Agreement', () => {
      const businessPaper: Paper = {
        id: 'paper-business',
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const franchisePaper: Paper = {
        id: 'paper-franchise',
        paperType: PaperType.FRANCHISE_AGREEMENT,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [businessPaper, franchisePaper],
        businessRegistrations: [mockBusinessRegistration]
      };

      const result = RoleCalculator.calculateRoles(context);

      expect(result.calculatedRoles).toHaveLength(1);
      expect(result.calculatedRoles[0].role).toBe(RoleType.FRANCHISEE);
      expect(result.calculatedRoles[0].sourcePapers).toContain('paper-business');
      expect(result.calculatedRoles[0].sourcePapers).toContain('paper-franchise');
    });

    test('should assign FRANCHISOR role for Business Registration + Franchise HQ Registration', () => {
      const businessPaper: Paper = {
        id: 'paper-business',
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const franchiseHqPaper: Paper = {
        id: 'paper-franchise-hq',
        paperType: PaperType.FRANCHISE_HQ_REGISTRATION,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [businessPaper, franchiseHqPaper],
        businessRegistrations: [mockBusinessRegistration]
      };

      const result = RoleCalculator.calculateRoles(context);

      expect(result.calculatedRoles).toHaveLength(1);
      expect(result.calculatedRoles[0].role).toBe(RoleType.FRANCHISOR);
    });
  });

  describe('Role Hierarchy and Priority', () => {
    test('should return highest priority role correctly', () => {
      const roles = [RoleType.WORKER, RoleType.MANAGER, RoleType.SEEKER];
      const highestRole = RoleCalculator.getHighestPriorityRole(roles);
      expect(highestRole).toBe(RoleType.MANAGER);
    });

    test('should return SEEKER for empty role list', () => {
      const highestRole = RoleCalculator.getHighestPriorityRole([]);
      expect(highestRole).toBe(RoleType.SEEKER);
    });

    test('should respect role hierarchy levels', () => {
      expect(ROLE_HIERARCHY[RoleType.FRANCHISOR]).toBeGreaterThan(ROLE_HIERARCHY[RoleType.FRANCHISEE]);
      expect(ROLE_HIERARCHY[RoleType.FRANCHISEE]).toBeGreaterThan(ROLE_HIERARCHY[RoleType.OWNER]);
      expect(ROLE_HIERARCHY[RoleType.OWNER]).toBeGreaterThan(ROLE_HIERARCHY[RoleType.SUPERVISOR]);
      expect(ROLE_HIERARCHY[RoleType.SUPERVISOR]).toBeGreaterThan(ROLE_HIERARCHY[RoleType.MANAGER]);
      expect(ROLE_HIERARCHY[RoleType.MANAGER]).toBeGreaterThan(ROLE_HIERARCHY[RoleType.WORKER]);
      expect(ROLE_HIERARCHY[RoleType.WORKER]).toBeGreaterThan(ROLE_HIERARCHY[RoleType.SEEKER]);
    });
  });

  describe('Role Dependencies', () => {
    test('should identify role dependencies correctly', () => {
      expect(RoleCalculator.roleHasDependency(RoleType.MANAGER, RoleType.WORKER)).toBe(true);
      expect(RoleCalculator.roleHasDependency(RoleType.SUPERVISOR, RoleType.WORKER)).toBe(true);
      expect(RoleCalculator.roleHasDependency(RoleType.OWNER, RoleType.WORKER)).toBe(false);
    });

    test('should get dependent roles correctly', () => {
      const dependentRoles = RoleCalculator.getDependentRoles(RoleType.WORKER);
      expect(dependentRoles).toContain(RoleType.MANAGER);
      expect(dependentRoles).toContain(RoleType.SUPERVISOR);
    });

    test('should get prerequisite roles correctly', () => {
      const prerequisites = RoleCalculator.getPrerequisiteRoles(RoleType.MANAGER);
      expect(prerequisites).toContain(RoleType.WORKER);
    });

    test('should validate role dependencies in calculation result', () => {
      const authorityPaper: Paper = {
        id: 'paper-authority',
        paperType: PaperType.AUTHORITY_DELEGATION,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Manager paper without Employment Contract should trigger warning
      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [authorityPaper],
        businessRegistrations: [mockBusinessRegistration]
      };

      const result = RoleCalculator.calculateRoles(context);

      // Should not assign MANAGER role without WORKER prerequisite
      const assignedRoles = result.calculatedRoles.map(r => r.role);
      expect(assignedRoles).not.toContain(RoleType.MANAGER);
    });
  });

  describe('Multi-Business Context', () => {
    test('should handle roles across multiple businesses', () => {
      const business2: BusinessRegistration = {
        id: 'business-2',
        registrationNumber: 'BRN-789012',
        businessName: 'Second Business',
        businessType: BusinessType.INDIVIDUAL,
        ownerIdentityId: 'identity-1',
        registrationData: {},
        verificationStatus: 'verified',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const businessPaper1: Paper = {
        id: 'paper-business-1',
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const employmentPaper2: Paper = {
        id: 'paper-employment-2',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-2',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [businessPaper1, employmentPaper2],
        businessRegistrations: [mockBusinessRegistration, business2]
      };

      const result = RoleCalculator.calculateRoles(context);

      // Should have both OWNER (business-1) and WORKER (business-2) roles
      expect(result.calculatedRoles).toHaveLength(2);
      
      const ownerRole = result.calculatedRoles.find(r => r.role === RoleType.OWNER);
      const workerRole = result.calculatedRoles.find(r => r.role === RoleType.WORKER);
      
      expect(ownerRole?.businessContext).toBe('business-1');
      expect(workerRole?.businessContext).toBe('business-2');
    });
  });

  describe('Paper Validation', () => {
    test('should validate paper combinations correctly', () => {
      const validPapers: Paper[] = [
        {
          id: 'paper-1',
          paperType: PaperType.EMPLOYMENT_CONTRACT,
          ownerIdentityId: 'identity-1',
          relatedBusinessId: 'business-1',
          paperData: {},
          isActive: true,
          validFrom: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const validation = RoleCalculator.validatePaperCombination(validPapers, [RoleType.WORKER]);
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    test('should identify missing papers for role', () => {
      const incompletePapers: Paper[] = [
        {
          id: 'paper-1',
          paperType: PaperType.EMPLOYMENT_CONTRACT,
          ownerIdentityId: 'identity-1',
          relatedBusinessId: 'business-1',
          paperData: {},
          isActive: true,
          validFrom: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const validation = RoleCalculator.validatePaperCombination(incompletePapers, [RoleType.MANAGER]);
      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Role Analysis and Recommendations', () => {
    test('should analyze role potential correctly', () => {
      const employmentPaper: Paper = {
        id: 'paper-employment',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const analysis = RoleCalculator.analyzeRolePotential([employmentPaper]);
      
      expect(analysis.currentRoles).toContain(RoleType.WORKER);
      expect(analysis.potentialRoles).toContain(RoleType.MANAGER);
      expect(analysis.nextSteps.length).toBeGreaterThan(0);
      
      const managerStep = analysis.nextSteps.find(step => step.targetRole === RoleType.MANAGER);
      expect(managerStep?.requiredPapers).toContain(PaperType.AUTHORITY_DELEGATION);
    });

    test('should generate role transition plan', () => {
      const currentPapers: Paper[] = [
        {
          id: 'paper-employment',
          paperType: PaperType.EMPLOYMENT_CONTRACT,
          ownerIdentityId: 'identity-1',
          relatedBusinessId: 'business-1',
          paperData: {},
          isActive: true,
          validFrom: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const transitionPlan = RoleCalculator.generateRoleTransitionPlan(currentPapers, RoleType.MANAGER);
      
      expect(transitionPlan.isAchievable).toBe(true);
      expect(transitionPlan.requiredActions.length).toBeGreaterThan(0);
      
      const authorityAction = transitionPlan.requiredActions.find(
        action => action.paperType === PaperType.AUTHORITY_DELEGATION
      );
      expect(authorityAction).toBeDefined();
    });
  });

  describe('Corporate ID Specific Rules', () => {
    test('should handle Corporate ID role calculation', () => {
      const corporateIdentity: UnifiedIdentity = {
        ...mockIdentity,
        id: 'corporate-identity-1',
        idType: IdType.CORPORATE,
        linkedPersonalId: 'identity-1'
      };

      const businessPaper: Paper = {
        id: 'paper-business',
        paperType: PaperType.BUSINESS_REGISTRATION,
        ownerIdentityId: 'identity-1', // Owned by linked Personal ID
        relatedBusinessId: 'business-1',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context: RoleCalculationContext = {
        identity: corporateIdentity,
        papers: [businessPaper],
        businessRegistrations: [mockBusinessRegistration]
      };

      const result = RoleCalculator.calculateRoles(context);

      // Corporate ID should still get SEEKER if it doesn't own papers directly
      expect(result.calculatedRoles[0].role).toBe(RoleType.SEEKER);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid paper data gracefully', () => {
      const invalidPaper: Paper = {
        id: 'paper-invalid',
        paperType: PaperType.EMPLOYMENT_CONTRACT,
        ownerIdentityId: 'identity-1',
        relatedBusinessId: 'non-existent-business',
        paperData: {},
        isActive: true,
        validFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [invalidPaper],
        businessRegistrations: [] // No business registrations
      };

      expect(() => RoleCalculator.calculateRoles(context)).not.toThrow();
    });

    test('should handle empty context gracefully', () => {
      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [],
        businessRegistrations: []
      };

      const result = RoleCalculator.calculateRoles(context);
      expect(result.calculatedRoles).toHaveLength(1);
      expect(result.calculatedRoles[0].role).toBe(RoleType.SEEKER);
    });
  });

  describe('RoleCalculatorService', () => {
    test('should provide singleton instance', () => {
      const service1 = RoleCalculatorService.getInstance();
      const service2 = RoleCalculatorService.getInstance();
      expect(service1).toBe(service2);
    });

    test('should calculate roles with validation', async () => {
      const service = RoleCalculatorService.getInstance();
      const context: RoleCalculationContext = {
        identity: mockIdentity,
        papers: [],
        businessRegistrations: []
      };

      const result = await service.calculateRolesWithValidation(context);
      expect(result.calculatedRoles).toHaveLength(1);
      expect(result.calculatedRoles[0].role).toBe(RoleType.SEEKER);
    });

    test('should provide role hierarchy information', () => {
      const service = RoleCalculatorService.getInstance();
      const hierarchy = service.getRoleHierarchy();
      expect(hierarchy[RoleType.FRANCHISOR]).toBeGreaterThan(hierarchy[RoleType.SEEKER]);
    });

    test('should provide role calculation rules', () => {
      const service = RoleCalculatorService.getInstance();
      const rules = service.getRoleCalculationRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(rule => rule.resultRole === RoleType.SEEKER)).toBe(true);
    });

    test('should provide role dependencies', () => {
      const service = RoleCalculatorService.getInstance();
      const dependencies = service.getRoleDependencies();
      expect(dependencies.length).toBeGreaterThan(0);
      expect(dependencies.some(dep => dep.childRole === RoleType.MANAGER)).toBe(true);
    });
  });
});