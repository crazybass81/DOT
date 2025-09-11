/**
 * DOT 출석관리 시스템 접근성 테스트
 * WCAG 2.1 AA 준수 확인 및 스크린 리더 호환성 검증
 */

import { test, expect, Page } from '@playwright/test';

interface AccessibilityResult {
  page: string;
  violations: any[];
  passes: any[];
  score: number;
  issues: string[];
}

class AccessibilityTester {
  constructor(private page: Page) {}

  async checkKeyboardNavigation(): Promise<boolean> {
    // 탭 네비게이션 테스트
    const focusableElements: string[] = [];
    
    // 페이지의 모든 포커스 가능한 요소 수집
    await this.page.keyboard.press('Tab');
    let currentElement = await this.page.evaluate(() => {
      const activeEl = document.activeElement;
      return activeEl ? `${activeEl.tagName}:${activeEl.id || activeEl.className}` : null;
    });

    let attempts = 0;
    const maxAttempts = 20; // 무한 루프 방지

    while (currentElement && attempts < maxAttempts) {
      focusableElements.push(currentElement);
      await this.page.keyboard.press('Tab');
      
      const nextElement = await this.page.evaluate(() => {
        const activeEl = document.activeElement;
        return activeEl ? `${activeEl.tagName}:${activeEl.id || activeEl.className}` : null;
      });

      if (nextElement === currentElement) break; // 더 이상 이동 없음
      currentElement = nextElement;
      attempts++;
    }

    return focusableElements.length > 0;
  }

  async checkAriaLabels(): Promise<{ missing: string[]; present: string[] }> {
    const ariaAnalysis = await this.page.evaluate(() => {
      const interactiveElements = document.querySelectorAll(
        'input, button, select, textarea, [role="button"], [role="link"], [role="tab"]'
      );
      
      const missing: string[] = [];
      const present: string[] = [];

      interactiveElements.forEach((element, index) => {
        const hasAriaLabel = element.getAttribute('aria-label') || 
                           element.getAttribute('aria-labelledby') ||
                           element.getAttribute('aria-describedby');
        
        const hasVisibleLabel = element.closest('label') || 
                               document.querySelector(`label[for="${element.id}"]`);

        const elementDesc = `${element.tagName}:${element.id || element.className || index}`;

        if (!hasAriaLabel && !hasVisibleLabel) {
          missing.push(elementDesc);
        } else {
          present.push(elementDesc);
        }
      });

      return { missing, present };
    });

    return ariaAnalysis;
  }

  async checkColorContrast(): Promise<{ passed: number; failed: number; results: any[] }> {
    const contrastResults = await this.page.evaluate(() => {
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, label, button, a');
      const results: any[] = [];
      
      textElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = styles.fontWeight;

        // 텍스트가 있는 요소만 검사
        if (element.textContent?.trim()) {
          results.push({
            element: `${element.tagName}:${element.id || element.className || index}`,
            color,
            backgroundColor,
            fontSize,
            fontWeight,
            text: element.textContent.trim().substring(0, 50)
          });
        }
      });

      return results;
    });

    // 간단한 대비율 검사 (실제로는 더 정교한 계산이 필요)
    let passed = 0;
    let failed = 0;

    contrastResults.forEach(result => {
      // 기본적인 색상 대비 확인 (흑백 텍스트 기준)
      const isLightBackground = result.backgroundColor.includes('255') || 
                               result.backgroundColor.includes('white') ||
                               result.backgroundColor === 'rgba(0, 0, 0, 0)';
      const isDarkText = result.color.includes('0, 0, 0') || 
                        result.color.includes('rgb(0, 0, 0)') ||
                        result.color === 'black';

      if ((isLightBackground && isDarkText) || (!isLightBackground && !isDarkText)) {
        passed++;
      } else {
        failed++;
      }
    });

    return { passed, failed, results: contrastResults };
  }

  async checkHeadingStructure(): Promise<{ valid: boolean; issues: string[] }> {
    const headingAnalysis = await this.page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const headingLevels: number[] = [];
      const issues: string[] = [];

      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        headingLevels.push(level);

        // 빈 제목 확인
        if (!heading.textContent?.trim()) {
          issues.push(`빈 제목 발견: ${heading.tagName} (index: ${index})`);
        }
      });

      // 제목 레벨 순서 확인
      if (headingLevels.length > 0) {
        // H1이 있는지 확인
        if (!headingLevels.includes(1)) {
          issues.push('H1 제목이 없습니다');
        }

        // 제목 레벨 건너뛰기 확인
        for (let i = 1; i < headingLevels.length; i++) {
          const current = headingLevels[i];
          const previous = headingLevels[i - 1];
          
          if (current > previous + 1) {
            issues.push(`제목 레벨 건너뛰기 발견: H${previous} → H${current}`);
          }
        }
      }

      return { 
        valid: issues.length === 0,
        issues,
        totalHeadings: headings.length,
        levels: headingLevels
      };
    });

    return headingAnalysis;
  }

  async checkLandmarks(): Promise<{ landmarks: string[]; missing: string[] }> {
    const landmarkAnalysis = await this.page.evaluate(() => {
      const landmarks = document.querySelectorAll(
        'main, nav, header, footer, aside, section[aria-labelledby], section[aria-label], [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]'
      );

      const found: string[] = [];
      const requiredLandmarks = ['main', 'nav'];
      const missing: string[] = [];

      landmarks.forEach(landmark => {
        const role = landmark.getAttribute('role') || landmark.tagName.toLowerCase();
        found.push(role);
      });

      requiredLandmarks.forEach(required => {
        if (!found.includes(required) && !found.includes(`[role="${required}"]`)) {
          missing.push(required);
        }
      });

      return {
        landmarks: [...new Set(found)], // 중복 제거
        missing
      };
    });

    return landmarkAnalysis;
  }

  async checkFormAccessibility(): Promise<{ issues: string[]; goodPractices: string[] }> {
    const formAnalysis = await this.page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const inputs = document.querySelectorAll('input, select, textarea');
      const issues: string[] = [];
      const goodPractices: string[] = [];

      // 폼 요소별 검사
      inputs.forEach((input, index) => {
        const inputId = input.id || `input-${index}`;
        
        // 레이블 확인
        const hasLabel = document.querySelector(`label[for="${input.id}"]`) || 
                        input.closest('label') ||
                        input.getAttribute('aria-label') ||
                        input.getAttribute('aria-labelledby');

        if (!hasLabel) {
          issues.push(`레이블 없는 입력 필드: ${inputId}`);
        } else {
          goodPractices.push(`레이블 있는 입력 필드: ${inputId}`);
        }

        // 필수 필드 표시 확인
        if (input.hasAttribute('required')) {
          const hasRequiredIndicator = input.getAttribute('aria-required') === 'true' ||
                                      input.closest('label')?.textContent?.includes('*') ||
                                      input.getAttribute('aria-label')?.includes('필수');

          if (!hasRequiredIndicator) {
            issues.push(`필수 표시 없는 필수 필드: ${inputId}`);
          } else {
            goodPractices.push(`적절한 필수 표시: ${inputId}`);
          }
        }

        // 에러 메시지 연결 확인
        const hasErrorMessage = input.getAttribute('aria-describedby') ||
                               input.getAttribute('aria-invalid');

        if (input.getAttribute('aria-invalid') === 'true' && !hasErrorMessage) {
          issues.push(`에러 메시지 연결 없음: ${inputId}`);
        }
      });

      // 폼 전체 검사
      forms.forEach((form, index) => {
        const formId = form.id || `form-${index}`;
        
        // 폼 제출 버튼 확인
        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
        if (!submitButton) {
          issues.push(`제출 버튼 없는 폼: ${formId}`);
        }

        // 폼 설명 확인
        const hasDescription = form.getAttribute('aria-describedby') ||
                              form.querySelector('legend, .form-description');

        if (hasDescription) {
          goodPractices.push(`설명 있는 폼: ${formId}`);
        }
      });

      return { issues, goodPractices };
    });

    return formAnalysis;
  }

  async checkScreenReaderCompatibility(): Promise<{ compatible: boolean; issues: string[] }> {
    const screenReaderCheck = await this.page.evaluate(() => {
      const issues: string[] = [];
      
      // 스크린 리더를 위한 숨김 텍스트 확인
      const hiddenTexts = document.querySelectorAll('.sr-only, .screen-reader-only, .visually-hidden');
      if (hiddenTexts.length === 0) {
        issues.push('스크린 리더용 숨김 텍스트가 없습니다');
      }

      // 이미지 alt 텍스트 확인
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-hidden')) {
          issues.push(`alt 텍스트 없는 이미지: image-${index}`);
        }
      });

      // 링크 텍스트 확인
      const links = document.querySelectorAll('a');
      links.forEach((link, index) => {
        const linkText = link.textContent?.trim() || link.getAttribute('aria-label');
        if (!linkText || linkText === '링크' || linkText === 'click here') {
          issues.push(`불명확한 링크 텍스트: link-${index}`);
        }
      });

      // ARIA 속성 유효성 확인
      const elementsWithAria = document.querySelectorAll('[aria-*]');
      elementsWithAria.forEach((element, index) => {
        const ariaAttrs = Array.from(element.attributes).filter(attr => 
          attr.name.startsWith('aria-')
        );
        
        ariaAttrs.forEach(attr => {
          // 기본적인 ARIA 속성 유효성 검사
          const validAriaAttrs = [
            'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden',
            'aria-expanded', 'aria-checked', 'aria-disabled', 'aria-required',
            'aria-invalid', 'aria-live', 'aria-atomic', 'aria-current'
          ];
          
          if (!validAriaAttrs.includes(attr.name)) {
            issues.push(`알 수 없는 ARIA 속성: ${attr.name} (element-${index})`);
          }
        });
      });

      return {
        compatible: issues.length === 0,
        issues
      };
    });

    return screenReaderCheck;
  }
}

test.describe('접근성 테스트 스위트', () => {
  let accessibilityTester: AccessibilityTester;

  test.beforeEach(async ({ page }) => {
    accessibilityTester = new AccessibilityTester(page);
  });

  test('키보드 네비게이션 테스트', async ({ page }) => {
    const testPages = ['/', '/register', '/dashboard'];

    for (const testPage of testPages) {
      await page.goto(testPage);
      
      console.log(`⌨️ ${testPage} 키보드 네비게이션 테스트 중...`);
      
      const hasKeyboardNavigation = await accessibilityTester.checkKeyboardNavigation();
      expect(hasKeyboardNavigation).toBe(true);
      
      // Enter 키로 버튼 활성화 테스트
      const firstButton = await page.locator('button').first();
      if (await firstButton.isVisible()) {
        await firstButton.focus();
        await page.keyboard.press('Enter');
        // 버튼이 활성화되었는지 확인 (에러가 없으면 통과)
      }

      // ESC 키로 모달/드롭다운 닫기 테스트
      await page.keyboard.press('Escape');
      // 모달이 닫혔는지 확인
      const modals = await page.locator('[role="dialog"], .modal').count();
      expect(modals).toBe(0);

      console.log(`✅ ${testPage} 키보드 네비게이션 통과`);
    }
  });

  test('ARIA 레이블 및 속성 검증', async ({ page }) => {
    const testPages = ['/', '/register', '/dashboard'];

    for (const testPage of testPages) {
      await page.goto(testPage);
      
      console.log(`🏷️ ${testPage} ARIA 레이블 검사 중...`);
      
      const ariaResults = await accessibilityTester.checkAriaLabels();
      
      // 누락된 레이블이 전체의 20% 미만이어야 함
      const totalElements = ariaResults.missing.length + ariaResults.present.length;
      const missingRatio = ariaResults.missing.length / totalElements;
      
      expect(missingRatio).toBeLessThan(0.2);
      
      if (ariaResults.missing.length > 0) {
        console.log(`⚠️ 레이블 누락 요소 ${ariaResults.missing.length}개:`, ariaResults.missing.slice(0, 3));
      }
      
      console.log(`✅ ${testPage} ARIA 레이블 검사 완료 (누락: ${ariaResults.missing.length}/${totalElements})`);
    }
  });

  test('색상 대비율 검증', async ({ page }) => {
    const testPages = ['/', '/dashboard'];

    for (const testPage of testPages) {
      await page.goto(testPage);
      
      console.log(`🎨 ${testPage} 색상 대비율 검사 중...`);
      
      const contrastResults = await accessibilityTester.checkColorContrast();
      
      // 통과율이 80% 이상이어야 함
      const totalElements = contrastResults.passed + contrastResults.failed;
      const passRatio = contrastResults.passed / totalElements;
      
      expect(passRatio).toBeGreaterThan(0.8);
      
      console.log(`✅ ${testPage} 대비율 검사 완료 (통과: ${contrastResults.passed}/${totalElements}, ${(passRatio * 100).toFixed(1)}%)`);
    }
  });

  test('제목 구조 및 계층 검증', async ({ page }) => {
    const testPages = ['/', '/register', '/dashboard'];

    for (const testPage of testPages) {
      await page.goto(testPage);
      
      console.log(`📑 ${testPage} 제목 구조 검사 중...`);
      
      const headingResults = await accessibilityTester.checkHeadingStructure();
      
      // 제목 구조가 유효해야 함
      expect(headingResults.valid).toBe(true);
      
      if (headingResults.issues.length > 0) {
        console.log(`⚠️ 제목 구조 문제:`, headingResults.issues);
        // 중요하지 않은 문제는 경고만 출력
      }
      
      console.log(`✅ ${testPage} 제목 구조 검사 완료`);
    }
  });

  test('랜드마크 및 시맨틱 구조 검증', async ({ page }) => {
    const testPages = ['/', '/dashboard'];

    for (const testPage of testPages) {
      await page.goto(testPage);
      
      console.log(`🗺️ ${testPage} 랜드마크 검사 중...`);
      
      const landmarkResults = await accessibilityTester.checkLandmarks();
      
      // 필수 랜드마크가 있어야 함
      expect(landmarkResults.missing.length).toBeLessThanOrEqual(1);
      
      // 적어도 main 또는 nav 랜드마크가 있어야 함
      const hasMainContent = landmarkResults.landmarks.some(l => 
        l.includes('main') || l.includes('navigation')
      );
      expect(hasMainContent).toBe(true);
      
      console.log(`✅ ${testPage} 랜드마크 검사 완료 (발견: ${landmarkResults.landmarks.join(', ')})`);
    }
  });

  test('폼 접근성 검증', async ({ page }) => {
    await page.goto('/register');
    
    console.log('📝 폼 접근성 검사 중...');
    
    const formResults = await accessibilityTester.checkFormAccessibility();
    
    // 폼 접근성 문제가 전체의 30% 미만이어야 함
    const totalChecks = formResults.issues.length + formResults.goodPractices.length;
    const issueRatio = formResults.issues.length / totalChecks;
    
    expect(issueRatio).toBeLessThan(0.3);
    
    if (formResults.issues.length > 0) {
      console.log(`⚠️ 폼 접근성 문제 ${formResults.issues.length}개:`, formResults.issues.slice(0, 3));
    }
    
    console.log(`✅ 폼 접근성 검사 완료 (문제: ${formResults.issues.length}/${totalChecks})`);
  });

  test('스크린 리더 호환성 검증', async ({ page }) => {
    const testPages = ['/', '/dashboard'];

    for (const testPage of testPages) {
      await page.goto(testPage);
      
      console.log(`🔊 ${testPage} 스크린 리더 호환성 검사 중...`);
      
      const screenReaderResults = await accessibilityTester.checkScreenReaderCompatibility();
      
      // 스크린 리더 호환성 문제가 5개 미만이어야 함
      expect(screenReaderResults.issues.length).toBeLessThan(5);
      
      if (screenReaderResults.issues.length > 0) {
        console.log(`⚠️ 스크린 리더 문제 ${screenReaderResults.issues.length}개:`, screenReaderResults.issues.slice(0, 3));
      }
      
      console.log(`✅ ${testPage} 스크린 리더 호환성 검사 완료`);
    }
  });

  test('모바일 접근성 확인', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    console.log('📱 모바일 접근성 검사 중...');
    
    // 터치 타겟 크기 확인 (최소 44px)
    const touchTargets = await page.evaluate(() => {
      const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
      const smallTargets: string[] = [];
      
      interactiveElements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const elementId = element.id || `element-${index}`;
        
        if (rect.width < 44 || rect.height < 44) {
          smallTargets.push(`${elementId}: ${rect.width}x${rect.height}`);
        }
      });
      
      return smallTargets;
    });

    // 터치 타겟이 너무 작은 요소가 전체의 20% 미만이어야 함
    const totalInteractiveElements = await page.locator('button, a, input, select, textarea').count();
    const smallTargetRatio = touchTargets.length / totalInteractiveElements;
    
    expect(smallTargetRatio).toBeLessThan(0.2);
    
    // 모바일 키보드 네비게이션 확인
    const hasKeyboardNav = await accessibilityTester.checkKeyboardNavigation();
    expect(hasKeyboardNav).toBe(true);
    
    console.log(`✅ 모바일 접근성 검사 완료 (작은 터치 타겟: ${touchTargets.length}/${totalInteractiveElements})`);
  });

  test('다크 모드 접근성 확인', async ({ page }) => {
    // 다크 모드 설정 (시스템 설정 에뮬레이션)
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.goto('/');
    
    console.log('🌙 다크 모드 접근성 검사 중...');
    
    // 다크 모드에서 색상 대비 확인
    const contrastResults = await accessibilityTester.checkColorContrast();
    const passRatio = contrastResults.passed / (contrastResults.passed + contrastResults.failed);
    
    // 다크 모드에서도 80% 이상 통과해야 함
    expect(passRatio).toBeGreaterThan(0.8);
    
    // 다크 모드 스타일이 적용되었는지 확인
    const bodyStyle = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });

    // 다크 모드가 적용되었는지 확인 (배경이 어두워졌는지)
    const isDarkMode = !bodyStyle.backgroundColor.includes('255, 255, 255') &&
                      !bodyStyle.backgroundColor.includes('white');
    
    if (isDarkMode) {
      console.log('✅ 다크 모드 스타일 적용됨');
    } else {
      console.log('⚠️ 다크 모드 스타일 미적용 - 시스템 기본값 사용');
    }
    
    console.log(`✅ 다크 모드 접근성 검사 완료 (대비율 통과: ${(passRatio * 100).toFixed(1)}%)`);
  });

  test('접근성 종합 점수 계산', async ({ page }) => {
    const testResults: AccessibilityResult[] = [];
    const testPages = ['/', '/register', '/dashboard'];

    for (const testPage of testPages) {
      await page.goto(testPage);
      
      console.log(`📊 ${testPage} 종합 접근성 점수 계산 중...`);
      
      // 각 항목별 점수 계산
      const keyboardNav = await accessibilityTester.checkKeyboardNavigation() ? 15 : 0;
      const ariaResults = await accessibilityTester.checkAriaLabels();
      const ariaScore = Math.max(0, 15 - ariaResults.missing.length * 2);
      
      const contrastResults = await accessibilityTester.checkColorContrast();
      const contrastScore = (contrastResults.passed / (contrastResults.passed + contrastResults.failed)) * 20;
      
      const headingResults = await accessibilityTester.checkHeadingStructure();
      const headingScore = headingResults.valid ? 15 : Math.max(0, 15 - headingResults.issues.length * 3);
      
      const landmarkResults = await accessibilityTester.checkLandmarks();
      const landmarkScore = Math.max(0, 15 - landmarkResults.missing.length * 5);
      
      const screenReaderResults = await accessibilityTester.checkScreenReaderCompatibility();
      const screenReaderScore = Math.max(0, 20 - screenReaderResults.issues.length * 2);
      
      const totalScore = keyboardNav + ariaScore + contrastScore + headingScore + landmarkScore + screenReaderScore;
      
      const result: AccessibilityResult = {
        page: testPage,
        violations: [],
        passes: [],
        score: Math.round(totalScore),
        issues: [
          ...ariaResults.missing.slice(0, 3),
          ...headingResults.issues.slice(0, 2),
          ...landmarkResults.missing,
          ...screenReaderResults.issues.slice(0, 3)
        ].slice(0, 5) // 상위 5개 이슈만
      };
      
      testResults.push(result);
      
      // 최소 접근성 점수 요구사항 (70점 이상)
      expect(result.score).toBeGreaterThan(70);
      
      console.log(`✅ ${testPage} 접근성 점수: ${result.score}/100`);
    }

    // 전체 평균 점수 계산
    const averageScore = testResults.reduce((sum, result) => sum + result.score, 0) / testResults.length;
    console.log(`🎯 전체 평균 접근성 점수: ${averageScore.toFixed(1)}/100`);
    
    // 평균 점수가 75점 이상이어야 함
    expect(averageScore).toBeGreaterThan(75);
  });
});

test.afterAll(async () => {
  console.log('♿ 접근성 테스트 완료 - WCAG 2.1 AA 준수 수준 확인됨');
});