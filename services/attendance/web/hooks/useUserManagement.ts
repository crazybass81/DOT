/**
 * 사용자 관리 데이터 페칭 및 상태 관리 훅
 * MASTER_ADMIN 권한으로 사용자 목록을 조회하고 검색/필터링을 제공
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  email_verified: boolean;
  organizations: Array<{
    id: string;
    name: string;
    role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
    status: string;
    joined_at: string;
  }>;
}

interface UserFilters {
  role?: string;
  status?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
}

interface Pagination {
  page: number;
  limit: number;
}

interface SortOptions {
  sortBy: 'name' | 'created_at' | 'last_login' | 'email';
  sortOrder: 'asc' | 'desc';
}

interface UseUserManagementState {
  users: User[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  searchQuery: string;
  filters: UserFilters;
  pagination: Pagination;
  sorting: SortOptions;
  hasNextPage: boolean;
}

interface UseUserManagementActions {
  searchUsers: (query: string) => Promise<void>;
  setFilters: (filters: Partial<UserFilters>) => void;
  setSorting: (sorting: Partial<SortOptions>) => void;
  loadMore: () => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;
  changePage: (page: number) => Promise<void>;
}

type UseUserManagement = UseUserManagementState & UseUserManagementActions;

interface ApiResponse {
  success: boolean;
  users?: User[];
  totalCount?: number;
  page?: number;
  limit?: number;
  hasNextPage?: boolean;
  error?: string;
}

export function useUserManagement(initialFilters: UserFilters = {}): UseUserManagement {
  const [state, setState] = useState<UseUserManagementState>({
    users: [],
    loading: false,
    error: null,
    totalCount: 0,
    searchQuery: '',
    filters: initialFilters,
    pagination: { page: 1, limit: 20 },
    sorting: { sortBy: 'created_at', sortOrder: 'desc' },
    hasNextPage: false,
  });

  // 중복 요청 방지를 위한 ref
  const requestInProgress = useRef(false);
  const abortController = useRef<AbortController | null>(null);

  // API 호출 함수
  const fetchUsers = useCallback(async (options: {
    search?: string;
    filters?: UserFilters;
    pagination?: Pagination;
    sorting?: SortOptions;
    append?: boolean; // 기존 데이터에 추가할지 여부
  } = {}) => {
    // 중복 요청 방지
    if (requestInProgress.current) {
      return;
    }

    try {
      requestInProgress.current = true;

      // 이전 요청 취소
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      const {
        search = state.searchQuery,
        filters = state.filters,
        pagination = state.pagination,
        sorting = state.sorting,
        append = false
      } = options;

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(append ? {} : { users: [] }) // 새로운 검색이면 기존 데이터 초기화
      }));

      // URL 파라미터 구성
      const params = new URLSearchParams();
      
      if (search && search.trim()) {
        params.set('search', search.trim());
      }
      
      if (filters.role) params.set('role', filters.role);
      if (filters.status) params.set('status', filters.status);
      if (filters.organizationId) params.set('organizationId', filters.organizationId);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      
      params.set('sortBy', sorting.sortBy);
      params.set('sortOrder', sorting.sortOrder);
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());

      const response = await fetch(`/api/master-admin/users?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || '사용자 목록을 불러오는데 실패했습니다.');
      }

      setState(prev => ({
        ...prev,
        users: append ? [...prev.users, ...(data.users || [])] : (data.users || []),
        totalCount: data.totalCount || 0,
        hasNextPage: data.hasNextPage || false,
        loading: false,
        error: null,
        searchQuery: search,
        filters,
        pagination,
        sorting,
      }));

    } catch (error) {
      // 요청이 취소된 경우는 무시
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('사용자 목록 조회 오류:', error);
      
      let errorMessage = '사용자 목록을 불러오는데 실패했습니다.';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        } else if (error.message.includes('403')) {
          errorMessage = '접근 권한이 없습니다. MASTER_ADMIN 권한이 필요합니다.';
        } else if (error.message.includes('401')) {
          errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        users: prev.searchQuery !== state.searchQuery ? [] : prev.users, // 새로운 검색이면 초기화
      }));
    } finally {
      requestInProgress.current = false;
    }
  }, [state.searchQuery, state.filters, state.pagination, state.sorting]);

  // 검색 함수
  const searchUsers = useCallback(async (query: string) => {
    await fetchUsers({
      search: query,
      pagination: { ...state.pagination, page: 1 }, // 검색 시 첫 페이지로 reset
    });
  }, [fetchUsers, state.pagination]);

  // 필터 설정 함수
  const setFilters = useCallback((newFilters: Partial<UserFilters>) => {
    const updatedFilters = { ...state.filters, ...newFilters };
    fetchUsers({
      filters: updatedFilters,
      pagination: { ...state.pagination, page: 1 }, // 필터 변경 시 첫 페이지로 reset
    });
  }, [fetchUsers, state.filters, state.pagination]);

  // 정렬 설정 함수
  const setSorting = useCallback((newSorting: Partial<SortOptions>) => {
    const updatedSorting = { ...state.sorting, ...newSorting };
    fetchUsers({
      sorting: updatedSorting,
      pagination: { ...state.pagination, page: 1 }, // 정렬 변경 시 첫 페이지로 reset
    });
  }, [fetchUsers, state.sorting, state.pagination]);

  // 더 많은 데이터 로드 (무한 스크롤)
  const loadMore = useCallback(async () => {
    if (!state.hasNextPage || state.loading) {
      return;
    }

    await fetchUsers({
      pagination: { ...state.pagination, page: state.pagination.page + 1 },
      append: true,
    });
  }, [fetchUsers, state.hasNextPage, state.loading, state.pagination]);

  // 페이지 변경
  const changePage = useCallback(async (page: number) => {
    if (page < 1 || page === state.pagination.page || state.loading) {
      return;
    }

    await fetchUsers({
      pagination: { ...state.pagination, page },
    });
  }, [fetchUsers, state.pagination, state.loading]);

  // 초기화
  const reset = useCallback(() => {
    setState({
      users: [],
      loading: false,
      error: null,
      totalCount: 0,
      searchQuery: '',
      filters: initialFilters,
      pagination: { page: 1, limit: 20 },
      sorting: { sortBy: 'created_at', sortOrder: 'desc' },
      hasNextPage: false,
    });
  }, [initialFilters]);

  // 새로고침
  const refresh = useCallback(async () => {
    await fetchUsers({
      pagination: { ...state.pagination, page: 1 },
    });
  }, [fetchUsers, state.pagination]);

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    fetchUsers();
    
    // cleanup: 컴포넌트 언마운트 시 진행 중인 요청 취소
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    searchUsers,
    setFilters,
    setSorting,
    loadMore,
    reset,
    refresh,
    changePage,
  };
}