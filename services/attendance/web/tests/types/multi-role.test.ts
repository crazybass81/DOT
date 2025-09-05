// Phase 1.3: 다중 역할 지원 타입 정의 테스트
// TDD: 타입과 유틸리티 함수 요구사항 정의

import { describe, test, expect } from '@jest/globals';

// 테스트할 타입들 import (아직 구현 안됨)
import {
  UserRole,
  RoleType,
  Contract,
  ContractType,
  ContractStatus,
  MultiRoleUser,
  RolePermissions
} from '@/types/multi-role';

// 테스트할 유틸리티 함수들 import (아직 구현 안됨)  
import {
  hasRole,
  getActiveRoles,
  getActiveContracts,
  canAccessOrganization,
  getRolePermissions,
  formatRoleDisplay
} from '@/utils/role-utils';

describe('다중 역할 지원 타입 정의', () => {
  
  test('RoleType enum이 올바른 값들을 가져야 함', () => {
    expect(RoleType.WORKER).toBe('WORKER');
    expect(RoleType.ADMIN).toBe('ADMIN');
    expect(RoleType.MANAGER).toBe('MANAGER');
    expect(RoleType.FRANCHISE).toBe('FRANCHISE');
  });

  test('ContractType enum이 올바른 값들을 가져야 함', () => {
    expect(ContractType.EMPLOYMENT).toBe('EMPLOYMENT');
    expect(ContractType.PART_TIME).toBe('PART_TIME');
    expect(ContractType.TEMPORARY).toBe('TEMPORARY');
    expect(ContractType.INTERNSHIP).toBe('INTERNSHIP');
    expect(ContractType.FREELANCE).toBe('FREELANCE');
  });

  test('UserRole 타입이 필수 필드들을 포함해야 함', () => {
    const userRole: UserRole = {
      id: 'role-id-123',
      employeeId: 'emp-id-123',
      organizationId: 'org-id-123',
      roleType: RoleType.WORKER,
      isActive: true,
      grantedAt: new Date(),
      organizationName: '테스트 조직'
    };

    expect(userRole.id).toBe('role-id-123');
    expect(userRole.roleType).toBe(RoleType.WORKER);
    expect(userRole.isActive).toBe(true);
  });

  test('Contract 타입이 필수 필드들을 포함해야 함', () => {
    const contract: Contract = {
      id: 'contract-id-123',
      employeeId: 'emp-id-123',
      organizationId: 'org-id-123',
      contractType: ContractType.EMPLOYMENT,
      startDate: new Date('2024-01-01'),
      status: ContractStatus.ACTIVE,
      wageAmount: 15000,
      wageType: 'HOURLY',
      organizationName: '테스트 조직'
    };

    expect(contract.contractType).toBe(ContractType.EMPLOYMENT);
    expect(contract.status).toBe(ContractStatus.ACTIVE);
    expect(contract.wageAmount).toBe(15000);
  });

  test('MultiRoleUser 타입이 여러 역할과 계약을 지원해야 함', () => {
    const multiRoleUser: MultiRoleUser = {
      id: 'user-id-123',
      email: 'test@example.com',
      name: '김철수',
      roles: [
        {
          id: 'role-1',
          employeeId: 'emp-1',
          organizationId: 'org-1',
          roleType: RoleType.WORKER,
          isActive: true,
          grantedAt: new Date(),
          organizationName: 'A카페'
        },
        {
          id: 'role-2',
          employeeId: 'emp-2',
          organizationId: 'org-2',
          roleType: RoleType.ADMIN,
          isActive: true,
          grantedAt: new Date(),
          organizationName: 'B법인'
        }
      ],
      contracts: [
        {
          id: 'contract-1',
          employeeId: 'emp-1',
          organizationId: 'org-1',
          contractType: ContractType.PART_TIME,
          startDate: new Date('2024-01-01'),
          status: ContractStatus.ACTIVE,
          wageAmount: 12000,
          wageType: 'HOURLY',
          organizationName: 'A카페'
        }
      ]
    };

    expect(multiRoleUser.roles).toHaveLength(2);
    expect(multiRoleUser.contracts).toHaveLength(1);
    expect(multiRoleUser.roles[0].roleType).toBe(RoleType.WORKER);
    expect(multiRoleUser.roles[1].roleType).toBe(RoleType.ADMIN);
  });

});

describe('역할 유틸리티 함수들', () => {

  const mockUser: MultiRoleUser = {
    id: 'user-123',
    email: 'test@example.com', 
    name: '테스트 사용자',
    roles: [
      {
        id: 'role-1',
        employeeId: 'emp-1',
        organizationId: 'org-1',
        roleType: RoleType.WORKER,
        isActive: true,
        grantedAt: new Date(),
        organizationName: 'A카페'
      },
      {
        id: 'role-2',
        employeeId: 'emp-2',
        organizationId: 'org-2',
        roleType: RoleType.ADMIN,
        isActive: true,
        grantedAt: new Date(),
        organizationName: 'B법인'
      }
    ],
    contracts: []
  };

  test('hasRole 함수가 사용자의 역할을 정확히 판단해야 함', () => {
    expect(hasRole(mockUser, RoleType.WORKER)).toBe(true);
    expect(hasRole(mockUser, RoleType.ADMIN)).toBe(true);
    expect(hasRole(mockUser, RoleType.MANAGER)).toBe(false);
    expect(hasRole(mockUser, RoleType.FRANCHISE)).toBe(false);
  });

  test('hasRole 함수가 조직별 역할을 정확히 판단해야 함', () => {
    expect(hasRole(mockUser, RoleType.WORKER, 'org-1')).toBe(true);
    expect(hasRole(mockUser, RoleType.ADMIN, 'org-2')).toBe(true);
    expect(hasRole(mockUser, RoleType.WORKER, 'org-2')).toBe(false);
    expect(hasRole(mockUser, RoleType.ADMIN, 'org-1')).toBe(false);
  });

  test('getActiveRoles 함수가 활성 역할만 반환해야 함', () => {
    const activeRoles = getActiveRoles(mockUser);
    expect(activeRoles).toHaveLength(2);
    expect(activeRoles.every(role => role.isActive)).toBe(true);
  });

  test('canAccessOrganization 함수가 조직 접근 권한을 정확히 판단해야 함', () => {
    expect(canAccessOrganization(mockUser, 'org-1')).toBe(true);
    expect(canAccessOrganization(mockUser, 'org-2')).toBe(true);
    expect(canAccessOrganization(mockUser, 'org-3')).toBe(false);
  });

  test('getRolePermissions 함수가 역할별 권한을 반환해야 함', () => {
    const workerPermissions = getRolePermissions(RoleType.WORKER);
    const adminPermissions = getRolePermissions(RoleType.ADMIN);

    expect(workerPermissions.canViewOwnAttendance).toBe(true);
    expect(workerPermissions.canManageEmployees).toBe(false);

    expect(adminPermissions.canViewOwnAttendance).toBe(true);
    expect(adminPermissions.canManageEmployees).toBe(true);
    expect(adminPermissions.canManageOrganization).toBe(true);
  });

  test('formatRoleDisplay 함수가 역할을 한국어로 표시해야 함', () => {
    expect(formatRoleDisplay(RoleType.WORKER)).toBe('근로자');
    expect(formatRoleDisplay(RoleType.ADMIN)).toBe('관리자');
    expect(formatRoleDisplay(RoleType.MANAGER)).toBe('매니저');
    expect(formatRoleDisplay(RoleType.FRANCHISE)).toBe('가맹본부');
  });

});