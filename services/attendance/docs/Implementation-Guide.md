# DOT Attendance Service: 구현 가이드

## 개요

이 가이드는 DOT 출석 서비스의 ID-Role-Paper 분기 아키텍처를 구현하는 개발자를 위한 단계별 가이드입니다.

## 목차
1. [개발 환경 설정](#개발-환경-설정)
2. [기본 구현](#기본-구현)
3. [고급 기능 구현](#고급-기능-구현)
4. [테스트 전략](#테스트-전략)
5. [배포 및 운영](#배포-및-운영)
6. [문제 해결](#문제-해결)

## 개발 환경 설정

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론
git clone https://github.com/your-org/DOT.git
cd DOT/services/attendance/web

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.template .env
```

### 2. 환경 변수 구성

```bash
# .env 파일
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 선택적: AWS 설정 (하이브리드 모드)
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# 보안 설정
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 3. 데이터베이스 설정

```sql
-- Supabase SQL Editor에서 실행
-- 통합 신원 테이블 생성
CREATE TABLE unified_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    birth_date DATE,
    id_type VARCHAR(20) DEFAULT 'personal',
    id_number VARCHAR(100),
    business_verification_status VARCHAR(20) DEFAULT 'pending',
    business_verification_data JSONB DEFAULT '{}',
    auth_user_id UUID REFERENCES auth.users(id),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 역할 테이블 생성
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES unified_identities(id),
    organization_id UUID NOT NULL,
    role_type VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    granted_by UUID REFERENCES unified_identities(id),
    UNIQUE(employee_id, organization_id, role_type)
);

-- 계약 테이블 생성
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES unified_identities(id),
    organization_id UUID NOT NULL,
    contract_type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'PENDING',
    wage_amount DECIMAL(10,2),
    wage_type VARCHAR(20),
    is_minor BOOLEAN DEFAULT false,
    parent_consent_file VARCHAR(255),
    terms JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 4. 개발 서버 시작

```bash
# 개발 서버 시작
npm run dev

# 특정 포트에서 실행
npm run dev -- --port 3002

# 테스트 실행
npm run test

# 타입 검사
npm run type-check
```

## 기본 구현

### 1. 통합 신원 서비스 구현

```typescript
// src/services/unifiedIdentityService.ts
import { createClient } from '@supabase/supabase-js';
import { UnifiedIdentity, IdType } from '../types/unified.types';

export class UnifiedIdentityService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async createIdentity(data: CreateUnifiedIdentityRequest): Promise<UnifiedIdentityResponse> {
    try {
      // 1. 데이터 검증
      if (!data.email || !data.full_name) {
        return { success: false, error: 'Email and full name are required' };
      }

      // 2. 신원 데이터 준비
      const identityData = {
        email: data.email.toLowerCase().trim(),
        full_name: data.full_name.trim(),
        phone: data.phone?.trim() || null,
        birth_date: data.birth_date || null,
        id_type: data.id_type || 'personal',
        id_number: data.id_number?.trim() || null,
        business_verification_status: 'pending',
        business_verification_data: data.business_verification_data || {},
        auth_user_id: data.auth_user_id || null,
        is_verified: false,
        is_active: true,
        profile_data: data.profile_data || {}
      };

      // 3. 데이터베이스 삽입
      const { data: identity, error } = await this.supabase
        .from('unified_identities')
        .insert(identityData)
        .select()
        .single();

      if (error) {
        console.error('Identity creation error:', error);
        
        if (error.code === '23505') {
          return { success: false, error: 'Email already exists' };
        }
        
        return { success: false, error: `Database error: ${error.message}` };
      }

      return { success: true, identity: identity as UnifiedIdentity };

    } catch (error: any) {
      console.error('Create identity exception:', error.message);
      return { success: false, error: `System error: ${error.message}` };
    }
  }

  // 기타 메서드들...
}

export const unifiedIdentityService = new UnifiedIdentityService();
```

### 2. 역할 기반 접근 제어 (RBAC) 구현

```typescript
// src/middleware/rbac-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { RoleType, MultiRoleUser } from '../types/multi-role';

interface PermissionCheck {
  requiredRoles: RoleType[];
  organizationId?: string;
  action?: 'read' | 'write' | 'delete' | 'admin';
  enableAuditLog?: boolean;
}

export function withRBAC(
  handler: (request: NextRequest, user: MultiRoleUser) => Promise<NextResponse>,
  permissionCheck: PermissionCheck
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. 토큰 검증
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // 2. 사용자 정보 추출
      const { user, error } = await extractUserFromToken(authHeader);
      if (error || !user) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      // 3. 사용자 역할 정보 조회
      const userWithRoles = await getUserRoles(user.id);
      if (!userWithRoles) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // 4. 권한 검증
      const permissionResult = checkPermissions(userWithRoles, permissionCheck);
      
      // 5. 감사 로깅
      if (permissionCheck.enableAuditLog) {
        await logPermissionCheck(userWithRoles, permissionCheck, permissionResult);
      }

      if (!permissionResult.granted) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            details: permissionResult.reason
          },
          { status: 403 }
        );
      }

      // 6. 핸들러 실행
      return handler(request, userWithRoles);

    } catch (error) {
      console.error('RBAC middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// 권한 검증 함수
function checkPermissions(user: MultiRoleUser, permissionCheck: PermissionCheck) {
  // 마스터 어드민 특별 권한
  if (user.isMasterAdmin) {
    return { granted: true, reason: 'Master admin access' };
  }

  // 활성 역할 필터링
  const activeRoles = user.roles.filter(role => role.isActive);
  const relevantRoles = permissionCheck.organizationId 
    ? activeRoles.filter(role => role.organizationId === permissionCheck.organizationId)
    : activeRoles;

  const userRoleTypes = [...new Set(relevantRoles.map(role => role.roleType))];

  // 권한 확인
  const hasPermission = permissionCheck.requiredRoles.some(role => 
    userRoleTypes.includes(role)
  );

  return {
    granted: hasPermission,
    reason: hasPermission ? 'Permission granted' : 'Insufficient permissions',
    userRoles: userRoleTypes
  };
}
```

### 3. API Route 구현 예시

```typescript
// app/api/user-roles/route.ts
import { NextRequest } from 'next/server';
import { withRBAC } from '../../../src/middleware/rbac-middleware';
import { RoleType } from '../../../src/types/multi-role';

export const GET = withRBAC(
  async (request: NextRequest, user: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organization_id');
      
      // 사용자의 역할 조회 로직
      const roles = await getUserRoles(user.id, organizationId);
      
      return NextResponse.json({
        success: true,
        roles
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
        { status: 500 }
      );
    }
  },
  {
    requiredRoles: [RoleType.WORKER, RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE],
    action: 'read',
    enableAuditLog: true
  }
);

export const POST = withRBAC(
  async (request: NextRequest, user: any) => {
    try {
      const body = await request.json();
      
      // 역할 생성 로직
      const newRole = await createUserRole(body, user.id);
      
      return NextResponse.json({
        success: true,
        role: newRole
      }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to create role' },
        { status: 500 }
      );
    }
  },
  {
    requiredRoles: [RoleType.MANAGER, RoleType.FRANCHISE],
    action: 'write',
    enableAuditLog: true
  }
);
```

### 4. React 컴포넌트 구현

```typescript
// src/components/routing/DashboardRouter.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { smartRouter } from '../../utils/smart-routing';
import { MultiRoleUser } from '../../types/multi-role';

interface DashboardRouterProps {
  user: MultiRoleUser;
  organizationId?: string;
  children?: React.ReactNode;
}

const DashboardRouter: React.FC<DashboardRouterProps> = ({
  user,
  organizationId,
  children
}) => {
  const router = useRouter();
  const [isRouting, setIsRouting] = useState(true);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  useEffect(() => {
    const performRouting = async () => {
      try {
        setIsRouting(true);

        // 스마트 라우팅 실행
        const routingResult = smartRouter(user, organizationId);
        const { defaultPath, hasMultipleRoles } = routingResult;

        // 멀티 역할 사용자 처리
        if (hasMultipleRoles && !localStorage.getItem('auto-redirect')) {
          setShowRoleSelector(true);
          return;
        }

        // 자동 라우팅
        router.replace(defaultPath);
        setIsRouting(false);

      } catch (error) {
        console.error('Routing error:', error);
        router.replace('/dashboard');
        setIsRouting(false);
      }
    };

    if (user) {
      performRouting();
    }
  }, [user, organizationId, router]);

  // 로딩 상태
  if (isRouting) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // 역할 선택 화면
  if (showRoleSelector) {
    return <RoleSelector user={user} onSelect={handleRoleSelection} />;
  }

  return <>{children}</>;
};

export default DashboardRouter;
```

## 고급 기능 구현

### 1. 캐싱 전략 구현

```typescript
// src/lib/cache/permission-cache.ts
interface CacheEntry<T> {
  data: T;
  expires: number;
}

export class PermissionCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5분

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl || this.defaultTTL)
    });

    return data;
  }

  invalidate(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

export const permissionCache = new PermissionCache();
```

### 2. 실시간 권한 업데이트

```typescript
// src/hooks/useRealtimePermissions.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase-config';
import { MultiRoleUser } from '../types/multi-role';

export function useRealtimePermissions(userId: string) {
  const [user, setUser] = useState<MultiRoleUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 사용자 데이터 로드
    loadUserWithRoles();

    // 실시간 구독 설정
    const roleSubscription = supabase
      .channel('user_roles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `employee_id=eq.${userId}`
        },
        () => {
          // 역할 변경 시 사용자 데이터 재로드
          loadUserWithRoles();
        }
      )
      .subscribe();

    return () => {
      roleSubscription.unsubscribe();
    };
  }, [userId]);

  const loadUserWithRoles = async () => {
    try {
      setLoading(true);
      const userData = await getUserWithRoles(userId);
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user with roles:', error);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, refresh: loadUserWithRoles };
}
```

### 3. 감사 로깅 시스템

```typescript
// src/lib/audit-logger.ts
export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ROLE_GRANTED = 'ROLE_GRANTED',
  ROLE_REVOKED = 'ROLE_REVOKED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION'
}

export enum AuditResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL'
}

interface AuditLogEntry {
  user_id: string;
  organization_id?: string;
  action: AuditAction;
  result: AuditResult;
  resource_type: string;
  resource_id: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp?: Date;
}

class AuditLogger {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const logEntry = {
        ...entry,
        timestamp: entry.timestamp || new Date(),
        created_at: new Date()
      };

      const { error } = await this.supabase
        .from('audit_logs')
        .insert(logEntry);

      if (error) {
        console.error('Audit log error:', error);
      }

      // 중요한 이벤트는 별도 알림
      if (this.isHighPriorityEvent(entry.action)) {
        await this.sendAlert(logEntry);
      }

    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  async logPermissionDenied(
    userId: string,
    resource: string,
    resourceType: string,
    resourceId: string,
    organizationId?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      organization_id: organizationId,
      action: AuditAction.PERMISSION_DENIED,
      result: AuditResult.FAILURE,
      resource_type: resourceType,
      resource_id: resourceId,
      details: {
        denied_resource: resource,
        timestamp: new Date().toISOString()
      }
    });
  }

  private isHighPriorityEvent(action: AuditAction): boolean {
    return [
      AuditAction.PERMISSION_DENIED,
      AuditAction.ROLE_GRANTED,
      AuditAction.ROLE_REVOKED
    ].includes(action);
  }

  private async sendAlert(entry: AuditLogEntry): Promise<void> {
    // 실제 구현에서는 이메일, Slack, SMS 등으로 알림 전송
    console.warn('High priority audit event:', entry);
  }
}

export const auditLogger = new AuditLogger();
```

### 4. 동적 역할 관리

```typescript
// src/lib/dynamic-role-manager.ts
interface RoleDefinition {
  type: string;
  level: number;
  permissions: string[];
  dashboardPath: string;
  label: string;
  parentRoles?: string[];
  restrictions?: Record<string, any>;
}

export class DynamicRoleManager {
  private roles = new Map<string, RoleDefinition>();
  private permissions = new Map<string, Set<string>>();

  registerRole(definition: RoleDefinition): void {
    this.roles.set(definition.type, definition);
    
    // 권한 매핑 업데이트
    this.permissions.set(
      definition.type, 
      new Set(definition.permissions)
    );
    
    // 부모 역할의 권한 상속
    if (definition.parentRoles) {
      definition.parentRoles.forEach(parentRole => {
        const parentPermissions = this.permissions.get(parentRole);
        if (parentPermissions) {
          parentPermissions.forEach(permission => {
            this.permissions.get(definition.type)?.add(permission);
          });
        }
      });
    }
  }

  hasPermission(roleType: string, permission: string): boolean {
    const rolePermissions = this.permissions.get(roleType);
    return rolePermissions?.has(permission) || false;
  }

  getRoleHierarchy(): Record<string, number> {
    const hierarchy: Record<string, number> = {};
    this.roles.forEach((definition, type) => {
      hierarchy[type] = definition.level;
    });
    return hierarchy;
  }

  getDashboardPath(roleType: string): string {
    return this.roles.get(roleType)?.dashboardPath || '/dashboard';
  }

  validateRoleTransition(
    fromRole: string, 
    toRole: string, 
    context: any
  ): { valid: boolean; reason?: string } {
    const fromDef = this.roles.get(fromRole);
    const toDef = this.roles.get(toRole);

    if (!fromDef || !toDef) {
      return { valid: false, reason: 'Invalid role type' };
    }

    // 레벨 차이 확인
    const levelDiff = toDef.level - fromDef.level;
    if (Math.abs(levelDiff) > 1) {
      return { valid: false, reason: 'Role level jump too large' };
    }

    // 제약 조건 확인
    if (toDef.restrictions) {
      for (const [key, value] of Object.entries(toDef.restrictions)) {
        if (context[key] !== value) {
          return { valid: false, reason: `Restriction not met: ${key}` };
        }
      }
    }

    return { valid: true };
  }
}

// 기본 역할 정의
export const defaultRoles: RoleDefinition[] = [
  {
    type: 'WORKER',
    level: 1,
    permissions: ['view_own_attendance', 'checkin', 'checkout'],
    dashboardPath: '/dashboard/worker',
    label: '근로자'
  },
  {
    type: 'ADMIN',
    level: 2,
    permissions: ['view_team_attendance', 'approve_attendance', 'manage_team'],
    dashboardPath: '/dashboard/admin',
    label: '관리자',
    parentRoles: ['WORKER']
  },
  {
    type: 'MANAGER',
    level: 3,
    permissions: ['view_org_attendance', 'manage_employees', 'financial_reports'],
    dashboardPath: '/dashboard/manager',
    label: '매니저',
    parentRoles: ['ADMIN']
  },
  {
    type: 'FRANCHISE',
    level: 4,
    permissions: ['view_all_data', 'system_administration', 'multi_org_management'],
    dashboardPath: '/dashboard/franchise',
    label: '가맹본부',
    parentRoles: ['MANAGER']
  }
];

export const roleManager = new DynamicRoleManager();

// 기본 역할 등록
defaultRoles.forEach(role => {
  roleManager.registerRole(role);
});
```

## 테스트 전략

### 1. 단위 테스트

```typescript
// __tests__/services/unifiedIdentityService.test.ts
import { unifiedIdentityService } from '../../src/services/unifiedIdentityService';

describe('UnifiedIdentityService', () => {
  beforeEach(() => {
    // 테스트 데이터베이스 초기화
    jest.clearAllMocks();
  });

  describe('createIdentity', () => {
    it('should create a personal identity successfully', async () => {
      const identityData = {
        email: 'test@example.com',
        full_name: '테스트 사용자',
        id_type: 'personal' as const
      };

      const result = await unifiedIdentityService.createIdentity(identityData);

      expect(result.success).toBe(true);
      expect(result.identity).toBeDefined();
      expect(result.identity?.email).toBe(identityData.email);
      expect(result.identity?.id_type).toBe('personal');
    });

    it('should reject duplicate email', async () => {
      const identityData = {
        email: 'duplicate@example.com',
        full_name: '중복 사용자',
        id_type: 'personal' as const
      };

      // 첫 번째 생성
      await unifiedIdentityService.createIdentity(identityData);

      // 두 번째 생성 시도
      const result = await unifiedIdentityService.createIdentity(identityData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });

    it('should validate required fields', async () => {
      const result = await unifiedIdentityService.createIdentity({
        email: '',
        full_name: '',
        id_type: 'personal'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and full name are required');
    });
  });
});
```

### 2. 통합 테스트

```typescript
// __tests__/integration/rbac-flow.test.ts
import { NextRequest } from 'next/server';
import { withRBAC } from '../../src/middleware/rbac-middleware';
import { RoleType } from '../../src/types/multi-role';

describe('RBAC Integration', () => {
  let mockRequest: NextRequest;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    mockHandler = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }))
    );
    
    mockRequest = new NextRequest('http://localhost:3002/api/test', {
      headers: {
        'Authorization': 'Bearer valid-token',
        'Content-Type': 'application/json'
      }
    });
  });

  it('should allow access for authorized user', async () => {
    const protectedHandler = withRBAC(mockHandler, {
      requiredRoles: [RoleType.WORKER],
      enableAuditLog: false
    });

    const response = await protectedHandler(mockRequest);
    
    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });

  it('should deny access for unauthorized user', async () => {
    const protectedHandler = withRBAC(mockHandler, {
      requiredRoles: [RoleType.FRANCHISE],
      enableAuditLog: false
    });

    const response = await protectedHandler(mockRequest);
    
    expect(response.status).toBe(403);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should log audit events when enabled', async () => {
    const protectedHandler = withRBAC(mockHandler, {
      requiredRoles: [RoleType.WORKER],
      enableAuditLog: true
    });

    await protectedHandler(mockRequest);
    
    // 감사 로그가 기록되었는지 확인
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'API_ACCESS',
        result: 'SUCCESS'
      })
    );
  });
});
```

### 3. E2E 테스트

```typescript
// __tests__/e2e/dashboard-routing.test.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard Routing', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
  });

  test('should route worker to worker dashboard', async ({ page }) => {
    // Worker 역할 사용자로 로그인
    await page.goto('/dashboard');
    
    // Worker 대시보드로 리다이렉트 확인
    await expect(page).toHaveURL('/dashboard/worker');
    await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('근로자 대시보드');
  });

  test('should show role selector for multi-role user', async ({ page }) => {
    // Multi-role 사용자로 로그인
    await page.goto('/dashboard');
    
    // 역할 선택 모달 표시 확인
    await expect(page.locator('[data-testid="role-selector"]')).toBeVisible();
    
    // 관리자 대시보드 선택
    await page.click('[data-testid="select-admin-dashboard"]');
    
    // 관리자 대시보드로 이동 확인
    await expect(page).toHaveURL('/dashboard/admin');
  });

  test('should remember last accessed dashboard', async ({ page }) => {
    // 매니저 대시보드 접근
    await page.goto('/dashboard/manager');
    await expect(page).toHaveURL('/dashboard/manager');
    
    // 로그아웃 후 재로그인
    await page.click('[data-testid="logout-button"]');
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 마지막 접근한 대시보드로 리다이렉트 확인
    await expect(page).toHaveURL('/dashboard/manager');
  });
});
```

### 4. 성능 테스트

```typescript
// __tests__/performance/permission-check.test.ts
describe('Permission Check Performance', () => {
  test('should handle high volume of permission checks', async () => {
    const user = createMockMultiRoleUser();
    const permissionCheck = {
      requiredRoles: [RoleType.WORKER],
      organizationId: 'test-org'
    };

    const startTime = Date.now();
    
    // 1000번의 권한 검증 실행
    const promises = Array.from({ length: 1000 }, () =>
      checkPermissions(user, permissionCheck)
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    const avgTime = (endTime - startTime) / 1000;
    
    // 평균 1ms 이내 응답 시간 확인
    expect(avgTime).toBeLessThan(1);
    
    // 모든 권한 검증 성공 확인
    results.forEach(result => {
      expect(result.granted).toBe(true);
    });
  });

  test('should cache permission results effectively', async () => {
    const cacheKey = 'user-123-permissions';
    const fetcher = jest.fn().mockResolvedValue({ granted: true });
    
    // 첫 번째 호출
    await permissionCache.getOrSet(cacheKey, fetcher);
    
    // 두 번째 호출 (캐시된 결과 사용)
    await permissionCache.getOrSet(cacheKey, fetcher);
    
    // fetcher가 한 번만 호출되었는지 확인
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
```

## 배포 및 운영

### 1. Docker 컨테이너 구성

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3002
ENV PORT 3002

CMD ["node", "server.js"]
```

### 2. Docker Compose 설정

```yaml
# docker-compose.yml
version: '3.8'

services:
  attendance-web:
    build: .
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - redis
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - attendance-web
    restart: unless-stopped
    networks:
      - app-network

volumes:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 3. CI/CD 파이프라인

```yaml
# .github/workflows/deploy.yml
name: Deploy Attendance Service

on:
  push:
    branches: [main]
    paths:
      - 'services/attendance/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: services/attendance/web/package-lock.json
      
      - name: Install dependencies
        working-directory: services/attendance/web
        run: npm ci
      
      - name: Run type check
        working-directory: services/attendance/web
        run: npm run type-check
      
      - name: Run tests
        working-directory: services/attendance/web
        run: npm run test:ci
        env:
          NODE_ENV: test
      
      - name: Run security audit
        working-directory: services/attendance/web
        run: npm audit --production

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: services/attendance/web
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/attendance:latest
            ghcr.io/${{ github.repository }}/attendance:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to Production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/dot-attendance
            docker-compose pull
            docker-compose up -d --remove-orphans
            docker image prune -f
```

### 4. 모니터링 설정

```typescript
// src/lib/monitoring.ts
import { createClient } from '@supabase/supabase-js';

interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

class MetricsCollector {
  private metrics: Metric[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(private flushIntervalMs = 10000) {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, flushIntervalMs);
  }

  record(metric: Metric): void {
    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || new Date()
    });
  }

  recordApiCall(endpoint: string, method: string, statusCode: number, duration: number): void {
    this.record({
      name: 'api_request_duration_ms',
      value: duration,
      labels: {
        endpoint,
        method,
        status: statusCode.toString()
      }
    });

    this.record({
      name: 'api_request_total',
      value: 1,
      labels: {
        endpoint,
        method,
        status: statusCode.toString()
      }
    });
  }

  recordPermissionCheck(granted: boolean, roleType: string, duration: number): void {
    this.record({
      name: 'permission_check_duration_ms',
      value: duration,
      labels: {
        granted: granted.toString(),
        role_type: roleType
      }
    });

    this.record({
      name: 'permission_check_total',
      value: 1,
      labels: {
        granted: granted.toString(),
        role_type: roleType
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.metrics.length === 0) return;

    try {
      // 메트릭을 외부 시스템으로 전송
      await this.sendMetrics(this.metrics);
      this.metrics = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  private async sendMetrics(metrics: Metric[]): Promise<void> {
    // Prometheus, DataDog, CloudWatch 등으로 메트릭 전송
    console.log('Metrics:', metrics);
  }
}

export const metricsCollector = new MetricsCollector();
```

## 문제 해결

### 1. 일반적인 문제들

#### 권한 검증 실패
```typescript
// 문제: 유효한 사용자가 권한 거부됨
// 해결 방법: 디버깅용 로깅 추가

const checkPermissionsWithDebug = (user: MultiRoleUser, permissionCheck: PermissionCheck) => {
  console.log('Permission Check Debug:', {
    userId: user.id,
    userRoles: user.roles.map(r => ({ type: r.roleType, active: r.isActive, org: r.organizationId })),
    requiredRoles: permissionCheck.requiredRoles,
    organizationId: permissionCheck.organizationId,
    isMasterAdmin: user.isMasterAdmin
  });

  const result = checkPermissions(user, permissionCheck);
  
  console.log('Permission Result:', result);
  return result;
};
```

#### 캐시 무효화 문제
```typescript
// 문제: 역할 변경 후 캐시된 권한이 업데이트되지 않음
// 해결 방법: 역할 변경 시 관련 캐시 무효화

export const invalidateUserCache = (userId: string) => {
  // 사용자별 캐시 키 패턴
  const patterns = [
    `user-${userId}-*`,
    `permissions-${userId}-*`,
    `roles-${userId}-*`
  ];

  patterns.forEach(pattern => {
    permissionCache.invalidate(pattern);
  });
};
```

#### 데이터베이스 연결 문제
```typescript
// 문제: Supabase 연결 타임아웃
// 해결 방법: 연결 풀 및 재시도 로직

const createSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'Connection': 'keep-alive',
        },
      },
    }
  );
};
```

### 2. 성능 최적화

#### 느린 권한 검증
```typescript
// 문제: 권한 검증이 느림
// 해결 방법: 배치 처리 및 캐싱

class BatchPermissionChecker {
  private pendingChecks = new Map<string, Promise<any>>();

  async checkPermission(user: MultiRoleUser, permissionCheck: PermissionCheck): Promise<any> {
    const cacheKey = this.generateCacheKey(user.id, permissionCheck);
    
    // 이미 진행 중인 동일한 검증이 있으면 결과 공유
    if (this.pendingChecks.has(cacheKey)) {
      return this.pendingChecks.get(cacheKey);
    }

    const promise = permissionCache.getOrSet(
      cacheKey,
      () => checkPermissions(user, permissionCheck),
      60000 // 1분 캐시
    );

    this.pendingChecks.set(cacheKey, promise);
    
    // 완료 후 pending에서 제거
    promise.finally(() => {
      this.pendingChecks.delete(cacheKey);
    });

    return promise;
  }

  private generateCacheKey(userId: string, permissionCheck: PermissionCheck): string {
    return `permission-${userId}-${JSON.stringify(permissionCheck)}`;
  }
}
```

### 3. 보안 문제 대응

#### SQL Injection 시도
```typescript
// 문제: SQL Injection 공격 탐지됨
// 해결 방법: 자동 차단 및 알림

export const handleSQLInjection = async (
  request: NextRequest, 
  suspiciousParams: string[]
) => {
  const clientIp = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // 즉시 차단
  await blockIP(clientIp, '24h', 'SQL Injection attempt');

  // 보안팀 알림
  await sendSecurityAlert({
    type: 'SQL_INJECTION_ATTEMPT',
    ip: clientIp,
    userAgent,
    path: request.nextUrl.pathname,
    params: suspiciousParams,
    timestamp: new Date()
  });

  // 감사 로그 기록
  await auditLogger.log({
    user_id: 'anonymous',
    action: AuditAction.SECURITY_VIOLATION,
    result: AuditResult.FAILURE,
    resource_type: 'api_endpoint',
    resource_id: request.nextUrl.pathname,
    details: {
      violation_type: 'sql_injection',
      suspicious_params: suspiciousParams,
      ip_address: clientIp,
      user_agent: userAgent
    }
  });
};
```

---

이 구현 가이드를 따라하면 DOT 출석 서비스의 ID-Role-Paper 분기 아키텍처를 성공적으로 구현할 수 있습니다. 추가적인 질문이나 구체적인 구현 도움이 필요한 경우 언제든 문의해 주세요.