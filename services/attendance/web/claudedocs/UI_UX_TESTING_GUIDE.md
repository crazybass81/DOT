# UI/UX 통합 테스트 실행 가이드

## 개요
이 문서는 DOT 출석 관리 시스템의 UI/UX 통합 테스트 스위트 실행 방법과 모범 사례를 설명합니다.

## 테스트 환경 설정

### 1. 필수 의존성 설치
```bash
# 프로젝트 디렉토리로 이동
cd services/attendance/web

# 의존성 설치
npm install

# Playwright 브라우저 설치
npx playwright install
```

### 2. 환경 변수 설정
```bash
# .env.test 파일 생성
cp .env.example .env.test

# 테스트용 환경 변수 설정
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_supabase_key
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_attendance
```

### 3. 테스트 데이터베이스 설정
```bash
# Docker로 테스트 데이터베이스 시작
docker run --name test-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=test_attendance -p 5432:5432 -d postgres:14

# 테스트 데이터 설정
npm run setup:test-data
```

## 테스트 실행 명령어

### 단위 테스트
```bash
# 모든 단위 테스트 실행
npm run test:unit

# 특정 컴포넌트 테스트
npm run test:unit -- components/CheckInButton.test.tsx

# 커버리지와 함께 실행
npm run test:coverage
```

### UI/UX 통합 테스트
```bash
# UI/UX 통합 테스트 실행
npm run test:ui-ux

# 특정 페이지 테스트
npm run test:ui-ux -- --testNamePattern="로그인 페이지"

# 와치 모드로 실행
npm run test:ui-ux -- --watch
```

### E2E 테스트
```bash
# 모든 E2E 테스트 실행
npm run test:e2e

# 특정 브라우저에서만 실행
npm run test:e2e -- --project=chromium

# UI 모드로 실행 (디버깅용)
npm run test:e2e:ui

# 헤드리스 모드 해제
npm run test:e2e -- --headed
```

### 성능 테스트
```bash
# 성능 테스트 실행
npm run test:performance

# 특정 성능 테스트
npm run test:performance -- --testNamePattern="로드 테스트"

# 메모리 프로파일링과 함께
npm run test:performance -- --logHeapUsage
```

### 접근성 테스트
```bash
# 접근성 테스트 실행
npm run test:accessibility

# 특정 페이지 접근성 테스트
npm run test:accessibility -- --grep="로그인 페이지"
```

### 전체 테스트 스위트
```bash
# 모든 테스트 실행 (개발용)
npm run test:all

# CI/CD용 테스트 실행
npm run test:ci
```

## 테스트 작성 가이드

### 1. 단위 테스트 작성
```typescript
// 예시: components/CheckInButton.test.tsx
import { render, screen } from '@testing-library/react';
import { checkInButtonHelpers, mockGeolocation } from '../test-utils/ui-test-helpers';
import CheckInButton from './CheckInButton';

describe('CheckInButton', () => {
  beforeEach(() => {
    mockGeolocation();
  });

  test('출근 버튼이 올바르게 렌더링되어야 함', () => {
    render(<CheckInButton />);
    const button = checkInButtonHelpers.findCheckInButton();
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('출근하기');
  });
});
```

### 2. E2E 테스트 작성
```typescript
// 예시: e2e/new-feature.spec.ts
import { test, expect } from '@playwright/test';

test('새로운 기능 테스트', async ({ page }) => {
  await page.goto('/dashboard');
  
  // 한국어 UI 확인
  await expect(page.locator('h1')).toContainText('안녕하세요');
  
  // 기능 테스트
  await page.click('[data-testid="new-feature-button"]');
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
});
```

### 3. 성능 테스트 작성
```typescript
// 예시: performance/api-performance.test.ts
import { performanceHelpers } from '../test-utils/ui-test-helpers';

test('API 응답 시간 테스트', async () => {
  const responseTime = await performanceHelpers.measureInteractionTime(async () => {
    // API 호출 시뮬레이션
    await fetch('/api/attendance/check-in', { method: 'POST' });
  });

  performanceHelpers.expectFastResponse(responseTime, 500);
});
```

## 모범 사례

### 1. 테스트 데이터 관리
- 각 테스트는 독립적이어야 함
- 테스트 후 데이터 정리 필수
- Factory 함수 사용으로 일관된 테스트 데이터 생성

### 2. Mock 사용 지침
- 외부 서비스는 항상 Mock 처리
- GPS, 카메라 등 브라우저 API Mock 필수
- 실제 구현체와 유사한 Mock 동작 구현

### 3. 접근성 고려사항
- 모든 상호작용 요소에 적절한 aria-label 제공
- 키보드 네비게이션 테스트 포함
- 색상 대비 및 텍스트 크기 검증

### 4. 국제화 (i18n) 테스트
- 한국어 텍스트 렌더링 확인
- 날짜/시간 형식 한국 표준 준수
- 숫자 및 통화 형식 로케일 적용

### 5. 성능 최적화
- 컴포넌트 렌더링 시간 모니터링
- 메모리 사용량 추적
- 네트워크 요청 최소화

## 디버깅 가이드

### 1. 테스트 실패 시 디버깅
```bash
# 특정 테스트만 실행
npm run test:ui-ux -- --testNamePattern="실패한 테스트명"

# 디버그 모드로 실행
npm run test:ui-ux -- --runInBand --no-cache

# E2E 테스트 디버깅
npm run test:e2e:debug
```

### 2. 스크린샷 및 비디오 활용
```bash
# 실패 시 스크린샷 생성
npm run test:e2e -- --screenshot=only-on-failure

# 모든 테스트 비디오 녹화
npm run test:e2e -- --video=on
```

### 3. 로그 분석
```bash
# 자세한 로그와 함께 실행
npm run test:e2e -- --reporter=line --verbose

# 특정 브라우저 콘솔 로그 확인
npm run test:e2e -- --trace=on
```

## CI/CD 통합

### 1. GitHub Actions 워크플로우
- `.github/workflows/ui-ux-testing.yml` 파일 참조
- PR 생성 시 자동 테스트 실행
- 테스트 결과 코멘트 자동 생성

### 2. 품질 게이트
- 모든 테스트 통과 필수
- 코드 커버리지 85% 이상
- 성능 기준 충족 확인

### 3. 아티팩트 관리
- 테스트 결과 리포트 저장
- 실패 시 스크린샷/비디오 보관
- 성능 메트릭 히스토리 추적

## 문제 해결

### 1. 일반적인 문제
**Q: 테스트가 간헐적으로 실패합니다**
A: 
- `waitFor` 사용으로 비동기 처리 대기
- 고정된 타이머 대신 상태 기반 대기
- 테스트 간 데이터 격리 확인

**Q: E2E 테스트가 느립니다**
A:
- 병렬 실행 수 조정 (`--workers` 옵션)
- 불필요한 대기 시간 제거
- 테스트 데이터 최적화

**Q: Mock이 제대로 작동하지 않습니다**
A:
- Jest mock 초기화 확인
- Mock 순서 검토
- 실제 모듈과 Mock 인터페이스 일치 확인

### 2. 성능 문제
**메모리 사용량이 많습니다**
- 테스트 후 리소스 정리
- 대용량 테스트 데이터 최적화
- `--maxWorkers` 옵션으로 동시 실행 수 제한

**테스트 실행 시간이 깁니다**
- 테스트 범위 최적화
- 중복 테스트 제거
- 병렬 실행 활용

## 연락처 및 지원
- 개발팀 Slack: #dot-development
- 이슈 리포트: GitHub Issues
- 문서 업데이트: 개발팀에 요청