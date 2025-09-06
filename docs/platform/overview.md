# DOT 플랫폼 개요

> **DOT**: 레스토랑 디지털 트랜스포메이션을 위한 통합 비즈니스 플랫폼

## 🎯 플랫폼 미션

DOT는 레스토랑 업계의 디지털 혁신을 가속화하는 포괄적인 마이크로서비스 기반 플랫폼입니다. 근태 관리부터 마케팅 자동화, 스케줄링까지 레스토랑 운영의 모든 측면을 통합 관리합니다.

## 🏢 비즈니스 도메인

### 1. 근태 관리 (Attendance Management)
**GPS 기반 스마트 출퇴근 시스템**
- 정확한 위치 기반 출퇴근 체크
- 실시간 근무 상태 모니터링
- 자동 급여 계산 연동
- Flutter 모바일 앱 + 웹 대시보드

### 2. 마케팅 자동화 (Marketing Automation)
**유튜버 크리에이터 매칭 플랫폼**
- AI 기반 크리에이터-브랜드 매칭
- 자동 캠페인 성과 분석
- 스마트스토어 연동 판매 추적
- Google OAuth 기반 통합 인증

### 3. 스케줄링 (Employee Scheduling)
**지능형 직원 스케줄 관리** *(개발 예정)*
- AI 기반 최적 시프트 배정
- 직원 선호도 및 가용성 고려
- 노동법 준수 자동 검증
- 비용 최적화 알고리즘

## 🏗️ 아키텍처 특징

### 마이크로서비스 기반
- **독립적 배포**: 각 서비스 독립적 개발/배포
- **기술 스택 다양성**: 서비스별 최적 기술 선택
- **확장성**: 트래픽에 따른 개별 서비스 스케일링
- **장애 격리**: 단일 서비스 장애가 전체에 미치는 영향 최소화

### 하이브리드 데이터베이스
```
┌─────────────────┬─────────────────┬─────────────────┐
│   Attendance    │    Marketing    │   Scheduler     │
│   (Supabase)    │    (DynamoDB)   │   (Supabase)    │
├─────────────────┼─────────────────┼─────────────────┤
│ • PostgreSQL    │ • NoSQL         │ • PostgreSQL    │
│ • Realtime      │ • High Scale    │ • ACID 트랜잭션  │
│ • Built-in Auth │ • AWS Native    │ • 복잡 쿼리      │
└─────────────────┴─────────────────┴─────────────────┘
```

### 클라우드 네이티브
- **AWS 기반**: Lambda, API Gateway, DynamoDB 활용
- **Supabase 통합**: PostgreSQL + Realtime + Auth
- **Container 지원**: Docker 기반 로컬 개발 환경
- **Infrastructure as Code**: AWS CDK를 통한 인프라 관리

## 📊 플랫폼 메트릭스

### 개발 현황
| 서비스 | 상태 | 진행률 | 주요 기능 |
|--------|------|--------|----------|
| Attendance | ✅ 운영중 | 100% | GPS 출퇴근, 대시보드, 모바일 앱 |
| Marketing | 🚧 MVP | 85% | 크리에이터 매칭, OAuth, 스크래핑 |
| Scheduler | 📋 계획중 | 10% | 기본 설계, 요구사항 정의 |

### 기술 스택 분포
```
Frontend:  Next.js (80%) + Flutter (20%)
Backend:   Node.js (60%) + AWS Lambda (40%)
Database:  Supabase (60%) + DynamoDB (40%)
Auth:      Supabase Auth (60%) + AWS Cognito (40%)
```

## 🎯 타겟 사용자

### 1차 사용자
- **레스토랑 오너**: 통합 운영 관리 도구
- **매니저**: 직원 관리 및 성과 모니터링
- **직원**: 간편한 출퇴근 및 스케줄 확인

### 2차 사용자
- **마케팅 매니저**: 크리에이터 캠페인 관리
- **HR 담당자**: 근태 및 급여 관리
- **IT 관리자**: 시스템 모니터링 및 설정

## 🚀 경쟁 우위

### 통합성 (Integration)
- **단일 플랫폼**: 여러 솔루션을 하나로 통합
- **데이터 연동**: 서비스 간 seamless 데이터 흐름
- **일관된 UX**: 모든 서비스에서 동일한 사용자 경험

### 확장성 (Scalability)
- **마이크로서비스**: 독립적 확장 및 최적화
- **클라우드 네이티브**: AWS 인프라 활용한 무한 확장
- **API 중심**: 타사 시스템과 쉬운 통합

### 사용자 중심 (User-Centric)
- **모바일 우선**: 직원들을 위한 직관적 모바일 앱
- **실시간**: 즉시 반영되는 데이터와 알림
- **자동화**: 반복 작업의 지능적 자동화

## 📈 로드맵

### Phase 1: Foundation (완료)
- ✅ Attendance Service MVP
- ✅ 기본 인프라 구축
- ✅ 모바일 앱 개발

### Phase 2: Marketing Integration (현재)
- 🚧 Marketing Service 완성
- 🚧 AI 매칭 엔진 고도화
- 🚧 성과 분석 대시보드

### Phase 3: Intelligent Scheduling (Q1 2025)
- 📋 Scheduler Service 개발
- 📋 AI 기반 최적화 알고리즘
- 📋 통합 분석 대시보드

### Phase 4: Advanced Features (Q2-Q3 2025)
- 📋 예측 분석 및 인사이트
- 📋 고급 보고서 및 BI
- 📋 제3자 시스템 통합 확대

## 🔗 관련 문서

- **[아키텍처 상세](./architecture.md)** - 기술 아키텍처 심화 분석
- **[시작 가이드](./getting-started.md)** - 개발 환경 설정
- **[API 참조](./api-reference.md)** - 통합 API 문서
- **[배포 가이드](./deployment.md)** - 프로덕션 배포

---

*마지막 업데이트: {{ last_updated }} | 문서 버전: v1.0 | Context Manager 동기화*