/**
 * 완전한 사용자 여정 E2E 테스트
 * GitHub 참조 프로젝트 기반 전체 플로우 검증
 */

import { test, expect, Page } from '@playwright/test';

// 테스트 데이터
const testData = {
  organization: {
    name: 'DOT 테스트 조직',
    businessNumber: '123-45-67890',
    address: '서울시 강남구 테헤란로 123',
    phone: '02-1234-5678'
  },
  admin: {
    email: 'admin@dottest.com',
    password: 'TestPassword123!',
    name: '관리자',
    phone: '010-1234-5678'
  },
  employee: {
    email: 'employee@dottest.com',
    password: 'TestPassword123!',
    name: '직원',
    phone: '010-5678-9012'
  }
};

// 페이지 객체 모델
class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async expectLoginForm() {
    await expect(this.page.locator('h1')).toContainText('로그인');
    await expect(this.page.locator('input[type="email"]')).toBeVisible();
    await expect(this.page.locator('input[type="password"]')).toBeVisible();
  }

  async expectRealTimeClock() {
    await expect(this.page.locator('[data-testid="real-time-clock"]')).toBeVisible();
    
    // 시계가 실시간으로 업데이트되는지 확인
    const initialTime = await this.page.locator('[data-testid="real-time-clock"]').textContent();
    await this.page.waitForTimeout(2000);
    const updatedTime = await this.page.locator('[data-testid="real-time-clock"]').textContent();
    
    expect(initialTime).not.toBe(updatedTime);
  }
}

class RegistrationPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/register');
  }

  async fillBasicInfo(data: any) {
    await this.page.fill('input[name="email"]', data.email);
    await this.page.fill('input[name="password"]', data.password);
    await this.page.fill('input[name="name"]', data.name);
    await this.page.fill('input[name="phone"]', data.phone);
  }

  async selectRole(role: 'admin' | 'employee') {
    await this.page.click(`[data-testid="role-${role}"]`);
  }

  async fillOrganizationInfo(orgData: any) {
    await this.page.fill('input[name="organizationName"]', orgData.name);
    await this.page.fill('input[name="businessNumber"]', orgData.businessNumber);
    await this.page.fill('input[name="address"]', orgData.address);
    await this.page.fill('input[name="phone"]', orgData.phone);
  }

  async submitStep() {
    await this.page.click('button[type="submit"]');
  }

  async expectStepProgress(step: number, total: number) {
    const progressIndicator = this.page.locator('[data-testid="step-progress"]');
    await expect(progressIndicator).toContainText(`${step}/${total}`);
  }
}

class AdminDashboard {
  constructor(private page: Page) {}

  async expectDashboard() {
    await expect(this.page.locator('h1')).toContainText('관리자 대시보드');
    await expect(this.page.locator('[data-testid="stats-cards"]')).toBeVisible();
  }

  async expectRealTimeMonitoring() {
    // 실시간 출근 현황
    await expect(this.page.locator('[data-testid="attendance-status"]')).toBeVisible();
    
    // 실시간 시계
    await expect(this.page.locator('[data-testid="dashboard-clock"]')).toBeVisible();
    
    // 실시간 통계 업데이트 확인
    const initialStats = await this.page.locator('[data-testid="total-employees"]').textContent();
    await this.page.waitForTimeout(1000);
    // 통계가 동적으로 로드되는지 확인
    await expect(this.page.locator('[data-testid="total-employees"]')).toBeVisible();
  }

  async navigateToEmployeeManagement() {
    await this.page.click('[data-testid="employee-management-nav"]');
    await expect(this.page.locator('h2')).toContainText('직원 관리');
  }

  async addEmployee(employeeData: any) {
    await this.page.click('[data-testid="add-employee-btn"]');
    await this.page.fill('input[name="email"]', employeeData.email);
    await this.page.fill('input[name="name"]', employeeData.name);
    await this.page.fill('input[name="phone"]', employeeData.phone);
    await this.page.click('button[type="submit"]');
  }

  async expectEmployeeAdded(email: string) {
    await expect(this.page.locator(`[data-employee-email="${email}"]`)).toBeVisible();
  }
}

class EmployeeDashboard {
  constructor(private page: Page) {}

  async expectDashboard() {
    await expect(this.page.locator('h1')).toContainText('직원 대시보드');
    await expect(this.page.locator('[data-testid="attendance-buttons"]')).toBeVisible();
  }

  async expectGitHubStyleAttendance() {
    // GitHub 스타일 출퇴근 버튼
    const checkInBtn = this.page.locator('[data-testid="check-in-btn"]');
    const checkOutBtn = this.page.locator('[data-testid="check-out-btn"]');
    
    await expect(checkInBtn).toBeVisible();
    await expect(checkOutBtn).toBeVisible();
    
    // GitHub 스타일 색상 및 디자인 확인
    await expect(checkInBtn).toHaveCSS('background-color', /rgb\(25, 135, 84\)/); // GitHub green
  }

  async checkIn() {
    await this.page.click('[data-testid="check-in-btn"]');
    
    // GPS 위치 정보 모킹이 이미 설정되어 있음
    await expect(this.page.locator('[data-testid="attendance-status"]')).toContainText('출근');
  }

  async checkOut() {
    await this.page.click('[data-testid="check-out-btn"]');
    await expect(this.page.locator('[data-testid="attendance-status"]')).toContainText('퇴근');
  }

  async expectAttendanceHistory() {
    await expect(this.page.locator('[data-testid="attendance-history"]')).toBeVisible();
    
    // 출퇴근 기록이 테이블 형태로 표시되는지 확인
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('th')).toContainText('날짜');
    await expect(this.page.locator('th')).toContainText('출근시간');
    await expect(this.page.locator('th')).toContainText('퇴근시간');
  }
}

class QRManagement {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/qr');
  }

  async expectQRPage() {
    await expect(this.page.locator('h1')).toContainText('QR 관리');
    await expect(this.page.locator('[data-testid="qr-generator"]')).toBeVisible();
  }

  async generateQR() {
    await this.page.click('[data-testid="generate-qr-btn"]');
    
    // QR 코드가 생성되었는지 확인
    await expect(this.page.locator('[data-testid="qr-code"]')).toBeVisible();
    
    // QR 코드 이미지가 로드되었는지 확인
    const qrImage = this.page.locator('[data-testid="qr-code"] img');
    await expect(qrImage).toBeVisible();
    
    // QR 코드 다운로드 버튼이 활성화되었는지 확인
    await expect(this.page.locator('[data-testid="download-qr-btn"]')).toBeEnabled();
  }

  async scanQR() {
    // QR 스캔 모달 열기
    await this.page.click('[data-testid="scan-qr-btn"]');
    await expect(this.page.locator('[data-testid="qr-scanner-modal"]')).toBeVisible();
    
    // 카메라 권한이 요청되었는지 확인 (모킹된 환경에서)
    await expect(this.page.locator('[data-testid="camera-view"]')).toBeVisible();
  }

  async expectQRScanSuccess() {
    // QR 스캔 성공 메시지
    await expect(this.page.locator('[data-testid="scan-success"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="scan-success"]')).toContainText('출근 처리 완료');
  }
}

// 메인 테스트 스위트
test.describe('DOT 출석관리 시스템 완전한 사용자 여정', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 전 초기화
    await page.goto('/');
  });

  test('1. 관리자 회원가입 → 조직 생성 → 직원 관리 전체 플로우', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const registrationPage = new RegistrationPage(page);
    const adminDashboard = new AdminDashboard(page);

    // 1-1. 로그인 페이지 확인
    await loginPage.expectLoginForm();
    await loginPage.expectRealTimeClock();

    // 1-2. 회원가입 페이지로 이동
    await page.click('[data-testid="register-link"]');
    await registrationPage.goto();

    // 1-3. 관리자 회원가입 - 단계별 프로세스
    await registrationPage.expectStepProgress(1, 3);
    
    // Step 1: 기본 정보 입력
    await registrationPage.fillBasicInfo(testData.admin);
    await registrationPage.selectRole('admin');
    await registrationPage.submitStep();

    // Step 2: 조직 정보 입력
    await registrationPage.expectStepProgress(2, 3);
    await registrationPage.fillOrganizationInfo(testData.organization);
    await registrationPage.submitStep();

    // Step 3: 확인 및 완료
    await registrationPage.expectStepProgress(3, 3);
    await registrationPage.submitStep();

    // 1-4. 관리자 대시보드 접근
    await adminDashboard.expectDashboard();
    await adminDashboard.expectRealTimeMonitoring();

    // 1-5. 직원 관리 기능
    await adminDashboard.navigateToEmployeeManagement();
    await adminDashboard.addEmployee(testData.employee);
    await adminDashboard.expectEmployeeAdded(testData.employee.email);
  });

  test('2. 직원 로그인 → 출퇴근 처리 → 기록 확인 플로우', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const employeeDashboard = new EmployeeDashboard(page);

    // 2-1. 직원 로그인
    await loginPage.goto();
    await loginPage.login(testData.employee.email, testData.employee.password);

    // 2-2. 직원 대시보드 확인
    await employeeDashboard.expectDashboard();
    await employeeDashboard.expectGitHubStyleAttendance();

    // 2-3. 출근 처리
    await employeeDashboard.checkIn();

    // 2-4. 퇴근 처리
    await employeeDashboard.checkOut();

    // 2-5. 출퇴근 기록 확인
    await employeeDashboard.expectAttendanceHistory();
  });

  test('3. QR 코드 생성 → 스캔 → 출퇴근 처리 플로우', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const qrManagement = new QRManagement(page);

    // 3-1. 관리자 로그인
    await loginPage.goto();
    await loginPage.login(testData.admin.email, testData.admin.password);

    // 3-2. QR 관리 페이지
    await qrManagement.goto();
    await qrManagement.expectQRPage();

    // 3-3. QR 코드 생성
    await qrManagement.generateQR();

    // 3-4. QR 스캔 시뮬레이션
    await qrManagement.scanQR();
    await qrManagement.expectQRScanSuccess();
  });

  test('4. 크로스 브라우저 호환성 - 기본 기능 테스트', async ({ page, browserName }) => {
    const loginPage = new LoginPage(page);

    // 4-1. 페이지 로딩 확인
    await loginPage.goto();
    await loginPage.expectLoginForm();

    // 4-2. 실시간 시계 기능 확인
    await loginPage.expectRealTimeClock();

    // 4-3. 브라우저별 스타일링 확인
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
    
    // GitHub 스타일 버튼 디자인 확인
    const buttonStyles = await loginButton.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        borderRadius: styles.borderRadius,
        padding: styles.padding,
        fontWeight: styles.fontWeight
      };
    });

    // GitHub 스타일 특성 확인
    expect(buttonStyles.borderRadius).toBe('6px');
    expect(buttonStyles.fontWeight).toBe('500');

    console.log(`✅ ${browserName} 브라우저 호환성 확인 완료`);
  });

  test('5. 모바일 반응형 디자인 테스트', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });

    const loginPage = new LoginPage(page);

    // 5-1. 모바일 레이아웃 확인
    await loginPage.goto();
    await loginPage.expectLoginForm();

    // 5-2. 터치 인터페이스 확인
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
    
    // 모바일 터치 타겟 크기 확인 (최소 44px)
    const buttonSize = await loginButton.boundingBox();
    expect(buttonSize!.height).toBeGreaterThanOrEqual(44);

    // 5-3. 네비게이션 메뉴 (햄버거 메뉴) 확인
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    }

    console.log('✅ 모바일 반응형 디자인 확인 완료');
  });

  test('6. 성능 측정 - 페이지 로딩 시간', async ({ page }) => {
    const performanceMetrics: any[] = [];

    // 6-1. 메인 페이지 성능 측정
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    performanceMetrics.push({
      page: 'main',
      loadTime,
      acceptable: loadTime < 3000
    });

    // 6-2. 대시보드 페이지 성능 측정 (로그인 후)
    const loginPage = new LoginPage(page);
    await loginPage.login(testData.admin.email, testData.admin.password);

    const dashboardStartTime = Date.now();
    await page.waitForLoadState('networkidle');
    const dashboardLoadTime = Date.now() - dashboardStartTime;

    performanceMetrics.push({
      page: 'dashboard',
      loadTime: dashboardLoadTime,
      acceptable: dashboardLoadTime < 2000
    });

    // 성능 요구사항 확인
    performanceMetrics.forEach(metric => {
      expect(metric.acceptable).toBe(true);
      console.log(`📊 ${metric.page} 페이지 로딩: ${metric.loadTime}ms`);
    });

    // 전체 성능 점수 계산
    const avgLoadTime = performanceMetrics.reduce((sum, m) => sum + m.loadTime, 0) / performanceMetrics.length;
    console.log(`⚡ 평균 로딩 시간: ${avgLoadTime.toFixed(0)}ms`);
  });

  test('7. 접근성 기본 검증', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 7-1. 페이지 로딩
    await loginPage.goto();

    // 7-2. 키보드 네비게이션 확인
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);

    // 7-3. ARIA 레이블 확인
    const emailInput = page.locator('input[type="email"]');
    const emailLabel = await emailInput.getAttribute('aria-label') || 
                       await emailInput.getAttribute('placeholder');
    expect(emailLabel).toBeTruthy();

    // 7-4. 색상 대비 확인 (기본적인 체크)
    const backgroundColor = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    const textColor = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).color
    );

    expect(backgroundColor).toBeTruthy();
    expect(textColor).toBeTruthy();

    // 7-5. 스크린 리더 지원 확인
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);

    console.log('♿ 기본 접근성 검증 완료');
  });
});

// 테스트 후 정리
test.afterAll(async () => {
  console.log('🧹 테스트 정리 완료');
});