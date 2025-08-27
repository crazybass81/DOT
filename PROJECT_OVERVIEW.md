# DOT 근태관리 시스템 프로젝트

## 📁 프로젝트 구조

```
DOT/
├── services/                # 마이크로서비스
│   ├── attendance/         # 근태관리 서비스
│   │   ├── app/           # Next.js 페이지
│   │   ├── components/    # React 컴포넌트
│   │   ├── lib/           # 비즈니스 로직
│   │   └── scripts/       # 유틸리티 스크립트
│   │
│   └── marketing/          # 마케팅 자동화 서비스
│       ├── app/           # Next.js 페이지
│       ├── components/    # React 컴포넌트
│       └── lib/           # API 및 로직
│
├── packages/               # 공유 패키지
│   ├── shared/            # 공통 타입/유틸리티
│   ├── ui/                # 공통 UI 컴포넌트
│   └── utils/             # 공통 헬퍼 함수
│
├── infrastructure/         # 인프라 코드
│   ├── cdk/               # AWS CDK
│   └── terraform/         # Terraform (옵션)
│
└── README.md              # 프로젝트 루트 문서
```

## 🎯 프로젝트 목표

외식업 특화 GPS 기반 근태관리 시스템 구축
- 부정 출퇴근 방지
- 실시간 근태 관리
- 자동화된 보고서
- 모바일 최적화

## 🏗️ 기술 스택

### Frontend
- Next.js 15.5 + TypeScript
- Tailwind CSS
- Progressive Web App

### Backend  
- AWS Lambda (서버리스)
- DynamoDB (NoSQL)
- API Gateway
- Cognito (인증)

### Infrastructure
- AWS CDK
- CloudWatch
- CloudFront CDN

## 📚 주요 문서

### 근태관리 서비스
- [서비스 README](./services/attendance/README.md) - 시작 가이드
- [API 문서](./services/attendance/docs/API_DOCUMENTATION.md) - REST API 레퍼런스

### 마케팅 서비스  
- [서비스 README](./services/marketing/README.md) - 시작 가이드
- [YouTube MVP](./services/marketing/YOUTUBE_CREATOR_MVP.md) - 크리에이터 마케팅 MVP

### 인프라
- [CDK 가이드](./infrastructure/cdk/README.md) - AWS 인프라 관리

## 🏗️ 마이크로서비스 아키텍처

각 서비스는 독립적으로:
- 개발 및 배포 가능
- 자체 데이터베이스 관리
- API를 통해 통신
- 독립적인 스케일링

자세한 내용은 [README](./README.md)를 참조하세요./dot-attendance/README.md)를 참조하세요.

---

<p align="center">
<strong>DOT Team</strong> | 외식업 디지털 전환 솔루션
</p>