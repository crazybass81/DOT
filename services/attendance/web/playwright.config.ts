/**
 * Playwright E2E 테스트 설정
 * 크로스 브라우저 테스트 및 성능 검증
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  
  // 테스트 실행 설정
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // 리포터 설정
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-results.xml' }],
    process.env.CI ? ['github'] : ['line']
  ],

  // 글로벌 설정
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3002',
    
    // 스크린샷 및 비디오 설정
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 한국어 로케일 설정
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    
    // 성능 테스트를 위한 타임아웃 설정
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // 자동 대기 설정
    waitForLoadState: 'networkidle',
  },

  // 테스트 프로젝트 설정 (크로스 브라우저)
  projects: [
    // 데스크톱 브라우저
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // GPS 모킹을 위한 권한 설정
        permissions: ['geolocation'],
        geolocation: { latitude: 37.5665, longitude: 126.9780 },
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        permissions: ['geolocation'],
        geolocation: { latitude: 37.5665, longitude: 126.9780 },
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        permissions: ['geolocation'],
        geolocation: { latitude: 37.5665, longitude: 126.9780 },
      },
    },

    // 모바일 브라우저
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        permissions: ['geolocation', 'camera'],
        geolocation: { latitude: 37.5665, longitude: 126.9780 },
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        permissions: ['geolocation', 'camera'],
        geolocation: { latitude: 37.5665, longitude: 126.9780 },
      },
    },

    // 태블릿
    {
      name: 'iPad',
      use: { 
        ...devices['iPad Pro'],
        permissions: ['geolocation', 'camera'],
        geolocation: { latitude: 37.5665, longitude: 126.9780 },
      },
    },

    // 성능 테스트용 프로젝트
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['geolocation'],
        geolocation: { latitude: 37.5665, longitude: 126.9780 },
        // 네트워크 속도 제한
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
      testMatch: /.*performance.*\.spec\.ts/,
    },

    // 접근성 테스트용 프로젝트
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // 스크린 리더 시뮬레이션
        reducedMotion: 'reduce',
        forcedColors: 'active',
      },
      testMatch: /.*accessibility.*\.spec\.ts/,
    }
  ],

  // 개발 서버 설정
  webServer: {
    command: 'npm run dev',
    port: 3002,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test',
      // 테스트용 환경 변수
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key',
    }
  },

  // 전역 설정
  globalSetup: './__tests__/e2e/global-setup.ts',
  globalTeardown: './__tests__/e2e/global-teardown.ts',

  // 출력 디렉토리
  outputDir: 'test-results/playwright-artifacts',

  // 메타데이터
  metadata: {
    platform: process.platform,
    node: process.version,
    ci: !!process.env.CI,
  },

  // 테스트 설정
  timeout: 60000,
  expect: {
    timeout: 10000,
    // 스크린샷 비교 설정
    toHaveScreenshot: {
      mode: 'strict',
      threshold: 0.2,
    },
    toMatchScreenshot: {
      mode: 'strict',
      threshold: 0.2,
    }
  },
});