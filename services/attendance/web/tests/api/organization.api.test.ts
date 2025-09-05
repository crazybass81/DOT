/**
 * TDD Phase 3.3.1.1: 조직 API 테스트
 * 🟢 GREEN: 테스트 통과를 위한 수정
 */

import { jest } from '@jest/globals';
import { organizationApi } from '@/api/organization.api';
import { OrganizationType, OrganizationStatus, OrganizationListParams } from '@/types/organization.types';

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('Organization API - TDD Green Phase', () => {
  const mockFetch = global.fetch as jest.Mock;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('🟢 getOrganizationList API 테스트', () => {
    const mockResponse = {
      organizations: [
        {
          id: 'org-1',
          name: '테스트 회사 A',
          type: 'CORP',
          businessRegistrationNumber: '123-45-67890',
          status: 'ACTIVE',
          employeeCount: 25,
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z'
        }
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false
    };

    test('기본 파라미터로 조직 목록을 조회할 수 있어야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await organizationApi.getOrganizationList();

      expect(mockFetch).toHaveBeenCalledWith('/api/organizations', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        }
      });

      expect(result).toEqual({
        ...mockResponse,
        organizations: [{
          ...mockResponse.organizations[0],
          createdAt: new Date('2024-01-15T00:00:00Z'),
          updatedAt: new Date('2024-01-15T00:00:00Z')
        }]
      });
    });

    test('검색 필터가 쿼리 스트링에 포함되어야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const params: OrganizationListParams = {
        filters: {
          search: '테스트',
          status: [OrganizationStatus.ACTIVE],
          type: [OrganizationType.CORP]
        }
      };

      await organizationApi.getOrganizationList(params);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('search=%ED%85%8C%EC%8A%A4%ED%8A%B8'); // URL encoded '테스트'
      expect(callUrl).toContain('status=ACTIVE');
      expect(callUrl).toContain('type=CORP');
    });

    test('정렬 파라미터가 쿼리 스트링에 포함되어야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const params: OrganizationListParams = {
        sort: {
          field: 'name',
          direction: 'asc'
        }
      };

      await organizationApi.getOrganizationList(params);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('sortField=name');
      expect(callUrl).toContain('sortDirection=asc');
    });

    test('페이지네이션 파라미터가 쿼리 스트링에 포함되어야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const params: OrganizationListParams = {
        page: 2,
        pageSize: 50
      };

      await organizationApi.getOrganizationList(params);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('pageSize=50');
    });

    test('직원수 범위 필터가 쿼리 스트링에 포함되어야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const params: OrganizationListParams = {
        filters: {
          employeeCountRange: {
            min: 10,
            max: 100
          }
        }
      };

      await organizationApi.getOrganizationList(params);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('employeeMin=10');
      expect(callUrl).toContain('employeeMax=100');
    });

    test('날짜 범위 필터가 쿼리 스트링에 포함되어야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const params: OrganizationListParams = {
        filters: {
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31')
          }
        }
      };

      await organizationApi.getOrganizationList(params);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('startDate=2024-01-01');
      expect(callUrl).toContain('endDate=2024-12-31');
    });

    test('API 오류시 적절한 에러가 발생해야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Insufficient permissions' })
      });

      await expect(organizationApi.getOrganizationList()).rejects.toThrow('Insufficient permissions');
    });

    test('네트워크 오류시 적절한 에러가 발생해야 함', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(organizationApi.getOrganizationList()).rejects.toThrow('Network error');
    });
  });

  describe('🟢 getOrganizationStats API 테스트', () => {
    const mockStatsResponse = {
      totalOrganizations: 150,
      activeOrganizations: 120,
      inactiveOrganizations: 25,
      pendingOrganizations: 5,
      totalEmployees: 2500,
      organizationsByType: {
        CORP: 80,
        PERSONAL: 60,
        FRANCHISE: 10
      },
      recentCreations: 12
    };

    test('조직 통계를 조회할 수 있어야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsResponse
      });

      const result = await organizationApi.getOrganizationStats();

      expect(mockFetch).toHaveBeenCalledWith('/api/organizations/stats', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        }
      });

      expect(result).toEqual(mockStatsResponse);
    });

    test('통계 API 오류시 적절한 에러가 발생해야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Internal server error' })
      });

      await expect(organizationApi.getOrganizationStats()).rejects.toThrow('Internal server error');
    });
  });

  describe('🟢 인증 토큰 테스트', () => {
    test('인증 토큰이 헤더에 포함되어야 함', async () => {
      // localStorage mock을 설정하여 실제 토큰 검증 테스트
      const originalWindow = global.window;
      global.window = {
        localStorage: {
          getItem: jest.fn(() => 'real-jwt-token')
        }
      } as any;

      // NODE_ENV를 테스트가 아닌 것으로 설정
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: [] })
      });

      await organizationApi.getOrganizationList();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer real-jwt-token'
          })
        })
      );

      // 원래 값 복원
      global.window = originalWindow;
      process.env.NODE_ENV = originalEnv;
    });

    test('인증 토큰이 없을 때 에러가 발생해야 함', async () => {
      // localStorage mock을 빈 상태로 설정
      const originalWindow = global.window;
      global.window = {
        localStorage: {
          getItem: jest.fn(() => null)
        },
        sessionStorage: {
          getItem: jest.fn(() => null)
        }
      } as any;

      // NODE_ENV를 테스트가 아닌 것으로 설정
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await expect(organizationApi.getOrganizationList()).rejects.toThrow('Authentication token not found');

      // 원래 값 복원
      global.window = originalWindow;
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('🟢 쿼리 스트링 생성 테스트', () => {
    test('복합 필터 조건이 올바르게 쿼리 스트링으로 변환되어야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: [] })
      });

      const params: OrganizationListParams = {
        page: 2,
        pageSize: 25,
        filters: {
          search: '삼성전자',
          status: [OrganizationStatus.ACTIVE, OrganizationStatus.PENDING],
          type: [OrganizationType.CORP],
          employeeCountRange: { min: 50, max: 200 },
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-06-30')
          }
        },
        sort: {
          field: 'employeeCount',
          direction: 'desc'
        }
      };

      await organizationApi.getOrganizationList(params);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('pageSize=25');
      expect(callUrl).toContain('search=%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90'); // URL encoded
      expect(callUrl).toContain('status=ACTIVE');
      expect(callUrl).toContain('status=PENDING');
      expect(callUrl).toContain('type=CORP');
      expect(callUrl).toContain('employeeMin=50');
      expect(callUrl).toContain('employeeMax=200');
      expect(callUrl).toContain('startDate=2024-01-01');
      expect(callUrl).toContain('endDate=2024-06-30');
      expect(callUrl).toContain('sortField=employeeCount');
      expect(callUrl).toContain('sortDirection=desc');
    });

    test('빈 필터는 쿼리 스트링에 포함되지 않아야 함', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: [] })
      });

      const params: OrganizationListParams = {
        filters: {
          search: '',
          status: [],
          type: []
        }
      };

      await organizationApi.getOrganizationList(params);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      
      expect(callUrl).not.toContain('search=');
      expect(callUrl).not.toContain('status=');
      expect(callUrl).not.toContain('type=');
    });
  });
});