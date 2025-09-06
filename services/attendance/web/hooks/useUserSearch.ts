/**
 * 사용자 검색 및 필터링 전용 훅
 * 실시간 검색, 고급 필터링, 검색 히스토리 관리
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  organizations: Array<{
    id: string;
    name: string;
    role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
  }>;
}

interface SearchFilters {
  role?: string;
  status?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  lastLogin?: 'TODAY' | 'WEEK' | 'MONTH' | 'NEVER';
}

interface SearchState {
  searchResults: User[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  searchQuery: string;
  filters: SearchFilters;
  searchHistory: string[];
  suggestions: string[];
}

interface SearchActions {
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => Promise<void>;
  clearSearch: () => void;
  clearHistory: () => void;
}

type UseUserSearch = SearchState & SearchActions;

export function useUserSearch(): UseUserSearch {
  const [state, setState] = useState<SearchState>({
    searchResults: [],
    loading: false,
    error: null,
    totalCount: 0,
    searchQuery: '',
    filters: {},
    searchHistory: [],
    suggestions: [],
  });

  const abortController = useRef<AbortController | null>(null);
  
  // 검색어 디바운스 (300ms)
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  // 로컬 스토리지에서 검색 히스토리 로드
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('userSearchHistory');
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        setState(prev => ({
          ...prev,
          searchHistory: Array.isArray(history) ? history.slice(0, 10) : [], // 최대 10개
        }));
      }
    } catch (error) {
      console.error('검색 히스토리 로드 오류:', error);
    }
  }, []);

  // 검색 히스토리 저장
  const saveSearchHistory = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) return;

    try {
      setState(prev => {
        const newHistory = [
          query,
          ...prev.searchHistory.filter(item => item !== query)
        ].slice(0, 10); // 최대 10개 유지

        localStorage.setItem('userSearchHistory', JSON.stringify(newHistory));
        
        return {
          ...prev,
          searchHistory: newHistory,
        };
      });
    } catch (error) {
      console.error('검색 히스토리 저장 오류:', error);
    }
  }, []);

  // 검색 실행 함수
  const executeSearch = useCallback(async (searchQuery: string, filters: SearchFilters = {}) => {
    // 이전 요청 취소
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      // URL 파라미터 구성
      const params = new URLSearchParams();
      
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
        
        // 검색어가 있으면 히스토리에 저장
        if (searchQuery.trim().length >= 2) {
          saveSearchHistory(searchQuery.trim());
        }
      }
      
      // 필터 적용
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      // 페이지 크기를 크게 설정 (검색 결과는 일반적으로 한 번에 많이 보여줌)
      params.set('limit', '50');
      params.set('page', '1');

      const response = await fetch(`/api/master-admin/users?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: 검색에 실패했습니다.`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '사용자 검색 중 오류가 발생했습니다.');
      }

      setState(prev => ({
        ...prev,
        searchResults: data.users || [],
        totalCount: data.totalCount || 0,
        loading: false,
        error: null,
        searchQuery,
        filters,
      }));

      // 검색 제안 업데이트 (간단한 로직)
      updateSuggestions(searchQuery, data.users || []);

    } catch (error) {
      // 요청이 취소된 경우는 무시
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('사용자 검색 오류:', error);
      
      let errorMessage = '사용자 검색 중 오류가 발생했습니다.';
      
      if (error instanceof Error) {
        if (error.message.includes('네트워크') || error.message.includes('fetch')) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        } else if (error.message.includes('403')) {
          errorMessage = '검색 권한이 없습니다.';
        } else if (error.message.includes('400')) {
          if (error.message.includes('날짜')) {
            errorMessage = '날짜 형식을 확인해주세요.';
          } else if (error.message.includes('role') || error.message.includes('역할')) {
            errorMessage = '역할 필터를 하나만 선택해주세요.';
          } else {
            errorMessage = '검색 조건을 확인해주세요.';
          }
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        searchResults: [],
        totalCount: 0,
      }));
    }
  }, [saveSearchHistory]);

  // 검색 제안 업데이트
  const updateSuggestions = useCallback((query: string, results: User[]) => {
    if (!query.trim() || results.length === 0) return;

    try {
      const suggestions = new Set<string>();
      
      results.forEach(user => {
        // 이메일 도메인 추출
        const emailDomain = user.email.split('@')[1];
        if (emailDomain) {
          suggestions.add(`@${emailDomain}`);
        }
        
        // 조직명 추출
        user.organizations.forEach(org => {
          if (org.name && org.name.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(org.name);
          }
        });
      });

      setState(prev => ({
        ...prev,
        suggestions: Array.from(suggestions).slice(0, 5), // 최대 5개
      }));
    } catch (error) {
      console.error('검색 제안 업데이트 오류:', error);
    }
  }, []);

  // 디바운스된 검색어가 변경되면 자동 검색
  useEffect(() => {
    executeSearch(debouncedSearchQuery, state.filters);
  }, [debouncedSearchQuery]); // state.filters는 의도적으로 제외 (별도 함수로 처리)

  // 검색어 설정
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      error: null, // 검색어 변경 시 에러 초기화
    }));
  }, []);

  // 필터 설정 (자동 검색 안 함)
  const setFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      error: null,
    }));
  }, []);

  // 필터 초기화
  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {},
      error: null,
    }));
  }, []);

  // 필터 적용 (수동 실행)
  const applyFilters = useCallback(async () => {
    await executeSearch(state.searchQuery, state.filters);
  }, [executeSearch, state.searchQuery, state.filters]);

  // 검색 초기화
  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchQuery: '',
      searchResults: [],
      totalCount: 0,
      error: null,
      suggestions: [],
    }));
  }, []);

  // 검색 히스토리 초기화
  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem('userSearchHistory');
      setState(prev => ({
        ...prev,
        searchHistory: [],
      }));
    } catch (error) {
      console.error('검색 히스토리 삭제 오류:', error);
    }
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    setSearchQuery,
    setFilters,
    clearFilters,
    applyFilters,
    clearSearch,
    clearHistory,
  };
}

// 디바운스 훅 (별도 파일로 분리하는 것이 좋지만 여기서 간단히 정의)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}