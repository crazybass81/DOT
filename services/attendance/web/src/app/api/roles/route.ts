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

/**
 * Get role permissions for specific roles
 * GET /api/roles/permissions?roles=WORKER,MANAGER
 */
export async function GET_PERMISSIONS(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rolesParam = searchParams.get('roles');
    const includeHierarchy = searchParams.get('includeHierarchy') === 'true';

    if (!rolesParam) {
      return NextResponse.json(
        { error: 'Roles parameter is required' },
        { status: 400 }
      );
    }

    // Parse roles
    const roles = rolesParam.split(',').filter(role => 
      Object.values(RoleType).includes(role as RoleType)
    ) as RoleType[];

    if (roles.length === 0) {
      return NextResponse.json(
        { error: 'No valid roles provided' },
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

    // Get permissions for roles
    const rolePermissions = roles.map(role => ({
      role,
      permissions: permissionService.getRolePermissions(role)
    }));

    // Get multi-role permissions if multiple roles
    const multiRolePermissions = roles.length > 1 ? 
      permissionService.getMultiRolePermissions(roles) : [];

    const response: any = {
      rolePermissions,
      multiRolePermissions: roles.length > 1 ? multiRolePermissions : undefined
    };

    // Include hierarchy information if requested
    if (includeHierarchy) {
      response.roleHierarchy = roles.map(role => ({
        role,
        explanation: permissionService.getPermissionExplanation(role, 'identity', 'read')
      }));
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting role permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check specific permission for user
 * POST /api/roles/check-permission
 */
export async function POST_CHECK_PERMISSION(request: NextRequest) {
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

/**
 * Get role statistics and insights
 * GET /api/roles/stats
 */
export async function GET_STATS(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessContextId = searchParams.get('businessContext') || request.headers.get('x-business-registration-id');
    const timeRange = searchParams.get('timeRange') || '30d';

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

    // Check permissions - only management roles can see stats
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    const hasAccess = userContext?.availableRoles.some(role => 
      [RoleType.OWNER, RoleType.FRANCHISOR, RoleType.SUPERVISOR, RoleType.MANAGER].includes(role)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view role statistics' },
        { status: 403 }
      );
    }

    // Calculate date range
    const daysBack = parseInt(timeRange.replace('d', '')) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Build base query
    let query = supabase
      .from('computed_roles')
      .select('role, business_context_id, computed_at, is_active')
      .gte('computed_at', startDate.toISOString());

    // Filter by business context if provided
    if (businessContextId) {
      query = query.eq('business_context_id', businessContextId);
    }

    const { data: rolesData, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = {
      totalRoles: rolesData?.length || 0,
      activeRoles: rolesData?.filter(r => r.is_active).length || 0,
      roleDistribution: {} as Record<string, number>,
      businessContextDistribution: {} as Record<string, number>,
      recentlyComputed: rolesData?.filter(r => {
        const computedDate = new Date(r.computed_at);
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        return computedDate > oneDayAgo;
      }).length || 0
    };

    // Calculate role distribution
    rolesData?.forEach(role => {
      if (role.is_active) {
        stats.roleDistribution[role.role] = (stats.roleDistribution[role.role] || 0) + 1;
        
        if (role.business_context_id) {
          stats.businessContextDistribution[role.business_context_id] = 
            (stats.businessContextDistribution[role.business_context_id] || 0) + 1;
        }
      }
    });

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error getting role statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}