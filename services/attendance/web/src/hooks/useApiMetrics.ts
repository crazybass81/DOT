/**
 * useApiMetrics Hook Implementation
 * React 훅 - API 메트릭 데이터 관리 및 실시간 업데이트
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ApiPerformanceMetrics,
  ApiMetricsState,
  UseApiMetricsOptions,
  PerformanceAlert,
  WebSocketMetricsEvent,
} from '../types/performance-metrics';

const DEFAULT_OPTIONS: Required<UseApiMetricsOptions> = {
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds
  realTime: false,
  filters: {},
};

export function useApiMetrics(options: UseApiMetricsOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<ApiMetricsState>({
    metrics: null,
    isLoading: true,
    error: null,
    connectionStatus: 'connecting',
    lastUpdated: null,
    activeAlerts: [],
  });

  const socketRef = useRef<Socket | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const refreshCountRef = useRef(0);

  /**
   * API에서 메트릭 데이터 가져오기
   */
  const fetchMetrics = useCallback(async (): Promise<void> => {
    try {
      const url = new URL('/api/metrics', window.location.origin);
      
      // 필터 적용
      if (opts.filters.endpoint) {
        url.searchParams.set('endpoint', opts.filters.endpoint);
      }
      if (opts.filters.method) {
        url.searchParams.set('method', opts.filters.method);
      }
      if (opts.filters.statusCode) {
        url.searchParams.set('statusCode', opts.filters.statusCode.toString());
      }
      if (opts.filters.timeRange) {
        url.searchParams.set('startTime', opts.filters.timeRange[0].toISOString());
        url.searchParams.set('endTime', opts.filters.timeRange[1].toISOString());
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (isUnmountedRef.current) return;

      setState(prevState => ({
        ...prevState,
        metrics: data.metrics,
        activeAlerts: data.alerts || [],
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      if (isUnmountedRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prevState => ({
        ...prevState,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [opts.filters]);

  /**
   * 수동 새로고침
   */
  const refresh = useCallback(async (): Promise<void> => {
    setState(prevState => ({ ...prevState, isLoading: true, error: null }));
    await fetchMetrics();
  }, [fetchMetrics]);

  /**
   * WebSocket 연결 설정
   */
  const setupWebSocket = useCallback(() => {
    if (!opts.realTime) return;

    try {
      const socket = io('/metrics', {
        autoConnect: true,
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        if (isUnmountedRef.current) return;
        setState(prevState => ({ ...prevState, connectionStatus: 'connected' }));
      });

      socket.on('disconnect', () => {
        if (isUnmountedRef.current) return;
        setState(prevState => ({ ...prevState, connectionStatus: 'disconnected' }));
      });

      socket.on('connect_error', () => {
        if (isUnmountedRef.current) return;
        setState(prevState => ({ ...prevState, connectionStatus: 'error' }));
      });

      socket.on('metrics_update', (event: WebSocketMetricsEvent) => {
        if (isUnmountedRef.current) return;
        
        // 디바운스 처리
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        
        debounceTimeoutRef.current = setTimeout(() => {
          if (!isValidMetricsData(event.data)) return;
          
          setState(prevState => ({
            ...prevState,
            metrics: event.data as ApiPerformanceMetrics,
            lastUpdated: new Date(),
          }));
        }, 100);
      });

      socket.on('alert', (event: WebSocketMetricsEvent) => {
        if (isUnmountedRef.current) return;
        
        const alert = event.data as PerformanceAlert;
        if (!isValidAlertData(alert)) return;

        setState(prevState => {
          const alerts = [...prevState.activeAlerts];
          const existingIndex = alerts.findIndex(a => a.id === alert.id);
          
          if (existingIndex >= 0) {
            alerts[existingIndex] = alert;
          } else {
            alerts.push(alert);
          }
          
          // 최대 10개로 제한
          if (alerts.length > 10) {
            alerts.splice(0, alerts.length - 10);
          }
          
          return {
            ...prevState,
            activeAlerts: alerts,
          };
        });
      });

    } catch (error) {
      console.error('WebSocket setup failed:', error);
      setState(prevState => ({ ...prevState, connectionStatus: 'error' }));
    }
  }, [opts.realTime]);

  /**
   * WebSocket 연결 해제
   */
  const cleanupWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.off('connect');
      socketRef.current.off('disconnect');
      socketRef.current.off('connect_error');
      socketRef.current.off('metrics_update');
      socketRef.current.off('alert');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  /**
   * 자동 새로고침 설정
   */
  const setupAutoRefresh = useCallback(() => {
    if (!opts.autoRefresh) return;

    refreshIntervalRef.current = setInterval(() => {
      if (!isUnmountedRef.current) {
        fetchMetrics();
      }
    }, opts.refreshInterval);
  }, [opts.autoRefresh, opts.refreshInterval, fetchMetrics]);

  /**
   * 자동 새로고침 정리
   */
  const cleanupAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // 메트릭 데이터 메모이제이션
  const memoizedMetrics = useMemo(() => {
    return state.metrics;
  }, [state.metrics]);

  // 초기 설정 및 데이터 로드
  useEffect(() => {
    isUnmountedRef.current = false;
    fetchMetrics();
    setupWebSocket();
    setupAutoRefresh();

    return () => {
      isUnmountedRef.current = true;
      cleanupWebSocket();
      cleanupAutoRefresh();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [fetchMetrics, setupWebSocket, setupAutoRefresh, cleanupWebSocket, cleanupAutoRefresh]);

  // 필터 변경 시 데이터 재로드
  useEffect(() => {
    if (refreshCountRef.current > 0) {
      fetchMetrics();
    }
    refreshCountRef.current++;
  }, [opts.filters, fetchMetrics]);

  return {
    metrics: memoizedMetrics,
    isLoading: state.isLoading,
    error: state.error,
    connectionStatus: state.connectionStatus,
    lastUpdated: state.lastUpdated,
    activeAlerts: state.activeAlerts,
    refresh,
  };
}

/**
 * 메트릭 데이터 유효성 검사
 */
function isValidMetricsData(data: any): data is ApiPerformanceMetrics {
  return (
    data &&
    typeof data === 'object' &&
    data.overview &&
    Array.isArray(data.endpointStats) &&
    data.timeSeries &&
    Array.isArray(data.timeSeries.requests)
  );
}

/**
 * 알림 데이터 유효성 검사
 */
function isValidAlertData(data: any): data is PerformanceAlert {
  return (
    data &&
    typeof data === 'object' &&
    data.id &&
    data.type &&
    data.severity &&
    data.message &&
    typeof data.metricValue === 'number' &&
    typeof data.threshold === 'number'
  );
}