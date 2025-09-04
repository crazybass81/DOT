# 📚 서비스별 독립 문서 시스템 구조

## 🎯 목표
- 각 서비스가 독립적인 문서 체계 보유
- Context Manager가 서비스별로 자동 관리
- 마이크로서비스 원칙에 맞는 문서 독립성

## 📐 표준 서비스 문서 구조

```
service-name/
├── README.md                    # 서비스 개요
├── CHANGELOG.md                 # 서비스 변경 이력
├── API.md                       # 서비스 API 명세
├── ARCHITECTURE.md              # 서비스 아키텍처
├── DEVELOPMENT.md               # 개발 가이드
├── DEPLOYMENT.md                # 배포 가이드
├── TESTING.md                   # 테스트 가이드
│
├── docs/                        # 추가 문서
│   ├── features/               # 기능별 상세 문서
│   ├── guides/                 # 사용 가이드
│   ├── diagrams/               # 다이어그램 (user-permission-diagram.md 등)
│   └── decisions/              # 아키텍처 결정 기록 (ADR)
│
└── .context-manager.json        # 서비스별 Context Manager 설정
```

## 🔧 서비스별 맞춤 구조

### 1. Attendance Service (근태관리)
```
services/attendance/
├── README.md                    # ✅ 근태 서비스 개요
├── CHANGELOG.md                 # 📝 변경 이력 (자동 관리)
├── API.md                       # 📡 근태 API 명세 (자동 관리)
├── ARCHITECTURE.md              # 🏗️ 서비스 아키텍처
├── DEVELOPMENT.md               # 💻 개발 가이드
├── DEPLOYMENT.md                # 🚀 배포 가이드
├── TESTING.md                   # 🧪 테스트 가이드
│
├── docs/
│   ├── features/
│   │   ├── qr-check-in.md     # QR 체크인 기능
│   │   ├── realtime-dashboard.md # 실시간 대시보드
│   │   └── approval-workflow.md  # 승인 워크플로우
│   │
│   ├── guides/
│   │   ├── admin-guide.md     # 관리자 가이드
│   │   ├── employee-guide.md  # 직원 가이드
│   │   └── mobile-setup.md    # 모바일 앱 설정
│   │
│   ├── diagrams/
│   │   ├── user-permission-diagram.md  # ⚠️ 권한 다이어그램 (보존)
│   │   ├── data-flow.md       # 데이터 플로우
│   │   └── system-architecture.md # 시스템 구조
│   │
│   └── decisions/
│       ├── ADR-001-supabase.md  # Supabase 선택 이유
│       ├── ADR-002-flutter.md   # Flutter 선택 이유
│       └── ADR-003-qr-auth.md   # QR 인증 방식 결정
│
├── web/                         # Next.js 웹앱
├── mobile/                      # Flutter 앱
└── .context-manager.json        # 서비스 Context Manager 설정
```

### 2. Marketing Service (마케팅 자동화)
```
services/marketing/
├── README.md                    # 📈 마케팅 서비스 개요
├── CHANGELOG.md                 # 📝 변경 이력 (자동 관리)
├── API.md                       # 📡 마케팅 API 명세 (자동 관리)
├── ARCHITECTURE.md              # 🏗️ 서비스 아키텍처
├── DEVELOPMENT.md               # 💻 개발 가이드
├── DEPLOYMENT.md                # 🚀 배포 가이드
├── TESTING.md                   # 🧪 테스트 가이드
│
├── docs/
│   ├── features/
│   │   ├── creator-matching.md # 크리에이터 매칭
│   │   ├── campaign-management.md # 캠페인 관리
│   │   └── analytics.md        # 분석 기능
│   │
│   ├── guides/
│   │   ├── campaign-setup.md   # 캠페인 설정 가이드
│   │   ├── creator-onboarding.md # 크리에이터 온보딩
│   │   └── api-integration.md  # API 통합 가이드
│   │
│   ├── diagrams/
│   │   ├── matching-algorithm.md # 매칭 알고리즘
│   │   ├── data-pipeline.md    # 데이터 파이프라인
│   │   └── system-flow.md      # 시스템 플로우
│   │
│   └── decisions/
│       ├── ADR-001-python.md   # Python 선택 이유
│       ├── ADR-002-scraping.md # 스크래핑 전략
│       └── ADR-003-ai-matching.md # AI 매칭 결정
│
├── scraper-python/              # Python 스크래퍼
└── .context-manager.json        # 서비스 Context Manager 설정
```

### 3. Scheduler Service (스케줄 관리)
```
services/scheduler/
├── README.md                    # 📅 스케줄러 서비스 개요
├── CHANGELOG.md                 # 📝 변경 이력 (자동 관리)
├── API.md                       # 📡 스케줄러 API 명세 (자동 관리)
├── ARCHITECTURE.md              # 🏗️ 서비스 아키텍처
├── DEVELOPMENT.md               # 💻 개발 가이드
├── DEPLOYMENT.md                # 🚀 배포 가이드
├── TESTING.md                   # 🧪 테스트 가이드
│
├── docs/
│   ├── features/
│   │   ├── shift-management.md # 시프트 관리
│   │   ├── auto-scheduling.md  # 자동 스케줄링
│   │   └── notifications.md    # 알림 기능
│   │
│   ├── guides/
│   │   ├── manager-guide.md    # 매니저 가이드
│   │   ├── scheduling-rules.md # 스케줄링 규칙
│   │   └── integration.md      # 통합 가이드
│   │
│   ├── diagrams/
│   │   ├── scheduling-logic.md # 스케줄링 로직
│   │   ├── conflict-resolution.md # 충돌 해결
│   │   └── optimization.md     # 최적화 알고리즘
│   │
│   └── decisions/
│       ├── ADR-001-algorithm.md # 스케줄링 알고리즘
│       └── ADR-002-rules-engine.md # 규칙 엔진
│
└── .context-manager.json        # 서비스 Context Manager 설정
```

## 🤖 Context Manager 서비스별 설정

### 서비스별 .context-manager.json
```json
{
  "service": {
    "name": "attendance",
    "type": "microservice",
    "autoUpdate": true,
    "documents": {
      "readme": "./README.md",
      "changelog": "./CHANGELOG.md",
      "api": "./API.md",
      "architecture": "./ARCHITECTURE.md"
    },
    "watchPatterns": [
      "web/**/*.{ts,tsx,js,jsx}",
      "mobile/**/*.dart",
      "supabase/**/*.sql",
      "docs/**/*.md"
    ],
    "ignorePaths": [
      "node_modules/**",
      "build/**",
      ".next/**"
    ],
    "autoGenerate": {
      "api": {
        "from": ["web/app/api/**/*.ts", "supabase/functions/**/*.ts"],
        "to": "./API.md"
      },
      "changelog": {
        "from": "git log",
        "to": "./CHANGELOG.md"
      }
    },
    "validation": {
      "checkApiConsistency": true,
      "checkDocLinks": true,
      "checkDiagramSync": true
    }
  }
}
```

## 📋 문서 자동 관리 규칙

### 1. 코드 변경 → 문서 업데이트
- **API 엔드포인트 변경** → `API.md` 자동 업데이트
- **기능 추가/변경** → `CHANGELOG.md` 자동 기록
- **아키텍처 변경** → `ARCHITECTURE.md` 업데이트 제안
- **테스트 추가** → `TESTING.md` 업데이트

### 2. 문서 간 동기화
- 서비스 README ↔ 메인 PROJECT_OVERVIEW
- 서비스 API.md ↔ 메인 API_SPECIFICATION.md
- 서비스 CHANGELOG ↔ 메인 CHANGELOG.md

### 3. 다이어그램 동기화
- 코드 구조 변경 시 다이어그램 업데이트 알림
- Mermaid/PlantUML 다이어그램 자동 생성

## 🚀 구현 단계

### Phase 1: 기본 구조 생성
1. 각 서비스에 표준 문서 생성
2. 기존 문서 마이그레이션
3. Context Manager 설정

### Phase 2: 자동화 구현
1. 서비스별 Context Manager 설정
2. 문서 자동 생성 규칙 설정
3. CI/CD 통합

### Phase 3: 고급 기능
1. 다이어그램 자동 생성
2. API 문서 자동 테스트
3. 문서 버전 관리

## 💡 장점

1. **독립성**: 각 서비스가 독립적인 문서 체계
2. **자동화**: Context Manager가 서비스별로 관리
3. **일관성**: 표준 구조로 모든 서비스 통일
4. **확장성**: 새 서비스 추가 시 템플릿 적용
5. **추적성**: 서비스별 변경 이력 관리

## 📌 주의사항

- `user-permission-diagram.md`는 diagrams/ 폴더로 이동하되 절대 삭제 금지
- 각 서비스는 독립적이지만 메인 문서와 동기화 필요
- ADR(Architecture Decision Records)로 모든 중요 결정 기록