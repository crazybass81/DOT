감사합니다! 이제 구조가 명확해졌네요. 추가로 유추한 조건들과 함께 전체 다이어그램을 작성하겠습니다.

## 📊 추가 유추 조건

1. **개인사업자도 어드민은 1명만** (법인과 동일)
2. **Master는 모든 페이지 읽기 권한** (단, 개인정보는 마스킹)
3. **한 개인이 여러 조직의 어드민 가능** (단, 각 조직당 어드민은 1명)
4. **역할 우선순위**: 같은 사업자에서 워커이면서 매니저인 경우 → 매니저 권한 우선

## 🔄 전체 시스템 구조 다이어그램

```mermaid
graph TB
    subgraph "1. 아이디 계층 (로그인 단위)"
        Master[Master ID<br/>시스템 관리자]
        PersonalID[개인 아이디<br/>일반 사용자]
        
        subgraph "조직 아이디 (개인이 제어)"
            CorpID[법인 아이디]
            FranchiseID[가맹본부 아이디]
        end
    end
    
    subgraph "2. 역할 계층 (권한 단위)"
        MasterRole[Master 역할<br/>시스템 전체 관리]
        WorkerRole[워커 역할<br/>근로자]
        AdminRole[어드민 역할<br/>사업자 관리자]
        ManagerRole[매니저 역할<br/>중간 관리자]
        FranchiseRole[가맹본부 역할<br/>가맹점 관리]
    end
    
    subgraph "3. 페이지 계층 (접근 단위)"
        subgraph "사업자 페이지"
            IndivBizPage[개인사업자 페이지]
            CorpBizPage[법인사업자 페이지]
            FranchiseMgmtPage[가맹본부 관리 페이지]
        end
        
        subgraph "워커 페이지"
            WorkerPageA[워커 페이지<br/>계약서별 생성]
        end
        
        SystemPage[시스템 관리 페이지]
    end
    
    %% 관계 정의
    Master --> MasterRole
    PersonalID --> WorkerRole
    PersonalID --> AdminRole
    PersonalID --> ManagerRole
    PersonalID --> FranchiseRole
    PersonalID -.제어.-> CorpID
    PersonalID -.제어.-> FranchiseID
    
    AdminRole --> IndivBizPage
    AdminRole --> CorpBizPage
    ManagerRole --> IndivBizPage
    ManagerRole --> CorpBizPage
    FranchiseRole --> FranchiseMgmtPage
    WorkerRole --> WorkerPageA
    MasterRole --> SystemPage
    
    classDef masterClass fill:#ffcccc
    classDef idClass fill:#cce5ff
    classDef roleClass fill:#ffffcc
    classDef pageClass fill:#e6ccff
    
    class Master,MasterRole,SystemPage masterClass
    class PersonalID,CorpID,FranchiseID idClass
    class WorkerRole,AdminRole,ManagerRole,FranchiseRole roleClass
    class IndivBizPage,CorpBizPage,FranchiseMgmtPage,WorkerPageA pageClass
```

## 🔀 복합 사례 플로우

```mermaid
flowchart LR
    subgraph "복잡한 사용자 예시"
        User[김철수<br/>개인 아이디]
    end
    
    subgraph "보유 역할"
        User --> R1[워커]
        User --> R2[어드민]
        User --> R3[매니저]
    end
    
    subgraph "접근 가능 페이지"
        R1 --> W1[A카페 워커페이지<br/>알바 계약]
        R1 --> W2[B식당 워커페이지<br/>알바 계약]
        R1 --> W3[C법인 워커페이지<br/>정규직 계약]
        R1 --> W4[D가맹본부 워커페이지<br/>정규직 계약]
        
        R2 --> A1[본인 개인사업자<br/>어드민 페이지]
        R2 --> A2[C법인<br/>어드민 페이지]
        
        R3 --> M1[B식당<br/>매니저 페이지]
        R3 --> M2[D가맹본부<br/>매니저 페이지]
    end
    
    style User fill:#e8f5e9
    style R1 fill:#fff3e0
    style R2 fill:#ffebee
    style R3 fill:#e3f2fd
```

## 📊 데이터 관계도 (ERD)

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string name
        string phone
        boolean is_master
    }
    
    ORGANIZATIONS {
        uuid id PK
        string type "INDIVIDUAL/CORP/FRANCHISE"
        string biz_number UK
        string name
        uuid admin_id FK "1개 조직당 1명"
    }
    
    USER_ROLES {
        uuid id PK
        uuid user_id FK
        uuid org_id FK
        string role_type "WORKER/ADMIN/MANAGER/FRANCHISE"
        boolean is_active
    }
    
    CONTRACTS {
        uuid id PK
        uuid worker_id FK
        uuid org_id FK
        date start_date
        date end_date
        string status
    }
    
    PAGES {
        uuid id PK
        string page_type "BIZ/WORKER/SYSTEM"
        uuid org_id FK "NULL for worker pages"
        uuid contract_id FK "NULL for biz pages"
    }
    
    PAGE_ACCESS {
        uuid user_id FK
        uuid page_id FK
        string access_level "READ/WRITE/ADMIN"
    }
    
    USERS ||--o{ USER_ROLES : "has"
    USERS ||--o{ ORGANIZATIONS : "controls as admin"
    ORGANIZATIONS ||--o{ USER_ROLES : "has members"
    ORGANIZATIONS ||--o{ CONTRACTS : "creates"
    USERS ||--o{ CONTRACTS : "signs as worker"
    CONTRACTS ||--|| PAGES : "generates worker page"
    ORGANIZATIONS ||--o{ PAGES : "has biz pages"
    USERS ||--o{ PAGE_ACCESS : "accesses"
    PAGES ||--o{ PAGE_ACCESS : "accessed by"
```

이 구조가 의도하신 시스템과 일치하나요? 수정이나 보완이 필요한 부분이 있으면 알려주세요!