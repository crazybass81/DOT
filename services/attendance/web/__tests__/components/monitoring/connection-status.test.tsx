/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConnectionStatus } from '../../../src/components/monitoring/ConnectionStatus';
import type { ConnectionUser, ConnectionStats } from '../../../src/types/monitoring';

// Mock the useRealtimeConnections hook
const mockUseRealtimeConnections = {
  connectedUsers: [] as ConnectionUser[],
  stats: {
    totalConnections: 0,
    authenticatedConnections: 0,
    activeChannels: 0,
    connectionsByOrg: {},
    lastUpdated: new Date(),
  } as ConnectionStats,
  connectionStatus: 'disconnected' as const,
  isLoading: false,
  error: null,
  reconnect: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('../../../src/hooks/useRealtimeConnections', () => ({
  useRealtimeConnections: jest.fn(() => mockUseRealtimeConnections),
}));

const mockConnectedUsers: ConnectionUser[] = [
  {
    userId: 'user1',
    userName: '김철수',
    socketId: 'socket1',
    connectedAt: new Date('2025-01-15T09:00:00Z'),
    lastActivity: new Date('2025-01-15T09:05:00Z'),
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    organizationId: 'org1',
    channels: ['user:user1', 'org:org1'],
    authenticated: true,
  },
  {
    userId: 'user2',
    userName: '이영희',
    socketId: 'socket2',
    connectedAt: new Date('2025-01-15T08:30:00Z'),
    lastActivity: new Date('2025-01-15T09:06:00Z'),
    ipAddress: '192.168.1.101',
    organizationId: 'org1',
    channels: ['user:user2', 'org:org1'],
    authenticated: true,
  },
  {
    userId: 'user3',
    userName: '박민수',
    socketId: 'socket3',
    connectedAt: new Date('2025-01-15T09:10:00Z'),
    lastActivity: new Date('2025-01-15T09:10:30Z'),
    ipAddress: '192.168.1.102',
    organizationId: 'org2',
    channels: ['user:user3', 'org:org2'],
    authenticated: false,
  },
];

const mockStats: ConnectionStats = {
  totalConnections: 3,
  authenticatedConnections: 2,
  activeChannels: 3,
  connectionsByOrg: {
    org1: 2,
    org2: 1,
  },
  lastUpdated: new Date('2025-01-15T09:12:00Z'),
};

describe('ConnectionStatus Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to default state
    Object.assign(mockUseRealtimeConnections, {
      connectedUsers: [],
      stats: {
        totalConnections: 0,
        authenticatedConnections: 0,
        activeChannels: 0,
        connectionsByOrg: {},
        lastUpdated: new Date(),
      },
      connectionStatus: 'disconnected',
      isLoading: false,
      error: null,
    });
  });

  describe('기본 렌더링', () => {
    it('컴포넌트가 정상적으로 렌더링된다', () => {
      render(<ConnectionStatus />);
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('제목이 표시된다', () => {
      render(<ConnectionStatus />);
      expect(screen.getByText('실시간 접속 현황')).toBeInTheDocument();
    });
  });

  describe('접속자 수 표시', () => {
    it('총 접속자 수가 표시된다', () => {
      Object.assign(mockUseRealtimeConnections, {
        stats: mockStats,
        connectionStatus: 'connected',
      });

      render(<ConnectionStatus />);
      expect(screen.getByText('총 접속자')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('인증된 접속자 수가 표시된다', () => {
      Object.assign(mockUseRealtimeConnections, {
        stats: mockStats,
        connectionStatus: 'connected',
      });

      render(<ConnectionStatus />);
      expect(screen.getByText('인증된 접속자')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('활성 채널 수가 표시된다', () => {
      Object.assign(mockUseRealtimeConnections, {
        stats: mockStats,
        connectionStatus: 'connected',
      });

      render(<ConnectionStatus />);
      expect(screen.getByText('활성 채널')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('접속자 상세 정보 표시', () => {
    beforeEach(() => {
      Object.assign(mockUseRealtimeConnections, {
        connectedUsers: mockConnectedUsers,
        stats: mockStats,
        connectionStatus: 'connected',
      });
    });

    it('접속자 목록이 표시된다', () => {
      render(<ConnectionStatus />);
      
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('이영희')).toBeInTheDocument();
      expect(screen.getByText('박민수')).toBeInTheDocument();
    });

    it('각 접속자의 IP 주소가 표시된다', () => {
      render(<ConnectionStatus />);
      
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.101')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.102')).toBeInTheDocument();
    });

    it('각 접속자의 접속 시간이 표시된다', () => {
      render(<ConnectionStatus />);
      
      // 상대적 시간 표시 확인 (예: "5분 전")
      expect(screen.getByText(/분 전|시간 전|초 전/)).toBeInTheDocument();
    });

    it('인증 상태가 표시된다', () => {
      render(<ConnectionStatus />);
      
      // 인증된 사용자 2명에 대해 인증 상태 표시 확인
      const authenticatedBadges = screen.getAllByText('인증됨');
      expect(authenticatedBadges).toHaveLength(2);
      
      // 미인증 사용자 1명에 대해 미인증 상태 표시 확인
      expect(screen.getByText('미인증')).toBeInTheDocument();
    });

    it('조직 정보가 표시된다', () => {
      render(<ConnectionStatus />);
      
      expect(screen.getAllByText(/org[12]/)).toHaveLength(3);
    });
  });

  describe('WebSocket 연결 상태 표시', () => {
    it('연결 중 상태가 표시된다', () => {
      Object.assign(mockUseRealtimeConnections, {
        connectionStatus: 'connecting',
        isLoading: true,
      });

      render(<ConnectionStatus />);
      expect(screen.getByText('연결 중...')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status-indicator')).toHaveClass('connecting');
    });

    it('연결됨 상태가 표시된다', () => {
      Object.assign(mockUseRealtimeConnections, {
        connectionStatus: 'connected',
      });

      render(<ConnectionStatus />);
      expect(screen.getByText('연결됨')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status-indicator')).toHaveClass('connected');
    });

    it('연결 끊김 상태가 표시된다', () => {
      Object.assign(mockUseRealtimeConnections, {
        connectionStatus: 'disconnected',
      });

      render(<ConnectionStatus />);
      expect(screen.getByText('연결 끊김')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status-indicator')).toHaveClass('disconnected');
    });

    it('오류 상태가 표시된다', () => {
      Object.assign(mockUseRealtimeConnections, {
        connectionStatus: 'error',
        error: '연결 오류가 발생했습니다.',
      });

      render(<ConnectionStatus />);
      expect(screen.getByText('오류')).toBeInTheDocument();
      expect(screen.getByText('연결 오류가 발생했습니다.')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status-indicator')).toHaveClass('error');
    });
  });

  describe('실시간 업데이트', () => {
    it('사용자 접속 시 목록이 업데이트된다', async () => {
      // 초기 상태: 빈 목록
      render(<ConnectionStatus />);
      expect(screen.queryByText('김철수')).not.toBeInTheDocument();

      // 사용자 접속 시뮬레이션
      act(() => {
        Object.assign(mockUseRealtimeConnections, {
          connectedUsers: [mockConnectedUsers[0]],
          stats: {
            ...mockStats,
            totalConnections: 1,
            authenticatedConnections: 1,
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('김철수')).toBeInTheDocument();
      });
    });

    it('사용자 접속 해제 시 목록에서 제거된다', async () => {
      // 초기 상태: 사용자 1명 접속
      Object.assign(mockUseRealtimeConnections, {
        connectedUsers: [mockConnectedUsers[0]],
        stats: { ...mockStats, totalConnections: 1 },
      });

      const { rerender } = render(<ConnectionStatus />);
      expect(screen.getByText('김철수')).toBeInTheDocument();

      // 사용자 접속 해제 시뮬레이션
      act(() => {
        Object.assign(mockUseRealtimeConnections, {
          connectedUsers: [],
          stats: { ...mockStats, totalConnections: 0 },
        });
      });

      rerender(<ConnectionStatus />);

      await waitFor(() => {
        expect(screen.queryByText('김철수')).not.toBeInTheDocument();
      });
    });

    it('통계가 실시간으로 업데이트된다', async () => {
      const { rerender } = render(<ConnectionStatus />);

      // 초기 상태 확인
      expect(screen.getByText('0')).toBeInTheDocument(); // 총 접속자 수

      // 통계 업데이트 시뮬레이션
      act(() => {
        Object.assign(mockUseRealtimeConnections, {
          stats: mockStats,
        });
      });

      rerender(<ConnectionStatus />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // 업데이트된 접속자 수
      });
    });
  });

  describe('에러 처리', () => {
    it('로딩 상태가 표시된다', () => {
      Object.assign(mockUseRealtimeConnections, {
        isLoading: true,
      });

      render(<ConnectionStatus />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('에러 메시지가 표시된다', () => {
      Object.assign(mockUseRealtimeConnections, {
        error: 'WebSocket 연결에 실패했습니다.',
      });

      render(<ConnectionStatus />);
      expect(screen.getByText('WebSocket 연결에 실패했습니다.')).toBeInTheDocument();
    });

    it('재연결 버튼이 표시되고 클릭할 수 있다', () => {
      Object.assign(mockUseRealtimeConnections, {
        connectionStatus: 'error',
        error: '연결 오류',
      });

      render(<ConnectionStatus />);
      const reconnectButton = screen.getByText('다시 연결');
      expect(reconnectButton).toBeInTheDocument();

      reconnectButton.click();
      expect(mockUseRealtimeConnections.reconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('조직별 필터링', () => {
    beforeEach(() => {
      Object.assign(mockUseRealtimeConnections, {
        connectedUsers: mockConnectedUsers,
        stats: mockStats,
        connectionStatus: 'connected',
      });
    });

    it('조직 필터 드롭다운이 표시된다', () => {
      render(<ConnectionStatus />);
      expect(screen.getByTestId('organization-filter')).toBeInTheDocument();
    });

    it('전체 조직을 선택할 수 있다', () => {
      render(<ConnectionStatus />);
      const filter = screen.getByTestId('organization-filter');
      expect(screen.getByDisplayValue('전체')).toBeInTheDocument();
    });

    it('특정 조직만 필터링하여 표시할 수 있다', async () => {
      render(<ConnectionStatus />);
      
      // 초기 상태: 모든 사용자 표시
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('이영희')).toBeInTheDocument();
      expect(screen.getByText('박민수')).toBeInTheDocument();

      // org1 필터 적용 시뮬레이션
      const filter = screen.getByTestId('organization-filter');
      act(() => {
        // 필터 변경 이벤트 시뮬레이션
        filter.dispatchEvent(new Event('change'));
      });

      // org1에 속한 사용자만 표시되어야 함
      await waitFor(() => {
        expect(screen.getByText('김철수')).toBeInTheDocument();
        expect(screen.getByText('이영희')).toBeInTheDocument();
        // org2 사용자는 표시되지 않아야 함 (실제 필터링 로직 구현 후)
      });
    });
  });

  describe('접근성 (Accessibility)', () => {
    it('적절한 ARIA 레이블이 설정되어 있다', () => {
      render(<ConnectionStatus />);
      
      expect(screen.getByRole('region', { name: '실시간 접속 현황' })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: '접속자 목록' })).toBeInTheDocument();
    });

    it('키보드로 조작할 수 있다', () => {
      Object.assign(mockUseRealtimeConnections, {
        connectionStatus: 'error',
        error: '연결 오류',
      });

      render(<ConnectionStatus />);
      const reconnectButton = screen.getByText('다시 연결');
      
      // 포커스 가능 확인
      reconnectButton.focus();
      expect(document.activeElement).toBe(reconnectButton);
    });
  });
});