/**
 * Contract Activation API Route
 * POST /api/contracts/[id]/activate
 */

import { NextRequest, NextResponse } from 'next/server';
import { contractService } from '../../../../../services/contract.service';
import { withAuth } from '../../../../../lib/auth/auth-middleware';

interface RouteParams {
  params: {
    id: string;
  };
}

export const POST = withAuth(async (request: NextRequest, { params }: RouteParams) => {
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

    // Only admins can activate contracts
    if (!hasOrgAccess && !isSuperAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions to activate this contract' 
        },
        { status: 403 }
      );
    }

    // Check if contract is in pending status
    if (contract.status !== 'PENDING') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Only pending contracts can be activated' 
        },
        { status: 400 }
      );
    }

    const result = await contractService.activateContract(contractId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Contract activation error:', error);
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