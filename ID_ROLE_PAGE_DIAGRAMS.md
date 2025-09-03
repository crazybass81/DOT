죄송합니다! 머메이드 다이어그램을 캔버스에서 제대로 렌더링해드리겠습니다.

## 사용자 권한 시스템 다이어그램

### 1. 아이디 체계와 역할 구조

```mermaid
graph TB
    subgraph "로그인 체계"
        PersonalID["🔑 개인 아이디<br/>(모든 사용자 필수 로그인)"]
    end
    
    subgraph "아이디 유형"
        PersonalType["개인 아이디"]
        FranchiseType["가맹본부 아이디"]
        CorporateType["법인 아이디"]
    end
    
    subgraph "역할 4종"
        Worker["👷 워커 (근로자)"]
        Admin["👔 어드민 (사업주)"]
        Manager["📊 매니저 (관리자)"]
        Franchise["🏪 가맹본부"]
    end
    
    subgraph "페이지 단위"
        BusinessDashboard["📋 사업자 대시보드<br/>(사업자등록증당 1개)"]
        ContractDashboard["📄 계약서 대시보드<br/>(근로계약서당 1개)"]
    end
    
    PersonalID --> PersonalType
    PersonalID -.제어.-> FranchiseType
    PersonalID -.제어.-> CorporateType
    
    PersonalID ==> Worker
    PersonalID ==> Admin
    PersonalID ==> Manager
    PersonalID ==> Franchise
    
    Admin --> BusinessDashboard
    Manager --> BusinessDashboard
    Franchise --> BusinessDashboard
    Worker --> ContractDashboard
```

### 2. 사용 케이스별 다이어그램

#### Case 1: 단순 워커 (알바생)
```mermaid
graph LR
    User1["김알바<br/>(개인ID)"] --> Role1["워커 역할"]
    Role1 --> Contract1["📄 A카페 계약서 대시보드"]
```

#### Case 2: 워커 + 매니저
```mermaid
graph TD
    User2["이직원<br/>(개인ID)"] --> Role2A["워커 역할"]
    User2 --> Role2B["매니저 역할"]
    
    Role2A --> Contract2A["📄 A카페 워커 대시보드"]
    Role2A --> Contract2B["📄 B마트 워커 대시보드"]
    Role2B --> Business2["📋 B마트 매니저 대시보드"]
```

#### Case 3: 최복잡 케이스
```mermaid
graph TD
    User["김만능<br/>(개인ID 로그인)"]
    
    User --> RoleW["👷 워커"]
    User --> RoleA["👔 어드민"]
    User --> RoleM["📊 매니저"]
    
    RoleA --> B1["📋 본인 개인사업자<br/>어드민 페이지"]
    RoleM --> B2["📋 타인 개인사업자<br/>매니저 페이지"]
    RoleA --> B3["📋 법인<br/>어드민 페이지"]
    RoleM --> B4["📋 가맹본부<br/>매니저 페이지"]
    
    RoleW --> C1["📄 알바 워커 페이지"]
    RoleW --> C2["📄 타 개인사업자<br/>워커 페이지"]
    RoleW --> C3["📄 법인 워커 페이지"]
    RoleW --> C4["📄 가맹본부<br/>워커 페이지"]
```

### 3. 데이터 관계도

```mermaid
erDiagram
    개인아이디 ||--o{ 역할 : "보유"
    개인아이디 ||--o| 가맹본부아이디 : "제어"
    개인아이디 ||--o| 법인아이디 : "제어"
    
    역할 ||--o{ 사업자페이지 : "접근"
    역할 ||--o{ 계약서페이지 : "접근"
    
    사업자페이지 ||--|| 사업자등록증 : "대응"
    계약서페이지 ||--|| 근로계약서 : "대응"
    
    개인아이디 {
        string id PK
        string 이름
        string 전화번호
        string 이메일
    }
    
    역할 {
        string 역할유형
        string 사업체ID
        string 권한범위
    }
    
    사업자페이지 {
        string 페이지ID PK
        string 사업자번호
        string 접근권한
    }
    
    계약서페이지 {
        string 페이지ID PK
        string 계약서번호
        string 워커ID
    }
```

캔버스에서 다이어그램이 제대로 보이시나요? 머메이드 형식으로 작성했는데, 혹시 다른 형식(플로우차트, 이미지 등)으로 다시 만들어드릴까요?