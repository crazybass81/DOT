// Edge Function: Attendance Check-in/Check-out
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AttendanceRequest {
  action: 'check_in' | 'check_out'
  employeeId: string
  location?: {
    lat: number
    lng: number
  }
  verificationMethod: 'gps' | 'qr' | 'wifi' | 'biometric' | 'manual'
  qrCode?: string
  wifiSSID?: string
  biometricToken?: string
  deviceId?: string
  ipAddress?: string
}

interface LocationConfig {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
  wifi_ssid?: string
  qr_code?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Parse request body
    const body: AttendanceRequest = await req.json()
    const { action, employeeId, location, verificationMethod, qrCode, wifiSSID, biometricToken, deviceId, ipAddress } = body

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*, organization:organizations(*), shift:employee_shifts(*)')
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
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

    if (!userEmployee || (userEmployee.role === 'worker' && employeeId !== employee.id)) {
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get location configuration
    const { data: locationConfig } = await supabase
      .from('locations')
      .select('*')
      .eq('organization_id', employee.organization_id)
      .eq('is_active', true)
      .single()

    // Verify based on method
    let verificationResult = { valid: false, message: 'Verification failed' }
    let verifiedLocationId = null

    switch (verificationMethod) {
      case 'gps':
        if (location && locationConfig) {
          const distance = calculateDistance(
            location.lat,
            location.lng,
            locationConfig.latitude,
            locationConfig.longitude
          )
          verificationResult = {
            valid: distance <= locationConfig.radius,
            message: distance <= locationConfig.radius 
              ? 'Location verified' 
              : `Too far from work location (${Math.round(distance)}m away)`
          }
          if (verificationResult.valid) {
            verifiedLocationId = locationConfig.id
          }
        }
        break

      case 'qr':
        if (qrCode && locationConfig?.qr_code) {
          verificationResult = {
            valid: qrCode === locationConfig.qr_code,
            message: qrCode === locationConfig.qr_code ? 'QR code verified' : 'Invalid QR code'
          }
          if (verificationResult.valid) {
            verifiedLocationId = locationConfig.id
          }
        }
        break

      case 'wifi':
        if (wifiSSID && locationConfig?.wifi_ssid) {
          verificationResult = {
            valid: wifiSSID === locationConfig.wifi_ssid,
            message: wifiSSID === locationConfig.wifi_ssid ? 'WiFi network verified' : 'Not on company WiFi'
          }
          if (verificationResult.valid) {
            verifiedLocationId = locationConfig.id
          }
        }
        break

      case 'biometric':
        if (biometricToken) {
          // Verify biometric token (simplified - in production, verify with proper service)
          verificationResult = {
            valid: biometricToken.length > 10,
            message: 'Biometric authentication successful'
          }
          verifiedLocationId = locationConfig?.id
        }
        break

      case 'manual':
        // Manual approval by manager
        if (userEmployee.role === 'manager' || userEmployee.role === 'admin') {
          verificationResult = {
            valid: true,
            message: 'Manual approval by manager'
          }
          verifiedLocationId = locationConfig?.id
        }
        break
    }

    if (!verificationResult.valid) {
      return new Response(
        JSON.stringify({ 
          error: 'Verification failed', 
          message: verificationResult.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentDate = new Date().toISOString().split('T')[0]
    const currentTime = new Date().toISOString()

    if (action === 'check_in') {
      // Check if already checked in
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', currentDate)
        .single()

      if (existingAttendance) {
        return new Response(
          JSON.stringify({ error: 'Already checked in today' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create attendance record
      const { data: attendance, error: insertError } = await supabase
        .from('attendance')
        .insert({
          employee_id: employeeId,
          date: currentDate,
          check_in_time: currentTime,
          check_in_location_id: verifiedLocationId,
          status: determineStatus(new Date()),
          verification_method: verificationMethod,
          device_id: deviceId,
          ip_address: ipAddress
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      // Log in audit
      await supabase.from('audit_logs').insert({
        organization_id: employee.organization_id,
        user_id: user.id,
        action: 'attendance.check_in',
        resource_type: 'attendance',
        resource_id: attendance.id,
        ip_address: ipAddress,
        user_agent: req.headers.get('User-Agent')
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          attendance,
          message: 'Check-in successful'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'check_out') {
      // Find today's attendance record
      const { data: attendance, error: fetchError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', currentDate)
        .is('check_out_time', null)
        .single()

      if (fetchError || !attendance) {
        return new Response(
          JSON.stringify({ error: 'No check-in record found for today' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate work duration and overtime
      const checkInTime = new Date(attendance.check_in_time)
      const checkOutTime = new Date(currentTime)
      const workDurationMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60))
      const standardWorkMinutes = 8 * 60 // 8 hours
      const overtimeMinutes = Math.max(0, workDurationMinutes - standardWorkMinutes)

      // Update attendance record
      const { data: updatedAttendance, error: updateError } = await supabase
        .from('attendance')
        .update({
          check_out_time: currentTime,
          check_out_location_id: verifiedLocationId,
          work_duration_minutes: workDurationMinutes,
          overtime_minutes: overtimeMinutes
        })
        .eq('id', attendance.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Log in audit
      await supabase.from('audit_logs').insert({
        organization_id: employee.organization_id,
        user_id: user.id,
        action: 'attendance.check_out',
        resource_type: 'attendance',
        resource_id: attendance.id,
        ip_address: ipAddress,
        user_agent: req.headers.get('User-Agent')
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          attendance: updatedAttendance,
          message: 'Check-out successful',
          workDuration: {
            hours: Math.floor(workDurationMinutes / 60),
            minutes: workDurationMinutes % 60,
            overtime: overtimeMinutes > 0 ? {
              hours: Math.floor(overtimeMinutes / 60),
              minutes: overtimeMinutes % 60
            } : null
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Helper function to determine attendance status
function determineStatus(checkInTime: Date): 'present' | 'late' | 'early' {
  const hour = checkInTime.getHours()
  const minutes = checkInTime.getMinutes()
  const totalMinutes = hour * 60 + minutes
  
  const standardStartTime = 9 * 60 // 9:00 AM
  const graceMinutes = 10
  
  if (totalMinutes <= standardStartTime + graceMinutes) {
    return 'present'
  } else if (totalMinutes < standardStartTime - 30) {
    return 'early'
  } else {
    return 'late'
  }
}