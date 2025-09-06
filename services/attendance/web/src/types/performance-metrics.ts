/**
 * API 성능 메트릭 시스템 타입 정의
 * Phase 3.3.3.2: API 호출 통계 및 성능 모니터링
 */

export interface ApiMetric {
  /** 요청 ID */
  requestId: string;
  /** HTTP 메서드 */
  method: string;
  /** API 엔드포인트 경로 */
  endpoint: string;
  /** HTTP 상태 코드 */
  statusCode: number;
  /** 응답 시간 (밀리초) */
  responseTime: number;
  /** 요청 시작 시간 */
  timestamp: Date;
  /** 요청 크기 (바이트) */
  requestSize?: number;
  /** 응답 크기 (바이트) */
  responseSize?: number;
  /** 클라이언트 IP */
  clientIp?: string;
  /** 사용자 ID */
  userId?: string;
  /** 조직 ID */
  organizationId?: string;
  /** 에러 메시지 (실패 시) */
  errorMessage?: string;
}

export interface ApiEndpointStats {
  /** 엔드포인트 */
  endpoint: string;
  /** HTTP 메서드 */
  method: string;
  /** 총 호출 횟수 */
  totalRequests: number;
  /** 성공 횟수 */
  successRequests: number;
  /** 실패 횟수 */
  failureRequests: number;
  /** 평균 응답시간 (밀리초) */
  avgResponseTime: number;
  /** 중간값 응답시간 (밀리초) */
  medianResponseTime: number;
  /** 95 백분위수 응답시간 (밀리초) */
  p95ResponseTime: number;
  /** 99 백분위수 응답시간 (밀리초) */
  p99ResponseTime: number;
  /** 최소 응답시간 (밀리초) */
  minResponseTime: number;
  /** 최대 응답시간 (밀리초) */
  maxResponseTime: number;
  /** 분당 요청 수 */
  requestsPerMinute: number;
  /** 성공률 (%) */
  successRate: number;
  /** 마지막 업데이트 시간 */
  lastUpdated: Date;
}

export interface TimeSeriesDataPoint {
  /** 시간 */
  timestamp: Date;
  /** 값 */
  value: number;
  /** 메타데이터 */
  metadata?: Record<string, any>;
}

export interface ApiPerformanceMetrics {
  /** 전체 통계 */
  overview: {
    /** 총 요청 수 */
    totalRequests: number;
    /** 활성 요청 수 */
    activeRequests: number;
    /** 초당 처리량 (RPS) */
    requestsPerSecond: number;
    /** 전체 평균 응답시간 */
    avgResponseTime: number;
    /** 전체 성공률 */
    successRate: number;
    /** 에러율 */
    errorRate: number;
  };
  /** 엔드포인트별 통계 */
  endpointStats: ApiEndpointStats[];
  /** 상태 코드 분포 */
  statusCodeDistribution: Record<string, number>;
  /** 시간 시리즈 데이터 */
  timeSeries: {
    /** 요청 수 추이 */
    requests: TimeSeriesDataPoint[];
    /** 응답시간 추이 */
    responseTime: TimeSeriesDataPoint[];
    /** 에러율 추이 */
    errorRate: TimeSeriesDataPoint[];
  };
  /** 최근 에러들 */
  recentErrors: ApiMetric[];
  /** 가장 느린 요청들 */
  slowestRequests: ApiMetric[];
}

export interface CircularBufferConfig {
  /** 최대 크기 */
  maxSize: number;
  /** 데이터 유지 시간 (밀리초) */
  retentionTime?: number;
  /** 자동 정리 활성화 */
  autoCleanup?: boolean;
  /** 정리 간격 (밀리초) */
  cleanupInterval?: number;
}

export interface PerformanceThresholds {
  /** 응답시간 임계값 (밀리초) */
  responseTimeThreshold: number;
  /** 에러율 임계값 (%) */
  errorRateThreshold: number;
  /** 최대 동시 요청 수 */
  maxConcurrentRequests: number;
  /** 초당 최대 요청 수 */
  maxRequestsPerSecond: number;
}

export interface AlertConfig {
  /** 알림 활성화 */
  enabled: boolean;
  /** 임계값 설정 */
  thresholds: PerformanceThresholds;
  /** 알림 채널들 */
  channels: ('websocket' | 'email' | 'slack')[];
  /** 최소 알림 간격 (밀리초) */
  minAlertInterval: number;
}

export interface PerformanceAlert {
  /** 알림 ID */
  id: string;
  /** 알림 유형 */
  type: 'high_response_time' | 'high_error_rate' | 'high_concurrency' | 'endpoint_down';
  /** 심각도 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 메시지 */
  message: string;
  /** 영향받는 엔드포인트 */
  endpoint?: string;
  /** 메트릭 값 */
  metricValue: number;
  /** 임계값 */
  threshold: number;
  /** 발생 시간 */
  timestamp: Date;
  /** 해결 시간 */
  resolvedAt?: Date;
  /** 상태 */
  status: 'active' | 'resolved' | 'suppressed';
}

export interface MetricsCollectorConfig {
  /** 메트릭 수집 활성화 */
  enabled: boolean;
  /** 샘플링 비율 (0-1) */
  samplingRate: number;
  /** 순환 버퍼 설정 */
  bufferConfig: CircularBufferConfig;
  /** 성능 임계값 */
  thresholds: PerformanceThresholds;
  /** 알림 설정 */
  alertConfig: AlertConfig;
  /** Redis 설정 */
  redisConfig?: {
    enabled: boolean;
    keyPrefix: string;
    ttl: number; // seconds
  };
}

export interface WebSocketMetricsEvent {
  type: 'metrics_update' | 'alert' | 'stats_updated';
  data: ApiPerformanceMetrics | PerformanceAlert | ApiEndpointStats;
  timestamp: Date;
}

export interface UseApiMetricsOptions {
  /** 자동 새로고침 활성화 */
  autoRefresh?: boolean;
  /** 새로고침 간격 (밀리초) */
  refreshInterval?: number;
  /** 실시간 업데이트 활성화 */
  realTime?: boolean;
  /** 필터링 옵션 */
  filters?: {
    endpoint?: string;
    method?: string;
    timeRange?: [Date, Date];
    statusCode?: number;
  };
}

export interface ApiMetricsState {
  /** 메트릭 데이터 */
  metrics: ApiPerformanceMetrics | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 상태 */
  error: string | null;
  /** WebSocket 연결 상태 */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** 마지막 업데이트 시간 */
  lastUpdated: Date | null;
  /** 활성 알림들 */
  activeAlerts: PerformanceAlert[];
}

export interface MetricsExportOptions {
  /** 내보내기 형식 */
  format: 'json' | 'csv' | 'xlsx';
  /** 시간 범위 */
  timeRange: [Date, Date];
  /** 포함할 메트릭 */
  metrics: ('requests' | 'responseTime' | 'errors' | 'endpoints')[];
  /** 압축 여부 */
  compress?: boolean;
}