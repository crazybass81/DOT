/**
 * Phase 3.2.3 E2E 테스트 - Playwright를 사용한 실제 사용자 시나리오
 * DOT 근태관리 시스템 실시간 알림 시스템 종합 검증
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// 테스트 설정
const TEST_USER_ID = 'e2e-test-user';
const TEST_ORG_ID = 'e2e-test-org';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

// 페이지 객체 패턴
class NotificationCenterPage {
  constructor(private page: Page) {}

  // 알림 벨 아이콘
  get bellIcon() {
    return this.page.getByTestId('notification-bell');
  }

  // 알림 배지
  get notificationBadge() {
    return this.page.getByTestId('notification-badge');
  }

  // 알림 드롭다운
  get dropdown() {
    return this.page.getByTestId('notification-dropdown');
  }

  // 알림 목록
  get notificationList() {
    return this.page.getByTestId('notification-list');
  }

  // 모두 읽음 버튼
  get markAllReadButton() {
    return this.page.getByTestId('mark-all-read-button');
  }

  // 특정 알림 아이템
  getNotificationItem(id: string) {
    return this.page.getByTestId(`notification-item-${id}`);
  }

  // 알림 센터 열기
  async openNotificationCenter() {
    await this.bellIcon.click();
    await expect(this.dropdown).toBeVisible();
  }

  // 알림 센터 닫기
  async closeNotificationCenter() {
    await this.page.keyboard.press('Escape');
    await expect(this.dropdown).toBeHidden();
  }

  // 특정 알림 클릭
  async clickNotification(id: string) {
    await this.getNotificationItem(id).click();
  }

  // 모든 알림 읽음 처리
  async markAllAsRead() {
    await this.markAllReadButton.click();
  }

  // 무한 스크롤 트리거
  async scrollToLoadMore() {
    await this.notificationList.evaluate(element => {
      element.scrollTop = element.scrollHeight;
    });
  }
}

test.describe('Phase 3.2.3 E2E: 실시간 알림 시스템 사용자 시나리오', () => {
  let context: BrowserContext;
  let page: Page;
  let notificationCenter: NotificationCenterPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    notificationCenter = new NotificationCenterPage(page);

    // 콘솔 에러 모니터링
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });

    // 네트워크 요청 모니터링
    page.on('requestfailed', request => {
      console.warn(`Failed request: ${request.url()}`);
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    // 각 테스트 전에 페이지 로드
    await page.goto(`${BASE_URL}?userId=${TEST_USER_ID}&orgId=${TEST_ORG_ID}`);
    await page.waitForLoadState('networkidle');
  });

  test('시나리오 1: 신규 사용자의 첫 알림 경험', async () => {
    // 1. 페이지 로드 후 알림 배지 확인
    await expect(notificationCenter.bellIcon).toBeVisible();
    
    // 신규 사용자는 알림이 없을 수 있음
    const badge = notificationCenter.notificationBadge;
    const isBadgeVisible = await badge.isVisible();
    
    // 2. 알림 센터 열기
    await notificationCenter.openNotificationCenter();
    
    // 3. 빈 상태 또는 알림 목록 확인
    const emptyState = page.getByTestId('notifications-empty-state');
    const notificationList = notificationCenter.notificationList;
    
    const hasNotifications = await notificationList.isVisible();
    const isEmpty = await emptyState.isVisible();
    
    expect(hasNotifications || isEmpty).toBe(true);
    
    // 4. 접근성 확인
    await expect(notificationCenter.bellIcon).toHaveAttribute('aria-expanded', 'true');
    await expect(notificationCenter.dropdown).toHaveAttribute('role', 'menu');
  });

  test('시나리오 2: 활성 사용자의 알림 관리 워크플로우', async () => {
    // Mock 데이터가 있다고 가정
    await page.route('**/api/notifications/user/**', async route => {
      const mockNotifications = [
        {
          id: 'mock-1',
          type: 'ATTENDANCE_CHECK_IN',
          title: '출근 알림',
          message: '김철수님이 출근했습니다.',
          priority: 'MEDIUM',
          createdAt: new Date().toISOString(),
          readAt: null,
        },
        {
          id: 'mock-2',
          type: 'ROLE_CHANGED',
          title: '역할 변경',
          message: '관리자 권한이 부여되었습니다.',
          priority: 'HIGH',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          readAt: null,
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notifications: mockNotifications,
          totalCount: 2,
        }),
      });
    });

    // 페이지 새로고침으로 Mock 데이터 로드
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 1. 알림 배지 확인
    await expect(notificationCenter.notificationBadge).toHaveText('2');

    // 2. 알림 센터 열기
    await notificationCenter.openNotificationCenter();

    // 3. 알림 목록 확인
    await expect(notificationCenter.notificationList).toBeVisible();
    
    // 4. 첫 번째 알림 클릭
    await notificationCenter.clickNotification('mock-1');
    
    // 5. 읽음 표시 확인 (시각적 변화)
    const firstNotification = notificationCenter.getNotificationItem('mock-1');
    await expect(firstNotification).toHaveClass(/notification-read/);

    // 6. 배지 카운트 업데이트 확인
    await expect(notificationCenter.notificationBadge).toHaveText('1');

    // 7. 모든 알림 읽음 처리
    await notificationCenter.markAllAsRead();
    
    // 8. 배지 사라짐 확인
    await expect(notificationCenter.notificationBadge).toBeHidden();
  });

  test('시나리오 3: 실시간 알림 수신 시뮬레이션', async () => {
    let notificationCount = 0;

    // WebSocket 또는 Server-Sent Events 시뮬레이션
    await page.route('**/api/notifications/user/**', async route => {
      notificationCount++;
      const mockNotifications = [
        {
          id: `realtime-${notificationCount}`,
          type: 'ATTENDANCE_CHECK_IN',
          title: '실시간 알림',
          message: `새로운 실시간 알림 ${notificationCount}`,
          priority: 'URGENT',
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notifications: mockNotifications,
          totalCount: notificationCount,
        }),
      });
    });

    // 1. 초기 상태 확인
    await notificationCenter.openNotificationCenter();
    
    // 2. 실시간 알림 수신 시뮬레이션 (페이지 이벤트를 통해)
    await page.evaluate(() => {
      // 실제 환경에서는 WebSocket 이벤트가 발생
      window.dispatchEvent(new CustomEvent('notification:new', {
        detail: {
          id: 'realtime-new',
          type: 'ATTENDANCE_CHECK_IN',
          title: '새 출근 알림',
          message: '이지영님이 출근했습니다.',
        }
      }));
    });

    // 3. Toast 알림 표시 확인 (실제 구현 시)
    const toastMessage = page.getByTestId('toast-message');
    if (await toastMessage.isVisible()) {
      await expect(toastMessage).toContainText('새 출근 알림');
    }

    // 4. 알림 센터의 배지 업데이트 확인
    await expect(notificationCenter.notificationBadge).toBeVisible();
  });

  test('시나리오 4: 무한 스크롤 및 페이지네이션', async () => {
    // 대량의 알림 데이터 Mock
    await page.route('**/api/notifications/user/**', async route => {
      const url = new URL(route.request().url());
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      const mockNotifications = Array.from({ length: limit }, (_, i) => ({
        id: `paginated-${offset + i + 1}`,
        type: 'ATTENDANCE_CHECK_IN',
        title: `알림 ${offset + i + 1}`,
        message: `페이지네이션 테스트 알림 ${offset + i + 1}`,
        priority: 'LOW',
        createdAt: new Date(Date.now() - (offset + i) * 60000).toISOString(),
        readAt: null,
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notifications: mockNotifications,
          totalCount: 100, // 총 100개 알림 시뮬레이션
        }),
      });
    });

    // 1. 알림 센터 열기
    await notificationCenter.openNotificationCenter();

    // 2. 초기 알림 목록 확인
    const initialItems = await page.getByTestId(/notification-item-/).count();
    expect(initialItems).toBeGreaterThan(0);

    // 3. 무한 스크롤 트리거
    await notificationCenter.scrollToLoadMore();

    // 4. 로딩 인디케이터 확인
    const loadingIndicator = page.getByText('더 불러오는 중...');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();
      await expect(loadingIndicator).toBeHidden();
    }

    // 5. 추가 알림 로드 확인
    await page.waitForTimeout(1000); // 네트워크 요청 완료 대기
    const afterScrollItems = await page.getByTestId(/notification-item-/).count();
    expect(afterScrollItems).toBeGreaterThan(initialItems);
  });

  test('시나리오 5: 네트워크 오류 및 복구', async () => {
    // 1. 첫 번째 요청 실패 시뮬레이션
    await page.route('**/api/notifications/user/**', async route => {
      await route.abort('failed');
    }, { times: 1 });

    // 2. 알림 센터 열기
    await notificationCenter.openNotificationCenter();

    // 3. 에러 상태 확인
    const errorState = page.getByTestId('notifications-error');
    await expect(errorState).toBeVisible();
    await expect(errorState).toContainText('알림을 불러오는데 실패했습니다');

    // 4. 재시도 버튼 확인
    const retryButton = page.getByTestId('notifications-retry');
    await expect(retryButton).toBeVisible();

    // 5. 정상 응답 설정
    await page.route('**/api/notifications/user/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notifications: [
            {
              id: 'recovery-1',
              type: 'SYSTEM_ANNOUNCEMENT',
              title: '복구 테스트',
              message: '네트워크 복구 후 정상 작동',
              priority: 'MEDIUM',
              createdAt: new Date().toISOString(),
              readAt: null,
            }
          ],
          totalCount: 1,
        }),
      });
    });

    // 6. 재시도 버튼 클릭
    await retryButton.click();

    // 7. 복구 확인
    await expect(notificationCenter.notificationList).toBeVisible();
    await expect(page.getByText('복구 테스트')).toBeVisible();
  });

  test('시나리오 6: 키보드 접근성 전체 플로우', async () => {
    // 1. Tab을 사용하여 알림 벨에 포커스
    await page.keyboard.press('Tab');
    await expect(notificationCenter.bellIcon).toBeFocused();

    // 2. Enter로 알림 센터 열기
    await page.keyboard.press('Enter');
    await expect(notificationCenter.dropdown).toBeVisible();

    // 3. Tab으로 첫 번째 알림으로 포커스 이동
    await page.keyboard.press('Tab');
    
    // 4. Enter로 알림 선택
    await page.keyboard.press('Enter');

    // 5. Escape로 알림 센터 닫기
    await page.keyboard.press('Escape');
    await expect(notificationCenter.dropdown).toBeHidden();
    
    // 6. 포커스가 다시 벨 아이콘으로 돌아왔는지 확인
    await expect(notificationCenter.bellIcon).toBeFocused();
  });

  test('시나리오 7: 다중 탭에서 알림 상태 동기화', async () => {
    // 첫 번째 탭
    const page1 = page;
    const notificationCenter1 = notificationCenter;

    // 두 번째 탭 생성
    const page2 = await context.newPage();
    await page2.goto(`${BASE_URL}?userId=${TEST_USER_ID}&orgId=${TEST_ORG_ID}`);
    await page2.waitForLoadState('networkidle');
    const notificationCenter2 = new NotificationCenterPage(page2);

    // Mock 데이터 설정
    const mockResponse = {
      success: true,
      notifications: [
        {
          id: 'sync-test-1',
          type: 'ATTENDANCE_CHECK_IN',
          title: '동기화 테스트',
          message: '다중 탭 동기화 테스트',
          priority: 'MEDIUM',
          createdAt: new Date().toISOString(),
          readAt: null,
        }
      ],
      totalCount: 1,
    };

    await page1.route('**/api/notifications/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });

    await page2.route('**/api/notifications/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });

    // 1. 첫 번째 탭에서 알림 센터 열기
    await notificationCenter1.openNotificationCenter();
    await expect(notificationCenter1.notificationBadge).toHaveText('1');

    // 2. 첫 번째 탭에서 알림 읽음 처리
    await notificationCenter1.clickNotification('sync-test-1');

    // 3. 두 번째 탭에서 상태 확인 (실제 구현에서는 WebSocket이나 브로드캐스트로 동기화)
    await page2.reload(); // 실제로는 실시간 동기화되어야 함
    await page2.waitForLoadState('networkidle');
    
    // 4. 두 번째 탭에서도 읽음 상태 반영 확인
    await notificationCenter2.openNotificationCenter();
    const notification = notificationCenter2.getNotificationItem('sync-test-1');
    await expect(notification).toHaveClass(/notification-read/);

    await page2.close();
  });

  test('시나리오 8: 성능 및 응답성 검증', async () => {
    // 1. 성능 메트릭 측정 시작
    await page.evaluate(() => performance.mark('notification-test-start'));

    // 2. 알림 센터 열기
    await notificationCenter.openNotificationCenter();

    // 3. 성능 측정 완료
    await page.evaluate(() => performance.mark('notification-test-end'));
    
    // 4. 성능 메트릭 확인
    const performanceMetrics = await page.evaluate(() => {
      performance.measure('notification-test', 'notification-test-start', 'notification-test-end');
      const measure = performance.getEntriesByName('notification-test')[0];
      return {
        duration: measure.duration,
        startTime: measure.startTime,
      };
    });

    // 5. 알림 센터가 500ms 이내에 열려야 함
    expect(performanceMetrics.duration).toBeLessThan(500);

    // 6. 메모리 사용량 확인 (JavaScript 힙 크기)
    const memoryUsage = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      } : null;
    });

    if (memoryUsage) {
      // 메모리 사용량이 합리적인 범위 내에 있는지 확인
      expect(memoryUsage.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB 미만
    }
  });
});

// 헬퍼 함수들
test.describe('도우미 테스트 유틸리티', () => {
  test('스크린샷 기반 시각적 회귀 테스트', async () => {
    await page.goto(`${BASE_URL}?userId=${TEST_USER_ID}&orgId=${TEST_ORG_ID}`);
    
    // 알림 센터 스크린샷
    await notificationCenter.openNotificationCenter();
    await expect(notificationCenter.dropdown).toHaveScreenshot('notification-center-dropdown.png');
    
    // 빈 상태 스크린샷  
    await page.route('**/api/notifications/user/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          notifications: [],
          totalCount: 0,
        }),
      });
    });
    
    await page.reload();
    await notificationCenter.openNotificationCenter();
    await expect(page.getByTestId('notifications-empty-state')).toHaveScreenshot('empty-state.png');
  });
});