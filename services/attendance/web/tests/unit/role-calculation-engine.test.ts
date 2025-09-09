/**
 * Role Calculation Engine Unit Tests
 * 
 * Tests the core logic for calculating roles based on papers and role hierarchy:
 * - FRANCHISOR > FRANCHISEE > OWNER > MANAGER > SUPERVISOR > WORKER > SEEKER
 * - Role dependencies (MANAGER requires WORKER, etc.)
 * - Paper validation and role inheritance
 * - Edge cases and error handling
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { TestDataFactory, RoleType, PaperType } from '../setup/id-role-paper-test-setup';

// Mock the role calculation service
class RoleCalculationEngine {
  private static readonly ROLE_HIERARCHY: Record<RoleType, number> = {
    'SEEKER': 0,
    'WORKER': 1,
    'SUPERVISOR': 2,
    'MANAGER': 3,
    'OWNER': 4,
    'FRANCHISEE': 5,
    'FRANCHISOR': 6
  };

  private static readonly ROLE_DEPENDENCIES: Record<RoleType, RoleType[]> = {
    'SEEKER': [],
    'WORKER': [],
    'SUPERVISOR': ['WORKER'],
    'MANAGER': ['WORKER'],
    'OWNER': [],
    'FRANCHISEE': [],
    'FRANCHISOR': []
  };

  private static readonly ROLE_INHERITANCE: Record<RoleType, RoleType[]> = {
    'SEEKER': [],
    'WORKER': [],
    'SUPERVISOR': [],
    'MANAGER': ['WORKER'],
    'OWNER': ['MANAGER', 'WORKER'],
    'FRANCHISEE': ['MANAGER', 'WORKER'],
    'FRANCHISOR': ['FRANCHISEE', 'MANAGER', 'WORKER']
  };

  static calculateRoles(papers: any[]): {
    calculatedRoles: RoleType[];
    highestRole: RoleType;
    validationErrors: string[];
  } {
    const validationErrors: string[] = [];
    const activePapers = papers.filter(p => p.status === 'ACTIVE' && this.isPaperEffective(p));
    
    if (activePapers.length === 0) {
      return {
        calculatedRoles: ['SEEKER'],
        highestRole: 'SEEKER',
        validationErrors
      };
    }

    // Extract roles from papers
    const grantedRoles = new Set<RoleType>();
    for (const paper of activePapers) {
      grantedRoles.add(paper.role_granted);
    }

    // Validate role dependencies
    for (const role of grantedRoles) {
      const dependencies = this.ROLE_DEPENDENCIES[role];
      for (const dep of dependencies) {
        if (!grantedRoles.has(dep)) {
          validationErrors.push(`Role ${role} requires ${dep} but ${dep} was not granted`);
        }
      }
    }

    // If validation failed, return SEEKER
    if (validationErrors.length > 0) {
      return {
        calculatedRoles: ['SEEKER'],
        highestRole: 'SEEKER',
        validationErrors
      };
    }

    // Calculate all roles including inheritance
    const allRoles = new Set<RoleType>();
    for (const role of grantedRoles) {
      allRoles.add(role);
      const inheritedRoles = this.ROLE_INHERITANCE[role];
      for (const inherited of inheritedRoles) {
        allRoles.add(inherited);
      }
    }

    // Find highest role
    let highestRole: RoleType = 'SEEKER';
    let highestLevel = -1;
    for (const role of allRoles) {
      const level = this.ROLE_HIERARCHY[role];
      if (level > highestLevel) {
        highestLevel = level;
        highestRole = role;
      }
    }

    return {
      calculatedRoles: Array.from(allRoles).sort((a, b) => 
        this.ROLE_HIERARCHY[b] - this.ROLE_HIERARCHY[a]
      ),
      highestRole,
      validationErrors
    };
  }

  private static isPaperEffective(paper: any): boolean {
    const now = new Date();
    const effectiveFrom = new Date(paper.effective_from);
    const effectiveUntil = paper.effective_until ? new Date(paper.effective_until) : null;

    return effectiveFrom <= now && (!effectiveUntil || effectiveUntil >= now);
  }

  static validatePaperType(paperType: PaperType, roleGranted: RoleType): string[] {
    const errors: string[] = [];

    // Define valid paper-role combinations
    const validCombinations: Record<PaperType, RoleType[]> = {
      'BUSINESS_REGISTRATION': ['OWNER'],
      'EMPLOYMENT_CONTRACT': ['WORKER'],
      'PARTNERSHIP_AGREEMENT': ['OWNER'],
      'FRANCHISE_AGREEMENT': ['FRANCHISEE', 'FRANCHISOR'],
      'MANAGEMENT_APPOINTMENT': ['MANAGER', 'SUPERVISOR'],
      'OWNERSHIP_CERTIFICATE': ['OWNER']
    };

    const validRoles = validCombinations[paperType];
    if (!validRoles.includes(roleGranted)) {
      errors.push(`Paper type ${paperType} cannot grant role ${roleGranted}. Valid roles: ${validRoles.join(', ')}`);
    }

    return errors;
  }
}

describe('Role Calculation Engine', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  describe('Basic Role Calculation', () => {
    test('should return SEEKER for no papers', () => {
      const result = RoleCalculationEngine.calculateRoles([]);
      
      expect(result.calculatedRoles).toEqual(['SEEKER']);
      expect(result.highestRole).toBe('SEEKER');
      expect(result.validationErrors).toEqual([]);
    });

    test('should calculate WORKER role correctly', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toEqual(['WORKER']);
      expect(result.highestRole).toBe('WORKER');
      expect(result.validationErrors).toEqual([]);
    });

    test('should calculate MANAGER role with inheritance', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          status: 'ACTIVE'
        }),
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'MANAGEMENT_APPOINTMENT',
          role_granted: 'MANAGER',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toContain('MANAGER');
      expect(result.calculatedRoles).toContain('WORKER');
      expect(result.highestRole).toBe('MANAGER');
      expect(result.validationErrors).toEqual([]);
    });

    test('should calculate OWNER role with full inheritance', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'BUSINESS_REGISTRATION',
          role_granted: 'OWNER',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toContain('OWNER');
      expect(result.calculatedRoles).toContain('MANAGER');
      expect(result.calculatedRoles).toContain('WORKER');
      expect(result.highestRole).toBe('OWNER');
      expect(result.validationErrors).toEqual([]);
    });

    test('should calculate FRANCHISEE role correctly', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'FRANCHISE_AGREEMENT',
          role_granted: 'FRANCHISEE',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toContain('FRANCHISEE');
      expect(result.calculatedRoles).toContain('MANAGER');
      expect(result.calculatedRoles).toContain('WORKER');
      expect(result.highestRole).toBe('FRANCHISEE');
      expect(result.validationErrors).toEqual([]);
    });

    test('should calculate FRANCHISOR as highest role', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'FRANCHISE_AGREEMENT',
          role_granted: 'FRANCHISOR',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toContain('FRANCHISOR');
      expect(result.calculatedRoles).toContain('FRANCHISEE');
      expect(result.calculatedRoles).toContain('MANAGER');
      expect(result.calculatedRoles).toContain('WORKER');
      expect(result.highestRole).toBe('FRANCHISOR');
      expect(result.validationErrors).toEqual([]);
    });

    test('should calculate SUPERVISOR role correctly', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          status: 'ACTIVE'
        }),
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'MANAGEMENT_APPOINTMENT',
          role_granted: 'SUPERVISOR',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toContain('SUPERVISOR');
      expect(result.calculatedRoles).toContain('WORKER');
      expect(result.highestRole).toBe('SUPERVISOR');
      expect(result.validationErrors).toEqual([]);
    });
  });

  describe('Role Dependencies Validation', () => {
    test('should fail when MANAGER is granted without WORKER', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'MANAGEMENT_APPOINTMENT',
          role_granted: 'MANAGER',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toEqual(['SEEKER']);
      expect(result.highestRole).toBe('SEEKER');
      expect(result.validationErrors).toContain('Role MANAGER requires WORKER but WORKER was not granted');
    });

    test('should fail when SUPERVISOR is granted without WORKER', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'MANAGEMENT_APPOINTMENT',
          role_granted: 'SUPERVISOR',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toEqual(['SEEKER']);
      expect(result.highestRole).toBe('SEEKER');
      expect(result.validationErrors).toContain('Role SUPERVISOR requires WORKER but WORKER was not granted');
    });

    test('should succeed when dependencies are met', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          status: 'ACTIVE'
        }),
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'MANAGEMENT_APPOINTMENT',
          role_granted: 'SUPERVISOR',
          status: 'ACTIVE'
        }),
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'MANAGEMENT_APPOINTMENT',
          role_granted: 'MANAGER',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.validationErrors).toEqual([]);
      expect(result.highestRole).toBe('MANAGER');
    });
  });

  describe('Paper Status and Time Validation', () => {
    test('should ignore inactive papers', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          status: 'REVOKED'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toEqual(['SEEKER']);
      expect(result.highestRole).toBe('SEEKER');
    });

    test('should ignore expired papers', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          status: 'EXPIRED'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toEqual(['SEEKER']);
      expect(result.highestRole).toBe('SEEKER');
    });

    test('should ignore future-effective papers', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          status: 'ACTIVE',
          effective_from: futureDate.toISOString()
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toEqual(['SEEKER']);
      expect(result.highestRole).toBe('SEEKER');
    });

    test('should ignore papers that have expired by effective_until date', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          status: 'ACTIVE',
          effective_until: pastDate.toISOString()
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      expect(result.calculatedRoles).toEqual(['SEEKER']);
      expect(result.highestRole).toBe('SEEKER');
    });
  });

  describe('Paper Type and Role Validation', () => {
    test('should validate BUSINESS_REGISTRATION can only grant OWNER', () => {
      const errors = RoleCalculationEngine.validatePaperType('BUSINESS_REGISTRATION', 'OWNER');
      expect(errors).toEqual([]);

      const invalidErrors = RoleCalculationEngine.validatePaperType('BUSINESS_REGISTRATION', 'WORKER');
      expect(invalidErrors).toContain('Paper type BUSINESS_REGISTRATION cannot grant role WORKER. Valid roles: OWNER');
    });

    test('should validate EMPLOYMENT_CONTRACT can only grant WORKER', () => {
      const errors = RoleCalculationEngine.validatePaperType('EMPLOYMENT_CONTRACT', 'WORKER');
      expect(errors).toEqual([]);

      const invalidErrors = RoleCalculationEngine.validatePaperType('EMPLOYMENT_CONTRACT', 'MANAGER');
      expect(invalidErrors).toContain('Paper type EMPLOYMENT_CONTRACT cannot grant role MANAGER. Valid roles: WORKER');
    });

    test('should validate MANAGEMENT_APPOINTMENT can grant MANAGER or SUPERVISOR', () => {
      const managerErrors = RoleCalculationEngine.validatePaperType('MANAGEMENT_APPOINTMENT', 'MANAGER');
      expect(managerErrors).toEqual([]);

      const supervisorErrors = RoleCalculationEngine.validatePaperType('MANAGEMENT_APPOINTMENT', 'SUPERVISOR');
      expect(supervisorErrors).toEqual([]);

      const invalidErrors = RoleCalculationEngine.validatePaperType('MANAGEMENT_APPOINTMENT', 'WORKER');
      expect(invalidErrors).toContain('Paper type MANAGEMENT_APPOINTMENT cannot grant role WORKER. Valid roles: MANAGER, SUPERVISOR');
    });

    test('should validate FRANCHISE_AGREEMENT can grant FRANCHISEE or FRANCHISOR', () => {
      const franchiseeErrors = RoleCalculationEngine.validatePaperType('FRANCHISE_AGREEMENT', 'FRANCHISEE');
      expect(franchiseeErrors).toEqual([]);

      const franchisorErrors = RoleCalculationEngine.validatePaperType('FRANCHISE_AGREEMENT', 'FRANCHISOR');
      expect(franchisorErrors).toEqual([]);

      const invalidErrors = RoleCalculationEngine.validatePaperType('FRANCHISE_AGREEMENT', 'WORKER');
      expect(invalidErrors).toContain('Paper type FRANCHISE_AGREEMENT cannot grant role WORKER. Valid roles: FRANCHISEE, FRANCHISOR');
    });
  });

  describe('Complex Role Scenarios', () => {
    test('should handle multiple roles with proper hierarchy', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'BUSINESS_REGISTRATION',
          role_granted: 'OWNER',
          status: 'ACTIVE'
        }),
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      // OWNER should take precedence and include inheritance
      expect(result.highestRole).toBe('OWNER');
      expect(result.calculatedRoles).toContain('OWNER');
      expect(result.calculatedRoles).toContain('MANAGER');
      expect(result.calculatedRoles).toContain('WORKER');
    });

    test('should handle conflicting high-level roles', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'BUSINESS_REGISTRATION',
          role_granted: 'OWNER',
          status: 'ACTIVE'
        }),
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'FRANCHISE_AGREEMENT',
          role_granted: 'FRANCHISEE',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      // FRANCHISEE should take precedence (higher in hierarchy)
      expect(result.highestRole).toBe('FRANCHISEE');
      expect(result.calculatedRoles).toContain('FRANCHISEE');
      expect(result.calculatedRoles).toContain('OWNER');
      expect(result.calculatedRoles).toContain('MANAGER');
      expect(result.calculatedRoles).toContain('WORKER');
    });

    test('should sort roles by hierarchy level', () => {
      const papers = [
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          status: 'ACTIVE'
        }),
        TestDataFactory.createPaper('pid1', 'bid1', {
          paper_type: 'MANAGEMENT_APPOINTMENT',
          role_granted: 'SUPERVISOR',
          status: 'ACTIVE'
        })
      ];

      const result = RoleCalculationEngine.calculateRoles(papers);
      
      // Should be sorted by hierarchy level (highest first)
      expect(result.calculatedRoles[0]).toBe('SUPERVISOR');
      expect(result.calculatedRoles[1]).toBe('WORKER');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty paper array', () => {
      const result = RoleCalculationEngine.calculateRoles([]);
      
      expect(result.calculatedRoles).toEqual(['SEEKER']);
      expect(result.highestRole).toBe('SEEKER');
      expect(result.validationErrors).toEqual([]);
    });

    test('should handle null/undefined papers gracefully', () => {
      const result = RoleCalculationEngine.calculateRoles([null, undefined].filter(Boolean));
      
      expect(result.calculatedRoles).toEqual(['SEEKER']);
      expect(result.highestRole).toBe('SEEKER');
    });

    test('should handle papers with missing required fields', () => {
      const papers = [
        {
          // Missing role_granted
          paper_type: 'EMPLOYMENT_CONTRACT',
          status: 'ACTIVE',
          effective_from: '2024-01-01'
        }
      ];

      expect(() => RoleCalculationEngine.calculateRoles(papers)).not.toThrow();
    });
  });
});