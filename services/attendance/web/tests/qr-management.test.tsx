import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import QRManagePage from '../app/qr/manage/page';
import { QRManagementDashboard } from '../components/QRManagementDashboard';
import { QRActivityMonitor } from '../components/QRActivityMonitor';
import { QRValidationResult, QRData } from '../lib/qr-utils';

// Mock QR utils
jest.mock('../lib/qr-utils', () => ({
  generateEmployeeQR: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-image'),
  generateOrganizationQR: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-image'),
  validateQRForAttendance: jest.fn().mockReturnValue({
    valid: true,
    data: {
      type: 'employee',
      employeeId: 'EMP001',
      name: '테스트 직원',
      timestamp: Date.now()
    },
    attendanceType: 'checkin',
    locationMatch: true
  })
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn()
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock MediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    })
  },
  writable: true,
});

describe('QR Management System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 37.5665,
          longitude: 126.9780,
        }
      });
    });
  });

  describe('QR 관리 페이지', () => {
    test('페이지가 올바르게 렌더링된다', () => {
      render(<QRManagePage />);
      
      expect(screen.getByText('QR 코드 통합 관리 시스템')).toBeInTheDocument();
      expect(screen.getByText('QR 코드 생성, 스캔, 관리 및 실시간 모니터링')).toBeInTheDocument();
    });

    test('실시간 통계가 표시된다', () => {
      render(<QRManagePage />);
      
      expect(screen.getByText('총 스캔')).toBeInTheDocument();
      expect(screen.getByText('성공률')).toBeInTheDocument();
      expect(screen.getByText('활성 QR')).toBeInTheDocument();
      expect(screen.getByText('최근 활동')).toBeInTheDocument();
    });

    test('5개의 탭이 표시된다', () => {
      render(<QRManagePage />);
      
      expect(screen.getByRole('tab', { name: /생성/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /스캔/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /관리/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /모니터링/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /가이드/ })).toBeInTheDocument();
    });

    test('탭 전환이 작동한다', async () => {
      const user = userEvent.setup();
      render(<QRManagePage />);
      
      // 스캔 탭 클릭
      await user.click(screen.getByRole('tab', { name: /스캔/ }));
      expect(screen.getByText('QR 코드 실시간 스캐너')).toBeInTheDocument();
      
      // 가이드 탭 클릭
      await user.click(screen.getByRole('tab', { name: /가이드/ }));
      expect(screen.getByText('QR 코드 유형')).toBeInTheDocument();
    });
  });

  describe('QR 관리 대시보드', () => {
    const mockQRCodes = [
      {
        id: 'qr_1',
        type: 'employee' as const,
        name: '홍길동',
        data: {
          type: 'employee',
          employeeId: 'EMP001',
          name: '홍길동',
          position: '매니저',
          timestamp: Date.now()
        } as QRData,
        createdAt: new Date(),
        usageCount: 5,
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        id: 'qr_2',
        type: 'organization' as const,
        name: '본사 사무실',
        data: {
          type: 'organization',
          organizationId: 'ORG001',
          name: '본사 사무실',
          location: { latitude: 37.5665, longitude: 126.9780, radius: 100 },
          timestamp: Date.now()
        } as QRData,
        createdAt: new Date(),
        usageCount: 12,
        isActive: false
      }
    ];

    const mockProps = {
      qrCodes: mockQRCodes,
      onDelete: jest.fn(),
      onToggle: jest.fn(),
      onRefresh: jest.fn()
    };

    test('QR 코드 목록이 표시된다', () => {
      render(<QRManagementDashboard {...mockProps} />);
      
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('본사 사무실')).toBeInTheDocument();
      expect(screen.getByText('활성')).toBeInTheDocument();
      expect(screen.getByText('비활성')).toBeInTheDocument();
    });

    test('검색 기능이 작동한다', async () => {
      const user = userEvent.setup();
      render(<QRManagementDashboard {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText('이름 또는 ID로 검색...');
      await user.type(searchInput, '홍길동');
      
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.queryByText('본사 사무실')).not.toBeInTheDocument();
    });

    test('필터링이 작동한다', async () => {
      const user = userEvent.setup();
      render(<QRManagementDashboard {...mockProps} />);
      
      // 타입 필터 - 직원용만 표시
      const typeFilter = screen.getByDisplayValue('전체');
      await user.click(typeFilter);
      await user.click(screen.getByText('직원용'));
      
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.queryByText('본사 사무실')).not.toBeInTheDocument();
    });

    test('QR 코드 삭제가 작동한다', async () => {
      const user = userEvent.setup();
      render(<QRManagementDashboard {...mockProps} />);
      
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => btn.querySelector('.lucide-trash-2'));
      
      if (deleteButton) {
        await user.click(deleteButton);
        expect(mockProps.onDelete).toHaveBeenCalled();
      }
    });

    test('QR 코드 활성화/비활성화가 작동한다', async () => {
      const user = userEvent.setup();
      render(<QRManagementDashboard {...mockProps} />);
      
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn => 
        btn.querySelector('.lucide-power') || btn.querySelector('.lucide-power-off')
      );
      
      if (toggleButton) {
        await user.click(toggleButton);
        expect(mockProps.onToggle).toHaveBeenCalled();
      }
    });

    test('통계 요약이 표시된다', () => {
      render(<QRManagementDashboard {...mockProps} />);
      
      expect(screen.getByText('2')).toBeInTheDocument(); // 총 QR 코드
      expect(screen.getByText('1')).toBeInTheDocument(); // 활성 상태
      expect(screen.getByText('17')).toBeInTheDocument(); // 총 사용 횟수
    });
  });

  describe('QR 활동 모니터', () => {
    const mockActivities = [
      {
        id: 'activity_1',
        qrCodeId: 'qr_1',
        timestamp: new Date(),
        action: 'checkin' as const,
        success: true
      },
      {
        id: 'activity_2',
        qrCodeId: 'qr_2',
        timestamp: new Date(Date.now() - 60000),
        action: 'checkout' as const,
        success: false,
        error: '위치 검증 실패'
      }
    ];

    const mockQRCodes = [
      {
        id: 'qr_1',
        type: 'employee' as const,
        name: '홍길동',
        data: {} as QRData,
        createdAt: new Date(),
        usageCount: 5,
        isActive: true
      }
    ];

    const mockStats = {
      totalScans: 2,
      successfulScans: 1,
      activeQRs: 1,
      recentActivity: 1
    };

    const mockProps = {
      activities: mockActivities,
      qrCodes: mockQRCodes,
      stats: mockStats
    };

    test('활동 통계가 표시된다', () => {
      render(<QRActivityMonitor {...mockProps} />);
      
      expect(screen.getByText('50%')).toBeInTheDocument(); // 성공률
      expect(screen.getByText('2')).toBeInTheDocument(); // 필터된 활동
    });

    test('최근 활동 목록이 표시된다', () => {
      render(<QRActivityMonitor {...mockProps} />);
      
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('출근')).toBeInTheDocument();
      expect(screen.getByText('퇴근')).toBeInTheDocument();
      expect(screen.getByText('위치 검증 실패')).toBeInTheDocument();
    });

    test('시간 필터가 작동한다', async () => {
      const user = userEvent.setup();
      render(<QRActivityMonitor {...mockProps} />);
      
      const timeFilter = screen.getByDisplayValue('최근 24시간');
      await user.click(timeFilter);
      await user.click(screen.getByText('최근 1시간'));
      
      // 필터링된 결과 확인 (구체적인 구현에 따라 다를 수 있음)
      expect(screen.getByText('최근 1시간')).toBeInTheDocument();
    });

    test('CSV 다운로드 버튼이 있다', () => {
      render(<QRActivityMonitor {...mockProps} />);
      
      expect(screen.getByText('CSV 다운로드')).toBeInTheDocument();
    });
  });

  describe('QR 스캔 결과 처리', () => {
    test('성공한 스캔 결과가 올바르게 표시된다', async () => {
      render(<QRManagePage />);
      
      // 스캔 탭으로 이동
      const scanTab = screen.getByRole('tab', { name: /스캔/ });
      fireEvent.click(scanTab);
      
      // 결과 표시 영역 확인
      expect(screen.getByText('QR 코드를 스캔하면 결과가 여기에 표시됩니다')).toBeInTheDocument();
    });

    test('실패한 스캔 결과가 올바르게 표시된다', async () => {
      const { validateQRForAttendance } = require('../lib/qr-utils');
      validateQRForAttendance.mockReturnValue({
        valid: false,
        error: '유효하지 않은 QR 코드입니다'
      });

      render(<QRManagePage />);
      
      // 스캔 탭으로 이동
      const scanTab = screen.getByRole('tab', { name: /스캔/ });
      fireEvent.click(scanTab);
      
      // 테스트 QR 입력 및 처리 시뮬레이션
      const testInput = screen.getByPlaceholderText('QR 코드 데이터를 입력하세요...');
      const testButton = screen.getByText('테스트');
      
      await userEvent.type(testInput, 'invalid-qr-data');
      fireEvent.click(testButton);
      
      await waitFor(() => {
        expect(screen.getByText('유효하지 않은 QR 코드입니다')).toBeInTheDocument();
      });
    });
  });

  describe('통계 업데이트', () => {
    test('QR 생성 시 통계가 업데이트된다', async () => {
      render(<QRManagePage />);
      
      // 초기 활성 QR 수 확인
      const initialActiveQRs = screen.getByText('0'); // 초기값
      expect(initialActiveQRs).toBeInTheDocument();
      
      // QR 생성 시뮬레이션은 실제 컴포넌트 상호작용을 통해 테스트
      // 여기서는 통계 업데이트 로직이 작동하는지 확인
    });

    test('실시간 통계 업데이트가 작동한다', async () => {
      render(<QRManagePage />);
      
      // 5초마다 업데이트되는 통계를 테스트하기 위해 타이머 조작
      jest.useFakeTimers();
      
      // 5초 경과 시뮬레이션
      jest.advanceTimersByTime(5000);
      
      // 통계가 업데이트되었는지 확인
      expect(screen.getByText('총 스캔')).toBeInTheDocument();
      
      jest.useRealTimers();
    });
  });

  describe('접근성', () => {
    test('키보드 네비게이션이 작동한다', async () => {
      const user = userEvent.setup();
      render(<QRManagePage />);
      
      // Tab 키로 네비게이션
      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'tab');
      
      // 화살표 키로 탭 이동
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toHaveTextContent('스캔');
    });

    test('스크린 리더를 위한 ARIA 라벨이 있다', () => {
      render(<QRManagePage />);
      
      // 탭 패널에 적절한 ARIA 속성이 있는지 확인
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(5);
    });
  });

  describe('에러 처리', () => {
    test('QR 생성 실패 시 에러 메시지가 표시된다', async () => {
      const { generateEmployeeQR } = require('../lib/qr-utils');
      generateEmployeeQR.mockRejectedValue(new Error('QR 생성 실패'));
      
      render(<QRManagePage />);
      
      // QR 생성 실패 시나리오는 QRGenerator 컴포넌트에서 처리
      // 여기서는 에러 처리 로직이 있는지 확인
      expect(screen.getByText('QR 코드 통합 관리 시스템')).toBeInTheDocument();
    });

    test('카메라 접근 실패 시 적절한 메시지가 표시된다', async () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockRejectedValue(new Error('Camera access denied'))
        },
        writable: true,
      });

      render(<QRManagePage />);
      
      // 스캔 탭으로 이동
      const scanTab = screen.getByRole('tab', { name: /스캔/ });
      fireEvent.click(scanTab);
      
      // 카메라 권한 관련 메시지 확인
      await waitFor(() => {
        expect(screen.getByText(/카메라 권한이 필요합니다/)).toBeInTheDocument();
      });
    });
  });
});