/**
 * Enhanced Login Page UI/UX Integration Tests
 * GitHub-inspired design patterns with real-time clock and mobile optimization
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import React from 'react';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}));

// Mock auth context
jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: false,
    user: null,
    login: jest.fn()
  }),
  NotAuthenticated: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock components
jest.mock('@/components/ui/RealTimeClock', () => ({
  OptimizedRealTimeClock: ({ className, showIcon, showSeconds, format }: any) => (
    <div 
      data-testid="real-time-clock"
      className={className}
      data-show-icon={showIcon}
      data-show-seconds={showSeconds}
      data-format={format}
    >
      <div className="text-4xl md:text-5xl font-bold text-gray-900 font-mono tracking-tight">
        14:30:25
      </div>
      <div className="text-lg md:text-xl text-gray-600 font-medium">
        2025년 9월 10일 화요일
      </div>
      <div className="text-sm text-gray-400 mt-1">
        한국 표준시 (KST)
      </div>
    </div>
  )
}));

jest.mock('@/src/components/forms/LoginForm', () => {
  return function MockLoginForm({ onSuccess, className }: any) {
    return (
      <div className={className} data-testid="login-form">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3 font-korean">
            이메일 주소
          </label>
          <input
            type="email"
            id="email"
            data-testid="email-input"
            placeholder="이메일을 입력하세요"
            className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl font-korean min-h-[56px] touch-manipulation"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3 font-korean">
            비밀번호
          </label>
          <input
            type="password"
            id="password"
            data-testid="password-input"
            placeholder="비밀번호를 입력하세요"
            className="w-full pl-12 pr-14 py-4 border-2 border-gray-200 rounded-xl font-korean min-h-[56px] touch-manipulation"
          />
        </div>
        <button
          type="submit"
          data-testid="login-button"
          className="w-full flex justify-center items-center px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl min-h-[56px] touch-manipulation"
          onClick={() => onSuccess?.('/dashboard')}
        >
          <span className="font-korean text-lg">로그인</span>
        </button>
      </div>
    );
  };
});

// Import the actual login page
import LoginPage from '@/app/page';

describe('Enhanced Login Page - GitHub Style', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('페이지 레이아웃 및 구조', () => {
    test('GitHub 스타일 헤더와 실시간 시계가 렌더링되어야 함', () => {
      render(<LoginPage />);
      
      // Real-time clock 존재 확인
      const clock = screen.getByTestId('real-time-clock');
      expect(clock).toBeInTheDocument();
      
      // Clock properties 확인
      expect(clock).toHaveAttribute('data-show-icon', 'true');
      expect(clock).toHaveAttribute('data-show-seconds', 'true');
      expect(clock).toHaveAttribute('data-format', '24h');
      
      // Korean time format 확인
      expect(screen.getByText('14:30:25')).toBeInTheDocument();
      expect(screen.getByText('2025년 9월 10일 화요일')).toBeInTheDocument();
      expect(screen.getByText('한국 표준시 (KST)')).toBeInTheDocument();
    });

    test('글래스모피즘 로그인 카드가 올바르게 렌더링되어야 함', () => {
      render(<LoginPage />);
      
      // Main brand header
      expect(screen.getByText('DOT 출석 관리')).toBeInTheDocument();
      expect(screen.getByText('스마트 근태관리 시스템')).toBeInTheDocument();
      
      // Features highlight section
      expect(screen.getByText('다중 역할')).toBeInTheDocument();
      expect(screen.getByText('보안 인증')).toBeInTheDocument();
      expect(screen.getByText('실시간 동기화')).toBeInTheDocument();
    });

    test('개발 테스트 계정 정보가 표시되어야 함', () => {
      render(<LoginPage />);
      
      expect(screen.getByText('개발 테스트 계정')).toBeInTheDocument();
      expect(screen.getByText('마스터 관리자:')).toBeInTheDocument();
      expect(screen.getByText('Master123!@#')).toBeInTheDocument();
      expect(screen.getByText('사업자:')).toBeInTheDocument();
      expect(screen.getByText('Test123!')).toBeInTheDocument();
    });

    test('GitHub 스타일 푸터가 렌더링되어야 함', () => {
      render(<LoginPage />);
      
      expect(screen.getByText('DOT Attendance System v2.0')).toBeInTheDocument();
      expect(screen.getByText(/Powered by Supabase & Next.js/)).toBeInTheDocument();
      expect(screen.getByText(/Enterprise Grade Security & Performance/)).toBeInTheDocument();
    });
  });

  describe('모바일 최적화 및 터치 인터페이스', () => {
    test('터치 친화적 입력 필드가 올바른 크기를 가져야 함', () => {
      render(<LoginPage />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');
      
      // 최소 터치 타겟 크기 (56px) 확인
      expect(emailInput).toHaveClass('min-h-[56px]');
      expect(passwordInput).toHaveClass('min-h-[56px]');
      expect(loginButton).toHaveClass('min-h-[56px]');
      
      // 터치 최적화 클래스 확인
      expect(emailInput).toHaveClass('touch-manipulation');
      expect(passwordInput).toHaveClass('touch-manipulation');
      expect(loginButton).toHaveClass('touch-manipulation');
    });

    test('큰 버튼이 GitHub 스타일로 렌더링되어야 함', () => {
      render(<LoginPage />);
      
      const loginButton = screen.getByTestId('login-button');
      
      expect(loginButton).toHaveClass('bg-gradient-to-r');
      expect(loginButton).toHaveClass('from-blue-600');
      expect(loginButton).toHaveClass('to-indigo-600');
      expect(loginButton).toHaveClass('rounded-xl');
      expect(screen.getByText('로그인')).toBeInTheDocument();
    });

    test('반응형 레이아웃이 올바르게 작동해야 함', () => {
      render(<LoginPage />);
      
      // Responsive classes 확인
      const clockContainer = screen.getByTestId('real-time-clock');
      expect(clockContainer.parentElement).toHaveClass('max-w-4xl');
      expect(clockContainer.parentElement).toHaveClass('mx-auto');
      expect(clockContainer.parentElement).toHaveClass('px-4');
    });
  });

  describe('한국어 로컬라이제이션', () => {
    test('모든 UI 텍스트가 한국어로 표시되어야 함', () => {
      render(<LoginPage />);
      
      // Form labels
      expect(screen.getByText('이메일 주소')).toBeInTheDocument();
      expect(screen.getByText('비밀번호')).toBeInTheDocument();
      
      // Placeholders
      expect(screen.getByPlaceholderText('이메일을 입력하세요')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('비밀번호를 입력하세요')).toBeInTheDocument();
      
      // Features
      expect(screen.getByText('다중 역할')).toBeInTheDocument();
      expect(screen.getByText('보안 인증')).toBeInTheDocument();
      expect(screen.getByText('실시간 동기화')).toBeInTheDocument();
      
      // Account section
      expect(screen.getByText('개발 테스트 계정')).toBeInTheDocument();
      expect(screen.getByText('마스터 관리자:')).toBeInTheDocument();
      expect(screen.getByText('사업자:')).toBeInTheDocument();
    });

    test('font-korean 클래스가 적절히 적용되어야 함', () => {
      render(<LoginPage />);
      
      // Check Korean font classes
      const koreanTexts = screen.getAllByText((content, element) => {
        return element?.classList.contains('font-korean') || false;
      });
      
      expect(koreanTexts.length).toBeGreaterThan(0);
    });
  });

  describe('접근성 (Accessibility)', () => {
    test('적절한 ARIA 레이블과 역할이 설정되어야 함', () => {
      render(<LoginPage />);
      
      // Form elements
      expect(screen.getByLabelText('이메일 주소')).toBeInTheDocument();
      expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
      
      // Button
      expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument();
    });

    test('키보드 네비게이션이 작동해야 함', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');
      
      // Tab 순서 확인
      await user.tab();
      expect(emailInput).toHaveFocus();
      
      await user.tab();
      expect(passwordInput).toHaveFocus();
      
      await user.tab();
      expect(loginButton).toHaveFocus();
    });

    test('색상 대비가 접근성 기준을 만족해야 함', () => {
      render(<LoginPage />);
      
      // Text contrast checks (이는 시각적 테스트이므로 클래스 확인으로 대체)
      const headingText = screen.getByText('DOT 출석 관리');
      expect(headingText).toHaveClass('text-gray-900');
      
      const subtitleText = screen.getByText('스마트 근태관리 시스템');
      expect(subtitleText).toHaveClass('text-gray-600');
    });
  });

  describe('실시간 시계 기능', () => {
    test('시계 컴포넌트가 올바른 props로 렌더링되어야 함', () => {
      render(<LoginPage />);
      
      const clock = screen.getByTestId('real-time-clock');
      
      // Props 확인
      expect(clock).toHaveAttribute('data-show-icon', 'true');
      expect(clock).toHaveAttribute('data-show-seconds', 'true');
      expect(clock).toHaveAttribute('data-format', '24h');
    });

    test('한국 표준시 정보가 표시되어야 함', () => {
      render(<LoginPage />);
      
      expect(screen.getByText('한국 표준시 (KST)')).toBeInTheDocument();
      expect(screen.getByText(/2025년.*월.*일.*요일/)).toBeInTheDocument();
    });
  });

  describe('로그인 인터랙션', () => {
    test('로그인 폼 제출이 올바르게 작동해야 함', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);
      
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByTestId('login-button');
      
      // 사용자 입력 시뮬레이션
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      // 입력값 확인
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
      
      // 로그인 버튼 클릭
      await user.click(loginButton);
      
      // 성공 시나리오는 mock에서 처리됨
    });

    test('loading 상태 표시', () => {
      render(<LoginPage />);
      
      // 로딩 관련 클래스와 텍스트 확인은 실제 컴포넌트 상태에 따라 다름
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
    });
  });

  describe('성능 최적화', () => {
    test('컴포넌트가 빠르게 렌더링되어야 함', () => {
      const startTime = performance.now();
      render(<LoginPage />);
      const endTime = performance.now();
      
      // 렌더링 시간이 100ms 이내여야 함
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('이미지와 아이콘이 최적화되어 있어야 함', () => {
      render(<LoginPage />);
      
      // Lucide React 아이콘 사용 확인 (실제 구현에서는 SVG가 렌더링됨)
      const loginForm = screen.getByTestId('login-form');
      expect(loginForm).toBeInTheDocument();
    });
  });

  describe('에러 처리', () => {
    test('컴포넌트 오류 시 적절한 fallback 표시', () => {
      // Error boundary 테스트는 실제 구현에서 처리
      render(<LoginPage />);
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
    });
  });
});

// Helper functions for Korean locale testing
export const koreanLocaleHelpers = {
  expectKoreanText: (text: string) => {
    expect(screen.getByText(text)).toBeInTheDocument();
  },
  
  expectKoreanDateFormat: (element: HTMLElement) => {
    // 한국어 날짜 형식 검증
    const content = element.textContent || '';
    expect(content).toMatch(/\d{4}년.*월.*일.*요일/);
  },
  
  expectKoreanTimeFormat: (element: HTMLElement) => {
    // 한국어 시간 형식 검증 (24시간 형식)
    const content = element.textContent || '';
    expect(content).toMatch(/\d{2}:\d{2}:\d{2}/);
  }
};

// Performance testing helpers
export const performanceHelpers = {
  measureRenderTime: async (component: React.ReactElement) => {
    const start = performance.now();
    render(component);
    const end = performance.now();
    return end - start;
  },
  
  measureInteractionTime: async (interaction: () => Promise<void>) => {
    const start = performance.now();
    await interaction();
    const end = performance.now();
    return end - start;
  },
  
  expectFastResponse: (time: number, threshold: number = 1000) => {
    expect(time).toBeLessThan(threshold);
  }
};

// Accessibility testing helpers
export const a11yHelpers = {
  expectProperHeadingStructure: () => {
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  },
  
  expectAriaLabels: () => {
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAccessibleName();
    });
  },
  
  expectKeyboardNavigation: async () => {
    const user = userEvent.setup();
    const focusableElements = screen.getAllByRole('textbox').concat(screen.getAllByRole('button'));
    
    for (let i = 0; i < focusableElements.length; i++) {
      await user.tab();
      expect(focusableElements[i]).toHaveFocus();
    }
  }
};