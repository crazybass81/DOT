/**
 * Paper Management API Endpoints
 * Integrated with ID-ROLE-PAPER Paper Service
 * 
 * Provides CRUD operations for all 6 paper types with business context validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  createPaperService,
  CreatePaperRequest,
  UpdatePaperRequest,
  PaperSearchRequest,
  ValidatePaperRequest
} from '../../../lib/services/paper-service';
import { createPermissionService } from '../../../lib/services/permission-service';
import { createIdentityService } from '../../../lib/services/identity-service';
import { 
  PaperType, 
  VerificationStatus 
} from '../../../types/id-role-paper';

/**
 * Get papers with filtering
 * GET /api/papers?owner={id}&business={id}&type={type}&active={boolean}&valid={boolean}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner');
    const businessId = searchParams.get('business');
    const paperType = searchParams.get('type') as PaperType;
    const isActive = searchParams.get('active');
    const validOnly = searchParams.get('valid');
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

    // Use Paper Service to search papers
    const paperService = createPaperService(supabase);
    
    // Build search request
    const searchRequest: PaperSearchRequest = {
      limit: limit ? parseInt(limit) : 10,
      offset: offset ? parseInt(offset) : 0
    };

    // Check permissions and apply filters
    if (ownerId) {
      // Check if user can access this owner's papers
      if (ownerId !== currentIdentity.id) {
        const permissionService = createPermissionService(supabase);
        const permissionResult = await permissionService.checkPermission({
          identityId: currentIdentity.id,
          resource: 'papers',
          action: 'read',
          businessContext: businessId || undefined
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
      // Default to current user's papers
      searchRequest.ownerIdentityId = currentIdentity.id;
    }

    if (businessId) {
      searchRequest.relatedBusinessId = businessId;
    }

    if (paperType && Object.values(PaperType).includes(paperType)) {
      searchRequest.paperType = paperType;
    }

    if (isActive !== null) {
      searchRequest.isActive = isActive === 'true';
    }

    if (validOnly === 'true') {
      searchRequest.validOnly = true;
    }

    // Get papers using Paper Service
    const result = await paperService.searchPapers(searchRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      papers: result.data || [],
      total: result.data?.length || 0
    });

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

    // Check if creating paper for someone else
    const ownerIdentityId = body.ownerIdentityId || currentIdentity.id;
    if (ownerIdentityId !== currentIdentity.id) {
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'papers',
        action: 'create',
        businessContext: body.relatedBusinessId
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to create papers for others'
          },
          { status: 403 }
        );
      }
    }

    // Create paper using Paper Service
    const paperService = createPaperService(supabase);
    
    const createRequest: CreatePaperRequest = {
      paperType: body.paperType,
      ownerIdentityId,
      relatedBusinessId: body.relatedBusinessId,
      paperData: body.paperData || {},
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined
    };

    const result = await paperService.createPaper(createRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { paper: result.data },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating paper:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update paper
 * PUT /api/papers?id={paperId}
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

    // Get existing paper to check ownership
    const paperService = createPaperService(supabase);
    const existingResult = await paperService.getPaperById(paperId);

    if (!existingResult.success || !existingResult.data) {
      return NextResponse.json(
        { error: existingResult.error || 'Paper not found' },
        { status: 404 }
      );
    }

    const existingPaper = existingResult.data;

    // Check if user owns paper or has permission to update
    const isOwner = existingPaper.ownerIdentityId === currentIdentity.id;
    if (!isOwner) {
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'papers',
        action: 'update',
        businessContext: existingPaper.relatedBusinessId
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to update this paper'
          },
          { status: 403 }
        );
      }
    }

    // Update paper using Paper Service
    const updateRequest: UpdatePaperRequest = {
      paperData: body.paperData,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      isActive: body.isActive
    };

    const result = await paperService.updatePaper(paperId, updateRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      paper: result.data
    });

  } catch (error) {
    console.error('Error updating paper:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Deactivate paper
 * DELETE /api/papers?id={paperId}
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

    // Get existing paper to check ownership
    const paperService = createPaperService(supabase);
    const existingResult = await paperService.getPaperById(paperId);

    if (!existingResult.success || !existingResult.data) {
      return NextResponse.json(
        { error: existingResult.error || 'Paper not found' },
        { status: 404 }
      );
    }

    const existingPaper = existingResult.data;

    // Check if user owns paper or has permission to delete
    const isOwner = existingPaper.ownerIdentityId === currentIdentity.id;
    if (!isOwner) {
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'papers',
        action: 'delete',
        businessContext: existingPaper.relatedBusinessId
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to delete this paper'
          },
          { status: 403 }
        );
      }
    }

    // Deactivate paper using Paper Service
    const result = await paperService.deactivatePaper(paperId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Paper successfully deactivated'
    });

  } catch (error) {
    console.error('Error deleting paper:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate paper or extend validity
 * PATCH /api/papers?id={paperId}&action={validate|extend}
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('id');
    const action = searchParams.get('action');
    const body = await request.json();

    if (!paperId) {
      return NextResponse.json(
        { error: 'Paper ID is required' },
        { status: 400 }
      );
    }

    if (!['validate', 'extend'].includes(action || '')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "validate" or "extend"' },
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
    const paperService = createPaperService(supabase);

    if (action === 'validate') {
      // Validate paper
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'papers',
        action: 'validate'
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to validate papers'
          },
          { status: 403 }
        );
      }

      const validateRequest: ValidatePaperRequest = {
        verificationStatus: body.verificationStatus || VerificationStatus.VERIFIED,
        verificationData: {
          validatedBy: currentIdentity.id,
          validatedAt: new Date().toISOString(),
          reason: body.reason
        }
      };

      const result = await paperService.validatePaper(paperId, validateRequest);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Paper successfully validated',
        paper: result.data
      });

    } else if (action === 'extend') {
      // Extend paper validity
      if (!body.newValidUntil) {
        return NextResponse.json(
          { error: 'New valid until date is required for extension' },
          { status: 400 }
        );
      }

      // Get existing paper to check ownership
      const existingResult = await paperService.getPaperById(paperId);
      if (!existingResult.success || !existingResult.data) {
        return NextResponse.json(
          { error: existingResult.error || 'Paper not found' },
          { status: 404 }
        );
      }

      const existingPaper = existingResult.data;
      const isOwner = existingPaper.ownerIdentityId === currentIdentity.id;

      if (!isOwner) {
        const permissionService = createPermissionService(supabase);
        const permissionResult = await permissionService.checkPermission({
          identityId: currentIdentity.id,
          resource: 'papers',
          action: 'update',
          businessContext: existingPaper.relatedBusinessId
        });

        if (!permissionResult.success || !permissionResult.data?.granted) {
          return NextResponse.json(
            { 
              error: 'Access forbidden',
              message: 'Only paper owner or authorized users can extend validity'
            },
            { status: 403 }
          );
        }
      }

      const result = await paperService.extendPaperValidity(
        paperId, 
        new Date(body.newValidUntil)
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Paper validity successfully extended',
        paper: result.data
      });
    }

  } catch (error) {
    console.error('Error processing paper action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}/**
 * Paper Management API Endpoints
 * Integrated with ID-ROLE-PAPER Paper Service
 * 
 * Provides CRUD operations for all 6 paper types with business context validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  createPaperService,
  CreatePaperRequest,
  UpdatePaperRequest,
  PaperSearchRequest,
  ValidatePaperRequest
} from '../../../lib/services/paper-service';
import { createPermissionService } from '../../../lib/services/permission-service';
import { createIdentityService } from '../../../lib/services/identity-service';
import { 
  PaperType, 
  VerificationStatus 
} from '../../../types/id-role-paper';

/**
 * Get papers with filtering
 * GET /api/papers?owner={id}&business={id}&type={type}&active={boolean}&valid={boolean}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner');
    const businessId = searchParams.get('business');
    const paperType = searchParams.get('type') as PaperType;
    const isActive = searchParams.get('active');
    const validOnly = searchParams.get('valid');
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

    // Use Paper Service to search papers
    const paperService = createPaperService(supabase);
    
    // Build search request
    const searchRequest: PaperSearchRequest = {
      limit: limit ? parseInt(limit) : 10,
      offset: offset ? parseInt(offset) : 0
    };

    // Check permissions and apply filters
    if (ownerId) {
      // Check if user can access this owner's papers
      if (ownerId !== currentIdentity.id) {
        const permissionService = createPermissionService(supabase);
        const permissionResult = await permissionService.checkPermission({
          identityId: currentIdentity.id,
          resource: 'papers',
          action: 'read',
          businessContext: businessId || undefined
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
      // Default to current user's papers
      searchRequest.ownerIdentityId = currentIdentity.id;
    }

    if (businessId) {
      searchRequest.relatedBusinessId = businessId;
    }

    if (paperType && Object.values(PaperType).includes(paperType)) {
      searchRequest.paperType = paperType;
    }

    if (isActive !== null) {
      searchRequest.isActive = isActive === 'true';
    }

    if (validOnly === 'true') {
      searchRequest.validOnly = true;
    }

    // Get papers using Paper Service
    const result = await paperService.searchPapers(searchRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      papers: result.data || [],
      total: result.data?.length || 0
    });

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

    // Check if creating paper for someone else
    const ownerIdentityId = body.ownerIdentityId || currentIdentity.id;
    if (ownerIdentityId !== currentIdentity.id) {
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'papers',
        action: 'create',
        businessContext: body.relatedBusinessId
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to create papers for others'
          },
          { status: 403 }
        );
      }
    }

    // Create paper using Paper Service
    const paperService = createPaperService(supabase);
    
    const createRequest: CreatePaperRequest = {
      paperType: body.paperType,
      ownerIdentityId,
      relatedBusinessId: body.relatedBusinessId,
      paperData: body.paperData || {},
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined
    };

    const result = await paperService.createPaper(createRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { paper: result.data },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating paper:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update paper
 * PUT /api/papers?id={paperId}
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

    // Get existing paper to check ownership
    const paperService = createPaperService(supabase);
    const existingResult = await paperService.getPaperById(paperId);

    if (!existingResult.success || !existingResult.data) {
      return NextResponse.json(
        { error: existingResult.error || 'Paper not found' },
        { status: 404 }
      );
    }

    const existingPaper = existingResult.data;

    // Check if user owns paper or has permission to update
    const isOwner = existingPaper.ownerIdentityId === currentIdentity.id;
    if (!isOwner) {
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'papers',
        action: 'update',
        businessContext: existingPaper.relatedBusinessId
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to update this paper'
          },
          { status: 403 }
        );
      }
    }

    // Update paper using Paper Service
    const updateRequest: UpdatePaperRequest = {
      paperData: body.paperData,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      isActive: body.isActive
    };

    const result = await paperService.updatePaper(paperId, updateRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      paper: result.data
    });

  } catch (error) {
    console.error('Error updating paper:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Deactivate paper
 * DELETE /api/papers?id={paperId}
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

    // Get existing paper to check ownership
    const paperService = createPaperService(supabase);
    const existingResult = await paperService.getPaperById(paperId);

    if (!existingResult.success || !existingResult.data) {
      return NextResponse.json(
        { error: existingResult.error || 'Paper not found' },
        { status: 404 }
      );
    }

    const existingPaper = existingResult.data;

    // Check if user owns paper or has permission to delete
    const isOwner = existingPaper.ownerIdentityId === currentIdentity.id;
    if (!isOwner) {
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'papers',
        action: 'delete',
        businessContext: existingPaper.relatedBusinessId
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to delete this paper'
          },
          { status: 403 }
        );
      }
    }

    // Deactivate paper using Paper Service
    const result = await paperService.deactivatePaper(paperId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Paper successfully deactivated'
    });

  } catch (error) {
    console.error('Error deleting paper:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate paper or extend validity
 * PATCH /api/papers?id={paperId}&action={validate|extend}
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('id');
    const action = searchParams.get('action');
    const body = await request.json();

    if (!paperId) {
      return NextResponse.json(
        { error: 'Paper ID is required' },
        { status: 400 }
      );
    }

    if (!['validate', 'extend'].includes(action || '')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "validate" or "extend"' },
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
    const paperService = createPaperService(supabase);

    if (action === 'validate') {
      // Validate paper
      const permissionService = createPermissionService(supabase);
      const permissionResult = await permissionService.checkPermission({
        identityId: currentIdentity.id,
        resource: 'papers',
        action: 'validate'
      });

      if (!permissionResult.success || !permissionResult.data?.granted) {
        return NextResponse.json(
          { 
            error: 'Access forbidden',
            message: permissionResult.data?.reason || 'Insufficient permissions to validate papers'
          },
          { status: 403 }
        );
      }

      const validateRequest: ValidatePaperRequest = {
        verificationStatus: body.verificationStatus || VerificationStatus.VERIFIED,
        verificationData: {
          validatedBy: currentIdentity.id,
          validatedAt: new Date().toISOString(),
          reason: body.reason
        }
      };

      const result = await paperService.validatePaper(paperId, validateRequest);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Paper successfully validated',
        paper: result.data
      });

    } else if (action === 'extend') {
      // Extend paper validity
      if (!body.newValidUntil) {
        return NextResponse.json(
          { error: 'New valid until date is required for extension' },
          { status: 400 }
        );
      }

      // Get existing paper to check ownership
      const existingResult = await paperService.getPaperById(paperId);
      if (!existingResult.success || !existingResult.data) {
        return NextResponse.json(
          { error: existingResult.error || 'Paper not found' },
          { status: 404 }
        );
      }

      const existingPaper = existingResult.data;
      const isOwner = existingPaper.ownerIdentityId === currentIdentity.id;

      if (!isOwner) {
        const permissionService = createPermissionService(supabase);
        const permissionResult = await permissionService.checkPermission({
          identityId: currentIdentity.id,
          resource: 'papers',
          action: 'update',
          businessContext: existingPaper.relatedBusinessId
        });

        if (!permissionResult.success || !permissionResult.data?.granted) {
          return NextResponse.json(
            { 
              error: 'Access forbidden',
              message: 'Only paper owner or authorized users can extend validity'
            },
            { status: 403 }
          );
        }
      }

      const result = await paperService.extendPaperValidity(
        paperId, 
        new Date(body.newValidUntil)
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Paper validity successfully extended',
        paper: result.data
      });
    }

  } catch (error) {
    console.error('Error processing paper action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}