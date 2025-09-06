import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../lib/supabase-config';
import { RoleType, MultiRoleUser } from '../types/multi-role';
import { auditLogger, AuditAction, AuditResult } from '../lib/audit-logger';
import { supabaseAuthService } from '../services/supabaseAuthService';
import { organizationService } from '../services/organizationService';
import { roleManagementService } from '../services/roleManagementService';

// 권한 검증 설정 인터페이스
export interface PermissionCheck {
  requiredRoles: RoleType[];
  organizationId?: string;
  requiredAllRoles?: boolean; // true면 AND 조건, false면 OR 조건
  action?: 'read' | 'write' | 'delete' | 'admin';
  resourceOwnerId?: string; // 자원 소유자 ID
  enableCache?: boolean;
  enableAuditLog?: boolean;
}

// 감사 로그 인터페이스
export interface AuditLogEntry {
  action: string;
  userId: string;
  resource: string;
  requiredRoles: RoleType[];
  userRoles: RoleType[];
  organizationId?: string;
  result: 'GRANTED' | 'DENIED';
  timestamp: Date;
  reason?: string;
}

// RBAC 핸들러 옵션
export interface RBACHandlerOptions {
  auditLogger?: (entry: AuditLogEntry) => void | Promise<void>;
  cacheManager?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl?: number) => Promise<void>;
  };
}

// 권한 캐시 (메모리 기반, 실제 환경에서는 Redis 사용 권장)
const permissionCache = new Map<string, { data: any; expires: number }>();

/**
 * JWT 토큰에서 사용자 정보 추출
 */
async function extractUserFromToken(authHeader: string): Promise<{ user: any; error: any }> {
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return { user: null, error: error || new Error('Invalid token') };
    }
    
    return { user: data.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

/**
 * 사용자의 역할 정보 조회
 */
async function getUserRoles(userId: string, useCache = false): Promise<MultiRoleUser | null> {
  const cacheKey = `user-roles-${userId}`;
  
  // 캐시 확인
  if (useCache) {
    const cached = permissionCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
  }

  try {
    // 사용자와 역할 정보를 JOIN으로 한번에 조회
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        email,
        name,
        is_master_admin,
        user_roles (
          id,
          employee_id,
          organization_id,
          role_type,
          is_active,
          granted_at
        )
      `)
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new Error('User not found');
    }

    const user: MultiRoleUser = {
      id: data.id,
      email: data.email,
      name: data.name,
      isMasterAdmin: data.is_master_admin,
      roles: (data.user_roles || []).map((role: any) => ({
        id: role.id,
        employeeId: role.employee_id,
        organizationId: role.organization_id,
        roleType: role.role_type as RoleType,
        isActive: role.is_active,
        grantedAt: new Date(role.granted_at)
      }))
    };

    // 캐시에 저장 (5분 TTL)
    if (useCache) {
      permissionCache.set(cacheKey, {
        data: user,
        expires: Date.now() + 5 * 60 * 1000
      });
    }

    return user;
  } catch (error) {
    console.error('Error fetching user roles:', error);
    throw error;
  }
}

/**
 * 권한 검증 로직
 */
function checkPermissions(user: MultiRoleUser, permissionCheck: PermissionCheck): {
  granted: boolean;
  reason?: string;
  userRoles: RoleType[];
} {
  const {
    requiredRoles,
    organizationId,
    requiredAllRoles = false,
    action = 'read',
    resourceOwnerId
  } = permissionCheck;

  // 마스터 어드민은 모든 권한을 가짐
  if (user.isMasterAdmin) {
    return {
      granted: true,
      reason: 'Master admin access',
      userRoles: ['MASTER_ADMIN'] as RoleType[]
    };
  }

  // 자원 소유자 특별 권한
  if (resourceOwnerId && user.id === resourceOwnerId) {
    return {
      granted: true,
      reason: 'Resource owner access',
      userRoles: ['RESOURCE_OWNER'] as RoleType[]
    };
  }

  // 활성 역할만 필터링
  const activeRoles = user.roles.filter(role => role.isActive);
  
  // 조직별 필터링 (지정된 경우)
  const relevantRoles = organizationId 
    ? activeRoles.filter(role => role.organizationId === organizationId)
    : activeRoles;

  const userRoleTypes = [...new Set(relevantRoles.map(role => role.roleType))];

  // 역할이 없는 경우
  if (userRoleTypes.length === 0) {
    return {
      granted: false,
      reason: `No active roles${organizationId ? ` in organization ${organizationId}` : ''}`,
      userRoles: []
    };
  }

  // 권한 검증
  let hasPermission = false;

  if (requiredAllRoles) {
    // AND 조건: 모든 역할이 필요
    hasPermission = requiredRoles.every(role => userRoleTypes.includes(role));
  } else {
    // OR 조건: 하나의 역할이라도 있으면 됨
    hasPermission = requiredRoles.some(role => userRoleTypes.includes(role));
  }

  // 액션별 추가 검증
  if (hasPermission && action === 'write') {
    // 쓰기 권한은 WORKER는 제외
    const writeAllowedRoles = userRoleTypes.filter(role => role !== RoleType.WORKER);
    hasPermission = requiredRoles.some(role => writeAllowedRoles.includes(role));
  }

  return {
    granted: hasPermission,
    reason: hasPermission ? 'Permission granted' : 'Insufficient permissions',
    userRoles: userRoleTypes
  };
}

/**
 * 감사 로그 기록
 */
async function logAuditEntry(
  entry: AuditLogEntry, 
  auditLogger?: (entry: AuditLogEntry) => void | Promise<void>
) {
  try {
    if (auditLogger) {
      await auditLogger(entry);
    } else {
      // 기본 감사 로그는 데이터베이스에 저장
      console.log('AUDIT_LOG:', JSON.stringify(entry));
    }
  } catch (error) {
    console.error('Error logging audit entry:', error);
  }
}

/**
 * 기본 RBAC 미들웨어
 */
export async function rbacMiddleware(
  request: NextRequest,
  next?: Function
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' },
        { status: 401 }
      );
    }

    const { user, error } = await extractUserFromToken(authHeader);
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid token', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    // 사용자 역할 정보 조회
    const userWithRoles = await getUserRoles(user.id);
    
    if (!userWithRoles) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 요청 헤더에 사용자 정보 추가
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userWithRoles.id);
    requestHeaders.set('x-user-roles', JSON.stringify(userWithRoles.roles));
    requestHeaders.set('x-user-is-master-admin', String(userWithRoles.isMasterAdmin || false));

    if (next) {
      return next({
        request: {
          headers: requestHeaders
        }
      });
    }

    return NextResponse.json({ success: true, user: userWithRoles });

  } catch (error) {
    console.error('RBAC Middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * 특정 권한이 필요한 API 핸들러 생성
 */
export function createRBACHandler(
  permissionCheck: PermissionCheck,
  options: RBACHandlerOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 기본 인증 검증
      const authResult = await rbacMiddleware(request);
      
      if (authResult.status !== 200) {
        return authResult;
      }

      const authResultData = await authResult.json();
      const user = authResultData.user;

      // 권한 검증
      const permissionResult = checkPermissions(user, permissionCheck);
      
      // 감사 로그 기록
      if (permissionCheck.enableAuditLog) {
        const auditEntry: AuditLogEntry = {
          action: 'PERMISSION_CHECK',
          userId: user.id,
          resource: request.url,
          requiredRoles: permissionCheck.requiredRoles,
          userRoles: permissionResult.userRoles,
          organizationId: permissionCheck.organizationId,
          result: permissionResult.granted ? 'GRANTED' : 'DENIED',
          timestamp: new Date(),
          reason: permissionResult.reason
        };

        await logAuditEntry(auditEntry, options.auditLogger);
      }

      if (!permissionResult.granted) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: permissionCheck.requiredRoles,
            actual: permissionResult.userRoles,
            reason: permissionResult.reason
          },
          { status: 403 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        user,
        permissions: {
          granted: true,
          roles: permissionResult.userRoles
        }
      });

    } catch (error) {
      console.error('RBAC Handler error:', error);
      
      if (error instanceof Error && error.message === 'User not found') {
        return NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }
  };
}

/**
 * 권한 캐시 초기화
 */
export function clearPermissionCache(userId?: string) {
  if (userId) {
    permissionCache.delete(`user-roles-${userId}`);
  } else {
    permissionCache.clear();
  }
}

/**
 * Next.js API Route용 권한 데코레이터
 */
export function withRBAC(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>,
  permissionCheck: PermissionCheck
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 인증 정보 추출
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const { user, error } = await extractUserFromToken(authHeader);
      
      if (error || !user) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      // 사용자 역할 정보 조회
      const userWithRoles = await getUserRoles(user.id);
      
      if (!userWithRoles) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // 권한 검증
      const permissionResult = checkPermissions(userWithRoles, permissionCheck);
      
      // 감사 로깅 (권한 검증 후)
      if (permissionCheck.enableAuditLog) {
        const actionType = request.method === 'GET' ? 'READ' : 
                           request.method === 'POST' ? 'CREATE' :
                           request.method === 'PUT' ? 'UPDATE' :
                           request.method === 'DELETE' ? 'DELETE' : 'UNKNOWN';

        // 감사 로그 비동기 실행 (응답 속도에 영향 없도록)
        setImmediate(async () => {
          try {
            await auditLogger.log({
              user_id: userWithRoles.id,
              organization_id: permissionCheck.organizationId,
              action: `API_${actionType}` as AuditAction,
              result: permissionResult.granted ? AuditResult.SUCCESS : AuditResult.FAILURE,
              resource_type: 'api_endpoint',
              resource_id: request.url,
              details: {
                endpoint: request.url,
                method: request.method,
                required_roles: permissionCheck.requiredRoles,
                user_roles: permissionResult.userRoles,
                permission_granted: permissionResult.granted,
                reason: permissionResult.reason
              },
              ip_address: request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip') || 
                          'unknown',
              user_agent: request.headers.get('user-agent') || 'unknown'
            });
          } catch (logError) {
            console.error('Audit logging failed:', logError);
          }
        });
      }

      // 권한이 없으면 거부
      if (!permissionResult.granted) {
        // 권한 거부 로깅
        if (permissionCheck.enableAuditLog) {
          setImmediate(async () => {
            try {
              await auditLogger.logPermissionDenied(
                userWithRoles.id,
                `${request.method} ${request.url}`,
                'api_endpoint',
                request.url,
                permissionCheck.organizationId
              );
            } catch (logError) {
              console.error('Permission denied logging failed:', logError);
            }
          });
        }

        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            details: permissionResult.reason
          },
          { status: 403 }
        );
      }

      // 핸들러 실행
      return handler(request, userWithRoles);

    } catch (error) {
      console.error('RBAC middleware error:', error);
      
      // 시스템 오류 로깅
      if (permissionCheck.enableAuditLog) {
        setImmediate(async () => {
          try {
            await auditLogger.log({
              user_id: 'system',
              action: 'SYSTEM_ERROR' as AuditAction,
              result: AuditResult.FAILURE,
              resource_type: 'api_endpoint',
              resource_id: request.url,
              details: {
                error_message: error instanceof Error ? error.message : 'Unknown error',
                endpoint: request.url,
                method: request.method
              }
            });
          } catch (logError) {
            console.error('System error logging failed:', logError);
          }
        });
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// 권한 레벨 상수
export const PERMISSION_LEVELS = {
  READ: [RoleType.WORKER, RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE],
  WRITE: [RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE],
  ADMIN: [RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE],
  SUPER_ADMIN: [RoleType.FRANCHISE]
} as const;