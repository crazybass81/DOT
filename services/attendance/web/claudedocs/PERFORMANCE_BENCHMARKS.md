# 성능 벤치마크 및 기준

## 개요
DOT 출석 관리 시스템의 UI/UX 성능 벤치마크 및 허용 기준을 정의합니다.

## 성능 기준

### 1. 응답 시간 기준

#### 페이지 로딩 성능
| 메트릭 | 목표 | 허용 | 임계 |
|--------|------|------|------|
| 초기 페이지 로드 (FCP) | < 1.5초 | < 2.0초 | < 3.0초 |
| 완전 로딩 (LCP) | < 2.0초 | < 2.5초 | < 4.0초 |
| 상호작용 준비 (TTI) | < 2.5초 | < 3.0초 | < 5.0초 |
| 누적 레이아웃 이동 (CLS) | < 0.1 | < 0.15 | < 0.25 |

#### API 응답 시간
| 엔드포인트 | 목표 | 허용 | 임계 |
|------------|------|------|------|
| `/api/auth/login` | < 200ms | < 500ms | < 1000ms |
| `/api/attendance/check-in` | < 300ms | < 500ms | < 1000ms |
| `/api/attendance/check-out` | < 200ms | < 400ms | < 800ms |
| `/api/dashboard/realtime` | < 150ms | < 300ms | < 600ms |
| `/api/qr/generate` | < 400ms | < 600ms | < 1000ms |
| `/api/qr/scan` | < 300ms | < 500ms | < 800ms |

#### 컴포넌트 렌더링 성능
| 컴포넌트 | 목표 | 허용 | 임계 |
|----------|------|------|------|
| 로그인 페이지 | < 100ms | < 200ms | < 500ms |
| 직원 대시보드 | < 200ms | < 400ms | < 800ms |
| 관리자 대시보드 | < 300ms | < 600ms | < 1200ms |
| QR 스캐너 | < 150ms | < 300ms | < 600ms |
| 실시간 알림 | < 50ms | < 100ms | < 200ms |

### 2. 처리량 기준

#### 동시 사용자 처리 능력
| 시나리오 | 목표 | 허용 | 임계 |
|----------|------|------|------|
| 동시 로그인 | 100명 | 80명 | 50명 |
| 동시 출퇴근 처리 | 50명 | 40명 | 25명 |
| QR 스캔 처리 | 30건/초 | 20건/초 | 10건/초 |
| 실시간 업데이트 | 100건/초 | 80건/초 | 50건/초 |

#### 데이터베이스 성능
| 쿼리 유형 | 목표 | 허용 | 임계 |
|-----------|------|------|------|
| 사용자 인증 | < 50ms | < 100ms | < 200ms |
| 출석 기록 조회 (7일) | < 100ms | < 200ms | < 400ms |
| 출석 기록 조회 (30일) | < 200ms | < 400ms | < 800ms |
| 실시간 대시보드 데이터 | < 80ms | < 150ms | < 300ms |
| 대량 출석 기록 처리 | < 2초 | < 5초 | < 10초 |

### 3. 자원 사용 기준

#### 메모리 사용량
| 항목 | 목표 | 허용 | 임계 |
|------|------|------|------|
| 클라이언트 메모리 (초기) | < 50MB | < 80MB | < 120MB |
| 클라이언트 메모리 (8시간 사용) | < 100MB | < 150MB | < 200MB |
| 서버 메모리 (프로세스당) | < 200MB | < 400MB | < 600MB |
| 메모리 누수율 | < 1MB/시간 | < 5MB/시간 | < 10MB/시간 |

#### 네트워크 사용량
| 리소스 | 목표 | 허용 | 임계 |
|--------|------|------|------|
| 초기 번들 크기 | < 500KB | < 800KB | < 1.2MB |
| 이미지 최적화 | WebP/AVIF | WebP | JPG/PNG |
| 압축률 | > 70% | > 60% | > 50% |
| CDN 캐시 히트율 | > 95% | > 90% | > 80% |

## 모니터링 및 측정

### 1. 자동화된 성능 테스트

#### Lighthouse CI 설정
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.95}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.8}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

#### 성능 회귀 테스트
```typescript
// 성능 회귀 테스트 예시
test('페이지 로딩 성능 회귀 테스트', async () => {
  const startTime = performance.now();
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  const loadTime = performance.now() - startTime;
  
  // 기준값과 비교 (±10% 허용)
  expect(loadTime).toBeLessThan(BASELINE_LOAD_TIME * 1.1);
});
```

### 2. 실시간 모니터링

#### 핵심 지표 추적
- **Web Vitals**: FCP, LCP, FID, CLS, TTI
- **Custom Metrics**: 출퇴근 처리 시간, QR 스캔 응답 시간
- **Error Rates**: JavaScript 에러율, API 에러율
- **User Experience**: 이탈률, 완료율, 만족도

#### 알림 설정
```yaml
alerts:
  - metric: "page_load_time"
    threshold: 2000ms
    severity: "warning"
  
  - metric: "api_response_time"
    threshold: 500ms
    severity: "critical"
  
  - metric: "error_rate"
    threshold: 1%
    severity: "critical"
```

### 3. 성능 데이터 수집

#### 클라이언트 사이드 모니터링
```typescript
// Performance Observer 설정
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      // 페이지 로딩 메트릭 수집
      sendMetric('page_load_time', entry.loadEventEnd - entry.loadEventStart);
    }
    
    if (entry.entryType === 'measure') {
      // 커스텀 메트릭 수집
      sendMetric(entry.name, entry.duration);
    }
  }
});

observer.observe({ entryTypes: ['navigation', 'measure'] });
```

#### 서버 사이드 모니터링
```typescript
// API 응답 시간 측정
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    recordMetric('api_response_time', duration, {
      method: req.method,
      route: req.route?.path,
      status: res.statusCode
    });
  });
  
  next();
});
```

## 성능 최적화 가이드

### 1. 프론트엔드 최적화

#### 코드 분할 및 지연 로딩
```typescript
// React.lazy를 사용한 컴포넌트 지연 로딩
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const QRScanner = React.lazy(() => import('./QRScanner'));

// Next.js dynamic import
const DynamicComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
```

#### 메모이제이션 최적화
```typescript
// React.memo를 사용한 컴포넌트 메모이제이션
export const EmployeeCard = React.memo(({ employee }: Props) => {
  return <div>{employee.name}</div>;
});

// useMemo를 사용한 계산 결과 캐싱
const expensiveCalculation = useMemo(() => {
  return processAttendanceData(data);
}, [data]);
```

#### 번들 크기 최적화
```javascript
// webpack-bundle-analyzer를 사용한 번들 분석
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  webpack: (config) => {
    if (process.env.ANALYZE) {
      config.plugins.push(new BundleAnalyzerPlugin());
    }
    return config;
  }
};
```

### 2. 백엔드 최적화

#### 데이터베이스 쿼리 최적화
```sql
-- 인덱스 생성
CREATE INDEX idx_attendance_user_date ON attendance_records(user_id, DATE(created_at));
CREATE INDEX idx_attendance_org_date ON attendance_records(organization_id, DATE(created_at));

-- 쿼리 최적화 예시
SELECT ar.*, u.name, u.position
FROM attendance_records ar
JOIN users u ON ar.user_id = u.id
WHERE ar.organization_id = $1 
  AND DATE(ar.created_at) = CURRENT_DATE
ORDER BY ar.created_at DESC
LIMIT 100;
```

#### API 응답 캐싱
```typescript
// Redis를 사용한 API 캐싱
const getCachedData = async (key: string) => {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
};

const setCachedData = async (key: string, data: any, ttl = 300) => {
  await redis.setex(key, ttl, JSON.stringify(data));
};
```

### 3. 네트워크 최적화

#### CDN 및 압축
```javascript
// next.config.js - 이미지 최적화
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일
  },
  
  // Gzip 압축
  compress: true,
  
  // 정적 파일 캐싱
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
};
```

## 성능 회귀 방지

### 1. 성능 예산 설정
```json
{
  "budgets": [
    {
      "type": "bundle",
      "name": "main",
      "baseline": "500KB",
      "maximumWarning": "600KB",
      "maximumError": "800KB"
    },
    {
      "type": "initial",
      "maximumWarning": "2MB",
      "maximumError": "3MB"
    }
  ]
}
```

### 2. CI/CD 파이프라인 통합
```yaml
# 성능 테스트 단계
- name: 성능 회귀 테스트
  run: |
    npm run test:performance
    npm run lighthouse:ci
    
    # 기준값과 비교
    if [ $LIGHTHOUSE_SCORE -lt 90 ]; then
      echo "성능 점수가 기준 미달입니다"
      exit 1
    fi
```

### 3. 성능 메트릭 대시보드
- **Grafana**: 실시간 성능 메트릭 시각화
- **DataDog**: APM 및 RUM 모니터링
- **New Relic**: 종합적인 성능 모니터링

## 문제 해결 가이드

### 1. 일반적인 성능 문제

#### 느린 페이지 로딩
**원인 분석**:
- 번들 크기 확인
- 네트워크 요청 수 검토
- 이미지 최적화 상태 확인

**해결 방법**:
- 코드 분할 적용
- 이미지 압축 및 WebP 변환
- CDN 사용

#### 메모리 누수
**탐지 방법**:
```typescript
// 메모리 사용량 모니터링
const measureMemory = () => {
  if ('memory' in performance) {
    console.log('Memory usage:', performance.memory);
  }
};

setInterval(measureMemory, 60000); // 1분마다 측정
```

**해결 방법**:
- 이벤트 리스너 정리
- 타이머 정리
- 참조 해제

### 2. 성능 최적화 우선순위

1. **Critical Path 최적화**: 핵심 사용자 여정 최우선
2. **LCP 개선**: 가장 큰 콘텐츠 요소 최적화
3. **FID 개선**: 상호작용 지연 최소화
4. **CLS 개선**: 레이아웃 이동 방지

## 벤치마킹 결과 예시

### 현재 성능 현황 (2024년 1월 기준)
| 메트릭 | 현재값 | 목표값 | 상태 |
|--------|--------|--------|------|
| FCP | 1.2초 | < 1.5초 | ✅ 달성 |
| LCP | 2.1초 | < 2.0초 | ⚠️ 개선 필요 |
| FID | 45ms | < 100ms | ✅ 달성 |
| CLS | 0.08 | < 0.1 | ✅ 달성 |
| TTI | 2.8초 | < 2.5초 | ⚠️ 개선 필요 |

### 개선 로드맵
1. **Q1 2024**: LCP 2.0초 이하 달성
2. **Q2 2024**: TTI 2.5초 이하 달성
3. **Q3 2024**: 모든 메트릭 목표값 달성
4. **Q4 2024**: 성능 예산 10% 여유분 확보