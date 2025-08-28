# DOT 비즈니스 플랫폼

외식업 디지털 전환을 위한 통합 비즈니스 솔루션

## 🏗️ 아키텍처

마이크로서비스 기반의 모노레포 구조:

```
DOT/
├── services/                # 마이크로서비스
│   ├── attendance/         # 근태관리 서비스
│   │   ├── web/           # Next.js 웹앱
│   │   └── mobile/        # Flutter 모바일앱
│   ├── marketing/          # 마케팅 자동화
│   └── scheduler/          # 스케줄러 서비스
│
├── packages/               # 공유 패키지
│   ├── shared/            # 공통 타입/유틸리티
│   ├── ui/                # 공통 UI 컴포넌트
│   └── utils/             # 공통 유틸리티 함수
│
├── infrastructure/         # 인프라 코드
│   └── cdk/               # AWS CDK
│
├── docker/                 # Docker 설정
└── monitoring/             # 모니터링 설정
```

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.0.0+
- npm 9.0.0+
- Flutter SDK 3.10.0+ (모바일 앱)
- AWS CLI (배포용)
- Docker (로컬 개발용)

### 설치

```bash
# 전체 의존성 설치
npm install

# 워크스페이스 의존성 설치
npm run install:all
```

### 개발 서버 실행

```bash
# 모든 서비스 실행
npm run dev

# 특정 서비스만 실행
npm run dev:attendance:web     # 근태관리 웹 (포트: 3002)
npm run dev:attendance:mobile  # 근태관리 모바일 앱
npm run dev:marketing          # 마케팅 (포트: 3003)
```

## 📦 서비스

### 1. 근태관리 서비스 (`@dot/attendance`)

GPS 기반 실시간 근태관리 시스템 (웹 + 모바일)
- **웹 대시보드**: 관리자용 실시간 모니터링
- **모바일 앱**: 직원용 QR 체크인/아웃
- **위치 검증**: GPS 기반 출퇴근 위치 확인
- **생체 인증**: 지문/Face ID 본인 확인
- **오프라인 모드**: 자동 동기화 지원

[상세 문서 →](./services/attendance/README.md)

### 2. 마케팅 자동화 서비스 (`@dot/marketing`)

YouTube 크리에이터 마케팅 자동화 플랫폼
- **크리에이터 발굴**: 키워드 기반 검색
- **성과 분석**: 채널 성과 지표 분석
- **캠페인 관리**: 이메일 템플릿 자동화
- **ROI 추적**: 캠페인 효과 측정

[상세 문서 →](./services/marketing/docs/CURRENT_STATUS.md)

### 3. 스케줄러 서비스 (`@dot/scheduler`)

직원 일정 및 시프트 관리 시스템
- **시프트 관리**: 유연한 근무 일정 설정
- **자동 배치**: AI 기반 최적 인력 배치
- **휴가 관리**: 휴가 신청 및 승인 프로세스
- **알림 시스템**: 일정 변경 실시간 알림

[상세 문서 →](./services/scheduler/doc/scheduler_business_plan.md)

## 🛠️ 기술 스택

### Web Frontend
- Next.js 15.5
- React 19
- TypeScript 5.9
- Tailwind CSS 3.4

### Mobile
- Flutter 3.10+
- Dart 3.0+
- Riverpod (상태관리)

### Backend
- AWS Lambda (서버리스)
- DynamoDB
- API Gateway
- Cognito (인증)

### Infrastructure
- AWS CDK
- CloudWatch
- CloudFront

## 📝 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 모든 서비스 개발 서버 실행 |
| `npm run build` | 모든 서비스 빌드 |
| `npm run test` | 전체 테스트 실행 |
| `npm run lint` | 전체 린트 검사 |
| `npm run clean` | 빌드 결과물 및 캐시 삭제 |

## 🏢 프로젝트 구조

### 모노레포 관리

npm workspaces를 사용한 모노레포 구조로 의존성과 스크립트를 중앙에서 관리합니다.

### 공유 패키지

- `@dot/shared`: 공통 타입 정의 및 유틸리티
- `@dot/ui`: 재사용 가능한 React 컴포넌트
- `@dot/utils`: 공통 헬퍼 함수

## 📄 라이선스

MIT

---

<p align="center">
<strong>DOT Team</strong> | 외식업 디지털 전환의 파트너
</p>