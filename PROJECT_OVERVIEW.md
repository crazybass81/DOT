# DOT 비즈니스 플랫폼

## 📁 프로젝트 구조

```
DOT/
├── services/                # 마이크로서비스
│   ├── attendance/         # 근태관리 서비스
│   │   ├── web/           # Next.js 웹 애플리케이션
│   │   └── mobile/        # Flutter 모바일 앱
│   │
│   ├── marketing/          # 마케팅 자동화 서비스
│   │   └── web/           # Next.js 웹 애플리케이션
│   │
│   └── scheduler/          # 스케줄러 서비스
│       └── web/           # 관리 도구
│
├── packages/               # 공유 패키지
│   ├── shared/            # 공통 타입/유틸리티
│   ├── ui/                # 공통 UI 컴포넌트
│   └── utils/             # 공통 헬퍼 함수
│
├── infrastructure/         # 인프라 코드
│   └── cdk/               # AWS CDK
│
├── docker/                 # Docker 설정
└── monitoring/             # 모니터링 설정
```

## 🎯 프로젝트 목표

외식업 디지털 전환을 위한 통합 비즈니스 플랫폼
- **근태관리**: GPS 기반 출퇴근, ID-ROLE-PAPER 보안 시스템, 실시간 모니터링
- **마케팅 자동화**: 유튜브 크리에이터 매칭, AI 기반 캠페인 관리
- **스케줄 관리**: 직원 일정, 시프트 최적화 (개발 중)

## 🔐 보안 특징

- **ID-ROLE-PAPER System**: 7단계 역할 계층 구조로 세분화된 권한 관리
- **Row Level Security (RLS)**: 데이터베이스 수준의 다중 테넌트 격리
- **JWT 기반 인증**: WebSocket 실시간 통신 보안 강화
- **감사 로깅**: 모든 중요 작업에 대한 추적 가능한 로그

## 🏗️ 기술 스택

### Web Frontend
- Next.js 15.5 + TypeScript
- Tailwind CSS
- React 19
- Progressive Web App

### Mobile
- Flutter 3.x + Dart
- Riverpod (상태관리)
- Neo Brutal Theme

### Backend  
- **Supabase** - Primary backend for attendance service (PostgreSQL, Auth, Realtime)
- **AWS Lambda** - Serverless functions for marketing service
- **DynamoDB** - NoSQL database for marketing data
- **API Gateway** - REST API management
- **Cognito** - Authentication for marketing service

### Infrastructure
- AWS CDK
- Docker Compose
- CloudWatch
- CloudFront CDN

## 📚 주요 문서

### 서비스별 문서
- [근태관리 서비스](./services/attendance/README.md) - 웹/모바일 통합 근태관리
- [마케팅 서비스](./services/marketing/docs/CURRENT_STATUS.md) - 크리에이터 마케팅 플랫폼
- [스케줄러 서비스](./services/scheduler/doc/scheduler_business_plan.md) - 일정 관리 시스템

### 개발 가이드
- [빠른 시작](./QUICKSTART.md) - 프로젝트 시작 가이드
- [CI/CD 문서](./CICD_DOCUMENTATION.md) - 배포 파이프라인
- [CDK 가이드](./infrastructure/cdk/README.md) - AWS 인프라 관리

## 🏗️ 마이크로서비스 아키텍처

각 서비스는 독립적으로:
- 개발 및 배포 가능
- 자체 데이터베이스 관리
- API를 통해 통신
- 독립적인 스케일링


---

<p align="center">
<strong>DOT Team</strong> | 외식업 디지털 전환 솔루션
</p>