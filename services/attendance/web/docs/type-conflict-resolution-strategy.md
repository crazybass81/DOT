# 타입 충돌 해결 전략 (Type Conflict Resolution Strategy)

## 🔴 식별된 타입 충돌 문제들

### 1. **UserRole/RoleType 중복 정의 (3개 버전)**
```typescript
// Version 1: web/src/types/user.types.ts
export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  BUSINESS_ADMIN = 'BUSINESS_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

// Version 2: web/src/types/id-role-paper.ts
export enum RoleType {
  SEEKER = 'SEEKER',
  WORKER = 'WORKER',
  MANAGER = 'MANAGER',
  OWNER = 'OWNER',
  FRANCHISEE = 'FRANCHISEE',
  FRANCHISOR = 'FRANCHISOR',
  SUPERVISOR = 'SUPERVISOR'
}

// Version 3: src/types/index.ts
export enum UserRole {
  MasterAdmin = 'master_admin',
  Admin = 'admin',
  Manager = 'manager',
  Worker = 'worker'
}
```

### 2. **User Interface 중복 정의**
- `web/src/types/user.types.ts`: 단순 User 인터페이스
- `src/types/index.ts`: 상세 User 인터페이스 (DB 스키마 기반)
- `web/src/types/id-role-paper.ts`: UnifiedIdentity (다른 구조)

### 3. **Import 경로 불일치**
```typescript
// 상대 경로와 절대 경로 혼재
import { UserRole } from '@/src/types/user.types';  // 절대 경로
import { UserRole } from '../types/user.types';     // 상대 경로
import { RoleType } from './id-role-paper';         // 로컬 경로
```

### 4. **Database vs Application 타입 불일치**
```typescript
// Database: snake_case
identity_type: 'personal' | 'corporate'
verification_status: 'pending' | 'verified' | 'rejected'

// Application: camelCase/PascalCase
idType: IdType.PERSONAL | IdType.CORPORATE
verificationStatus: VerificationStatus.PENDING
```

## 🛠️ 해결 전략

### **Phase 1: 즉시 수정 (Quick Fix)**
타입 에러를 빠르게 해결하는 임시 방안

```typescript
// 1. 타입 앨리어스로 충돌 회피
// web/src/types/compatibility.ts
import { UserRole as LegacyUserRole } from './user.types';
import { RoleType as IdRolePaperRole } from './id-role-paper';
import { UserRole as CoreUserRole } from '../../src/types';

export type AppUserRole = CoreUserRole;  // 하나를 선택
export { IdRolePaperRole, LegacyUserRole };  // 나머지는 별칭으로 export
```

### **Phase 2: 타입 통합 (Type Consolidation)**
단일 소스 오브 트루스 확립

```typescript
// services/attendance/src/types/core.ts - 핵심 타입 정의
export namespace Core {
  export enum UserRole {
    MASTER_ADMIN = 'master_admin',
    ADMIN = 'admin',
    MANAGER = 'manager',
    WORKER = 'worker'
  }
  
  export interface User {
    id: string;
    email: string;
    role: UserRole;
    organizationId?: string;
  }
}

// services/attendance/src/types/id-role-paper.ts - 확장 타입
export namespace IdRolePaper {
  export enum RoleType {
    SEEKER = 'SEEKER',
    WORKER = 'WORKER',
    // ... 나머지
  }
  
  export interface Identity {
    // ID-ROLE-PAPER 특화 타입
  }
}

// services/attendance/src/types/index.ts - 통합 export
export * from './core';
export * from './id-role-paper';
export * from './database';
```

### **Phase 3: Import 경로 표준화**

```json
// tsconfig.json - 경로 앨리어스 정의
{
  "compilerOptions": {
    "paths": {
      "@types/*": ["src/types/*"],
      "@core-types": ["../src/types/index"],
      "@db-types": ["src/types/database"],
      "@id-role-paper": ["src/types/id-role-paper"]
    }
  }
}
```

```typescript
// 표준화된 import
import { Core } from '@core-types';
import { IdRolePaper } from '@id-role-paper';
import { Database } from '@db-types';

const user: Core.User = { ... };
const role: IdRolePaper.RoleType = IdRolePaper.RoleType.WORKER;
```

### **Phase 4: Database-Application 매핑**

```typescript
// services/attendance/src/mappers/type-mapper.ts
export class TypeMapper {
  // snake_case to camelCase
  static toAppUser(dbUser: Database.User): Core.User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      role: this.mapRole(dbUser.role),
      organizationId: dbUser.organization_id
    };
  }
  
  // camelCase to snake_case
  static toDbUser(appUser: Core.User): Database.UserInsert {
    return {
      id: appUser.id,
      email: appUser.email,
      role: appUser.role,
      organization_id: appUser.organizationId
    };
  }
  
  // Role mapping
  static mapRole(dbRole: string): Core.UserRole {
    const roleMap = {
      'master_admin': Core.UserRole.MASTER_ADMIN,
      'admin': Core.UserRole.ADMIN,
      'manager': Core.UserRole.MANAGER,
      'worker': Core.UserRole.WORKER
    };
    return roleMap[dbRole] || Core.UserRole.WORKER;
  }
}
```

## 📋 실행 체크리스트

### **즉시 실행 (Day 1)**
- [ ] compatibility.ts 파일 생성하여 타입 앨리어스 정의
- [ ] 타입 에러가 발생하는 파일에서 새 import 사용
- [ ] npm run type-check 통과 확인

### **단기 실행 (Week 1)**
- [ ] core.ts에 핵심 타입 통합
- [ ] namespace 패턴으로 타입 그룹화
- [ ] tsconfig.json 경로 앨리어스 설정
- [ ] 모든 import 문 표준화

### **중기 실행 (Week 2-3)**
- [ ] TypeMapper 클래스 구현
- [ ] 모든 DB 접근 코드에 mapper 적용
- [ ] 레거시 타입 정의 제거
- [ ] 타입 테스트 작성

## 🎯 예상 효과

1. **타입 안정성 향상**: 단일 소스로 타입 충돌 제거
2. **개발 속도 향상**: 명확한 import 경로로 혼란 감소
3. **유지보수성 개선**: 네임스페이스로 타입 그룹 명확화
4. **확장성 확보**: 새로운 타입 추가 시 체계적 관리

## ⚠️ 주의사항

1. **점진적 마이그레이션**: 한번에 모든 파일 수정 금지
2. **하위 호환성 유지**: 레거시 타입 즉시 삭제 금지
3. **테스트 우선**: 타입 변경 전 테스트 작성
4. **문서화**: 타입 변경 사항 README 업데이트

## 🔧 유용한 스크립트

```bash
# 타입 충돌 검사
npx tsc --noEmit --listFiles | grep -E "types|\.d\.ts"

# 중복 타입 정의 찾기
grep -r "export (interface|type|enum) User" --include="*.ts" --include="*.tsx"

# Import 경로 표준화
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/@\/types/@core-types/g'
```