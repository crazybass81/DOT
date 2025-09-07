# ID-ROLE-PAPER 3체계 시스템 설계서

## 📋 개요

DOT 플랫폼의 사용자 신원, 역할, 법적 근거를 명확하게 분리한 3체계 시스템 설계입니다.

### 설계 원칙
- **ID**: 신원 관리 (개인/법인 구분)
- **ROLE**: 권한 관리 (4가지 역할)
- **PAPER**: 법적 근거 관리 (각종 계약서/등록증)

---

## 🆔 ID 체계 (신원 관리)

### userID (개인 신원)
```
- 핸드폰번호: 1:1 유니크 매핑
- 주민번호: 개인사업자 인증용 (해시 저장)
- 모든 역할의 실제 보유자
```

### corpID (법인 신원)
```
- userID를 통해서만 생성/관리
- 법인등록번호: 별도 보유
- 사업 운영의 법적 주체 (역할 보유자 아님)
```

---

## 👥 ROLE 체계 (권한 관리)

### 4가지 역할 정의

#### 1. worker (근로자)
- **생성 조건**: userID + employment_contract
- **권한**: 개인 근태 관리, 본인 정보 조회
- **제한**: 계약 기간 내에서만 유효

#### 2. admin (사업자/관리자)
- **생성 조건**: userID + business_license
- **개인사업자**: userID 주민번호 ↔ 사업자등록증 매칭
- **법인사업자**: corpID 법인번호 ↔ 사업자등록증 매칭 (역할은 userID에게 부여)
- **권한**: 직원 관리, 사업장 운영, 계약 체결

#### 3. manager (중간관리자)
- **생성 조건**: userID + employment_contract + power_of_attorney
- **권한**: admin이 위임한 부분 권한
- **제한**: 위임 범위 및 기간 내에서만

#### 4. franchise_admin (프랜차이즈 관리자)
- **생성 조건**: userID + franchise_agreement
- **권한**: 특정 프랜차이즈 매장 전체 관리
- **범위**: 계약서에 명시된 브랜드/영업구역만

### 핵심 원칙
**✅ 모든 ROLE은 userID에게만 부여됩니다!**
**✅ corpID는 법인으로 사업을 운영할 때의 "운영 주체" 역할만 합니다.**

---

## 📋 PAPER 체계 (법적 근거 관리)

### PAPER 타입

#### 1. business_license (사업자등록증)
```json
{
  "license_number": "123-45-67890",
  "business_name": "홍길동 치킨집",
  "representative_name": "홍길동",
  "business_type": "individual|corporation|franchise",
  "owner_verification": {
    "resident_number_hash": "hash_value", // 개인사업자
    "corp_number": "110111-1234567"       // 법인사업자
  }
}
```

#### 2. employment_contract (근로계약서)
```json
{
  "employer_id": "uuid_of_employer",
  "employee_id": "uuid_of_employee", 
  "position": "매장 직원",
  "contract_period": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  "work_conditions": {
    "working_hours": "9:00-18:00",
    "salary": 3000000,
    "salary_type": "monthly"
  }
}
```

#### 3. power_of_attorney (권한위임장)
```json
{
  "grantor_id": "admin_user_id",
  "grantee_id": "manager_user_id",
  "delegated_permissions": [
    "employee_management",
    "attendance_approval"
  ],
  "scope": {
    "business_locations": ["location_id_1"],
    "employee_groups": ["group_a"]
  },
  "validity_period": {
    "start_date": "2024-01-01",
    "end_date": "2024-06-30"
  }
}
```

#### 4. franchise_agreement (프랜차이즈 계약서)
```json
{
  "franchisee_user_id": "userID_홍길동",        // 실제 역할 보유자 (필수)
  "operating_entity_type": "individual|corp",   // 운영 주체 타입
  "operating_entity_id": "corpID_ABC회사",      // 법인으로 운영시 (선택)
  "franchisor": "맥도날드 본사",
  "franchise_number": "FR-2024-001", 
  "brand_name": "맥도날드",
  "territory": "서울시 강남구"
}
```

### PAPER 상태 관리
- **draft**: 초안
- **pending**: 승인대기
- **active**: 활성 (유효)
- **expired**: 만료
- **revoked**: 취소/철회
- **suspended**: 일시중단

---

## 🔗 3체계 간 관계 매핑

### ID + PAPER → ROLE 생성 규칙

| ROLE | ID 요구사항 | PAPER 요구사항 | 실제 역할 보유자 |
|------|-------------|----------------|------------------|
| worker | userID (필수) | employment_contract | userID (근로자) |
| admin | userID OR corpID | business_license | userID (사업자) |
| manager | userID (필수) | employment_contract + power_of_attorney | userID (중간관리자) |
| franchise_admin | userID (필수) | franchise_agreement | userID (가맹점주) |

### 역할 생성/변경 플로우
```
1. ID 등록 → PAPER 제출 → PAPER 검증
2. 검증 성공 → ROLE 자동 생성 → ROLE 활성화
3. PAPER 만료/취소 → 해당 ROLE 비활성화
4. PAPER 갱신 → ROLE 상태 업데이트
```

---

## 🗄️ 데이터베이스 스키마

### ID 체계 테이블

```sql
-- 1. 개인 신원 (userID)
CREATE TABLE user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    resident_number_hash VARCHAR(255) UNIQUE, -- 개인사업자 검증용
    email VARCHAR(255),
    auth_user_id UUID UNIQUE, -- Supabase Auth 연결
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 법인 신원 (corpID)  
CREATE TABLE corp_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES user_identities(id),
    corp_number VARCHAR(13) UNIQUE NOT NULL, -- 법인등록번호
    corp_name VARCHAR(200) NOT NULL,
    representative_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### PAPER 체계 테이블

```sql
-- PAPER 타입 정의
CREATE TYPE paper_type AS ENUM (
    'business_license',      -- 사업자등록증
    'employment_contract',   -- 근로계약서
    'franchise_agreement',   -- 프랜차이즈 계약서
    'power_of_attorney',     -- 권한위임장
    'corporate_registration' -- 법인등기부등본
);

-- PAPER 상태 정의
CREATE TYPE paper_status AS ENUM (
    'draft', 'pending', 'active', 'expired', 'revoked', 'suspended'
);

-- 3. 핵심 PAPER 관리
CREATE TABLE papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    paper_type paper_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 소유자 (ID 체계와 연결)
    owner_type VARCHAR(10) CHECK (owner_type IN ('user', 'corp')) NOT NULL,
    owner_id UUID NOT NULL, -- user_identities.id OR corp_identities.id
    
    -- PAPER 내용 (JSON으로 유연하게 저장)
    content JSONB NOT NULL,
    
    -- 상태 관리
    status paper_status DEFAULT 'draft',
    
    -- 유효 기간
    valid_from DATE,
    valid_until DATE,
    
    -- 검증 정보
    verification_status VARCHAR(20) DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES user_identities(id),
    verification_notes TEXT,
    
    -- 메타데이터
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ROLE 체계 테이블

```sql
-- 4. 역할 정의
CREATE TABLE role_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL, -- 'worker', 'admin', 'manager', 'franchise_admin'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_permissions JSONB NOT NULL, -- 기본 권한 목록
    is_delegatable BOOLEAN DEFAULT false, -- manager 역할 생성 시 권한 위임 가능 여부
    priority_level INTEGER DEFAULT 0, -- 역할 우선순위 (숫자 높을수록 우선)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 역할 할당 (ID + PAPER → ROLE)
CREATE TABLE role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 역할 보유자 (항상 userID만!)
    assignee_type VARCHAR(10) CHECK (assignee_type = 'user') NOT NULL,
    assignee_id UUID NOT NULL REFERENCES user_identities(id),
    
    -- 역할 정의
    role_id UUID NOT NULL REFERENCES role_definitions(id),
    
    -- 역할 근거 (PAPER 체계)
    paper_id UUID NOT NULL REFERENCES papers(id),
    
    -- 역할 범위 및 권한
    scope JSONB, -- 역할 적용 범위, 운영 주체 정보 포함
    custom_permissions JSONB, -- 추가/제한된 권한
    delegated_permissions JSONB, -- manager의 경우 위임받은 권한
    delegated_by UUID REFERENCES role_assignments(id), -- 권한 위임자
    
    -- 상태 관리
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES user_identities(id),
    revoke_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 실제 시나리오 예시

### 시나리오 1: 개인사업자 홍길동이 직원을 고용
```
1. userID_홍길동 + business_license_치킨집 → admin_홍길동 생성
2. userID_김철수 + employment_contract_치킨집직원 → worker_김철수 생성
3. admin_홍길동이 power_of_attorney_김철수에게발급 → manager_김철수 생성
```

### 시나리오 2: 법인 ABC회사의 프랜차이즈 운영
```
1. userID_이사장 → corpID_ABC회사 생성
2. userID_이사장 + business_license_ABC회사 → admin_이사장 생성 (ABC회사 명의로 운영)
3. userID_이사장 + franchise_agreement_맥도날드 → franchise_admin_이사장 생성
4. 직원 고용: employment_contract → worker 역할들 생성 (고용주는 ABC회사)
```

### 시나리오 3: 복합 역할 (한 사람이 여러 역할)
```
userID_홍길동:
├─ business_license_A사업장 → admin_A사업장
├─ employment_contract_B사업장 → worker_B사업장  
├─ power_of_attorney_B사업장 → manager_B사업장
└─ franchise_agreement_맥도날드 → franchise_admin_맥도날드

→ 컨텍스트에 따라 활성 역할 전환 필요
```

---

## 🔍 franchise_admin 상세 권한

### 기본 권한
```json
{
  "base_permissions": [
    "franchise_store_management",
    "franchise_operations_control", 
    "employee_hire_fire",
    "employee_schedule_management",
    "sales_management",
    "royalty_calculation",
    "franchisor_communication"
  ],
  
  "scope_restrictions": {
    "territory": "계약서에 명시된 영업 구역만",
    "brand": "특정 프랜차이즈 브랜드만", 
    "stores": "본인 계약 매장만"
  },
  
  "delegation_capabilities": {
    "can_delegate_to": ["manager"],
    "delegatable_permissions": [
      "employee_schedule_management",
      "employee_attendance_approval"
    ],
    "cannot_delegate": [
      "employee_hire_fire",
      "franchise_financial_reporting"
    ]
  }
}
```

---

## 🚀 구현 단계

### Phase 1: 기본 ID 체계
- user_identities 테이블
- 기본 등록 API 수정

### Phase 2: PAPER 검증 시스템
- papers 테이블
- 검증 규칙 엔진

### Phase 3: 고급 역할 관리
- role_assignments 테이블
- 권한 위임 시스템

---

## ⚠️ 주의사항

1. **역할 보유자**: 모든 ROLE은 userID에게만 부여
2. **corpID 역할**: 법인은 운영 주체일 뿐, 역할을 보유하지 않음
3. **다중 역할**: 한 사용자가 여러 역할 보유 시 컨텍스트 기반 활성화 필요
4. **권한 위임**: manager 역할의 권한은 위임한 admin에 따라 달라짐
5. **PAPER 검증**: 외부 API 연동을 통한 실시간 검증 필요

---

*문서 생성일: 2025-09-07*
*설계자: Claude Code Assistant*