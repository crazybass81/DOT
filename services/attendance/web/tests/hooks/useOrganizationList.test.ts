/**
 * TDD Phase 3.3.1.1: useOrganizationList 훅 테스트
 * 🔴 RED: 데이터 페칭 훅 실패 테스트 먼저 작성
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';
import { useOrganizationList } from '@/hooks/useOrganizationList';
import { OrganizationType, OrganizationStatus, OrganizationListParams } from '@/types/organization.types';
import React from 'react';

// Mock API
jest.mock('@/api/organization.api', () => ({
  organizationApi: {
    getOrganizationList: jest.fn(),
    getOrganizationStats: jest.fn()
  }
}));

// Test data
const mockOrganizationListResponse = {
  organizations: [
    {
      id: 'org-1',
      name: '테스트 회사 A',
      type: OrganizationType.CORP,
      businessRegistrationNumber: '123-45-67890',
      status: OrganizationStatus.ACTIVE,
      employeeCount: 25,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: 'org-2',
      name: '테스트 개인사업자',
      type: OrganizationType.PERSONAL,
      status: OrganizationStatus.INACTIVE,
      employeeCount: 3,
      createdAt: new Date('2024-02-20'),
      updatedAt: new Date('2024-02-20')
    }
  ],
  total: 2,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

const mockStatsResponse = {
  totalOrganizations: 2,
  activeOrganizations: 1,
  inactiveOrganizations: 1,
  pendingOrganizations: 0,
  totalEmployees: 28,
  organizationsByType: {
    [OrganizationType.CORP]: 1,
    [OrganizationType.PERSONAL]: 1,
    [OrganizationType.FRANCHISE]: 0
  },
  recentCreations: 2
};

// Helper function to create test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useOrganizationList Hook - TDD Red Phase', () => {
  let mockGetOrganizationList: jest.Mock;
  let mockGetOrganizationStats: jest.Mock;

  beforeEach(() => {
    const { organizationApi } = require('@/api/organization.api');
    mockGetOrganizationList = organizationApi.getOrganizationList as jest.Mock;
    mockGetOrganizationStats = organizationApi.getOrganizationStats as jest.Mock;
    
    mockGetOrganizationList.mockResolvedValue(mockOrganizationListResponse);
    mockGetOrganizationStats.mockResolvedValue(mockStatsResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🔴 기본 데이터 페칭 테스트', () => {
    test('조직 목록과 통계를 동시에 페칭해야 함', async () => {
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      // 초기 로딩 상태 확인
      expect(result.current.isLoading).toBe(true);
      expect(result.current.organizations).toEqual([]);
      expect(result.current.stats).toBeNull();

      // 데이터 로딩 완료 대기
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // API 호출 확인
      expect(mockGetOrganizationList).toHaveBeenCalledWith({});
      expect(mockGetOrganizationStats).toHaveBeenCalledWith();

      // 데이터 확인
      expect(result.current.organizations).toEqual(mockOrganizationListResponse.organizations);
      expect(result.current.stats).toEqual(mockStatsResponse);
      expect(result.current.pagination).toEqual({
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    test('초기 파라미터로 데이터를 페칭해야 함', async () => {
      const wrapper = createWrapper();
      const initialParams: OrganizationListParams = {
        page: 1,
        pageSize: 50,
        filters: {
          status: [OrganizationStatus.ACTIVE]
        }
      };
      
      const { result } = renderHook(
        () => useOrganizationList(initialParams),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetOrganizationList).toHaveBeenCalledWith(initialParams);
    });
  });

  describe('🔴 파라미터 업데이트 테스트', () => {
    test('setParams 호출시 새로운 데이터를 페칭해야 함', async () => {
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 파라미터 업데이트
      const newParams: OrganizationListParams = {
        filters: {
          search: '삼성'
        }
      };

      result.current.setParams(newParams);

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(newParams);
      });
    });

    test('updateFilters 호출시 필터만 업데이트되어야 함', async () => {
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList({
          page: 2,
          pageSize: 30
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 필터 업데이트
      result.current.updateFilters({
        search: 'LG',
        status: [OrganizationStatus.ACTIVE]
      });

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith({
          page: 2,
          pageSize: 30,
          filters: {
            search: 'LG',
            status: [OrganizationStatus.ACTIVE]
          }
        });
      });
    });

    test('updateSort 호출시 정렬만 업데이트되어야 함', async () => {
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 정렬 업데이트
      result.current.updateSort({
        field: 'name',
        direction: 'asc'
      });

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith({
          sort: {
            field: 'name',
            direction: 'asc'
          }
        });
      });
    });

    test('updatePagination 호출시 페이지네이션만 업데이트되어야 함', async () => {
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 페이지네이션 업데이트
      result.current.updatePagination(2, 50);

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith({
          page: 2,
          pageSize: 50
        });
      });
    });
  });

  describe('🔴 에러 처리 테스트', () => {
    test('조직 목록 조회 실패시 에러 상태를 반환해야 함', async () => {
      const error = new Error('조직 목록 조회 실패');
      mockGetOrganizationList.mockRejectedValue(error);

      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual(error);
      expect(result.current.organizations).toEqual([]);
    });

    test('통계 조회 실패시에도 조직 목록은 정상 표시되어야 함', async () => {
      mockGetOrganizationStats.mockRejectedValue(new Error('통계 조회 실패'));

      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 조직 목록은 정상 로딩
      expect(result.current.organizations).toEqual(mockOrganizationListResponse.organizations);
      
      // 통계는 에러 상태
      expect(result.current.statsError).toBeDefined();
      expect(result.current.stats).toBeNull();
    });

    test('네트워크 오류시 재시도 로직이 작동해야 함', async () => {
      let callCount = 0;
      mockGetOrganizationList.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockOrganizationListResponse);
      });

      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      // 재시도 후 성공
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(callCount).toBe(3);
      expect(result.current.organizations).toEqual(mockOrganizationListResponse.organizations);
    });
  });

  describe('🔴 캐싱 및 무효화 테스트', () => {
    test('동일한 파라미터로 호출시 캐시된 데이터를 사용해야 함', async () => {
      const wrapper = createWrapper();
      
      const { result: result1 } = renderHook(
        () => useOrganizationList({ page: 1 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      const { result: result2 } = renderHook(
        () => useOrganizationList({ page: 1 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      // API는 한 번만 호출되어야 함
      expect(mockGetOrganizationList).toHaveBeenCalledTimes(1);
      
      // 두 훅 모두 동일한 데이터를 가져야 함
      expect(result1.current.organizations).toEqual(result2.current.organizations);
    });

    test('refresh 호출시 캐시를 무시하고 새로운 데이터를 페칭해야 함', async () => {
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetOrganizationList).toHaveBeenCalledTimes(1);

      // refresh 호출
      result.current.refresh();

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledTimes(2);
      });
    });

    test('invalidate 호출시 관련 쿼리가 무효화되어야 함', async () => {
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // invalidate 호출
      result.current.invalidate();

      await waitFor(() => {
        // 재페칭이 발생해야 함
        expect(mockGetOrganizationList).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('🔴 성능 최적화 테스트', () => {
    test('디바운싱이 적용된 검색이 작동해야 함', async () => {
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 빠른 연속 업데이트
      result.current.updateFilters({ search: 'a' });
      result.current.updateFilters({ search: 'ab' });
      result.current.updateFilters({ search: 'abc' });

      // 디바운스 지연 후 한 번만 호출되어야 함
      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith({
          filters: { search: 'abc' }
        });
      }, { timeout: 1000 });

      // 마지막 호출만 실행되어야 함
      expect(mockGetOrganizationList).toHaveBeenCalledTimes(2); // 초기 + 디바운스된 호출
    });

    test('메모이제이션이 적용된 필터 객체를 반환해야 함', async () => {
      const wrapper = createWrapper();
      
      const { result, rerender } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstFilters = result.current.currentParams.filters;

      // 리렌더링
      rerender();

      const secondFilters = result.current.currentParams.filters;

      // 동일한 객체 참조여야 함 (메모이제이션)
      expect(firstFilters).toBe(secondFilters);
    });
  });

  describe('🔴 상태 관리 테스트', () => {
    test('로딩 상태가 정확히 관리되어야 함', async () => {
      mockGetOrganizationList.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(mockOrganizationListResponse), 100)
        )
      );

      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      // 초기 로딩 상태
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);

      // 로딩 완료 후
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFetching).toBe(false);
      });
    });

    test('에러 상태가 정확히 관리되어야 함', async () => {
      const error = new Error('API Error');
      mockGetOrganizationList.mockRejectedValue(error);

      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });

    test('성공 상태가 정확히 관리되어야 함', async () => {
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useOrganizationList(),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });
  });
});