/**
 * 출퇴근 워크플로우 E2E 테스트
 * Playwright를 사용한 전체 사용자 여정 검증
 */

import { test, expect, Page } from '@playwright/test';

// 테스트 데이터
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: '김테스트'
};

const testOrganization = {
  name: '테스트 회사',
  address: '서울시 강남구'
};

test.describe('출퇴근 워크플로우 E2E 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그인 상태로 설정
    await page.goto('/login');
    
    // 위치 정보 허용
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 37.5665, longitude: 126.9780 });
  });

  test('전체 출퇴근 프로세스', async ({ page }) => {
    // 1. 로그인
    await test.step('사용자 로그인', async () => {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      
      const loginButton = page.locator('[data-testid="login-button"]');
      await expect(loginButton).toBeVisible();
      await expect(loginButton).toContainText('로그인');
      
      await loginButton.click();
      
      // 대시보드로 리다이렉트 확인
      await page.waitForURL('/dashboard');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    // 2. 대시보드 초기 상태 확인
    await test.step('대시보드 초기 상태 확인', async () => {
      // 사용자 인사말 확인
      const greeting = page.locator('[data-testid="user-greeting"]');
      await expect(greeting).toContainText(`안녕하세요, ${testUser.name}님!`);
      
      // 실시간 시계 확인
      const clock = page.locator('[data-testid="real-time-clock"]');
      await expect(clock).toBeVisible();
      
      // 현재 시간이 한국어 형식으로 표시되는지 확인
      const clockText = await clock.textContent();
      expect(clockText).toMatch(/\d{4}년 \d{1,2}월 \d{1,2}일/);
      
      // 출근 전 상태 확인
      const status = page.locator('[data-testid="attendance-status"]');
      await expect(status).toContainText('출근 전');
    });

    // 3. 출근 처리
    await test.step('출근 버튼 클릭 및 처리', async () => {
      const checkInButton = page.locator('[data-testid="check-in-button"]');
      await expect(checkInButton).toBeVisible();
      await expect(checkInButton).toContainText('출근하기');
      await expect(checkInButton).toBeEnabled();
      
      // 출근 버튼 클릭
      await checkInButton.click();
      
      // GPS 위치 확인 대화상자 처리 (필요시)
      const locationDialog = page.locator('[data-testid="location-confirmation"]');
      if (await locationDialog.isVisible()) {
        await page.click('[data-testid="confirm-location"]');
      }
      
      // 로딩 상태 확인
      await expect(checkInButton).toContainText('처리 중...');
      await expect(checkInButton).toBeDisabled();
      
      // 출근 완료 확인
      await expect(page.locator('[data-testid="attendance-status"]')).toContainText('출근 중');
      await expect(checkInButton).toContainText('출근 완료');
      
      // 출근 시간 기록 확인
      const checkInTime = page.locator('[data-testid="check-in-time"]');
      await expect(checkInTime).toBeVisible();
      const checkInTimeText = await checkInTime.textContent();
      expect(checkInTimeText).toMatch(/오[전후] \d{1,2}:\d{2}/);
    });

    // 4. 실시간 알림 확인
    await test.step('실시간 알림 수신 확인', async () => {
      const notificationCenter = page.locator('[data-testid="notification-center"]');
      await expect(notificationCenter).toBeVisible();
      
      // 출근 알림이 수신되었는지 확인
      const notification = page.locator('[data-testid="notification-item"]').first();
      await expect(notification).toContainText('출근이 완료되었습니다');
      
      // 알림 시간이 현재 시간과 유사한지 확인
      const notificationTime = page.locator('[data-testid="notification-time"]').first();
      await expect(notificationTime).toBeVisible();
    });

    // 5. 근무 시간 대기 (시뮬레이션)
    await test.step('근무 시간 시뮬레이션', async () => {
      // 시간 경과 시뮬레이션을 위해 시스템 시간 조작
      await page.evaluate(() => {
        // 8시간 후로 시간 설정
        const futureTime = new Date(Date.now() + 8 * 60 * 60 * 1000);
        jest.useFakeTimers();
        jest.setSystemTime(futureTime);
      });
      
      // 페이지 새로고침하여 시간 업데이트 반영
      await page.reload();
      
      // 근무 시간이 업데이트되었는지 확인
      const workingHours = page.locator('[data-testid="working-hours"]');
      await expect(workingHours).toContainText('8시간');
    });

    // 6. 퇴근 처리
    await test.step('퇴근 버튼 클릭 및 처리', async () => {
      const checkOutButton = page.locator('[data-testid="check-out-button"]');
      await expect(checkOutButton).toBeVisible();
      await expect(checkOutButton).toContainText('퇴근하기');
      await expect(checkOutButton).toBeEnabled();
      
      // 퇴근 버튼 클릭
      await checkOutButton.click();
      
      // 퇴근 완료 확인
      await expect(page.locator('[data-testid="attendance-status"]')).toContainText('퇴근 완료');
      await expect(checkOutButton).toContainText('퇴근 완료');
      
      // 퇴근 시간 기록 확인
      const checkOutTime = page.locator('[data-testid="check-out-time"]');
      await expect(checkOutTime).toBeVisible();
      
      // 총 근무 시간 확인
      const totalWorkingTime = page.locator('[data-testid="total-working-time"]');
      await expect(totalWorkingTime).toContainText('8시간');
    });

    // 7. 출석 기록 확인
    await test.step('출석 기록 조회', async () => {
      await page.click('[data-testid="attendance-history-tab"]');
      
      // 오늘의 출석 기록 확인
      const todayRecord = page.locator('[data-testid="today-attendance-record"]');
      await expect(todayRecord).toBeVisible();
      
      // 출근 시간, 퇴근 시간, 총 근무시간 표시 확인
      await expect(todayRecord.locator('[data-testid="record-check-in"]')).toBeVisible();
      await expect(todayRecord.locator('[data-testid="record-check-out"]')).toBeVisible();
      await expect(todayRecord.locator('[data-testid="record-total-hours"]')).toContainText('8시간');
    });
  });

  test('QR 코드를 이용한 출퇴근', async ({ page }) => {
    await test.step('사용자 로그인', async () => {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
    });

    await test.step('QR 스캔 모드 전환', async () => {
      // QR 스캔 탭으로 이동
      await page.click('[data-testid="qr-scan-tab"]');
      
      // 카메라 권한 허용
      await page.context().grantPermissions(['camera']);
      
      // QR 스캐너 활성화
      const scanButton = page.locator('[data-testid="start-scan-button"]');
      await expect(scanButton).toBeVisible();
      await expect(scanButton).toContainText('스캔 시작');
      
      await scanButton.click();
      
      // 카메라 피드 확인
      const videoElement = page.locator('[data-testid="qr-scanner-video"]');
      await expect(videoElement).toBeVisible();
    });

    await test.step('QR 코드 스캔 시뮬레이션', async () => {
      // QR 스캔 결과 시뮬레이션
      await page.evaluate(() => {
        const scanner = document.querySelector('[data-testid="qr-scanner-video"]');
        const event = new CustomEvent('qr-scan', {
          detail: 'encrypted-qr-attendance-data'
        });
        scanner?.dispatchEvent(event);
      });
      
      // 스캔 결과 처리 확인
      await expect(page.locator('[data-testid="scan-result"]')).toContainText('QR 코드 인식됨');
      
      // 출석 처리 확인
      await expect(page.locator('[data-testid="attendance-status"]')).toContainText('출근 중');
      
      // 성공 메시지 확인
      const successMessage = page.locator('[data-testid="qr-success-message"]');
      await expect(successMessage).toContainText('QR 코드로 출근이 완료되었습니다');
    });
  });

  test('오프라인 상태에서의 출석 처리', async ({ page }) => {
    await test.step('사용자 로그인', async () => {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
    });

    await test.step('오프라인 모드 전환', async () => {
      // 네트워크 연결 끊기
      await page.context().setOffline(true);
      
      // 오프라인 표시 확인
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      await expect(offlineIndicator).toBeVisible();
      await expect(offlineIndicator).toContainText('인터넷 연결이 끊어졌습니다');
    });

    await test.step('오프라인 출근 처리', async () => {
      const checkInButton = page.locator('[data-testid="check-in-button"]');
      await checkInButton.click();
      
      // 오프라인 출근 성공 메시지
      const offlineMessage = page.locator('[data-testid="offline-checkin-message"]');
      await expect(offlineMessage).toContainText('오프라인 출근이 기록되었습니다');
      await expect(offlineMessage).toContainText('인터넷 연결 시 자동으로 동기화됩니다');
      
      // 로컬 저장 확인
      const pendingSync = page.locator('[data-testid="pending-sync-indicator"]');
      await expect(pendingSync).toBeVisible();
      await expect(pendingSync).toContainText('동기화 대기 중: 1건');
    });

    await test.step('온라인 복구 및 동기화', async () => {
      // 네트워크 연결 복구
      await page.context().setOffline(false);
      
      // 자동 동기화 확인
      await expect(page.locator('[data-testid="sync-success-message"]')).toContainText('출석 기록이 동기화되었습니다');
      
      // 동기화 대기 표시 사라짐 확인
      const pendingSync = page.locator('[data-testid="pending-sync-indicator"]');
      await expect(pendingSync).not.toBeVisible();
      
      // 서버 상태와 일치하는지 확인
      const attendanceStatus = page.locator('[data-testid="attendance-status"]');
      await expect(attendanceStatus).toContainText('출근 중');
    });
  });

  test('관리자 실시간 모니터링', async ({ page }) => {
    // 관리자 계정으로 로그인
    const adminUser = {
      email: 'admin@example.com',
      password: 'adminpass123'
    };

    await test.step('관리자 로그인', async () => {
      await page.fill('[data-testid="email-input"]', adminUser.email);
      await page.fill('[data-testid="password-input"]', adminUser.password);
      await page.click('[data-testid="login-button"]');
      
      // 관리자 대시보드로 리다이렉트 확인
      await page.waitForURL('/admin/dashboard');
      await expect(page).toHaveURL(/.*admin\/dashboard/);
    });

    await test.step('실시간 직원 현황 확인', async () => {
      // 실시간 직원 목록 확인
      const employeeList = page.locator('[data-testid="real-time-employee-list"]');
      await expect(employeeList).toBeVisible();
      
      // 출근한 직원 표시 확인
      const checkedInEmployees = page.locator('[data-testid="checked-in-employee"]');
      await expect(checkedInEmployees).toHaveCount.greaterThan(0);
      
      // 각 직원의 상태 표시 확인
      const firstEmployee = checkedInEmployees.first();
      await expect(firstEmployee.locator('[data-testid="employee-name"]')).toBeVisible();
      await expect(firstEmployee.locator('[data-testid="check-in-time"]')).toBeVisible();
      await expect(firstEmployee.locator('[data-testid="status-indicator"]')).toContainText('출근 중');
    });

    await test.step('실시간 통계 확인', async () => {
      // 실시간 통계 위젯들 확인
      const totalEmployees = page.locator('[data-testid="total-employees-count"]');
      const checkedInCount = page.locator('[data-testid="checked-in-count"]');
      const pendingCount = page.locator('[data-testid="pending-approval-count"]');
      
      await expect(totalEmployees).toBeVisible();
      await expect(checkedInCount).toBeVisible();
      await expect(pendingCount).toBeVisible();
      
      // 숫자 형식 확인
      const checkedInText = await checkedInCount.textContent();
      expect(checkedInText).toMatch(/\d+명/);
    });

    await test.step('실시간 업데이트 확인', async () => {
      // 새로운 출근 시뮬레이션
      await page.evaluate(() => {
        // WebSocket을 통한 실시간 업데이트 시뮬레이션
        window.dispatchEvent(new CustomEvent('attendance-update', {
          detail: {
            type: 'check-in',
            employee: { id: 'emp-123', name: '김신입' },
            timestamp: new Date().toISOString()
          }
        }));
      });
      
      // 실시간 알림 표시 확인
      const realtimeNotification = page.locator('[data-testid="realtime-notification"]');
      await expect(realtimeNotification).toBeVisible();
      await expect(realtimeNotification).toContainText('김신입님이 출근하셨습니다');
      
      // 통계 자동 업데이트 확인
      const updatedCount = page.locator('[data-testid="checked-in-count"]');
      await expect(updatedCount).toBeVisible();
    });
  });

  test('크로스 브라우저 호환성', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari는 일부 기능 제한');

    await test.step('브라우저별 로그인 테스트', async () => {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      // 브라우저별 특이사항 확인
      if (browserName === 'firefox') {
        // Firefox 특정 검증
        await expect(page.locator('[data-testid="firefox-warning"]')).not.toBeVisible();
      }
    });

    await test.step('브라우저별 기능 테스트', async () => {
      // GPS 기능
      const checkInButton = page.locator('[data-testid="check-in-button"]');
      await checkInButton.click();
      
      if (browserName === 'chromium') {
        // Chrome 특정 GPS 처리
        await expect(page.locator('[data-testid="gps-accuracy"]')).toBeVisible();
      }
      
      // 기본 출근 처리는 모든 브라우저에서 동작해야 함
      await expect(page.locator('[data-testid="attendance-status"]')).toContainText('출근 중');
    });
  });

  test('성능 및 로딩 시간 검증', async ({ page }) => {
    await test.step('페이지 로딩 성능 측정', async () => {
      const startTime = Date.now();
      
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // 페이지 로딩이 2초 이내에 완료되어야 함
      expect(loadTime).toBeLessThan(2000);
    });

    await test.step('출근 처리 응답 시간 측정', async () => {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
      
      const startTime = Date.now();
      
      await page.click('[data-testid="check-in-button"]');
      await expect(page.locator('[data-testid="attendance-status"]')).toContainText('출근 중');
      
      const responseTime = Date.now() - startTime;
      
      // 출근 처리가 1초 이내에 완료되어야 함
      expect(responseTime).toBeLessThan(1000);
    });
  });
});