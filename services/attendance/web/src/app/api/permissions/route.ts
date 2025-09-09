/**
 * Permission Management API Endpoints
 * Integrated with ID-ROLE-PAPER Permission Service
 * 
 * Provides permission checking, bulk checks, and permission matrix operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  createPermissionService,
  PermissionCheckRequest,
  BulkPermissionCheckRequest,
  PermissionMatrixRequest
} from '../../../lib/services/permission-service';
import { createIdentityService } from '../../../lib/services/identity-service';

/**
 * Check single permission
 * GET /api/permissions/check?resource={resource}&action={action}&businessContext={id}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const action = searchParams.get('action');
    const businessContext = searchParams.get('businessContext');
    const conditions = searchParams.get('conditions');

    if (!resource || !action) {
      return NextResponse.json(
        { error: 'Resource and action are required' },
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

    // Get current user's identity
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

    // Use Permission Service to check permission
    const permissionService = createPermissionService(supabase);
    
    const checkRequest: PermissionCheckRequest = {
      identityId: currentIdentity.id,
      resource,
      action,
      businessContext: businessContext || undefined,
      conditions: conditions ? JSON.parse(conditions) : undefined
    };

    const result = await permissionService.checkPermission(checkRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      permission: result.data,
      identityId: currentIdentity.id,
      resource,
      action,
      businessContext
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
 * Check multiple permissions in bulk
 * POST /api/permissions/check
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { permissions } = body;

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Permissions array is required' },
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

    // Get current user's identity
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

    // Use Permission Service for bulk permission check
    const permissionService = createPermissionService(supabase);
    
    const bulkRequest: BulkPermissionCheckRequest = {
      identityId: currentIdentity.id,
      permissions
    };

    const result = await permissionService.checkBulkPermissions(bulkRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      permissions: result.data,
      identityId: currentIdentity.id,
      checkedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking bulk permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}