/**
 * Roles Management API
 * 
 * Handles computed role operations for the ID-ROLE-PAPER system.
 * Roles are dynamically calculated from owned papers and cannot be directly assigned.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { identityService } from '@/services/identityService';
import { permissionService, Resource, Action } from '@/lib/permissions/role-permissions';
import { RoleType } from '@/src/types/id-role-paper';

/**
 * Get computed roles with filtering
 * GET /api/roles?identityId={id}&role={roleType}&businessContext={businessId}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identityId = searchParams.get('identityId');
    const roleType = searchParams.get('role') as RoleType;
    const businessContextId = searchParams.get('businessContext') || request.headers.get('x-business-registration-id');
    const isActive = searchParams.get('isActive');
    const includePermissions = searchParams.get('includePermissions') === 'true';

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

    // Build query
    let query = supabase
      .from('computed_roles')
      .select(`
        id,
        identity_id,
        role,
        source_papers,
        business_context_id,
        is_active,
        computed_at,
        unified_identities:identity_id (
          id,
          full_name,
          email,
          id_type
        ),
        business_registrations:business_context_id (
          id,
          business_name,
          registration_number
        )
      `);

    // Get user context for permission checking
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unable to determine user permissions' },
        { status: 403 }
      );
    }

    // If specific identity requested, check permissions
    if (identityId) {
      const requestingOwnRoles = identityId === currentIdentity.id;
      if (!requestingOwnRoles) {
        const hasPermission = permissionService.hasMultiRolePermission(
          userContext.availableRoles,
          Resource.USER_ROLES,
          Action.READ,
          {
            businessContextId,
            targetUserId: identityId,
            currentUserId: currentIdentity.id
          }
        );

        if (!hasPermission) {
          return NextResponse.json(
            { error: 'Insufficient permissions to access roles' },
            { status: 403 }
          );
        }
      }
      query = query.eq('identity_id', identityId);
    } else {
      // If no specific identity, filter based on user permissions
      const hasSystemWideAccess = userContext.availableRoles.some(role => 
        [RoleType.FRANCHISOR, RoleType.OWNER, RoleType.SUPERVISOR].includes(role)
      );

      if (!hasSystemWideAccess) {
        // User can only see their own roles
        query = query.eq('identity_id', currentIdentity.id);
      } else if (businessContextId) {
        // Filter by business context if provided
        query = query.eq('business_context_id', businessContextId);
      }
    }

    // Apply filters
    if (roleType && Object.values(RoleType).includes(roleType)) {
      query = query.eq('role', roleType);
    }

    if (businessContextId) {
      query = query.eq('business_context_id', businessContextId);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    // Execute query
    query = query.order('computed_at', { ascending: false });
    const { data: rolesData, error } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match our interface
    const computedRoles = rolesData?.map(role => ({
      id: role.id,
      identityId: role.identity_id,
      role: role.role as RoleType,
      sourcePapers: role.source_papers || [],
      businessContextId: role.business_context_id,
      isActive: role.is_active,
      computedAt: new Date(role.computed_at),
      identity: role.unified_identities ? {
        id: role.unified_identities.id,
        fullName: role.unified_identities.full_name,
        email: role.unified_identities.email,
        idType: role.unified_identities.id_type
      } : undefined,
      businessContext: role.business_registrations ? {
        id: role.business_registrations.id,
        businessName: role.business_registrations.business_name,
        registrationNumber: role.business_registrations.registration_number
      } : undefined
    })) || [];

    // Include permissions if requested
    let enrichedRoles = computedRoles;
    if (includePermissions) {
      enrichedRoles = await Promise.all(computedRoles.map(async (role) => {
        const permissions = permissionService.getRolePermissions(role.role);
        return {
          ...role,
          permissions
        };
      }));
    }

    return NextResponse.json({ computedRoles: enrichedRoles });

  } catch (error) {
    console.error('Error getting computed roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create computed role or trigger recalculation
 * POST /api/roles
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, identityId } = body;

    if (action === 'recalculate') {
      // Handle role recalculation
      if (!identityId) {
        return NextResponse.json(
          { error: 'Identity ID is required for recalculation' },
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
    }

    return NextResponse.json(
      { error: 'Invalid action. Use action: "recalculate" with identityId' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing role request:', error);
    
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