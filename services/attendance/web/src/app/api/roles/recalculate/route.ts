/**
 * Role Recalculation API
 * 
 * Handles role recalculation for identities in the ID-ROLE-PAPER system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { identityService } from '@/services/identityService';
import { RoleType } from '@/src/types/id-role-paper';

/**
 * Recalculate roles for an identity
 * POST /api/roles/recalculate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identityId } = body;

    // Validate required fields
    if (!identityId) {
      return NextResponse.json(
        { error: 'Identity ID is required' },
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

    // Get current user's identity
    const currentIdentity = await identityService.getIdentityByAuthUser(authUser.id);
    if (!currentIdentity) {
      return NextResponse.json(
        { error: 'User identity not found' },
        { status: 404 }
      );
    }

    // Check if recalculating for self or has permission
    const recalculatingForSelf = identityId === currentIdentity.id;
    if (!recalculatingForSelf) {
      const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
      if (!userContext) {
        return NextResponse.json(
          { error: 'Unable to determine user permissions' },
          { status: 403 }
        );
      }

      // Only high-level roles can recalculate roles for others
      const canRecalculate = userContext.availableRoles.some(role => 
        [RoleType.OWNER, RoleType.FRANCHISOR, RoleType.SUPERVISOR].includes(role)
      );

      if (!canRecalculate) {
        return NextResponse.json(
          { error: 'Insufficient permissions to recalculate roles for this identity' },
          { status: 403 }
        );
      }
    }

    // Recalculate roles using identity service
    const computedRoles = await identityService.recalculateRoles(identityId);

    return NextResponse.json({
      message: 'Roles successfully recalculated',
      computedRoles
    });

  } catch (error) {
    console.error('Error recalculating roles:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}