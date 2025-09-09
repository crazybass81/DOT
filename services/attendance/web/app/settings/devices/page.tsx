'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { generateDeviceFingerprint } from '@/src/lib/device-fingerprint'

interface DeviceToken {
  id: string
  device_id: string
  device_name: string
  device_type: 'mobile' | 'tablet' | 'desktop' | 'web' | 'unknown'
  platform: string
  browser?: string
  app_version?: string
  os_version?: string
  trust_level: 'trusted' | 'verified' | 'unknown' | 'suspicious' | 'blocked'
  verification_status: 'pending' | 'verified' | 'failed' | 'expired'
  is_active: boolean
  is_primary: boolean
  last_used_at: string
  fcm_token_updated_at: string
  fingerprint_data: Record<string, any>
  usage_count: number
  failed_auth_attempts: number
  registered_at: string
}

interface SecurityEvent {
  id: string
  event_type: string
  event_category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  event_description: string
  occurred_at: string
  resolved: boolean
}

interface FCMNotification {
  id: string
  notification_type: string
  notification_title: string
  sent_at: string
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed'
  read_at?: string
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceToken[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [notifications, setNotifications] = useState<FCMNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [showVerification, setShowVerification] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    loadDevices()
    loadSecurityEvents()
    loadNotifications()
  }, [])

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .order('last_used_at', { ascending: false })

      if (error) throw error
      setDevices(data || [])
    } catch (error) {
      console.error('Error loading devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('device_security_events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setSecurityEvents(data || [])
    } catch (error) {
      console.error('Error loading security events:', error)
    }
  }

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('fcm_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const registerCurrentDevice = async () => {
    setRegistering(true)
    try {
      // Check if FCM is supported
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        alert('This browser does not support push notifications')
        return
      }

      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('Notification permission is required for device registration')
        return
      }

      // Generate device fingerprint
      const deviceId = await generateDeviceFingerprint()

      // Get FCM token (simulate for now)
      const fcmToken = `fcm_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Register device via API
      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'register',
          fcmToken,
          deviceId,
          deviceInfo: {
            name: `${navigator.platform} - ${navigator.userAgent.split(' ')[0]}`,
            type: getDeviceType(),
            platform: navigator.platform,
            browser: navigator.userAgent.split(' ')[0],
            appVersion: '1.0.0',
            osVersion: navigator.platform
          },
          fingerprintData: deviceId,
          location: await getCurrentLocation()
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert('Device registered successfully!')
        if (result.device.requiresVerification) {
          setSelectedDevice(result.device.id)
          setShowVerification(true)
        }
        await loadDevices()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error registering device:', error)
      alert('Failed to register device: ' + (error instanceof Error ? (error instanceof Error ? error.message : 'Unknown error') : 'Unknown error'))
    } finally {
      setRegistering(false)
    }
  }

  const verifyDevice = async () => {
    if (!selectedDevice || !verificationCode) return

    try {
      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'validate',
          deviceTokenId: selectedDevice,
          verificationCode
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert('Device verified successfully!')
        setShowVerification(false)
        setVerificationCode('')
        setSelectedDevice(null)
        await loadDevices()
      } else {
        alert('Verification failed: ' + result.message)
      }
    } catch (error) {
      console.error('Error verifying device:', error)
      alert('Failed to verify device: ' + (error instanceof Error ? (error instanceof Error ? error.message : 'Unknown error') : 'Unknown error'))
    }
  }

  const setPrimaryDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('device_tokens')
        .update({ is_primary: false })
        .neq('id', deviceId)

      if (error) throw error

      const { error: updateError } = await supabase
        .from('device_tokens')
        .update({ is_primary: true })
        .eq('id', deviceId)

      if (updateError) throw updateError

      await loadDevices()
      alert('Primary device updated successfully!')
    } catch (error) {
      console.error('Error setting primary device:', error)
      alert('Failed to update primary device')
    }
  }

  const deactivateDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to deactivate this device?')) return

    try {
      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'deactivate',
          deviceTokenId: deviceId
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert('Device deactivated successfully!')
        await loadDevices()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error deactivating device:', error)
      alert('Failed to deactivate device: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const sendTestNotification = async (deviceId: string) => {
    try {
      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'notify',
          deviceTokenId: deviceId,
          notification: {
            title: 'Test Notification',
            body: 'This is a test notification from your attendance system',
            type: 'test',
            priority: 'normal'
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert('Test notification sent!')
        await loadNotifications()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      alert('Failed to send notification: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' | 'web' => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/mobile/.test(userAgent)) return 'mobile'
    if (/tablet|ipad/.test(userAgent)) return 'tablet'
    return 'web'
  }

  const getCurrentLocation = (): Promise<{ latitude: number, longitude: number, accuracy?: number } | undefined> => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }),
          () => resolve(undefined),
          { timeout: 5000 }
        )
      } else {
        resolve(undefined)
      }
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getTrustLevelColor = (level: string) => {
    switch (level) {
      case 'trusted': return 'text-green-600 bg-green-100'
      case 'verified': return 'text-blue-600 bg-blue-100'
      case 'unknown': return 'text-gray-600 bg-gray-100'
      case 'suspicious': return 'text-orange-600 bg-orange-100'
      case 'blocked': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Device Management</h1>
        <p className="text-gray-600">Manage your registered devices and notification settings</p>
      </div>

      {/* Register New Device */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Register Current Device</h2>
        <p className="text-gray-600 mb-4">
          Register this device to receive push notifications for attendance reminders and alerts.
        </p>
        <button
          onClick={registerCurrentDevice}
          disabled={registering}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {registering ? 'Registering...' : 'Register This Device'}
        </button>
      </div>

      {/* Verification Modal */}
      {showVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Verify Device</h3>
            <p className="text-gray-600 mb-4">
              A verification code has been sent. Enter it below to verify your device.
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2 border rounded-lg mb-4"
              maxLength={6}
            />
            <div className="flex gap-2">
              <button
                onClick={verifyDevice}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Verify
              </button>
              <button
                onClick={() => setShowVerification(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registered Devices */}
      <div className="bg-white rounded-lg shadow-sm border mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Registered Devices</h2>
        </div>
        <div className="divide-y">
          {devices.map(device => (
            <div key={device.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-gray-900">{device.device_name}</h3>
                    {device.is_primary && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        Primary
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getTrustLevelColor(device.trust_level)}`}>
                      {device.trust_level.charAt(0).toUpperCase() + device.trust_level.slice(1)}
                    </span>
                    {!device.is_active && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Type:</span> {device.device_type} • {device.platform}
                      {device.browser && ` • ${device.browser}`}
                    </div>
                    <div>
                      <span className="font-medium">Last used:</span> {formatDateTime(device.last_used_at)}
                    </div>
                    <div>
                      <span className="font-medium">Registered:</span> {formatDateTime(device.registered_at)}
                    </div>
                    <div>
                      <span className="font-medium">Usage:</span> {device.usage_count} times
                    </div>
                    {device.failed_auth_attempts > 0 && (
                      <div className="text-orange-600">
                        <span className="font-medium">Failed attempts:</span> {device.failed_auth_attempts}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {device.is_active && (
                    <>
                      {!device.is_primary && (
                        <button
                          onClick={() => setPrimaryDevice(device.id)}
                          className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        onClick={() => sendTestNotification(device.id)}
                        className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Test Notify
                      </button>
                      <button
                        onClick={() => deactivateDevice(device.id)}
                        className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Deactivate
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {devices.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No devices registered. Register your first device above.
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Security Events */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Recent Security Events</h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {securityEvents.map(event => (
              <div key={event.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(event.severity)}`}>
                      {event.severity.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{event.event_type}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDateTime(event.occurred_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{event.event_description}</p>
              </div>
            ))}
            {securityEvents.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No security events recorded
              </div>
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Recent Notifications</h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {notifications.map(notification => (
              <div key={notification.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {notification.notification_title}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-500">
                      {formatDateTime(notification.sent_at)}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      notification.delivery_status === 'delivered' ? 'bg-green-100 text-green-800' :
                      notification.delivery_status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {notification.delivery_status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{notification.notification_type}</p>
                {notification.read_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Read: {formatDateTime(notification.read_at)}
                  </p>
                )}
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No notifications sent
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}