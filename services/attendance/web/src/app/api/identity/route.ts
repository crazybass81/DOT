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
/**
 * Update identity information
 * PUT /api/identity?id={identityId}
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

    // Get current user's identity and check permissions
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

    // Check if updating own identity or has permission
    const updatingOwnIdentity = identityId === currentIdentity.id;
    if (!updatingOwnIdentity) {
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'identity',
        action: 'update'
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to update this identity'
          },
          { status: 403 }
        );
      }
    }

    // Update identity using Identity Service
    const updateRequest = {
      fullName: body.fullName,
      phone: body.phone,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      profileData: body.profileData
    };

    const result = await identityService.updateIdentity(identityId, updateRequest);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      identity: result.data
    });

  } catch (error) {
    console.error('Error updating identity:', error);
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
/**
 * Deactivate identity
 * DELETE /api/identity?id={identityId}
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

    // Get current user's identity and check permissions
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

    // Check permissions using Permission Service
    const permissionService = createPermissionService(supabase);
    const permissionResult = await permissionService.checkPermission({
      identityId: currentIdentity.id,
      resource: 'identity',
      action: 'delete'
    });

    if (!permissionResult.success || !permissionResult.data?.granted) {
      return NextResponse.json(
        { 
          error: 'Access forbidden',
          message: permissionResult.data?.reason || 'Insufficient permissions to deactivate identity'
        },
        { status: 403 }
      );
    }

    // Deactivate identity using Identity Service
    const result = await identityService.deactivateIdentity(identityId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Identity successfully deactivated'
    });

  } catch (error) {
    console.error('Error deactivating identity:', error);
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
/**
 * Verify identity
 * PATCH /api/identity?id={identityId}&action=verify
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identityId = searchParams.get('id');
    const action = searchParams.get('action');
    const body = await request.json();

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

    // Get current user's identity and check permissions
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

    // Check permissions for identity verification
    const permissionService = createPermissionService(supabase);
    const permissionResult = await permissionService.checkPermission({
      identityId: currentIdentity.id,
      resource: 'identity',
      action: 'update'  // Verification is considered an update action
    });

    if (!permissionResult.success || !permissionResult.data?.granted) {
      return NextResponse.json(
        { 
          error: 'Access forbidden',
          message: permissionResult.data?.reason || 'Insufficient permissions to verify identity'
        },
        { status: 403 }
      );
    }

    // Verify identity using Identity Service
    const result = await identityService.verifyIdentity(identityId, {
      verified: true,
      verificationData: body.verificationData || {
        verifiedBy: currentIdentity.id,
        verifiedAt: new Date().toISOString(),
        method: 'manual'
      }
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Identity successfully verified',
      identity: result.data
    });

  } catch (error) {
    console.error('Error verifying identity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}