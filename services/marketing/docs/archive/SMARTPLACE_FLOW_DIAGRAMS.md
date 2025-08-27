# SmartPlace 시스템 플로우 다이어그램

## 1. 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph Frontend["Frontend Layer"]
        UI[SmartPlace URL Input]
        Profile[Store Profile Display]
        Matches[Creator Match Results]
        Email[Email Management]
    end
    
    subgraph API["API Layer"]
        API1[/api/smartplace/analyze]
        API2[/api/creators/match]
        API3[/api/email/generate]
        API4[/api/email/send]
    end
    
    subgraph Business["Business Logic Layer"]
        Scraper[SmartPlace Scraper]
        Analyzer[Store Analyzer]
        Matcher[AI Matching Engine]
        Template[Template Generator]
    end
    
    subgraph External["External Services"]
        Naver[Naver SmartPlace]
        YouTube[YouTube Data API]
        OpenAI[OpenAI API]
        SES[AWS SES]
    end
    
    subgraph Storage["Data Storage"]
        Cache[(Cache Store Profiles)]
        DB[(DynamoDB Campaigns)]
    end
    
    UI --> API1
    API1 --> Scraper
    Scraper --> Naver
    Scraper --> Analyzer
    Analyzer --> Cache
    
    Profile --> API2
    API2 --> Matcher
    Matcher --> YouTube
    Matcher --> OpenAI
    
    Matches --> API3
    API3 --> Template
    Template --> OpenAI
    
    Email --> API4
    API4 --> SES
    API4 --> DB
    
    style UI fill:#e1f5fe
    style Naver fill:#2db400
    style YouTube fill:#ff0000
    style OpenAI fill:#412991
    style SES fill:#ff9900
```

## 2. SmartPlace 분석 프로세스

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Scraper
    participant Naver
    participant Analyzer
    participant Cache
    
    User->>Frontend: 네이버 URL 입력
    Frontend->>API: POST /api/smartplace/analyze
    API->>Cache: 캐시 확인
    
    alt 캐시 미스
        API->>Scraper: 스크래핑 시작
        Scraper->>Naver: 페이지 요청
        Naver-->>Scraper: HTML 응답
        
        loop 데이터 수집
            Scraper->>Naver: 기본정보 추출
            Scraper->>Naver: 메뉴 추출
            Scraper->>Naver: 리뷰 추출
            Scraper->>Naver: 이미지 추출
        end
        
        Scraper->>Analyzer: 원시 데이터 전달
        Analyzer->>Analyzer: 감성 분석
        Analyzer->>Analyzer: 타겟층 분석
        Analyzer->>Analyzer: 키워드 추출
        Analyzer->>Cache: Profile 저장
    end
    
    Cache-->>API: Store Profile
    API-->>Frontend: 분석 결과
    Frontend-->>User: Profile 표시
```

## 3. AI 매칭 프로세스

```mermaid
flowchart LR
    subgraph "Input"
        SP[Store Profile]
    end
    
    subgraph "Query Generation"
        QG1[직접 매칭<br/>지역+카테고리]
        QG2[타겟층 기반<br/>연령대+관심사]
        QG3[특성 기반<br/>분위기+특징]
    end
    
    subgraph "Creator Search"
        YT1[YouTube API<br/>검색 실행]
        YT2[채널 정보<br/>수집]
        YT3[최근 영상<br/>분석]
    end
    
    subgraph "Scoring"
        S1[카테고리<br/>매칭<br/>30%]
        S2[지역<br/>매칭<br/>20%]
        S3[타겟층<br/>매칭<br/>25%]
        S4[스타일<br/>매칭<br/>15%]
        S5[영향력<br/>지수<br/>10%]
    end
    
    subgraph "Output"
        Result[매칭 결과<br/>+ 점수<br/>+ 이유]
    end
    
    SP --> QG1 & QG2 & QG3
    QG1 & QG2 & QG3 --> YT1
    YT1 --> YT2 --> YT3
    YT3 --> S1 & S2 & S3 & S4 & S5
    S1 & S2 & S3 & S4 & S5 --> Result
```

## 4. 매칭 점수 계산 상세

```mermaid
graph TD
    subgraph "입력 데이터"
        Store[Store Profile]
        Creator[Creator Info]
    end
    
    subgraph "카테고리 매칭 30%"
        C1[정확 일치<br/>100점]
        C2[관련 카테고리<br/>70점]
        C3[일반 음식<br/>40점]
        C4[무관<br/>0점]
    end
    
    subgraph "지역 매칭 20%"
        L1[같은 구<br/>100점]
        L2[같은 시<br/>70점]
        L3[인근 지역<br/>40점]
        L4[전국<br/>20점]
    end
    
    subgraph "타겟층 매칭 25%"
        T1[연령대 일치]
        T2[관심사 일치]
        T3[방문 패턴 일치]
    end
    
    subgraph "스타일 매칭 15%"
        ST1[콘텐츠 유형]
        ST2[제작 퀄리티]
        ST3[분위기 적합도]
    end
    
    subgraph "영향력 지수 10%"
        I1[구독자 수]
        I2[평균 조회수]
        I3[참여도]
    end
    
    subgraph "최종 점수"
        Final[가중 평균<br/>0-100점]
    end
    
    Store --> C1 & C2 & C3 & C4
    Creator --> C1 & C2 & C3 & C4
    
    Store --> L1 & L2 & L3 & L4
    Creator --> L1 & L2 & L3 & L4
    
    Store --> T1 & T2 & T3
    Creator --> T1 & T2 & T3
    
    Store --> ST1 & ST2 & ST3
    Creator --> ST1 & ST2 & ST3
    
    Creator --> I1 & I2 & I3
    
    C1 & C2 & C3 & C4 --> Final
    L1 & L2 & L3 & L4 --> Final
    T1 & T2 & T3 --> Final
    ST1 & ST2 & ST3 --> Final
    I1 & I2 & I3 --> Final
    
    style Final fill:#ffd700
```

## 5. 이메일 템플릿 생성 플로우

```mermaid
stateDiagram-v2
    [*] --> Input: Store + Creator + Match
    
    Input --> Analysis: 매칭 포인트 분석
    
    Analysis --> TemplateSelection: 템플릿 선택
    state TemplateSelection {
        협업제안: 일반 협업
        리뷰요청: 제품/음식 리뷰
        방문요청: 매장 방문
        이벤트: 특별 이벤트
        파트너십: 장기 협업
    }
    
    TemplateSelection --> Personalization: 개인화
    state Personalization {
        공통관심사: 매칭된 키워드 삽입
        강점언급: 가게 특징 강조
        크리에이터특성: 채널 특성 언급
        구체적제안: 협업 방식 제시
    }
    
    Personalization --> AIGeneration: AI 최적화
    
    AIGeneration --> FinalTemplate: 최종 템플릿
    
    FinalTemplate --> [*]
```

## 6. 데이터 파이프라인

```mermaid
graph LR
    subgraph "Data Collection"
        SC[SmartPlace<br/>Scraping]
        YT[YouTube<br/>API]
        AI[OpenAI<br/>Analysis]
    end
    
    subgraph "Processing"
        Parse[Parsing &<br/>Normalization]
        Enrich[Data<br/>Enrichment]
        Score[Scoring &<br/>Ranking]
    end
    
    subgraph "Storage"
        Cache[Redis<br/>Cache]
        DB[DynamoDB]
        S3[S3<br/>Images]
    end
    
    subgraph "Delivery"
        API[REST API]
        WS[WebSocket]
        Email[Email<br/>Service]
    end
    
    SC --> Parse
    YT --> Parse
    AI --> Enrich
    
    Parse --> Enrich
    Enrich --> Score
    
    Score --> Cache
    Score --> DB
    SC --> S3
    
    Cache --> API
    DB --> API
    API --> WS
    API --> Email
    
    style SC fill:#2db400
    style YT fill:#ff0000
    style AI fill:#412991
```

## 7. 에러 처리 플로우

```mermaid
flowchart TD
    Start([요청 시작])
    
    Validate{URL 유효성}
    Start --> Validate
    
    Validate -->|유효| CheckCache{캐시 확인}
    Validate -->|무효| Error1[400: Invalid URL]
    
    CheckCache -->|Hit| ReturnCache[캐시 반환]
    CheckCache -->|Miss| Scrape{스크래핑}
    
    Scrape -->|성공| Analyze{분석}
    Scrape -->|실패| Retry1{재시도}
    
    Retry1 -->|성공| Analyze
    Retry1 -->|실패| Error2[503: Scraping Failed]
    
    Analyze -->|성공| Match{매칭}
    Analyze -->|실패| Error3[500: Analysis Failed]
    
    Match -->|성공| Success[결과 반환]
    Match -->|실패| Error4[500: Matching Failed]
    
    Error1 --> ErrorHandler
    Error2 --> ErrorHandler
    Error3 --> ErrorHandler
    Error4 --> ErrorHandler
    
    ErrorHandler[에러 처리<br/>- 로깅<br/>- 알림<br/>- 사용자 안내]
    
    ReturnCache --> End([완료])
    Success --> End
    ErrorHandler --> End
    
    style Error1 fill:#ff6b6b
    style Error2 fill:#ff6b6b
    style Error3 fill:#ff6b6b
    style Error4 fill:#ff6b6b
    style Success fill:#51cf66
    style ReturnCache fill:#51cf66
```

## 8. 캐싱 전략

```mermaid
graph TD
    subgraph "Cache Layers"
        L1[Browser Cache<br/>1시간]
        L2[CDN Cache<br/>6시간]
        L3[Redis Cache<br/>24시간]
        L4[DynamoDB<br/>영구저장]
    end
    
    subgraph "Cache Key Structure"
        K1["store:{url_hash}"]
        K2["match:{store_id}:{filters}"]
        K3["template:{store_id}:{creator_id}"]
    end
    
    subgraph "Invalidation"
        I1[TTL 만료]
        I2[수동 갱신]
        I3[Webhook 트리거]
    end
    
    Request[요청] --> L1
    L1 -->|Miss| L2
    L2 -->|Miss| L3
    L3 -->|Miss| L4
    L4 -->|Miss| Generate[신규 생성]
    
    Generate --> L4
    L4 --> L3
    L3 --> L2
    L2 --> L1
    L1 --> Response[응답]
    
    I1 & I2 & I3 --> L1 & L2 & L3
    
    style L1 fill:#e3f2fd
    style L2 fill:#e8f5e9
    style L3 fill:#fff3e0
    style L4 fill:#fce4ec
```