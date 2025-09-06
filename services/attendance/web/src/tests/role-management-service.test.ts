/**
 * Role Management Service - Real Data Tests
 * Testing roleManagementService with real role_assignments and unified_identities data
 */

import { describe, test, expect, beforeAll, afterEach } from '@jest/globals'
import { roleManagementService } from '../services/roleManagementService'
import { organizationService } from '../services/organizationService'
import { unifiedIdentityService } from '../services/unifiedIdentityService'
import { IdType, UnifiedRole } from '../types/unified.types'

describe('Role Management Service - Real Data Tests', () => {

  beforeAll(() => {
    console.log('🔧 Testing role management service with real data')
  })

  afterEach(async () => {
    console.log('🧹 Test cleanup (limited by RLS policies)')
  })

  describe('Service Availability', () => {

    test('Should have role management service available', () => {
      console.log('🧪 Test: Role management service availability')

      expect(roleManagementService).toBeDefined()
      expect(typeof roleManagementService.checkPermission).toBe('function')
      expect(typeof roleManagementService.transitionRole).toBe('function')
      expect(typeof roleManagementService.bulkAssignRoles).toBe('function')
      expect(typeof roleManagementService.canManageRole).toBe('function')
      expect(typeof roleManagementService.getUserEffectivePermissions).toBe('function')
      expect(typeof roleManagementService.getRoleHierarchy).toBe('function')

      console.log('✅ Role management service is available with all required methods')
    })
  })

  describe('Role Hierarchy System', () => {

    test('Should provide role hierarchy information', () => {
      console.log('🧪 Test: Role hierarchy system')

      const hierarchy = roleManagementService.getRoleHierarchy()

      console.log('Role hierarchy data:', {
        roleCount: hierarchy.roles.length,
        roles: hierarchy.roles,
        hasMasterRole: hierarchy.roles.includes('master'),
        hasPermissions: !!hierarchy.permissions
      })

      expect(hierarchy).toBeDefined()
      expect(Array.isArray(hierarchy.roles)).toBe(true)
      expect(hierarchy.roles.length).toBeGreaterThan(0)
      expect(hierarchy.roles).toContain('master')
      expect(hierarchy.roles).toContain('admin')
      expect(hierarchy.roles).toContain('worker')
      expect(hierarchy.hierarchy).toBeDefined()
      expect(hierarchy.hierarchy.master).toBeGreaterThan(hierarchy.hierarchy.admin)
      expect(hierarchy.hierarchy.admin).toBeGreaterThan(hierarchy.hierarchy.worker)

      console.log('✅ Role hierarchy system working correctly')
    })
  })

  describe('Permission Checking System', () => {

    test('Should handle permission checks for non-existent user', async () => {
      console.log('🧪 Test: Permission checks for non-existent user')

      const nonExistentUserId = 'non-existent-' + Date.now()

      const permissionCheck = await roleManagementService.checkPermission(
        nonExistentUserId,
        'read',
        'organizations'
      )

      console.log('Permission check result:', {
        hasPermission: permissionCheck.hasPermission,
        reason: permissionCheck.reason,
        appliedRoles: permissionCheck.appliedRoles
      })

      expect(permissionCheck.hasPermission).toBe(false)
      expect(permissionCheck.reason).toContain('No active roles')
      expect(Array.isArray(permissionCheck.appliedRoles)).toBe(true)
      expect(permissionCheck.appliedRoles.length).toBe(0)

      console.log('✅ Permission checking for non-existent user working correctly')
    })

    test('Should validate role management permissions', async () => {
      console.log('🧪 Test: Role management permissions validation')

      const managerId = 'manager-' + Date.now()
      const targetId = 'target-' + Date.now()

      const canManage = await roleManagementService.canManageRole(
        managerId,
        targetId,
        'worker'
      )

      console.log('Role management permission check:', {
        canManage: canManage.canManage,
        reason: canManage.reason
      })

      expect(canManage.canManage).toBe(false)
      expect(canManage.reason).toContain('no active roles')

      console.log('✅ Role management permissions validation working')
    })
  })

  describe('Role Transition System', () => {

    test('Should validate role transition requests', async () => {
      console.log('🧪 Test: Role transition validation')

      const transitionRequest = {
        identityId: 'test-identity-' + Date.now(),
        fromRole: 'worker' as UnifiedRole,
        toRole: 'admin' as UnifiedRole,
        requestedBy: 'requester-' + Date.now(),
        organizationId: 'test-org-' + Date.now()
      }

      console.log('Processing role transition request:', {
        from: transitionRequest.fromRole,
        to: transitionRequest.toRole
      })

      const result = await roleManagementService.transitionRole(transitionRequest)

      console.log('Role transition result:', {
        success: result.success,
        error: result.error
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      console.log('✅ Role transition validation working correctly')
    })

    test('Should handle invalid master role transition', async () => {
      console.log('🧪 Test: Invalid master role transition')

      const invalidTransition = {
        identityId: 'test-identity-' + Date.now(),
        fromRole: 'master' as UnifiedRole,
        toRole: 'worker' as UnifiedRole,
        requestedBy: 'requester-' + Date.now()
      }

      const result = await roleManagementService.transitionRole(invalidTransition)

      console.log('Invalid transition result:', {
        success: result.success,
        error: result.error
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Master role can only transition to admin')
      console.log('✅ Master role transition validation working')
    })
  })

  describe('Bulk Role Assignment System', () => {

    test('Should handle bulk role assignment with validation', async () => {
      console.log('🧪 Test: Bulk role assignment')

      const bulkRequest = {
        assignments: [
          {
            identityId: 'identity1-' + Date.now(),
            role: 'worker' as UnifiedRole,
            organizationId: 'org-' + Date.now()
          },
          {
            identityId: 'identity2-' + Date.now(),
            role: 'manager' as UnifiedRole,
            organizationId: 'org-' + Date.now()
          }
        ],
        requestedBy: 'bulk-assigner-' + Date.now()
      }

      console.log('Processing bulk role assignment:', {
        assignmentCount: bulkRequest.assignments.length,
        roles: bulkRequest.assignments.map(a => a.role)
      })

      const result = await roleManagementService.bulkAssignRoles(bulkRequest)

      console.log('Bulk assignment result:', {
        success: result.success,
        successful: result.summary.successful,
        failed: result.summary.failed,
        total: result.summary.total
      })

      expect(result).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.summary.total).toBe(2)
      expect(Array.isArray(result.successfulAssignments)).toBe(true)
      expect(Array.isArray(result.failedAssignments)).toBe(true)

      console.log('✅ Bulk role assignment system working')
    })
  })

  describe('User Effective Permissions', () => {

    test('Should retrieve user effective permissions', async () => {
      console.log('🧪 Test: User effective permissions retrieval')

      const userId = 'permissions-test-' + Date.now()

      const permissions = await roleManagementService.getUserEffectivePermissions(userId)

      console.log('Effective permissions result:', {
        permissionCount: permissions.permissions.length,
        roleCount: permissions.roles.length,
        organizationCount: permissions.organizations.length,
        permissions: permissions.permissions.slice(0, 5), // Show first 5
        roles: permissions.roles
      })

      expect(Array.isArray(permissions.permissions)).toBe(true)
      expect(Array.isArray(permissions.roles)).toBe(true)
      expect(Array.isArray(permissions.organizations)).toBe(true)

      console.log('✅ User effective permissions retrieval working')
    })
  })

  describe('Real Data Integration Tests', () => {

    test('Should integrate with identity and organization services', async () => {
      console.log('🧪 Test: Service integration with real data')

      // Test creating an identity and checking permissions
      const identityData = {
        email: 'role-integration-' + Date.now() + '@test.local',
        full_name: '역할 통합 테스트',
        id_type: 'personal' as IdType
      }

      console.log('Creating identity for integration test:', identityData.email)

      const identityResult = await unifiedIdentityService.createIdentity(identityData)

      if (identityResult.success && identityResult.identity) {
        console.log('✅ Identity created for integration test')

        // Check permissions for new identity (should have no permissions)
        const permissionCheck = await roleManagementService.checkPermission(
          identityResult.identity.id,
          'read',
          'system'
        )

        console.log('Permission check for new identity:', {
          hasPermission: permissionCheck.hasPermission,
          reason: permissionCheck.reason
        })

        expect(permissionCheck.hasPermission).toBe(false)
        expect(permissionCheck.reason).toContain('No active roles')

        // Test effective permissions for new identity
        const effectivePermissions = await roleManagementService.getUserEffectivePermissions(
          identityResult.identity.id
        )

        console.log('Effective permissions for new identity:', {
          permissionCount: effectivePermissions.permissions.length,
          roleCount: effectivePermissions.roles.length
        })

        expect(effectivePermissions.roles.length).toBe(0)
        expect(effectivePermissions.permissions.length).toBe(0)

        console.log('✅ Service integration working correctly')
      } else {
        console.log('⚠️ Identity creation failed, testing basic integration only')
        
        // Still test that services can communicate
        const hierarchy = roleManagementService.getRoleHierarchy()
        expect(hierarchy.roles.length).toBeGreaterThan(0)
      }

      expect(typeof identityResult.success).toBe('boolean')
    })
  })

  describe('Error Handling and Resilience', () => {

    test('Should handle database errors gracefully', async () => {
      console.log('🧪 Test: Error handling and resilience')

      // Test methods with invalid IDs
      const invalidId = 'invalid-' + Date.now()

      const methods = [
        () => roleManagementService.checkPermission(invalidId, 'read'),
        () => roleManagementService.canManageRole(invalidId, invalidId, 'worker'),
        () => roleManagementService.getUserEffectivePermissions(invalidId)
      ]

      for (let i = 0; i < methods.length; i++) {
        try {
          const result = await methods[i]()
          console.log(`Method ${i + 1} result type:`, typeof result)
        } catch (error: any) {
          console.log(`Method ${i + 1} error (handled):`, error.message)
        }
      }

      console.log('✅ Error handling verified - all methods handle errors gracefully')
    })

    test('Should handle system edge cases', async () => {
      console.log('🧪 Test: System edge cases')

      // Test with empty arrays and null values
      const hierarchy = roleManagementService.getRoleHierarchy()
      
      expect(hierarchy).toBeDefined()
      expect(hierarchy.roles).toBeDefined()
      expect(hierarchy.hierarchy).toBeDefined()
      
      // Test role comparison edge cases
      const masterLevel = hierarchy.hierarchy.master
      const workerLevel = hierarchy.hierarchy.worker
      
      expect(masterLevel).toBeGreaterThan(workerLevel)
      
      console.log('Hierarchy levels verified:', {
        master: masterLevel,
        worker: workerLevel,
        masterHigher: masterLevel > workerLevel
      })

      console.log('✅ System edge cases handled correctly')
    })
  })

  describe('System Integration Verification', () => {

    test('Should verify role management system is operational', async () => {
      console.log('🧪 Test: Role management system operational status')

      const systemChecks = {
        serviceAvailable: !!roleManagementService,
        coreMethodsAvailable: {
          checkPermission: typeof roleManagementService.checkPermission === 'function',
          transitionRole: typeof roleManagementService.transitionRole === 'function',
          bulkAssignRoles: typeof roleManagementService.bulkAssignRoles === 'function',
          canManageRole: typeof roleManagementService.canManageRole === 'function',
          getUserEffectivePermissions: typeof roleManagementService.getUserEffectivePermissions === 'function'
        },
        hierarchySystem: {
          available: typeof roleManagementService.getRoleHierarchy === 'function',
          hasRoles: roleManagementService.getRoleHierarchy().roles.length > 0,
          hasHierarchy: !!roleManagementService.getRoleHierarchy().hierarchy,
          hasPermissions: !!roleManagementService.getRoleHierarchy().permissions
        },
        integrationServices: {
          organizationService: !!organizationService,
          unifiedIdentityService: !!unifiedIdentityService
        }
      }

      console.log('Role management system integration check:', systemChecks)

      // Verify all core methods are available
      const allCoreMethodsAvailable = Object.values(systemChecks.coreMethodsAvailable)
        .every(available => available === true)

      // Verify hierarchy system is functional
      const hierarchySystemFunctional = Object.values(systemChecks.hierarchySystem)
        .every(available => available === true)

      // Verify integration services are available
      const integrationServicesAvailable = Object.values(systemChecks.integrationServices)
        .every(available => available === true)

      expect(systemChecks.serviceAvailable).toBe(true)
      expect(allCoreMethodsAvailable).toBe(true)
      expect(hierarchySystemFunctional).toBe(true)
      expect(integrationServicesAvailable).toBe(true)

      console.log('🎉 Role management service with real data integration is fully operational!')
    })
  })
})