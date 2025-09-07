# DOT Attendance Service: ID-Role-Paper 분기 아키텍처

## 목차
1. [개요](#개요)
2. [핵심 설계 원칙](#핵심-설계-원칙)
3. [시스템 컴포넌트](#시스템-컴포넌트)
4. [분기 로직 상세](#분기-로직-상세)
5. [구현 가이드](#구현-가이드)
6. [보안 고려사항](#보안-고려사항)
7. [확장성 및 유지보수](#확장성-및-유지보수)

## 개요

DOT 출석 서비스는 **ID(신원)**, **Role(역할)**, **Paper(권한/계약)** 3가지 축을 중심으로 하는 정교한 분기 아키텍처를 구현합니다. 이 시스템은 복잡한 조직 구조와 다양한 고용 형태를 지원하면서도 보안성과 확장성을 보장합니다.

### 주요 특징
- 🆔 **통합 신원 관리**: 개인/법인/사업자 구분 신원 시스템
- 👥 **계층적 역할 구조**: 4단계 권한 계층과 다중 역할 지원
- 📋 **계약 기반 권한**: 근로 계약 유형별 차별화된 권한 관리
- 🔀 **동적 분기**: 사용자 컨텍스트에 따른 실시간 권한 결정
- 🛡️ **종합 보안**: 다층 보안 검증과 감사 추적

## 핵심 설계 원칙

### 1. ID-Role-Paper 트라이아드
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│     ID      │    │    Role     │    │    Paper    │
│   (신원)     │◄──►│   (역할)     │◄──►│  (권한/계약) │
│             │    │             │    │             │
│ • 개인      │    │ • WORKER    │    │ • 정규직    │
│ • 법인      │    │ • ADMIN     │    │ • 파트타임  │
│ • 사업자    │    │ • MANAGER   │    │ • 임시직    │
│             │    │ • FRANCHISE │    │ • 인턴      │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 2. 분기 결정 매트릭스
| ID Type | Role Level | Paper Status | Access Level | Dashboard |
|---------|------------|--------------|--------------|-----------|
| Personal | WORKER | Active Contract | Basic | Worker Dashboard |
| Business | ADMIN | Verified | Enhanced | Admin Dashboard |
| Corporate | MANAGER | Multi-Contract | Advanced | Manager Dashboard |
| Any | FRANCHISE | Master | Full | Franchise Dashboard |

## 시스템 컴포넌트

### 1. 신원(ID) 관리 시스템

#### UnifiedIdentityService
```typescript
export class UnifiedIdentityService {
  // 신원 생성
  async createIdentity(data: CreateUnifiedIdentityRequest): Promise<UnifiedIdentityResponse>
  
  // 이메일로 조회
  async getByEmail(email: string): Promise<UnifiedIdentity | null>
  
  // 인증 사용자 ID로 조회
  async getByAuthUserId(authUserId: string): Promise<UnifiedIdentity | null>
  
  // 검증 상태 업데이트
  async updateVerificationStatus(id: string, status: VerificationStatus): Promise<UnifiedIdentityResponse>
}
```

#### 신원 유형 분류
```typescript
export enum IdType {
  PERSONAL = 'personal',    // 개인: 기본 근로자
  CORPORATE = 'corporate',  // 법인: 사업체 관리자
  BUSINESS = 'business'     // 사업자: 개인사업자
}

interface UnifiedIdentity {
  id: string;
  email: string;
  full_name: string;
  id_type: IdType;
  business_verification_status: 'pending' | 'verified' | 'rejected';
  business_verification_data: Record<string, any>;
  auth_user_id: string;
  is_verified: boolean;
  is_active: boolean;
  profile_data: Record<string, any>;
}
```

### 2. 역할(Role) 기반 계층 구조

#### 권한 계층 정의
```typescript
export enum RoleType {
  WORKER = 'WORKER',       // 레벨 1: 기본 근로자
  ADMIN = 'ADMIN',         // 레벨 2: 팀/부서 관리자
  MANAGER = 'MANAGER',     // 레벨 3: 사업장 관리자
  FRANCHISE = 'FRANCHISE'  // 레벨 4: 가맹본부/최고관리자
}

const ROLE_HIERARCHY: Record<RoleType, number> = {
  FRANCHISE: 4,  // 최고 권한
  MANAGER: 3,
  ADMIN: 2,
  WORKER: 1      // 기본 권한
};
```

#### 다중 역할 지원
```typescript
interface UserRole {
  id: string;
  employeeId: string;        // 통합신원 ID
  organizationId: string;    // 소속 조직
  roleType: RoleType;        // 역할 유형
  isActive: boolean;         // 활성 상태
  grantedAt: Date;          // 권한 부여일
  grantedBy?: string;       // 권한 부여자
  organizationName: string; // 조직명
}

interface MultiRoleUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];        // 다중 역할 배열
  contracts: Contract[];    // 관련 계약들
  isMasterAdmin?: boolean;  // 마스터 관리자 여부
}
```

### 3. Paper(계약/권한) 시스템

#### 계약 유형 관리
```typescript
export enum ContractType {
  EMPLOYMENT = 'EMPLOYMENT',   // 정규직 - 전체 권한
  PART_TIME = 'PART_TIME',     // 파트타임 - 제한된 시간
  TEMPORARY = 'TEMPORARY',     // 임시직 - 기간 제한
  INTERNSHIP = 'INTERNSHIP',   // 인턴 - 교육 목적
  FREELANCE = 'FREELANCE'      // 프리랜서 - 프로젝트 기반
}

export enum ContractStatus {
  PENDING = 'PENDING',         // 승인 대기
  ACTIVE = 'ACTIVE',          // 활성 계약
  TERMINATED = 'TERMINATED',   // 계약 해지
  EXPIRED = 'EXPIRED'         // 계약 만료
}

interface Contract {
  id: string;
  employeeId: string;          // 직원 ID
  organizationId: string;      // 조직 ID
  contractType: ContractType;  // 계약 유형
  startDate: Date;            // 시작일
  endDate?: Date;             // 종료일 (선택)
  status: ContractStatus;     // 계약 상태
  wageAmount?: number;        // 급여액
  wageType: WageType;         // 급여 형태
  isMinor?: boolean;          // 미성년자 여부
  parentConsentFile?: string; // 부모 동의서
  terms?: Record<string, any>; // 계약 조건
  isActive: boolean;          // 활성 상태
}
```

## 분기 로직 상세

### 1. 스마트 라우팅 시스템

#### 권한 기반 대시보드 분기
```typescript
// 역할별 대시보드 매핑
const ROLE_DASHBOARD_MAP: Record<RoleType, { path: string; label: string }> = {
  WORKER: {
    path: '/dashboard/worker',
    label: '근로자 대시보드'
  },
  ADMIN: {
    path: '/dashboard/admin', 
    label: '관리자 대시보드'
  },
  MANAGER: {
    path: '/dashboard/manager',
    label: '매니저 대시보드'
  },
  FRANCHISE: {
    path: '/dashboard/franchise',
    label: '프랜차이즈 대시보드'
  }
};

// 스마트 라우팅 메인 함수
export function smartRouter(
  user: MultiRoleUser | null,
  organizationId?: string,
  lastAccessedDashboard?: string,
  userPreferences?: { preferredRoleType?: RoleType }
): SmartRoutingResult {
  // 1. 활성 역할 필터링
  const activeRoles = getActiveRoles(user, organizationId);
  
  // 2. 권한 레벨별 정렬
  const uniqueRoleTypes = getUniqueRoleTypes(activeRoles);
  const sortedRoles = sortRolesByHierarchy(uniqueRoleTypes);
  
  // 3. 기본 경로 결정 (최고 권한 우선)
  const defaultPath = ROLE_DASHBOARD_MAP[sortedRoles[0]]?.path || '/dashboard';
  
  // 4. 사용 가능한 모든 대시보드 목록
  const availablePaths = sortedRoles.map(roleType => ({
    path: ROLE_DASHBOARD_MAP[roleType].path,
    label: ROLE_DASHBOARD_MAP[roleType].label,
    roleType
  }));
  
  // 5. 추천 경로 계산 (사용자 선호도 + 최근 접속 이력)
  const suggestedPath = getSuggestedDashboard(availablePaths, lastAccessedDashboard, userPreferences);
  
  return {
    defaultPath,
    availablePaths,
    hasMultipleRoles: uniqueRoleTypes.length > 1,
    totalRoles: activeRoles.length,
    suggestedPath
  };
}
```

### 2. RBAC 미들웨어

#### 3단계 권한 검증
```typescript
interface PermissionCheck {
  requiredRoles: RoleType[];     // 필요한 역할들
  organizationId?: string;       // 조직 범위 제한
  requiredAllRoles?: boolean;    // AND(true) vs OR(false) 조건
  action?: 'read' | 'write' | 'delete' | 'admin'; // 액션 유형
  resourceOwnerId?: string;      // 자원 소유권 확인
  enableCache?: boolean;         // 권한 캐싱 사용
  enableAuditLog?: boolean;      // 감사 로그 활성화
}

// 권한 검증 프로세스
function checkPermissions(user: MultiRoleUser, permissionCheck: PermissionCheck): {
  granted: boolean;
  reason?: string;
  userRoles: RoleType[];
} {
  // 1. 마스터 어드민 특별 권한
  if (user.isMasterAdmin) {
    return { granted: true, reason: 'Master admin access', userRoles: ['MASTER_ADMIN'] };
  }
  
  // 2. 자원 소유자 권한
  if (permissionCheck.resourceOwnerId && user.id === permissionCheck.resourceOwnerId) {
    return { granted: true, reason: 'Resource owner access', userRoles: ['RESOURCE_OWNER'] };
  }
  
  // 3. 역할 기반 권한 검증
  const activeRoles = user.roles.filter(role => role.isActive);
  const relevantRoles = permissionCheck.organizationId 
    ? activeRoles.filter(role => role.organizationId === permissionCheck.organizationId)
    : activeRoles;
  
  const userRoleTypes = [...new Set(relevantRoles.map(role => role.roleType))];
  
  // 4. AND/OR 조건에 따른 권한 확인
  let hasPermission = false;
  if (permissionCheck.requiredAllRoles) {
    // 모든 역할이 필요한 경우
    hasPermission = permissionCheck.requiredRoles.every(role => userRoleTypes.includes(role));
  } else {
    // 하나의 역할이라도 있으면 되는 경우
    hasPermission = permissionCheck.requiredRoles.some(role => userRoleTypes.includes(role));
  }
  
  // 5. 액션별 추가 검증
  if (hasPermission && permissionCheck.action === 'write') {
    // 쓰기 권한은 WORKER 제외
    const writeAllowedRoles = userRoleTypes.filter(role => role !== RoleType.WORKER);
    hasPermission = permissionCheck.requiredRoles.some(role => writeAllowedRoles.includes(role));
  }
  
  return {
    granted: hasPermission,
    reason: hasPermission ? 'Permission granted' : 'Insufficient permissions',
    userRoles: userRoleTypes
  };
}
```

### 3. 동적 대시보드 라우팅

#### DashboardRouter 컴포넌트
```typescript
const DashboardRouter: React.FC<DashboardRouterProps> = ({
  user,
  organizationId,
  children,
  onRoutingDecision
}) => {
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  
  useEffect(() => {
    const performRouting = async () => {
      // 1. 스마트 라우팅 실행
      const routingResult = smartRouter(user, organizationId, userPreferences.lastAccessedDashboard);
      
      // 2. 멀티 역할 사용자 판단
      if (routingResult.hasMultipleRoles && !userPreferences.autoRedirect) {
        setShowRoleSelector(true); // 선택 화면 표시
        return;
      }
      
      // 3. 자동 라우팅
      const targetPath = routingResult.suggestedPath || routingResult.defaultPath;
      router.replace(targetPath);
      
      // 4. 선택 기록 저장
      await saveLastAccessedDashboard(targetPath);
    };
    
    performRouting();
  }, [user, organizationId, userPreferences]);
  
  // 역할 선택 화면 또는 자동 라우팅
  return showRoleSelector ? <RoleSelector /> : <>{children}</>;
};
```

## 구현 가이드

### 1. 신규 역할 추가

```typescript
// 1. RoleType enum 확장
export enum RoleType {
  WORKER = 'WORKER',
  ADMIN = 'ADMIN', 
  MANAGER = 'MANAGER',
  FRANCHISE = 'FRANCHISE',
  SUPERVISOR = 'SUPERVISOR'  // 새 역할 추가
}

// 2. 권한 계층 업데이트
const ROLE_HIERARCHY: Record<RoleType, number> = {
  FRANCHISE: 5,
  SUPERVISOR: 4,  // 새 계층 추가
  MANAGER: 3,
  ADMIN: 2,
  WORKER: 1
};

// 3. 대시보드 매핑 추가
const ROLE_DASHBOARD_MAP = {
  // ... 기존 매핑
  SUPERVISOR: {
    path: '/dashboard/supervisor',
    label: '수퍼바이저 대시보드'
  }
};
```

### 2. 커스텀 권한 규칙

```typescript
// 복합 권한 규칙 예시
const COMPLEX_PERMISSION_RULES = {
  // 급여 관리: MANAGER 이상 + 해당 조직 + 활성 계약
  payroll_management: {
    requiredRoles: [RoleType.MANAGER, RoleType.FRANCHISE],
    organizationScope: true,
    additionalChecks: [
      (user: MultiRoleUser, context: any) => {
        // 급여 관리 권한 추가 검증 로직
        const activeContracts = user.contracts.filter(c => c.status === 'ACTIVE');
        return activeContracts.length > 0;
      }
    ]
  },
  
  // 직원 채용: ADMIN 이상 + 사업자 인증 완료
  employee_hiring: {
    requiredRoles: [RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE],
    additionalChecks: [
      (user: MultiRoleUser) => {
        // 사업자 인증 상태 확인
        return user.business_verification_status === 'verified';
      }
    ]
  }
};
```

### 3. API 엔드포인트 보호

```typescript
// API Route에서 RBAC 적용
export async function GET(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: MultiRoleUser) => {
      // 비즈니스 로직 구현
      const attendanceData = await getAttendanceData(user.id);
      return NextResponse.json({ data: attendanceData });
    },
    {
      requiredRoles: [RoleType.WORKER, RoleType.ADMIN, RoleType.MANAGER],
      action: 'read',
      enableAuditLog: true
    }
  )(request);
}
```

## 보안 고려사항

### 1. 다층 보안 검증

```typescript
// 보안 검증 단계
const securityLayers = {
  // Layer 1: 신원 확인
  identity: async (user: any) => {
    const identity = await unifiedIdentityService.getById(user.id);
    return identity && identity.is_verified && identity.is_active;
  },
  
  // Layer 2: 역할 유효성
  role: async (user: MultiRoleUser, context: any) => {
    const activeRoles = user.roles.filter(role => 
      role.isActive && 
      (!context.organizationId || role.organizationId === context.organizationId)
    );
    return activeRoles.length > 0;
  },
  
  // Layer 3: 계약 상태
  contract: async (user: MultiRoleUser, context: any) => {
    const validContracts = user.contracts.filter(contract =>
      contract.status === 'ACTIVE' &&
      (!context.organizationId || contract.organizationId === context.organizationId)
    );
    return validContracts.length > 0;
  },
  
  // Layer 4: 시간/위치 제약
  contextual: async (user: MultiRoleUser, context: any) => {
    // 근무 시간, 위치, 기기 등 컨텍스트 기반 검증
    return validateWorkingHours() && validateLocation() && validateDevice();
  }
};
```

### 2. 감사 추적

```typescript
// 종합 감사 로깅
interface AuditLogEntry {
  timestamp: Date;
  user_id: string;
  identity_type: IdType;
  role_types: RoleType[];
  contract_statuses: ContractStatus[];
  organization_id?: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  result: 'SUCCESS' | 'FAILURE';
  failure_reason?: string;
  ip_address: string;
  user_agent: string;
  session_id: string;
}
```

### 3. SQL Injection 방어

```typescript
// 미들웨어 레벨 SQL Injection 탐지
const SQL_INJECTION_PATTERNS = [
  /(\b(DROP|DELETE|TRUNCATE|UPDATE|INSERT|CREATE|ALTER|EXEC)\b)/gi,
  /(\b(UNION|SELECT)\b.*\b(FROM|WHERE)\b)/gi,
  /(--|\#|\/\*|\*\/)/g,
  /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
  /('|")\s*(OR|AND)\s*('|")\d*\s*=\s*('|")\d*/gi
];

function detectSQLInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(decodeURIComponent(value)));
}
```

## 확장성 및 유지보수

### 1. 시스템 확장 포인트

```typescript
// 플러그인 아키텍처
interface PermissionPlugin {
  name: string;
  version: string;
  checkPermission(user: MultiRoleUser, context: any): Promise<boolean>;
  getRequiredRoles(): RoleType[];
  getAdditionalChecks(): Array<(user: MultiRoleUser, context: any) => Promise<boolean>>;
}

// 동적 역할 로더
interface RoleDefinition {
  type: string;
  level: number;
  permissions: string[];
  dashboardPath: string;
  label: string;
}

class DynamicRoleManager {
  private roles: Map<string, RoleDefinition> = new Map();
  
  registerRole(definition: RoleDefinition): void {
    this.roles.set(definition.type, definition);
  }
  
  getRoleHierarchy(): Record<string, number> {
    const hierarchy: Record<string, number> = {};
    this.roles.forEach((def, type) => {
      hierarchy[type] = def.level;
    });
    return hierarchy;
  }
}
```

### 2. 성능 최적화

```typescript
// 권한 캐싱 전략
class PermissionCache {
  private cache = new Map<string, CacheEntry>();
  private ttl = 5 * 60 * 1000; // 5분 TTL
  
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, {
      data,
      expires: Date.now() + (customTtl || this.ttl)
    });
    
    return data;
  }
}
```

### 3. 모니터링 및 알림

```typescript
// 권한 시스템 헬스 체크
interface PermissionSystemHealth {
  identity_service: 'healthy' | 'degraded' | 'down';
  role_resolution: 'healthy' | 'degraded' | 'down';
  contract_validation: 'healthy' | 'degraded' | 'down';
  cache_performance: {
    hit_rate: number;
    avg_response_time: number;
  };
  security_metrics: {
    failed_attempts_per_minute: number;
    suspicious_activities: number;
  };
}

// 실시간 모니터링
class PermissionMonitor {
  async checkSystemHealth(): Promise<PermissionSystemHealth> {
    // 각 컴포넌트 상태 확인
    return {
      identity_service: await this.checkIdentityService(),
      role_resolution: await this.checkRoleResolution(),
      contract_validation: await this.checkContractValidation(),
      cache_performance: await this.getCacheMetrics(),
      security_metrics: await this.getSecurityMetrics()
    };
  }
}
```

---

## 관련 문서
- [API 참조 문서](./API.md)
- [보안 구현 가이드](./SECURITY_IMPLEMENTATION_GUIDE.md)
- [배포 가이드](./DEPLOYMENT_GUIDE.md)
- [문제 해결 가이드](./TROUBLESHOOTING.md)

## 변경 이력
- v1.0.0 (2025-09-07): 초기 ID-Role-Paper 아키텍처 문서화
- v1.1.0 (예정): 동적 역할 관리 기능 추가
- v1.2.0 (예정): 고급 권한 규칙 엔진 구현