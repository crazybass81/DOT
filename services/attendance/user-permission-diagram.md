# 📊 근로 관리 SaaS 완전한 시스템 다이어그램 세트 (Supabase 기반)

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
    
    TeenConsent --> PhoneAuth[휴대폰 본인인증<br/>NICE API]
    PhoneAuth --> CreateSupaAuth[Supabase Auth<br/>계정 생성]
    CreateSupaAuth --> RoleSelect1{역할 선택}
    
    %% 신규 가입 역할
    RoleSelect1 -->|일반 근로자| JustWorker[워커 대기 상태<br/>계약 필요]
    RoleSelect1 -->|개인사업자| IndivBizNew[국세청 API 검증<br/>→ 어드민 역할<br/>계약 불필요]
    RoleSelect1 -->|법인 설립| CorpNew[법인 아이디 생성<br/>→ 어드민 역할<br/>→ 근로계약 자동생성]
    RoleSelect1 -->|가맹본부 설립| FranNew[가맹본부 아이디 생성<br/>→ 어드민 역할<br/>→ 근로계약 자동생성]
    
    %% 기존 회원 역할 추가
    ExistingUser --> SupaLogin[Supabase Auth<br/>로그인]
    SupaLogin --> RoleSelect2{역할 추가 선택}
    
    RoleSelect2 -->|개인사업 시작| IndivBizAdd[사업자 검증<br/>→ 어드민 추가]
    RoleSelect2 -->|법인 어드민 승계| CorpAdminCheck{해당 법인<br/>직원?}
    
    CorpAdminCheck -->|예| GrantAdmin[어드민 권한 부여<br/>기존 계약 유지]
    CorpAdminCheck -->|아니오| DenyAdmin[❌ 불가<br/>먼저 입사 필요]
    
    %% Edge Functions 호출
    IndivBizNew --> EF1[Edge Function<br/>employee-register]
    CorpNew --> EF1
    FranNew --> EF1
    
    %% 최종
    JustWorker --> Complete
    EF1 --> Complete
    IndivBizAdd --> Complete
    GrantAdmin --> Complete
    
    Complete([✅ 완료])
    
    style Reject fill:#f8d7da
    style DenyAdmin fill:#f8d7da
    style CreateSupaAuth fill:#fff3cd
    style EF1 fill:#ffe6cc
    style Complete fill:#d4edda
```

## 3️⃣ Supabase 데이터베이스 스키마

```mermaid
erDiagram
    organizations {
        uuid id PK
        string name
        string code UK
        string biz_number UK
        enum biz_type "PERSONAL/CORP/FRANCHISE"
        boolean is_active
        jsonb metadata
        timestamp created_at
    }
    
    branches {
        uuid id PK
        uuid organization_id FK
        string name
        string code UK
        text address
        decimal latitude
        decimal longitude
        integer geofence_radius "30m"
        boolean is_active
    }
    
    employees {
        uuid id PK
        uuid auth_user_id FK "Supabase Auth"
        uuid organization_id FK
        uuid branch_id FK
        string employee_code UK
        string email UK
        string phone UK
        string name
        date birth_date
        string resident_id_hash "암호화"
        enum role "EMPLOYEE/MANAGER/ADMIN/MASTER_ADMIN"
        enum approval_status "PENDING/APPROVED/REJECTED"
        jsonb biometric_data "암호화"
        timestamp approved_at
    }
    
    contracts {
        uuid id PK
        uuid employee_id FK
        uuid organization_id FK
        date start_date
        date end_date
        enum status "PENDING/ACTIVE/TERMINATED"
        decimal wage
        enum wage_type "HOURLY/MONTHLY"
        jsonb terms "표준근로계약서"
        boolean is_teen "청소년여부"
        jsonb parent_consent "부모동의"
    }
    
    user_roles {
        uuid id PK
        uuid employee_id FK
        uuid organization_id FK
        enum role_type "WORKER/ADMIN/MANAGER/FRANCHISE"
        boolean is_active
        timestamp granted_at
        uuid granted_by FK
    }
    
    attendance {
        uuid id PK
        uuid employee_id FK
        uuid contract_id FK
        date work_date
        timestamp check_in_time
        timestamp check_out_time
        point check_in_location "PostGIS"
        point check_out_location "PostGIS"
        enum check_type "GPS/QR/MANUAL"
        enum status "WORKING/ON_BREAK/COMPLETED"
        integer total_minutes
        boolean kakao_sent "알림톡발송여부"
        timestamp dispute_deadline "이의신청마감"
    }
    
    breaks {
        uuid id PK
        uuid attendance_id FK
        timestamp start_time
        timestamp end_time
        integer duration_minutes
        enum status "ACTIVE/COMPLETED"
    }
    
    qr_codes {
        uuid id PK
        uuid branch_id FK
        string code UK
        timestamp valid_from
        timestamp valid_until
        boolean is_active
    }
    
    device_tokens {
        uuid id PK
        uuid employee_id FK
        string token UK
        string platform "iOS/Android/Web"
        boolean is_active
    }
    
    audit_logs {
        uuid id PK
        uuid user_id FK
        string table_name
        string action "INSERT/UPDATE/DELETE"
        jsonb old_data
        jsonb new_data
        timestamp created_at
    }
    
    organizations ||--o{ branches : has
    organizations ||--o{ employees : employs
    organizations ||--o{ contracts : manages
    branches ||--o{ qr_codes : generates
    employees ||--o{ contracts : signs
    employees ||--o{ user_roles : has
    employees ||--o{ attendance : records
    employees ||--o{ device_tokens : owns
    contracts ||--o{ attendance : tracks
    attendance ||--o{ breaks : contains
    employees ||--o{ audit_logs : generates
```

## 4️⃣ Supabase 시스템 아키텍처

```mermaid
graph TB
    subgraph "Frontend Applications"
        Web[Next.js 15.5<br/>React 19 + TypeScript<br/>Port: 3002]
        Mobile[Flutter 3.x<br/>Dart + Riverpod]
    end
    
    subgraph "Supabase Cloud"
        subgraph "Authentication"
            Auth[Supabase Auth<br/>JWT 토큰 관리<br/>Master: archt723@gmail.com]
            RLS[Row Level Security<br/>역할별 데이터 격리]
        end
        
        subgraph "Edge Functions (Deno)"
            EF1[attendance-checkin<br/>GPS/QR 검증]
            EF2[attendance-checkout<br/>퇴근 + 카톡발송]
            EF3[employee-register<br/>회원가입]
            EF4[employee-approve<br/>직원 승인]
            EF5[contract-create<br/>계약 생성]
        end
        
        subgraph "Database"
            PG[(PostgreSQL<br/>+ PostGIS<br/>+ pg_cron)]
            RT[Realtime<br/>구독/알림]
            Storage[Storage<br/>계약서/서류]
        end
    end
    
    subgraph "External APIs"
        NICE[NICE 본인인증]
        NTS[국세청 사업자검증]
        Kakao[카카오 알림톡]
        FCM[Firebase Push]
    end
    
    subgraph "Device Features"
        GPS[GPS 위치추적<br/>30m 오차]
        QR[QR Scanner]
        Bio[생체인증]
        Offline[오프라인 동기화]
    end
    
    Web --> Auth
    Mobile --> Auth
    Auth --> RLS
    RLS --> PG
    
    Web --> EF1
    Web --> EF2
    Web --> EF3
    Web --> EF4
    Web --> EF5
    
    Mobile --> EF1
    Mobile --> EF2
    Mobile --> GPS
    Mobile --> QR
    Mobile --> Bio
    Mobile --> Offline
    
    EF1 --> PG
    EF2 --> PG
    EF3 --> NICE
    EF3 --> NTS
    EF2 --> Kakao
    Mobile --> FCM
    
    PG --> RT
    RT --> Web
    RT --> Mobile
    
    EF5 --> Storage
    
    style Auth fill:#fff3cd
    style PG fill:#d4edda
    style EF1 fill:#ffe6cc
    style EF2 fill:#ffe6cc
    style EF3 fill:#ffe6cc
```

## 5️⃣ 로그인 및 권한 플로우

```mermaid
flowchart TD
    Start([시작])
    Login[Supabase Auth 로그인<br/>이메일/비밀번호]
    
    Start --> Login
    Login --> CheckMaster{Master 계정?}
    
    CheckMaster -->|예<br/>archt723@gmail.com| MasterDash[시스템 관리 페이지]
    CheckMaster -->|아니오| GetRoles[사용자 역할 조회<br/>user_roles 테이블]
    
    GetRoles --> CheckRoles{역할 확인}
    
    CheckRoles -->|워커만| WorkerFlow{계약 수?}
    CheckRoles -->|어드민/매니저| BizSelect[사업장 선택]
    CheckRoles -->|복합 역할| MultiRole[역할 선택 화면]
    
    WorkerFlow -->|1개| SingleWorker[워커 페이지 직접]
    WorkerFlow -->|여러개| ContractSelect[계약 선택]
    
    BizSelect --> BizPage[선택한 사업자 페이지<br/>RLS 적용]
    
    MultiRole --> RoleChoice{선택}
    RoleChoice -->|어드민| AdminPage[어드민 페이지들]
    RoleChoice -->|매니저| ManagerPage[매니저 페이지들]
    RoleChoice -->|워커| WorkerPage[워커 페이지들]
    RoleChoice -->|가맹본부| FranchisePage[가맹본부 페이지]
    
    style CheckMaster fill:#ffcccc
    style GetRoles fill:#fff3cd
    style BizPage fill:#d4edda
```

## 6️⃣ 출퇴근 프로세스 (Edge Functions)

```mermaid
sequenceDiagram
    participant M as Mobile App
    participant A as Supabase Auth
    participant E as Edge Functions
    participant D as Database
    participant X as External API
    
    Note over M: 출근 시나리오
    M->>A: 로그인 (JWT 토큰)
    A-->>M: 인증 토큰
    
    M->>M: GPS 위치 확인
    M->>M: QR 코드 스캔
    
    M->>E: attendance-checkin<br/>{location, qr_code}
    E->>E: JWT 검증
    E->>D: 지점 위치 조회
    E->>E: 거리 계산 (30m 이내)
    E->>D: QR 코드 유효성 확인
    E->>D: attendance 레코드 생성
    E->>M: ✅ 출근 완료
    
    Note over M: 퇴근 시나리오
    M->>E: attendance-checkout
    E->>D: 출근 기록 확인
    E->>E: 근무시간 계산
    E->>D: attendance 업데이트
    E->>X: 카카오 알림톡 API
    X-->>M: 📱 일일 근무내역
    
    Note over M: 자동 퇴근
    D->>D: pg_cron (매 30분)
    D->>D: GPS 범위 이탈 확인
    D->>E: attendance-auto-checkout
    E->>X: 확인 알림 발송
    X-->>M: "퇴근 처리할까요?"
    
    alt 응답 없음
        E->>D: 자동 퇴근 처리
        E->>X: 퇴근 알림톡
    else 응답
        M->>E: 계속 근무
        E->>D: 상태 유지
    end
```

## 7️⃣ 권한 매트릭스 (RLS 정책)

```mermaid
graph TB
    subgraph "Master Admin (시스템 관리자)"
        M1[✅ 모든 조직 데이터 읽기]
        M2[✅ 사업자 승인/정지]
        M3[✅ 시스템 설정 변경]
        M4[⚠️ 개인정보는 마스킹 처리]
        M5[❌ 급여 직접 수정 불가]
    end
    
    subgraph "Admin (사업자 관리자)"
        A1[✅ 소속 조직 전체 관리]
        A2[✅ 계약서 작성/삭제]
        A3[✅ 매니저 권한 부여]
        A4[✅ 급여 관리]
        A5[✅ 근태 승인/수정]
        A6[⚠️ 조직당 1명만]
    end
    
    subgraph "Manager (중간 관리자)"
        MG1[✅ 근태 승인]
        MG2[✅ 공지 작성]
        MG3[✅ 스케줄 관리]
        MG4[✅ 소속 지점 데이터]
        MG5[❌ 급여 정보 접근 불가]
        MG6[❌ 계약서 수정 불가]
    end
    
    subgraph "Worker (근로자)"
        W1[✅ 본인 출퇴근]
        W2[✅ 본인 기록 조회]
        W3[✅ 본인 계약서 조회]
        W4[❌ 타인 정보 접근 불가]
        W5[❌ 관리 기능 사용 불가]
    end
    
    subgraph "RLS Policies"
        P1[auth.uid() = master_id]
        P2[org_id = auth.jwt() ->> 'org_id']
        P3[branch_id = auth.jwt() ->> 'branch_id']
        P4[employee_id = auth.uid()]
    end
    
    M1 --> P1
    A1 --> P2
    MG1 --> P3
    W1 --> P4
    
    style M4 fill:#fff3cd
    style M5 fill:#ffcccc
    style A6 fill:#fff3cd
    style MG5 fill:#ffcccc
    style MG6 fill:#ffcccc
    style W4 fill:#ffcccc
    style W5 fill:#ffcccc
```

## 8️⃣ 복합 사용자 케이스

```mermaid
flowchart TD
    subgraph "김철수 - 복잡한 케이스"
        User[김철수<br/>Supabase Auth ID: uuid-123]
    end
    
    subgraph "보유 역할 (user_roles)"
        User --> R1[워커 - 4개 계약]
        User --> R2[어드민 - 2개 조직]
        User --> R3[매니저 - 1개 조직]
        User --> R4[가맹본부 직원]
    end
    
    subgraph "제어하는 조직 (organizations)"
        R2 --> Corp[C법인<br/>법인 어드민]
        R2 --> Personal[본인 개인사업자<br/>어드민]
    end
    
    subgraph "접근 가능 페이지 (8개)"
        subgraph "워커 페이지 (contracts)"
            R1 --> W1[A카페 알바]
            R1 --> W2[B식당 알바]  
            R1 --> W3[C법인 정규직]
            R1 --> W4[D가맹본부 정규직]
        end
        
        subgraph "관리 페이지"
            R2 --> A1[개인사업자 어드민]
            R2 --> A2[C법인 어드민]
            R3 --> M1[B식당 매니저]
            R4 --> F1[D가맹본부 관리]
        end
    end
    
    style User fill:#e8f5e9
    style R1 fill:#fff3cd
    style R2 fill:#ffebee
    style R3 fill:#e3f2fd
    style R4 fill:#ffe6cc
```

## 9️⃣ 특수 케이스 처리

```mermaid
graph TB
    subgraph "청소년 보호 (15-18세)"
        Teen[청소년 근로자]
        Teen --> T1[부모 동의서<br/>Supabase Storage 저장]
        Teen --> T2[부모 휴대폰 인증<br/>NICE API]
        Teen --> T3[근무 제한<br/>1일 7시간]
        Teen --> T4[주 35시간 제한<br/>pg_cron 자동 체크]
        Teen --> T5[야간 차단<br/>22:00-06:00<br/>Edge Function 검증]
    end
    
    subgraph "자동 처리 (pg_cron)"
        Auto1[30분마다 GPS 체크]
        Auto2[일일 근무시간 집계]
        Auto3[3년 지난 데이터 삭제]
        Auto4[카톡 알림 재발송]
    end
    
    subgraph "오프라인 모드"
        Off1[로컬 SQLite 저장]
        Off2[출퇴근 기록 큐잉]
        Off3[네트워크 복구시<br/>Supabase 동기화]
        Off4[충돌 해결 로직]
    end
    
    subgraph "보안 정책"
        Sec1[주민번호 암호화<br/>단방향 해시]
        Sec2[생체정보 암호화<br/>AES-256]
        Sec3[3년 후 자동삭제<br/>GDPR 준수]
        Sec4[감사 로그<br/>audit_logs 테이블]
    end
    
    style T5 fill:#ffcccc
    style Auto3 fill:#fff3cd
    style Off3 fill:#d4edda
    style Sec1 fill:#ffe6cc
```

## 🔟 배포 파이프라인

```mermaid
graph LR
    subgraph "개발 환경"
        Dev[로컬 개발<br/>localhost:3002]
        DevSupa[Supabase Local<br/>Docker]
        DevDB[(PostgreSQL<br/>localhost:54321)]
    end
    
    subgraph "스테이징"
        Stg[Vercel Preview]
        StgSupa[Supabase Project<br/>staging-xxx]
        StgDB[(PostgreSQL<br/>Supabase Cloud)]
    end
    
    subgraph "프로덕션"
        Prod[Vercel Production<br/>app.dot-attendance.com]
        ProdSupa[Supabase Project<br/>prod-xxx]
        ProdDB[(PostgreSQL<br/>Supabase Cloud)]
    end
    
    Dev --> DevSupa --> DevDB
    
    Dev -->|git push| GitHub
    GitHub -->|PR| Stg
    Stg --> StgSupa --> StgDB
    
    GitHub -->|merge main| Prod
    Prod --> ProdSupa --> ProdDB
    
    style Dev fill:#fff3cd
    style Stg fill:#ffe6cc
    style Prod fill:#d4edda
```

## 1️⃣1️⃣ 환경 변수 설정

```mermaid
graph TD
    subgraph ".env.local (Web)"
        E1[NEXT_PUBLIC_SUPABASE_URL]
        E2[NEXT_PUBLIC_SUPABASE_ANON_KEY]
        E3[SUPABASE_SERVICE_ROLE_KEY]
    end
    
    subgraph "Flutter Config"
        F1[supabaseUrl]
        F2[supabaseAnonKey]
        F3[fcmServerKey]
    end
    
    subgraph "Edge Functions Secrets"
        S1[NICE_API_KEY]
        S2[NTS_API_KEY]
        S3[KAKAO_API_KEY]
        S4[SERVICE_ROLE_KEY]
    end
    
    subgraph "사용처"
        E1 --> Web[Next.js App]
        E2 --> Web
        E3 --> API[API Routes]
        
        F1 --> Mobile[Flutter App]
        F2 --> Mobile
        F3 --> Push[Push Notifications]
        
        S1 --> Auth[본인인증]
        S2 --> Verify[사업자검증]
        S3 --> Alert[알림톡]
    end
    
    style E1 fill:#e3f2fd
    style F1 fill:#e3f2fd
    style S1 fill:#ffe6cc
```

이 다이어그램 세트는 Supabase 기반의 완전한 근로 관리 SaaS 시스템을 표현합니다. 실제 ~/desktop/DOT/services/attendance 프로젝트 구조와 완벽히 일치하며, MVP 개발에 바로 사용할 수 있습니다!