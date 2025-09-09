/**
 * Test Data Factories and Utilities
 * 
 * Comprehensive utilities for generating test data:
 * - Advanced test data factories with relationships
 * - Performance testing data generators
 * - Edge case scenario builders
 * - Test data validation and verification
 * - Cleanup and teardown utilities
 */

import { v4 as uuidv4 } from 'uuid';
import { TestDataFactory, RoleType, PaperType, BusinessType } from '../setup/id-role-paper-test-setup';

export interface TestScenario {
  name: string;
  description: string;
  personalIds: any[];
  corporateIds: any[];
  businessRegistrations: any[];
  papers: any[];
  expectedRoles: Record<string, RoleType[]>;
  expectedHighestRoles: Record<string, RoleType>;
  validationRules: string[];
}

export interface PerformanceTestData {
  personalIds: any[];
  businesses: any[];
  papers: any[];
  roleCalculations: any[];
  totalRecords: number;
  estimatedSizeKB: number;
}

export class AdvancedTestDataFactory {
  /**
   * Generate complete business ecosystem with multiple entities
   */
  static createBusinessEcosystem(config: {
    businessCount: number;
    employeesPerBusiness: number;
    managementLevels: number;
    franchiseNetwork?: boolean;
  }): TestScenario {
    const personalIds: any[] = [];
    const corporateIds: any[] = [];
    const businessRegistrations: any[] = [];
    const papers: any[] = [];
    const expectedRoles: Record<string, RoleType[]> = {};
    const expectedHighestRoles: Record<string, RoleType> = {};

    const businessOwners: string[] = [];
    const businessIds: string[] = [];

    // Create business owners
    for (let i = 0; i < config.businessCount; i++) {
      const ownerId = uuidv4();
      const owner = TestDataFactory.createPersonalId({
        id: ownerId,
        name: `사장${i + 1}`,
        phone: `010-${1000 + i}-0000`,
        email: `owner${i + 1}@test.com`
      });

      personalIds.push(owner);
      businessOwners.push(ownerId);

      // Create business
      const business = TestDataFactory.createBusinessRegistration(ownerId, {
        business_name: `회사${i + 1}`,
        business_number: `${100 + i}-${10 + i}-${10000 + i}`,
        business_type: config.franchiseNetwork && i > 0 ? 'FRANCHISE' : 'CORPORATION'
      });

      businessRegistrations.push(business);
      businessIds.push(business.id);

      // Create owner paper
      const ownerPaper = TestDataFactory.createPaper(ownerId, business.id, {
        paper_type: 'BUSINESS_REGISTRATION',
        role_granted: 'OWNER'
      });

      papers.push(ownerPaper);
      expectedRoles[`${ownerId}-${business.id}`] = ['OWNER', 'MANAGER', 'WORKER'];
      expectedHighestRoles[`${ownerId}-${business.id}`] = 'OWNER';

      // Create corporate ID for owner
      const corporateId = TestDataFactory.createCorporateId(ownerId, {
        business_name: business.business_name,
        business_number: business.business_number,
        business_type: business.business_type
      });

      corporateIds.push(corporateId);

      // Create employees for this business
      for (let j = 0; j < config.employeesPerBusiness; j++) {
        const employeeId = uuidv4();
        const employee = TestDataFactory.createPersonalId({
          id: employeeId,
          name: `직원${i + 1}-${j + 1}`,
          phone: `010-${2000 + i}-${1000 + j}`,
          email: `employee${i + 1}-${j + 1}@test.com`
        });

        personalIds.push(employee);

        // Create worker paper
        const workerPaper = TestDataFactory.createPaper(employeeId, business.id, {
          paper_type: 'EMPLOYMENT_CONTRACT',
          role_granted: 'WORKER',
          effective_from: '2024-01-01'
        });

        papers.push(workerPaper);

        // Add management levels
        if (j < config.managementLevels) {
          const managementRole: RoleType = j === 0 ? 'MANAGER' : 'SUPERVISOR';
          const managementPaper = TestDataFactory.createPaper(employeeId, business.id, {
            paper_type: 'MANAGEMENT_APPOINTMENT',
            role_granted: managementRole,
            effective_from: '2024-02-01'
          });

          papers.push(managementPaper);
          expectedRoles[`${employeeId}-${business.id}`] = managementRole === 'MANAGER' 
            ? ['MANAGER', 'WORKER'] 
            : ['SUPERVISOR', 'WORKER'];
          expectedHighestRoles[`${employeeId}-${business.id}`] = managementRole;
        } else {
          expectedRoles[`${employeeId}-${business.id}`] = ['WORKER'];
          expectedHighestRoles[`${employeeId}-${business.id}`] = 'WORKER';
        }
      }
    }

    // Create franchise relationships if enabled
    if (config.franchiseNetwork && businessIds.length > 1) {
      const franchisorId = businessOwners[0];
      const franchisorBusinessId = businessIds[0];

      for (let i = 1; i < businessIds.length; i++) {
        const franchiseeId = businessOwners[i];
        const franchiseeBusinessId = businessIds[i];

        // Create franchisor paper for main business
        const franchisorPaper = TestDataFactory.createPaper(franchisorId, franchisorBusinessId, {
          paper_type: 'FRANCHISE_AGREEMENT',
          role_granted: 'FRANCHISOR',
          effective_from: '2024-01-01'
        });

        papers.push(franchisorPaper);

        // Update franchisor roles
        expectedRoles[`${franchisorId}-${franchisorBusinessId}`] = ['FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER', 'WORKER'];
        expectedHighestRoles[`${franchisorId}-${franchisorBusinessId}`] = 'FRANCHISOR';

        // Create franchisee paper
        const franchiseePaper = TestDataFactory.createPaper(franchiseeId, franchiseeBusinessId, {
          paper_type: 'FRANCHISE_AGREEMENT',
          role_granted: 'FRANCHISEE',
          effective_from: '2024-01-01'
        });

        papers.push(franchiseePaper);

        // Update franchisee roles
        expectedRoles[`${franchiseeId}-${franchiseeBusinessId}`] = ['FRANCHISEE', 'OWNER', 'MANAGER', 'WORKER'];
        expectedHighestRoles[`${franchiseeId}-${franchiseeBusinessId}`] = 'FRANCHISEE';
      }
    }

    return {
      name: 'Business Ecosystem',
      description: `${config.businessCount} businesses with ${config.employeesPerBusiness} employees each, ${config.managementLevels} management levels${config.franchiseNetwork ? ', franchise network enabled' : ''}`,
      personalIds,
      corporateIds,
      businessRegistrations,
      papers,
      expectedRoles,
      expectedHighestRoles,
      validationRules: [
        'All owners should have OWNER role',
        'Managers should inherit WORKER role',
        'Franchisees should inherit MANAGER and WORKER roles',
        'Franchisor should have highest hierarchy level'
      ]
    };
  }

  /**
   * Generate edge case scenarios for comprehensive testing
   */
  static createEdgeCaseScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // Scenario 1: Overlapping roles with different effective dates
    const scenario1 = this.createOverlappingRolesScenario();
    scenarios.push(scenario1);

    // Scenario 2: Expired and revoked papers
    const scenario2 = this.createExpiredPapersScenario();
    scenarios.push(scenario2);

    // Scenario 3: Complex franchise hierarchy
    const scenario3 = this.createComplexFranchiseScenario();
    scenarios.push(scenario3);

    // Scenario 4: Multi-business person
    const scenario4 = this.createMultiBusinessPersonScenario();
    scenarios.push(scenario4);

    // Scenario 5: Invalid role dependencies
    const scenario5 = this.createInvalidDependenciesScenario();
    scenarios.push(scenario5);

    return scenarios;
  }

  private static createOverlappingRolesScenario(): TestScenario {
    const personalId = uuidv4();
    const businessId = uuidv4();

    const personalIds = [TestDataFactory.createPersonalId({
      id: personalId,
      name: '김중복역할',
      phone: '010-1111-1111'
    })];

    const businessRegistrations = [TestDataFactory.createBusinessRegistration(personalId, {
      id: businessId,
      business_name: '중복역할 테스트 회사',
      business_number: '111-11-11111'
    })];

    const papers = [
      // Worker paper (2024-01-01 to 2024-06-30)
      TestDataFactory.createPaper(personalId, businessId, {
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        effective_from: '2024-01-01',
        effective_until: '2024-06-30'
      }),

      // Manager paper (2024-03-01 to 2024-12-31) - overlaps with worker
      TestDataFactory.createPaper(personalId, businessId, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'MANAGER',
        effective_from: '2024-03-01',
        effective_until: '2024-12-31'
      }),

      // Owner paper (2024-07-01 onwards) - takes over from worker
      TestDataFactory.createPaper(personalId, businessId, {
        paper_type: 'BUSINESS_REGISTRATION',
        role_granted: 'OWNER',
        effective_from: '2024-07-01'
      })
    ];

    return {
      name: 'Overlapping Roles Scenario',
      description: 'Person with overlapping role effective dates to test temporal role calculation',
      personalIds,
      corporateIds: [],
      businessRegistrations,
      papers,
      expectedRoles: {
        [`${personalId}-${businessId}`]: ['OWNER', 'MANAGER', 'WORKER']
      },
      expectedHighestRoles: {
        [`${personalId}-${businessId}`]: 'OWNER'
      },
      validationRules: [
        'Current date should determine active papers',
        'Higher roles should take precedence',
        'Role inheritance should be maintained'
      ]
    };
  }

  private static createExpiredPapersScenario(): TestScenario {
    const personalId = uuidv4();
    const businessId = uuidv4();

    const personalIds = [TestDataFactory.createPersonalId({
      id: personalId,
      name: '김만료',
      phone: '010-2222-2222'
    })];

    const businessRegistrations = [TestDataFactory.createBusinessRegistration(personalId, {
      id: businessId,
      business_name: '만료 테스트 회사',
      business_number: '222-22-22222'
    })];

    const papers = [
      // Expired worker paper
      TestDataFactory.createPaper(personalId, businessId, {
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        effective_from: '2023-01-01',
        effective_until: '2023-12-31',
        status: 'EXPIRED'
      }),

      // Revoked manager paper
      TestDataFactory.createPaper(personalId, businessId, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'MANAGER',
        effective_from: '2023-06-01',
        effective_until: '2023-12-31',
        status: 'REVOKED'
      }),

      // Active owner paper
      TestDataFactory.createPaper(personalId, businessId, {
        paper_type: 'BUSINESS_REGISTRATION',
        role_granted: 'OWNER',
        effective_from: '2024-01-01',
        status: 'ACTIVE'
      })
    ];

    return {
      name: 'Expired Papers Scenario',
      description: 'Mixed active, expired, and revoked papers to test status handling',
      personalIds,
      corporateIds: [],
      businessRegistrations,
      papers,
      expectedRoles: {
        [`${personalId}-${businessId}`]: ['OWNER', 'MANAGER', 'WORKER']
      },
      expectedHighestRoles: {
        [`${personalId}-${businessId}`]: 'OWNER'
      },
      validationRules: [
        'Expired papers should not grant roles',
        'Revoked papers should not grant roles',
        'Only active papers should be considered'
      ]
    };
  }

  private static createComplexFranchiseScenario(): TestScenario {
    const franchisorId = uuidv4();
    const franchisee1Id = uuidv4();
    const franchisee2Id = uuidv4();
    const managerId = uuidv4();

    const franchisorBusinessId = uuidv4();
    const franchisee1BusinessId = uuidv4();
    const franchisee2BusinessId = uuidv4();

    const personalIds = [
      TestDataFactory.createPersonalId({
        id: franchisorId,
        name: '프랜차이저본사',
        phone: '010-3333-3333'
      }),
      TestDataFactory.createPersonalId({
        id: franchisee1Id,
        name: '프랜차이지1',
        phone: '010-3333-3334'
      }),
      TestDataFactory.createPersonalId({
        id: franchisee2Id,
        name: '프랜차이지2',
        phone: '010-3333-3335'
      }),
      TestDataFactory.createPersonalId({
        id: managerId,
        name: '매니저',
        phone: '010-3333-3336'
      })
    ];

    const businessRegistrations = [
      TestDataFactory.createBusinessRegistration(franchisorId, {
        id: franchisorBusinessId,
        business_name: '프랜차이즈 본사',
        business_number: '333-33-33333',
        business_type: 'FRANCHISE'
      }),
      TestDataFactory.createBusinessRegistration(franchisee1Id, {
        id: franchisee1BusinessId,
        business_name: '프랜차이즈 1호점',
        business_number: '333-33-33334',
        business_type: 'FRANCHISE'
      }),
      TestDataFactory.createBusinessRegistration(franchisee2Id, {
        id: franchisee2BusinessId,
        business_name: '프랜차이즈 2호점',
        business_number: '333-33-33335',
        business_type: 'FRANCHISE'
      })
    ];

    const papers = [
      // Franchisor owns main business
      TestDataFactory.createPaper(franchisorId, franchisorBusinessId, {
        paper_type: 'BUSINESS_REGISTRATION',
        role_granted: 'OWNER'
      }),

      // Franchisor has franchise agreements with stores
      TestDataFactory.createPaper(franchisorId, franchisee1BusinessId, {
        paper_type: 'FRANCHISE_AGREEMENT',
        role_granted: 'FRANCHISOR'
      }),
      TestDataFactory.createPaper(franchisorId, franchisee2BusinessId, {
        paper_type: 'FRANCHISE_AGREEMENT',
        role_granted: 'FRANCHISOR'
      }),

      // Franchisees own their stores
      TestDataFactory.createPaper(franchisee1Id, franchisee1BusinessId, {
        paper_type: 'FRANCHISE_AGREEMENT',
        role_granted: 'FRANCHISEE'
      }),
      TestDataFactory.createPaper(franchisee2Id, franchisee2BusinessId, {
        paper_type: 'FRANCHISE_AGREEMENT',
        role_granted: 'FRANCHISEE'
      }),

      // Manager works at store 1
      TestDataFactory.createPaper(managerId, franchisee1BusinessId, {
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER'
      }),
      TestDataFactory.createPaper(managerId, franchisee1BusinessId, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'MANAGER'
      })
    ];

    return {
      name: 'Complex Franchise Scenario',
      description: 'Multi-level franchise network with cross-business relationships',
      personalIds,
      corporateIds: [],
      businessRegistrations,
      papers,
      expectedRoles: {
        [`${franchisorId}-${franchisorBusinessId}`]: ['OWNER', 'MANAGER', 'WORKER'],
        [`${franchisorId}-${franchisee1BusinessId}`]: ['FRANCHISOR', 'FRANCHISEE', 'MANAGER', 'WORKER'],
        [`${franchisee1Id}-${franchisee1BusinessId}`]: ['FRANCHISEE', 'MANAGER', 'WORKER'],
        [`${managerId}-${franchisee1BusinessId}`]: ['MANAGER', 'WORKER']
      },
      expectedHighestRoles: {
        [`${franchisorId}-${franchisorBusinessId}`]: 'OWNER',
        [`${franchisorId}-${franchisee1BusinessId}`]: 'FRANCHISOR',
        [`${franchisee1Id}-${franchisee1BusinessId}`]: 'FRANCHISEE',
        [`${managerId}-${franchisee1BusinessId}`]: 'MANAGER'
      },
      validationRules: [
        'Franchisor should have network-wide access',
        'Franchisees should have store-specific access',
        'Franchise hierarchy should be maintained'
      ]
    };
  }

  private static createMultiBusinessPersonScenario(): TestScenario {
    const personId = uuidv4();
    const business1Id = uuidv4();
    const business2Id = uuidv4();
    const business3Id = uuidv4();

    const personalIds = [TestDataFactory.createPersonalId({
      id: personId,
      name: '김멀티비즈',
      phone: '010-4444-4444'
    })];

    const businessRegistrations = [
      TestDataFactory.createBusinessRegistration(personId, {
        id: business1Id,
        business_name: '본인 카페',
        business_number: '444-44-44441',
        business_type: 'SOLE_PROPRIETORSHIP'
      }),
      TestDataFactory.createBusinessRegistration('other-owner-1', {
        id: business2Id,
        business_name: '다른 회사',
        business_number: '444-44-44442',
        business_type: 'CORPORATION'
      }),
      TestDataFactory.createBusinessRegistration('other-owner-2', {
        id: business3Id,
        business_name: '프랜차이즈 가게',
        business_number: '444-44-44443',
        business_type: 'FRANCHISE'
      })
    ];

    const papers = [
      // Owner of own business
      TestDataFactory.createPaper(personId, business1Id, {
        paper_type: 'BUSINESS_REGISTRATION',
        role_granted: 'OWNER'
      }),

      // Manager at corporation
      TestDataFactory.createPaper(personId, business2Id, {
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER'
      }),
      TestDataFactory.createPaper(personId, business2Id, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'MANAGER'
      }),

      // Franchisee at franchise
      TestDataFactory.createPaper(personId, business3Id, {
        paper_type: 'FRANCHISE_AGREEMENT',
        role_granted: 'FRANCHISEE'
      })
    ];

    return {
      name: 'Multi-Business Person Scenario',
      description: 'One person with different roles across multiple businesses',
      personalIds,
      corporateIds: [],
      businessRegistrations,
      papers,
      expectedRoles: {
        [`${personId}-${business1Id}`]: ['OWNER', 'MANAGER', 'WORKER'],
        [`${personId}-${business2Id}`]: ['MANAGER', 'WORKER'],
        [`${personId}-${business3Id}`]: ['FRANCHISEE', 'MANAGER', 'WORKER']
      },
      expectedHighestRoles: {
        [`${personId}-${business1Id}`]: 'OWNER',
        [`${personId}-${business2Id}`]: 'MANAGER',
        [`${personId}-${business3Id}`]: 'FRANCHISEE'
      },
      validationRules: [
        'Each business context should be isolated',
        'Roles should be specific to each business',
        'Cross-business access should be restricted'
      ]
    };
  }

  private static createInvalidDependenciesScenario(): TestScenario {
    const personId = uuidv4();
    const businessId = uuidv4();

    const personalIds = [TestDataFactory.createPersonalId({
      id: personId,
      name: '김잘못된의존성',
      phone: '010-5555-5555'
    })];

    const businessRegistrations = [TestDataFactory.createBusinessRegistration(personId, {
      id: businessId,
      business_name: '잘못된 의존성 테스트 회사',
      business_number: '555-55-55555'
    })];

    const papers = [
      // Manager without Worker base - should fail validation
      TestDataFactory.createPaper(personId, businessId, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'MANAGER',
        effective_from: '2024-01-01'
      }),

      // Supervisor without Worker base - should fail validation
      TestDataFactory.createPaper(personId, businessId, {
        paper_type: 'MANAGEMENT_APPOINTMENT',
        role_granted: 'SUPERVISOR',
        effective_from: '2024-02-01'
      })
    ];

    return {
      name: 'Invalid Dependencies Scenario',
      description: 'Papers with invalid role dependencies to test validation',
      personalIds,
      corporateIds: [],
      businessRegistrations,
      papers,
      expectedRoles: {
        [`${personId}-${businessId}`]: ['SEEKER'] // Should revert to SEEKER due to validation failure
      },
      expectedHighestRoles: {
        [`${personId}-${businessId}`]: 'SEEKER'
      },
      validationRules: [
        'MANAGER requires WORKER base role',
        'SUPERVISOR requires WORKER base role',
        'Invalid dependencies should cause role calculation to fail'
      ]
    };
  }

  /**
   * Generate performance testing data
   */
  static generatePerformanceTestData(config: {
    personalIdCount: number;
    businessCount: number;
    papersPerPerson: number;
    corporateIdRatio: number; // 0.0 to 1.0
  }): PerformanceTestData {
    const personalIds: any[] = [];
    const businesses: any[] = [];
    const papers: any[] = [];
    const roleCalculations: any[] = [];

    // Generate personal IDs
    for (let i = 0; i < config.personalIdCount; i++) {
      const personalId = TestDataFactory.createPersonalId({
        name: `성능테스트${i + 1}`,
        phone: `010-${String(1000 + i).padStart(4, '0')}-${String(i).padStart(4, '0')}`,
        email: `perf${i + 1}@test.com`
      });
      personalIds.push(personalId);
    }

    // Generate businesses (distributed among personal IDs)
    for (let i = 0; i < config.businessCount; i++) {
      const ownerIndex = i % config.personalIdCount;
      const ownerId = personalIds[ownerIndex].id;

      const business = TestDataFactory.createBusinessRegistration(ownerId, {
        business_name: `성능테스트회사${i + 1}`,
        business_number: `${String(100 + i).padStart(3, '0')}-${String(10 + i).padStart(2, '0')}-${String(10000 + i).padStart(5, '0')}`
      });
      businesses.push(business);
    }

    // Generate papers
    for (let personIndex = 0; personIndex < config.personalIdCount; personIndex++) {
      const personalId = personalIds[personIndex].id;

      for (let paperIndex = 0; paperIndex < config.papersPerPerson; paperIndex++) {
        const businessIndex = (personIndex * config.papersPerPerson + paperIndex) % config.businessCount;
        const businessId = businesses[businessIndex].id;

        const paperTypes: { type: PaperType; role: RoleType }[] = [
          { type: 'EMPLOYMENT_CONTRACT', role: 'WORKER' },
          { type: 'MANAGEMENT_APPOINTMENT', role: 'SUPERVISOR' },
          { type: 'MANAGEMENT_APPOINTMENT', role: 'MANAGER' },
          { type: 'BUSINESS_REGISTRATION', role: 'OWNER' },
          { type: 'FRANCHISE_AGREEMENT', role: 'FRANCHISEE' }
        ];

        const { type, role } = paperTypes[paperIndex % paperTypes.length];

        const paper = TestDataFactory.createPaper(personalId, businessId, {
          paper_type: type,
          role_granted: role,
          effective_from: `2024-0${(paperIndex % 9) + 1}-01`,
          metadata: { performanceTest: true, index: paperIndex }
        });

        papers.push(paper);
      }
    }

    // Generate role calculations
    for (let personIndex = 0; personIndex < config.personalIdCount; personIndex++) {
      const personalId = personalIds[personIndex].id;

      for (let businessIndex = 0; businessIndex < Math.min(config.businessCount, 10); businessIndex++) {
        const businessId = businesses[businessIndex].id;
        const relatedPapers = papers.filter(p => 
          p.personal_id === personalId && p.business_id === businessId
        );

        if (relatedPapers.length > 0) {
          const roleCalc = {
            personal_id: personalId,
            business_id: businessId,
            calculated_roles: ['WORKER', 'MANAGER'],
            highest_role: 'MANAGER',
            calculation_basis: {
              papers: relatedPapers.map(p => p.id),
              dependencies: ['WORKER'],
              inheritance: ['MANAGER']
            },
            updated_at: new Date().toISOString()
          };

          roleCalculations.push(roleCalc);
        }
      }
    }

    // Estimate data size
    const avgPersonalIdSize = 200; // bytes
    const avgBusinessSize = 300;
    const avgPaperSize = 400;
    const avgRoleCalcSize = 500;

    const estimatedSizeKB = Math.round(
      (personalIds.length * avgPersonalIdSize +
       businesses.length * avgBusinessSize +
       papers.length * avgPaperSize +
       roleCalculations.length * avgRoleCalcSize) / 1024
    );

    const totalRecords = personalIds.length + businesses.length + papers.length + roleCalculations.length;

    return {
      personalIds,
      businesses,
      papers,
      roleCalculations,
      totalRecords,
      estimatedSizeKB
    };
  }

  /**
   * Generate test data with specific constraints for testing validation
   */
  static createValidationTestData(): {
    validData: any[];
    invalidData: any[];
    edgeCases: any[];
  } {
    const validData: any[] = [];
    const invalidData: any[] = [];
    const edgeCases: any[] = [];

    // Valid personal IDs
    validData.push({
      type: 'personal_id',
      data: TestDataFactory.createPersonalId({
        name: '김유효',
        phone: '010-1234-5678',
        email: 'valid@test.com'
      })
    });

    // Invalid personal IDs
    invalidData.push({
      type: 'personal_id',
      data: {
        name: '', // Empty name
        phone: '010-1234-5678',
        email: 'invalid@test.com'
      },
      expectedError: 'Name is required'
    });

    invalidData.push({
      type: 'personal_id',
      data: {
        name: '김무효',
        phone: '123-456-7890', // Invalid phone format
        email: 'invalid@test.com'
      },
      expectedError: 'Invalid phone format'
    });

    invalidData.push({
      type: 'personal_id',
      data: {
        name: '김무효',
        phone: '010-1234-5678',
        email: 'invalid-email' // Invalid email format
      },
      expectedError: 'Invalid email format'
    });

    // Edge cases
    edgeCases.push({
      type: 'personal_id',
      data: TestDataFactory.createPersonalId({
        name: 'A'.repeat(100), // Maximum length name
        phone: '010-9999-9999',
        email: 'edge@test.com'
      }),
      description: 'Maximum length name'
    });

    edgeCases.push({
      type: 'personal_id',
      data: TestDataFactory.createPersonalId({
        name: '김',
        phone: '010-0000-0000',
        email: 'a@b.co'
      }),
      description: 'Minimum length fields'
    });

    // Special characters in names
    edgeCases.push({
      type: 'personal_id',
      data: TestDataFactory.createPersonalId({
        name: '김특수문자!@#$%',
        phone: '010-1111-2222',
        email: 'special@test.com'
      }),
      description: 'Special characters in name'
    });

    // Unicode characters
    edgeCases.push({
      type: 'personal_id',
      data: TestDataFactory.createPersonalId({
        name: '김유니코드🙂',
        phone: '010-3333-4444',
        email: 'unicode@test.com'
      }),
      description: 'Unicode emoji in name'
    });

    return { validData, invalidData, edgeCases };
  }

  /**
   * Create realistic business data with proper relationships
   */
  static createRealisticBusinessData(industryType: 'restaurant' | 'retail' | 'service' | 'tech'): TestScenario {
    const industryConfigs = {
      restaurant: {
        businessTypes: ['SOLE_PROPRIETORSHIP', 'PARTNERSHIP'],
        roleStructure: ['OWNER', 'MANAGER', 'SUPERVISOR', 'WORKER'],
        paperTypes: ['BUSINESS_REGISTRATION', 'EMPLOYMENT_CONTRACT', 'MANAGEMENT_APPOINTMENT'],
        businessNames: ['맛집카페', '황금분식', '프리미엄레스토랑'],
        positions: ['셰프', '서빙', '매니저', '사장']
      },
      retail: {
        businessTypes: ['CORPORATION', 'FRANCHISE'],
        roleStructure: ['FRANCHISOR', 'FRANCHISEE', 'MANAGER', 'WORKER'],
        paperTypes: ['FRANCHISE_AGREEMENT', 'EMPLOYMENT_CONTRACT', 'MANAGEMENT_APPOINTMENT'],
        businessNames: ['패션스토어', '편의점24', '뷰티샵'],
        positions: ['매니저', '판매원', '가맹점주', '본부장']
      },
      service: {
        businessTypes: ['CORPORATION', 'PARTNERSHIP'],
        roleStructure: ['OWNER', 'MANAGER', 'WORKER'],
        paperTypes: ['BUSINESS_REGISTRATION', 'PARTNERSHIP_AGREEMENT', 'EMPLOYMENT_CONTRACT'],
        businessNames: ['클린서비스', '헤어살롱', '정비소'],
        positions: ['기사', '매니저', '사장', '파트너']
      },
      tech: {
        businessTypes: ['CORPORATION'],
        roleStructure: ['OWNER', 'MANAGER', 'WORKER'],
        paperTypes: ['BUSINESS_REGISTRATION', 'EMPLOYMENT_CONTRACT', 'MANAGEMENT_APPOINTMENT'],
        businessNames: ['테크스타트업', 'AI솔루션', '모바일앱개발'],
        positions: ['개발자', 'PM', 'CTO', 'CEO']
      }
    };

    const config = industryConfigs[industryType];
    const personalIds: any[] = [];
    const businessRegistrations: any[] = [];
    const papers: any[] = [];
    const expectedRoles: Record<string, RoleType[]> = {};
    const expectedHighestRoles: Record<string, RoleType> = {};

    // Create business owner
    const ownerId = uuidv4();
    const owner = TestDataFactory.createPersonalId({
      id: ownerId,
      name: `${config.positions[config.positions.length - 1]}김`,
      phone: '010-1000-0001',
      email: `owner@${industryType}.com`
    });
    personalIds.push(owner);

    // Create business
    const business = TestDataFactory.createBusinessRegistration(ownerId, {
      business_name: config.businessNames[0],
      business_number: '100-00-00001',
      business_type: config.businessTypes[0] as BusinessType
    });
    businessRegistrations.push(business);

    // Create owner paper
    const ownerPaper = TestDataFactory.createPaper(ownerId, business.id, {
      paper_type: 'BUSINESS_REGISTRATION',
      role_granted: 'OWNER'
    });
    papers.push(ownerPaper);

    expectedRoles[`${ownerId}-${business.id}`] = ['OWNER', 'MANAGER', 'WORKER'];
    expectedHighestRoles[`${ownerId}-${business.id}`] = 'OWNER';

    // Create employees based on industry structure
    config.positions.slice(0, -1).forEach((position, index) => {
      const employeeId = uuidv4();
      const employee = TestDataFactory.createPersonalId({
        id: employeeId,
        name: `${position}${index + 1}`,
        phone: `010-1000-000${index + 2}`,
        email: `${position}${index + 1}@${industryType}.com`
      });
      personalIds.push(employee);

      // Create worker paper
      const workerPaper = TestDataFactory.createPaper(employeeId, business.id, {
        paper_type: 'EMPLOYMENT_CONTRACT',
        role_granted: 'WORKER',
        metadata: { position, department: industryType }
      });
      papers.push(workerPaper);

      let roles: RoleType[] = ['WORKER'];
      let highestRole: RoleType = 'WORKER';

      // Add management roles based on position
      if (position.includes('매니저') || position.includes('PM') || position.includes('CTO')) {
        const managementPaper = TestDataFactory.createPaper(employeeId, business.id, {
          paper_type: 'MANAGEMENT_APPOINTMENT',
          role_granted: 'MANAGER',
          metadata: { position, level: 'management' }
        });
        papers.push(managementPaper);
        roles = ['MANAGER', 'WORKER'];
        highestRole = 'MANAGER';
      }

      expectedRoles[`${employeeId}-${business.id}`] = roles;
      expectedHighestRoles[`${employeeId}-${business.id}`] = highestRole;
    });

    return {
      name: `Realistic ${industryType} Business`,
      description: `Industry-specific business structure for ${industryType} sector`,
      personalIds,
      corporateIds: [],
      businessRegistrations,
      papers,
      expectedRoles,
      expectedHighestRoles,
      validationRules: [
        `Business structure matches ${industryType} industry standards`,
        'Role hierarchy reflects real-world organization',
        'All employees have appropriate papers for their positions'
      ]
    };
  }
}

export default AdvancedTestDataFactory;