/**
 * Permission Check API
 * 
 * Handles permission checking for specific resources and actions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { identityService } from '@/services/identityService';
import { permissionService } from '@/lib/permissions/role-permissions';

/**
 * Check specific permission for user
 * POST /api/roles/check-permission
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resource, action, context } = body;

    if (!resource || !action) {
      return NextResponse.json(
        { error: 'Resource and action are required' },
        { status: 400 }
      );
    }

    // Get current user from authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current user's identity and context
    const currentIdentity = await identityService.getIdentityByAuthUser(authUser.id);
    if (!currentIdentity) {
      return NextResponse.json(
        { error: 'User identity not found' },
        { status: 404 }
      );
    }

    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unable to determine user context' },
        { status: 403 }
      );
    }

    // Check permission
    const hasPermission = permissionService.hasMultiRolePermission(
      userContext.availableRoles,
      resource,
      action,
      {
        ...context,
        currentUserId: currentIdentity.id
      }
    );

    // Get explanation for first available role
    const explanation = userContext.availableRoles.length > 0 ? 
      permissionService.getPermissionExplanation(userContext.availableRoles[0], resource, action) :
      { granted: false, reason: 'No roles available' };

    return NextResponse.json({
      hasPermission,
      roles: userContext.availableRoles,
      explanation,
      context: {
        identityId: currentIdentity.id,
        primaryRole: userContext.primaryRole,
        businessContextId: context?.businessContextId
      }
    });

  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}