# DOT Attendance Service: 아키텍처 다이어그램

## 개요

이 문서는 DOT 출석 서비스의 ID-Role-Paper 분기 아키텍처를 시각적으로 표현한 다이어그램들을 제공합니다.

## 목차
1. [전체 시스템 아키텍처](#전체-시스템-아키텍처)
2. [ID-Role-Paper 관계도](#id-role-paper-관계도)
3. [권한 검증 플로우](#권한-검증-플로우)
4. [스마트 라우팅 플로우](#스마트-라우팅-플로우)
5. [데이터베이스 스키마](#데이터베이스-스키마)
6. [API 계층 구조](#api-계층-구조)
7. [보안 아키텍처](#보안-아키텍처)

## 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph "클라이언트 계층"
        WEB[Web App<br/>Next.js]
        MOBILE[Mobile App<br/>Flutter]
        API_CLIENT[External APIs]
    end
    
    subgraph "API 게이트웨이"
        NGINX[Nginx<br/>Load Balancer]
        MW[Middleware<br/>Security & RBAC]
    end
    
    subgraph "애플리케이션 계층"
        AUTH[Authentication<br/>Service]
        IDENTITY[Identity<br/>Service]
        ROLE[Role<br/>Management]
        ATTEND[Attendance<br/>Service]
        CONTRACT[Contract<br/>Service]
    end
    
    subgraph "데이터 계층"
        SUPABASE[(Supabase<br/>PostgreSQL)]
        REDIS[(Redis<br/>Cache)]
        S3[(AWS S3<br/>File Storage)]
    end
    
    subgraph "외부 서비스"
        FCM[FCM<br/>Push Notifications]
        SMS[SMS<br/>Service]
        EMAIL[Email<br/>Service]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    API_CLIENT --> NGINX
    
    NGINX --> MW
    MW --> AUTH
    MW --> IDENTITY
    MW --> ROLE
    MW --> ATTEND
    MW --> CONTRACT
    
    AUTH --> SUPABASE
    IDENTITY --> SUPABASE
    ROLE --> SUPABASE
    ATTEND --> SUPABASE
    CONTRACT --> SUPABASE
    
    AUTH --> REDIS
    ROLE --> REDIS
    
    CONTRACT --> S3
    
    ATTEND --> FCM
    AUTH --> SMS
    AUTH --> EMAIL
```

## ID-Role-Paper 관계도

```mermaid
erDiagram
    UNIFIED_IDENTITIES {
        uuid id PK
        varchar email
        varchar full_name
        varchar id_type
        varchar business_verification_status
        jsonb business_verification_data
        uuid auth_user_id FK
        boolean is_verified
        boolean is_active
        timestamp created_at
    }
    
    USER_ROLES {
        uuid id PK
        uuid employee_id FK
        uuid organization_id
        varchar role_type
        boolean is_active
        timestamp granted_at
        uuid granted_by FK
    }
    
    CONTRACTS {
        uuid id PK
        uuid employee_id FK
        uuid organization_id
        varchar contract_type
        date start_date
        date end_date
        varchar status
        decimal wage_amount
        varchar wage_type
        boolean is_minor
        varchar parent_consent_file
        jsonb terms
        boolean is_active
    }
    
    ORGANIZATIONS {
        uuid id PK
        varchar name
        varchar code
        varchar biz_type
        varchar biz_number
        boolean is_active
    }
    
    UNIFIED_IDENTITIES ||--o{ USER_ROLES : "has many"
    UNIFIED_IDENTITIES ||--o{ CONTRACTS : "has many"
    ORGANIZATIONS ||--o{ USER_ROLES : "belongs to"
    ORGANIZATIONS ||--o{ CONTRACTS : "belongs to"
    
    UNIFIED_IDENTITIES ||--|| AUTH_USERS : "linked to"
```

## 권한 검증 플로우

```mermaid
graph TD
    A[API 요청] --> B{인증 헤더 존재?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D[JWT 토큰 검증]
    
    D --> E{토큰 유효?}
    E -->|No| C
    E -->|Yes| F[사용자 정보 추출]
    
    F --> G[통합 신원 조회]
    G --> H{신원 존재 & 활성?}
    H -->|No| I[404 User Not Found]
    H -->|Yes| J[사용자 역할 조회]
    
    J --> K{마스터 관리자?}
    K -->|Yes| L[모든 권한 허용]
    K -->|No| M[역할별 권한 검증]
    
    M --> N{필요 역할 보유?}
    N -->|No| O[403 Forbidden]
    N -->|Yes| P[조직별 필터링]
    
    P --> Q{조직 권한 확인}
    Q -->|No| O
    Q -->|Yes| R[계약 상태 확인]
    
    R --> S{활성 계약?}
    S -->|No| T[403 Contract Expired]
    S -->|Yes| U[액션별 추가 검증]
    
    U --> V{쓰기 권한 필요?}
    V -->|Yes| W{WORKER 역할?}
    W -->|Yes| O
    W -->|No| X[권한 허용]
    V -->|No| X
    
    L --> Y[감사 로그 기록]
    X --> Y
    Y --> Z[API 핸들러 실행]
```

## 스마트 라우팅 플로우

```mermaid
graph TD
    A[사용자 로그인] --> B[사용자 역할 조회]
    B --> C{역할 존재?}
    C -->|No| D[기본 대시보드]
    C -->|Yes| E[활성 역할 필터링]
    
    E --> F{단일 역할?}
    F -->|Yes| G[해당 역할 대시보드]
    F -->|No| H[다중 역할 처리]
    
    H --> I{자동 리다이렉트 설정?}
    I -->|Yes| J[최고 권한 역할 선택]
    I -->|No| K[역할 선택 화면 표시]
    
    J --> L[권한 계층 정렬]
    L --> M[최고 레벨 역할]
    M --> N[해당 대시보드 이동]
    
    K --> O[사용자 역할 선택]
    O --> P[선택된 역할 대시보드]
    
    N --> Q[마지막 접속 기록 저장]
    P --> Q
    G --> Q
    D --> Q
    
    Q --> R{사용자 선호도 존재?}
    R -->|Yes| S[선호도 기반 추천]
    R -->|No| T[기본 라우팅 완료]
    S --> T
    
    subgraph "대시보드 매핑"
        WORKER_DASH["/dashboard/worker<br/>근로자 대시보드"]
        ADMIN_DASH["/dashboard/admin<br/>관리자 대시보드"]
        MANAGER_DASH["/dashboard/manager<br/>매니저 대시보드"]
        FRANCHISE_DASH["/dashboard/franchise<br/>가맹본부 대시보드"]
    end
    
    T --> WORKER_DASH
    T --> ADMIN_DASH
    T --> MANAGER_DASH
    T --> FRANCHISE_DASH
```

## 데이터베이스 스키마

```mermaid
graph LR
    subgraph "신원 관리"
        ID[unified_identities<br/>• id (PK)<br/>• email (unique)<br/>• full_name<br/>• id_type<br/>• verification_status<br/>• auth_user_id (FK)]
    end
    
    subgraph "역할 관리"
        ROLE[user_roles<br/>• id (PK)<br/>• employee_id (FK)<br/>• organization_id<br/>• role_type<br/>• is_active<br/>• granted_at]
    end
    
    subgraph "계약 관리"
        CONTRACT[contracts<br/>• id (PK)<br/>• employee_id (FK)<br/>• organization_id<br/>• contract_type<br/>• status<br/>• wage_info]
    end
    
    subgraph "조직 관리"
        ORG[organizations<br/>• id (PK)<br/>• name<br/>• biz_type<br/>• is_active]
    end
    
    subgraph "출근 관리"
        ATTEND[attendance_records<br/>• id (PK)<br/>• user_id (FK)<br/>• organization_id<br/>• check_in_time<br/>• check_out_time<br/>• status]
    end
    
    subgraph "감사 추적"
        AUDIT[audit_logs<br/>• id (PK)<br/>• user_id<br/>• action<br/>• resource<br/>• timestamp<br/>• ip_address]
    end
    
    ID -->|1:N| ROLE
    ID -->|1:N| CONTRACT
    ID -->|1:N| ATTEND
    ID -->|1:N| AUDIT
    
    ORG -->|1:N| ROLE
    ORG -->|1:N| CONTRACT
    ORG -->|1:N| ATTEND
    
    ROLE -.->|참조| ATTEND
    CONTRACT -.->|참조| ATTEND
```

## API 계층 구조

```mermaid
graph TB
    subgraph "클라이언트 계층"
        WEB_CLIENT[Web Client]
        MOBILE_CLIENT[Mobile Client]
        API_CLIENT[API Client]
    end
    
    subgraph "API 게이트웨이 계층"
        RATE_LIMIT[Rate Limiting]
        AUTH_MW[Authentication MW]
        RBAC_MW[RBAC Middleware]
        AUDIT_MW[Audit Middleware]
        SECURITY_MW[Security Middleware]
    end
    
    subgraph "API 라우트 계층"
        IDENTITY_API["/api/v2/identities<br/>• POST /create<br/>• GET /{id}<br/>• PUT /verify"]
        
        ROLE_API["/api/user-roles<br/>• GET /{user_id}<br/>• POST /create<br/>• PUT /{id}"]
        
        CONTRACT_API["/api/contracts<br/>• POST /create<br/>• PUT /status<br/>• GET /list"]
        
        ATTEND_API["/api/attendance<br/>• POST /checkin<br/>• POST /checkout<br/>• GET /history"]
        
        ADMIN_API["/api/master-admin<br/>• GET /users<br/>• POST /bulk-change<br/>• GET /audit-logs"]
    end
    
    subgraph "서비스 계층"
        IDENTITY_SVC[Identity Service]
        ROLE_SVC[Role Service]
        CONTRACT_SVC[Contract Service]
        ATTEND_SVC[Attendance Service]
        AUDIT_SVC[Audit Service]
    end
    
    subgraph "데이터 액세스 계층"
        SUPABASE_CLIENT[Supabase Client]
        CACHE_CLIENT[Redis Client]
        FILE_CLIENT[S3 Client]
    end
    
    WEB_CLIENT --> RATE_LIMIT
    MOBILE_CLIENT --> RATE_LIMIT
    API_CLIENT --> RATE_LIMIT
    
    RATE_LIMIT --> AUTH_MW
    AUTH_MW --> RBAC_MW
    RBAC_MW --> AUDIT_MW
    AUDIT_MW --> SECURITY_MW
    
    SECURITY_MW --> IDENTITY_API
    SECURITY_MW --> ROLE_API
    SECURITY_MW --> CONTRACT_API
    SECURITY_MW --> ATTEND_API
    SECURITY_MW --> ADMIN_API
    
    IDENTITY_API --> IDENTITY_SVC
    ROLE_API --> ROLE_SVC
    CONTRACT_API --> CONTRACT_SVC
    ATTEND_API --> ATTEND_SVC
    ADMIN_API --> AUDIT_SVC
    
    IDENTITY_SVC --> SUPABASE_CLIENT
    ROLE_SVC --> SUPABASE_CLIENT
    CONTRACT_SVC --> SUPABASE_CLIENT
    ATTEND_SVC --> SUPABASE_CLIENT
    AUDIT_SVC --> SUPABASE_CLIENT
    
    ROLE_SVC --> CACHE_CLIENT
    CONTRACT_SVC --> FILE_CLIENT
```

## 보안 아키텍처

```mermaid
graph TB
    subgraph "외부 위협"
        ATTACKER[공격자]
        BOT[봇/크롤러]
        DDOS[DDoS 공격]
    end
    
    subgraph "1차 방어선: 네트워크 보안"
        FIREWALL[방화벽]
        WAF[Web Application Firewall]
        CDN[CDN/DDoS Protection]
    end
    
    subgraph "2차 방어선: 애플리케이션 보안"
        RATE_LIMITER[Rate Limiting<br/>• IP별 요청 제한<br/>• 사용자별 요청 제한]
        
        INPUT_VALIDATOR[Input Validation<br/>• SQL Injection 방지<br/>• XSS 방지<br/>• CSRF 방지]
        
        AUTH_LAYER[Authentication Layer<br/>• JWT 토큰 검증<br/>• 세션 관리<br/>• MFA 지원]
    end
    
    subgraph "3차 방어선: 권한 제어"
        RBAC_ENGINE[RBAC Engine<br/>• 역할 기반 접근 제어<br/>• 조직별 권한 분리<br/>• 계약 상태 검증]
        
        PERMISSION_CACHE[Permission Cache<br/>• Redis 기반 캐싱<br/>• 성능 최적화<br/>• 자동 무효화]
    end
    
    subgraph "4차 방어선: 감시 및 대응"
        AUDIT_LOGGER[Audit Logger<br/>• 모든 액션 기록<br/>• 실시간 로깅<br/>• 이상 행위 탐지]
        
        SECURITY_MONITOR[Security Monitor<br/>• 실시간 모니터링<br/>• 자동 알림<br/>• 자동 차단]
        
        ANOMALY_DETECTOR[Anomaly Detector<br/>• 패턴 분석<br/>• 머신러닝 기반<br/>• 예측적 차단]
    end
    
    subgraph "데이터 보호"
        ENCRYPTION[Data Encryption<br/>• 전송 중 암호화 (TLS)<br/>• 저장 중 암호화<br/>• 필드 레벨 암호화]
        
        BACKUP[Backup & Recovery<br/>• 자동 백업<br/>• 포인트인타임 복구<br/>• 지리적 분산]
    end
    
    ATTACKER --> FIREWALL
    BOT --> WAF
    DDOS --> CDN
    
    FIREWALL --> RATE_LIMITER
    WAF --> INPUT_VALIDATOR
    CDN --> AUTH_LAYER
    
    RATE_LIMITER --> RBAC_ENGINE
    INPUT_VALIDATOR --> RBAC_ENGINE
    AUTH_LAYER --> RBAC_ENGINE
    
    RBAC_ENGINE --> PERMISSION_CACHE
    RBAC_ENGINE --> AUDIT_LOGGER
    
    AUDIT_LOGGER --> SECURITY_MONITOR
    SECURITY_MONITOR --> ANOMALY_DETECTOR
    
    RBAC_ENGINE -.-> ENCRYPTION
    AUDIT_LOGGER -.-> BACKUP
```

## 캐싱 전략 다이어그램

```mermaid
graph TD
    subgraph "애플리케이션 레이어"
        APP[Application]
        CACHE_MGR[Cache Manager]
    end
    
    subgraph "캐시 계층"
        L1[L1: Memory Cache<br/>• 애플리케이션 내장<br/>• 빠른 액세스<br/>• 제한된 크기]
        
        L2[L2: Redis Cache<br/>• 분산 캐시<br/>• 높은 가용성<br/>• 영속성 지원]
        
        L3[L3: Database<br/>• Supabase PostgreSQL<br/>• 최종 데이터 소스<br/>• ACID 보장]
    end
    
    subgraph "캐시 전략"
        PERMISSION_CACHE["Permission Cache<br/>TTL: 5분<br/>Key: user-{id}-permission-{hash}"]
        
        ROLE_CACHE["Role Cache<br/>TTL: 15분<br/>Key: user-{id}-roles"]
        
        ORG_CACHE["Organization Cache<br/>TTL: 1시간<br/>Key: org-{id}"]
        
        SESSION_CACHE["Session Cache<br/>TTL: 24시간<br/>Key: session-{token}"]
    end
    
    APP --> CACHE_MGR
    
    CACHE_MGR --> L1
    L1 -->|Cache Miss| L2
    L2 -->|Cache Miss| L3
    
    L3 -->|Data| L2
    L2 -->|Data| L1
    L1 -->|Data| CACHE_MGR
    
    PERMISSION_CACHE -.-> L2
    ROLE_CACHE -.-> L2
    ORG_CACHE -.-> L2
    SESSION_CACHE -.-> L2
```

## 모니터링 아키텍처

```mermaid
graph TB
    subgraph "데이터 수집"
        APP_METRICS[Application Metrics<br/>• API 응답시간<br/>• 요청 수<br/>• 에러율]
        
        SYS_METRICS[System Metrics<br/>• CPU 사용률<br/>• 메모리 사용률<br/>• 디스크 I/O]
        
        BIZ_METRICS[Business Metrics<br/>• 사용자 활동<br/>• 출근 패턴<br/>• 권한 사용량]
        
        SECURITY_EVENTS[Security Events<br/>• 로그인 실패<br/>• 권한 거부<br/>• 의심스러운 활동]
    end
    
    subgraph "데이터 처리"
        PROMETHEUS[Prometheus<br/>• 메트릭 수집<br/>• 시계열 데이터베이스<br/>• 쿼리 엔진]
        
        ELASTICSEARCH[Elasticsearch<br/>• 로그 검색<br/>• 전문 검색<br/>• 집계 분석]
        
        STREAM_PROCESSOR[Stream Processor<br/>• 실시간 처리<br/>• 이벤트 필터링<br/>• 알림 트리거]
    end
    
    subgraph "시각화 및 알림"
        GRAFANA[Grafana<br/>• 대시보드<br/>• 시각화<br/>• 알림 규칙]
        
        KIBANA[Kibana<br/>• 로그 대시보드<br/>• 보안 분석<br/>• 트렌드 분석]
        
        ALERTMANAGER[AlertManager<br/>• 알림 라우팅<br/>• 알림 그룹화<br/>• 침묵 관리]
    end
    
    subgraph "알림 채널"
        EMAIL_ALERT[Email<br/>• 관리자 알림<br/>• 보고서 전송]
        
        SLACK_ALERT[Slack<br/>• 실시간 알림<br/>• 팀 협업]
        
        SMS_ALERT[SMS<br/>• 긴급 알림<br/>• 고가용성]
        
        WEBHOOK_ALERT[Webhook<br/>• 외부 시스템<br/>• 자동화 트리거]
    end
    
    APP_METRICS --> PROMETHEUS
    SYS_METRICS --> PROMETHEUS
    BIZ_METRICS --> PROMETHEUS
    
    SECURITY_EVENTS --> ELASTICSEARCH
    APP_METRICS --> ELASTICSEARCH
    
    PROMETHEUS --> STREAM_PROCESSOR
    ELASTICSEARCH --> STREAM_PROCESSOR
    
    PROMETHEUS --> GRAFANA
    ELASTICSEARCH --> KIBANA
    STREAM_PROCESSOR --> ALERTMANAGER
    
    ALERTMANAGER --> EMAIL_ALERT
    ALERTMANAGER --> SLACK_ALERT
    ALERTMANAGER --> SMS_ALERT
    ALERTMANAGER --> WEBHOOK_ALERT
```

## 배포 아키텍처

```mermaid
graph TB
    subgraph "개발 환경"
        DEV_CODE[Source Code]
        DEV_DB[Dev Database]
        DEV_CACHE[Dev Redis]
    end
    
    subgraph "CI/CD 파이프라인"
        GITHUB[GitHub Repository]
        ACTIONS[GitHub Actions]
        BUILD[Docker Build]
        TEST[Automated Tests]
        SECURITY_SCAN[Security Scan]
        REGISTRY[Container Registry]
    end
    
    subgraph "스테이징 환경"
        STAGE_LB[Load Balancer]
        STAGE_APP[Staging App]
        STAGE_DB[Staging DB]
        STAGE_CACHE[Staging Redis]
    end
    
    subgraph "프로덕션 환경"
        PROD_CDN[CDN]
        PROD_LB[Load Balancer]
        PROD_APP1[App Instance 1]
        PROD_APP2[App Instance 2]
        PROD_APP3[App Instance 3]
        PROD_DB[Production DB<br/>Master-Slave]
        PROD_CACHE[Redis Cluster]
        PROD_BACKUP[Backup Storage]
    end
    
    subgraph "모니터링"
        MONITORING[Monitoring Stack]
        LOGS[Log Aggregation]
        ALERTS[Alert System]
    end
    
    DEV_CODE --> GITHUB
    GITHUB --> ACTIONS
    ACTIONS --> BUILD
    BUILD --> TEST
    TEST --> SECURITY_SCAN
    SECURITY_SCAN --> REGISTRY
    
    REGISTRY --> STAGE_APP
    STAGE_APP --> STAGE_DB
    STAGE_APP --> STAGE_CACHE
    STAGE_LB --> STAGE_APP
    
    REGISTRY --> PROD_APP1
    REGISTRY --> PROD_APP2
    REGISTRY --> PROD_APP3
    
    PROD_CDN --> PROD_LB
    PROD_LB --> PROD_APP1
    PROD_LB --> PROD_APP2
    PROD_LB --> PROD_APP3
    
    PROD_APP1 --> PROD_DB
    PROD_APP2 --> PROD_DB
    PROD_APP3 --> PROD_DB
    
    PROD_APP1 --> PROD_CACHE
    PROD_APP2 --> PROD_CACHE
    PROD_APP3 --> PROD_CACHE
    
    PROD_DB --> PROD_BACKUP
    
    PROD_APP1 --> MONITORING
    PROD_APP2 --> MONITORING
    PROD_APP3 --> MONITORING
    
    MONITORING --> LOGS
    MONITORING --> ALERTS
```

---

이러한 다이어그램들은 DOT 출석 서비스의 복잡한 ID-Role-Paper 분기 아키텍처를 이해하는 데 도움이 되며, 시스템의 전체적인 구조와 데이터 흐름을 시각적으로 파악할 수 있게 해줍니다.

각 다이어그램은 Mermaid 문법으로 작성되어 있어 GitHub, GitLab, 또는 다른 Markdown 지원 플랫폼에서 자동으로 렌더링됩니다.