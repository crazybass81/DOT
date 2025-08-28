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
- **근태관리**: GPS 기반 출퇴근, 부정 방지, 실시간 모니터링
- **마케팅 자동화**: 크리에이터 매칭, 캠페인 관리
- **스케줄 관리**: 직원 일정, 시프트 최적화

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
- AWS Lambda (서버리스)
- DynamoDB (NoSQL)
- API Gateway
- Cognito (인증)

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