/**
 * UI/UX 통합 테스트를 위한 공통 유틸리티
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement } from 'react';

// Korean date/time formatting
export const formatKoreanDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Seoul'
  }).format(date);
};

// Mock geolocation for GPS-based attendance
export const mockGeolocation = (coords?: { latitude: number; longitude: number }) => {
  const defaultCoords = {
    latitude: 37.5665, // Seoul coordinates
    longitude: 126.9780,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null
  };

  const mockGeolocation = {
    getCurrentPosition: jest.fn().mockImplementation((success) => {
      success({
        coords: coords ? { ...defaultCoords, ...coords } : defaultCoords,
        timestamp: Date.now()
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn()
  };

  Object.defineProperty(global.navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true
  });

  return mockGeolocation;
};

// QR Code scanner mock
export const mockQRScanner = () => {
  const mockScanner = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    setInversionMode: jest.fn(),
    hasCamera: jest.fn().mockResolvedValue(true)
  };

  // Mock the QR scanner library
  jest.doMock('qr-scanner', () => {
    return jest.fn().mockImplementation(() => mockScanner);
  });

  return mockScanner;
};

// Real-time subscription mock for Supabase
export const mockSupabaseRealtime = () => {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn().mockReturnThis()
  };

  const mockSupabase = {
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn()
  };

  return { mockSupabase, mockChannel };
};

// Test data factories
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: '테스트 사용자',
  role: 'employee',
  organization_id: 'test-org-id',
  position: '개발자',
  created_at: new Date().toISOString(),
  ...overrides
});

export const createTestOrganization = (overrides = {}) => ({
  id: 'test-org-id',
  name: '테스트 회사',
  address: '서울시 강남구',
  latitude: 37.5665,
  longitude: 126.9780,
  radius: 100,
  created_at: new Date().toISOString(),
  ...overrides
});

export const createTestAttendanceRecord = (overrides = {}) => ({
  id: 'test-record-id',
  user_id: 'test-user-id',
  organization_id: 'test-org-id',
  check_in_time: new Date().toISOString(),
  check_out_time: null,
  location_latitude: 37.5665,
  location_longitude: 126.9780,
  method: 'gps',
  created_at: new Date().toISOString(),
  ...overrides
});

// UI interaction helpers
export const checkInButtonHelpers = {
  findCheckInButton: () => screen.getByRole('button', { name: /출근/i }),
  findCheckOutButton: () => screen.getByRole('button', { name: /퇴근/i }),
  clickCheckIn: async () => {
    const button = screen.getByRole('button', { name: /출근/i });
    await userEvent.click(button);
  },
  clickCheckOut: async () => {
    const button = screen.getByRole('button', { name: /퇴근/i });
    await userEvent.click(button);
  },
  waitForStatusUpdate: async (status: string) => {
    await waitFor(() => {
      expect(screen.getByText(new RegExp(status, 'i'))).toBeInTheDocument();
    });
  }
};

export const qrCodeHelpers = {
  findQRCanvas: () => screen.getByTestId('qr-canvas'),
  findQRScanner: () => screen.getByTestId('qr-scanner'),
  findScanButton: () => screen.getByRole('button', { name: /스캔/i }),
  findGenerateButton: () => screen.getByRole('button', { name: /생성/i }),
  mockQRScanResult: (data: string) => {
    const scannerElement = screen.getByTestId('qr-scanner');
    fireEvent(scannerElement, new CustomEvent('scan', { detail: data }));
  }
};

export const dashboardHelpers = {
  findUserGreeting: (userName: string) => 
    screen.getByText(new RegExp(`안녕하세요.*${userName}`, 'i')),
  findAttendanceStatus: () => screen.getByTestId('attendance-status'),
  findRealTimeClock: () => screen.getByTestId('real-time-clock'),
  findNotificationCenter: () => screen.getByTestId('notification-center'),
  waitForRealTimeUpdate: async (timeout = 5000) => {
    await waitFor(() => {
      const statusElement = screen.getByTestId('attendance-status');
      expect(statusElement).toBeInTheDocument();
    }, { timeout });
  }
};

// Korean locale testing
export const koreanLocaleHelpers = {
  expectKoreanText: (text: string) => {
    expect(screen.getByText(text)).toBeInTheDocument();
  },
  expectKoreanDateFormat: (element: HTMLElement) => {
    const dateText = element.textContent;
    expect(dateText).toMatch(/\d{4}년 \d{1,2}월 \d{1,2}일/);
  },
  expectKoreanTimeFormat: (element: HTMLElement) => {
    const timeText = element.textContent;
    expect(timeText).toMatch(/[오전|오후] \d{1,2}:\d{2}/);
  }
};

// Performance testing helpers
export const performanceHelpers = {
  measureRenderTime: async (component: ReactElement) => {
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

  expectFastResponse: (time: number, threshold = 100) => {
    expect(time).toBeLessThan(threshold);
  }
};

// Accessibility testing helpers
export const a11yHelpers = {
  expectProperHeadingStructure: () => {
    const headings = screen.getAllByRole('heading');
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (index > 0) {
        const prevLevel = parseInt(headings[index - 1].tagName.charAt(1));
        expect(level).toBeLessThanOrEqual(prevLevel + 1);
      }
    });
  },

  expectKeyboardNavigation: async () => {
    const focusableElements = screen.getAllByRole('button')
      .concat(screen.getAllByRole('link'))
      .concat(screen.getAllByRole('textbox'));
    
    for (const element of focusableElements) {
      element.focus();
      expect(element).toHaveFocus();
      
      // Test tab navigation
      fireEvent.keyDown(element, { key: 'Tab' });
    }
  },

  expectAriaLabels: () => {
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  }
};

// Error boundary testing
export const errorBoundaryHelpers = {
  triggerError: (component: ReactElement, error: Error) => {
    const ErrorComponent = () => {
      throw error;
    };
    
    return render(
      <div>
        {component}
        <ErrorComponent />
      </div>
    );
  },

  expectErrorBoundary: () => {
    expect(screen.getByText(/오류가 발생했습니다/i)).toBeInTheDocument();
  }
};

// Custom render with providers
export const renderWithProviders = (
  ui: ReactElement,
  options: {
    user?: any;
    organization?: any;
    initialState?: any;
  } = {}
) => {
  // This would wrap with necessary providers (AuthProvider, etc.)
  return render(ui);
};

export * from '@testing-library/react';
export { userEvent };