/**
 * Business Registrations Management API
 * 
 * Handles business registration operations for the ID-ROLE-PAPER system.
 * Business registrations replace organizations and are core business entities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { identityService } from '@/services/identity.service';
import { permissionService, Resource, Action } from '@/lib/permissions/role-permissions';
import { BusinessType, VerificationStatus, RoleType } from '@/src/types/id-role-paper';

/**
 * Get business registrations with filtering
 * GET /api/business-registrations?ownerId={id}&status={status}&type={type}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const status = searchParams.get('status') as VerificationStatus;
    const businessType = searchParams.get('type') as BusinessType;
    const isActive = searchParams.get('isActive');
    const registrationNumber = searchParams.get('registrationNumber');

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
      .from('business_registrations')
      .select(`
        id,
        registration_number,
        business_name,
        business_type,
        owner_identity_id,
        registration_data,
        verification_status,
        is_active,
        created_at,
        updated_at,
        unified_identities:owner_identity_id (
          id,
          full_name,
          email,
          id_type
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

    // If specific owner requested, check permissions
    if (ownerId) {
      const requestingOwnBusinesses = ownerId === currentIdentity.id;
      if (!requestingOwnBusinesses) {
        const hasPermission = permissionService.hasMultiRolePermission(
          userContext.availableRoles,
          Resource.BUSINESS_REGISTRATION,
          Action.READ,
          {
            targetUserId: ownerId,
            currentUserId: currentIdentity.id
          }
        );

        if (!hasPermission) {
          return NextResponse.json(
            { error: 'Insufficient permissions to access business registrations' },
            { status: 403 }
          );
        }
      }
      query = query.eq('owner_identity_id', ownerId);
    } else {
      // If no specific owner, filter based on user permissions
      const hasSystemWideAccess = userContext.availableRoles.some(role => 
        [RoleType.FRANCHISOR].includes(role)
      );

      if (!hasSystemWideAccess) {
        // User can only see their own business registrations
        query = query.eq('owner_identity_id', currentIdentity.id);
      }
    }

    // Apply filters
    if (status && Object.values(VerificationStatus).includes(status)) {
      query = query.eq('verification_status', status);
    }

    if (businessType && Object.values(BusinessType).includes(businessType)) {
      query = query.eq('business_type', businessType);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    if (registrationNumber) {
      query = query.eq('registration_number', registrationNumber);
    }

    // Execute query
    query = query.order('created_at', { ascending: false });
    const { data: businessData, error } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match our interface
    const businessRegistrations = businessData?.map(business => ({
      id: business.id,
      registrationNumber: business.registration_number,
      businessName: business.business_name,
      businessType: business.business_type as BusinessType,
      ownerIdentityId: business.owner_identity_id,
      registrationData: business.registration_data || {},
      verificationStatus: business.verification_status as VerificationStatus,
      isActive: business.is_active,
      createdAt: new Date(business.created_at),
      updatedAt: new Date(business.updated_at),
      ownerIdentity: business.unified_identities ? {
        id: business.unified_identities.id,
        fullName: business.unified_identities.full_name,
        email: business.unified_identities.email,
        idType: business.unified_identities.id_type
      } : undefined
    })) || [];

    return NextResponse.json({ businessRegistrations });

  } catch (error) {
    console.error('Error getting business registrations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create new business registration
 * POST /api/business-registrations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      identityId,
      registrationNumber,
      businessName,
      businessType,
      registrationData
    } = body;

    // Validate required fields
    if (!identityId || !registrationNumber || !businessName || !businessType) {
      return NextResponse.json(
        { error: 'Identity ID, registration number, business name, and business type are required' },
        { status: 400 }
      );
    }

    // Validate business type
    if (!Object.values(BusinessType).includes(businessType)) {
      return NextResponse.json(
        { error: 'Invalid business type' },
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

    // Check if creating business for self or has permission
    const creatingForSelf = identityId === currentIdentity.id;
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
        Resource.BUSINESS_REGISTRATION,
        Action.CREATE,
        {
          targetUserId: identityId,
          currentUserId: currentIdentity.id
        }
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions to create business registration for this identity' },
          { status: 403 }
        );
      }
    }

    // Create business registration using identity service
    const businessRegistration = await identityService.createBusinessRegistration(identityId, {
      registrationNumber,
      businessName,
      businessType,
      registrationData: registrationData || {}
    });

    return NextResponse.json(
      { businessRegistration },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating business registration:', error);
    
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
 * Update business registration
 * PUT /api/business-registrations/{id}
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('id');
    const body = await request.json();

    if (!businessId) {
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

    // Get existing business registration
    const { data: businessData, error: businessError } = await supabase
      .from('business_registrations')
      .select('*')
      .eq('id', businessId)
      .single();

    if (businessError || !businessData) {
      return NextResponse.json(
        { error: 'Business registration not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isOwner = businessData.owner_identity_id === currentIdentity.id;
    if (!isOwner) {
      const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
      if (!userContext) {
        return NextResponse.json(
          { error: 'Unable to determine user permissions' },
          { status: 403 }
        );
      }

      const hasPermission = permissionService.hasMultiRolePermission(
        userContext.availableRoles,
        Resource.BUSINESS_REGISTRATION,
        Action.UPDATE,
        {
          targetUserId: businessData.owner_identity_id,
          currentUserId: currentIdentity.id
        }
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update this business registration' },
          { status: 403 }
        );
      }
    }

    // Update business registration
    const updateData = {
      business_name: body.businessName,
      registration_data: body.registrationData,
      verification_status: body.verificationStatus,
      is_active: body.isActive,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    // Only allow certain roles to change verification status
    if (body.verificationStatus && !isOwner) {
      const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
      const canVerify = userContext?.availableRoles.some(role => 
        [RoleType.FRANCHISOR].includes(role)
      );

      if (!canVerify) {
        delete updateData.verification_status;
      }
    }

    const { data: updatedBusiness, error } = await supabase
      .from('business_registrations')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Recalculate roles if verification status changed
    if (body.verificationStatus) {
      await identityService.recalculateRoles(businessData.owner_identity_id);
    }

    // Transform response
    const businessRegistration = {
      id: updatedBusiness.id,
      registrationNumber: updatedBusiness.registration_number,
      businessName: updatedBusiness.business_name,
      businessType: updatedBusiness.business_type as BusinessType,
      ownerIdentityId: updatedBusiness.owner_identity_id,
      registrationData: updatedBusiness.registration_data || {},
      verificationStatus: updatedBusiness.verification_status as VerificationStatus,
      isActive: updatedBusiness.is_active,
      createdAt: new Date(updatedBusiness.created_at),
      updatedAt: new Date(updatedBusiness.updated_at)
    };

    return NextResponse.json({ businessRegistration });

  } catch (error) {
    console.error('Error updating business registration:', error);
    
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
 * Deactivate business registration
 * DELETE /api/business-registrations/{id}
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('id');

    if (!businessId) {
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

    // Get existing business registration
    const { data: businessData, error: businessError } = await supabase
      .from('business_registrations')
      .select('*')
      .eq('id', businessId)
      .single();

    if (businessError || !businessData) {
      return NextResponse.json(
        { error: 'Business registration not found' },
        { status: 404 }
      );
    }

    // Check permissions - only owners or high-level roles can deactivate
    const isOwner = businessData.owner_identity_id === currentIdentity.id;
    let canDelete = isOwner;

    if (!isOwner) {
      const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
      canDelete = userContext?.availableRoles.some(role => 
        [RoleType.FRANCHISOR].includes(role)
      ) || false;
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to deactivate this business registration' },
        { status: 403 }
      );
    }

    // Check if there are active papers or attendance records associated
    const { data: activePapers } = await supabase
      .from('papers')
      .select('id')
      .eq('related_business_id', businessId)
      .eq('is_active', true)
      .limit(1);

    const { data: attendanceRecords } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('business_id', businessId)
      .limit(1);

    const hasActiveData = (activePapers && activePapers.length > 0) || 
                         (attendanceRecords && attendanceRecords.length > 0);

    if (hasActiveData) {
      // Soft delete - deactivate instead of hard delete
      const { error } = await supabase
        .from('business_registrations')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) {
        throw error;
      }

      // Recalculate roles after deactivation
      await identityService.recalculateRoles(businessData.owner_identity_id);

      return NextResponse.json({
        message: 'Business registration deactivated (data exists, cannot hard delete)'
      });
    } else {
      // Hard delete if no associated data
      const { error } = await supabase
        .from('business_registrations')
        .delete()
        .eq('id', businessId);

      if (error) {
        throw error;
      }

      // Recalculate roles after deletion
      await identityService.recalculateRoles(businessData.owner_identity_id);

      return NextResponse.json({
        message: 'Business registration successfully deleted'
      });
    }

  } catch (error) {
    console.error('Error deleting business registration:', error);
    
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
 * Verify business registration
 * PATCH /api/business-registrations/{id}/verify
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('id');
    const action = searchParams.get('action');
    const body = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business registration ID is required' },
        { status: 400 }
      );
    }

    if (!['verify', 'reject'].includes(action || '')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "verify" or "reject"' },
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

    // Check permissions - only specific roles can verify businesses
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unable to determine user permissions' },
        { status: 403 }
      );
    }

    const canVerify = permissionService.hasMultiRolePermission(
      userContext.availableRoles,
      Resource.BUSINESS_REGISTRATION,
      Action.VERIFY
    );

    if (!canVerify) {
      return NextResponse.json(
        { error: 'Insufficient permissions to verify business registrations' },
        { status: 403 }
      );
    }

    // Get existing business registration
    const { data: businessData, error: businessError } = await supabase
      .from('business_registrations')
      .select('*')
      .eq('id', businessId)
      .single();

    if (businessError || !businessData) {
      return NextResponse.json(
        { error: 'Business registration not found' },
        { status: 404 }
      );
    }

    // Update verification status
    const newStatus = action === 'verify' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
    const { data: updatedBusiness, error } = await supabase
      .from('business_registrations')
      .update({
        verification_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Recalculate roles after verification status change
    await identityService.recalculateRoles(businessData.owner_identity_id);

    return NextResponse.json({
      message: `Business registration successfully ${action}ed`,
      businessRegistration: {
        id: updatedBusiness.id,
        registrationNumber: updatedBusiness.registration_number,
        businessName: updatedBusiness.business_name,
        businessType: updatedBusiness.business_type as BusinessType,
        ownerIdentityId: updatedBusiness.owner_identity_id,
        registrationData: updatedBusiness.registration_data || {},
        verificationStatus: updatedBusiness.verification_status as VerificationStatus,
        isActive: updatedBusiness.is_active,
        createdAt: new Date(updatedBusiness.created_at),
        updatedAt: new Date(updatedBusiness.updated_at)
      }
    });

  } catch (error) {
    console.error('Error verifying business registration:', error);
    
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