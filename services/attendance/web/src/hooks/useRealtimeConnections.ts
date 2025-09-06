import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ConnectionUser,
  ConnectionStats,
  RealtimeConnectionsState,
  WebSocketConnectionEvent,
  UseRealtimeConnectionsOptions,
} from '../types/monitoring';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3003';

const initialStats: ConnectionStats = {
  totalConnections: 0,
  authenticatedConnections: 0,
  activeChannels: 0,
  connectionsByOrg: {},
  lastUpdated: new Date(),
};

const initialState: RealtimeConnectionsState = {
  connectedUsers: [],
  stats: initialStats,
  connectionStatus: 'disconnected',
  isLoading: false,
  error: null,
};

export function useRealtimeConnections(options: UseRealtimeConnectionsOptions = {}) {
  const {
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onConnectionStateChange,
    onError,
  } = options;

  const [state, setState] = useState<RealtimeConnectionsState>(initialState);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateConnectionStatus = useCallback(
    (status: RealtimeConnectionsState['connectionStatus']) => {
      setState(prev => ({ ...prev, connectionStatus: status }));
      onConnectionStateChange?.(status);
    },
    [onConnectionStateChange]
  );

  const handleError = useCallback(
    (errorMessage: string) => {
      setState(prev => ({ ...prev, error: errorMessage, connectionStatus: 'error' }));
      onError?.(errorMessage);
    },
    [onError]
  );

  const handleConnectionUpdate = useCallback((event: WebSocketConnectionEvent) => {
    setState(prev => {
      let newUsers = [...prev.connectedUsers];
      let newStats = { ...prev.stats };

      if (event.type === 'user_connected') {
        const user = event.data as ConnectionUser;
        // 이미 존재하는 사용자인지 확인
        const existingIndex = newUsers.findIndex(u => u.socketId === user.socketId);
        if (existingIndex === -1) {
          newUsers.push(user);
        } else {
          newUsers[existingIndex] = user;
        }

        // 통계 업데이트
        newStats = {
          ...newStats,
          totalConnections: newUsers.length,
          authenticatedConnections: newUsers.filter(u => u.authenticated).length,
          lastUpdated: new Date(),
        };

        // 조직별 통계 업데이트
        newStats.connectionsByOrg = {};
        newUsers.forEach(user => {
          if (user.organizationId) {
            newStats.connectionsByOrg[user.organizationId] = 
              (newStats.connectionsByOrg[user.organizationId] || 0) + 1;
          }
        });

      } else if (event.type === 'user_disconnected') {
        const user = event.data as ConnectionUser;
        newUsers = newUsers.filter(u => u.socketId !== user.socketId);

        // 통계 업데이트
        newStats = {
          ...newStats,
          totalConnections: newUsers.length,
          authenticatedConnections: newUsers.filter(u => u.authenticated).length,
          lastUpdated: new Date(),
        };

        // 조직별 통계 업데이트
        newStats.connectionsByOrg = {};
        newUsers.forEach(user => {
          if (user.organizationId) {
            newStats.connectionsByOrg[user.organizationId] = 
              (newStats.connectionsByOrg[user.organizationId] || 0) + 1;
          }
        });

      } else if (event.type === 'stats_updated') {
        newStats = event.data as ConnectionStats;

      } else if (event.type === 'user_activity') {
        const user = event.data as ConnectionUser;
        const userIndex = newUsers.findIndex(u => u.socketId === user.socketId);
        if (userIndex !== -1) {
          newUsers[userIndex] = { ...newUsers[userIndex], lastActivity: user.lastActivity };
        }
      }

      return {
        ...prev,
        connectedUsers: newUsers,
        stats: newStats,
      };
    });
  }, []);

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, connectionStatus: 'connecting', isLoading: true, error: null }));

    const socket = io(WEBSOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: false, // 수동으로 재연결 관리
    });

    socket.on('connect', () => {
      console.log('WebSocket connected for monitoring');
      reconnectAttemptsRef.current = 0;
      updateConnectionStatus('connected');
      setState(prev => ({ ...prev, isLoading: false, error: null }));

      // 모니터링 채널에 참여
      socket.emit('join_channel', 'monitoring:connections');
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      updateConnectionStatus('disconnected');
      
      // 자동 재연결 시도
      if (autoReconnect && reason !== 'io client disconnect') {
        scheduleReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      const errorMessage = error.message || '연결 오류가 발생했습니다.';
      handleError(errorMessage);
      setState(prev => ({ ...prev, isLoading: false }));
      
      // 자동 재연결 시도
      if (autoReconnect) {
        scheduleReconnect();
      }
    });

    // 연결 업데이트 이벤트 수신
    socket.on('connection_update', handleConnectionUpdate);

    socketRef.current = socket;
  }, [autoReconnect, updateConnectionStatus, handleError, handleConnectionUpdate]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      handleError(`최대 재연결 시도 횟수(${maxReconnectAttempts})를 초과했습니다.`);
      return;
    }

    reconnectAttemptsRef.current++;
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    reconnectTimerRef.current = setTimeout(() => {
      console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
      connectSocket();
    }, reconnectInterval);
  }, [maxReconnectAttempts, reconnectInterval, handleError, connectSocket]);

  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    connectSocket();
  }, [connectSocket]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState(initialState);
  }, []);

  // 초기 연결
  useEffect(() => {
    connectSocket();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('connection_update');
        socketRef.current.disconnect();
      }
    };
  }, [connectSocket]);

  return {
    ...state,
    reconnect,
    disconnect,
  };
}