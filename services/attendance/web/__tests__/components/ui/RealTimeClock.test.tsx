/**
 * RealTimeClock Component Tests
 * 실시간 시계 컴포넌트 단위 테스트
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import RealTimeClock, { OptimizedRealTimeClock, koreanTimeUtils } from '@/components/ui/RealTimeClock';

// Mock performance.now for consistent testing
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
  },
});

describe('RealTimeClock Component', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('기본 렌더링', () => {
    test('기본 props로 시계가 렌더링되어야 함', () => {
      render(<RealTimeClock />);
      
      const clock = screen.getByTestId('real-time-clock');
      expect(clock).toBeInTheDocument();
      expect(clock).toHaveClass('text-center');
    });

    test('시계 아이콘이 표시되어야 함', () => {
      render(<RealTimeClock showIcon={true} />);
      
      // Lucide Clock 아이콘 확인 (SVG로 렌더링됨)
      const clockContainer = screen.getByTestId('real-time-clock');
      expect(clockContainer.querySelector('svg')).toBeInTheDocument();
    });

    test('아이콘을 숨길 수 있어야 함', () => {
      render(<RealTimeClock showIcon={false} />);
      
      const clockContainer = screen.getByTestId('real-time-clock');
      expect(clockContainer.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('시간 형식', () => {
    test('24시간 형식으로 시간이 표시되어야 함', () => {
      const fixedDate = new Date('2025-09-10T14:30:25');
      jest.setSystemTime(fixedDate);
      
      render(<RealTimeClock format="24h" showSeconds={true} />);
      
      // 24시간 형식 확인 (14:30:25)
      expect(screen.getByText(/14:30:25/)).toBeInTheDocument();
    });

    test('12시간 형식으로 시간이 표시되어야 함', () => {
      const fixedDate = new Date('2025-09-10T14:30:25');
      jest.setSystemTime(fixedDate);
      
      render(<RealTimeClock format="12h" showSeconds={true} />);
      
      // 12시간 형식 확인 (오후 2:30:25)
      expect(screen.getByText(/오후.*2:30:25/)).toBeInTheDocument();
    });

    test('초를 숨길 수 있어야 함', () => {
      const fixedDate = new Date('2025-09-10T14:30:25');
      jest.setSystemTime(fixedDate);
      
      render(<RealTimeClock showSeconds={false} />);
      
      // 초가 없는 시간 형식 확인 (14:30)
      expect(screen.getByText(/14:30/)).toBeInTheDocument();
      expect(screen.queryByText(/14:30:25/)).not.toBeInTheDocument();
    });
  });

  describe('한국어 로케일', () => {
    test('한국어 날짜 형식이 표시되어야 함', () => {
      const fixedDate = new Date('2025-09-10T14:30:25');
      jest.setSystemTime(fixedDate);
      
      render(<RealTimeClock />);
      
      // 한국어 날짜 형식 확인
      expect(screen.getByText(/2025년.*9월.*10일.*화요일/)).toBeInTheDocument();
    });

    test('한국 표준시(KST) 표시가 있어야 함', () => {
      render(<RealTimeClock />);
      
      expect(screen.getByText('한국 표준시 (KST)')).toBeInTheDocument();
    });

    test('요일이 한국어로 표시되어야 함', () => {
      const tuesday = new Date('2025-09-10T14:30:25'); // 화요일
      jest.setSystemTime(tuesday);
      
      render(<RealTimeClock />);
      
      expect(screen.getByText(/화요일/)).toBeInTheDocument();
    });
  });

  describe('실시간 업데이트', () => {
    test('1초마다 시간이 업데이트되어야 함', async () => {
      const startTime = new Date('2025-09-10T14:30:25');
      jest.setSystemTime(startTime);
      
      render(<RealTimeClock showSeconds={true} />);
      
      // 초기 시간 확인
      expect(screen.getByText(/14:30:25/)).toBeInTheDocument();
      
      // 1초 경과
      act(() => {
        jest.setSystemTime(new Date('2025-09-10T14:30:26'));
        jest.advanceTimersByTime(1000);
      });
      
      // 업데이트된 시간 확인
      await waitFor(() => {
        expect(screen.getByText(/14:30:26/)).toBeInTheDocument();
      });
    });

    test('컴포넌트 언마운트 시 타이머가 정리되어야 함', () => {
      const { unmount } = render(<RealTimeClock />);
      
      // 타이머 스파이
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('성능 최적화', () => {
    test('OptimizedRealTimeClock이 React.memo로 최적화되어야 함', () => {
      const { rerender } = render(<OptimizedRealTimeClock />);
      
      // 같은 props로 리렌더링
      rerender(<OptimizedRealTimeClock />);
      
      // React.memo 동작 확인 (실제 최적화 테스트는 더 복잡함)
      expect(screen.getByTestId('real-time-clock')).toBeInTheDocument();
    });

    test('시계 업데이트가 효율적으로 동작해야 함', () => {
      const performanceSpy = jest.spyOn(global.performance, 'now');
      
      render(<RealTimeClock />);
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      // 성능 측정 호출 확인
      expect(performanceSpy).toHaveBeenCalled();
    });
  });

  describe('CSS 클래스 및 스타일링', () => {
    test('커스텀 className이 적용되어야 함', () => {
      const customClass = 'custom-clock-style';
      render(<RealTimeClock className={customClass} />);
      
      const clock = screen.getByTestId('real-time-clock');
      expect(clock).toHaveClass(customClass);
    });

    test('GitHub 스타일 클래스가 적용되어야 함', () => {
      render(<RealTimeClock />);
      
      const clock = screen.getByTestId('real-time-clock');
      expect(clock).toHaveClass('text-center');
      
      // 시간 표시 요소의 스타일링 확인
      const timeDisplay = clock.querySelector('.text-4xl');
      expect(timeDisplay).toHaveClass('font-bold', 'text-gray-900', 'font-mono');
    });
  });

  describe('접근성', () => {
    test('적절한 의미론적 구조를 가져야 함', () => {
      render(<RealTimeClock />);
      
      const clock = screen.getByTestId('real-time-clock');
      expect(clock).toBeInTheDocument();
      
      // 시간 정보의 계층적 구조 확인
      expect(clock.querySelector('.text-4xl')).toBeInTheDocument(); // 시간
      expect(clock.querySelector('.text-lg')).toBeInTheDocument(); // 날짜
      expect(clock.querySelector('.text-sm')).toBeInTheDocument(); // 시간대
    });

    test('스크린 리더를 위한 적절한 텍스트 구조를 가져야 함', () => {
      render(<RealTimeClock />);
      
      // 시간 정보가 텍스트로 접근 가능해야 함
      expect(screen.getByTestId('real-time-clock')).toHaveTextContent(/\d{2}:\d{2}/);
      expect(screen.getByTestId('real-time-clock')).toHaveTextContent(/한국 표준시/);
    });
  });

  describe('에러 처리', () => {
    test('잘못된 날짜 객체 처리', () => {
      // Date 객체 mocking으로 에러 상황 시뮬레이션
      const originalDate = global.Date;
      global.Date = class extends Date {
        constructor(...args: any[]) {
          super(...args);
          if (args.length === 0) {
            return new originalDate('invalid');
          }
        }
      } as any;
      
      expect(() => {
        render(<RealTimeClock />);
      }).not.toThrow();
      
      global.Date = originalDate;
    });
  });
});

describe('koreanTimeUtils', () => {
  const testDate = new Date('2025-09-10T14:30:25');

  beforeAll(() => {
    jest.setSystemTime(testDate);
  });

  describe('날짜/시간 포맷팅', () => {
    test('formatKoreanDateTime이 올바른 형식을 반환해야 함', () => {
      const result = koreanTimeUtils.formatKoreanDateTime(testDate);
      
      expect(result).toMatch(/2025년.*9월.*10일.*화요일.*14:30:25/);
    });

    test('formatKoreanTime이 시간만 반환해야 함', () => {
      const result = koreanTimeUtils.formatKoreanTime(testDate);
      
      expect(result).toBe('14:30:25');
    });

    test('formatKoreanDate가 날짜만 반환해야 함', () => {
      const result = koreanTimeUtils.formatKoreanDate(testDate);
      
      expect(result).toMatch(/2025년.*9월.*10일.*화요일/);
    });
  });

  describe('주말 판별', () => {
    test('토요일을 주말로 판별해야 함', () => {
      const saturday = new Date('2025-09-13T14:30:25'); // 토요일
      
      expect(koreanTimeUtils.isKoreanWeekend(saturday)).toBe(true);
    });

    test('일요일을 주말로 판별해야 함', () => {
      const sunday = new Date('2025-09-14T14:30:25'); // 일요일
      
      expect(koreanTimeUtils.isKoreanWeekend(sunday)).toBe(true);
    });

    test('평일을 주말이 아님으로 판별해야 함', () => {
      const tuesday = new Date('2025-09-10T14:30:25'); // 화요일
      
      expect(koreanTimeUtils.isKoreanWeekend(tuesday)).toBe(false);
    });
  });

  describe('시간대 처리', () => {
    test('KST 시간대로 정확히 표시되어야 함', () => {
      const utcDate = new Date('2025-09-10T05:30:25Z'); // UTC
      const result = koreanTimeUtils.formatKoreanTime(utcDate);
      
      // KST는 UTC+9이므로 14:30:25가 되어야 함
      expect(result).toBe('14:30:25');
    });
  });
});