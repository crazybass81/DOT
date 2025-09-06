import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface SignupRequest {
  email: string
  password: string
  role: 'admin' | 'manager' | 'worker'
  organizationId?: string
  employeeData?: {
    firstName: string
    lastName: string
    employeeCode: string
    department?: string
    position?: string
    hireDate: string
    phone?: string
  }
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get request data
    const { 
      email, 
      password, 
      role, 
      organizationId,
      employeeData 
    }: SignupRequest = await req.json()

    // Validate role hierarchy
    const { data: { user: currentUser } } = await supabaseClient.auth.getUser()
    
    if (!currentUser) {
      throw new Error('Not authenticated')
    }

    // Get current user's role
    const { data: currentUserData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    // Check permission to create user with specified role
    const canCreateRole = (currentRole: string, targetRole: string): boolean => {
      const hierarchy: Record<string, number> = {
        'master_admin': 4,
        'admin': 3,
        'manager': 2,
        'worker': 1,
      }
      return hierarchy[currentRole] > hierarchy[targetRole]
    }

    if (!canCreateRole(currentUserData.role, role)) {
      throw new Error('Insufficient permissions to create user with this role')
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) throw authError

    // Create user record
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        role,
        organization_id: organizationId || currentUserData.organization_id,
        encrypted_password: 'supabase_managed', // Supabase handles password encryption
      })
      .select()
      .single()

    if (userError) {
      // Rollback auth user if database user creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw userError
    }

    // Create employee record if employee data provided
    let employeeRecord = null
    if (employeeData && organizationId) {
      const { data: empData, error: empError } = await supabaseAdmin
        .from('employees')
        .insert({
          user_id: userData.id,
          organization_id: organizationId,
          first_name: employeeData.firstName,
          last_name: employeeData.lastName,
          employee_code: employeeData.employeeCode,
          department: employeeData.department,
          position: employeeData.position,
          hire_date: employeeData.hireDate,
          phone: employeeData.phone,
        })
        .select()
        .single()

      if (empError) {
        // Rollback user and auth user if employee creation fails
        await supabaseAdmin.from('users').delete().eq('id', userData.id)
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw empError
      }
      
      employeeRecord = empData
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: currentUser.id,
      organization_id: organizationId || currentUserData.organization_id,
      action: 'user.created',
      resource: 'users',
      resource_id: userData.id,
      changes: {
        email,
        role,
        employee_created: !!employeeRecord,
      },
    })

    // Send welcome notification
    await supabaseAdmin.from('notifications').insert({
      user_id: userData.id,
      type: 'info',
      title: 'Welcome to Attendance System',
      message: `Your account has been created with ${role} permissions.`,
    })

    return new Response(
      JSON.stringify({
        user: userData,
        employee: employeeRecord,
        message: 'User created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})