/**
 * Papers Management API
 * 
 * Handles paper creation, retrieval, and management for the ID-ROLE-PAPER system.
 * Papers are documents that grant roles when owned by identities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { identityService } from '@/services/identityService';
import { permissionService, Resource, Action } from '@/lib/permissions/role-permissions';
import { PaperType, RoleType } from '@/src/types/id-role-paper';

/**
 * Get papers with filtering
 * GET /api/papers?identityId={id}&paperType={type}&businessId={businessId}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const identityId = searchParams.get('identityId');
    const paperType = searchParams.get('paperType') as PaperType;
    const businessId = searchParams.get('businessId');
    const isActive = searchParams.get('isActive');
    const businessContextId = request.headers.get('x-business-registration-id');

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
      .from('papers')
      .select(`
        id,
        paper_type,
        owner_identity_id,
        related_business_id,
        paper_data,
        is_active,
        valid_from,
        valid_until,
        created_at,
        updated_at,
        unified_identities:owner_identity_id (
          id,
          full_name,
          email,
          id_type
        ),
        business_registrations:related_business_id (
          id,
          business_name,
          registration_number
        )
      `);

    // If not requesting specific identity's papers, check permissions
    if (identityId) {
      const requestingOwnPapers = identityId === currentIdentity.id;
      if (!requestingOwnPapers) {
        const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
        if (!userContext) {
          return NextResponse.json(
            { error: 'Unable to determine user permissions' },
            { status: 403 }
          );
        }

        const hasPermission = permissionService.hasMultiRolePermission(
          userContext.availableRoles,
          Resource.PAPER,
          Action.READ,
          {
            businessContextId,
            targetUserId: identityId,
            currentUserId: currentIdentity.id
          }
        );

        if (!hasPermission) {
          return NextResponse.json(
            { error: 'Insufficient permissions to access papers' },
            { status: 403 }
          );
        }
      }
      query = query.eq('owner_identity_id', identityId);
    } else {
      // If no specific identity, only show user's own papers unless they have management permissions
      const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
      const hasManagementRole = userContext?.availableRoles.some(role => 
        [RoleType.OWNER, RoleType.FRANCHISOR, RoleType.SUPERVISOR, RoleType.MANAGER].includes(role)
      );

      if (!hasManagementRole) {
        query = query.eq('owner_identity_id', currentIdentity.id);
      }
    }

    // Apply filters
    if (paperType && Object.values(PaperType).includes(paperType)) {
      query = query.eq('paper_type', paperType);
    }

    if (businessId) {
      query = query.eq('related_business_id', businessId);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    // Execute query
    query = query.order('created_at', { ascending: false });
    const { data: papersData, error } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match our interface
    const papers = papersData?.map(paper => ({
      id: paper.id,
      paperType: paper.paper_type as PaperType,
      ownerIdentityId: paper.owner_identity_id,
      relatedBusinessId: paper.related_business_id,
      paperData: paper.paper_data || {},
      isActive: paper.is_active,
      validFrom: new Date(paper.valid_from),
      validUntil: paper.valid_until ? new Date(paper.valid_until) : undefined,
      createdAt: new Date(paper.created_at),
      updatedAt: new Date(paper.updated_at),
      ownerIdentity: paper.unified_identities ? {
        id: paper.unified_identities.id,
        fullName: paper.unified_identities.full_name,
        email: paper.unified_identities.email,
        idType: paper.unified_identities.id_type
      } : undefined,
      relatedBusiness: paper.business_registrations ? {
        id: paper.business_registrations.id,
        businessName: paper.business_registrations.business_name,
        registrationNumber: paper.business_registrations.registration_number
      } : undefined
    })) || [];

    return NextResponse.json({ papers });

  } catch (error) {
    console.error('Error getting papers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create new paper
 * POST /api/papers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      identityId,
      paperType,
      relatedBusinessId,
      paperData,
      validFrom,
      validUntil
    } = body;

    // Validate required fields
    if (!identityId || !paperType) {
      return NextResponse.json(
        { error: 'Identity ID and paper type are required' },
        { status: 400 }
      );
    }

    // Validate paper type
    if (!Object.values(PaperType).includes(paperType)) {
      return NextResponse.json(
        { error: 'Invalid paper type' },
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

    // Check if creating paper for self or has permission
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
        Resource.PAPER,
        Action.CREATE,
        {
          businessContextId: relatedBusinessId,
          targetUserId: identityId,
          currentUserId: currentIdentity.id
        }
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions to create paper for this identity' },
          { status: 403 }
        );
      }
    }

    // Validate business-related papers
    const businessRequiredPapers = [
      PaperType.EMPLOYMENT_CONTRACT,
      PaperType.AUTHORITY_DELEGATION,
      PaperType.SUPERVISOR_AUTHORITY_DELEGATION,
      PaperType.FRANCHISE_AGREEMENT
    ];

    if (businessRequiredPapers.includes(paperType) && !relatedBusinessId) {
      return NextResponse.json(
        { error: `${paperType} requires a related business ID` },
        { status: 400 }
      );
    }

    // Create paper using identity service
    const paper = await identityService.createPaper(identityId, {
      paperType,
      relatedBusinessId,
      paperData: paperData || {},
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined
    });

    return NextResponse.json(
      { paper },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating paper:', error);
    
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
 * Update paper
 * PUT /api/papers/{id}
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('id');
    const body = await request.json();

    if (!paperId) {
      return NextResponse.json(
        { error: 'Paper ID is required' },
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

    // Get existing paper
    const { data: paperData, error: paperError } = await supabase
      .from('papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (paperError || !paperData) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isOwner = paperData.owner_identity_id === currentIdentity.id;
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
        Resource.PAPER,
        Action.UPDATE,
        {
          businessContextId: paperData.related_business_id,
          targetUserId: paperData.owner_identity_id,
          currentUserId: currentIdentity.id
        }
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions to update this paper' },
          { status: 403 }
        );
      }
    }

    // Update paper
    const updateData = {
      paper_data: body.paperData,
      valid_until: body.validUntil ? new Date(body.validUntil).toISOString() : undefined,
      is_active: body.isActive,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const { data: updatedPaper, error } = await supabase
      .from('papers')
      .update(updateData)
      .eq('id', paperId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Recalculate roles after paper update
    await identityService.recalculateRoles(paperData.owner_identity_id);

    // Transform response
    const paper = {
      id: updatedPaper.id,
      paperType: updatedPaper.paper_type as PaperType,
      ownerIdentityId: updatedPaper.owner_identity_id,
      relatedBusinessId: updatedPaper.related_business_id,
      paperData: updatedPaper.paper_data || {},
      isActive: updatedPaper.is_active,
      validFrom: new Date(updatedPaper.valid_from),
      validUntil: updatedPaper.valid_until ? new Date(updatedPaper.valid_until) : undefined,
      createdAt: new Date(updatedPaper.created_at),
      updatedAt: new Date(updatedPaper.updated_at)
    };

    return NextResponse.json({ paper });

  } catch (error) {
    console.error('Error updating paper:', error);
    
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
 * Deactivate paper
 * DELETE /api/papers/{id}
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('id');

    if (!paperId) {
      return NextResponse.json(
        { error: 'Paper ID is required' },
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

    // Get existing paper
    const { data: paperData, error: paperError } = await supabase
      .from('papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (paperError || !paperData) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    // Check permissions - only high-level roles can delete papers
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'Unable to determine user permissions' },
        { status: 403 }
      );
    }

    const isOwner = paperData.owner_identity_id === currentIdentity.id;
    const hasManagementRole = userContext.availableRoles.some(role => 
      [RoleType.OWNER, RoleType.FRANCHISOR, RoleType.SUPERVISOR].includes(role)
    );

    if (!isOwner && !hasManagementRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this paper' },
        { status: 403 }
      );
    }

    // Deactivate paper instead of hard delete
    const { error } = await supabase
      .from('papers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', paperId);

    if (error) {
      throw error;
    }

    // Recalculate roles after paper deactivation
    await identityService.recalculateRoles(paperData.owner_identity_id);

    return NextResponse.json({
      message: 'Paper successfully deactivated'
    });

  } catch (error) {
    console.error('Error deactivating paper:', error);
    
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