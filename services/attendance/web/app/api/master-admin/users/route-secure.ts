/**
 * 보안 강화된 마스터 어드민 사용자 목록 조회 API
 * SQL Injection 방지 시스템이 적용된 버전
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { auditLogger, AuditAction, AuditResult } from '@/src/lib/audit-logger';
import { sqlInjectionMiddleware } from '@/src/lib/security/sql-injection-prevention';

interface UserListResponse {
  success: true;
  users: any[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  searchQuery?: string;
  filters: Record<string, any>;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
  violations?: string[];
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    // Extract IP address for security monitoring
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // ========================================================================
    // SECURITY LAYER 1: Authentication Check
    // ========================================================================
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // Log unauthorized access attempt
      await sqlInjectionMiddleware.getLogger().logSuspiciousActivity({
        query: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        userId: null,
        ipAddress,
        timestamp: new Date()
      });

      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 });
    }

    // ========================================================================
    // SECURITY LAYER 2: SQL Injection Prevention
    // ========================================================================
    const validationResult = await sqlInjectionMiddleware.validateRequest({
      searchParams,
      userId: user.id,
      ipAddress
    });

    if (!validationResult.isValid) {
      // Log security violation
      await auditLogger.log({
        user_id: user.id,
        action: AuditAction.SECURITY_VIOLATION,
        result: AuditResult.FAILURE,
        resource_type: 'api',
        resource_id: 'user-list',
        details: {
          violations: validationResult.errors,
          ip_address: ipAddress,
          attempted_params: Object.fromEntries(searchParams.entries())
        },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '보안 검증 실패: 잘못된 입력값이 감지되었습니다.',
        violations: validationResult.errors
      }, { status: 400 });
    }

    // Use sanitized parameters
    const sanitizedParams = validationResult.sanitizedParams;

    // ========================================================================
    // SECURITY LAYER 3: Authorization Check
    // ========================================================================
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'MASTER_ADMIN')
      .maybeSingle();

    if (roleError || !userRole) {
      await auditLogger.logPermissionDenied(
        user.id,
        'USER_LIST_ACCESS',
        'user',
        'all'
      );

      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '접근 권한이 없습니다. MASTER_ADMIN 권한이 필요합니다.'
      }, { status: 403 });
    }

    // ========================================================================
    // SECURITY LAYER 4: Rate Limiting Check
    // ========================================================================
    const threatLevel = await sqlInjectionMiddleware.getLogger().assessThreatLevel(ipAddress);
    if (threatLevel === 'HIGH') {
      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '너무 많은 요청이 감지되었습니다. 잠시 후 다시 시도해주세요.'
      }, { status: 429 });
    }

    // ========================================================================
    // SECURE QUERY BUILDING
    // ========================================================================
    
    // Parse pagination with validation
    const page = Math.max(1, parseInt(sanitizedParams.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(sanitizedParams.limit || '20')));
    const offset = (page - 1) * limit;

    // Build secure query using Supabase's query builder (parameterized internally)
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        profile_image,
        created_at,
        updated_at,
        last_login,
        status,
        email_verified,
        user_organizations!inner(
          organization_id,
          role,
          status,
          joined_at,
          organizations(
            id,
            name
          )
        )
      `, { count: 'exact' });

    // Apply search filter with sanitized input
    if (sanitizedParams.search) {
      // Use Supabase's built-in parameterization
      query = query.or(
        `email.ilike.%${sanitizedParams.search}%,` +
        `full_name.ilike.%${sanitizedParams.search}%,` +
        `phone.ilike.%${sanitizedParams.search}%`
      );
    }

    // Apply status filter (whitelisted values only)
    if (sanitizedParams.status) {
      query = query.eq('status', sanitizedParams.status);
    }

    // Apply date range filters with validated dates
    if (sanitizedParams.startDate) {
      const startDate = new Date(sanitizedParams.startDate);
      query = query.gte('created_at', startDate.toISOString());
    }

    if (sanitizedParams.endDate) {
      const endDate = new Date(sanitizedParams.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }

    // Apply role filter (whitelisted values only)
    if (sanitizedParams.role) {
      query = query.eq('user_organizations.role', sanitizedParams.role);
    }

    // Apply organization filter with validated UUID
    if (sanitizedParams.organizationId) {
      query = query.eq('user_organizations.organization_id', sanitizedParams.organizationId);
    }

    // Apply sorting with whitelisted fields
    const sortField = sanitizedParams.sortBy === 'name' ? 'full_name' : 
                     ['email', 'created_at', 'updated_at', 'last_login'].includes(sanitizedParams.sortBy || '') ? 
                     sanitizedParams.sortBy : 'created_at';
    
    const sortOrder = sanitizedParams.sortOrder === 'asc' ? true : false;
    query = query.order(sortField, { ascending: sortOrder });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // ========================================================================
    // EXECUTE QUERY WITH MONITORING
    // ========================================================================
    const queryStartTime = Date.now();
    const { data: users, error: queryError, count } = await query;
    const queryDuration = Date.now() - queryStartTime;

    // Track query for anomaly detection
    await sqlInjectionMiddleware.getLogger().trackQuery({
      userId: user.id,
      query: 'SELECT users WITH filters',
      duration: queryDuration
    });

    // Check for anomalies
    const anomaly = await sqlInjectionMiddleware.getLogger().detectAnomaly({
      userId: user.id,
      query: 'SELECT users',
      duration: queryDuration
    });

    if (anomaly.isAnomalous) {
      console.warn('Anomalous query detected:', {
        userId: user.id,
        reasons: anomaly.reasons,
        riskScore: anomaly.riskScore
      });
    }

    if (queryError) {
      console.error('사용자 목록 조회 오류:', queryError);
      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '사용자 목록 조회 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    // ========================================================================
    // RESPONSE PREPARATION
    // ========================================================================
    const transformedUsers = (users || []).map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      profile_image: user.profile_image,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      status: user.status,
      email_verified: user.email_verified,
      organizations: Array.isArray(user.user_organizations)
        ? user.user_organizations.map((org: any) => ({
            id: org.organizations?.id || org.organization_id,
            name: org.organizations?.name || 'Unknown Organization',
            role: org.role,
            status: org.status,
            joined_at: org.joined_at
          }))
        : []
    }));

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // ========================================================================
    // AUDIT LOGGING
    // ========================================================================
    await auditLogger.log({
      user_id: user.id,
      action: AuditAction.USER_LIST_ACCESS,
      result: AuditResult.SUCCESS,
      resource_type: 'user',
      resource_id: 'list',
      details: {
        search_query: sanitizedParams.search,
        filters: {
          role: sanitizedParams.role,
          status: sanitizedParams.status,
          organizationId: sanitizedParams.organizationId,
          dateRange: {
            startDate: sanitizedParams.startDate,
            endDate: sanitizedParams.endDate
          }
        },
        pagination: { page, limit },
        result_count: transformedUsers.length,
        query_duration_ms: queryDuration,
        total_duration_ms: Date.now() - startTime
      },
      ip_address: ipAddress,
      user_agent: request.headers.get('user-agent') || 'unknown'
    });

    // Add security headers
    const response = NextResponse.json<UserListResponse>({
      success: true,
      users: transformedUsers,
      totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      searchQuery: sanitizedParams.search,
      filters: {
        role: sanitizedParams.role,
        status: sanitizedParams.status,
        organizationId: sanitizedParams.organizationId,
        startDate: sanitizedParams.startDate,
        endDate: sanitizedParams.endDate,
        sortBy: sortField,
        sortOrder: sortOrder ? 'asc' : 'desc'
      }
    });

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    return response;

  } catch (error) {
    console.error('사용자 목록 조회 API 오류:', error);
    
    // Log unexpected errors
    await sqlInjectionMiddleware.getLogger().logSuspiciousActivity({
      query: 'UNEXPECTED_ERROR',
      userId: null,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date()
    });

    return NextResponse.json<ErrorResponse>({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}

// OPTIONS method for CORS support with security headers
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    },
  });
}