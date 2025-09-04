import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface CheckRequest {
  type: 'check_in' | 'check_out'
  locationId?: string
  latitude?: number
  longitude?: number
  notes?: string
}

// Calculate distance between two coordinates in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    // Get request data
    const { type, locationId, latitude, longitude, notes }: CheckRequest = await req.json()

    // Get employee record
    const { data: employee, error: empError } = await supabaseClient
      .from('employees')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      throw new Error('Employee record not found')
    }

    // Get current date
    const today = new Date().toISOString().split('T')[0]

    // Get or create today's attendance record
    let { data: attendance, error: attendanceError } = await supabaseClient
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .single()

    if (attendanceError && attendanceError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is fine for first check-in
      throw attendanceError
    }

    // Validate location if provided
    let validatedLocationId = locationId
    if (locationId || (latitude && longitude)) {
      if (locationId) {
        // Verify location exists and belongs to organization
        const { data: location } = await supabaseClient
          .from('locations')
          .select('*, latitude, longitude, radius_meters')
          .eq('id', locationId)
          .eq('organization_id', employee.organization_id)
          .single()

        if (location && latitude && longitude) {
          // Check if user is within location radius
          const distance = calculateDistance(
            latitude,
            longitude,
            location.latitude,
            location.longitude
          )

          if (distance > location.radius_meters) {
            throw new Error(
              `You are ${Math.round(distance)}m away from ${location.name}. ` +
              `Maximum allowed distance is ${location.radius_meters}m.`
            )
          }
        }
      }
    }

    // Get employee's shift for today
    const dayOfWeek = new Date().getDay() || 7 // Sunday is 0, convert to 7
    const { data: employeeShift } = await supabaseClient
      .from('employee_shifts')
      .select('shift_id, shifts!inner(id, start_time, end_time, days_of_week)')
      .eq('employee_id', employee.id)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .single()

    let shiftId = null
    let lateMinutes = 0
    let overtimeMinutes = 0

    if (employeeShift && employeeShift.shifts.days_of_week.includes(dayOfWeek)) {
      shiftId = employeeShift.shift_id
      
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      if (type === 'check_in') {
        // Calculate late minutes
        if (currentTime > employeeShift.shifts.start_time) {
          const [shiftHour, shiftMinute] = employeeShift.shifts.start_time.split(':').map(Number)
          const shiftStartMinutes = shiftHour * 60 + shiftMinute
          const currentMinutes = now.getHours() * 60 + now.getMinutes()
          lateMinutes = Math.max(0, currentMinutes - shiftStartMinutes)
        }
      } else if (type === 'check_out' && attendance?.check_in_time) {
        // Calculate overtime minutes
        if (currentTime > employeeShift.shifts.end_time) {
          const [shiftHour, shiftMinute] = employeeShift.shifts.end_time.split(':').map(Number)
          const shiftEndMinutes = shiftHour * 60 + shiftMinute
          const currentMinutes = now.getHours() * 60 + now.getMinutes()
          overtimeMinutes = Math.max(0, currentMinutes - shiftEndMinutes)
        }
      }
    }

    let result
    if (type === 'check_in') {
      if (attendance?.check_in_time) {
        throw new Error('Already checked in for today')
      }

      // Create or update attendance record
      const attendanceData = {
        employee_id: employee.id,
        date: today,
        check_in_time: new Date().toISOString(),
        check_in_location_id: validatedLocationId,
        shift_id: shiftId,
        status: lateMinutes > 30 ? 'late' : 'present',
        late_minutes: lateMinutes,
        notes: notes,
      }

      if (attendance) {
        // Update existing record
        const { data, error } = await supabaseClient
          .from('attendance')
          .update(attendanceData)
          .eq('id', attendance.id)
          .select()
          .single()
        
        if (error) throw error
        result = data
      } else {
        // Create new record
        const { data, error } = await supabaseClient
          .from('attendance')
          .insert(attendanceData)
          .select()
          .single()
        
        if (error) throw error
        result = data
      }
    } else if (type === 'check_out') {
      if (!attendance?.check_in_time) {
        throw new Error('No check-in record found for today')
      }

      if (attendance.check_out_time) {
        throw new Error('Already checked out for today')
      }

      // Calculate total worked hours
      const checkInTime = new Date(attendance.check_in_time)
      const checkOutTime = new Date()
      const workedMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000)

      // Update attendance record
      const { data, error } = await supabaseClient
        .from('attendance')
        .update({
          check_out_time: checkOutTime.toISOString(),
          check_out_location_id: validatedLocationId,
          overtime_minutes: overtimeMinutes,
          notes: attendance.notes ? `${attendance.notes}\n${notes || ''}` : notes,
        })
        .eq('id', attendance.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      throw new Error('Invalid check type')
    }

    // Log audit
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      organization_id: employee.organization_id,
      action: `attendance.${type}`,
      resource: 'attendance',
      resource_id: result.id,
      changes: {
        type,
        time: new Date().toISOString(),
        location_id: validatedLocationId,
        late_minutes: lateMinutes,
        overtime_minutes: overtimeMinutes,
      },
    })

    // Create notification for late check-in
    if (type === 'check_in' && lateMinutes > 15) {
      await supabaseClient.from('notifications').insert({
        user_id: user.id,
        type: 'warning',
        title: 'Late Check-in',
        message: `You checked in ${lateMinutes} minutes late today.`,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        attendance: result,
        message: type === 'check_in' 
          ? `Checked in successfully${lateMinutes > 0 ? ` (${lateMinutes} minutes late)` : ''}` 
          : `Checked out successfully${overtimeMinutes > 0 ? ` (${overtimeMinutes} minutes overtime)` : ''}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})