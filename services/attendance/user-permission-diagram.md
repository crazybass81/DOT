# 📊 근로 관리 SaaS 완벽한 시스템 다이어그램 세트

## 1️⃣ 전체 시스템 구조도

```mermaid
graph TB
    subgraph "1. 아이디 계층 (로그인 단위)"
        Master[Master ID<br/>시스템 관리자<br/>archt723@gmail.com]
        PersonalID[개인 아이디<br/>모든 일반 사용자]
        
        subgraph "조직 아이디 (개인이 제어)"
            CorpID[법인 아이디<br/>법인 설립자가 생성]
            FranchiseID[가맹본부 아이디<br/>가맹본부 설립자가 생성]
        end
    end
    
    subgraph "2. 사업자 구분 (2종)"
        IndivBiz[개인사업자<br/>개인 아이디가 직접 운영]
        CorpBiz[법인사업자<br/>법인 아이디 통해 운영]
    end
    
    subgraph "3. 역할 계층 (권한 단위)"
        WorkerRole[워커<br/>근로계약 체결자]
        AdminRole[어드민<br/>사업자 최고관리자<br/>조직당 1명]
        ManagerRole[매니저<br/>중간관리자<br/>조직당 여러명]
        FranchiseRole[가맹본부 직원<br/>가맹점 관리]
    end
    
    subgraph "4. 페이지 종류 (접근 단위)"
        subgraph "사업자 페이지"
            BizPageAdmin[사업자 페이지<br/>어드민 권한]
            BizPageManager[사업자 페이지<br/>매니저 권한]
        end
        
        FranchisePage[가맹본부 페이지<br/>가맹점 관리]
        WorkerPage[워커 페이지<br/>계약서별 1개]
        SystemPage[시스템 관리 페이지]
    end
    
    Master --> SystemPage
    PersonalID --> WorkerRole
    PersonalID --> AdminRole
    PersonalID --> ManagerRole
    PersonalID --> FranchiseRole
    PersonalID -.제어.-> CorpID
    PersonalID -.제어.-> FranchiseID
    
    AdminRole --> BizPageAdmin
    ManagerRole --> BizPageManager
    FranchiseRole --> FranchisePage
    WorkerRole --> WorkerPage
    
    classDef masterClass fill:#ffcccc
    classDef idClass fill:#cce5ff
    classDef bizClass fill:#d4edda
    classDef roleClass fill:#fff3cd
    classDef pageClass fill:#e7d4f0
    
    class Master,SystemPage masterClass
    class PersonalID,CorpID,FranchiseID idClass
    class IndivBiz,CorpBiz bizClass
    class WorkerRole,AdminRole,ManagerRole,FranchiseRole roleClass
    class BizPageAdmin,BizPageManager,WorkerPage,FranchisePage pageClass
```

## 2️⃣ 회원가입 및 역할 관리 플로우

```mermaid
flowchart TD
    Start([시작])
    
    Start --> CheckAccount{개인 아이디<br/>있나?}
    
    CheckAccount -->|없음| NewUser[신규 회원가입]
    CheckAccount -->|있음| ExistingUser[기존 회원<br/>역할 추가]
    
    %% 신규 회원가입 경로
    NewUser --> BasicInfo[기본정보 입력<br/>이름, 이메일, 휴대폰]
    BasicInfo --> AgeCheck{만 15세 이상?}
    
    AgeCheck -->|15세 미만| Reject[❌ 가입 불가]
    AgeCheck -->|15-18세| TeenConsent[부모 동의<br/>부모 휴대폰 인증]
    AgeCheck -->|18세 이상| PhoneAuth
    
    TeenConsent --> PhoneAuth[휴대폰 본인인증]
    PhoneAuth --> CreatePersonalID[개인 아이디 생성]
    CreatePersonalID --> RoleSelect1{역할 선택}
    
    %% 신규 가입 역할
    RoleSelect1 -->|일반 근로자| JustWorker[워커 대기 상태<br/>계약 필요]
    RoleSelect1 -->|개인사업자| IndivBizNew[사업자 검증<br/>→ 어드민 역할<br/>계약 불필요]
    RoleSelect1 -->|법인 설립| CorpNew[법인 아이디 생성<br/>→ 어드민 역할<br/>→ 근로계약 생성]
    RoleSelect1 -->|가맹본부 설립| FranNew[가맹본부 아이디 생성<br/>→ 어드민 역할<br/>→ 근로계약 생성]
    
    %% 기존 회원 역할 추가
    ExistingUser --> Login[로그인]
    Login --> RoleSelect2{역할 추가 선택}
    
    RoleSelect2 -->|개인사업 시작| IndivBizAdd[사업자 검증<br/>→ 어드민 추가]
    RoleSelect2 -->|법인 어드민 승계| CorpAdminCheck{해당 법인<br/>직원?}
    
    CorpAdminCheck -->|예| GrantAdmin[어드민 권한 부여<br/>기존 계약 유지]
    CorpAdminCheck -->|아니오| DenyAdmin[❌ 불가<br/>먼저 입사 필요]
    
    %% 최종
    JustWorker --> Complete
    IndivBizNew --> Complete
    CorpNew --> Complete
    FranNew --> Complete
    IndivBizAdd --> Complete
    GrantAdmin --> Complete
    
    Complete([✅ 완료])
    
    style Reject fill:#f8d7da
    style DenyAdmin fill:#f8d7da
    style CorpNew fill:#cce5ff
    style FranNew fill:#ffe6cc
    style Complete fill:#d4edda
```

## 3️⃣ 복합 사용자 케이스

```mermaid
flowchart TD
    subgraph "김철수 - 최대 복잡도 예시"
        User[김철수<br/>개인 아이디]
    end
    
    subgraph "제어하는 조직"
        User -.제어.-> Corp[C법인 아이디]
        User -.제어.-> Franchise[D가맹본부 아이디]
    end
    
    subgraph "보유 역할 (4종)"
        User --> R1[워커 - 4개 계약]
        User --> R2[어드민 - 2개 조직]
        User --> R3[매니저 - 1개 조직]
        User --> R4[가맹본부 직원]
    end
    
    subgraph "접근 페이지 (총 8개)"
        subgraph "워커 페이지 (4)"
            R1 --> W1[A카페 알바]
            R1 --> W2[B식당 알바]
            R1 --> W3[C법인 정규직]
            R1 --> W4[D가맹본부 정규직]
        end
        
        subgraph "어드민 페이지 (2)"
            R2 --> A1[본인 개인사업자]
            R2 --> A2[C법인 어드민]
        end
        
        subgraph "매니저 페이지 (1)"
            R3 --> M1[B식당 매니저]
        end
        
        subgraph "가맹본부 페이지 (1)"
            R4 --> F1[D가맹본부 관리]
        end
    end
    
    style User fill:#e8f5e9
    style R1 fill:#fff3cd
    style R2 fill:#ffebee
    style R3 fill:#e3f2fd
    style R4 fill:#ffe6cc
```

## 4️⃣ 데이터베이스 ERD

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string phone UK
        string name
        boolean is_master
        string resident_id_hash "암호화"
        string personal_biz_number "개인사업자"
        date birth_date
    }
    
    CORP_ACCOUNTS {
        uuid id PK
        string corp_name
        string biz_number UK
        uuid creator_user_id FK
        uuid current_admin_id FK "현재 어드민"
        date created_at
    }
    
    FRANCHISE_ACCOUNTS {
        uuid id PK
        string franchise_name
        string biz_number UK
        uuid creator_user_id FK
        uuid current_admin_id FK
        date created_at
    }
    
    CONTRACTS {
        uuid id PK
        uuid worker_user_id FK
        string biz_number FK
        string biz_type "PERSONAL/CORP/FRANCHISE"
        date start_date
        date end_date
        string status "PENDING/ACTIVE/TERMINATED"
        decimal wage
        string wage_type "HOURLY/MONTHLY"
    }
    
    USER_ROLES {
        uuid id PK
        uuid user_id FK
        string biz_number FK
        string role "WORKER/ADMIN/MANAGER"
        boolean is_active
        date granted_at
    }
    
    PAGES {
        uuid id PK
        string page_type "BIZ_ADMIN/BIZ_MANAGER/WORKER/FRANCHISE/SYSTEM"
        string biz_number FK
        uuid contract_id FK "워커페이지용"
    }
    
    WORK_RECORDS {
        uuid id PK
        uuid contract_id FK
        date work_date
        time check_in
        time check_out
        decimal latitude
        decimal longitude
        string check_type "GPS/QR"
    }
    
    USERS ||--o{ CONTRACTS : "signs"
    USERS ||--o{ USER_ROLES : "has"
    USERS ||--o| CORP_ACCOUNTS : "creates/admins"
    USERS ||--o| FRANCHISE_ACCOUNTS : "creates/admins"
    CONTRACTS ||--|| PAGES : "generates worker page"
    CONTRACTS ||--o{ WORK_RECORDS : "records"
    USER_ROLES }o--|| PAGES : "accesses biz pages"
```

## 5️⃣ 로그인 및 페이지 선택 플로우

```mermaid
flowchart LR
    Start([로그인])
    Login[개인 아이디 입력]
    Auth[인증 성공]
    
    Start --> Login --> Auth
    
    Auth --> CheckRole{역할 확인}
    
    CheckRole -->|워커만| SingleWorker{계약 수}
    CheckRole -->|어드민/매니저| BizSelect[사업장 선택]
    CheckRole -->|복합 역할| MultiRole[역할 선택 화면]
    
    SingleWorker -->|1개| DirectWorker[워커 페이지 직접 이동]
    SingleWorker -->|여러개| SelectContract[계약 선택]
    
    MultiRole -->|어드민 선택| AdminPages[어드민 페이지 목록]
    MultiRole -->|매니저 선택| ManagerPages[매니저 페이지 목록]
    MultiRole -->|워커 선택| WorkerPages[워커 페이지 목록]
    MultiRole -->|가맹본부 선택| FranchiseMain[가맹본부 페이지]
    
    style Auth fill:#d4edda
    style CheckRole fill:#fff3cd
```

## 6️⃣ 권한 매트릭스

```mermaid
graph LR
    subgraph "Master (시스템 관리자)"
        M1[✓ 시스템 모니터링]
        M2[✓ 사업자 승인/정지]
        M3[✓ 분쟁 조정]
        M4[❌ 개인정보 직접 열람]
        M5[❌ 급여 정보 접근]
    end
    
    subgraph "Admin (사업자 관리자)"
        A1[✓ 계약서 작성/삭제]
        A2[✓ 매니저 권한 부여]
        A3[✓ 급여 관리]
        A4[✓ 모든 근태 관리]
        A5[✓ 직원 정보 관리]
        A6[조직당 1명만]
    end
    
    subgraph "Manager (중간 관리자)"
        MG1[✓ 근태 승인]
        MG2[✓ 공지 작성]
        MG3[✓ 스케줄 관리]
        MG4[❌ 급여 열람]
        MG5[❌ 계약서 작성]
        MG6[조직당 여러명 가능]
    end
    
    subgraph "Worker (근로자)"
        W1[✓ 본인 출퇴근]
        W2[✓ 본인 기록 조회]
        W3[✓ 본인 계약서 조회]
        W4[❌ 타인 정보]
        W5[❌ 관리 기능]
    end
    
    subgraph "Franchise (가맹본부)"
        F1[✓ 가맹점 현황]
        F2[✓ 통합 통계]
        F3[✓ 일괄 공지]
        F4[❌ 개별 급여 정보]
        F5[❌ 개인정보 상세]
    end
    
    style M4 fill:#ffcccc
    style M5 fill:#ffcccc
    style MG4 fill:#ffcccc
    style MG5 fill:#ffcccc
    style W4 fill:#ffcccc
    style W5 fill:#ffcccc
    style F4 fill:#ffcccc
    style F5 fill:#ffcccc
    style A6 fill:#fff3cd
    style MG6 fill:#d4edda
```

## 7️⃣ 특수 케이스 처리

```mermaid
graph TB
    subgraph "청소년 (15-18세)"
        Teen[청소년 근로자]
        Teen --> T1[부모 동의서 필수]
        Teen --> T2[부모 휴대폰 인증]
        Teen --> T3[1일 7시간 제한]
        Teen --> T4[주 35시간 제한]
        Teen --> T5[야간근무 차단<br/>22:00-06:00]
    end
    
    subgraph "계약 및 페이지 생성 규칙"
        Rule1[개인사업자 = 계약 불필요]
        Rule2[법인 어드민 = 근로계약 필수]
        Rule3[가맹본부 어드민 = 근로계약 필수]
        Rule4[1계약 = 1워커페이지]
        Rule5[어드민 변경 = 기존 직원만]
    end
    
    subgraph "출퇴근 기록"
        Check1[GPS + QR 병행]
        Check2[GPS 오차 30m]
        Check3[범위 이탈 → 확인 알림]
        Check4[무응답 → 자동 퇴근]
        Check5[매일 카톡 근무내역]
    end
    
    subgraph "데이터 정책"
        Data1[3년 보관 후 자동삭제]
        Data2[접근 로그 기록]
        Data3[폐업 후 3년 조회 가능]
    end
    
    style T5 fill:#ffcccc
    style Rule1 fill:#d4edda
    style Rule2 fill:#cce5ff
    style Rule5 fill:#fff3cd
```

## 8️⃣ 시스템 아키텍처

```mermaid
graph TB
    subgraph "Frontend"
        Web[Next.js + Tailwind]
        Mobile[React Native]
    end
    
    subgraph "Backend"
        API[Node.js/Python API]
        Auth[JWT + Redis]
        Queue[Bull Queue]
    end
    
    subgraph "Database"
        PG[(PostgreSQL<br/>메인 DB)]
        Redis[(Redis<br/>세션/캐시)]
    end
    
    subgraph "External APIs"
        NICE[휴대폰 본인인증]
        NTS[국세청 사업자검증]
        Kakao[카카오 알림톡]
    end
    
    Web --> API
    Mobile --> API
    API --> PG
    API --> Redis
    API --> NICE
    API --> NTS
    API --> Kakao
    
    style Web fill:#e3f2fd
    style Mobile fill:#e3f2fd
    style API fill:#fff3cd
    style PG fill:#d4edda
```

이 다이어그램 세트가 전체 시스템을 완벽하게 표현합니다. MVP 개발 시 이 구조를 따라가면 됩니다!