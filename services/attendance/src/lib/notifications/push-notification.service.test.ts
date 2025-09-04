// TDD: Test-Driven Development for Push Notification Service
// Following SOLID principles

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { 
  PushNotificationService,
  FCMTokenManager,
  NotificationQueueManager,
  NotificationTemplateEngine,
  IMessagingService,
  ITokenRepository,
  INotificationQueue,
  ITemplateEngine,
  NotificationType,
  NotificationPriority
} from './push-notification.service'

describe('FCMTokenManager', () => {
  let tokenManager: FCMTokenManager
  let mockTokenRepo: jest.Mocked<ITokenRepository>

  beforeEach(() => {
    mockTokenRepo = {
      save: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      getByUser: jest.fn(),
      getByDevice: jest.fn()
    }
    tokenManager = new FCMTokenManager(mockTokenRepo)
  })

  describe('registerToken', () => {
    it('should register a new FCM token', async () => {
      const token = 'fcm_token_123'
      const userId = 'user_123'
      const deviceId = 'device_456'

      mockTokenRepo.save.mockResolvedValue({
        id: 'token_1',
        user_id: userId,
        device_id: deviceId,
        token,
        platform: 'web',
        created_at: new Date().toISOString()
      })

      const result = await tokenManager.registerToken(userId, deviceId, token, 'web')
      
      expect(result).toBeDefined()
      expect(mockTokenRepo.save).toHaveBeenCalledWith({
        user_id: userId,
        device_id: deviceId,
        token,
        platform: 'web',
        is_active: true
      })
    })

    it('should update existing token for same device', async () => {
      const oldToken = 'old_token'
      const newToken = 'new_token'
      const userId = 'user_123'
      const deviceId = 'device_456'

      mockTokenRepo.getByDevice.mockResolvedValue({
        id: 'token_1',
        user_id: userId,
        device_id: deviceId,
        token: oldToken,
        platform: 'web'
      })

      mockTokenRepo.update.mockResolvedValue({
        id: 'token_1',
        user_id: userId,
        device_id: deviceId,
        token: newToken,
        platform: 'web'
      })

      await tokenManager.registerToken(userId, deviceId, newToken, 'web')
      
      expect(mockTokenRepo.update).toHaveBeenCalledWith('token_1', {
        token: newToken,
        updated_at: expect.any(String)
      })
    })
  })

  describe('revokeToken', () => {
    it('should mark token as inactive', async () => {
      const tokenId = 'token_1'
      
      await tokenManager.revokeToken(tokenId)
      
      expect(mockTokenRepo.update).toHaveBeenCalledWith(tokenId, {
        is_active: false,
        revoked_at: expect.any(String)
      })
    })
  })

  describe('getUserTokens', () => {
    it('should return all active tokens for user', async () => {
      const userId = 'user_123'
      const tokens = [
        { id: 'token_1', token: 'fcm_1', is_active: true },
        { id: 'token_2', token: 'fcm_2', is_active: true },
        { id: 'token_3', token: 'fcm_3', is_active: false }
      ]

      mockTokenRepo.getByUser.mockResolvedValue(tokens)

      const result = await tokenManager.getUserTokens(userId)
      
      expect(result).toHaveLength(2)
      expect(result).not.toContainEqual(expect.objectContaining({ is_active: false }))
    })
  })
})

describe('NotificationTemplateEngine', () => {
  let templateEngine: NotificationTemplateEngine

  beforeEach(() => {
    templateEngine = new NotificationTemplateEngine()
  })

  describe('generateMessage', () => {
    it('should generate check-in notification', () => {
      const message = templateEngine.generateMessage(
        NotificationType.CheckIn,
        {
          employeeName: 'John Doe',
          time: '09:00 AM',
          location: 'Main Office'
        }
      )

      expect(message.title).toContain('출근 확인')
      expect(message.body).toContain('John Doe')
      expect(message.body).toContain('09:00 AM')
    })

    it('should generate shift reminder', () => {
      const message = templateEngine.generateMessage(
        NotificationType.ShiftReminder,
        {
          shiftName: 'Morning Shift',
          startTime: '08:00 AM'
        }
      )

      expect(message.title).toContain('근무 알림')
      expect(message.body).toContain('Morning Shift')
      expect(message.body).toContain('08:00 AM')
    })

    it('should generate overtime alert', () => {
      const message = templateEngine.generateMessage(
        NotificationType.OvertimeAlert,
        {
          hoursWorked: 10,
          overtimeHours: 2
        }
      )

      expect(message.title).toContain('초과근무')
      expect(message.body).toContain('10')
      expect(message.body).toContain('2')
    })
  })

  describe('shouldSendNotification', () => {
    it('should respect user preferences', () => {
      const preferences = {
        check_in: true,
        shift_reminder: false,
        overtime_alert: true
      }

      expect(templateEngine.shouldSendNotification(
        NotificationType.CheckIn, 
        preferences
      )).toBe(true)

      expect(templateEngine.shouldSendNotification(
        NotificationType.ShiftReminder,
        preferences
      )).toBe(false)
    })

    it('should default to true if preference not set', () => {
      expect(templateEngine.shouldSendNotification(
        NotificationType.CheckIn,
        {}
      )).toBe(true)
    })
  })
})

describe('NotificationQueueManager', () => {
  let queueManager: NotificationQueueManager
  let mockQueue: jest.Mocked<INotificationQueue>

  beforeEach(() => {
    mockQueue = {
      add: jest.fn(),
      process: jest.fn(),
      retry: jest.fn(),
      remove: jest.fn(),
      getPending: jest.fn(),
      getFailed: jest.fn()
    }
    queueManager = new NotificationQueueManager(mockQueue)
  })

  describe('enqueue', () => {
    it('should add notification to queue', async () => {
      const notification = {
        user_id: 'user_123',
        type: NotificationType.CheckIn,
        data: { employeeName: 'John' },
        priority: NotificationPriority.High
      }

      await queueManager.enqueue(notification)
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...notification,
          id: expect.any(String),
          created_at: expect.any(String),
          status: 'pending'
        })
      )
    })

    it('should handle batch enqueueing', async () => {
      const notifications = [
        { user_id: 'user_1', type: NotificationType.CheckIn },
        { user_id: 'user_2', type: NotificationType.CheckIn },
        { user_id: 'user_3', type: NotificationType.CheckIn }
      ]

      await queueManager.enqueueBatch(notifications)
      
      expect(mockQueue.add).toHaveBeenCalledTimes(3)
    })
  })

  describe('processQueue', () => {
    it('should process pending notifications in priority order', async () => {
      const pending = [
        { id: '1', priority: NotificationPriority.Low },
        { id: '2', priority: NotificationPriority.High },
        { id: '3', priority: NotificationPriority.Normal }
      ]

      mockQueue.getPending.mockResolvedValue(pending)
      mockQueue.process.mockResolvedValue(true)

      await queueManager.processQueue()
      
      // Should process in order: High, Normal, Low
      expect(mockQueue.process).toHaveBeenNthCalledWith(1, 
        expect.objectContaining({ id: '2' })
      )
      expect(mockQueue.process).toHaveBeenNthCalledWith(2,
        expect.objectContaining({ id: '3' })
      )
      expect(mockQueue.process).toHaveBeenNthCalledWith(3,
        expect.objectContaining({ id: '1' })
      )
    })

    it('should retry failed notifications', async () => {
      const failed = [
        { id: '1', retry_count: 1, last_error: 'Network error' }
      ]

      mockQueue.getFailed.mockResolvedValue(failed)
      mockQueue.retry.mockResolvedValue(true)

      await queueManager.retryFailed()
      
      expect(mockQueue.retry).toHaveBeenCalledWith('1')
    })

    it('should not retry if max retries exceeded', async () => {
      const failed = [
        { id: '1', retry_count: 3, last_error: 'Token invalid' }
      ]

      mockQueue.getFailed.mockResolvedValue(failed)

      await queueManager.retryFailed()
      
      expect(mockQueue.retry).not.toHaveBeenCalled()
      expect(mockQueue.remove).toHaveBeenCalledWith('1')
    })
  })
})

describe('PushNotificationService', () => {
  let service: PushNotificationService
  let mockMessaging: jest.Mocked<IMessagingService>
  let mockTokenManager: jest.Mocked<FCMTokenManager>
  let mockQueueManager: jest.Mocked<NotificationQueueManager>
  let mockTemplateEngine: jest.Mocked<NotificationTemplateEngine>

  beforeEach(() => {
    mockMessaging = {
      send: jest.fn(),
      sendMulticast: jest.fn(),
      sendToDevice: jest.fn(),
      subscribeToTopic: jest.fn(),
      unsubscribeFromTopic: jest.fn()
    }

    mockTokenManager = {
      registerToken: jest.fn(),
      revokeToken: jest.fn(),
      getUserTokens: jest.fn(),
      validateToken: jest.fn(),
      cleanupInactiveTokens: jest.fn()
    } as any

    mockQueueManager = {
      enqueue: jest.fn(),
      enqueueBatch: jest.fn(),
      processQueue: jest.fn(),
      retryFailed: jest.fn(),
      getQueueStatus: jest.fn()
    } as any

    mockTemplateEngine = {
      generateMessage: jest.fn(),
      shouldSendNotification: jest.fn(),
      getTemplate: jest.fn(),
      formatData: jest.fn()
    } as any

    service = new PushNotificationService(
      mockMessaging,
      mockTokenManager,
      mockQueueManager,
      mockTemplateEngine
    )
  })

  describe('sendNotification', () => {
    it('should send notification to user', async () => {
      const userId = 'user_123'
      const tokens = [
        { token: 'token_1' },
        { token: 'token_2' }
      ]

      mockTokenManager.getUserTokens.mockResolvedValue(tokens)
      mockTemplateEngine.shouldSendNotification.mockReturnValue(true)
      mockTemplateEngine.generateMessage.mockReturnValue({
        title: 'Test',
        body: 'Test message'
      })
      mockMessaging.sendMulticast.mockResolvedValue({
        success: 2,
        failure: 0
      })

      const result = await service.sendNotification(
        userId,
        NotificationType.CheckIn,
        { employeeName: 'John' }
      )

      expect(result.success).toBe(true)
      expect(mockMessaging.sendMulticast).toHaveBeenCalled()
    })

    it('should handle token failures', async () => {
      const userId = 'user_123'
      const tokens = [
        { id: 'token_1', token: 'invalid_token' }
      ]

      mockTokenManager.getUserTokens.mockResolvedValue(tokens)
      mockTemplateEngine.shouldSendNotification.mockReturnValue(true)
      mockTemplateEngine.generateMessage.mockReturnValue({
        title: 'Test',
        body: 'Test message'
      })
      mockMessaging.sendMulticast.mockResolvedValue({
        success: 0,
        failure: 1,
        failedTokens: ['invalid_token']
      })

      await service.sendNotification(
        userId,
        NotificationType.CheckIn,
        {}
      )

      expect(mockTokenManager.revokeToken).toHaveBeenCalledWith('token_1')
    })
  })

  describe('broadcast', () => {
    it('should send to multiple users', async () => {
      const userIds = ['user_1', 'user_2', 'user_3']
      
      mockQueueManager.enqueueBatch.mockResolvedValue(undefined)

      await service.broadcast(
        userIds,
        NotificationType.ShiftReminder,
        { shiftName: 'Morning' }
      )

      expect(mockQueueManager.enqueueBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: 'user_1' }),
          expect.objectContaining({ user_id: 'user_2' }),
          expect.objectContaining({ user_id: 'user_3' })
        ])
      )
    })
  })

  describe('topic management', () => {
    it('should subscribe user to topic', async () => {
      const userId = 'user_123'
      const topic = 'attendance_updates'
      const tokens = [{ token: 'token_1' }]

      mockTokenManager.getUserTokens.mockResolvedValue(tokens)
      mockMessaging.subscribeToTopic.mockResolvedValue(true)

      await service.subscribeToTopic(userId, topic)

      expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith(
        ['token_1'],
        topic
      )
    })

    it('should unsubscribe user from topic', async () => {
      const userId = 'user_123'
      const topic = 'attendance_updates'
      const tokens = [{ token: 'token_1' }]

      mockTokenManager.getUserTokens.mockResolvedValue(tokens)
      mockMessaging.unsubscribeFromTopic.mockResolvedValue(true)

      await service.unsubscribeFromTopic(userId, topic)

      expect(mockMessaging.unsubscribeFromTopic).toHaveBeenCalledWith(
        ['token_1'],
        topic
      )
    })
  })
})