/**
 * 조직 목록 관리 훅
 * TDD Green Phase: 테스트를 통과시키는 최소 구현
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { organizationApi } from '@/api/organization.api';
import { 
  OrganizationListParams,
  OrganizationListResponse,
  OrganizationStats,
  OrganizationListFilters,
  OrganizationListSort,
  Organization
} from '@/types/organization.types';

const QUERY_KEYS = {
  organizationList: (params: OrganizationListParams) => ['organizations', 'list', params],
  organizationStats: () => ['organizations', 'stats']
} as const;

interface UseOrganizationListOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UseOrganizationListReturn {
  // Data
  organizations: Organization[];
  stats: OrganizationStats | null;
  pagination: PaginationInfo | null;
  
  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  
  // Error states
  isError: boolean;
  error: Error | null;
  statsError: Error | null;
  
  // Success states
  isSuccess: boolean;
  
  // Current state
  currentParams: OrganizationListParams;
  
  // Actions
  setParams: (params: OrganizationListParams) => void;
  updateFilters: (filters: Partial<OrganizationListFilters>) => void;
  updateSort: (sort: OrganizationListSort) => void;
  updatePagination: (page: number, pageSize?: number) => void;
  refresh: () => Promise<void>;
  invalidate: () => Promise<void>;
}

export function useOrganizationList(
  initialParams: OrganizationListParams = {},
  options: UseOrganizationListOptions = {}
): UseOrganizationListReturn {
  const queryClient = useQueryClient();
  const [params, setParamsState] = useState<OrganizationListParams>({
    page: 1,
    pageSize: 20,
    ...initialParams
  });

  // Memoize query key to prevent unnecessary re-renders
  const queryKey = useMemo(() => QUERY_KEYS.organizationList(params), [params]);

  // Organization list query
  const {
    data: listData,
    isLoading: isLoadingList,
    isFetching: isFetchingList,
    isRefetching: isRefetchingList,
    isError: isErrorList,
    error: errorList,
    isSuccess: isSuccessList,
    refetch: refetchList
  } = useQuery({
    queryKey,
    queryFn: () => organizationApi.getOrganizationList(params),
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    staleTime: options.staleTime || 1000 * 60 * 5, // 5 minutes default
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Organization stats query
  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: errorStats
  } = useQuery({
    queryKey: QUERY_KEYS.organizationStats(),
    queryFn: () => organizationApi.getOrganizationStats(),
    enabled: options.enabled !== false,
    staleTime: options.staleTime || 1000 * 60 * 5, // 5 minutes default
    retry: 2
  });

  // Debounced params update for search
  const [debouncedParams, setDebouncedParams] = useState(params);
  const debounceTimeoutRef = useState<NodeJS.Timeout | null>(null)[0];

  // Update params with debouncing for search
  const setParams = useCallback((newParams: OrganizationListParams) => {
    const hasSearchChange = newParams.filters?.search !== params.filters?.search;
    
    setParamsState(newParams);
    
    if (hasSearchChange && newParams.filters?.search) {
      // Debounce search updates
      if (debounceTimeoutRef) {
        clearTimeout(debounceTimeoutRef);
      }
      
      setTimeout(() => {
        setDebouncedParams(newParams);
      }, 300);
    } else {
      // Immediate update for non-search changes
      setDebouncedParams(newParams);
    }
  }, [params, debounceTimeoutRef]);

  // Update only filters
  const updateFilters = useCallback((filters: Partial<OrganizationListFilters>) => {
    setParams({
      ...params,
      page: 1, // Reset to first page when filtering
      filters: {
        ...params.filters,
        ...filters
      }
    });
  }, [params, setParams]);

  // Update only sort
  const updateSort = useCallback((sort: OrganizationListSort) => {
    setParams({
      ...params,
      sort
    });
  }, [params, setParams]);

  // Update pagination
  const updatePagination = useCallback((page: number, pageSize?: number) => {
    setParams({
      ...params,
      page,
      ...(pageSize && { pageSize })
    });
  }, [params, setParams]);

  // Refresh data
  const refresh = useCallback(async () => {
    await refetchList();
    await queryClient.refetchQueries({ 
      queryKey: QUERY_KEYS.organizationStats() 
    });
  }, [refetchList, queryClient]);

  // Invalidate cache
  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ['organizations'] 
    });
  }, [queryClient]);

  // Computed values
  const organizations = useMemo(() => listData?.organizations || [], [listData?.organizations]);
  const stats = useMemo(() => statsData || null, [statsData]);
  
  const pagination = useMemo<PaginationInfo | null>(() => {
    if (!listData) return null;
    
    return {
      total: listData.total,
      page: listData.page,
      pageSize: listData.pageSize,
      totalPages: listData.totalPages,
      hasNextPage: listData.hasNextPage,
      hasPreviousPage: listData.hasPreviousPage
    };
  }, [listData]);

  // Loading states
  const isLoading = isLoadingList || isLoadingStats;
  const isFetching = isFetchingList;
  const isRefetching = isRefetchingList;

  // Error states
  const isError = isErrorList;
  const error = errorList as Error | null;
  const statsError = errorStats as Error | null;

  // Success state
  const isSuccess = isSuccessList;

  // Memoize current params to prevent unnecessary re-renders
  const currentParams = useMemo(() => params, [params]);

  return {
    // Data
    organizations,
    stats,
    pagination,
    
    // Loading states
    isLoading,
    isFetching,
    isRefetching,
    
    // Error states
    isError,
    error,
    statsError,
    
    // Success state
    isSuccess,
    
    // Current state
    currentParams,
    
    // Actions
    setParams,
    updateFilters,
    updateSort,
    updatePagination,
    refresh,
    invalidate
  };
}