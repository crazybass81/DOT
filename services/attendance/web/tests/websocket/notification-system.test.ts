/**
 * @jest-environment node
 */

import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketServerManager } from '../../src/lib/websocket-server';
import { NotificationManager, NotificationType, NotificationData } from '../../src/lib/notification-manager';

// 알림 시스템 테스트
describe('NotificationSystem', () => {
  let webSocketManager: WebSocketServerManager;
  let notificationManager: NotificationManager;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let serverPort: number;

  beforeAll(async () => {
    webSocketManager = WebSocketServerManager.getInstance();
    notificationManager = NotificationManager.getInstance();
    
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
    let connectedCount = 0;
    const checkAllConnected = () => {
      connectedCount++;
      if (connectedCount === 2) {
        done();
      }
    };

    clientSocket1 = Client(`http://localhost:${serverPort}`);
    clientSocket1.on('connect', checkAllConnected);

    clientSocket2 = Client(`http://localhost:${serverPort}`);
    clientSocket2.on('connect', checkAllConnected);
  });

  afterEach(() => {
    if (clientSocket1.connected) clientSocket1.disconnect();
    if (clientSocket2.connected) clientSocket2.disconnect();
  });

  describe('출근/퇴근 알림', () => {
    test('사용자가 출근 체크인하면 조직 멤버들에게 알림을 전송해야 함', (done) => {
      const userId = 'user-1';
      const organizationId = 'org-1';
      const checkInData = {
        userId,
        userName: '김철수',
        organizationId,
        checkInTime: new Date().toISOString(),
        location: { lat: 37.5665, lng: 126.9780, address: '서울시 중구' }
      };

      // 첫 번째 클라이언트: 출근 체크인하는 사용자
      clientSocket1.on('authenticated', () => {
        // 두 번째 클라이언트: 같은 조직의 다른 사용자
        clientSocket2.emit('authenticate', { 
          userId: 'user-2', 
          organizationId 
        });
      });

      // 두 번째 클라이언트 인증 완료 후 알림 대기
      clientSocket2.on('authenticated', () => {
        clientSocket2.on('attendance_notification', (notification) => {
          expect(notification.type).toBe(NotificationType.ATTENDANCE_CHECK_IN);
          expect(notification.data.userId).toBe(userId);
          expect(notification.data.userName).toBe('김철수');
          expect(notification.data.checkInTime).toBeDefined();
          expect(notification.data.location).toEqual(checkInData.location);
          done();
        });

        // 출근 체크인 알림 전송
        setTimeout(() => {
          notificationManager.sendAttendanceCheckIn(checkInData);
        }, 100);
      });

      // 첫 번째 클라이언트 인증 시작
      clientSocket1.emit('authenticate', { userId, organizationId });
    });

    test('사용자가 퇴근 체크아웃하면 조직 멤버들에게 알림을 전송해야 함', (done) => {
      const userId = 'user-1';
      const organizationId = 'org-1';
      const checkOutData = {
        userId,
        userName: '김철수',
        organizationId,
        checkOutTime: new Date().toISOString(),
        workHours: 8.5,
        overtimeHours: 0.5
      };

      clientSocket1.on('authenticated', () => {
        clientSocket2.emit('authenticate', { 
          userId: 'user-2', 
          organizationId 
        });
      });

      clientSocket2.on('authenticated', () => {
        clientSocket2.on('attendance_notification', (notification) => {
          expect(notification.type).toBe(NotificationType.ATTENDANCE_CHECK_OUT);
          expect(notification.data.userId).toBe(userId);
          expect(notification.data.userName).toBe('김철수');
          expect(notification.data.workHours).toBe(8.5);
          expect(notification.data.overtimeHours).toBe(0.5);
          done();
        });

        setTimeout(() => {
          notificationManager.sendAttendanceCheckOut(checkOutData);
        }, 100);
      });

      clientSocket1.emit('authenticate', { userId, organizationId });
    });
  });

  describe('역할 변경 알림', () => {
    test('사용자 역할이 변경되면 해당 사용자에게 개인 알림을 전송해야 함', (done) => {
      const userId = 'user-1';
      const organizationId = 'org-1';
      const roleChangeData = {
        userId,
        userName: '김철수',
        organizationId,
        oldRole: 'WORKER',
        newRole: 'ADMIN',
        changedBy: 'manager-1',
        changedByName: '박관리자'
      };

      clientSocket1.on('authenticated', () => {
        clientSocket1.on('role_notification', (notification) => {
          expect(notification.type).toBe(NotificationType.ROLE_CHANGED);
          expect(notification.data.userId).toBe(userId);
          expect(notification.data.oldRole).toBe('WORKER');
          expect(notification.data.newRole).toBe('ADMIN');
          expect(notification.data.changedBy).toBe('manager-1');
          expect(notification.data.changedByName).toBe('박관리자');
          done();
        });

        setTimeout(() => {
          notificationManager.sendRoleChange(roleChangeData);
        }, 100);
      });

      clientSocket1.emit('authenticate', { userId, organizationId });
    });

    test('새 역할이 부여되면 해당 사용자에게 환영 메시지를 전송해야 함', (done) => {
      const userId = 'user-1';
      const organizationId = 'org-1';
      const roleAssignData = {
        userId,
        userName: '김철수',
        organizationId,
        organizationName: '테스트 조직',
        newRole: 'MANAGER',
        assignedBy: 'admin-1',
        assignedByName: '이어드민'
      };

      clientSocket1.on('authenticated', () => {
        clientSocket1.on('role_notification', (notification) => {
          expect(notification.type).toBe(NotificationType.ROLE_ASSIGNED);
          expect(notification.data.userId).toBe(userId);
          expect(notification.data.newRole).toBe('MANAGER');
          expect(notification.data.organizationName).toBe('테스트 조직');
          expect(notification.data.assignedBy).toBe('admin-1');
          done();
        });

        setTimeout(() => {
          notificationManager.sendRoleAssign(roleAssignData);
        }, 100);
      });

      clientSocket1.emit('authenticate', { userId, organizationId });
    });
  });

  describe('조직 초대/승인 알림', () => {
    test('조직 가입 초대를 받으면 해당 사용자에게 개인 알림을 전송해야 함', (done) => {
      const userId = 'user-1';
      const invitationData = {
        userId,
        userName: '김철수',
        organizationId: 'org-2',
        organizationName: '새로운 조직',
        invitedBy: 'manager-2',
        invitedByName: '최매니저',
        role: 'WORKER',
        invitationToken: 'invite-token-123'
      };

      clientSocket1.on('authenticated', () => {
        clientSocket1.on('organization_notification', (notification) => {
          expect(notification.type).toBe(NotificationType.ORGANIZATION_INVITED);
          expect(notification.data.organizationName).toBe('새로운 조직');
          expect(notification.data.invitedBy).toBe('manager-2');
          expect(notification.data.role).toBe('WORKER');
          expect(notification.data.invitationToken).toBe('invite-token-123');
          done();
        });

        setTimeout(() => {
          notificationManager.sendOrganizationInvitation(invitationData);
        }, 100);
      });

      clientSocket1.emit('authenticate', { userId, organizationId: 'org-1' });
    });

    test('조직 가입이 승인되면 해당 사용자에게 환영 알림을 전송해야 함', (done) => {
      const userId = 'user-1';
      const approvalData = {
        userId,
        userName: '김철수',
        organizationId: 'org-2',
        organizationName: '새로운 조직',
        approvedBy: 'admin-2',
        approvedByName: '정어드민',
        role: 'WORKER'
      };

      clientSocket1.on('authenticated', () => {
        clientSocket1.on('organization_notification', (notification) => {
          expect(notification.type).toBe(NotificationType.ORGANIZATION_APPROVED);
          expect(notification.data.organizationName).toBe('새로운 조직');
          expect(notification.data.approvedBy).toBe('admin-2');
          expect(notification.data.role).toBe('WORKER');
          done();
        });

        setTimeout(() => {
          notificationManager.sendOrganizationApproval(approvalData);
        }, 100);
      });

      clientSocket1.emit('authenticate', { userId, organizationId: 'org-1' });
    });
  });

  describe('시스템 공지사항', () => {
    test('시스템 전체 공지사항을 모든 연결된 사용자에게 브로드캐스트해야 함', (done) => {
      const announcementData = {
        title: '시스템 점검 안내',
        message: '2024년 1월 15일 02:00-04:00 시스템 점검이 예정되어 있습니다.',
        priority: 'HIGH',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
        createdBy: 'system'
      };

      let receivedCount = 0;
      const checkAllReceived = (notification: any) => {
        expect(notification.type).toBe(NotificationType.SYSTEM_ANNOUNCEMENT);
        expect(notification.data.title).toBe('시스템 점검 안내');
        expect(notification.data.priority).toBe('HIGH');
        
        receivedCount++;
        if (receivedCount === 2) {
          done();
        }
      };

      clientSocket1.on('authenticated', () => {
        clientSocket2.emit('authenticate', { 
          userId: 'user-2', 
          organizationId: 'org-1' 
        });
      });

      clientSocket1.on('system_notification', checkAllReceived);
      clientSocket2.on('system_notification', checkAllReceived);

      clientSocket2.on('authenticated', () => {
        setTimeout(() => {
          notificationManager.broadcastSystemAnnouncement(announcementData);
        }, 100);
      });

      clientSocket1.emit('authenticate', { 
        userId: 'user-1', 
        organizationId: 'org-1' 
      });
    });

    test('조직별 공지사항을 해당 조직 멤버들에게만 전송해야 함', (done) => {
      const organizationId = 'org-1';
      const orgAnnouncementData = {
        organizationId,
        organizationName: '테스트 조직',
        title: '월례 회의 안내',
        message: '이번 달 월례 회의는 1월 20일 오후 2시에 진행됩니다.',
        priority: 'MEDIUM',
        validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 후
        createdBy: 'manager-1',
        createdByName: '박관리자'
      };

      clientSocket1.on('authenticated', () => {
        // 다른 조직 사용자 연결 (알림을 받으면 안됨)
        clientSocket2.emit('authenticate', { 
          userId: 'user-2', 
          organizationId: 'org-2' 
        });
      });

      let notificationReceived = false;
      clientSocket1.on('organization_notification', (notification) => {
        expect(notification.type).toBe(NotificationType.ORGANIZATION_ANNOUNCEMENT);
        expect(notification.data.title).toBe('월례 회의 안내');
        expect(notification.data.organizationName).toBe('테스트 조직');
        notificationReceived = true;
      });

      // 다른 조직 사용자는 알림을 받으면 안됨
      clientSocket2.on('organization_notification', () => {
        fail('다른 조직 사용자가 알림을 받았습니다.');
      });

      clientSocket2.on('authenticated', () => {
        setTimeout(() => {
          notificationManager.sendOrganizationAnnouncement(orgAnnouncementData);
          
          // 알림이 제대로 전송되었는지 확인
          setTimeout(() => {
            expect(notificationReceived).toBe(true);
            done();
          }, 200);
        }, 100);
      });

      clientSocket1.emit('authenticate', { 
        userId: 'user-1', 
        organizationId 
      });
    });
  });

  describe('알림 이력 관리', () => {
    test('전송된 알림이 데이터베이스에 저장되어야 함', async () => {
      const notificationData = {
        userId: 'user-1',
        userName: '김철수',
        organizationId: 'org-1',
        checkInTime: new Date().toISOString(),
        location: { lat: 37.5665, lng: 126.9780, address: '서울시 중구' }
      };

      const result = await notificationManager.sendAttendanceCheckIn(notificationData);
      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
    });

    test('사용자별 알림 이력을 조회할 수 있어야 함', async () => {
      const userId = 'user-1';
      const result = await notificationManager.getUserNotifications(userId, {
        limit: 10,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.notifications)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
    });

    test('알림을 읽음 상태로 표시할 수 있어야 함', async () => {
      const notificationId = 'test-notification-1';
      const userId = 'user-1';
      
      const result = await notificationManager.markAsRead(notificationId, userId);
      expect(result.success).toBe(true);
    });
  });
});