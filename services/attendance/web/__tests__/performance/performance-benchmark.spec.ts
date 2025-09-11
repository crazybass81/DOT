/**
 * DOT 출석관리 시스템 성능 벤치마크 테스트
 * 페이지 로딩, 실시간 업데이트, 대용량 데이터 처리 성능 검증
 */

import { test, expect, Page } from '@playwright/test';

interface PerformanceMetrics {
  pageName: string;
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  totalBlockingTime: number;
  domContentLoaded: number;
  memoryUsage?: number;
}

class PerformanceTester {
  constructor(private page: Page) {}

  async measurePagePerformance(url: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    // 성능 관찰자 설정
    await this.page.addInitScript(() => {
      window.performanceMetrics = {
        navigationStart: 0,
        domContentLoaded: 0,
        loadComplete: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0,
        totalBlockingTime: 0
      };

      // Navigation Timing API
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        window.performanceMetrics.navigationStart = navigation.navigationStart;
        window.performanceMetrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
        window.performanceMetrics.loadComplete = navigation.loadEventEnd - navigation.navigationStart;
      });

      // Paint Timing API
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            window.performanceMetrics.firstContentfulPaint = entry.startTime;
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        window.performanceMetrics.largestContentfulPaint = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        window.performanceMetrics.cumulativeLayoutShift = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.performanceMetrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    });

    // 페이지 로딩
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;

    // 성능 메트릭 수집
    const metrics = await this.page.evaluate(() => {
      return window.performanceMetrics;
    });

    // 메모리 사용량 측정 (가능한 경우)
    let memoryUsage;
    try {
      memoryUsage = await this.page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
    } catch (e) {
      // 메모리 API를 지원하지 않는 브라우저
      memoryUsage = 0;
    }

    return {
      pageName: url,
      loadTime,
      firstContentfulPaint: metrics.firstContentfulPaint,
      largestContentfulPaint: metrics.largestContentfulPaint,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift,
      firstInputDelay: metrics.firstInputDelay,
      totalBlockingTime: metrics.totalBlockingTime,
      domContentLoaded: metrics.domContentLoaded,
      memoryUsage
    };
  }

  async measureRealTimeUpdates(): Promise<number> {
    // 실시간 시계 업데이트 성능 측정
    const clockElement = this.page.locator('[data-testid="real-time-clock"]');
    
    const updateTimes: number[] = [];
    
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      const initialTime = await clockElement.textContent();
      
      // 시계 업데이트 대기
      await this.page.waitForFunction(
        (element, initial) => element.textContent !== initial,
        clockElement,
        initialTime,
        { timeout: 2000 }
      );
      
      const updateTime = Date.now() - startTime;
      updateTimes.push(updateTime);
      
      await this.page.waitForTimeout(100); // 다음 측정을 위한 대기
    }

    return updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
  }

  async measureLargeDatasetRendering(recordCount: number): Promise<number> {
    // 대용량 출근 기록 렌더링 성능 측정
    const startTime = Date.now();
    
    // 테스트 데이터 생성 및 로딩 시뮬레이션
    await this.page.evaluate((count) => {
      // 가상의 대용량 데이터 생성
      const testData = Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        employee_id: `emp_${i + 1}`,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        check_in: '09:00:00',
        check_out: '18:00:00',
        status: 'completed'
      }));

      // DOM에 데이터 렌더링 시뮬레이션
      const tbody = document.querySelector('[data-testid="attendance-table-body"]');
      if (tbody) {
        tbody.innerHTML = testData.map(record => `
          <tr data-testid="attendance-row-${record.id}">
            <td>${record.date}</td>
            <td>${record.check_in}</td>
            <td>${record.check_out}</td>
            <td>${record.status}</td>
          </tr>
        `).join('');
      }
    }, recordCount);

    // 렌더링 완료 대기
    await this.page.waitForSelector(`[data-testid="attendance-row-${recordCount}"]`, { timeout: 10000 });
    
    return Date.now() - startTime;
  }

  async measureNetworkPerformance(): Promise<any> {
    // 네트워크 요청 성능 분석
    const networkLogs: any[] = [];
    
    this.page.on('response', (response) => {
      networkLogs.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'] || 0,
        timing: response.timing()
      });
    });

    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');

    // API 요청 성능 분석
    const apiRequests = networkLogs.filter(log => 
      log.url.includes('/api/') || log.url.includes('supabase')
    );

    const totalApiTime = apiRequests.reduce((sum, req) => {
      return sum + (req.timing?.responseEnd || 0);
    }, 0);

    return {
      totalRequests: networkLogs.length,
      apiRequests: apiRequests.length,
      averageApiResponseTime: apiRequests.length > 0 ? totalApiTime / apiRequests.length : 0,
      failedRequests: networkLogs.filter(log => log.status >= 400).length
    };
  }
}

test.describe('성능 벤치마크 테스트', () => {
  let performanceTester: PerformanceTester;

  test.beforeEach(async ({ page }) => {
    performanceTester = new PerformanceTester(page);
  });

  test('페이지 로딩 성능 측정', async ({ page }) => {
    const pages = [
      '/',           // 로그인 페이지
      '/register',   // 회원가입 페이지
      '/dashboard',  // 대시보드
      '/qr'         // QR 관리
    ];

    const results: PerformanceMetrics[] = [];

    for (const pageUrl of pages) {
      console.log(`📊 ${pageUrl} 성능 측정 중...`);
      
      const metrics = await performanceTester.measurePagePerformance(pageUrl);
      results.push(metrics);

      // 성능 기준 검증
      expect(metrics.loadTime).toBeLessThan(3000); // 3초 이내 로딩
      expect(metrics.firstContentfulPaint).toBeLessThan(1500); // 1.5초 이내 FCP
      expect(metrics.largestContentfulPaint).toBeLessThan(2500); // 2.5초 이내 LCP
      expect(metrics.cumulativeLayoutShift).toBeLessThan(0.1); // CLS < 0.1

      console.log(`✅ ${pageUrl}: ${metrics.loadTime}ms (FCP: ${metrics.firstContentfulPaint}ms, LCP: ${metrics.largestContentfulPaint}ms)`);
    }

    // 전체 성능 리포트 생성
    const avgLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
    const avgFcp = results.reduce((sum, r) => sum + r.firstContentfulPaint, 0) / results.length;
    const avgLcp = results.reduce((sum, r) => sum + r.largestContentfulPaint, 0) / results.length;

    console.log(`📈 전체 평균 - 로딩: ${avgLoadTime.toFixed(0)}ms, FCP: ${avgFcp.toFixed(0)}ms, LCP: ${avgLcp.toFixed(0)}ms`);

    // 성능 점수 계산 (Google PageSpeed 기준)
    const performanceScore = calculatePerformanceScore(avgFcp, avgLcp, results[0].cumulativeLayoutShift);
    expect(performanceScore).toBeGreaterThan(75); // 75점 이상 목표

    console.log(`🎯 성능 점수: ${performanceScore}/100`);
  });

  test('실시간 업데이트 성능 측정', async ({ page }) => {
    await page.goto('/');
    
    console.log('⏰ 실시간 시계 업데이트 성능 측정 중...');
    
    const avgUpdateTime = await performanceTester.measureRealTimeUpdates();
    
    // 실시간 업데이트는 100ms 이내여야 함
    expect(avgUpdateTime).toBeLessThan(100);
    
    console.log(`✅ 평균 실시간 업데이트 시간: ${avgUpdateTime.toFixed(0)}ms`);
  });

  test('대용량 데이터 렌더링 성능', async ({ page }) => {
    await page.goto('/dashboard');
    
    const testSizes = [100, 500, 1000];
    const results: { size: number; renderTime: number }[] = [];

    for (const size of testSizes) {
      console.log(`📋 ${size}건 데이터 렌더링 성능 측정 중...`);
      
      const renderTime = await performanceTester.measureLargeDatasetRendering(size);
      results.push({ size, renderTime });

      // 렌더링 성능 기준
      expect(renderTime).toBeLessThan(size * 2); // 레코드당 2ms 이내
      
      console.log(`✅ ${size}건: ${renderTime}ms (레코드당 ${(renderTime/size).toFixed(2)}ms)`);
    }

    // 선형 증가율 확인 (O(n) 복잡도)
    const ratio1000to100 = results[2].renderTime / results[0].renderTime;
    expect(ratio1000to100).toBeLessThan(15); // 10배 데이터에 15배 이내 시간

    console.log(`📊 렌더링 확장성: 100건 대비 1000건 ${ratio1000to100.toFixed(1)}배 시간`);
  });

  test('네트워크 요청 성능 분석', async ({ page }) => {
    console.log('🌐 네트워크 성능 분석 중...');
    
    const networkMetrics = await performanceTester.measureNetworkPerformance();
    
    // 네트워크 성능 기준
    expect(networkMetrics.averageApiResponseTime).toBeLessThan(1000); // API 응답 1초 이내
    expect(networkMetrics.failedRequests).toBe(0); // 실패한 요청 없음
    
    console.log(`✅ API 평균 응답시간: ${networkMetrics.averageApiResponseTime.toFixed(0)}ms`);
    console.log(`📊 총 요청: ${networkMetrics.totalRequests}, API 요청: ${networkMetrics.apiRequests}`);
    console.log(`🚫 실패한 요청: ${networkMetrics.failedRequests}`);
  });

  test('메모리 사용량 분석', async ({ page }) => {
    console.log('🧠 메모리 사용량 분석 중...');
    
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // 여러 페이지 네비게이션
    const pages = ['/', '/dashboard', '/qr', '/dashboard'];
    for (const pageUrl of pages) {
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // 메모리 안정화 대기
    }

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

      // 메모리 누수 확인 (50% 이상 증가하면 문제)
      expect(memoryIncreasePercent).toBeLessThan(50);

      console.log(`🧠 메모리 사용량: ${(initialMemory / 1024 / 1024).toFixed(1)}MB → ${(finalMemory / 1024 / 1024).toFixed(1)}MB`);
      console.log(`📈 증가율: ${memoryIncreasePercent.toFixed(1)}%`);
    } else {
      console.log('⚠️ 브라우저에서 메모리 API를 지원하지 않음');
    }
  });

  test('모바일 성능 최적화 확인', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 네트워크 속도 제한 시뮬레이션
    await page.route('**/*', async (route) => {
      // 200ms 지연 추가 (3G 네트워크 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 200));
      route.continue();
    });

    console.log('📱 모바일 성능 측정 중...');
    
    const mobileMetrics = await performanceTester.measurePagePerformance('/');
    
    // 모바일 성능 기준 (더 관대함)
    expect(mobileMetrics.loadTime).toBeLessThan(5000); // 5초 이내
    expect(mobileMetrics.firstContentfulPaint).toBeLessThan(2000); // 2초 이내 FCP
    
    console.log(`📱 모바일 로딩: ${mobileMetrics.loadTime}ms (FCP: ${mobileMetrics.firstContentfulPaint}ms)`);
  });
});

// 성능 점수 계산 함수 (Google PageSpeed 기준)
function calculatePerformanceScore(fcp: number, lcp: number, cls: number): number {
  let score = 100;
  
  // FCP 점수 (0-20점)
  if (fcp > 3000) score -= 20;
  else if (fcp > 1800) score -= 10;
  else if (fcp > 1200) score -= 5;
  
  // LCP 점수 (0-25점)
  if (lcp > 4000) score -= 25;
  else if (lcp > 2500) score -= 15;
  else if (lcp > 1500) score -= 8;
  
  // CLS 점수 (0-15점)
  if (cls > 0.25) score -= 15;
  else if (cls > 0.1) score -= 8;
  else if (cls > 0.05) score -= 3;
  
  return Math.max(0, score);
}

test.afterAll(async () => {
  console.log('📊 성능 테스트 완료 - 상세 결과는 test-results 폴더에서 확인하세요');
});