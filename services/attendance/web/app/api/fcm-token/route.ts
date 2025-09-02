import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseFunctionUrl = `${supabaseUrl}/functions/v1/fcm-token`

    // Forward the request to the Supabase Edge Function
    const response = await fetch(supabaseFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
        'x-real-ip': request.headers.get('x-real-ip') || '',
        'user-agent': request.headers.get('user-agent') || ''
      },
      body: JSON.stringify(body)
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(result, { status: response.status })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('FCM Token API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'

    switch (action) {
      case 'list':
        // Get user's devices
        const { data: devices, error: devicesError } = await supabase
          .from('device_tokens')
          .select(`
            id, device_id, device_name, device_type, platform, browser,
            trust_level, verification_status, is_active, is_primary,
            last_used_at, registered_at, usage_count, failed_auth_attempts,
            fingerprint_data, app_version, os_version
          `)
          .order('last_used_at', { ascending: false })

        if (devicesError) {
          return NextResponse.json(
            { error: 'Failed to fetch devices' },
            { status: 500 }
          )
        }

        return NextResponse.json({ devices })

      case 'security-events':
        // Get recent security events
        const { data: events, error: eventsError } = await supabase
          .from('device_security_events')
          .select('*')
          .order('occurred_at', { ascending: false })
          .limit(20)

        if (eventsError) {
          return NextResponse.json(
            { error: 'Failed to fetch security events' },
            { status: 500 }
          )
        }

        return NextResponse.json({ events })

      case 'notifications':
        // Get recent notifications
        const { data: notifications, error: notificationsError } = await supabase
          .from('fcm_notifications')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(20)

        if (notificationsError) {
          return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
          )
        }

        return NextResponse.json({ notifications })

      case 'stats':
        // Get device statistics
        const { data: stats, error: statsError } = await supabase
          .from('v_employee_devices')
          .select('*')
          .eq('employee_id', session.user.id)
          .single()

        if (statsError) {
          return NextResponse.json(
            { error: 'Failed to fetch device statistics' },
            { status: 500 }
          )
        }

        return NextResponse.json({ stats })

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('FCM Token GET Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}