/**
 * FCM Client Library
 * 
 * Provides client-side functionality for Firebase Cloud Messaging integration
 * with device token management and security features.
 */

import { generateDeviceFingerprint, DeviceFingerprint } from './device-fingerprint'

export interface FCMConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  vapidKey: string
}

export interface DeviceRegistrationResult {
  success: boolean
  deviceId: string
  requiresVerification: boolean
  message: string
  error?: string
}

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, string>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
  timestamp?: number
}

export class FCMClient {
  private messaging: any = null
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null
  private currentToken: string | null = null
  private fingerprint: DeviceFingerprint | null = null
  private isInitialized = false

  constructor(private config: FCMConfig) {}

  /**
   * Initialize FCM and register service worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Check browser support
      if (!this.isSupportedBrowser()) {
        throw new Error('Browser does not support push notifications')
      }

      // Import Firebase dynamically (only if available)
      try {
        const { initializeApp } = await import('firebase/app' as any)
        const { getMessaging, getToken, onMessage } = await import('firebase/messaging' as any)

        // Initialize Firebase
        const app = initializeApp(this.config)
        this.messaging = getMessaging(app)

        // Register service worker
        await this.registerServiceWorker()

        // Generate device fingerprint
        this.fingerprint = await generateDeviceFingerprint()

        // Set up message listener
        onMessage(this.messaging, (payload: any) => {
          this.handleForegroundMessage(payload)
        })
      } catch (error) {
        console.warn('Firebase not available, FCM disabled:', error)
        // FCM will be disabled but app will continue to work
        this.fingerprint = await generateDeviceFingerprint()
        // Just return without a value for void function
      }

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize FCM:', error)
      throw error
    }
  }

  /**
   * Request notification permission and get FCM token
   */
  async requestPermissionAndGetToken(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission denied')
      }

      // Get FCM token
      const { getToken } = await import('firebase/messaging' as any)
      const token = await getToken(this.messaging, {
        vapidKey: this.config.vapidKey,
        serviceWorkerRegistration: this.serviceWorkerRegistration
      })

      if (!token) {
        throw new Error('Failed to get FCM token')
      }

      this.currentToken = token
      return token
    } catch (error) {
      console.error('Failed to get FCM token:', error)
      throw error
    }
  }

  /**
   * Register current device with the backend
   */
  async registerDevice(deviceName?: string): Promise<DeviceRegistrationResult> {
    if (!this.fingerprint) {
      throw new Error('Device fingerprint not available')
    }

    try {
      const fcmToken = await this.requestPermissionAndGetToken()
      const location = await this.getCurrentLocation()

      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'register',
          fcmToken,
          deviceId: this.fingerprint.deviceId,
          deviceInfo: {
            name: deviceName || this.getDefaultDeviceName(),
            type: this.getDeviceType(),
            platform: this.fingerprint.navigator.platform,
            browser: this.fingerprint.browser,
            appVersion: this.fingerprint.appVersion,
            osVersion: this.fingerprint.osVersion
          },
          fingerprintData: this.fingerprint,
          location
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      // Store device info locally
      if (result.success) {
        localStorage.setItem('deviceId', this.fingerprint.deviceId)
        localStorage.setItem('fcmToken', fcmToken)
        localStorage.setItem('deviceRegistered', 'true')
      }

      return {
        success: result.success,
        deviceId: this.fingerprint.deviceId,
        requiresVerification: result.device?.requiresVerification || false,
        message: result.message
      }
    } catch (error) {
      console.error('Device registration failed:', error)
      return {
        success: false,
        deviceId: this.fingerprint?.deviceId || '',
        requiresVerification: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Verify device with code
   */
  async verifyDevice(deviceId: string, verificationCode: string): Promise<boolean> {
    try {
      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'validate',
          deviceTokenId: deviceId,
          verificationCode
        })
      })

      const result = await response.json()
      
      if (result.success) {
        localStorage.setItem('deviceVerified', 'true')
        return true
      }
      
      return false
    } catch (error) {
      console.error('Device verification failed:', error)
      return false
    }
  }

  /**
   * Update device information
   */
  async updateDevice(deviceId: string, updates: any): Promise<boolean> {
    try {
      const location = await this.getCurrentLocation()

      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          deviceTokenId: deviceId,
          ...updates,
          location
        })
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Device update failed:', error)
      return false
    }
  }

  /**
   * Handle foreground messages
   */
  private handleForegroundMessage(payload: any): void {
    console.log('Received foreground message:', payload)

    // Show notification even when app is in foreground
    if (payload.notification) {
      this.showNotification({
        title: payload.notification.title,
        body: payload.notification.body,
        icon: payload.notification.icon,
        image: payload.notification.image,
        data: payload.data,
        tag: payload.notification.tag || 'fcm-notification'
      })
    }

    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('fcm-message', {
      detail: payload
    }))
  }

  /**
   * Show local notification
   */
  private async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      throw new Error('Service worker not registered')
    }

    try {
      await this.serviceWorkerRegistration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/notification-icon.png',
        badge: payload.badge || '/icons/notification-badge.png',
        data: payload.data,
        requireInteraction: payload.requireInteraction,
        silent: payload.silent,
        tag: payload.tag,

      })
    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported')
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      )

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready

      console.log('Service Worker registered successfully')
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      throw error
    }
  }

  /**
   * Check if browser supports push notifications
   */
  private isSupportedBrowser(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      'fetch' in window
    )
  }

  /**
   * Get current location if available
   */
  private getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy?: number } | undefined> {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }),
          () => resolve(undefined),
          { timeout: 5000, enableHighAccuracy: false }
        )
      } else {
        resolve(undefined)
      }
    })
  }

  /**
   * Get device type based on user agent
   */
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' | 'web' {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/mobile/.test(userAgent)) return 'mobile'
    if (/tablet|ipad/.test(userAgent)) return 'tablet'
    if (/electron/.test(userAgent)) return 'desktop'
    return 'web'
  }

  /**
   * Generate default device name
   */
  private getDefaultDeviceName(): string {
    if (!this.fingerprint) return 'Unknown Device'
    
    const deviceType = this.getDeviceType()
    const platform = this.fingerprint.os || this.fingerprint.navigator.platform
    const browser = this.fingerprint.browser
    
    return `${platform} ${deviceType} (${browser})`
  }

  /**
   * Get current FCM token
   */
  getCurrentToken(): string | null {
    return this.currentToken
  }

  /**
   * Get device fingerprint
   */
  getFingerprint(): DeviceFingerprint | null {
    return this.fingerprint
  }

  /**
   * Check if device is registered
   */
  isDeviceRegistered(): boolean {
    return localStorage.getItem('deviceRegistered') === 'true'
  }

  /**
   * Check if device is verified
   */
  isDeviceVerified(): boolean {
    return localStorage.getItem('deviceVerified') === 'true'
  }

  /**
   * Get stored device ID
   */
  getStoredDeviceId(): string | null {
    return localStorage.getItem('deviceId')
  }

  /**
   * Clear stored device data
   */
  clearStoredData(): void {
    localStorage.removeItem('deviceId')
    localStorage.removeItem('fcmToken')
    localStorage.removeItem('deviceRegistered')
    localStorage.removeItem('deviceVerified')
  }
}

// Singleton instance
let fcmClient: FCMClient | null = null

/**
 * Get or create FCM client instance
 */
export function getFCMClient(config?: FCMConfig): FCMClient {
  if (!fcmClient) {
    if (!config) {
      throw new Error('FCM config required for first initialization')
    }
    fcmClient = new FCMClient(config)
  }
  return fcmClient
}

/**
 * Initialize FCM with default configuration
 */
export async function initializeFCM(config: FCMConfig): Promise<FCMClient> {
  const client = getFCMClient(config)
  await client.initialize()
  return client
}

// Types for external use
export type { FCMConfig, DeviceRegistrationResult, NotificationPayload }