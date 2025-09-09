/**
 * Updated Attendance Records API for ID-ROLE-PAPER System
 * 
 * Handles attendance operations with the new identity and role system.
 * Uses unified identities and business registrations instead of legacy systems.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { identityService } from '@/services/identity.service';
import { permissionService, Resource, Action } from '@/lib/permissions/role-permissions';
import { RoleType } from '@/src/types/id-role-paper';

/**
 * Get attendance records with ID-ROLE-PAPER system integration
 * GET /api/attendance/updated?identityId={id}&businessId={businessId}&startDate={date}&endDate={date}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identityId = searchParams.get('identityId');
    const businessRegistrationId = searchParams.get('businessId') || request.headers.get('x-business-registration-id');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Build query - updated to use new table structure
    let query = supabase
      .from('attendance_records')
      .select(`
        id,
        identity_id,
        business_registration_id,
        check_in_time,
        check_out_time,
        work_date,
        check_in_location,
        check_out_location,
        verification_method,
        status,
        notes,
        break_time_minutes,
        overtime_minutes,
        role_at_time,
        created_at,
        updated_at,
        unified_identities:identity_id (
          id,
          full_name,
          email,
          phone,
          id_type
        ),
        business_registrations:business_registration_id (
          id,
          business_name,
          registration_number,
          business_type
        )
      `);

    // Apply access control based on user's roles
    const hasSystemWideAccess = userContext.availableRoles.some(role => 
      [RoleType.FRANCHISOR].includes(role)
    );

    const hasManagementAccess = userContext.availableRoles.some(role => 
      [RoleType.OWNER, RoleType.SUPERVISOR, RoleType.MANAGER].includes(role)
    );

    if (!hasSystemWideAccess) {
      if (hasManagementAccess) {
        // Managers can see records for businesses where they have management roles
        const managedBusinesses = userContext.businessRegistrations.map(br => br.id);
        
        if (identityId && identityId !== currentIdentity.id) {
          // Checking specific user - verify they have permission
          const hasPermission = permissionService.hasMultiRolePermission(
            userContext.availableRoles,
            Resource.ATTENDANCE,
            Action.READ,
            {
              businessContextId: businessRegistrationId,
              targetUserId: identityId,
              currentUserId: currentIdentity.id
            }
          );

          if (!hasPermission) {
            return NextResponse.json(
              { error: 'Insufficient permissions to view attendance records' },
              { status: 403 }
            );
          }

          query = query.eq('identity_id', identityId);
          
          if (businessRegistrationId) {
            query = query.eq('business_registration_id', businessRegistrationId);
          } else if (managedBusinesses.length > 0) {
            query = query.in('business_registration_id', managedBusinesses);
          }
        } else {
          // Own records or all records under management
          if (managedBusinesses.length > 0) {
            query = query.or(`identity_id.eq.${currentIdentity.id},business_registration_id.in.(${managedBusinesses.join(',')})`);
          } else {
            query = query.eq('identity_id', currentIdentity.id);
          }
        }
      } else {
        // Regular users can only see their own records
        query = query.eq('identity_id', currentIdentity.id);
      }
    }

    // Apply additional filters
    if (businessRegistrationId && !hasSystemWideAccess) {
      query = query.eq('business_registration_id', businessRegistrationId);
    }

    if (startDate) {
      query = query.gte('check_in_time', startDate);
    }

    if (endDate) {
      query = query.lte('check_in_time', endDate);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination and ordering
    query = query.range(offset, offset + limit - 1).order('check_in_time', { ascending: false });

    const { data: attendanceRecords, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true });

    // Apply same filters to count query
    if (!hasSystemWideAccess) {
      if (hasManagementAccess) {
        const managedBusinesses = userContext.businessRegistrations.map(br => br.id);
        if (identityId && identityId !== currentIdentity.id) {
          countQuery = countQuery.eq('identity_id', identityId);
          if (businessRegistrationId) {
            countQuery = countQuery.eq('business_registration_id', businessRegistrationId);
          }
        } else if (managedBusinesses.length > 0) {
          countQuery = countQuery.or(`identity_id.eq.${currentIdentity.id},business_registration_id.in.(${managedBusinesses.join(',')})`);
        } else {
          countQuery = countQuery.eq('identity_id', currentIdentity.id);
        }
      } else {
        countQuery = countQuery.eq('identity_id', currentIdentity.id);
      }
    }

    if (businessRegistrationId) countQuery = countQuery.eq('business_registration_id', businessRegistrationId);
    if (startDate) countQuery = countQuery.gte('check_in_time', startDate);
    if (endDate) countQuery = countQuery.lte('check_in_time', endDate);
    if (status) countQuery = countQuery.eq('status', status);

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    return NextResponse.json({
      attendanceRecords: attendanceRecords || [],
      totalCount: count || 0,
      limit,
      offset,
      userContext: {
        identityId: currentIdentity.id,
        roles: userContext.availableRoles,
        primaryRole: userContext.primaryRole
      }
    });

  } catch (error) {
    console.error('Error getting attendance records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create attendance record (check-in)
 * POST /api/attendance/updated
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessRegistrationId,
      checkInTime,
      location,
      verificationMethod = 'gps',
      notes
    } = body;
    const businessContextId = businessRegistrationId || request.headers.get('x-business-registration-id');

    // Validate required fields
    if (!businessContextId) {
      return NextResponse.json(
        { error: 'Business registration ID is required' },
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

    // Get user context to check roles and permissions
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unable to determine user context' },
        { status: 403 }
      );
    }

    // Check if user has active role in the specified business
    const hasRoleInBusiness = userContext.computedRoles.some(role =>
      role.businessContextId === businessContextId && role.isActive
    );

    if (!hasRoleInBusiness) {
      return NextResponse.json(
        { error: 'No active role found for this business' },
        { status: 403 }
      );
    }

    // Check permission to create attendance
    const canCheckIn = permissionService.hasMultiRolePermission(
      userContext.availableRoles,
      Resource.ATTENDANCE,
      Action.CREATE,
      {
        businessContextId,
        currentUserId: currentIdentity.id
      }
    );

    if (!canCheckIn) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create attendance record' },
        { status: 403 }
      );
    }

    // Check for existing active attendance record today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: existingAttendance } = await supabase
      .from('attendance_records')
      .select('id, check_out_time')
      .eq('identity_id', currentIdentity.id)
      .eq('business_registration_id', businessContextId)
      .gte('check_in_time', today.toISOString())
      .lt('check_in_time', tomorrow.toISOString())
      .maybeSingle();

    if (existingAttendance && !existingAttendance.check_out_time) {
      return NextResponse.json(
        { error: 'Already checked in. Please check out first.' },
        { status: 409 }
      );
    }

    // Determine current role for this business context
    const currentRole = userContext.computedRoles
      .filter(role => role.businessContextId === businessContextId && role.isActive)
      .sort((a, b) => (userContext.availableRoles.indexOf(a.role) > userContext.availableRoles.indexOf(b.role) ? -1 : 1))[0];

    const checkInTimeValue = checkInTime || new Date().toISOString();

    // Create attendance record with new structure
    const { data: newAttendance, error } = await supabase
      .from('attendance_records')
      .insert({
        identity_id: currentIdentity.id,
        business_registration_id: businessContextId,
        check_in_time: checkInTimeValue,
        check_in_location: location,
        verification_method: verificationMethod,
        notes,
        status: 'active',
        role_at_time: currentRole?.role || RoleType.WORKER,
        work_date: new Date(checkInTimeValue).toISOString().split('T')[0]
      })
      .select(`
        *,
        unified_identities:identity_id (id, full_name, email),
        business_registrations:business_registration_id (id, business_name, registration_number)
      `)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      { 
        attendance: newAttendance,
        roleAtTime: currentRole?.role
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating attendance record:', error);
    
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
 * Update attendance record (check-out, breaks, etc.)
 * PUT /api/attendance/updated
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      checkOutTime,
      checkOutLocation,
      notes,
      status,
      breakTimeMinutes,
      overtimeMinutes
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Attendance record ID is required' },
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

    // Get existing attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', id)
      .single();

    if (attendanceError || !attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Check permissions - can update own record or have management permission
    const isOwnRecord = attendance.identity_id === currentIdentity.id;
    let hasPermission = isOwnRecord;

    if (!isOwnRecord) {
      const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
      if (userContext) {
        hasPermission = permissionService.hasMultiRolePermission(
          userContext.availableRoles,
          Resource.ATTENDANCE,
          Action.UPDATE,
          {
            businessContextId: attendance.business_registration_id,
            targetUserId: attendance.identity_id,
            currentUserId: currentIdentity.id
          }
        );
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update this attendance record' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (checkOutTime) {
      updateData.check_out_time = checkOutTime;
      updateData.status = 'completed';
    }
    
    if (checkOutLocation) updateData.check_out_location = checkOutLocation;
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;
    if (breakTimeMinutes !== undefined) updateData.break_time_minutes = breakTimeMinutes;
    if (overtimeMinutes !== undefined) updateData.overtime_minutes = overtimeMinutes;
    
    updateData.updated_at = new Date().toISOString();

    // Update record
    const { data: updatedAttendance, error } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        unified_identities:identity_id (id, full_name, email),
        business_registrations:business_registration_id (id, business_name, registration_number)
      `)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ attendance: updatedAttendance });

  } catch (error) {
    console.error('Error updating attendance record:', error);
    
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
 * Delete attendance record
 * DELETE /api/attendance/updated?id={attendanceId}
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendanceId = searchParams.get('id');

    if (!attendanceId) {
      return NextResponse.json(
        { error: 'Attendance record ID is required' },
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

    // Get existing attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (attendanceError || !attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Check permissions - only high-level roles can delete attendance records
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unable to determine user permissions' },
        { status: 403 }
      );
    }

    const canDelete = permissionService.hasMultiRolePermission(
      userContext.availableRoles,
      Resource.ATTENDANCE,
      Action.DELETE,
      {
        businessContextId: attendance.business_registration_id,
        targetUserId: attendance.identity_id,
        currentUserId: currentIdentity.id
      }
    );

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete attendance record' },
        { status: 403 }
      );
    }

    // Delete the record
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', attendanceId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Attendance record successfully deleted'
    });

  } catch (error) {
    console.error('Error deleting attendance record:', error);
    
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