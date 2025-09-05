/**
 * @jest-environment node
 */

import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketServerManager } from '../../src/lib/websocket-server';

// WebSocket 서버 관리자 클래스 테스트
describe('WebSocketServer', () => {
  let webSocketManager: WebSocketServerManager;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll(async () => {
    webSocketManager = WebSocketServerManager.getInstance();
    const httpServer = createServer();
    webSocketManager.initialize(httpServer);
    
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        serverPort = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await webSocketManager.stop();
  });

  beforeEach((done) => {
    // 각 테스트마다 새로운 클라이언트 연결
    clientSocket = Client(`http://localhost:${serverPort}`);
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('기본 연결 관리', () => {
    test('클라이언트가 서버에 연결될 수 있어야 함', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    test('서버가 클라이언트 연결을 감지할 수 있어야 함', (done) => {
      const socketServer = webSocketManager.getSocketIOServer();
      expect(socketServer).toBeDefined();
      
      socketServer!.on('connection', (socket) => {
        expect(socket.id).toBeDefined();
        expect(socket.connected).toBe(true);
        done();
      });
    });

    test('클라이언트 연결 해제를 처리할 수 있어야 함', (done) => {
      socketServer.on('connection', (socket) => {
        socket.on('disconnect', (reason) => {
          expect(reason).toBeDefined();
          done();
        });
      });

      setTimeout(() => {
        clientSocket.disconnect();
      }, 100);
    });
  });

  describe('사용자 인증 및 채널 관리', () => {
    test('사용자 인증 후 사용자별 채널에 참여할 수 있어야 함', (done) => {
      const userId = 'test-user-1';
      const organizationId = 'test-org-1';

      socketServer.on('connection', (socket) => {
        socket.on('authenticate', (authData) => {
          expect(authData.userId).toBe(userId);
          expect(authData.organizationId).toBe(organizationId);
          
          // 사용자별 채널 참여
          socket.join(`user:${userId}`);
          socket.join(`org:${organizationId}`);
          
          socket.emit('authenticated', { 
            success: true, 
            channels: [`user:${userId}`, `org:${organizationId}`]
          });
          done();
        });
      });

      clientSocket.emit('authenticate', { userId, organizationId });
    });

    test('조직별 채널에 메시지를 브로드캐스트할 수 있어야 함', (done) => {
      const organizationId = 'test-org-1';
      const testMessage = { type: 'attendance_update', data: 'test-data' };

      socketServer.on('connection', (socket) => {
        socket.join(`org:${organizationId}`);
        
        // 조직 채널에 메시지 수신 대기
        socket.on('org_message_received', (message) => {
          expect(message.type).toBe(testMessage.type);
          expect(message.data).toBe(testMessage.data);
          done();
        });
      });

      setTimeout(() => {
        // 조직 채널로 메시지 브로드캐스트
        socketServer.to(`org:${organizationId}`).emit('org_message_received', testMessage);
      }, 100);
    });
  });

  describe('재연결 관리', () => {
    test('연결이 끊어진 후 재연결할 수 있어야 함', (done) => {
      let reconnectCount = 0;

      clientSocket.on('connect', () => {
        reconnectCount++;
        if (reconnectCount === 2) {
          expect(clientSocket.connected).toBe(true);
          done();
        }
      });

      // 첫 번째 연결 후 의도적으로 연결 끊기
      setTimeout(() => {
        clientSocket.disconnect();
      }, 100);

      // 재연결
      setTimeout(() => {
        clientSocket.connect();
      }, 200);
    });

    test('재연결 시 이전 채널에 자동으로 재참여해야 함', (done) => {
      const userId = 'test-user-1';
      let authCount = 0;

      socketServer.on('connection', (socket) => {
        socket.on('authenticate', (authData) => {
          authCount++;
          socket.join(`user:${authData.userId}`);
          
          if (authCount === 2) {
            // 재연결 후 채널 참여 확인
            const rooms = Array.from(socket.rooms);
            expect(rooms).toContain(`user:${userId}`);
            done();
          }
          
          socket.emit('authenticated', { success: true });
        });
      });

      // 첫 번째 인증
      clientSocket.emit('authenticate', { userId });

      setTimeout(() => {
        clientSocket.disconnect();
        setTimeout(() => {
          clientSocket.connect();
          setTimeout(() => {
            // 재연결 후 재인증
            clientSocket.emit('authenticate', { userId });
          }, 100);
        }, 100);
      }, 100);
    });
  });

  describe('에러 처리', () => {
    test('잘못된 인증 데이터를 처리할 수 있어야 함', (done) => {
      socketServer.on('connection', (socket) => {
        socket.on('authenticate', (authData) => {
          if (!authData.userId) {
            socket.emit('auth_error', { 
              error: 'Missing userId',
              code: 'INVALID_AUTH_DATA'
            });
            done();
          }
        });
      });

      clientSocket.on('auth_error', (error) => {
        expect(error.error).toBe('Missing userId');
        expect(error.code).toBe('INVALID_AUTH_DATA');
      });

      clientSocket.emit('authenticate', { invalidData: true });
    });

    test('서버 오류 시 클라이언트에게 적절한 에러 메시지를 전달해야 함', (done) => {
      socketServer.on('connection', (socket) => {
        socket.on('test_error', () => {
          socket.emit('server_error', {
            error: 'Internal server error',
            code: 'SERVER_ERROR'
          });
        });
      });

      clientSocket.on('server_error', (error) => {
        expect(error.error).toBe('Internal server error');
        expect(error.code).toBe('SERVER_ERROR');
        done();
      });

      clientSocket.emit('test_error');
    });
  });
});