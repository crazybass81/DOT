import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import AttendancePage from '../app/attendance/page';
import { multiRoleAuthService } from '../src/services/multiRoleAuthService';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock multiRoleAuthService
jest.mock('../src/services/multiRoleAuthService', () => ({
  multiRoleAuthService: {
    getCurrentUser: jest.fn(),
    signOut: jest.fn(),
  },
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock user agent for mobile detection
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  configurable: true,
});

describe('GitHub-Style Employee Dashboard', () => {
  const mockUser = {
    id: 'test-user-id',
    name: '김직원',
    email: 'employee@test.com',
    roles: [
      {
        id: 'role1',
        employeeId: 'test-user-id',
        organizationId: 'org1',
        roleType: 'employee',
        isActive: true,
        grantedAt: new Date(),
        organizationName: '테스트 회사',
      },
    ],
    contracts: [],
    metadata: {},
  };

  const mockPosition = {
    coords: {
      latitude: 37.5665,
      longitude: 126.9780,
      accuracy: 10,
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    (multiRoleAuthService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    
    // Mock successful geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });
    
    mockGeolocation.watchPosition.mockImplementation((success) => {
      success(mockPosition);
      return 1; // watch ID
    });

    // Mock window.innerWidth for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Render and Authentication', () => {
    it('should render the GitHub-style dashboard with large clock', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        expect(screen.getByText('김직원')).toBeInTheDocument();
        expect(screen.getByText('employee@test.com')).toBeInTheDocument();
        expect(screen.getByText('현재 시간')).toBeInTheDocument();
      });

      // Check for large clock display
      const timeElement = screen.getByText(/\d{2}:\d{2}:\d{2}/);
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveClass('text-5xl', 'md:text-6xl', 'font-mono');
    });

    it('should redirect to login if user is not authenticated', async () => {
      (multiRoleAuthService.getCurrentUser as jest.Mock).mockResolvedValue(null);

      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect to mobile version on mobile devices', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });

      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/attendance/mobile');
      });
    });
  });

  describe('Real-time Clock Display', () => {
    it('should display current time in large format', async () => {
      jest.useFakeTimers();
      const testDate = new Date('2025-09-11T14:30:45');
      jest.setSystemTime(testDate);

      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        expect(screen.getByText('14:30:45')).toBeInTheDocument();
        expect(screen.getByText(/2025년 9월/)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should update time every second', async () => {
      jest.useFakeTimers();
      const testDate = new Date('2025-09-11T14:30:45');
      jest.setSystemTime(testDate);

      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        expect(screen.getByText('14:30:45')).toBeInTheDocument();
      });

      // Advance time by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('14:30:46')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Check-in/Check-out Functionality', () => {
    it('should display check-in button when not checked in', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        const checkInButton = screen.getByRole('button', { name: /출근하기/i });
        expect(checkInButton).toBeInTheDocument();
        expect(checkInButton).toHaveClass('bg-green-600');
      });
    });

    it('should handle successful check-in process', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        const checkInButton = screen.getByRole('button', { name: /출근하기/i });
        expect(checkInButton).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /출근하기/i }));
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /퇴근하기/i })).toBeInTheDocument();
        expect(screen.getByText('근무중')).toBeInTheDocument();
      });
    });

    it('should display work duration when checked in', async () => {
      jest.useFakeTimers();
      
      await act(async () => {
        render(<AttendancePage />);
      });

      // Check in
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /출근하기/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('오늘의 근무 현황')).toBeInTheDocument();
        expect(screen.getByText('누적 근무')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should handle successful check-out process', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      // First check in
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /출근하기/i }));
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /퇴근하기/i })).toBeInTheDocument();
      });

      // Then check out
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /퇴근하기/i }));
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /출근하기/i })).toBeInTheDocument();
        expect(screen.getByText('미출근')).toBeInTheDocument();
      });
    });
  });

  describe('GPS Location Features', () => {
    it('should handle GPS permission denied', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied the request for Geolocation.',
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        expect(screen.getByText(/위치 접근 권한이 거부되었습니다/)).toBeInTheDocument();
        expect(screen.getByText(/위치 권한 재요청/)).toBeInTheDocument();
      });
    });

    it('should show location status and distance', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        expect(screen.getByText('위치 확인')).toBeInTheDocument();
        expect(screen.getByText('본사')).toBeInTheDocument();
        expect(screen.getByText(/현재 위치에서 \d+m/)).toBeInTheDocument();
      });
    });

    it('should prevent check-in when outside allowed radius', async () => {
      // Mock position far from office
      const farPosition = {
        coords: {
          latitude: 37.6665, // 10km away from mock office
          longitude: 127.0780,
          accuracy: 10,
        },
        timestamp: Date.now(),
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(farPosition);
      });

      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        const checkInButton = screen.getByRole('button', { name: /출근하기/i });
        expect(checkInButton).toBeDisabled();
      });
    });
  });

  describe('Weekly and Monthly Statistics', () => {
    it('should display weekly attendance summary', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        expect(screen.getByText('이번 주')).toBeInTheDocument();
        expect(screen.getByText('출근 일수')).toBeInTheDocument();
        expect(screen.getByText('5/7일')).toBeInTheDocument();
        expect(screen.getByText('지각')).toBeInTheDocument();
        expect(screen.getByText('조퇴')).toBeInTheDocument();
      });
    });

    it('should display monthly work hours summary', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        expect(screen.getByText('이번 달')).toBeInTheDocument();
        expect(screen.getByText('총 근무시간')).toBeInTheDocument();
        expect(screen.getByText('160시간')).toBeInTheDocument();
        expect(screen.getByText('일평균 근무')).toBeInTheDocument();
        expect(screen.getByText('8시간')).toBeInTheDocument();
        expect(screen.getByText('초과근무')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design and Mobile Optimization', () => {
    it('should have touch-friendly button sizes', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        const checkInButton = screen.getByRole('button', { name: /출근하기/i });
        expect(checkInButton).toHaveClass('py-6', 'px-8');
      });
    });

    it('should display status indicator pill', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        const statusIndicator = screen.getByText('미출근');
        expect(statusIndicator.closest('div')).toHaveClass('rounded-full');
      });
    });
  });

  describe('User Interface and Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('김직원');
        expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3); // Location, Weekly, Monthly
      });
    });

    it('should have accessible button states', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        const checkInButton = screen.getByRole('button', { name: /출근하기/i });
        expect(checkInButton).not.toHaveAttribute('aria-disabled');
      });
    });

    it('should show loading states during operations', async () => {
      await act(async () => {
        render(<AttendancePage />);
      });

      const checkInButton = screen.getByRole('button', { name: /출근하기/i });
      
      await act(async () => {
        fireEvent.click(checkInButton);
      });

      // Should briefly show loading state
      expect(screen.getByText(/처리 중.../)).toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('should handle logout successfully', async () => {
      (multiRoleAuthService.signOut as jest.Mock).mockResolvedValue({ success: true });

      await act(async () => {
        render(<AttendancePage />);
      });

      await waitFor(() => {
        const logoutButton = screen.getByRole('button', { name: /로그아웃/i });
        expect(logoutButton).toBeInTheDocument();
      });

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /로그아웃/i }));
      });

      await waitFor(() => {
        expect(multiRoleAuthService.signOut).toHaveBeenCalled();
      });
    });
  });
});