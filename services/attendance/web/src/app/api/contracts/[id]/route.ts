/**
 * Individual Contract API Routes
 * Handles operations on specific contracts
 */

import { NextRequest, NextResponse } from 'next/server';
import { contractService } from '../../../../services/contractService';
import { withAuth } from '../../../../lib/auth/auth-middleware';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/contracts/[id] - Get specific contract details
 */
export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const contractId = params.id;

    if (!contractId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contract ID is required' 
        },
        { status: 400 }
      );
    }

    const result = await contractService.getContractById(contractId);
    
    if (result.success && result.contract) {
      // Check if user has permission to view this contract
      const contract = result.contract as any;
      const userId = request.user.id;
      const userOrganizations = request.user.organizations || [];

      // Allow if user is the employee or has admin access to the organization
      const isOwnContract = contract.employee?.user_id === userId;
      const hasOrgAccess = userOrganizations.some(
        (org: any) => org.id === contract.organization_id
      );
      const isSuperAdmin = request.user.hasRole?.('SUPER_ADMIN');

      if (!isOwnContract && !hasOrgAccess && !isSuperAdmin) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Insufficient permissions to view this contract' 
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Contract fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}, {
  requireOrganization: false,
  allowedRoles: ['EMPLOYEE', 'BUSINESS_ADMIN', 'SUPER_ADMIN']
});

/**
 * PUT /api/contracts/[id] - Update contract
 */
export const PUT = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const contractId = params.id;
    const body = await request.json();

    if (!contractId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contract ID is required' 
        },
        { status: 400 }
      );
    }

    // First, get the contract to check permissions
    const contractResult = await contractService.getContractById(contractId);
    if (!contractResult.success || !contractResult.contract) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contract not found' 
        },
        { status: 404 }
      );
    }

    const contract = contractResult.contract as any;
    const userOrganizations = request.user.organizations || [];
    const hasOrgAccess = userOrganizations.some(
      (org: any) => org.id === contract.organization_id
    );
    const isSuperAdmin = request.user.hasRole?.('SUPER_ADMIN');

    // Only admins can update contracts
    if (!hasOrgAccess && !isSuperAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions to update this contract' 
        },
        { status: 403 }
      );
    }

    const result = await contractService.updateContract(contractId, body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Contract update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}, {
  requireOrganization: true,
  allowedRoles: ['BUSINESS_ADMIN', 'SUPER_ADMIN'],
  requiredPermissions: ['manage_employees']
});

/**
 * DELETE /api/contracts/[id] - Soft delete contract (set inactive)
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const contractId = params.id;

    if (!contractId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contract ID is required' 
        },
        { status: 400 }
      );
    }

    // First, get the contract to check permissions
    const contractResult = await contractService.getContractById(contractId);
    if (!contractResult.success || !contractResult.contract) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contract not found' 
        },
        { status: 404 }
      );
    }

    const contract = contractResult.contract as any;
    const userOrganizations = request.user.organizations || [];
    const hasOrgAccess = userOrganizations.some(
      (org: any) => org.id === contract.organization_id
    );
    const isSuperAdmin = request.user.hasRole?.('SUPER_ADMIN');

    // Only admins can delete contracts
    if (!hasOrgAccess && !isSuperAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions to delete this contract' 
        },
        { status: 403 }
      );
    }

    // Soft delete by setting inactive
    const result = await contractService.updateContract(contractId, {
      is_active: false,
      status: 'TERMINATED',
      metadata: {
        ...contract.metadata,
        deleted_at: new Date().toISOString(),
        deleted_by: request.user.id
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Contract deletion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}, {
  requireOrganization: true,
  allowedRoles: ['BUSINESS_ADMIN', 'SUPER_ADMIN'],
  requiredPermissions: ['manage_employees']
});