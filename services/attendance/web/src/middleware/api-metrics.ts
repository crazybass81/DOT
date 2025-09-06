/**
 * API Metrics Middleware Implementation
 * Express.js 미들웨어 - API 호출 메트릭 수집
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PerformanceCollector } from '../lib/metrics/performance-collector';
import { 
  ApiMetric, 
  MetricsCollectorConfig 
} from '../types/performance-metrics';

interface ExtendedRequest extends Request {
  user?: {
    id: string;
    organizationId?: string;
  };
  _startTime?: number;
  _requestId?: string;
}

interface MiddlewareOptions {
  excludeEndpoints?: string[];
  includeRequestSize?: boolean;
  includeResponseSize?: boolean;
  normalizeEndpoints?: boolean;
}

export class ApiMetricsMiddleware {
  private collector: PerformanceCollector;

  constructor(config?: Partial<MetricsCollectorConfig>) {
    // 기본 설정
    const defaultConfig: MetricsCollectorConfig = {
      enabled: true,
      samplingRate: 1.0,
      bufferConfig: {
        maxSize: 10000,
        retentionTime: 3600000, // 1 hour
        autoCleanup: true,
        cleanupInterval: 300000, // 5 minutes
      },
      thresholds: {
        responseTimeThreshold: 1000,
        errorRateThreshold: 0.05,
        maxConcurrentRequests: 100,
        maxRequestsPerSecond: 1000,
      },
      alertConfig: {
        enabled: true,
        thresholds: {
          responseTimeThreshold: 1000,
          errorRateThreshold: 0.05,
          maxConcurrentRequests: 100,
          maxRequestsPerSecond: 1000,
        },
        channels: ['websocket'],
        minAlertInterval: 60000,
      },
    };

    const mergedConfig = { ...defaultConfig, ...config };
    this.collector = new PerformanceCollector(mergedConfig);
    this.collector.start();
  }

  /**
   * Express 미들웨어 함수 반환
   */
  getMiddleware(options: MiddlewareOptions = {}) {
    const {
      excludeEndpoints = [],
      includeRequestSize = true,
      includeResponseSize = true,
      normalizeEndpoints = true,
    } = options;

    return (req: ExtendedRequest, res: Response, next: NextFunction): void => {
      // 수집기가 비활성화된 경우 스킵
      if (!this.collector.isEnabled()) {
        return next();
      }

      // 제외 엔드포인트 체크
      if (excludeEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
        return next();
      }

      // 요청 시작 시간 및 ID 설정
      req._startTime = Date.now();
      req._requestId = uuidv4();

      // 응답 완료 시 메트릭 수집
      const originalEnd = res.end;
      let metricCollected = false;

      const collectMetric = () => {
        if (metricCollected) return;
        metricCollected = true;

        try {
          const endTime = Date.now();
          const responseTime = endTime - (req._startTime || endTime);

          const metric: ApiMetric = {
            requestId: req._requestId || uuidv4(),
            method: req.method,
            endpoint: this.normalizeEndpoint(req, normalizeEndpoints),
            statusCode: res.statusCode,
            responseTime,
            timestamp: new Date(req._startTime || endTime),
            clientIp: this.extractClientIp(req),
            userId: req.user?.id,
            organizationId: req.user?.organizationId,
          };

          // 요청 크기 계산
          if (includeRequestSize) {
            metric.requestSize = this.calculateRequestSize(req);
          }

          // 응답 크기 계산
          if (includeResponseSize) {
            metric.responseSize = this.calculateResponseSize(res);
          }

          // 에러 메시지 추가
          if (res.statusCode >= 400) {
            metric.errorMessage = this.extractErrorMessage(req, res);
          }

          this.collector.collectMetric(metric);
        } catch (error) {
          console.error('Failed to collect API metric:', error);
        }
      };

      // response.end 오버라이드
      res.end = function(chunk?: any, encoding?: any, cb?: any) {
        collectMetric();
        return originalEnd.call(this, chunk, encoding, cb);
      };

      // response 에러 핸들링
      res.on('error', (error) => {
        collectMetric();
      });

      // 요청이 중단된 경우
      req.on('close', () => {
        if (!res.headersSent) {
          collectMetric();
        }
      });

      next();
    };
  }

  /**
   * 수집기 인스턴스 반환
   */
  getCollector(): PerformanceCollector {
    return this.collector;
  }

  /**
   * 수집기 중지
   */
  stop(): void {
    this.collector.stop();
  }

  /**
   * 엔드포인트 정규화
   */
  private normalizeEndpoint(req: ExtendedRequest, normalize: boolean): string {
    if (!normalize) {
      return req.path;
    }

    // Express route 정보가 있으면 사용
    if (req.route && req.route.path) {
      return req.baseUrl ? `${req.baseUrl}${req.route.path}` : req.route.path;
    }

    // 쿼리 파라미터 제거
    const pathWithoutQuery = req.path.split('?')[0];

    // ID 패턴을 파라미터로 변환 (간단한 정규화)
    return pathWithoutQuery
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectId');
  }

  /**
   * 클라이언트 IP 추출
   */
  private extractClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return (
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-client-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 요청 크기 계산
   */
  private calculateRequestSize(req: ExtendedRequest): number {
    try {
      if (req.body) {
        if (typeof req.body === 'string') {
          return Buffer.byteLength(req.body, 'utf8');
        }
        return Buffer.byteLength(JSON.stringify(req.body), 'utf8');
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 응답 크기 계산
   */
  private calculateResponseSize(res: Response): number {
    try {
      // Express의 _getData 메서드 사용 (테스트 환경)
      if (typeof res._getData === 'function') {
        const data = res._getData();
        return Buffer.byteLength(data, 'utf8');
      }

      // Content-Length 헤더 사용
      const contentLength = res.getHeader('content-length');
      if (contentLength) {
        return parseInt(contentLength.toString(), 10);
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 에러 메시지 추출
   */
  private extractErrorMessage(req: ExtendedRequest, res: Response): string {
    // 일반적인 HTTP 상태 메시지
    const statusMessages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return statusMessages[res.statusCode] || `HTTP ${res.statusCode}`;
  }
}

/**
 * 팩토리 함수 - 간단한 사용을 위한 헬퍼
 */
export function apiMetricsMiddleware(
  config?: Partial<MetricsCollectorConfig>,
  options?: MiddlewareOptions
) {
  const middleware = new ApiMetricsMiddleware(config);
  return middleware.getMiddleware(options);
}

// 기본 인스턴스 내보내기
export const defaultApiMetricsMiddleware = new ApiMetricsMiddleware();