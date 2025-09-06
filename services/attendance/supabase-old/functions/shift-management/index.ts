import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface ShiftRequest {
  action: 'create' | 'update' | 'delete' | 'assign' | 'list'
  shiftData?: {
    name: string
    startTime: string
    endTime: string
    breakDuration?: number
    daysOfWeek?: number[]
  }
  shiftId?: string
  employeeId?: string
  startDate?: string
  endDate?: string
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

    // Get user's role and organization
    const { data: userData } = await supabaseClient
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      throw new Error('User data not found')
    }

    // Check permission - only admin and manager can manage shifts
    if (!['master_admin', 'admin', 'manager'].includes(userData.role)) {
      throw new Error('Insufficient permissions to manage shifts')
    }

    const request: ShiftRequest = await req.json()
    let response

    switch (request.action) {
      case 'create':
        if (!request.shiftData) {
          throw new Error('Shift data required for creation')
        }

        // Create new shift
        const { data: newShift, error: createError } = await supabaseClient
          .from('shifts')
          .insert({
            organization_id: userData.organization_id,
            name: request.shiftData.name,
            start_time: request.shiftData.startTime,
            end_time: request.shiftData.endTime,
            break_duration: request.shiftData.breakDuration || 0,
            days_of_week: request.shiftData.daysOfWeek || [1, 2, 3, 4, 5],
            is_active: true,
          })
          .select()
          .single()

        if (createError) throw createError
        response = { success: true, shift: newShift, message: 'Shift created successfully' }
        break

      case 'update':
        if (!request.shiftId || !request.shiftData) {
          throw new Error('Shift ID and data required for update')
        }

        // Update existing shift
        const { data: updatedShift, error: updateError } = await supabaseClient
          .from('shifts')
          .update({
            name: request.shiftData.name,
            start_time: request.shiftData.startTime,
            end_time: request.shiftData.endTime,
            break_duration: request.shiftData.breakDuration,
            days_of_week: request.shiftData.daysOfWeek,
          })
          .eq('id', request.shiftId)
          .eq('organization_id', userData.organization_id)
          .select()
          .single()

        if (updateError) throw updateError
        response = { success: true, shift: updatedShift, message: 'Shift updated successfully' }
        break

      case 'delete':
        if (!request.shiftId) {
          throw new Error('Shift ID required for deletion')
        }

        // Soft delete (mark as inactive)
        const { error: deleteError } = await supabaseClient
          .from('shifts')
          .update({ is_active: false })
          .eq('id', request.shiftId)
          .eq('organization_id', userData.organization_id)

        if (deleteError) throw deleteError
        response = { success: true, message: 'Shift deleted successfully' }
        break

      case 'assign':
        if (!request.shiftId || !request.employeeId) {
          throw new Error('Shift ID and Employee ID required for assignment')
        }

        // Check if employee exists in organization
        const { data: employee } = await supabaseClient
          .from('employees')
          .select('id')
          .eq('id', request.employeeId)
          .eq('organization_id', userData.organization_id)
          .single()

        if (!employee) {
          throw new Error('Employee not found in organization')
        }

        // Check for existing assignment
        const { data: existingAssignment } = await supabaseClient
          .from('employee_shifts')
          .select('id')
          .eq('employee_id', request.employeeId)
          .eq('shift_id', request.shiftId)
          .is('end_date', null)
          .single()

        if (existingAssignment) {
          throw new Error('Employee already assigned to this shift')
        }

        // Create shift assignment
        const { data: assignment, error: assignError } = await supabaseClient
          .from('employee_shifts')
          .insert({
            employee_id: request.employeeId,
            shift_id: request.shiftId,
            start_date: request.startDate || new Date().toISOString().split('T')[0],
            end_date: request.endDate,
          })
          .select()
          .single()

        if (assignError) throw assignError
        
        // Send notification to employee
        await supabaseClient.from('notifications').insert({
          user_id: employee.id,
          type: 'info',
          title: 'Shift Assignment',
          message: 'You have been assigned to a new shift',
          data: { shift_id: request.shiftId, assignment_id: assignment.id },
        })

        response = { 
          success: true, 
          assignment, 
          message: 'Shift assigned successfully' 
        }
        break

      case 'list':
        // List all active shifts for organization
        let query = supabaseClient
          .from('shifts')
          .select(`
            *,
            employee_shifts!left(
              id,
              employee_id,
              start_date,
              end_date,
              employee:employees!inner(
                id,
                first_name,
                last_name,
                employee_code
              )
            )
          `)
          .eq('organization_id', userData.organization_id)
          .eq('is_active', true)
          .order('name')

        const { data: shifts, error: listError } = await query

        if (listError) throw listError
        response = { success: true, shifts }
        break

      default:
        throw new Error('Invalid action')
    }

    // Log audit
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      organization_id: userData.organization_id,
      action: `shift.${request.action}`,
      resource: 'shifts',
      resource_id: request.shiftId,
      changes: request.shiftData || { employee_id: request.employeeId },
    })

    return new Response(
      JSON.stringify(response),
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