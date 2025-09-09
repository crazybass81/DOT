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
      .select('role, organization_id')
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
    const { changes, additionalAuth } = body;

    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Verify additional authentication if provided
    if (additionalAuth?.password) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: additionalAuth.password
      });

      if (signInError) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
    }

    // Check for suspicious patterns
    const { data: patterns } = await supabase.rpc('check_role_change_patterns', {
      user_id: user.id
    });

    if (patterns?.suspicious) {
      // Log security alert
      await supabase.from('security_alerts').insert({
        type: 'SUSPICIOUS_ROLE_CHANGE',
        user_id: user.id,
        details: patterns,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        created_at: new Date().toISOString()
      });

      // Still allow the operation but flag it
      console.warn('Suspicious role change pattern detected:', patterns);
    }

    // Execute bulk role changes
    const { data: result, error: updateError } = await supabase.rpc('bulk_update_roles', {
      changes
    });

    if (updateError) {
      console.error('Bulk update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update roles',
        details: updateError.message 
      }, { status: 500 });
    }

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      action: 'BULK_ROLE_CHANGE',
      actor_id: user.id,
      details: {
        batch_id: result.batch_id,
        successful: result.successful,
        failed: result.failed,
        changes_attempted: changes.length
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
      created_at: new Date().toISOString()
    });

    // Send notifications for successful changes
    const successfulUserIds = Object.entries(result.processed)
      .filter(([_, value]: [string, any]) => value.success)
      .map(([userId]) => userId);

    if (successfulUserIds.length > 0) {
      // Create notifications for affected users
      const notifications = successfulUserIds.map(userId => {
        const change = changes.find((c: any) => c.user_id === userId);
        return {
          user_id: userId,
          type: 'ROLE_CHANGE',
          title: 'Your role has been updated',
          message: `Your role has been changed from ${change?.old_role} to ${change?.new_role}`,
          created_at: new Date().toISOString()
        };
      });

      await supabase.from('notifications').insert(notifications);
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Bulk role change error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Validate role changes endpoint
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { targetUsers, newRole } = body;

    if (!targetUsers || !newRole) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Get current user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Perform validation
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresAdditionalAuth: false,
      validatedUsers: [],
      invalidUsers: []
    };

    // Check role hierarchy
    const roleHierarchy: Record<string, number> = {
      EMPLOYEE: 1,
      MANAGER: 2,
      ADMIN: 3,
      MASTER_ADMIN: 4
    };

    if (roleHierarchy[newRole] > roleHierarchy[profile.role]) {
      validationResults.isValid = false;
      validationResults.errors.push('Cannot assign role higher than your own');
    }

    // Check for last MASTER_ADMIN
    if (newRole !== 'MASTER_ADMIN') {
      const masterAdminsToChange = targetUsers.filter((u: any) => u.current_role === 'MASTER_ADMIN');
      if (masterAdminsToChange.length > 0) {
        const { data: allMasterAdmins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'MASTER_ADMIN');

        if (allMasterAdmins && allMasterAdmins.length <= masterAdminsToChange.length) {
          validationResults.isValid = false;
          validationResults.errors.push('Cannot remove the last MASTER_ADMIN');
        }
      }
    }

    // Check if elevation is required
    const isEscalation = targetUsers.some((u: any) => 
      roleHierarchy[newRole] > roleHierarchy[u.current_role]
    );

    if (isEscalation && (newRole === 'ADMIN' || newRole === 'MASTER_ADMIN')) {
      validationResults.requiresAdditionalAuth = true;
    }

    // Validate each user
    for (const targetUser of targetUsers) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, role, organization_id, is_active')
        .eq('id', targetUser.id)
        .single();

      if (!userProfile || !userProfile.is_active) {
        validationResults.invalidUsers.push({
          user: targetUser,
          reason: 'User not found or inactive'
        });
      } else if (profile.role !== 'MASTER_ADMIN' && userProfile.organization_id !== profile.organization_id) {
        validationResults.invalidUsers.push({
          user: targetUser,
          reason: 'User is in a different organization'
        });
      } else {
        validationResults.validatedUsers.push(targetUser);
      }
    }

    if (validationResults.invalidUsers.length > 0) {
      validationResults.warnings.push(`${validationResults.invalidUsers.length} users cannot be updated`);
    }

    if (targetUsers.length > 20) {
      validationResults.warnings.push('Large batch operation may take several minutes');
    }

    return NextResponse.json(validationResults);

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}