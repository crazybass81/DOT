# 🏗️ DOT 플랫폼 아키텍처

## 📐 시스템 아키텍처

### 전체 구조
```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
├──────────────┬────────────────┬────────────────────────┤
│  Web App     │  Mobile App    │   Admin Dashboard      │
│  (Next.js)   │  (Flutter)     │   (Next.js)           │
└──────┬───────┴────────┬───────┴────────┬───────────────┘
       │                │                 │
       ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                    API Gateway                          │
│                    (AWS API GW)                         │
└──────────────────────┬──────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌──────────────┬──────────────┬──────────────┐
│  Attendance  │  Marketing   │  Scheduler   │
│   Service    │   Service    │   Service    │
└──────┬───────┴──────┬───────┴──────┬───────┘
       │              │               │
       ▼              ▼               ▼
┌─────────────────────────────────────────────┐
│           Data Layer (Supabase)             │
├─────────────────────────────────────────────┤
│  PostgreSQL │ Realtime │ Auth │ Storage    │
└─────────────────────────────────────────────┘
```

## 🎯 마이크로서비스 아키텍처

### 1. Attendance Service (근태관리)
```
attendance/
├── web/                 # 관리자 대시보드
│   ├── Next.js 15      # Framework
│   ├── TypeScript      # Language
│   └── Tailwind CSS    # Styling
│
├── mobile/             # 직원 모바일 앱
│   ├── Flutter 3.x     # Framework
│   ├── Riverpod        # State Management
│   └── Neo Brutal      # Theme
│
└── supabase/           # Backend
    ├── PostgreSQL      # Database
    ├── Realtime        # WebSocket
    └── Edge Functions  # Serverless
```

### 2. Marketing Service (마케팅 자동화)
```
marketing/
├── web/                # 캠페인 관리 UI
│   └── Next.js        # Framework
│
├── scraper-python/    # 데이터 수집
│   ├── FastAPI        # API Framework
│   ├── Selenium       # Web Scraping
│   └── BeautifulSoup  # HTML Parsing
│
└── matcher/           # AI 매칭 엔진
    └── Python         # ML/AI Logic
```

### 3. Scheduler Service (스케줄 관리)
```
scheduler/
├── web/               # 스케줄 관리 UI
└── api/               # 스케줄링 로직
```

## 🔄 데이터 플로우

### 출퇴근 프로세스
```
1. 직원 모바일 앱 → QR 스캔
2. API Gateway → 인증 검증
3. Attendance Service → 기록 저장
4. Supabase Realtime → 관리자 대시보드 업데이트
5. 관리자 → 승인/수정
```

### 마케팅 매칭 프로세스
```
1. 크롤러 → 크리에이터 데이터 수집
2. AI Engine → 매칭 스코어 계산
3. 매칭 결과 → 캠페인 매니저 알림
4. 승인 → 크리에이터 연락
```

## 🛡️ 보안 아키텍처

### 인증/인가
- **Supabase Auth**: JWT 기반 인증
- **Row Level Security**: 데이터 접근 제어
- **API Key Management**: 서비스 간 통신

### 데이터 보호
- **암호화**: TLS 1.3 전송 암호화
- **백업**: 일일 자동 백업
- **감사 로그**: 모든 변경사항 기록

## 🚀 배포 아키텍처

### 환경 구성
```
Development → Staging → Production
    ↓           ↓           ↓
  Local      AWS Dev    AWS Prod
```

### CI/CD 파이프라인
```
1. GitHub Push
2. GitHub Actions 트리거
3. 테스트 실행
4. Docker 이미지 빌드
5. ECR 푸시
6. ECS 배포
```

## 📊 모니터링

### 메트릭 수집
- **CloudWatch**: 시스템 메트릭
- **Sentry**: 에러 트래킹
- **Google Analytics**: 사용자 행동 분석

### 알림 체계
- **Critical**: PagerDuty
- **Warning**: Slack
- **Info**: Email

## 🔌 통합 포인트

### 외부 서비스
- **Google OAuth**: 사용자 인증
- **Naver SmartPlace**: 비즈니스 데이터
- **YouTube API**: 크리에이터 정보
- **AWS Services**: 인프라

### 내부 통신
- **REST API**: 동기 통신
- **WebSocket**: 실시간 업데이트
- **Message Queue**: 비동기 처리

## 🎨 프론트엔드 아키텍처

### 공통 컴포넌트
```
packages/ui/
├── components/        # 재사용 컴포넌트
├── hooks/            # 커스텀 훅
└── styles/           # 공통 스타일
```

### 상태 관리
- **Web**: Zustand / React Query
- **Mobile**: Riverpod

## 📈 확장 계획

### Phase 1 (Current)
- ✅ 근태관리 시스템
- ✅ 마케팅 자동화
- 🚧 스케줄러

### Phase 2 (Q2 2025)
- 급여 관리
- 재고 관리
- 매출 분석

### Phase 3 (Q3 2025)
- AI 예측 분석
- 멀티 브랜치 지원
- 프랜차이즈 관리

---
*이 문서는 Context Manager에 의해 자동으로 관리됩니다.*