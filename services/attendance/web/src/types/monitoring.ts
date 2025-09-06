/**
 * 실시간 접속 현황 모니터링 시스템 타입 정의
 */

export interface ConnectionUser {
  /** 사용자 ID */
  userId: string;
  /** 사용자명 */
  userName: string;
  /** 소켓 연결 ID */
  socketId: string;
  /** 접속 시간 */
  connectedAt: Date;
  /** 마지막 활동 시간 */
  lastActivity: Date;
  /** 클라이언트 IP 주소 */
  ipAddress: string;
  /** 사용자 에이전트 */
  userAgent?: string;
  /** 조직 ID */
  organizationId?: string;
  /** 참여 중인 채널 목록 */
  channels: string[];
  /** 인증 상태 */
  authenticated: boolean;
}

export interface ConnectionStats {
  /** 총 접속자 수 */
  totalConnections: number;
  /** 인증된 접속자 수 */
  authenticatedConnections: number;
  /** 활성 채널 수 */
  activeChannels: number;
  /** 조직별 접속자 수 */
  connectionsByOrg: Record<string, number>;
  /** 마지막 업데이트 시간 */
  lastUpdated: Date;
}

export interface RealtimeConnectionsState {
  /** 현재 접속 중인 사용자 목록 */
  connectedUsers: ConnectionUser[];
  /** 접속 통계 */
  stats: ConnectionStats;
  /** WebSocket 연결 상태 */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 정보 */
  error: string | null;
}

export interface WebSocketConnectionEvent {
  type: 'user_connected' | 'user_disconnected' | 'user_activity' | 'stats_updated';
  data: ConnectionUser | ConnectionStats;
  timestamp: Date;
}

export interface UseRealtimeConnectionsOptions {
  /** 자동 재연결 활성화 */
  autoReconnect?: boolean;
  /** 재연결 시도 간격 (밀리초) */
  reconnectInterval?: number;
  /** 최대 재연결 시도 횟수 */
  maxReconnectAttempts?: number;
  /** 연결 상태 변경 콜백 */
  onConnectionStateChange?: (state: RealtimeConnectionsState['connectionStatus']) => void;
  /** 에러 발생 콜백 */
  onError?: (error: string) => void;
}