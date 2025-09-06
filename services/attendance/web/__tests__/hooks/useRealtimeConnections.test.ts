/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeConnections } from '../../src/hooks/useRealtimeConnections';
import type { ConnectionUser, WebSocketConnectionEvent } from '../../src/types/monitoring';

// Mock Socket.IO client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
  disconnected: true,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

const mockConnectionEvent: WebSocketConnectionEvent = {
  type: 'user_connected',
  data: {
    userId: 'user1',
    userName: '김철수',
    socketId: 'socket1',
    connectedAt: new Date('2025-01-15T09:00:00Z'),
    lastActivity: new Date('2025-01-15T09:05:00Z'),
    ipAddress: '192.168.1.100',
    organizationId: 'org1',
    channels: ['user:user1', 'org:org1'],
    authenticated: true,
  } as ConnectionUser,
  timestamp: new Date(),
};

describe('useRealtimeConnections Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.disconnected = true;
  });

  describe('초기 상태', () => {
    it('초기 상태가 올바르게 설정된다', () => {
      const { result } = renderHook(() => useRealtimeConnections());

      expect(result.current.connectedUsers).toEqual([]);
      expect(result.current.stats.totalConnections).toBe(0);
      expect(result.current.stats.authenticatedConnections).toBe(0);
      // 초기 연결 시도로 인해 'connecting' 상태일 수 있음
      expect(['disconnected', 'connecting']).toContain(result.current.connectionStatus);
      expect(result.current.error).toBe(null);
    });

    it('옵션이 올바르게 적용된다', () => {
      const onConnectionStateChange = jest.fn();
      const onError = jest.fn();

      renderHook(() =>
        useRealtimeConnections({
          autoReconnect: true,
          reconnectInterval: 5000,
          maxReconnectAttempts: 5,
          onConnectionStateChange,
          onError,
        })
      );

      // 초기화 시 콜백이 호출되지 않아야 함
      expect(onConnectionStateChange).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket 연결', () => {
    it('컴포넌트 마운트 시 WebSocket 연결을 시도한다', () => {
      renderHook(() => useRealtimeConnections());
      expect(mockSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('연결 성공 시 상태가 업데이트된다', async () => {
      const { result } = renderHook(() => useRealtimeConnections());

      act(() => {
        mockSocket.connected = true;
        mockSocket.disconnected = false;
        const connectHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connect'
        )?.[1];
        connectHandler?.();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
      });
    });

    it('연결 실패 시 에러 상태가 설정된다', async () => {
      const { result } = renderHook(() => useRealtimeConnections());

      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connect_error'
        )?.[1];
        errorHandler?.({ message: '연결 실패' });
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
        expect(result.current.error).toBe('연결 실패');
      });
    });

    it('연결 해제 시 상태가 업데이트된다', async () => {
      const { result } = renderHook(() => useRealtimeConnections());

      // 먼저 연결 상태로 만들기
      act(() => {
        mockSocket.connected = true;
        const connectHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connect'
        )?.[1];
        connectHandler?.();
      });

      // 연결 해제
      act(() => {
        mockSocket.connected = false;
        mockSocket.disconnected = true;
        const disconnectHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'disconnect'
        )?.[1];
        disconnectHandler?.('transport close');
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });
    });
  });

  describe('실시간 이벤트 처리', () => {
    it('사용자 접속 이벤트를 처리한다', async () => {
      const { result } = renderHook(() => useRealtimeConnections());

      act(() => {
        const eventHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connection_update'
        )?.[1];
        eventHandler?.(mockConnectionEvent);
      });

      await waitFor(() => {
        expect(result.current.connectedUsers).toHaveLength(1);
        expect(result.current.connectedUsers[0].userName).toBe('김철수');
        expect(result.current.stats.totalConnections).toBe(1);
        expect(result.current.stats.authenticatedConnections).toBe(1);
      });
    });

    it('사용자 접속 해제 이벤트를 처리한다', async () => {
      const { result } = renderHook(() => useRealtimeConnections());

      // 먼저 사용자 접속
      act(() => {
        const eventHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connection_update'
        )?.[1];
        eventHandler?.(mockConnectionEvent);
      });

      // 사용자 접속 해제
      act(() => {
        const disconnectEvent: WebSocketConnectionEvent = {
          type: 'user_disconnected',
          data: mockConnectionEvent.data,
          timestamp: new Date(),
        };
        const eventHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connection_update'
        )?.[1];
        eventHandler?.(disconnectEvent);
      });

      await waitFor(() => {
        expect(result.current.connectedUsers).toHaveLength(0);
        expect(result.current.stats.totalConnections).toBe(0);
        expect(result.current.stats.authenticatedConnections).toBe(0);
      });
    });

    it('통계 업데이트 이벤트를 처리한다', async () => {
      const { result } = renderHook(() => useRealtimeConnections());

      const statsUpdate = {
        type: 'stats_updated' as const,
        data: {
          totalConnections: 5,
          authenticatedConnections: 4,
          activeChannels: 3,
          connectionsByOrg: { org1: 3, org2: 2 },
          lastUpdated: new Date(),
        },
        timestamp: new Date(),
      };

      act(() => {
        const eventHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connection_update'
        )?.[1];
        eventHandler?.(statsUpdate);
      });

      await waitFor(() => {
        expect(result.current.stats.totalConnections).toBe(5);
        expect(result.current.stats.authenticatedConnections).toBe(4);
        expect(result.current.stats.activeChannels).toBe(3);
        expect(result.current.stats.connectionsByOrg).toEqual({
          org1: 3,
          org2: 2,
        });
      });
    });
  });

  describe('재연결 기능', () => {
    it('수동 재연결이 작동한다', async () => {
      const { result } = renderHook(() => useRealtimeConnections());

      act(() => {
        result.current.reconnect();
      });

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
      expect(mockSocket.connect).toHaveBeenCalledTimes(2); // 초기 연결 + 재연결
    });

    it('자동 재연결이 작동한다', async () => {
      jest.useFakeTimers();

      renderHook(() =>
        useRealtimeConnections({
          autoReconnect: true,
          reconnectInterval: 3000,
          maxReconnectAttempts: 3,
        })
      );

      // 연결 해제 시뮬레이션
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'disconnect'
        )?.[1];
        disconnectHandler?.('transport close');
      });

      // 재연결 시도 대기
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockSocket.connect).toHaveBeenCalledTimes(2); // 초기 + 재연결

      jest.useRealTimers();
    });

    it('최대 재연결 시도 횟수를 초과하면 재연결을 중단한다', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() =>
        useRealtimeConnections({
          autoReconnect: true,
          reconnectInterval: 1000,
          maxReconnectAttempts: 2,
        })
      );

      // 연결 실패를 반복적으로 시뮬레이션
      for (let i = 0; i < 3; i++) {
        act(() => {
          const errorHandler = mockSocket.on.mock.calls.find(
            ([event]) => event === 'connect_error'
          )?.[1];
          errorHandler?.({ message: '연결 실패' });
        });

        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      await waitFor(() => {
        expect(result.current.error).toContain('최대 재연결 시도 횟수');
      });

      jest.useRealTimers();
    });
  });

  describe('콜백 함수', () => {
    it('연결 상태 변경 콜백이 호출된다', async () => {
      const onConnectionStateChange = jest.fn();

      renderHook(() =>
        useRealtimeConnections({ onConnectionStateChange })
      );

      act(() => {
        mockSocket.connected = true;
        const connectHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connect'
        )?.[1];
        connectHandler?.();
      });

      await waitFor(() => {
        expect(onConnectionStateChange).toHaveBeenCalledWith('connected');
      });
    });

    it('에러 콜백이 호출된다', async () => {
      const onError = jest.fn();

      renderHook(() => useRealtimeConnections({ onError }));

      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connect_error'
        )?.[1];
        errorHandler?.({ message: '연결 에러' });
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('연결 에러');
      });
    });
  });

  describe('정리 (Cleanup)', () => {
    it('컴포넌트 언마운트 시 WebSocket 연결을 정리한다', () => {
      const { unmount } = renderHook(() => useRealtimeConnections());

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('connect');
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect');
      expect(mockSocket.off).toHaveBeenCalledWith('connect_error');
      expect(mockSocket.off).toHaveBeenCalledWith('connection_update');
      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    });

    it('자동 재연결 타이머가 정리된다', () => {
      jest.useFakeTimers();
      jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() =>
        useRealtimeConnections({ autoReconnect: true })
      );

      unmount();

      expect(clearTimeout).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});