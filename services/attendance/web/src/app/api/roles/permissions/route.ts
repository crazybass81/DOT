/**
 * Role Permissions API
 * 
 * Handles role permission queries and checks for the ID-ROLE-PAPER system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { identityService } from '@/services/identityService';
import { permissionService } from '@/lib/permissions/role-permissions';
import { RoleType } from '@/src/types/id-role-paper';

/**
 * Get role permissions for specific roles
 * GET /api/roles/permissions?roles=WORKER,MANAGER
 */
export async function GET(request: NextRequest) {
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