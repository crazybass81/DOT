import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { auditLogger, AuditAction, AuditResult } from './audit-logger';

// WebSocket 연결 관리 인터페이스
export interface SocketConnection {
  id: string;
  userId?: string;
  organizationId?: string;
  channels: string[];
  lastPing: Date;
  authenticated: boolean;
}

// 인증 데이터 인터페이스
export interface AuthData {
  userId: string;
  organizationId?: string;
  token?: string;
}

// WebSocket 이벤트 타입
export interface WebSocketEvents {
  // 클라이언트 -> 서버
  authenticate: (authData: AuthData) => void;
  join_channel: (channel: string) => void;
  leave_channel: (channel: string) => void;
  ping: () => void;
  test_error: () => void;

  // 서버 -> 클라이언트
  authenticated: (response: { success: boolean; channels?: string[]; error?: string }) => void;
  auth_error: (error: { error: string; code: string }) => void;
  server_error: (error: { error: string; code: string }) => void;
  org_message_received: (message: any) => void;
  user_notification: (notification: any) => void;
  pong: () => void;
}

/**
 * WebSocket 서버 관리 클래스
 * 실시간 알림 시스템의 핵심 컴포넌트
 */
export class WebSocketServerManager {
  private static instance: WebSocketServerManager;
  private io?: SocketIOServer;
  private httpServer?: any;
  private connections: Map<string, SocketConnection> = new Map();
  private userChannels: Map<string, Set<string>> = new Map(); // userId -> channelIds
  private channelUsers: Map<string, Set<string>> = new Map(); // channelId -> socketIds

  private constructor() {
    this.setupHeartbeat();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): WebSocketServerManager {
    if (!WebSocketServerManager.instance) {
      WebSocketServerManager.instance = new WebSocketServerManager();
    }
    return WebSocketServerManager.instance;
  }

  /**
   * WebSocket 서버 초기화
   */
  public initialize(httpServer?: any, options?: any): SocketIOServer {
    if (httpServer) {
      this.httpServer = httpServer;
    } else if (!this.httpServer) {
      this.httpServer = createServer();
    }

    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      ...options
    });

    this.setupEventHandlers();
    return this.io;
  }

  /**
   * 서버 시작
   */
  public start(port: number = 3003): Promise<void> {
    return new Promise((resolve) => {
      if (!this.httpServer) {
        throw new Error('Server not initialized. Call initialize() first.');
      }

      this.httpServer.listen(port, () => {
        console.log(`WebSocket 서버가 포트 ${port}에서 시작되었습니다.`);
        resolve();
      });
    });
  }

  /**
   * 서버 중지
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.connections.clear();
      this.userChannels.clear();
      this.channelUsers.clear();

      if (this.io) {
        this.io.close();
      }

      if (this.httpServer) {
        this.httpServer.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`새로운 연결: ${socket.id}`);

      // 연결 정보 저장
      this.connections.set(socket.id, {
        id: socket.id,
        channels: [],
        lastPing: new Date(),
        authenticated: false
      });

      // 인증 핸들러
      socket.on('authenticate', async (authData: AuthData) => {
        try {
          await this.handleAuthentication(socket, authData);
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('auth_error', {
            error: 'Authentication failed',
            code: 'AUTH_FAILED'
          });
        }
      });

      // 채널 참여 핸들러
      socket.on('join_channel', (channel: string) => {
        this.joinChannel(socket.id, channel);
      });

      // 채널 떠나기 핸들러
      socket.on('leave_channel', (channel: string) => {
        this.leaveChannel(socket.id, channel);
      });

      // Ping 핸들러
      socket.on('ping', () => {
        const connection = this.connections.get(socket.id);
        if (connection) {
          connection.lastPing = new Date();
          socket.emit('pong');
        }
      });

      // 테스트 에러 핸들러 (테스트 용도)
      socket.on('test_error', () => {
        socket.emit('server_error', {
          error: 'Internal server error',
          code: 'SERVER_ERROR'
        });
      });

      // 연결 해제 핸들러
      socket.on('disconnect', (reason) => {
        console.log(`연결 해제: ${socket.id}, 이유: ${reason}`);
        this.handleDisconnection(socket.id);
      });
    });
  }

  /**
   * 사용자 인증 처리
   */
  private async handleAuthentication(socket: any, authData: AuthData): Promise<void> {
    // 기본 유효성 검사
    if (!authData.userId) {
      socket.emit('auth_error', {
        error: 'Missing userId',
        code: 'INVALID_AUTH_DATA'
      });
      return;
    }

    const connection = this.connections.get(socket.id);
    if (!connection) {
      socket.emit('auth_error', {
        error: 'Connection not found',
        code: 'CONNECTION_ERROR'
      });
      return;
    }

    // JWT 토큰 검증
    if (authData.token) {
      const validationResult = await this.validateJWTToken(authData.token);
      if (!validationResult.isValid) {
        socket.emit('auth_error', { 
          error: validationResult.error || 'Invalid token', 
          code: validationResult.errorCode || 'INVALID_TOKEN' 
        });
        
        // 감사 로그 기록 - 인증 실패
        try {
          await auditLogger.log({
            user_id: authData.userId || 'unknown',
            organization_id: authData.organizationId,
            action: AuditAction.WEBSOCKET_AUTH_FAILED,
            result: AuditResult.FAILURE,
            resource_type: 'websocket_authentication',
            resource_id: socket.id,
            details: {
              socket_id: socket.id,
              error: validationResult.error,
              token_expired: validationResult.errorCode === 'TOKEN_EXPIRED'
            },
            ip_address: socket.handshake.address || 'unknown',
            user_agent: socket.handshake.headers['user-agent'] || 'unknown'
          });
        } catch (error) {
          console.error('Failed to log authentication failure:', error);
        }
        
        return;
      }
      
      // 토큰에서 추출된 사용자 정보와 요청된 정보 비교
      if (validationResult.payload && validationResult.payload.userId !== authData.userId) {
        socket.emit('auth_error', { 
          error: 'Token user ID mismatch', 
          code: 'USER_MISMATCH' 
        });
        return;
      }
    } else {
      // 프로덕션에서는 토큰이 필수여야 함
      if (process.env.NODE_ENV === 'production') {
        socket.emit('auth_error', { 
          error: 'Authentication token required', 
          code: 'TOKEN_REQUIRED' 
        });
        return;
      }
    }

    // 연결 정보 업데이트
    connection.userId = authData.userId;
    connection.organizationId = authData.organizationId;
    connection.authenticated = true;

    // 사용자 채널 설정
    const channels = this.setupUserChannels(socket, authData);

    // 감사 로그 기록
    try {
      await auditLogger.log({
        user_id: authData.userId,
        organization_id: authData.organizationId,
        action: AuditAction.WEBSOCKET_CONNECT,
        result: AuditResult.SUCCESS,
        resource_type: 'websocket_connection',
        resource_id: socket.id,
        details: {
          socket_id: socket.id,
          channels: channels,
          client_ip: socket.handshake.address
        },
        ip_address: socket.handshake.address || 'unknown',
        user_agent: socket.handshake.headers['user-agent'] || 'unknown'
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }

    // 인증 성공 응답
    socket.emit('authenticated', {
      success: true,
      channels: channels
    });

    console.log(`사용자 인증 완료: ${authData.userId} (${socket.id})`);
  }

  /**
   * 사용자 채널 설정
   */
  private setupUserChannels(socket: any, authData: AuthData): string[] {
    const channels: string[] = [];

    // 개인 채널 참여
    const userChannel = `user:${authData.userId}`;
    socket.join(userChannel);
    channels.push(userChannel);
    this.addToChannel(socket.id, userChannel);

    // 조직 채널 참여 (조직이 있는 경우)
    if (authData.organizationId) {
      const orgChannel = `org:${authData.organizationId}`;
      socket.join(orgChannel);
      channels.push(orgChannel);
      this.addToChannel(socket.id, orgChannel);
    }

    // 연결 정보 업데이트
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.channels = channels;
    }

    return channels;
  }

  /**
   * 채널에 소켓 추가
   */
  private addToChannel(socketId: string, channel: string): void {
    if (!this.channelUsers.has(channel)) {
      this.channelUsers.set(channel, new Set());
    }
    this.channelUsers.get(channel)!.add(socketId);

    const connection = this.connections.get(socketId);
    if (connection && connection.userId) {
      if (!this.userChannels.has(connection.userId)) {
        this.userChannels.set(connection.userId, new Set());
      }
      this.userChannels.get(connection.userId)!.add(channel);
    }
  }

  /**
   * 채널 참여
   */
  private joinChannel(socketId: string, channel: string): void {
    if (!this.io) return;

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(channel);
      this.addToChannel(socketId, channel);

      const connection = this.connections.get(socketId);
      if (connection && !connection.channels.includes(channel)) {
        connection.channels.push(channel);
      }
    }
  }

  /**
   * 채널 떠나기
   */
  private leaveChannel(socketId: string, channel: string): void {
    if (!this.io) return;

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(channel);

      // 채널에서 소켓 제거
      const channelSockets = this.channelUsers.get(channel);
      if (channelSockets) {
        channelSockets.delete(socketId);
        if (channelSockets.size === 0) {
          this.channelUsers.delete(channel);
        }
      }

      // 연결 정보 업데이트
      const connection = this.connections.get(socketId);
      if (connection) {
        connection.channels = connection.channels.filter(c => c !== channel);
      }
    }
  }

  /**
   * 연결 해제 처리
   */
  private handleDisconnection(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      // 모든 채널에서 제거
      connection.channels.forEach(channel => {
        const channelSockets = this.channelUsers.get(channel);
        if (channelSockets) {
          channelSockets.delete(socketId);
          if (channelSockets.size === 0) {
            this.channelUsers.delete(channel);
          }
        }
      });

      // 사용자 채널 정보 정리
      if (connection.userId) {
        this.userChannels.delete(connection.userId);
      }

      // 연결 제거
      this.connections.delete(socketId);
    }
  }

  /**
   * 하트비트 설정
   */
  private setupHeartbeat(): void {
    setInterval(() => {
      const now = new Date();
      const timeout = 30000; // 30초

      this.connections.forEach((connection, socketId) => {
        if (now.getTime() - connection.lastPing.getTime() > timeout) {
          console.log(`연결 시간 초과: ${socketId}`);
          
          if (this.io) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
              socket.disconnect();
            }
          }
        }
      });
    }, 15000); // 15초마다 체크
  }

  /**
   * 특정 사용자에게 메시지 전송
   */
  public sendToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    const userChannel = `user:${userId}`;
    this.io.to(userChannel).emit(event, data);
  }

  /**
   * 특정 조직에게 메시지 브로드캐스트
   */
  public broadcastToOrganization(organizationId: string, event: string, data: any): void {
    if (!this.io) return;

    const orgChannel = `org:${organizationId}`;
    this.io.to(orgChannel).emit(event, data);
  }

  /**
   * 특정 채널에 메시지 전송
   */
  public sendToChannel(channel: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(channel).emit(event, data);
  }

  /**
   * 연결 통계 조회
   */
  public getConnectionStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    activeChannels: number;
    connectionsByOrg: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      authenticatedConnections: 0,
      activeChannels: this.channelUsers.size,
      connectionsByOrg: {} as Record<string, number>
    };

    this.connections.forEach(connection => {
      if (connection.authenticated) {
        stats.authenticatedConnections++;

        if (connection.organizationId) {
          if (!stats.connectionsByOrg[connection.organizationId]) {
            stats.connectionsByOrg[connection.organizationId] = 0;
          }
          stats.connectionsByOrg[connection.organizationId]++;
        }
      }
    });

    return stats;
  }

  /**
   * JWT 토큰 검증
   */
  private async validateJWTToken(token: string): Promise<JWTValidationResult> {
    try {
      // Import JWT library dynamically to avoid issues if not installed
      const jwt = await import('jsonwebtoken');
      
      const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
      if (!secret) {
        return {
          isValid: false,
          error: 'JWT secret not configured',
          errorCode: 'JWT_SECRET_MISSING'
        };
      }

      // Remove Bearer prefix if present
      const cleanToken = token.replace(/^Bearer\s+/, '');
      
      // Verify token
      const decoded = jwt.verify(cleanToken, secret, {
        algorithms: ['HS256', 'RS256']
      }) as any;

      // Validate token structure
      if (!decoded || typeof decoded !== 'object') {
        return {
          isValid: false,
          error: 'Invalid token structure',
          errorCode: 'INVALID_TOKEN_STRUCTURE'
        };
      }

      // Check expiration
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return {
          isValid: false,
          error: 'Token expired',
          errorCode: 'TOKEN_EXPIRED'
        };
      }

      // Extract user information
      const payload = {
        userId: decoded.sub || decoded.user_id || decoded.id,
        email: decoded.email,
        organizationId: decoded.organization_id || decoded.org_id,
        roles: decoded.roles || decoded.role ? [decoded.role] : [],
        exp: decoded.exp,
        iat: decoded.iat
      };

      // Validate required fields
      if (!payload.userId) {
        return {
          isValid: false,
          error: 'Token missing user ID',
          errorCode: 'MISSING_USER_ID'
        };
      }

      return {
        isValid: true,
        payload
      };

    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return {
          isValid: false,
          error: 'Invalid token format',
          errorCode: 'INVALID_TOKEN_FORMAT'
        };
      } else if (error.name === 'TokenExpiredError') {
        return {
          isValid: false,
          error: 'Token expired',
          errorCode: 'TOKEN_EXPIRED'
        };
      } else if (error.name === 'NotBeforeError') {
        return {
          isValid: false,
          error: 'Token not yet valid',
          errorCode: 'TOKEN_NOT_BEFORE'
        };
      } else {
        console.error('JWT validation error:', error);
        return {
          isValid: false,
          error: 'Token validation failed',
          errorCode: 'VALIDATION_FAILED'
        };
      }
    }
  }

  /**
   * Socket.IO 서버 인스턴스 반환
   */
  public getSocketIOServer(): SocketIOServer | undefined {
    return this.io;
  }

  /**
   * HTTP 서버 인스턴스 반환
   */
  public getHttpServer(): any {
    return this.httpServer;
  }
}

// 싱글톤 인스턴스 내보내기
export const webSocketServer = WebSocketServerManager.getInstance();