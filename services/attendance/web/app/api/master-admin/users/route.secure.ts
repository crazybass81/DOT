/**
 * SECURE: Enhanced Master Admin Users API with Multi-Layer Security
 * GET /api/master-admin/users
 * 
 * 🔒 SECURITY FEATURES:
 * - Multi-layer authentication validation
 * - Role hierarchy enforcement
 * - Privilege escalation detection
 * - Session-based re-authentication
 * - Comprehensive audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { auditLogger, AuditAction, AuditResult } from '@/src/lib/audit-logger';
import { enhancedAuthMiddleware } from '@/src/lib/security/EnhancedAuthMiddleware';
import { roleHierarchyValidator } from '@/src/lib/security/RoleHierarchyValidator';
import { privilegeEscalationDetector } from '@/src/lib/security/PrivilegeEscalationDetector';
import { sessionBasedAuth } from '@/src/lib/security/SessionBasedAuth';
import { securityAuditLogger } from '@/src/lib/security/SecurityAuditLogger';

interface SecureUserListResponse {
  success: boolean;
  users?: any[];
  totalCount?: number;
  securityValidation?: {
    tokenValid: boolean;
    roleValid: boolean;
    sessionValid: boolean;
    privilegeCheck: boolean;
  };
  error?: string;
  code?: string;
}

/**
 * SECURE GET: List users with enhanced security validation
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | null = null;
  
  try {
    // 🔒 LAYER 1: Enhanced Authentication Check
    const authValidation = await enhancedAuthMiddleware.validateMasterAdminAccess(
      request,
      NextResponse
    );
    
    if (!authValidation.allowed) {
      // Log critical security event
      await securityAuditLogger.logCriticalEvent({
        type: 'MASTER_ADMIN_API_ACCESS_DENIED',
        endpoint: '/api/master-admin/users',
        reason: authValidation.reason,
        securityEvent: authValidation.securityEvent,
        timestamp: new Date(),
        severity: 'CRITICAL'
      });
      
      return NextResponse.json<SecureUserListResponse>({
        success: false,
        error: 'Access Denied',
        code: authValidation.reason || 'UNAUTHORIZED',
        securityValidation: {
          tokenValid: false,
          roleValid: false,
          sessionValid: false,
          privilegeCheck: false
        }
      }, { status: 403 });
    }
    
    // 🔒 LAYER 2: Supabase Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      await securityAuditLogger.logSecurityEvent({
        type: 'AUTHENTICATION_FAILED',
        endpoint: '/api/master-admin/users',
        timestamp: new Date(),
        severity: 'HIGH'
      });
      
      return NextResponse.json<SecureUserListResponse>({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }
    
    userId = user.id;
    
    // 🔒 LAYER 3: Database Role Verification
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('role', 'MASTER_ADMIN')
      .maybeSingle();
    
    if (roleError || !userRole) {
      // Potential privilege escalation attempt
      await privilegeEscalationDetector.detectEscalation({
        userId: user.id,
        currentRole: 'UNKNOWN',
        requestedRole: 'MASTER_ADMIN',
        endpoint: '/api/master-admin/users'
      });
      
      await securityAuditLogger.logCriticalEvent({
        type: 'ROLE_VERIFICATION_FAILED',
        userId: user.id,
        endpoint: '/api/master-admin/users',
        details: {
          error: roleError?.message,
          userEmail: user.email
        },
        timestamp: new Date(),
        severity: 'CRITICAL'
      });
      
      return NextResponse.json<SecureUserListResponse>({
        success: false,
        error: 'Insufficient privileges',
        code: 'MASTER_ADMIN_REQUIRED'
      }, { status: 403 });
    }
    
    // 🔒 LAYER 4: Role Hierarchy Validation
    const hierarchyCheck = await roleHierarchyValidator.validateRole(
      userRole.role,
      'MASTER_ADMIN'
    );
    
    if (!hierarchyCheck.valid) {
      await securityAuditLogger.logSecurityEvent({
        type: 'HIERARCHY_VALIDATION_FAILED',
        userId: user.id,
        endpoint: '/api/master-admin/users',
        details: hierarchyCheck,
        timestamp: new Date(),
        severity: 'HIGH'
      });
      
      return NextResponse.json<SecureUserListResponse>({
        success: false,
        error: 'Role hierarchy validation failed',
        code: 'HIERARCHY_VIOLATION'
      }, { status: 403 });
    }
    
    // 🔒 LAYER 5: Session Validation (if session ID provided)
    const sessionId = request.headers.get('x-session-id');
    if (sessionId) {
      const sessionValid = await sessionBasedAuth.validateSession(
        sessionId,
        user.id,
        'MASTER_ADMIN'
      );
      
      if (!sessionValid) {
        await securityAuditLogger.logSecurityEvent({
          type: 'SESSION_VALIDATION_FAILED',
          userId: user.id,
          endpoint: '/api/master-admin/users',
          sessionId,
          timestamp: new Date(),
          severity: 'HIGH'
        });
        
        return NextResponse.json<SecureUserListResponse>({
          success: false,
          error: 'Session validation failed',
          code: 'INVALID_SESSION'
        }, { status: 401 });
      }
      
      // Update session activity
      await sessionBasedAuth.touchSession(sessionId);
    }
    
    // 🔒 LAYER 6: Check for suspicious activity patterns
    const threatLevel = await privilegeEscalationDetector.getUserThreatLevel(user.id);
    if (threatLevel === 'CRITICAL' || threatLevel === 'HIGH') {
      await securityAuditLogger.logCriticalEvent({
        type: 'HIGH_THREAT_USER_BLOCKED',
        userId: user.id,
        endpoint: '/api/master-admin/users',
        threatLevel,
        timestamp: new Date()
      });
      
      return NextResponse.json<SecureUserListResponse>({
        success: false,
        error: 'Security threat detected',
        code: 'SECURITY_THREAT'
      }, { status: 403 });
    }
    
    // ✅ ALL SECURITY CHECKS PASSED - Proceed with data retrieval
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;
    
    // Build secure query
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        created_at,
        updated_at,
        status,
        user_organizations(
          organization_id,
          role,
          status,
          organizations(id, name)
        )
      `, { count: 'exact' });
    
    // Apply search filter if provided
    const search = searchParams.get('search');
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    
    // Apply role filter
    const roleFilter = searchParams.get('role');
    if (roleFilter && roleHierarchyValidator.isValidRole(roleFilter)) {
      // Only allow filtering for roles the user can manage
      const manageableRoles = roleHierarchyValidator.getManageableRoles('MASTER_ADMIN');
      if (manageableRoles.includes(roleFilter)) {
        query = query.eq('user_organizations.role', roleFilter);
      }
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    // Execute query
    const { data: users, count, error: queryError } = await query;
    
    if (queryError) {
      console.error('Secure query error:', queryError);
      await securityAuditLogger.logSecurityEvent({
        type: 'DATA_RETRIEVAL_ERROR',
        userId: user.id,
        endpoint: '/api/master-admin/users',
        error: queryError.message,
        timestamp: new Date()
      });
      
      return NextResponse.json<SecureUserListResponse>({
        success: false,
        error: 'Data retrieval failed',
        code: 'QUERY_ERROR'
      }, { status: 500 });
    }
    
    // 🔒 LAYER 7: Comprehensive Audit Logging
    const executionTime = Date.now() - startTime;
    
    await securityAuditLogger.logSecurityEvent({
      type: 'MASTER_ADMIN_DATA_ACCESS',
      userId: user.id,
      endpoint: '/api/master-admin/users',
      details: {
        action: 'LIST_USERS',
        resultCount: users?.length || 0,
        search,
        roleFilter,
        page,
        limit
      },
      executionTime,
      timestamp: new Date(),
      severity: 'LOW',
      success: true
    });
    
    // Also log to standard audit logger
    await auditLogger.log({
      user_id: user.id,
      action: AuditAction.USER_LIST_ACCESS,
      result: AuditResult.SUCCESS,
      resource_type: 'user',
      resource_id: 'list',
      details: {
        secure_access: true,
        result_count: users?.length || 0,
        execution_time_ms: executionTime
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    });
    
    // Return secure response
    return NextResponse.json<SecureUserListResponse>({
      success: true,
      users: users || [],
      totalCount: count || 0,
      securityValidation: {
        tokenValid: true,
        roleValid: true,
        sessionValid: true,
        privilegeCheck: true
      }
    }, {
      headers: {
        'X-Security-Level': 'MASTER_ADMIN',
        'X-Execution-Time': `${executionTime}ms`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
  } catch (error) {
    // Log unexpected errors
    console.error('Critical error in secure master-admin API:', error);
    
    await securityAuditLogger.logCriticalEvent({
      type: 'UNEXPECTED_ERROR',
      userId,
      endpoint: '/api/master-admin/users',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date()
    });
    
    return NextResponse.json<SecureUserListResponse>({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * SECURE POST/PUT/DELETE: Blocked for security
 */
export async function POST(request: NextRequest) {
  await securityAuditLogger.logCriticalEvent({
    type: 'UNAUTHORIZED_METHOD',
    endpoint: '/api/master-admin/users',
    method: 'POST',
    timestamp: new Date()
  });
  
  return NextResponse.json({
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}

export async function PUT(request: NextRequest) {
  await securityAuditLogger.logCriticalEvent({
    type: 'UNAUTHORIZED_METHOD',
    endpoint: '/api/master-admin/users',
    method: 'PUT',
    timestamp: new Date()
  });
  
  return NextResponse.json({
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  await securityAuditLogger.logCriticalEvent({
    type: 'UNAUTHORIZED_METHOD',
    endpoint: '/api/master-admin/users',
    method: 'DELETE',
    timestamp: new Date()
  });
  
  return NextResponse.json({
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}

// CORS support with security headers
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://yourdomain.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Id',
      'Access-Control-Max-Age': '86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  });
}