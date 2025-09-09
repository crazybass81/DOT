/**
 * Contracts API Routes
 * Handles contract management operations for the ID-ROLE-PAPER system
 */

import { NextRequest, NextResponse } from 'next/server';
import { contractService, CreateContractData } from '../../../services/contractService';
import { withAuth } from '../../../lib/auth/auth-middleware';

/**
 * GET /api/contracts - Get user's contracts or organization contracts
 */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const userId = request.user.id;

    if (organizationId) {
      // Check if user has permission to view organization contracts
      if (!request.user.hasPermission?.('manage_employees')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Insufficient permissions to view organization contracts' 
          },
          { status: 403 }
        );
      }

      const result = await contractService.getOrganizationContracts(organizationId);
      return NextResponse.json(result);
    } else {
      // Get user's own contracts
      const result = await contractService.getUserContracts(userId);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Contracts API error:', error);
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
 * POST /api/contracts - Create new contract
 */
export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['employee_id', 'organization_id', 'contract_type', 'start_date', 'wage_type'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Check if user has permission to create contracts for this organization
    if (!request.user.hasPermission?.('manage_employees')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions to create contracts' 
        },
        { status: 403 }
      );
    }

    // Verify user can create contracts for this organization
    const userOrganizations = request.user.organizations || [];
    const hasOrgAccess = userOrganizations.some(
      (org: any) => org.id === body.organization_id
    );

    if (!hasOrgAccess && !request.user.hasRole?.('SUPER_ADMIN')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot create contract for this organization' 
        },
        { status: 403 }
      );
    }

    const contractData: CreateContractData = {
      employee_id: body.employee_id,
      organization_id: body.organization_id,
      contract_type: body.contract_type,
      start_date: body.start_date,
      end_date: body.end_date,
      wage_amount: body.wage_amount ? parseFloat(body.wage_amount) : undefined,
      wage_type: body.wage_type,
      is_minor: Boolean(body.is_minor),
      parent_consent_file: body.parent_consent_file,
      terms: body.terms || {},
      metadata: {
        created_by_user: request.user.id,
        created_by_email: request.user.email,
        ...body.metadata
      }
    };

    const result = await contractService.createContract(contractData);
    
    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Contract creation error:', error);
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