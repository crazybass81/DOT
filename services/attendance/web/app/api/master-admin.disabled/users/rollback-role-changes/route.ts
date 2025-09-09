import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!['ADMIN', 'MASTER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { userIds, rollbackWindow = 5 } = body;

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid user IDs' }, { status: 400 });
    }

    // Execute rollback
    const { data: rollbackSuccess, error: rollbackError } = await supabase.rpc(
      'rollback_role_changes',
      {
        user_ids: userIds,
        rollback_window_minutes: rollbackWindow
      }
    );

    if (rollbackError) {
      console.error('Rollback error:', rollbackError);
      return NextResponse.json({ 
        error: 'Failed to rollback changes',
        details: rollbackError.message 
      }, { status: 500 });
    }

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      action: 'ROLE_CHANGE_ROLLBACK',
      actor_id: user.id,
      details: {
        user_ids: userIds,
        rollback_window: rollbackWindow,
        success: rollbackSuccess
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
      created_at: new Date().toISOString()
    });

    if (rollbackSuccess) {
      // Send notifications to affected users
      const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'ROLE_CHANGE_ROLLBACK',
        title: 'Role change reverted',
        message: 'A recent role change has been reverted by an administrator',
        created_at: new Date().toISOString()
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return NextResponse.json({
      success: rollbackSuccess,
      message: rollbackSuccess 
        ? `Successfully rolled back changes for ${userIds.length} users`
        : 'No changes were rolled back'
    });

  } catch (error) {
    console.error('Rollback error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}