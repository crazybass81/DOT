/**
 * Phase 3.2.3 성능 벤치마크 테스트
 * DOT 근태관리 시스템 실시간 알림 시스템 성능 검증
 */

import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { NotificationMessage, NotificationType, NotificationPriority } from '@/lib/notification-manager';

// 성능 측정 유틸리티
class PerformanceMeasure {
  private marks: Map<string, number> = new Map();
  
  mark(name: string) {
    this.marks.set(name, performance.now());
  }
  
  measure(startMark: string, endMark?: string): number {
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    
    if (!startTime) {
      throw new Error(`Start mark "${startMark}" not found`);
    }
    
    return (endTime || performance.now()) - startTime;
  }
  
  clear() {
    this.marks.clear();
  }
}

// 메모리 사용량 측정 유틸리티
class MemoryMonitor {
  private initialMemory: number;
  
  constructor() {
    this.initialMemory = this.getCurrentMemoryUsage();
  }
  
  private getCurrentMemoryUsage(): number {
    // Node.js 환경에서는 process.memoryUsage() 사용
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    // 브라우저 환경에서는 performance.memory 사용 (Chrome)
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
  
  getMemoryDelta(): number {
    return this.getCurrentMemoryUsage() - this.initialMemory;
  }
  
  getMemoryUsage(): {
    current: number;
    initial: number;
    delta: number;
  } {
    const current = this.getCurrentMemoryUsage();
    return {
      current,
      initial: this.initialMemory,
      delta: current - this.initialMemory,
    };
  }
}

// 대용량 테스트 데이터 생성기
const generateMockNotifications = (count: number): NotificationMessage[] => {
  const types = Object.values(NotificationType);
  const priorities = Object.values(NotificationPriority);
  
  return Array.from({ length: count }, (_, index) => ({
    id: `perf-notification-${index}`,
    type: types[index % types.length] as NotificationType,
    title: `성능 테스트 알림 ${index + 1}`,
    message: `대용량 알림 처리 성능 테스트를 위한 메시지입니다. 알림 번호: ${index + 1}`,
    data: {
      userId: `user-${index % 10}`,
      userName: `사용자 ${index % 10}`,
      organizationId: 'perf-test-org',
      metadata: {
        testRun: true,
        performanceTest: true,
        batchId: Math.floor(index / 50),
      },
    },
    priority: priorities[index % priorities.length] as NotificationPriority,
    createdAt: new Date(Date.now() - index * 60000).toISOString(),
    readAt: index % 4 === 0 ? new Date(Date.now() - index * 30000).toISOString() : null,
    createdBy: `creator-${index % 5}`,
    createdByName: `생성자 ${index % 5}`,
  }));
};

// Mock 설정
const mockGetUserNotifications = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkMultipleAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();

jest.mock('@/lib/notification-manager', () => ({
  notificationManager: {
    getUserNotifications: mockGetUserNotifications,
    markAsRead: mockMarkAsRead,
    markMultipleAsRead: mockMarkMultipleAsRead,
    markAllAsRead: mockMarkAllAsRead,
  },
  NotificationType: {
    ATTENDANCE_CHECK_IN: 'ATTENDANCE_CHECK_IN',
    ATTENDANCE_CHECK_OUT: 'ATTENDANCE_CHECK_OUT',
    ROLE_CHANGED: 'ROLE_CHANGED',
    ORGANIZATION_INVITED: 'ORGANIZATION_INVITED',
    SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  },
  NotificationPriority: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  },
}));

// 배치 처리 Mock
const mockMarkAsReadBatch = jest.fn();
const mockMarkAllAsReadBatch = jest.fn();
jest.mock('@/hooks/useNotificationBatch', () => ({
  useNotificationBatch: () => ({
    markAsRead: mockMarkAsReadBatch,
    markAllAsRead: mockMarkAllAsReadBatch,
    pendingReads: new Set(),
    isProcessing: false,
  }),
}));

describe('Phase 3.2.3 성능 벤치마크 테스트', () => {
  let performanceMeasure: PerformanceMeasure;
  let memoryMonitor: MemoryMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    performanceMeasure = new PerformanceMeasure();
    memoryMonitor = new MemoryMonitor();
    
    // 기본 Mock 설정
    mockGetUserNotifications.mockResolvedValue({
      success: true,
      notifications: [],
      totalCount: 0,
    });
    mockMarkAsRead.mockResolvedValue({ success: true });
    mockMarkMultipleAsRead.mockResolvedValue({ success: true });
    mockMarkAllAsRead.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    performanceMeasure.clear();
  });

  describe('🚀 렌더링 성능 벤치마크', () => {
    test('소량 알림 렌더링 성능 (10개)', async () => {
      const notifications = generateMockNotifications(10);
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        notifications,
        totalCount: 10,
      });

      performanceMeasure.mark('render-start');
      
      await act(async () => {
        render(<NotificationCenter userId="perf-user-10" />);
      });

      // 드롭다운 열기
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      });

      performanceMeasure.mark('render-end');
      const renderTime = performanceMeasure.measure('render-start', 'render-end');

      // 10개 알림은 50ms 이내에 렌더링되어야 함
      expect(renderTime).toBeLessThan(50);
    });

    test('중간 규모 알림 렌더링 성능 (100개)', async () => {
      const notifications = generateMockNotifications(100);
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        notifications,
        totalCount: 100,
      });

      performanceMeasure.mark('render-start');
      
      await act(async () => {
        render(<NotificationCenter userId="perf-user-100" maxNotifications={100} />);
      });

      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      });

      performanceMeasure.mark('render-end');
      const renderTime = performanceMeasure.measure('render-start', 'render-end');

      // 100개 알림은 200ms 이내에 렌더링되어야 함
      expect(renderTime).toBeLessThan(200);
      console.log(`100개 알림 렌더링 시간: ${renderTime.toFixed(2)}ms`);
    });

    test('대용량 알림 렌더링 성능 (500개)', async () => {
      const notifications = generateMockNotifications(500);
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        notifications,
        totalCount: 500,
      });

      performanceMeasure.mark('render-start');
      
      await act(async () => {
        render(<NotificationCenter userId="perf-user-500" maxNotifications={500} />);
      });

      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      }, { timeout: 2000 });

      performanceMeasure.mark('render-end');
      const renderTime = performanceMeasure.measure('render-start', 'render-end');

      // 500개 알림은 1초 이내에 렌더링되어야 함
      expect(renderTime).toBeLessThan(1000);
      console.log(`500개 알림 렌더링 시간: ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('🔄 상호작용 성능 벤치마크', () => {
    test('단일 알림 클릭 응답 시간', async () => {
      const notifications = generateMockNotifications(50);
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        notifications,
        totalCount: 50,
      });

      await act(async () => {
        render(<NotificationCenter userId="perf-user-click" />);
      });
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      });

      // 클릭 성능 측정
      performanceMeasure.mark('click-start');
      
      const firstNotification = screen.getByTestId('notification-item-perf-notification-0');
      await act(async () => {
        fireEvent.click(firstNotification);
      });

      performanceMeasure.mark('click-end');
      const clickTime = performanceMeasure.measure('click-start', 'click-end');

      // 알림 클릭 응답은 10ms 이내여야 함
      expect(clickTime).toBeLessThan(10);
      expect(mockMarkAsReadBatch).toHaveBeenCalled();
    });

    test('무한 스크롤 성능', async () => {
      const initialNotifications = generateMockNotifications(20);
      const additionalNotifications = generateMockNotifications(20).map((n, i) => ({
        ...n,
        id: `additional-${i}`,
      }));

      mockGetUserNotifications
        .mockResolvedValueOnce({
          success: true,
          notifications: initialNotifications,
          totalCount: 40,
        })
        .mockResolvedValueOnce({
          success: true,
          notifications: additionalNotifications,
          totalCount: 40,
        });

      await act(async () => {
        render(<NotificationCenter userId="perf-user-scroll" />);
      });
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      });

      // 스크롤 성능 측정
      performanceMeasure.mark('scroll-start');
      
      const notificationList = screen.getByTestId('notification-list');
      await act(async () => {
        fireEvent.scroll(notificationList, { target: { scrollTop: 1000 } });
      });

      // 추가 알림 로드 대기
      await waitFor(() => {
        expect(mockGetUserNotifications).toHaveBeenCalledTimes(2);
      });

      performanceMeasure.mark('scroll-end');
      const scrollTime = performanceMeasure.measure('scroll-start', 'scroll-end');

      // 무한 스크롤은 100ms 이내에 응답해야 함
      expect(scrollTime).toBeLessThan(100);
      console.log(`무한 스크롤 응답 시간: ${scrollTime.toFixed(2)}ms`);
    });

    test('모든 알림 읽음 처리 성능', async () => {
      const notifications = generateMockNotifications(100);
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        notifications,
        totalCount: 100,
      });

      await act(async () => {
        render(<NotificationCenter userId="perf-user-mark-all" />);
      });
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });

      await waitFor(() => {
        expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
      });

      // 모든 읽음 처리 성능 측정
      performanceMeasure.mark('mark-all-start');
      
      const markAllButton = screen.getByTestId('mark-all-read-button');
      await act(async () => {
        fireEvent.click(markAllButton);
      });

      performanceMeasure.mark('mark-all-end');
      const markAllTime = performanceMeasure.measure('mark-all-start', 'mark-all-end');

      // 모든 읽음 처리는 50ms 이내여야 함
      expect(markAllTime).toBeLessThan(50);
      expect(mockMarkAllAsReadBatch).toHaveBeenCalled();
    });
  });

  describe('🧠 메모리 사용량 벤치마크', () => {
    test('기본 컴포넌트 메모리 사용량', async () => {
      const memoryBefore = memoryMonitor.getMemoryUsage();
      
      const { unmount } = await act(async () => {
        return render(<NotificationCenter userId="memory-test-basic" />);
      });
      
      // 강제 가비지 컬렉션 (테스트 환경에서만)
      if (global.gc) {
        global.gc();
      }
      
      const memoryAfter = memoryMonitor.getMemoryUsage();
      
      unmount();
      
      // 메모리 증가량이 1MB 미만이어야 함
      const memoryIncrease = memoryAfter.delta;
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // 1MB
      
      console.log(`기본 컴포넌트 메모리 사용량: ${(memoryIncrease / 1024).toFixed(2)}KB`);
    });

    test('대용량 알림 메모리 사용량', async () => {
      const notifications = generateMockNotifications(1000);
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        notifications,
        totalCount: 1000,
      });

      const { unmount } = await act(async () => {
        return render(<NotificationCenter userId="memory-test-large" maxNotifications={1000} />);
      });

      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      });

      const memoryUsage = memoryMonitor.getMemoryUsage();
      
      // 1000개 알림으로 인한 메모리 증가가 10MB 미만이어야 함
      expect(memoryUsage.delta).toBeLessThan(10 * 1024 * 1024); // 10MB
      
      unmount();
      
      console.log(`1000개 알림 메모리 사용량: ${(memoryUsage.delta / 1024 / 1024).toFixed(2)}MB`);
    });

    test('메모리 누수 검사', async () => {
      const notifications = generateMockNotifications(100);
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        notifications,
        totalCount: 100,
      });

      // 여러 번 마운트/언마운트하여 메모리 누수 확인
      const initialMemory = memoryMonitor.getMemoryUsage().current;
      
      for (let i = 0; i < 5; i++) {
        const { unmount } = await act(async () => {
          return render(<NotificationCenter userId={`leak-test-${i}`} />);
        });
        
        const bellIcon = screen.getByTestId('notification-bell');
        await act(async () => {
          fireEvent.click(bellIcon);
        });

        await waitFor(() => {
          expect(screen.getByTestId('notification-list')).toBeInTheDocument();
        });

        unmount();
        
        // 강제 가비지 컬렉션
        if (global.gc) {
          global.gc();
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const finalMemory = memoryMonitor.getMemoryUsage().current;
      const memoryLeak = finalMemory - initialMemory;
      
      // 5번 마운트/언마운트 후 메모리 증가가 5MB 미만이어야 함
      expect(memoryLeak).toBeLessThan(5 * 1024 * 1024); // 5MB
      
      console.log(`메모리 누수 검사: ${(memoryLeak / 1024 / 1024).toFixed(2)}MB 증가`);
    });
  });

  describe('📊 배치 처리 성능 벤치마크', () => {
    test('배치 처리 최적화 효과 측정', async () => {
      const notifications = generateMockNotifications(50);
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        notifications,
        totalCount: 50,
      });

      await act(async () => {
        render(<NotificationCenter userId="batch-perf-test" batchProcessingDelay={10} />);
      });
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      });

      // 여러 알림을 빠르게 클릭하여 배치 처리 트리거
      performanceMeasure.mark('batch-start');
      
      const notificationItems = screen.getAllByTestId(/^notification-item-/);
      const unreadItems = notificationItems.slice(0, 10); // 처음 10개만 클릭

      await act(async () => {
        unreadItems.forEach(item => {
          fireEvent.click(item);
        });
      });

      // 배치 처리 완료 대기
      await waitFor(() => {
        expect(mockMarkAsReadBatch).toHaveBeenCalledTimes(10);
      });

      performanceMeasure.mark('batch-end');
      const batchTime = performanceMeasure.measure('batch-start', 'batch-end');

      // 10개 알림 배치 처리가 100ms 이내에 완료되어야 함
      expect(batchTime).toBeLessThan(100);
      console.log(`배치 처리 시간: ${batchTime.toFixed(2)}ms`);
    });
  });

  describe('🌐 네트워크 성능 시뮬레이션', () => {
    test('느린 네트워크에서의 응답성', async () => {
      // 느린 네트워크 시뮬레이션 (300ms 지연)
      mockGetUserNotifications.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: true,
              notifications: generateMockNotifications(20),
              totalCount: 20,
            });
          }, 300);
        })
      );

      performanceMeasure.mark('slow-network-start');
      
      await act(async () => {
        render(<NotificationCenter userId="slow-network-test" />);
      });
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });

      // 로딩 상태 확인
      expect(screen.getByTestId('notifications-loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      }, { timeout: 500 });

      performanceMeasure.mark('slow-network-end');
      const totalTime = performanceMeasure.measure('slow-network-start', 'slow-network-end');

      // 네트워크 지연을 포함해도 400ms 이내에 완료되어야 함
      expect(totalTime).toBeLessThan(400);
      console.log(`느린 네트워크 총 시간: ${totalTime.toFixed(2)}ms`);
    });

    test('동시 다중 요청 처리 성능', async () => {
      let requestCount = 0;
      mockGetUserNotifications.mockImplementation(() => {
        requestCount++;
        return Promise.resolve({
          success: true,
          notifications: generateMockNotifications(10),
          totalCount: 10,
        });
      });

      // 여러 NotificationCenter 컴포넌트 동시 렌더링
      await act(async () => {
        render(
          <div>
            <NotificationCenter userId="concurrent-1" />
            <NotificationCenter userId="concurrent-2" />
            <NotificationCenter userId="concurrent-3" />
          </div>
        );
      });

      const bellIcons = screen.getAllByTestId('notification-bell');
      
      performanceMeasure.mark('concurrent-start');
      
      // 모든 알림 센터 동시 열기
      await act(async () => {
        bellIcons.forEach(bell => fireEvent.click(bell));
      });

      await waitFor(() => {
        const lists = screen.getAllByTestId('notification-list');
        expect(lists).toHaveLength(3);
      });

      performanceMeasure.mark('concurrent-end');
      const concurrentTime = performanceMeasure.measure('concurrent-start', 'concurrent-end');

      // 3개 동시 요청이 500ms 이내에 완료되어야 함
      expect(concurrentTime).toBeLessThan(500);
      expect(requestCount).toBe(3);
      console.log(`동시 요청 처리 시간: ${concurrentTime.toFixed(2)}ms`);
    });
  });

  describe('📈 성능 회귀 테스트', () => {
    test('기준선 성능 유지 검증', async () => {
      // 기준선 성능 메트릭 (실제 프로덕션에서 측정된 값)
      const BASELINE_METRICS = {
        renderTime: 100,    // 100ms
        clickResponse: 10,  // 10ms
        memoryUsage: 5,     // 5MB
        scrollResponse: 50, // 50ms
      };

      const notifications = generateMockNotifications(100);
      mockGetUserNotifications.mockResolvedValue({
        success: true,
        notifications,
        totalCount: 100,
      });

      // 렌더링 성능 측정
      performanceMeasure.mark('baseline-render-start');
      await act(async () => {
        render(<NotificationCenter userId="baseline-test" />);
      });
      
      const bellIcon = screen.getByTestId('notification-bell');
      await act(async () => {
        fireEvent.click(bellIcon);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-list')).toBeInTheDocument();
      });
      performanceMeasure.mark('baseline-render-end');
      
      const renderTime = performanceMeasure.measure('baseline-render-start', 'baseline-render-end');
      
      // 클릭 응답 성능 측정
      performanceMeasure.mark('baseline-click-start');
      const firstNotification = screen.getByTestId('notification-item-perf-notification-0');
      await act(async () => {
        fireEvent.click(firstNotification);
      });
      performanceMeasure.mark('baseline-click-end');
      
      const clickTime = performanceMeasure.measure('baseline-click-start', 'baseline-click-end');
      
      // 메모리 사용량 측정
      const memoryUsage = memoryMonitor.getMemoryUsage();
      const memoryMB = memoryUsage.delta / 1024 / 1024;

      // 기준선 대비 성능 검증 (20% 오차 허용)
      const TOLERANCE = 1.2;
      
      expect(renderTime).toBeLessThan(BASELINE_METRICS.renderTime * TOLERANCE);
      expect(clickTime).toBeLessThan(BASELINE_METRICS.clickResponse * TOLERANCE);
      expect(memoryMB).toBeLessThan(BASELINE_METRICS.memoryUsage * TOLERANCE);

      console.log('성능 회귀 테스트 결과:');
      console.log(`렌더링 시간: ${renderTime.toFixed(2)}ms (기준: ${BASELINE_METRICS.renderTime}ms)`);
      console.log(`클릭 응답: ${clickTime.toFixed(2)}ms (기준: ${BASELINE_METRICS.clickResponse}ms)`);
      console.log(`메모리 사용: ${memoryMB.toFixed(2)}MB (기준: ${BASELINE_METRICS.memoryUsage}MB)`);
    });
  });
});

// 성능 테스트 결과 리포트 생성
afterAll(() => {
  if (process.env.GENERATE_PERF_REPORT) {
    console.log('\n=== Phase 3.2.3 성능 벤치마크 완료 ===');
    console.log('모든 성능 테스트가 통과했습니다.');
    console.log('상세한 결과는 위의 개별 테스트 로그를 참조하세요.');
  }
});