/**
 * Business Registration API Endpoints
 * Integrated with ID-ROLE-PAPER Business Registration Service
 * 
 * Provides CRUD operations for business entities with ownership validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  createBusinessRegistrationService,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  BusinessSearchRequest,
  VerifyBusinessRequest
} from '../../../lib/services/business-registration-service';
import { createPermissionService } from '../../../lib/services/permission-service';
import { createIdentityService } from '../../../lib/services/identity-service';
import { 
  BusinessType, 
  VerificationStatus 
} from '../../../types/id-role-paper';

/**
 * Get business registrations with filtering
 * GET /api/business?owner={id}&status={status}&type={type}&search={pattern}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner');
    const status = searchParams.get('status') as VerificationStatus;
    const businessType = searchParams.get('type') as BusinessType;
    const isActive = searchParams.get('isActive');
    const registrationNumber = searchParams.get('registrationNumber');
    const namePattern = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

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

    // Get current user's identity using Identity Service
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

    // Use Business Registration Service to search businesses
    const businessService = createBusinessRegistrationService(supabase);
    
    // Build search request
    const searchRequest: BusinessSearchRequest = {
      limit: limit ? parseInt(limit) : 10,
      offset: offset ? parseInt(offset) : 0
    };

    // Apply filters
    if (ownerId) {
      // Check if user can access this owner's businesses
      if (ownerId !== currentIdentity.id) {
        const permissionService = createPermissionService(supabase);
        const permissionResult = await permissionService.checkPermission({
          identityId: currentIdentity.id,
          resource: 'business',
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
      searchRequest.ownerIdentityId = ownerId;
    } else {
      // Default to current user's businesses
      searchRequest.ownerIdentityId = currentIdentity.id;
    }

    if (status && Object.values(VerificationStatus).includes(status)) {
      searchRequest.verificationStatus = status;
    }

    if (businessType && Object.values(BusinessType).includes(businessType)) {
      searchRequest.businessType = businessType;
    }

    if (isActive !== null) {
      searchRequest.isActive = isActive === 'true';
    }

    if (registrationNumber) {
      searchRequest.registrationNumber = registrationNumber;
    }

    if (namePattern) {
      searchRequest.namePattern = namePattern;
    }

    // Get businesses using Business Service
    const result = await businessService.searchBusinesses(searchRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      businesses: result.data || [],
      total: result.data?.length || 0
    });

  } catch (error) {
    console.error('Error getting businesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create new business registration
 * POST /api/business
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

    // Check if creating business for someone else
    const ownerIdentityId = body.ownerIdentityId || currentIdentity.id;
    if (ownerIdentityId !== currentIdentity.id) {
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'business',
        action: 'create'
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to create business for others'
          },
          { status: 403 }
        );
      }
    }

    // Create business using Business Registration Service
    const businessService = createBusinessRegistrationService(supabase);
    
    const createRequest: CreateBusinessRequest = {
      registrationNumber: body.registrationNumber,
      businessName: body.businessName,
      businessType: body.businessType,
      ownerIdentityId,
      registrationData: body.registrationData || {}
    };

    const result = await businessService.createBusiness(createRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { business: result.data },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update business registration
 * PUT /api/business?id={businessId}
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('id');
    const body = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
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

    // Get existing business to check ownership
    const businessService = createBusinessRegistrationService(supabase);
    const existingResult = await businessService.getBusinessById(businessId);

    if (!existingResult.success || !existingResult.data) {
      return NextResponse.json(
        { error: existingResult.error || 'Business not found' },
        { status: 404 }
      );
    }

    const existingBusiness = existingResult.data;

    // Check if user owns business or has permission to update
    const isOwner = existingBusiness.ownerIdentityId === currentIdentity.id;
    if (!isOwner) {
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'business',
        action: 'update',
        businessContext: businessId
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to update this business'
          },
          { status: 403 }
        );
      }
    }

    // Update business using Business Registration Service
    const updateRequest: UpdateBusinessRequest = {
      businessName: body.businessName,
      registrationData: body.registrationData
    };

    const result = await businessService.updateBusiness(businessId, updateRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      business: result.data
    });

  } catch (error) {
    console.error('Error updating business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Deactivate business registration
 * DELETE /api/business?id={businessId}
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('id');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
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

    // Get existing business to check ownership
    const businessService = createBusinessRegistrationService(supabase);
    const existingResult = await businessService.getBusinessById(businessId);

    if (!existingResult.success || !existingResult.data) {
      return NextResponse.json(
        { error: existingResult.error || 'Business not found' },
        { status: 404 }
      );
    }

    const existingBusiness = existingResult.data;

    // Check if user owns business or has permission to delete
    const isOwner = existingBusiness.ownerIdentityId === currentIdentity.id;
    if (!isOwner) {
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'business',
        action: 'delete',
        businessContext: businessId
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to delete this business'
          },
          { status: 403 }
        );
      }
    }

    // Deactivate business using Business Registration Service
    const result = await businessService.deactivateBusiness(businessId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Business successfully deactivated'
    });

  } catch (error) {
    console.error('Error deleting business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Verify business registration or transfer ownership
 * PATCH /api/business?id={businessId}&action={verify|transfer}
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('id');
    const action = searchParams.get('action');
    const body = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    if (!['verify', 'transfer'].includes(action || '')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "verify" or "transfer"' },
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
    const businessService = createBusinessRegistrationService(supabase);

    if (action === 'verify') {
      // Verify business registration
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'business',
        action: 'manage'
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to verify businesses'
          },
          { status: 403 }
        );
      }

      const verifyRequest: VerifyBusinessRequest = {
        status: body.status || VerificationStatus.VERIFIED,
        verificationData: {
          verifiedBy: currentIdentity.id,
          verifiedAt: new Date().toISOString(),
          reason: body.reason
        }
      };

      const result = await businessService.verifyBusiness(businessId, verifyRequest);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Business successfully verified',
        business: result.data
      });

    } else if (action === 'transfer') {
      // Transfer business ownership
      if (!body.newOwnerIdentityId) {
        return NextResponse.json(
          { error: 'New owner identity ID is required for transfer' },
          { status: 400 }
        );
      }

      // Check if user owns the business
      const existingResult = await businessService.getBusinessById(businessId);
      if (!existingResult.success || !existingResult.data) {
        return NextResponse.json(
          { error: existingResult.error || 'Business not found' },
          { status: 404 }
        );
      }

      const existingBusiness = existingResult.data;
      const isOwner = existingBusiness.ownerIdentityId === currentIdentity.id;

      if (!isOwner) {
        const permissionService = createPermissionService(supabase);
        const permissionResult = await permissionService.checkPermission({
          identityId: currentIdentity.id,
          resource: 'business',
          action: 'manage'
        });

        if (!permissionResult.success || !permissionResult.data?.granted) {
          return NextResponse.json(
            { 
              error: 'Access forbidden',
              message: 'Only business owner or authorized users can transfer ownership'
            },
            { status: 403 }
          );
        }
      }

      const result = await businessService.transferOwnership(businessId, body.newOwnerIdentityId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Business ownership successfully transferred',
        business: result.data
      });
    }

  } catch (error) {
    console.error('Error processing business action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}