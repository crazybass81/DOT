# DOT 출석 서비스 네이밍 컨벤션 가이드

## 📋 개요

본 문서는 DOT 출석 서비스 프로젝트의 일관된 네이밍 컨벤션을 정의합니다. 
코드의 가독성과 유지보수성을 높이기 위해 모든 개발자가 준수해야 하는 네이밍 규칙을 명시합니다.

## 🎯 네이밍 컨벤션 규칙

### 1. 파일명 컨벤션

#### ✅ 올바른 예시

```bash
# 서비스 파일
src/services/business-verification.service.ts
src/services/unified-identity.service.ts
src/services/multi-role-auth.service.ts

# 컴포넌트 파일
components/CheckInButton.tsx
components/UserProfileModal.tsx
components/AttendanceTable.tsx

# 유틸리티 파일
utils/date-formatter.ts
utils/api-client.ts
utils/validation-helpers.ts

# 타입 정의 파일
types/user.types.ts
types/organization.types.ts
types/attendance.types.ts
```

#### ❌ 잘못된 예시

```bash
# camelCase로 된 서비스 파일
src/services/businessVerificationService.ts  # ❌
src/services/unifiedIdentityService.ts       # ❌

# 소문자로 된 컴포넌트
components/checkinbutton.tsx                 # ❌
components/userprofilemodal.tsx              # ❌
```

### 2. 클래스명 컨벤션

#### ✅ 올바른 예시

```typescript
export class BusinessVerificationService {
  static async verifyRegistration() { }
}

export class UnifiedIdentityService {
  async createIdentity() { }
}

export class AttendanceManager {
  private readonly config: Config;
}
```

#### ❌ 잘못된 예시

```typescript
export class businessVerificationService { }  # ❌ 소문자 시작
export class unifiedidentityservice { }       # ❌ 전체 소문자
export const identityService = { };           # ❌ 객체 구조
```

### 3. 인터페이스 및 타입 컨벤션

#### ✅ 올바른 예시

```typescript
interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
}

interface AttendanceRecord {
  recordId: string;
  checkInTime: Date;
  checkOutTime?: Date;
}

type UserRole = 'ADMIN' | 'MANAGER' | 'WORKER';
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';
```

#### ❌ 잘못된 예시

```typescript
interface user { }              # ❌ 소문자 시작
interface userProfile { }       # ❌ camelCase
interface IUser { }             # ❌ Hungarian notation
type userRole = string;         # ❌ 소문자 시작
```

### 4. 데이터베이스 컨벤션

#### ✅ 올바른 예시 (Supabase/PostgreSQL)

```sql
-- 테이블명: snake_case
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스명: table_column_idx
CREATE INDEX attendance_records_user_id_idx ON attendance_records(user_id);
CREATE INDEX attendance_records_organization_date_idx ON attendance_records(organization_id, DATE(check_in_time));
```

#### TypeScript 타입 정의

```typescript
interface DatabaseSchema {
  attendance_records: {
    Row: {
      id: string;
      user_id: string;
      organization_id: string;
      check_in_time: string | null;
      check_out_time: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      organization_id: string;
      check_in_time?: string | null;
      check_out_time?: string | null;
    };
  };
}
```

### 5. API 엔드포인트 컨벤션

#### ✅ 올바른 예시

```bash
# REST API: kebab-case
GET  /api/master-admin/organizations
POST /api/attendance/check-in
PUT  /api/users/profile-update
GET  /api/reports/attendance-summary

# GraphQL: camelCase
query getUserAttendance($userId: ID!) {
  userAttendance(userId: $userId) {
    checkInTime
    checkOutTime
  }
}
```

#### ❌ 잘못된 예시

```bash
# 패턴 혼재
GET /api/masterAdmin/organizations     # ❌ camelCase 혼재  
POST /api/attendance/checkIn           # ❌ camelCase 혼재
PUT /api/users/ProfileUpdate           # ❌ PascalCase 혼재
```

### 6. Enum 컨벤션

#### ✅ 올바른 예시

```typescript
enum UserRole {
  MASTER_ADMIN = 'MASTER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  WORKER = 'WORKER'
}

enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE'
}

enum IdType {
  PERSONAL = 'personal',
  CORPORATE = 'corporate'
}
```

### 7. 상수 컨벤션

#### ✅ 올바른 예시

```typescript
// 전역 상수: UPPER_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;

// 설정 객체
const DATABASE_CONFIG = {
  HOST: 'localhost',
  PORT: 5432,
  NAME: 'attendance_db'
} as const;

// 에러 메시지
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: '잘못된 인증 정보입니다',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다',
  UNAUTHORIZED: '권한이 없습니다'
} as const;
```

## 🔧 ESLint 규칙

프로젝트에서 사용하는 ESLint 네이밍 규칙:

```json
{
  "@typescript-eslint/naming-convention": [
    "error",
    {
      "selector": "interface",
      "format": ["PascalCase"]
    },
    {
      "selector": "class",
      "format": ["PascalCase"]
    },
    {
      "selector": "typeAlias",
      "format": ["PascalCase"]  
    },
    {
      "selector": "enum",
      "format": ["PascalCase"]
    },
    {
      "selector": "enumMember",
      "format": ["UPPER_CASE"]
    },
    {
      "selector": "variable",
      "modifiers": ["const", "global"],
      "types": ["boolean", "string", "number"],
      "format": ["UPPER_CASE"]
    },
    {
      "selector": "function",
      "format": ["camelCase", "PascalCase"]
    },
    {
      "selector": "method", 
      "format": ["camelCase"]
    }
  ]
}
```

## 📝 체크리스트

새로운 코드를 작성할 때 다음 사항을 확인하세요:

### 파일 생성시
- [ ] 서비스 파일은 `*.service.ts` 형태의 kebab-case 사용
- [ ] 컴포넌트 파일은 PascalCase 사용 
- [ ] 유틸리티 파일은 kebab-case 사용
- [ ] 타입 파일은 `*.types.ts` 형태 사용

### 클래스/인터페이스 정의시
- [ ] 클래스명은 PascalCase 사용
- [ ] 인터페이스명은 PascalCase 사용
- [ ] 타입 별칭은 PascalCase 사용
- [ ] Enum은 PascalCase, 멤버는 UPPER_CASE 사용

### API 설계시
- [ ] REST 엔드포인트는 kebab-case 사용
- [ ] GraphQL 필드는 camelCase 사용
- [ ] HTTP 메서드에 맞는 동사 사용

### 데이터베이스 설계시
- [ ] 테이블명은 snake_case 사용
- [ ] 컬럼명은 snake_case 사용
- [ ] 인덱스명은 `table_column_idx` 패턴 사용

## 🚀 마이그레이션 가이드

기존 코드를 새로운 컨벤션에 맞게 수정하는 방법:

### 1. 서비스 파일 마이그레이션

```bash
# 파일명 변경
mv businessVerificationService.ts business-verification.service.ts

# 클래스 구조로 변경
# Before
export const businessVerificationService = {
  async verify() { }
}

# After  
export class BusinessVerificationService {
  static async verify() { }
}
```

### 2. Import 문 업데이트

```typescript
// Before
import { businessVerificationService } from './services/businessVerificationService';

// After
import { BusinessVerificationService } from './services/business-verification.service';
```

## 🔍 검증 도구

### ESLint 실행
```bash
npm run lint
```

### 타입 체크
```bash
npm run type-check
```

### 빌드 검증
```bash
npm run build
```

## 📚 참고 자료

- [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Next.js Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/eslint)
- [Supabase Naming Conventions](https://supabase.com/docs/guides/database/tables#table-and-column-naming)

---

**마지막 업데이트**: 2025-09-09  
**버전**: 1.0.0  
**작성자**: DOT 개발팀