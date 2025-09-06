/**
 * 가상화 스크롤링 및 무한 로딩 훅
 * 대용량 데이터(1만+ 항목)를 효율적으로 렌더링하고 메모리 사용량 최적화
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

interface UseVirtualizationOptions {
  itemCount: number;
  itemSize: number;
  containerHeight: number;
  overscan?: number; // 뷰포트 밖에 미리 렌더링할 항목 수
  onLoadMore?: () => Promise<void>;
  loadMoreThreshold?: number; // 끝에서 몇 개 항목 전에 로드 시작
}

interface UseVirtualizationState {
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollElementProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLElement>) => void;
    ref: React.RefObject<HTMLElement>;
  };
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  performanceWarning?: string;
}

interface UseVirtualizationActions {
  loadNextPage: () => Promise<void>;
  retryLoad: () => Promise<void>;
  scrollToItem: (index: number) => void;
  scrollToTop: () => void;
}

type UseVirtualization = UseVirtualizationState & UseVirtualizationActions;

export function useVirtualization(options: UseVirtualizationOptions): UseVirtualization {
  const {
    itemCount,
    itemSize,
    containerHeight,
    overscan = 3,
    onLoadMore,
    loadMoreThreshold = 5,
  } = options;

  const [state, setState] = useState({
    scrollTop: 0,
    loading: false,
    error: null as string | null,
    hasNextPage: true,
    performanceWarning: undefined as string | undefined,
  });

  const scrollElementRef = useRef<HTMLElement>(null);
  const isLoadingMore = useRef(false);
  const lastLoadTime = useRef(Date.now());
  const performanceMonitor = useRef({
    renderCount: 0,
    lastRenderTime: Date.now(),
    averageRenderTime: 0,
  });

  // 메모리 사용량 모니터링
  const checkMemoryUsage = useCallback(() => {
    try {
      // @ts-ignore - performance.memory는 Chrome에서만 사용 가능
      if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
        // @ts-ignore
        const memory = window.performance.memory;
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const totalMB = memory.totalJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);

        // 메모리 사용량이 80% 이상이면 경고
        if (usedMB / limitMB > 0.8) {
          return '브라우저 메모리가 부족합니다. 페이지를 새로고침하거나 다른 탭을 닫아보세요.';
        }

        // 사용 중인 메모리가 1GB 이상이면 경고
        if (usedMB > 1024) {
          return '메모리 사용량이 높습니다. 필터를 사용해 데이터 양을 줄이는 것을 권장합니다.';
        }
      }
    } catch (error) {
      console.warn('메모리 사용량 체크 실패:', error);
    }
    return null;
  }, []);

  // 성능 모니터링
  const updatePerformanceMetrics = useCallback(() => {
    const now = Date.now();
    const renderTime = now - performanceMonitor.current.lastRenderTime;
    
    performanceMonitor.current.renderCount++;
    performanceMonitor.current.averageRenderTime = 
      (performanceMonitor.current.averageRenderTime + renderTime) / 2;
    performanceMonitor.current.lastRenderTime = now;

    // 렌더링 시간이 100ms 이상이면 성능 경고
    if (performanceMonitor.current.averageRenderTime > 100) {
      return '렌더링 성능이 저하되고 있습니다. 필터를 사용해 표시할 데이터를 줄이는 것을 권장합니다.';
    }

    return null;
  }, []);

  // 대용량 데이터 처리 검사
  const checkDataSize = useCallback(() => {
    if (itemCount > 10000) {
      if (itemCount > 50000) {
        return '서버가 과부하 상태입니다. 잠시 후 다시 시도하거나 검색 범위를 줄여주세요.';
      } else if (itemCount > 20000) {
        return '데이터 로딩 시간이 초과되었습니다. 네트워크 연결을 확인하거나 더 작은 범위로 검색해주세요.';
      } else {
        return '메모리 부족으로 데이터를 로드할 수 없습니다. 필터를 적용해 데이터 양을 줄여주세요.';
      }
    }
    return null;
  }, [itemCount]);

  // 가상 아이템 계산
  const virtualItems = useMemo(() => {
    updatePerformanceMetrics();

    if (itemCount === 0) return [];

    const containerStart = state.scrollTop;
    const containerEnd = containerStart + containerHeight;

    // 보이는 범위의 시작과 끝 인덱스 계산
    const startIndex = Math.max(0, Math.floor(containerStart / itemSize) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil(containerEnd / itemSize) + overscan
    );

    const items: VirtualItem[] = [];
    
    for (let index = startIndex; index <= endIndex; index++) {
      items.push({
        index,
        start: index * itemSize,
        size: itemSize,
      });
    }

    return items;
  }, [state.scrollTop, containerHeight, itemCount, itemSize, overscan, updatePerformanceMetrics]);

  // 전체 크기 계산
  const totalSize = useMemo(() => itemCount * itemSize, [itemCount, itemSize]);

  // 스크롤 핸들러
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    
    setState(prev => ({ ...prev, scrollTop }));

    // 무한 스크롤 체크
    if (onLoadMore && state.hasNextPage && !isLoadingMore.current) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      const scrollBottom = scrollTop + clientHeight;
      
      // 끝에서 loadMoreThreshold만큼 전에 도달하면 더 로드
      const threshold = scrollHeight - (loadMoreThreshold * itemSize);
      
      if (scrollBottom >= threshold) {
        loadNextPage();
      }
    }
  }, [onLoadMore, state.hasNextPage, itemSize, loadMoreThreshold]);

  // 다음 페이지 로드
  const loadNextPage = useCallback(async () => {
    if (!onLoadMore || isLoadingMore.current || !state.hasNextPage) {
      return;
    }

    // 중복 호출 방지 (디바운싱)
    const now = Date.now();
    if (now - lastLoadTime.current < 500) {
      return;
    }
    lastLoadTime.current = now;

    try {
      isLoadingMore.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));

      await onLoadMore();

      setState(prev => ({ ...prev, loading: false }));

    } catch (error) {
      console.error('다음 페이지 로드 오류:', error);
      
      let errorMessage = '추가 데이터를 불러오는데 실패했습니다.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    } finally {
      isLoadingMore.current = false;
    }
  }, [onLoadMore, state.hasNextPage]);

  // 재시도
  const retryLoad = useCallback(async () => {
    setState(prev => ({ ...prev, error: null }));
    await loadNextPage();
  }, [loadNextPage]);

  // 특정 인덱스로 스크롤
  const scrollToItem = useCallback((index: number) => {
    if (!scrollElementRef.current) return;
    
    const targetScrollTop = index * itemSize;
    scrollElementRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
  }, [itemSize]);

  // 맨 위로 스크롤
  const scrollToTop = useCallback(() => {
    if (!scrollElementRef.current) return;
    
    scrollElementRef.current.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  // 성능 및 메모리 체크
  useEffect(() => {
    const memoryWarning = checkMemoryUsage();
    const dataSizeWarning = checkDataSize();
    const performanceWarning = updatePerformanceMetrics();
    
    const warning = memoryWarning || dataSizeWarning || performanceWarning;
    
    if (warning) {
      setState(prev => ({
        ...prev,
        performanceWarning: warning,
      }));
    }
  }, [itemCount, checkMemoryUsage, checkDataSize, updatePerformanceMetrics]);

  // 스크롤 엘리먼트 속성
  const scrollElementProps = useMemo(() => ({
    style: {
      height: containerHeight,
      overflow: 'auto',
    } as React.CSSProperties,
    onScroll: handleScroll,
    ref: scrollElementRef,
  }), [containerHeight, handleScroll]);

  return {
    virtualItems,
    totalSize,
    scrollElementProps,
    loading: state.loading,
    error: state.error,
    hasNextPage: state.hasNextPage,
    performanceWarning: state.performanceWarning,
    loadNextPage,
    retryLoad,
    scrollToItem,
    scrollToTop,
  };
}