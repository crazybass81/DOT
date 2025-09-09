/**
 * ID-ROLE-PAPER System Usage Examples
 * 
 * Demonstrates how to use the new backend services for identity management,
 * role calculation, and permission checking.
 */

import { unifiedAuthService, CreateIdentityOptions } from '../services/unifiedAuthService';
import { identityService } from '../services/identity.service';
import { permissionService, Resource, Action } from '../lib/permissions/role-permissions';
import {
  IdType,
  PaperType,
  BusinessType,
  RoleType,
  CreatePaperRequest,
  CreateBusinessRegistrationRequest
} from '../../../src/types/id-role-paper';

/**
 * Example 1: User Registration and Identity Creation
 */
export async function exampleUserRegistration() {
  console.log('=== Example 1: User Registration ===');
  
  try {
    // 1. Create user account
    const identityOptions: CreateIdentityOptions = {
      idType: IdType.PERSONAL,
      fullName: 'John Doe',
      phone: '+1-555-0123',
      birthDate: new Date('1990-01-01')
    };

    const signUpResult = await unifiedAuthService.signUp(
      'john.doe@example.com',
      'securepassword123',
      { name: 'John Doe' },
      identityOptions
    );

    if (signUpResult.success && signUpResult.user) {
      console.log('✅ User registered successfully');
      console.log('User:', signUpResult.user);
      console.log('Primary Role:', signUpResult.user.primaryRole); // Should be SEEKER
      console.log('Available Roles:', signUpResult.user.availableRoles);
    } else {
      console.error('❌ Registration failed:', signUpResult.error);
    }
  } catch (error) {
    console.error('❌ Registration error:', error);
  }
}

/**
 * Example 2: Business Owner Registration and Role Progression
 */
export async function exampleBusinessOwnerJourney() {
  console.log('=== Example 2: Business Owner Journey ===');
  
  try {
    // 1. Sign in as existing user
    const signInResult = await unifiedAuthService.signIn(
      'business.owner@example.com',
      'password123'
    );

    if (!signInResult.success) {
      console.error('❌ Sign in failed:', signInResult.error);
      return;
    }

    console.log('✅ Signed in successfully');
    console.log('Current roles:', signInResult.user?.availableRoles);

    // 2. Create business registration
    const businessRequest: CreateBusinessRegistrationRequest = {
      registrationNumber: 'BIZ-123-456-789',
      businessName: 'Doe Enterprises LLC',
      businessType: BusinessType.CORPORATE,
      registrationData: {
        address: '123 Business St, City, State 12345',
        industry: 'Technology Services'
      }
    };

    const businessResult = await unifiedAuthService.createBusinessRegistration(businessRequest);
    
    if (businessResult.success) {
      console.log('✅ Business registration created');
      console.log('Business ID:', businessResult.businessId);
      console.log('Updated roles:', businessResult.rolesUpdated); // Should include OWNER
    } else {
      console.error('❌ Business registration failed:', businessResult.error);
    }

    // 3. Add Employment Contract paper to become WORKER
    const employmentPaper: CreatePaperRequest = {
      paperType: PaperType.EMPLOYMENT_CONTRACT,
      relatedBusinessId: businessResult.businessId,
      paperData: {
        position: 'Chief Executive Officer',
        startDate: new Date().toISOString(),
        employmentType: 'full-time'
      }
    };

    const paperResult = await unifiedAuthService.createPaper(employmentPaper);
    
    if (paperResult.success) {
      console.log('✅ Employment contract created');
      console.log('Updated roles:', paperResult.rolesUpdated); // Should include WORKER + OWNER
    }

  } catch (error) {
    console.error('❌ Business owner journey error:', error);
  }
}

/**
 * Example 3: Manager Role Assignment
 */
export async function exampleManagerRoleAssignment() {
  console.log('=== Example 3: Manager Role Assignment ===');
  
  try {
    // Get current user context
    const userContext = await unifiedAuthService.getUserWithContext();
    if (!userContext) {
      console.error('❌ User context not found');
      return;
    }

    console.log('Current roles:', userContext.availableRoles);

    // Check if user already has WORKER role (prerequisite for MANAGER)
    const hasWorkerRole = userContext.availableRoles.includes(RoleType.WORKER);
    console.log('Has WORKER role:', hasWorkerRole);

    if (!hasWorkerRole) {
      console.log('❌ WORKER role required first');
      return;
    }

    // Add Authority Delegation paper to become MANAGER
    const authorityPaper: CreatePaperRequest = {
      paperType: PaperType.AUTHORITY_DELEGATION,
      relatedBusinessId: userContext.businessRegistrations[0]?.id,
      paperData: {
        delegatedBy: 'Business Owner',
        scope: 'Team Management',
        delegationDate: new Date().toISOString()
      }
    };

    const paperResult = await unifiedAuthService.createPaper(authorityPaper);
    
    if (paperResult.success) {
      console.log('✅ Authority delegation created');
      console.log('Updated roles:', paperResult.rolesUpdated); // Should include MANAGER
    }

  } catch (error) {
    console.error('❌ Manager role assignment error:', error);
  }
}

/**
 * Example 4: Permission Checking
 */
export async function examplePermissionChecking() {
  console.log('=== Example 4: Permission Checking ===');
  
  try {
    // Check various permissions for current user
    const permissions = [
      { resource: Resource.ATTENDANCE, action: Action.CREATE },
      { resource: Resource.ATTENDANCE, action: Action.APPROVE },
      { resource: Resource.SCHEDULE, action: Action.MANAGE },
      { resource: Resource.ORGANIZATION, action: Action.MANAGE },
      { resource: Resource.USER_ROLES, action: Action.ASSIGN }
    ];

    console.log('Permission checks:');
    
    for (const permission of permissions) {
      const hasPermission = await unifiedAuthService.hasPermission(
        permission.resource,
        permission.action
      );
      
      console.log(`${permission.action} ${permission.resource}: ${hasPermission ? '✅' : '❌'}`);
    }

    // Check permission with business context
    const userContext = await unifiedAuthService.getUserWithContext();
    const businessId = userContext?.businessRegistrations[0]?.id;
    
    if (businessId) {
      const hasBusinessPermission = await unifiedAuthService.hasPermission(
        Resource.ATTENDANCE,
        Action.APPROVE,
        { businessContextId: businessId }
      );
      
      console.log(`Approve attendance (business context): ${hasBusinessPermission ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Permission checking error:', error);
  }
}

/**
 * Example 5: Role Analysis and Progression
 */
export async function exampleRoleAnalysis() {
  console.log('=== Example 5: Role Analysis ===');
  
  try {
    const userContext = await unifiedAuthService.getUserWithContext();
    if (!userContext) {
      console.error('❌ User context not found');
      return;
    }

    console.log('=== Current User Analysis ===');
    console.log('Identity Type:', userContext.identity.idType);
    console.log('Primary Role:', userContext.primaryRole);
    console.log('Available Roles:', userContext.availableRoles);
    console.log('Business Contexts:', userContext.businessContexts?.length || 0);
    
    console.log('\n=== Papers Owned ===');
    userContext.papers.forEach(paper => {
      console.log(`- ${paper.paperType} (${paper.isActive ? 'Active' : 'Inactive'})`);
    });

    console.log('\n=== Business Registrations ===');
    userContext.businessRegistrations.forEach(business => {
      console.log(`- ${business.businessName} (${business.businessType})`);
    });

    console.log('\n=== Computed Roles ===');
    userContext.computedRoles.forEach(role => {
      console.log(`- ${role.role} ${role.businessContextId ? `(Business: ${role.businessContextId})` : '(Global)'}`);
      console.log(`  Source Papers: ${role.sourcePapers.join(', ')}`);
    });

    // Analyze role potential using RoleCalculator
    const { RoleCalculator } = await import('../../../src/lib/role-engine/role-calculator');
    const analysis = RoleCalculator.analyzeRolePotential(userContext.papers);
    
    console.log('\n=== Role Potential Analysis ===');
    console.log('Current Roles:', analysis.currentRoles);
    console.log('Potential Roles (1 paper away):', analysis.potentialRoles);
    
    if (analysis.nextSteps.length > 0) {
      console.log('\n=== Next Steps ===');
      analysis.nextSteps.forEach(step => {
        console.log(`- ${step.description}`);
        console.log(`  Required: ${step.requiredPapers.join(', ')}`);
      });
    }

  } catch (error) {
    console.error('❌ Role analysis error:', error);
  }
}

/**
 * Example 6: Franchise System
 */
export async function exampleFranchiseSystem() {
  console.log('=== Example 6: Franchise System ===');
  
  try {
    // Create franchisee
    const franchiseePapers: CreatePaperRequest[] = [
      {
        paperType: PaperType.BUSINESS_REGISTRATION,
        paperData: {
          registrationNumber: 'FRAN-LOC-001',
          businessName: 'Franchise Location #1'
        }
      },
      {
        paperType: PaperType.FRANCHISE_AGREEMENT,
        paperData: {
          franchiseTerms: 'Standard franchise agreement',
          franchiseId: 'FRAN-001',
          territory: 'Downtown District'
        }
      }
    ];

    console.log('Creating franchisee papers...');
    for (const paper of franchiseePapers) {
      const result = await unifiedAuthService.createPaper(paper);
      if (result.success) {
        console.log(`✅ Created ${paper.paperType}`);
      } else {
        console.error(`❌ Failed to create ${paper.paperType}:`, result.error);
      }
    }

    // Check franchisee permissions
    const franchiseePermissions = [
      { resource: Resource.ORGANIZATION, action: Action.MANAGE },
      { resource: Resource.REPORTS, action: Action.CREATE },
      { resource: Resource.SETTINGS, action: Action.READ }
    ];

    console.log('\nFranchisee permissions:');
    for (const permission of franchiseePermissions) {
      const hasPermission = await unifiedAuthService.hasPermission(
        permission.resource,
        permission.action
      );
      console.log(`${permission.action} ${permission.resource}: ${hasPermission ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Franchise system error:', error);
  }
}

/**
 * Example 7: Multi-Business Context Switching
 */
export async function exampleMultiBusinessContext() {
  console.log('=== Example 7: Multi-Business Context ===');
  
  try {
    const userContext = await unifiedAuthService.getUserWithContext();
    if (!userContext || userContext.businessRegistrations.length === 0) {
      console.error('❌ No business contexts found');
      return;
    }

    console.log(`Found ${userContext.businessRegistrations.length} business contexts:`);
    
    for (const business of userContext.businessRegistrations) {
      console.log(`\n--- Switching to: ${business.businessName} ---`);
      
      const switchResult = await unifiedAuthService.switchBusinessContext(business.id);
      
      if (switchResult.success) {
        console.log('✅ Context switched successfully');
        console.log('Available roles in this context:', switchResult.availableRoles);
        
        // Check permissions in this specific business context
        const hasApprovalPermission = await unifiedAuthService.hasPermission(
          Resource.ATTENDANCE,
          Action.APPROVE,
          { businessContextId: business.id }
        );
        
        console.log(`Can approve attendance: ${hasApprovalPermission ? '✅' : '❌'}`);
      } else {
        console.error('❌ Context switch failed:', switchResult.error);
      }
    }

  } catch (error) {
    console.error('❌ Multi-business context error:', error);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Starting ID-ROLE-PAPER System Examples\n');
  
  await exampleUserRegistration();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await exampleBusinessOwnerJourney();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await exampleManagerRoleAssignment();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await examplePermissionChecking();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await exampleRoleAnalysis();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await exampleFranchiseSystem();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await exampleMultiBusinessContext();
  
  console.log('\n✅ All examples completed!');
}

// Export individual examples for selective testing
export {
  exampleUserRegistration,
  exampleBusinessOwnerJourney,
  exampleManagerRoleAssignment,
  examplePermissionChecking,
  exampleRoleAnalysis,
  exampleFranchiseSystem,
  exampleMultiBusinessContext
};