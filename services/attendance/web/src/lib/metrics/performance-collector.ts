/**
 * Performance Collector Implementation
 * API 성능 메트릭 수집 및 분석 엔진
 */

import { CircularBuffer } from './circular-buffer';
import { webSocketServer } from '../websocket-server';
import {
  ApiMetric,
  ApiPerformanceMetrics,
  ApiEndpointStats,
  MetricsCollectorConfig,
  PerformanceAlert,
  TimeSeriesDataPoint,
  WebSocketMetricsEvent,
} from '../../types/performance-metrics';

export class PerformanceCollector {
  private buffer: CircularBuffer<ApiMetric>;
  private config: MetricsCollectorConfig;
  private isRunning: boolean = false;
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private lastAlertTimes: Map<string, Date> = new Map();
  private batchingEnabled: boolean = false;
  private batchInterval?: NodeJS.Timeout;
  private pendingUpdates: boolean = false;

  constructor(config: MetricsCollectorConfig) {
    this.config = config;
    this.buffer = new CircularBuffer<ApiMetric>(config.bufferConfig);
  }

  /**
   * 수집기 시작
   */
  start(): void {
    this.isRunning = true;
  }

  /**
   * 수집기 중지
   */
  stop(): void {
    this.isRunning = false;
    this.buffer.destroy();
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
  }

  /**
   * 수집기 활성화 상태 확인
   */
  isEnabled(): boolean {
    return this.config.enabled && this.isRunning;
  }

  /**
   * 설정 반환
   */
  getConfig(): MetricsCollectorConfig {
    return { ...this.config };
  }

  /**
   * API 메트릭 수집
   */
  collectMetric(metric: ApiMetric): void {
    if (!this.isEnabled()) {
      return;
    }

    // 유효성 검사
    if (!this.isValidMetric(metric)) {
      return;
    }

    // 샘플링 적용
    if (!this.shouldSample()) {
      return;
    }

    try {
      this.buffer.add(metric);
      
      // 실시간 업데이트 전송 (배치 처리 고려)
      if (this.batchingEnabled) {
        this.pendingUpdates = true;
      } else {
        this.sendRealtimeUpdate();
      }

      // 임계값 체크
      this.checkThresholds().catch(error => {
        console.error('Threshold check failed:', error);
      });
    } catch (error) {
      console.error('Failed to collect metric:', error);
    }
  }

  /**
   * 현재 성능 메트릭 반환
   */
  getMetrics(): ApiPerformanceMetrics {
    const allMetrics = this.buffer.getAll();
    
    if (allMetrics.length === 0) {
      return this.getEmptyMetrics();
    }

    return {
      overview: this.calculateOverviewMetrics(allMetrics),
      endpointStats: this.calculateEndpointStats(allMetrics),
      statusCodeDistribution: this.calculateStatusCodeDistribution(allMetrics),
      timeSeries: this.calculateTimeSeries(allMetrics),
      recentErrors: this.getRecentErrors(allMetrics),
      slowestRequests: this.getSlowestRequests(allMetrics),
    };
  }

  /**
   * 활성 알림 목록 반환
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => alert.status === 'active')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 임계값 체크
   */
  async checkThresholds(): Promise<void> {
    if (!this.config.alertConfig.enabled) {
      return;
    }

    const metrics = this.getMetrics();
    const thresholds = this.config.thresholds;

    // 응답시간 임계값 체크
    if (metrics.overview.avgResponseTime > thresholds.responseTimeThreshold) {
      await this.createAlert({
        type: 'high_response_time',
        severity: metrics.overview.avgResponseTime > thresholds.responseTimeThreshold * 2 ? 'high' : 'medium',
        message: `Average response time exceeded ${thresholds.responseTimeThreshold}ms`,
        metricValue: metrics.overview.avgResponseTime,
        threshold: thresholds.responseTimeThreshold,
      });
    }

    // 에러율 임계값 체크
    if (metrics.overview.errorRate > thresholds.errorRateThreshold) {
      await this.createAlert({
        type: 'high_error_rate',
        severity: metrics.overview.errorRate > thresholds.errorRateThreshold * 2 ? 'high' : 'medium',
        message: `Error rate exceeded ${(thresholds.errorRateThreshold * 100).toFixed(1)}%`,
        metricValue: metrics.overview.errorRate,
        threshold: thresholds.errorRateThreshold,
      });
    }

    // 각 엔드포인트별 체크
    metrics.endpointStats.forEach(stat => {
      if (stat.avgResponseTime > thresholds.responseTimeThreshold) {
        this.createAlert({
          type: 'high_response_time',
          severity: 'medium',
          message: `${stat.endpoint} response time exceeded threshold`,
          endpoint: stat.endpoint,
          metricValue: stat.avgResponseTime,
          threshold: thresholds.responseTimeThreshold,
        });
      }
    });
  }

  /**
   * 배치 처리 활성화/비활성화
   */
  setBatchingEnabled(enabled: boolean, intervalMs: number = 1000): void {
    this.batchingEnabled = enabled;
    
    if (enabled && !this.batchInterval) {
      this.batchInterval = setInterval(() => {
        if (this.pendingUpdates) {
          this.sendRealtimeUpdate();
          this.pendingUpdates = false;
        }
      }, intervalMs);
    } else if (!enabled && this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = undefined;
    }
  }

  /**
   * 메트릭 유효성 검사
   */
  private isValidMetric(metric: ApiMetric): boolean {
    return !!(
      metric.requestId &&
      metric.method &&
      metric.endpoint &&
      typeof metric.statusCode === 'number' &&
      typeof metric.responseTime === 'number' &&
      metric.timestamp instanceof Date
    );
  }

  /**
   * 샘플링 여부 결정
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  /**
   * 전체 개요 메트릭 계산
   */
  private calculateOverviewMetrics(metrics: ApiMetric[]) {
    const totalRequests = metrics.length;
    const activeRequests = 0; // 실제 구현에서는 진행 중인 요청 수 추적 필요
    
    const successfulRequests = metrics.filter(m => m.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    
    // RPS 계산 (최근 1분 기준)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentRequests = metrics.filter(m => m.timestamp >= oneMinuteAgo);
    const requestsPerSecond = recentRequests.length / 60;

    return {
      totalRequests,
      activeRequests,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      successRate: Math.round((successfulRequests / totalRequests) * 100) / 100,
      errorRate: Math.round((failedRequests / totalRequests) * 100) / 100,
    };
  }

  /**
   * 엔드포인트별 통계 계산
   */
  private calculateEndpointStats(metrics: ApiMetric[]): ApiEndpointStats[] {
    const endpointMap = new Map<string, ApiMetric[]>();
    
    // 엔드포인트별로 메트릭 그룹화
    metrics.forEach(metric => {
      const key = `${metric.method}:${metric.endpoint}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, []);
      }
      endpointMap.get(key)!.push(metric);
    });

    return Array.from(endpointMap.entries()).map(([key, endpointMetrics]) => {
      const [method, endpoint] = key.split(':');
      const totalRequests = endpointMetrics.length;
      const successRequests = endpointMetrics.filter(m => m.statusCode < 400).length;
      const failureRequests = totalRequests - successRequests;
      
      const responseTimes = endpointMetrics.map(m => m.responseTime).sort((a, b) => a - b);
      const avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
      const medianResponseTime = this.calculatePercentile(responseTimes, 0.5);
      const p95ResponseTime = this.calculatePercentile(responseTimes, 0.95);
      const p99ResponseTime = this.calculatePercentile(responseTimes, 0.99);
      
      // RPM 계산
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const recentRequests = endpointMetrics.filter(m => m.timestamp >= oneMinuteAgo);
      const requestsPerMinute = recentRequests.length;

      return {
        endpoint,
        method,
        totalRequests,
        successRequests,
        failureRequests,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        medianResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        minResponseTime: Math.min(...responseTimes),
        maxResponseTime: Math.max(...responseTimes),
        requestsPerMinute,
        successRate: Math.round((successRequests / totalRequests) * 100) / 100,
        lastUpdated: new Date(),
      };
    });
  }

  /**
   * 상태 코드 분포 계산
   */
  private calculateStatusCodeDistribution(metrics: ApiMetric[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    metrics.forEach(metric => {
      const code = metric.statusCode.toString();
      distribution[code] = (distribution[code] || 0) + 1;
    });
    
    return distribution;
  }

  /**
   * 시간 시리즈 데이터 계산
   */
  private calculateTimeSeries(metrics: ApiMetric[]): {
    requests: TimeSeriesDataPoint[];
    responseTime: TimeSeriesDataPoint[];
    errorRate: TimeSeriesDataPoint[];
  } {
    // 5분 간격으로 데이터 그룹화
    const intervalMs = 5 * 60 * 1000; // 5분
    const now = new Date();
    const dataPoints = new Map<number, ApiMetric[]>();
    
    metrics.forEach(metric => {
      const intervalStart = Math.floor(metric.timestamp.getTime() / intervalMs) * intervalMs;
      if (!dataPoints.has(intervalStart)) {
        dataPoints.set(intervalStart, []);
      }
      dataPoints.get(intervalStart)!.push(metric);
    });

    const sortedIntervals = Array.from(dataPoints.keys()).sort();
    
    const requests: TimeSeriesDataPoint[] = [];
    const responseTime: TimeSeriesDataPoint[] = [];
    const errorRate: TimeSeriesDataPoint[] = [];

    sortedIntervals.forEach(intervalStart => {
      const intervalMetrics = dataPoints.get(intervalStart)!;
      const timestamp = new Date(intervalStart);
      
      // 요청 수
      requests.push({
        timestamp,
        value: intervalMetrics.length,
      });
      
      // 평균 응답시간
      const avgRT = intervalMetrics.reduce((sum, m) => sum + m.responseTime, 0) / intervalMetrics.length;
      responseTime.push({
        timestamp,
        value: Math.round(avgRT * 100) / 100,
      });
      
      // 에러율
      const errors = intervalMetrics.filter(m => m.statusCode >= 400).length;
      errorRate.push({
        timestamp,
        value: Math.round((errors / intervalMetrics.length) * 100) / 100,
      });
    });

    return { requests, responseTime, errorRate };
  }

  /**
   * 최근 에러들 반환
   */
  private getRecentErrors(metrics: ApiMetric[]): ApiMetric[] {
    return metrics
      .filter(m => m.statusCode >= 400)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  /**
   * 가장 느린 요청들 반환
   */
  private getSlowestRequests(metrics: ApiMetric[]): ApiMetric[] {
    return metrics
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);
  }

  /**
   * 백분위수 계산
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  /**
   * 알림 생성
   */
  private async createAlert(alertData: Partial<PerformanceAlert>): Promise<void> {
    const alertKey = `${alertData.type}_${alertData.endpoint || 'global'}`;
    const now = new Date();
    
    // 최소 알림 간격 체크
    const lastAlertTime = this.lastAlertTimes.get(alertKey);
    if (lastAlertTime && (now.getTime() - lastAlertTime.getTime()) < this.config.alertConfig.minAlertInterval) {
      return;
    }

    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: alertData.type!,
      severity: alertData.severity || 'medium',
      message: alertData.message!,
      endpoint: alertData.endpoint,
      metricValue: alertData.metricValue!,
      threshold: alertData.threshold!,
      timestamp: now,
      status: 'active',
    };

    this.activeAlerts.set(alert.id, alert);
    this.lastAlertTimes.set(alertKey, now);

    // WebSocket으로 알림 전송
    if (this.config.alertConfig.channels.includes('websocket')) {
      try {
        webSocketServer.sendToChannel('metrics:alerts', 'alert', alert);
      } catch (error) {
        console.error('Failed to send alert via WebSocket:', error);
      }
    }
  }

  /**
   * 실시간 업데이트 전송
   */
  private sendRealtimeUpdate(): void {
    try {
      const metrics = this.getMetrics();
      const event: WebSocketMetricsEvent = {
        type: 'metrics_update',
        data: metrics,
        timestamp: new Date(),
      };

      webSocketServer.sendToChannel('metrics:updates', 'metrics_update', event);
    } catch (error) {
      console.error('Failed to send real-time update:', error);
    }
  }

  /**
   * 빈 메트릭 객체 반환
   */
  private getEmptyMetrics(): ApiPerformanceMetrics {
    return {
      overview: {
        totalRequests: 0,
        activeRequests: 0,
        requestsPerSecond: 0,
        avgResponseTime: 0,
        successRate: 0,
        errorRate: 0,
      },
      endpointStats: [],
      statusCodeDistribution: {},
      timeSeries: {
        requests: [],
        responseTime: [],
        errorRate: [],
      },
      recentErrors: [],
      slowestRequests: [],
    };
  }
}