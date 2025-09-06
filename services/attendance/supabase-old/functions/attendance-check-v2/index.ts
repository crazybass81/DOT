// Refactored Attendance Check-in/Check-out with Security Enhancements
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  attendanceRequestSchema, 
  uuidSchema
} from '../_shared/validation.ts'
import { biometricService } from '../_shared/biometric-verification.ts'
import { 
  createRateLimiters, 
  rateLimitMiddleware,
  getRateLimitHeaders 
} from '../_shared/rate-limiter.ts'
import { configService } from '../_shared/config.ts'
import { verifyLocation } from './location-verification.ts'
import { processCheckIn, processCheckOut } from './attendance-processor.ts'
import { auditLog } from './audit-logger.ts'

// Initialize rate limiters
const rateLimiters = createRateLimiters()

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting check
    const rateLimitResult = await rateLimitMiddleware(req, rateLimiters.authenticated)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Get JWT from header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate request body with Zod
    const rawBody = await req.json()
    const validationResult = attendanceRequestSchema.safeParse(rawBody)
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request data',
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = validationResult.data
    const { action, employeeId, location, verificationMethod, qrCode, wifiSSID, biometricToken, deviceId, ipAddress } = body

    // Validate employee ID is a valid UUID
    const employeeIdValidation = uuidSchema.safeParse(employeeId)
    if (!employeeIdValidation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid employee ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get employee with permission check
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*, organization:organizations(*)')
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      await auditLog(supabase, {
        action: 'attendance.check.failed',
        userId: user.id,
        resourceId: employeeId,
        error: 'Employee not found',
        ipAddress
      })
      
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check permissions
    const { data: userEmployee } = await supabase
      .from('employees')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', employee.organization_id)
      .single()

    if (!userEmployee || (userEmployee.role === 'worker' && employee.user_id !== user.id)) {
      await auditLog(supabase, {
        action: 'attendance.check.denied',
        userId: user.id,
        resourceId: employeeId,
        error: 'Permission denied',
        ipAddress
      })

      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get organization configuration
    const config = await configService.getConfig(employee.organization_id)

    // Verify based on method with enhanced security
    let verificationResult = { valid: false, message: 'Verification failed', locationId: null as string | null }

    switch (verificationMethod) {
      case 'gps':
        verificationResult = await verifyLocation(
          supabase,
          employee.organization_id,
          location,
          config.locationRadius
        )
        break

      case 'qr':
        // Enhanced QR verification
        if (!qrCode) {
          verificationResult = { valid: false, message: 'QR code required', locationId: null }
        } else {
          const { data: locationConfig } = await supabase
            .from('locations')
            .select('id, qr_code')
            .eq('organization_id', employee.organization_id)
            .eq('is_active', true)
            .single()

          verificationResult = {
            valid: locationConfig?.qr_code === qrCode,
            message: locationConfig?.qr_code === qrCode ? 'QR code verified' : 'Invalid QR code',
            locationId: locationConfig?.id || null
          }
        }
        break

      case 'wifi':
        // WiFi verification
        if (!wifiSSID) {
          verificationResult = { valid: false, message: 'WiFi SSID required', locationId: null }
        } else {
          const { data: locationConfig } = await supabase
            .from('locations')
            .select('id, wifi_ssid')
            .eq('organization_id', employee.organization_id)
            .eq('is_active', true)
            .single()

          verificationResult = {
            valid: locationConfig?.wifi_ssid === wifiSSID,
            message: locationConfig?.wifi_ssid === wifiSSID ? 'WiFi verified' : 'Not on company WiFi',
            locationId: locationConfig?.id || null
          }
        }
        break

      case 'biometric':
        // Enhanced biometric verification
        if (!biometricToken || !deviceId) {
          verificationResult = { valid: false, message: 'Biometric token and device ID required', locationId: null }
        } else {
          // Get session ID from token
          const tokenData = JSON.parse(biometricToken)
          const biometricResult = await biometricService.verifyBiometricToken(
            tokenData.token,
            tokenData.sessionId
          )
          
          verificationResult = {
            valid: biometricResult.valid,
            message: biometricResult.message,
            locationId: null
          }
        }
        break

      case 'manual':
        // Manual approval by manager
        if (userEmployee.role === 'manager' || userEmployee.role === 'admin' || userEmployee.role === 'master_admin') {
          verificationResult = {
            valid: true,
            message: 'Manual approval by manager',
            locationId: null
          }
        } else {
          verificationResult = {
            valid: false,
            message: 'Manual approval requires manager role',
            locationId: null
          }
        }
        break
    }

    if (!verificationResult.valid) {
      await auditLog(supabase, {
        action: `attendance.${action}.verification_failed`,
        userId: user.id,
        resourceId: employeeId,
        error: verificationResult.message,
        metadata: { verificationMethod },
        ipAddress
      })

      return new Response(
        JSON.stringify({ 
          error: 'Verification failed', 
          message: verificationResult.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process check-in or check-out
    let result
    if (action === 'check_in') {
      result = await processCheckIn(
        supabase,
        employee,
        verificationResult.locationId,
        verificationMethod,
        deviceId,
        ipAddress,
        config
      )
    } else {
      result = await processCheckOut(
        supabase,
        employee,
        verificationResult.locationId,
        config
      )
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful action
    await auditLog(supabase, {
      action: `attendance.${action}.success`,
      userId: user.id,
      resourceId: result.data.id,
      organizationId: employee.organization_id,
      ipAddress,
      userAgent: req.headers.get('User-Agent')
    })

    // Get rate limit info for headers
    const userRateLimit = await rateLimiters.authenticated.checkLimit(user.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        data: result.data,
        message: result.message
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          ...getRateLimitHeaders(userRateLimit, 100)
        } 
      }
    )

  } catch (error) {
    console.error('Attendance check error:', error)
    
    // Don't expose internal errors to client
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred processing your request',
        reference: crypto.randomUUID() // Reference ID for debugging
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})