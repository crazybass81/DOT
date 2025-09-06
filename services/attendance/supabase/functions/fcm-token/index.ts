import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders } from '../_shared/cors.ts'

// FCM Admin SDK types
interface FCMMessage {
  token: string
  notification?: {
    title: string
    body: string
    image?: string
  }
  data?: Record<string, string>
  android?: {
    priority: 'normal' | 'high'
    notification?: {
      click_action?: string
      icon?: string
      color?: string
    }
  }
  apns?: {
    payload: {
      aps: {
        alert?: {
          title?: string
          body?: string
        }
        badge?: number
        sound?: string
        'content-available'?: number
      }
    }
  }
}

interface DeviceTokenRequest {
  action: 'register' | 'update' | 'deactivate' | 'notify' | 'validate'
  fcmToken?: string
  deviceId?: string
  deviceInfo?: {
    name?: string
    type?: 'mobile' | 'tablet' | 'desktop' | 'web'
    platform?: string
    browser?: string
    appVersion?: string
    osVersion?: string
  }
  fingerprintData?: Record<string, any>
  location?: {
    latitude: number
    longitude: number
    accuracy?: number
  }
  notification?: {
    title: string
    body: string
    type: string
    data?: Record<string, string>
    priority?: 'normal' | 'high'
  }
  deviceTokenId?: string
  verificationCode?: string
}

interface DeviceToken {
  id: string
  employee_id: string
  device_id: string
  fcm_token: string
  device_name?: string
  device_type?: string
  platform?: string
  trust_level: string
  is_active: boolean
  fingerprint_data: Record<string, any>
  last_used_at: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract token and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: user, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const employeeId = user.user.id

    // Parse request body
    const requestData: DeviceTokenRequest = await req.json()
    const { action } = requestData

    let response: any = {}

    switch (action) {
      case 'register':
        response = await registerDevice(supabase, employeeId, requestData, req)
        break
      
      case 'update':
        response = await updateDevice(supabase, employeeId, requestData, req)
        break
      
      case 'deactivate':
        response = await deactivateDevice(supabase, employeeId, requestData)
        break
      
      case 'notify':
        response = await sendNotification(supabase, requestData)
        break
      
      case 'validate':
        response = await validateDevice(supabase, employeeId, requestData)
        break
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('FCM Token Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function registerDevice(
  supabase: any, 
  employeeId: string, 
  requestData: DeviceTokenRequest,
  req: Request
): Promise<any> {
  const { fcmToken, deviceId, deviceInfo, fingerprintData, location } = requestData

  if (!fcmToken || !deviceId) {
    throw new Error('FCM token and device ID are required for registration')
  }

  // Get client IP and user agent
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  const userAgent = req.headers.get('user-agent')

  // Generate device fingerprint if not provided
  const fingerprint = fingerprintData || await generateDeviceFingerprint(req, deviceInfo)

  // Check if device already exists
  const { data: existingDevice } = await supabase
    .from('device_tokens')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('device_id', deviceId)
    .single()

  let deviceRecord: DeviceToken

  if (existingDevice) {
    // Update existing device
    const { data, error } = await supabase
      .from('device_tokens')
      .update({
        fcm_token: fcmToken,
        fcm_token_updated_at: new Date().toISOString(),
        device_name: deviceInfo?.name || existingDevice.device_name,
        device_type: deviceInfo?.type || existingDevice.device_type,
        platform: deviceInfo?.platform || existingDevice.platform,
        browser: deviceInfo?.browser,
        app_version: deviceInfo?.appVersion,
        os_version: deviceInfo?.osVersion,
        fingerprint_data: fingerprint,
        last_known_location: location ? `(${location.latitude},${location.longitude})` : null,
        location_accuracy: location?.accuracy,
        last_used_at: new Date().toISOString(),
        usage_count: existingDevice.usage_count + 1,
        is_active: true,
        deactivated_at: null,
        deactivation_reason: null,
        user_agent: userAgent,
        last_activity_ip: clientIP,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingDevice.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update device: ${error.message}`)
    }

    deviceRecord = data
  } else {
    // Create new device
    const { data, error } = await supabase
      .from('device_tokens')
      .insert({
        employee_id: employeeId,
        device_id: deviceId,
        fcm_token: fcmToken,
        device_name: deviceInfo?.name || `${deviceInfo?.platform || 'Unknown'} Device`,
        device_type: deviceInfo?.type || 'unknown',
        platform: deviceInfo?.platform,
        browser: deviceInfo?.browser,
        app_version: deviceInfo?.appVersion,
        os_version: deviceInfo?.osVersion,
        fingerprint_data: fingerprint,
        last_known_location: location ? `(${location.latitude},${location.longitude})` : null,
        location_accuracy: location?.accuracy,
        trust_level: 'unknown',
        verification_status: 'pending',
        user_agent: userAgent,
        registration_ip: clientIP,
        last_activity_ip: clientIP
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to register device: ${error.message}`)
    }

    deviceRecord = data

    // Generate verification code for new devices
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    await supabase
      .from('device_tokens')
      .update({
        verification_code: verificationCode,
        verification_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      })
      .eq('id', deviceRecord.id)

    // Log security event for new device registration
    await logSecurityEvent(supabase, {
      device_token_id: deviceRecord.id,
      employee_id: employeeId,
      event_type: 'device_registered',
      event_category: 'device',
      severity: 'medium',
      event_description: `New device registered: ${deviceRecord.device_name}`,
      event_data: { device_info: deviceInfo, fingerprint },
      ip_address: clientIP,
      location: location ? `(${location.latitude},${location.longitude})` : null,
      user_agent: userAgent
    })
  }

  // Calculate and update risk score
  const riskScore = await calculateDeviceRiskScore(supabase, deviceRecord.id)

  return {
    success: true,
    device: {
      id: deviceRecord.id,
      deviceId: deviceRecord.device_id,
      name: deviceRecord.device_name,
      type: deviceRecord.device_type,
      platform: deviceRecord.platform,
      trustLevel: deviceRecord.trust_level,
      isActive: deviceRecord.is_active,
      isPrimary: deviceRecord.is_primary,
      riskScore,
      requiresVerification: deviceRecord.verification_status === 'pending'
    },
    message: existingDevice ? 'Device updated successfully' : 'Device registered successfully'
  }
}

async function updateDevice(
  supabase: any,
  employeeId: string,
  requestData: DeviceTokenRequest,
  req: Request
): Promise<any> {
  const { deviceTokenId, fcmToken, deviceInfo, fingerprintData, location } = requestData

  if (!deviceTokenId) {
    throw new Error('Device token ID is required for update')
  }

  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
  const userAgent = req.headers.get('user-agent')

  const updateData: any = {
    last_used_at: new Date().toISOString(),
    last_activity_ip: clientIP,
    updated_at: new Date().toISOString()
  }

  if (fcmToken) {
    updateData.fcm_token = fcmToken
    updateData.fcm_token_updated_at = new Date().toISOString()
  }

  if (deviceInfo) {
    if (deviceInfo.name) updateData.device_name = deviceInfo.name
    if (deviceInfo.type) updateData.device_type = deviceInfo.type
    if (deviceInfo.platform) updateData.platform = deviceInfo.platform
    if (deviceInfo.browser) updateData.browser = deviceInfo.browser
    if (deviceInfo.appVersion) updateData.app_version = deviceInfo.appVersion
    if (deviceInfo.osVersion) updateData.os_version = deviceInfo.osVersion
  }

  if (fingerprintData) {
    updateData.fingerprint_data = fingerprintData
  }

  if (location) {
    updateData.last_known_location = `(${location.latitude},${location.longitude})`
    updateData.location_accuracy = location.accuracy
  }

  const { data, error } = await supabase
    .from('device_tokens')
    .update(updateData)
    .eq('id', deviceTokenId)
    .eq('employee_id', employeeId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update device: ${error.message}`)
  }

  return {
    success: true,
    device: data,
    message: 'Device updated successfully'
  }
}

async function deactivateDevice(
  supabase: any,
  employeeId: string,
  requestData: DeviceTokenRequest
): Promise<any> {
  const { deviceTokenId } = requestData

  if (!deviceTokenId) {
    throw new Error('Device token ID is required for deactivation')
  }

  const { data, error } = await supabase
    .from('device_tokens')
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
      deactivation_reason: 'User requested deactivation',
      updated_at: new Date().toISOString()
    })
    .eq('id', deviceTokenId)
    .eq('employee_id', employeeId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to deactivate device: ${error.message}`)
  }

  // Log security event
  await logSecurityEvent(supabase, {
    device_token_id: deviceTokenId,
    employee_id: employeeId,
    event_type: 'device_deactivated',
    event_category: 'device',
    severity: 'low',
    event_description: 'Device deactivated by user',
    automated_action: 'none'
  })

  return {
    success: true,
    message: 'Device deactivated successfully'
  }
}

async function sendNotification(
  supabase: any,
  requestData: DeviceTokenRequest
): Promise<any> {
  const { deviceTokenId, notification } = requestData

  if (!deviceTokenId || !notification) {
    throw new Error('Device token ID and notification data are required')
  }

  // Get device token
  const { data: device, error: deviceError } = await supabase
    .from('device_tokens')
    .select('fcm_token, employee_id')
    .eq('id', deviceTokenId)
    .eq('is_active', true)
    .single()

  if (deviceError || !device) {
    throw new Error('Device not found or inactive')
  }

  // Create FCM message
  const message: FCMMessage = {
    token: device.fcm_token,
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: notification.data || {},
    android: {
      priority: notification.priority || 'normal'
    }
  }

  try {
    // Here you would integrate with FCM Admin SDK
    // For now, we'll simulate the notification sending
    const fcmResponse = await sendFCMMessage(message)

    // Record notification in database
    const { data: notificationRecord, error: notificationError } = await supabase
      .from('fcm_notifications')
      .insert({
        device_token_id: deviceTokenId,
        employee_id: device.employee_id,
        fcm_message_id: fcmResponse.messageId,
        notification_title: notification.title,
        notification_body: notification.body,
        notification_type: notification.type,
        data_payload: notification.data || {},
        priority: notification.priority || 'normal',
        delivery_status: 'sent'
      })
      .select()
      .single()

    if (notificationError) {
      console.error('Failed to record notification:', notificationError)
    }

    return {
      success: true,
      messageId: fcmResponse.messageId,
      notificationId: notificationRecord?.id,
      message: 'Notification sent successfully'
    }

  } catch (error) {
    // Record failed notification
    await supabase
      .from('fcm_notifications')
      .insert({
        device_token_id: deviceTokenId,
        employee_id: device.employee_id,
        notification_title: notification.title,
        notification_body: notification.body,
        notification_type: notification.type,
        data_payload: notification.data || {},
        priority: notification.priority || 'normal',
        delivery_status: 'failed',
        error_message: error.message
      })

    throw new Error(`Failed to send notification: ${error.message}`)
  }
}

async function validateDevice(
  supabase: any,
  employeeId: string,
  requestData: DeviceTokenRequest
): Promise<any> {
  const { deviceTokenId, verificationCode } = requestData

  if (!deviceTokenId || !verificationCode) {
    throw new Error('Device token ID and verification code are required')
  }

  const { data: device, error } = await supabase
    .from('device_tokens')
    .select('*')
    .eq('id', deviceTokenId)
    .eq('employee_id', employeeId)
    .single()

  if (error || !device) {
    throw new Error('Device not found')
  }

  if (device.verification_code !== verificationCode) {
    // Log failed verification attempt
    await logSecurityEvent(supabase, {
      device_token_id: deviceTokenId,
      employee_id: employeeId,
      event_type: 'verification_failed',
      event_category: 'authentication',
      severity: 'medium',
      event_description: 'Invalid verification code entered',
      automated_action: 'none'
    })

    // Increment failed auth attempts
    await supabase
      .from('device_tokens')
      .update({
        failed_auth_attempts: device.failed_auth_attempts + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', deviceTokenId)

    return {
      success: false,
      message: 'Invalid verification code'
    }
  }

  if (new Date(device.verification_expires_at) < new Date()) {
    return {
      success: false,
      message: 'Verification code has expired'
    }
  }

  // Update device as verified
  await supabase
    .from('device_tokens')
    .update({
      verification_status: 'verified',
      trust_level: 'verified',
      verification_code: null,
      verification_expires_at: null,
      failed_auth_attempts: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', deviceTokenId)

  // Log successful verification
  await logSecurityEvent(supabase, {
    device_token_id: deviceTokenId,
    employee_id: employeeId,
    event_type: 'device_verified',
    event_category: 'authentication',
    severity: 'low',
    event_description: 'Device successfully verified',
    automated_action: 'none'
  })

  return {
    success: true,
    message: 'Device verified successfully'
  }
}

// Helper functions
async function generateDeviceFingerprint(req: Request, deviceInfo?: any): Promise<Record<string, any>> {
  const userAgent = req.headers.get('user-agent') || ''
  const acceptLanguage = req.headers.get('accept-language') || ''
  const acceptEncoding = req.headers.get('accept-encoding') || ''

  return {
    userAgent,
    acceptLanguage,
    acceptEncoding,
    timezone: deviceInfo?.timezone || 'UTC',
    screenResolution: deviceInfo?.screenResolution || 'unknown',
    colorDepth: deviceInfo?.colorDepth || 'unknown',
    platform: deviceInfo?.platform || 'unknown',
    timestamp: new Date().toISOString()
  }
}

async function logSecurityEvent(supabase: any, event: any): Promise<void> {
  try {
    await supabase
      .from('device_security_events')
      .insert({
        ...event,
        occurred_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

async function calculateDeviceRiskScore(supabase: any, deviceTokenId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('calculate_device_risk_score', { device_uuid: deviceTokenId })

    if (error) {
      console.error('Failed to calculate risk score:', error)
      return 0.5 // Default medium risk
    }

    return data || 0.5
  } catch (error) {
    console.error('Error calculating risk score:', error)
    return 0.5
  }
}

// Simulate FCM message sending (replace with actual FCM Admin SDK integration)
async function sendFCMMessage(message: FCMMessage): Promise<{ messageId: string }> {
  // In a real implementation, you would use the FCM Admin SDK here
  // For simulation purposes, we'll return a mock response
  const messageId = `fcm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Simulate occasional failures for testing
  if (Math.random() < 0.05) { // 5% failure rate
    throw new Error('FCM service temporarily unavailable')
  }
  
  return { messageId }
}