/**
 * Updated User Roles API for ID-ROLE-PAPER System
 * 
 * Provides compatibility layer for legacy user-roles while integrating with
 * the new computed roles system. Maintains backward compatibility while
 * leveraging the new architecture.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { identityService } from '@/services/identityService';
import { permissionService, Resource, Action } from '@/lib/permissions/role-permissions';
import { RoleType } from '@/src/types/id-role-paper';

/**
 * Get user roles with ID-ROLE-PAPER integration
 * GET /api/user-roles/updated?businessRegistrationId={id}&identityId={id}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessRegistrationId = searchParams.get('businessRegistrationId') || searchParams.get('organizationId');
    const identityId = searchParams.get('identityId') || searchParams.get('userId');
    const role = searchParams.get('role');
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

    // Get user context for permissions
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unable to determine user permissions' },
        { status: 403 }
      );
    }

    // Build query for computed roles
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
          phone,
          id_type
        ),
        business_registrations:business_context_id (
          id,
          business_name,
          registration_number,
          business_type
        )
      `);

    // Apply access control
    const hasSystemWideAccess = userContext.availableRoles.some(role => 
      [RoleType.FRANCHISOR].includes(role)
    );

    const hasManagementAccess = userContext.availableRoles.some(role => 
      [RoleType.OWNER, RoleType.SUPERVISOR, RoleType.MANAGER].includes(role)
    );

    if (!hasSystemWideAccess) {
      if (hasManagementAccess) {
        // Managers can see roles for businesses they manage
        const managedBusinesses = userContext.businessRegistrations.map(br => br.id);
        
        if (identityId && identityId !== currentIdentity.id) {
          // Check permission to view specific identity's roles
          const hasPermission = permissionService.hasMultiRolePermission(
            userContext.availableRoles,
            Resource.USER_ROLES,
            Action.READ,
            {
              businessContextId: businessRegistrationId,
              targetUserId: identityId,
              currentUserId: currentIdentity.id
            }
          );

          if (!hasPermission) {
            return NextResponse.json(
              { error: 'Insufficient permissions to access user roles' },
              { status: 403 }
            );
          }

          query = query.eq('identity_id', identityId);
        } else {
          // Show all roles in managed businesses
          if (managedBusinesses.length > 0) {
            query = query.or(`identity_id.eq.${currentIdentity.id},business_context_id.in.(${managedBusinesses.join(',')})`);
          } else {
            query = query.eq('identity_id', currentIdentity.id);
          }
        }
      } else {
        // Regular users can only see their own roles
        query = query.eq('identity_id', currentIdentity.id);
      }
    }

    // Apply additional filters
    if (businessRegistrationId) {
      query = query.eq('business_context_id', businessRegistrationId);
    }

    if (role && Object.values(RoleType).includes(role as RoleType)) {
      query = query.eq('role', role);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    // Execute query
    query = query.order('computed_at', { ascending: false });
    const { data: computedRolesData, error } = await query;

    if (error) {
      throw error;
    }

    // Transform computed roles to legacy user roles format for compatibility
    const userRoles = computedRolesData?.map(role => ({
      id: role.id,
      user_id: role.identity_id, // Legacy format
      identityId: role.identity_id, // New format
      organization_id: role.business_context_id, // Legacy format
      businessRegistrationId: role.business_context_id, // New format
      role: role.role,
      is_active: role.is_active,
      start_date: role.computed_at, // Use computed date as start date
      end_date: null, // Computed roles don't have end dates
      created_at: role.computed_at,
      updated_at: role.computed_at,
      sourcePapers: role.source_papers,
      user: role.unified_identities ? {
        id: role.unified_identities.id,
        name: role.unified_identities.full_name,
        email: role.unified_identities.email,
        phone: role.unified_identities.phone,
        idType: role.unified_identities.id_type
      } : undefined,
      organization: role.business_registrations ? {
        id: role.business_registrations.id,
        name: role.business_registrations.business_name,
        type: role.business_registrations.business_type,
        registrationNumber: role.business_registrations.registration_number
      } : undefined,
      permissions: includePermissions ? permissionService.getRolePermissions(role.role as RoleType) : undefined
    })) || [];

    return NextResponse.json({ 
      userRoles,
      legacy: true,
      note: 'This endpoint provides computed roles in legacy format for backward compatibility'
    });

  } catch (error) {
    console.error('Error getting user roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create user role (Creates appropriate papers to grant roles)
 * POST /api/user-roles/updated
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      identityId,
      user_id, // Legacy support
      businessRegistrationId,
      organization_id, // Legacy support
      role,
      paperData = {},
      startDate,
      endDate
    } = body;

    // Support legacy field names
    const targetIdentityId = identityId || user_id;
    const targetBusinessId = businessRegistrationId || organization_id;

    // Validate required fields
    if (!targetIdentityId || !targetBusinessId || !role) {
      return NextResponse.json(
        { error: 'Identity ID, business registration ID, and role are required' },
        { status: 400 }
      );
    }

    // Validate role type
    if (!Object.values(RoleType).includes(role as RoleType)) {
      return NextResponse.json(
        { error: 'Invalid role type' },
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

    // Check permissions to create roles for others
    const creatingForSelf = targetIdentityId === currentIdentity.id;
    if (!creatingForSelf) {
      const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
      if (!userContext) {
        return NextResponse.json(
          { error: 'Unable to determine user permissions' },
          { status: 403 }
        );
      }

      const hasPermission = permissionService.hasMultiRolePermission(
        userContext.availableRoles,
        Resource.USER_ROLES,
        Action.CREATE,
        {
          businessContextId: targetBusinessId,
          targetUserId: targetIdentityId,
          currentUserId: currentIdentity.id
        }
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions to create roles for this identity' },
          { status: 403 }
        );
      }
    }

    // Determine what papers need to be created based on desired role
    let papersToCreate = [];
    const roleType = role as RoleType;

    switch (roleType) {
      case RoleType.WORKER:
        papersToCreate.push({
          paperType: 'Employment Contract',
          relatedBusinessId: targetBusinessId,
          paperData: {
            role: 'WORKER',
            startDate: startDate || new Date().toISOString(),
            endDate,
            ...paperData
          }
        });
        break;

      case RoleType.MANAGER:
        // Manager requires both Employment Contract and Authority Delegation
        papersToCreate.push(
          {
            paperType: 'Employment Contract',
            relatedBusinessId: targetBusinessId,
            paperData: {
              role: 'WORKER',
              startDate: startDate || new Date().toISOString(),
              endDate,
              ...paperData
            }
          },
          {
            paperType: 'Authority Delegation',
            relatedBusinessId: targetBusinessId,
            paperData: {
              role: 'MANAGER',
              delegatedBy: currentIdentity.id,
              delegatedAt: new Date().toISOString(),
              ...paperData
            }
          }
        );
        break;

      case RoleType.SUPERVISOR:
        // Supervisor requires Employment Contract and Supervisor Authority Delegation
        papersToCreate.push(
          {
            paperType: 'Employment Contract',
            relatedBusinessId: targetBusinessId,
            paperData: {
              role: 'WORKER',
              startDate: startDate || new Date().toISOString(),
              endDate,
              ...paperData
            }
          },
          {
            paperType: 'Supervisor Authority Delegation',
            relatedBusinessId: targetBusinessId,
            paperData: {
              role: 'SUPERVISOR',
              delegatedBy: currentIdentity.id,
              delegatedAt: new Date().toISOString(),
              ...paperData
            }
          }
        );
        break;

      case RoleType.OWNER:
        return NextResponse.json(
          { error: 'OWNER role cannot be directly assigned. Create a business registration instead.' },
          { status: 400 }
        );

      case RoleType.FRANCHISEE:
        papersToCreate.push({
          paperType: 'Franchise Agreement',
          relatedBusinessId: targetBusinessId,
          paperData: {
            agreementType: 'Franchisee',
            signedAt: new Date().toISOString(),
            ...paperData
          }
        });
        break;

      case RoleType.FRANCHISOR:
        papersToCreate.push({
          paperType: 'Franchise HQ Registration',
          relatedBusinessId: targetBusinessId,
          paperData: {
            hqStatus: true,
            registeredAt: new Date().toISOString(),
            ...paperData
          }
        });
        break;

      default:
        return NextResponse.json(
          { error: `Role ${roleType} cannot be directly assigned through papers` },
          { status: 400 }
        );
    }

    // Create the required papers
    const createdPapers = [];
    for (const paperRequest of papersToCreate) {
      try {
        const paper = await identityService.createPaper(targetIdentityId, {
          paperType: paperRequest.paperType as any,
          relatedBusinessId: paperRequest.relatedBusinessId,
          paperData: paperRequest.paperData,
          validFrom: startDate ? new Date(startDate) : undefined,
          validUntil: endDate ? new Date(endDate) : undefined
        });
        createdPapers.push(paper);
      } catch (error) {
        console.error('Error creating paper:', error);
        // Rollback previously created papers if needed
        // This would require implementing a rollback mechanism
        throw error;
      }
    }

    // Roles are automatically calculated after paper creation
    const updatedUserContext = await identityService.getIdentityWithContext(targetIdentityId);
    const newRole = updatedUserContext?.computedRoles.find(r => 
      r.role === roleType && r.businessContextId === targetBusinessId && r.isActive
    );

    if (!newRole) {
      return NextResponse.json(
        { error: 'Failed to create role. Papers created but role calculation failed.' },
        { status: 500 }
      );
    }

    // Return in legacy format
    const userRole = {
      id: newRole.id,
      user_id: newRole.identityId,
      identityId: newRole.identityId,
      organization_id: newRole.businessContextId,
      businessRegistrationId: newRole.businessContextId,
      role: newRole.role,
      is_active: newRole.isActive,
      start_date: newRole.computedAt,
      end_date: null,
      created_at: newRole.computedAt,
      updated_at: newRole.computedAt,
      sourcePapers: newRole.sourcePapers,
      createdPapers
    };

    return NextResponse.json(
      { 
        userRole,
        message: 'Role created successfully through paper generation'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating user role:', error);
    
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
 * Update user role (Updates related papers)
 * PUT /api/user-roles/updated
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      identityId,
      isActive,
      is_active, // Legacy support
      paperData,
      endDate,
      end_date // Legacy support
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Role ID is required' },
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

    // Get the computed role
    const { data: computedRole, error: roleError } = await supabase
      .from('computed_roles')
      .select('*')
      .eq('id', id)
      .single();

    if (roleError || !computedRole) {
      return NextResponse.json(
        { error: 'Computed role not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const updatingOwnRole = computedRole.identity_id === currentIdentity.id;
    if (!updatingOwnRole) {
      const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
      if (!userContext) {
        return NextResponse.json(
          { error: 'Unable to determine user permissions' },
          { status: 403 }
        );
      }

      const hasPermission = permissionService.hasMultiRolePermission(
        userContext.availableRoles,
        Resource.USER_ROLES,
        Action.UPDATE,
        {
          businessContextId: computedRole.business_context_id,
          targetUserId: computedRole.identity_id,
          currentUserId: currentIdentity.id
        }
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update this role' },
          { status: 403 }
        );
      }
    }

    const activeStatus = isActive !== undefined ? isActive : is_active;
    const endDateValue = endDate || end_date;

    // Update the underlying papers that grant this role
    const sourcePapers = computedRole.source_papers || [];
    
    if (sourcePapers.length > 0) {
      const updatePromises = sourcePapers.map(async (paperId: string) => {
        const updateData: any = {};
        
        if (activeStatus === false) {
          updateData.is_active = false;
        } else if (activeStatus === true) {
          updateData.is_active = true;
        }
        
        if (endDateValue) {
          updateData.valid_until = new Date(endDateValue).toISOString();
        }
        
        if (paperData) {
          // Merge with existing paper data
          const { data: existingPaper } = await supabase
            .from('papers')
            .select('paper_data')
            .eq('id', paperId)
            .single();
          
          updateData.paper_data = {
            ...(existingPaper?.paper_data || {}),
            ...paperData
          };
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          
          return supabase
            .from('papers')
            .update(updateData)
            .eq('id', paperId);
        }
        
        return null;
      });

      await Promise.all(updatePromises.filter(Boolean));

      // Recalculate roles after paper updates
      await identityService.recalculateRoles(computedRole.identity_id);
    }

    // Get updated role
    const updatedUserContext = await identityService.getIdentityWithContext(computedRole.identity_id);
    const updatedRole = updatedUserContext?.computedRoles.find(r => r.id === id);

    if (!updatedRole) {
      return NextResponse.json(
        { error: 'Role not found after update' },
        { status: 404 }
      );
    }

    // Return in legacy format
    const userRole = {
      id: updatedRole.id,
      user_id: updatedRole.identityId,
      identityId: updatedRole.identityId,
      organization_id: updatedRole.businessContextId,
      businessRegistrationId: updatedRole.businessContextId,
      role: updatedRole.role,
      is_active: updatedRole.isActive,
      start_date: updatedRole.computedAt,
      end_date: endDateValue,
      created_at: updatedRole.computedAt,
      updated_at: new Date().toISOString(),
      sourcePapers: updatedRole.sourcePapers
    };

    return NextResponse.json({ 
      userRole,
      message: 'Role updated successfully through paper modification'
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    
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
 * Delete user role (Deactivates related papers)
 * DELETE /api/user-roles/updated?id={roleId}
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
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

    // Get the computed role
    const { data: computedRole, error: roleError } = await supabase
      .from('computed_roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (roleError || !computedRole) {
      return NextResponse.json(
        { error: 'Computed role not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unable to determine user permissions' },
        { status: 403 }
      );
    }

    const hasPermission = permissionService.hasMultiRolePermission(
      userContext.availableRoles,
      Resource.USER_ROLES,
      Action.DELETE,
      {
        businessContextId: computedRole.business_context_id,
        targetUserId: computedRole.identity_id,
        currentUserId: currentIdentity.id
      }
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this role' },
        { status: 403 }
      );
    }

    // Check if there are attendance records
    const { data: attendanceRecords } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('identity_id', computedRole.identity_id)
      .eq('business_registration_id', computedRole.business_context_id)
      .limit(1);

    const hasAttendanceData = attendanceRecords && attendanceRecords.length > 0;

    // Deactivate related papers
    const sourcePapers = computedRole.source_papers || [];
    if (sourcePapers.length > 0) {
      await Promise.all(sourcePapers.map((paperId: string) =>
        supabase
          .from('papers')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', paperId)
      ));

      // Recalculate roles after paper deactivation
      await identityService.recalculateRoles(computedRole.identity_id);
    }

    const message = hasAttendanceData
      ? 'Role deactivated (attendance records exist, cannot hard delete)'
      : 'Role successfully deactivated';

    return NextResponse.json({ message });

  } catch (error) {
    console.error('Error deleting user role:', error);
    
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