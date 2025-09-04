// Push Notification Service - SOLID Principles Applied
// Handles FCM (Firebase Cloud Messaging) for attendance notifications

// Interface Segregation Principle
export interface IMessagingService {
  send(token: string, message: NotificationMessage): Promise<MessageResult>
  sendMulticast(tokens: string[], message: NotificationMessage): Promise<MulticastResult>
  sendToDevice(deviceToken: string, payload: any): Promise<MessageResult>
  subscribeToTopic(tokens: string[], topic: string): Promise<boolean>
  unsubscribeFromTopic(tokens: string[], topic: string): Promise<boolean>
}

export interface ITokenRepository {
  save(token: TokenData): Promise<FCMToken>
  get(tokenId: string): Promise<FCMToken | null>
  delete(tokenId: string): Promise<void>
  update(tokenId: string, data: Partial<TokenData>): Promise<FCMToken>
  getByUser(userId: string): Promise<FCMToken[]>
  getByDevice(deviceId: string): Promise<FCMToken | null>
}

export interface INotificationQueue {
  add(notification: QueuedNotification): Promise<void>
  process(notification: QueuedNotification): Promise<boolean>
  retry(notificationId: string): Promise<boolean>
  remove(notificationId: string): Promise<void>
  getPending(): Promise<QueuedNotification[]>
  getFailed(): Promise<QueuedNotification[]>
}

export interface ITemplateEngine {
  generateMessage(type: NotificationType, data: any): NotificationMessage
  shouldSendNotification(type: NotificationType, preferences: any): boolean
  getTemplate(type: NotificationType): MessageTemplate
  formatData(template: string, data: any): string
}

// Data structures
export enum NotificationType {
  CheckIn = 'check_in',
  CheckOut = 'check_out',
  ShiftReminder = 'shift_reminder',
  ShiftAssignment = 'shift_assignment',
  LeaveApproval = 'leave_approval',
  OvertimeAlert = 'overtime_alert',
  Announcement = 'announcement'
}

export enum NotificationPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Urgent = 3
}

export interface NotificationMessage {
  title: string
  body: string
  data?: Record<string, string>
  icon?: string
  badge?: string
  sound?: string
  priority?: NotificationPriority
}

export interface FCMToken {
  id: string
  user_id: string
  device_id: string
  token: string
  platform: 'ios' | 'android' | 'web'
  is_active: boolean
  created_at: string
  updated_at?: string
  revoked_at?: string
}

export interface TokenData {
  user_id: string
  device_id: string
  token: string
  platform: 'ios' | 'android' | 'web'
  is_active: boolean
}

export interface QueuedNotification {
  id: string
  user_id: string
  type: NotificationType
  data: any
  priority: NotificationPriority
  status: 'pending' | 'processing' | 'sent' | 'failed'
  created_at: string
  sent_at?: string
  retry_count?: number
  last_error?: string
}

export interface MessageResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface MulticastResult {
  success: number
  failure: number
  failedTokens?: string[]
}

export interface MessageTemplate {
  title: string
  body: string
  variables: string[]
}

// Single Responsibility: Token management
export class FCMTokenManager {
  constructor(
    private readonly tokenRepository: ITokenRepository
  ) {}

  async registerToken(
    userId: string,
    deviceId: string,
    token: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<FCMToken> {
    // Check if device already has a token
    const existingToken = await this.tokenRepository.getByDevice(deviceId)
    
    if (existingToken) {
      // Update existing token
      return this.tokenRepository.update(existingToken.id, {
        token,
        updated_at: new Date().toISOString()
      })
    }
    
    // Create new token
    return this.tokenRepository.save({
      user_id: userId,
      device_id: deviceId,
      token,
      platform,
      is_active: true
    })
  }

  async revokeToken(tokenId: string): Promise<void> {
    await this.tokenRepository.update(tokenId, {
      is_active: false,
      revoked_at: new Date().toISOString()
    })
  }

  async getUserTokens(userId: string): Promise<FCMToken[]> {
    const tokens = await this.tokenRepository.getByUser(userId)
    return tokens.filter(t => t.is_active)
  }

  async validateToken(token: string): Promise<boolean> {
    // In production, validate with FCM API
    // For now, basic validation
    return token.length > 10 && token.length < 500
  }

  async cleanupInactiveTokens(): Promise<void> {
    // This would be implemented in a scheduled job
    // Remove tokens older than 90 days or marked as inactive
  }
}

// Single Responsibility: Notification templates
export class NotificationTemplateEngine implements ITemplateEngine {
  private templates: Map<NotificationType, MessageTemplate> = new Map([
    [NotificationType.CheckIn, {
      title: '출근 확인',
      body: '{{employeeName}}님이 {{time}}에 {{location}}에서 출근하였습니다.',
      variables: ['employeeName', 'time', 'location']
    }],
    [NotificationType.CheckOut, {
      title: '퇴근 확인',
      body: '{{employeeName}}님이 {{time}}에 퇴근하였습니다. 근무시간: {{duration}}',
      variables: ['employeeName', 'time', 'duration']
    }],
    [NotificationType.ShiftReminder, {
      title: '근무 알림',
      body: '{{shiftName}} 근무가 {{startTime}}에 시작됩니다.',
      variables: ['shiftName', 'startTime']
    }],
    [NotificationType.ShiftAssignment, {
      title: '근무 배정',
      body: '새로운 근무가 배정되었습니다: {{shiftName}} ({{date}})',
      variables: ['shiftName', 'date']
    }],
    [NotificationType.LeaveApproval, {
      title: '휴가 승인',
      body: '{{type}} 신청이 {{status}}되었습니다.',
      variables: ['type', 'status']
    }],
    [NotificationType.OvertimeAlert, {
      title: '초과근무 알림',
      body: '오늘 {{hoursWorked}}시간 근무하셨습니다. 초과: {{overtimeHours}}시간',
      variables: ['hoursWorked', 'overtimeHours']
    }],
    [NotificationType.Announcement, {
      title: '공지사항',
      body: '{{message}}',
      variables: ['message']
    }]
  ])

  generateMessage(type: NotificationType, data: any): NotificationMessage {
    const template = this.templates.get(type)
    if (!template) {
      throw new Error(`Template not found for type: ${type}`)
    }

    return {
      title: this.formatData(template.title, data),
      body: this.formatData(template.body, data),
      data: {
        type,
        ...data
      }
    }
  }

  shouldSendNotification(type: NotificationType, preferences: any): boolean {
    const prefKey = type.toString()
    return preferences[prefKey] !== false // Default to true if not explicitly disabled
  }

  getTemplate(type: NotificationType): MessageTemplate {
    const template = this.templates.get(type)
    if (!template) {
      throw new Error(`Template not found for type: ${type}`)
    }
    return template
  }

  formatData(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match
    })
  }
}

// Single Responsibility: Queue management
export class NotificationQueueManager {
  private maxRetries = 3

  constructor(
    private readonly queue: INotificationQueue
  ) {}

  async enqueue(notification: Omit<QueuedNotification, 'id' | 'created_at' | 'status'>): Promise<void> {
    const queued: QueuedNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random()}`,
      created_at: new Date().toISOString(),
      status: 'pending'
    }
    
    await this.queue.add(queued)
  }

  async enqueueBatch(notifications: any[]): Promise<void> {
    for (const notif of notifications) {
      await this.enqueue(notif)
    }
  }

  async processQueue(): Promise<void> {
    const pending = await this.queue.getPending()
    
    // Sort by priority
    const sorted = pending.sort((a, b) => b.priority - a.priority)
    
    for (const notification of sorted) {
      try {
        await this.queue.process(notification)
      } catch (error) {
        console.error(`Failed to process notification ${notification.id}:`, error)
      }
    }
  }

  async retryFailed(): Promise<void> {
    const failed = await this.queue.getFailed()
    
    for (const notification of failed) {
      if ((notification.retry_count || 0) < this.maxRetries) {
        await this.queue.retry(notification.id)
      } else {
        // Max retries exceeded, remove from queue
        await this.queue.remove(notification.id)
      }
    }
  }

  async getQueueStatus(): Promise<{
    pending: number
    failed: number
    processing: number
  }> {
    const pending = await this.queue.getPending()
    const failed = await this.queue.getFailed()
    
    return {
      pending: pending.length,
      failed: failed.length,
      processing: 0 // Would need to track this separately
    }
  }
}

// Firebase Cloud Messaging implementation
export class FCMService implements IMessagingService {
  private admin: any // Firebase Admin SDK

  constructor() {
    // Initialize Firebase Admin
    // In production, this would use actual Firebase Admin SDK
    if (typeof window === 'undefined') {
      // Server-side initialization
      try {
        // const admin = require('firebase-admin')
        // this.admin = admin.initializeApp({...})
      } catch (error) {
        console.error('Firebase Admin initialization failed:', error)
      }
    }
  }

  async send(token: string, message: NotificationMessage): Promise<MessageResult> {
    try {
      if (!this.admin) {
        // Fallback for development/testing
        console.log('FCM Send:', { token, message })
        return { success: true, messageId: `mock_${Date.now()}` }
      }

      const result = await this.admin.messaging().send({
        token,
        notification: {
          title: message.title,
          body: message.body
        },
        data: message.data,
        android: {
          priority: this.mapPriority(message.priority),
          notification: {
            sound: message.sound || 'default',
            icon: message.icon
          }
        },
        apns: {
          payload: {
            aps: {
              sound: message.sound || 'default',
              badge: message.badge ? parseInt(message.badge) : undefined
            }
          }
        },
        webpush: {
          notification: {
            icon: message.icon,
            badge: message.badge
          }
        }
      })

      return { success: true, messageId: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async sendMulticast(tokens: string[], message: NotificationMessage): Promise<MulticastResult> {
    try {
      if (!this.admin) {
        // Fallback for development/testing
        console.log('FCM Multicast:', { tokens, message })
        return { success: tokens.length, failure: 0 }
      }

      const result = await this.admin.messaging().sendMulticast({
        tokens,
        notification: {
          title: message.title,
          body: message.body
        },
        data: message.data
      })

      const failedTokens = result.responses
        .map((resp: any, idx: number) => resp.success ? null : tokens[idx])
        .filter(Boolean)

      return {
        success: result.successCount,
        failure: result.failureCount,
        failedTokens
      }
    } catch (error) {
      return { success: 0, failure: tokens.length }
    }
  }

  async sendToDevice(deviceToken: string, payload: any): Promise<MessageResult> {
    return this.send(deviceToken, payload)
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<boolean> {
    try {
      if (!this.admin) {
        console.log('FCM Subscribe:', { tokens, topic })
        return true
      }

      await this.admin.messaging().subscribeToTopic(tokens, topic)
      return true
    } catch (error) {
      console.error('Topic subscription failed:', error)
      return false
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<boolean> {
    try {
      if (!this.admin) {
        console.log('FCM Unsubscribe:', { tokens, topic })
        return true
      }

      await this.admin.messaging().unsubscribeFromTopic(tokens, topic)
      return true
    } catch (error) {
      console.error('Topic unsubscription failed:', error)
      return false
    }
  }

  private mapPriority(priority?: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.Urgent:
      case NotificationPriority.High:
        return 'high'
      default:
        return 'normal'
    }
  }
}

// Main Service - Dependency Inversion Principle
export class PushNotificationService {
  constructor(
    private readonly messaging: IMessagingService,
    private readonly tokenManager: FCMTokenManager,
    private readonly queueManager: NotificationQueueManager,
    private readonly templateEngine: NotificationTemplateEngine
  ) {}

  async sendNotification(
    userId: string,
    type: NotificationType,
    data: any,
    preferences?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check user preferences
      if (preferences && !this.templateEngine.shouldSendNotification(type, preferences)) {
        return { success: true } // Skip but return success
      }

      // Get user tokens
      const tokens = await this.tokenManager.getUserTokens(userId)
      if (tokens.length === 0) {
        return { success: false, error: 'No active tokens found' }
      }

      // Generate message
      const message = this.templateEngine.generateMessage(type, data)

      // Send to all user devices
      const tokenStrings = tokens.map(t => t.token)
      const result = await this.messaging.sendMulticast(tokenStrings, message)

      // Handle failed tokens
      if (result.failedTokens && result.failedTokens.length > 0) {
        for (const failedToken of result.failedTokens) {
          const token = tokens.find(t => t.token === failedToken)
          if (token) {
            await this.tokenManager.revokeToken(token.id)
          }
        }
      }

      return {
        success: result.success > 0,
        error: result.failure > 0 ? `Failed to send to ${result.failure} devices` : undefined
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async broadcast(
    userIds: string[],
    type: NotificationType,
    data: any,
    priority: NotificationPriority = NotificationPriority.Normal
  ): Promise<void> {
    const notifications = userIds.map(user_id => ({
      user_id,
      type,
      data,
      priority
    }))
    
    await this.queueManager.enqueueBatch(notifications)
  }

  async subscribeToTopic(userId: string, topic: string): Promise<boolean> {
    const tokens = await this.tokenManager.getUserTokens(userId)
    if (tokens.length === 0) return false
    
    const tokenStrings = tokens.map(t => t.token)
    return this.messaging.subscribeToTopic(tokenStrings, topic)
  }

  async unsubscribeFromTopic(userId: string, topic: string): Promise<boolean> {
    const tokens = await this.tokenManager.getUserTokens(userId)
    if (tokens.length === 0) return false
    
    const tokenStrings = tokens.map(t => t.token)
    return this.messaging.unsubscribeFromTopic(tokenStrings, topic)
  }

  async registerDevice(
    userId: string,
    deviceId: string,
    fcmToken: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<FCMToken> {
    // Validate token
    const isValid = await this.tokenManager.validateToken(fcmToken)
    if (!isValid) {
      throw new Error('Invalid FCM token')
    }
    
    return this.tokenManager.registerToken(userId, deviceId, fcmToken, platform)
  }

  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const tokens = await this.tokenManager.getUserTokens(userId)
    const token = tokens.find(t => t.device_id === deviceId)
    
    if (token) {
      await this.tokenManager.revokeToken(token.id)
    }
  }

  async processNotificationQueue(): Promise<void> {
    await this.queueManager.processQueue()
    await this.queueManager.retryFailed()
  }

  async getQueueStatus() {
    return this.queueManager.getQueueStatus()
  }
}