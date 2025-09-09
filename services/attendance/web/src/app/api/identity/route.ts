/**
 * Identity Management API
 * 
 * Handles unified identity operations for the ID-ROLE-PAPER system.
 * Supports both Personal and Corporate ID types with proper authentication
 * and business context validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { identityService } from '@/services/identityService';
import { permissionService, Resource, Action } from '@/lib/permissions/role-permissions';
import { IdType, RoleType } from '@/src/types/id-role-paper';

/**
 * Get identity information with full context
 * GET /api/identity?id={identityId}&include={papers,roles,businesses}
 */
/**
 * Get identity information with full context
 * GET /api/identity?id={identityId}&include={papers,roles,businesses}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identityId = searchParams.get('id');
    const include = searchParams.get('include')?.split(',') || [];

    // Validate request
    if (!identityId) {
      return NextResponse.json(
        { error: 'Identity ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get current user's identity using our Identity Service
    const identityService = createIdentityService(supabase);
    const { data: currentIdentities } = await identityService.searchIdentities({ 
      limit: 1 
    });

    if (!currentIdentities || currentIdentities.length === 0) {
      return NextResponse.json(
        { error: 'User identity not found' },
        { status: 404 }
      );
    }

    const currentIdentity = currentIdentities[0];

    // Check if requesting own identity or has permission
    const requestingOwnIdentity = identityId === currentIdentity.id;
    if (!requestingOwnIdentity) {
      // Use Permission Service to check access
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'identity',
        action: 'read'
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions'
          },
          { status: 403 }
        );
      }
    }

    // Get identity based on include parameters
    let response: any;
    if (include.includes('context') || include.length > 1) {
      const contextResult = await identityService.getIdentityWithContext(identityId);
      if (!contextResult.success || !contextResult.data) {
        return NextResponse.json(
          { error: contextResult.error || 'Identity not found' },
          { status: 404 }
        );
      }

      const identityData = contextResult.data;
      response = {
        identity: identityData.identity
      };

      if (include.includes('papers') || include.includes('context')) {
        response.papers = identityData.papers;
      }

      if (include.includes('roles') || include.includes('context')) {
        response.computedRoles = identityData.computedRoles;
        response.primaryRole = identityData.primaryRole;
        response.availableRoles = identityData.availableRoles;
      }

      if (include.includes('businesses') || include.includes('context')) {
        response.businessRegistrations = identityData.businessRegistrations;
      }

      if (include.includes('permissions') || include.includes('context')) {
        response.permissions = identityData.permissions;
      }
    } else {
      // Get basic identity information
      const identityResult = await identityService.getIdentityById(identityId);
      if (!identityResult.success || !identityResult.data) {
        return NextResponse.json(
          { error: identityResult.error || 'Identity not found' },
          { status: 404 }
        );
      }

      response = {
        identity: identityResult.data
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting identity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create new identity
 * POST /api/identity
 */
/**
 * Create new identity
 * POST /api/identity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get authenticated user from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Use our Identity Service to create identity
    const identityService = createIdentityService(supabase);
    
    const createRequest = {
      idType: body.idType,
      email: body.email,
      fullName: body.fullName,
      phone: body.phone,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      idNumber: body.idNumber,
      authUserId: authUser.id,
      linkedPersonalId: body.linkedPersonalId,
      profileData: body.profileData || {}
    };

    const result = await identityService.createIdentity(createRequest);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { identity: result.data },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating identity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update identity information
 * PUT /api/identity/{id}
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identityId = searchParams.get('id');
    const body = await request.json();

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

    // Check if updating own identity or has permission
    const updatingOwnIdentity = identityId === currentIdentity.id;
    if (!updatingOwnIdentity) {
      const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
      if (!userContext) {
        return NextResponse.json(
          { error: 'Unable to determine user permissions' },
          { status: 403 }
        );
      }

      const hasPermission = permissionService.hasMultiRolePermission(
        userContext.availableRoles,
        Resource.IDENTITY,
        Action.UPDATE,
        {
          targetUserId: identityId,
          currentUserId: currentIdentity.id
        }
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update this identity' },
          { status: 403 }
        );
      }
    }

    // Get existing identity
    const existingIdentity = await identityService.getIdentity(identityId);
    if (!existingIdentity) {
      return NextResponse.json(
        { error: 'Identity not found' },
        { status: 404 }
      );
    }

    // Update identity using Supabase directly for updates
    const updateData = {
      phone: body.phone,
      full_name: body.fullName,
      profile_data: body.profileData,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const { data: updatedIdentity, error } = await supabase
      .from('unified_identities')
      .update(updateData)
      .eq('id', identityId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      identity: {
        id: updatedIdentity.id,
        idType: updatedIdentity.id_type,
        email: updatedIdentity.email,
        phone: updatedIdentity.phone,
        fullName: updatedIdentity.full_name,
        birthDate: updatedIdentity.birth_date ? new Date(updatedIdentity.birth_date) : undefined,
        idNumber: updatedIdentity.id_number,
        authUserId: updatedIdentity.auth_user_id,
        linkedPersonalId: updatedIdentity.linked_personal_id,
        isVerified: updatedIdentity.is_verified,
        isActive: updatedIdentity.is_active,
        profileData: updatedIdentity.profile_data || {},
        createdAt: new Date(updatedIdentity.created_at),
        updatedAt: new Date(updatedIdentity.updated_at)
      }
    });

  } catch (error) {
    console.error('Error updating identity:', error);
    
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
 * Deactivate identity
 * DELETE /api/identity/{id}
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identityId = searchParams.get('id');

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

    // Get user context for permission check
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unable to determine user permissions' },
        { status: 403 }
      );
    }

    // Check permissions - only high-level roles can deactivate identities
    const canDelete = userContext.availableRoles.some(role => 
      [RoleType.OWNER, RoleType.FRANCHISOR, RoleType.SUPERVISOR].includes(role)
    );

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to deactivate identity' },
        { status: 403 }
      );
    }

    // Deactivate identity
    await identityService.deactivateIdentity(identityId);

    return NextResponse.json({
      message: 'Identity successfully deactivated'
    });

  } catch (error) {
    console.error('Error deactivating identity:', error);
    
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
 * Verify identity
 * POST /api/identity/{id}/verify
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identityId = searchParams.get('id');
    const action = searchParams.get('action');

    if (!identityId) {
      return NextResponse.json(
        { error: 'Identity ID is required' },
        { status: 400 }
      );
    }

    if (action !== 'verify') {
      return NextResponse.json(
        { error: 'Invalid action. Only "verify" is supported' },
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

    // Get user context for permission check
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unable to determine user permissions' },
        { status: 403 }
      );
    }

    // Check permissions - only specific roles can verify identities
    const canVerify = permissionService.hasMultiRolePermission(
      userContext.availableRoles,
      Resource.IDENTITY,
      Action.VERIFY
    );

    if (!canVerify) {
      return NextResponse.json(
        { error: 'Insufficient permissions to verify identity' },
        { status: 403 }
      );
    }

    // Verify identity
    await identityService.verifyIdentity(identityId);

    return NextResponse.json({
      message: 'Identity successfully verified'
    });

  } catch (error) {
    console.error('Error verifying identity:', error);
    
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