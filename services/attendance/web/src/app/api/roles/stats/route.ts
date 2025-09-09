/**
 * Role Statistics API
 * 
 * Provides role statistics and insights for management dashboards.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { identityService } from '@/services/identity.service';
import { RoleType } from '@/src/types/id-role-paper';

/**
 * Get role statistics and insights
 * GET /api/roles/stats?businessContext={businessId}&timeRange={30d}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessContextId = searchParams.get('businessContext') || request.headers.get('x-business-registration-id');
    const timeRange = searchParams.get('timeRange') || '30d';

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

    // Check permissions - only management roles can see stats
    const userContext = await identityService.getIdentityWithContext(currentIdentity.id);
    const hasAccess = userContext?.availableRoles.some(role => 
      [RoleType.OWNER, RoleType.FRANCHISOR, RoleType.SUPERVISOR, RoleType.MANAGER].includes(role)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view role statistics' },
        { status: 403 }
      );
    }

    // Calculate date range
    const daysBack = parseInt(timeRange.replace('d', '')) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Build base query
    let query = supabase
      .from('computed_roles')
      .select('role, business_context_id, computed_at, is_active')
      .gte('computed_at', startDate.toISOString());

    // Filter by business context if provided
    if (businessContextId) {
      query = query.eq('business_context_id', businessContextId);
    }

    const { data: rolesData, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = {
      totalRoles: rolesData?.length || 0,
      activeRoles: rolesData?.filter(r => r.is_active).length || 0,
      roleDistribution: {} as Record<string, number>,
      businessContextDistribution: {} as Record<string, number>,
      recentlyComputed: rolesData?.filter(r => {
        const computedDate = new Date(r.computed_at);
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        return computedDate > oneDayAgo;
      }).length || 0
    };

    // Calculate role distribution
    rolesData?.forEach(role => {
      if (role.is_active) {
        stats.roleDistribution[role.role] = (stats.roleDistribution[role.role] || 0) + 1;
        
        if (role.business_context_id) {
          stats.businessContextDistribution[role.business_context_id] = 
            (stats.businessContextDistribution[role.business_context_id] || 0) + 1;
        }
      }
    });

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error getting role statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}