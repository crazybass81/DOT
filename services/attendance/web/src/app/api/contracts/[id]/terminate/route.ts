/**
 * Contract Termination API Route
 * POST /api/contracts/[id]/terminate
 */

import { NextRequest, NextResponse } from 'next/server';
import { contractService } from '../../../../../services/contractService';
import { withAuth } from '../../../../../lib/auth/auth-middleware';

interface RouteParams {
  params: {
    id: string;
  };
}

export const POST = withAuth(async (request: NextRequest, { params }: RouteParams) => {
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

    // Only admins can terminate contracts
    if (!hasOrgAccess && !isSuperAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions to terminate this contract' 
        },
        { status: 403 }
      );
    }

    // Check if contract is active
    if (contract.status !== 'ACTIVE') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Only active contracts can be terminated' 
        },
        { status: 400 }
      );
    }

    // Validate termination date if provided
    let endDate = body.end_date;
    if (endDate) {
      const terminationDate = new Date(endDate);
      const startDate = new Date(contract.start_date);
      
      if (isNaN(terminationDate.getTime())) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid termination date format' 
          },
          { status: 400 }
        );
      }

      if (terminationDate < startDate) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Termination date cannot be before contract start date' 
          },
          { status: 400 }
        );
      }

      // Don't allow future termination dates beyond today
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (terminationDate > today) {
        endDate = today.toISOString().split('T')[0]; // Use today's date
      }
    } else {
      // Default to today if no date specified
      endDate = new Date().toISOString().split('T')[0];
    }

    const result = await contractService.terminateContract(contractId, endDate);
    
    if (result.success) {
      // Update contract metadata with termination information
      await contractService.updateContract(contractId, {
        metadata: {
          ...contract.metadata,
          termination_reason: body.reason || 'Administrative termination',
          terminated_by: request.user.id,
          terminated_by_email: request.user.email,
          terminated_at: new Date().toISOString()
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Contract termination error:', error);
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