# 🏗️ Attendance Service Architecture

## 시스템 개요

Attendance 서비스는 엔터프라이즈급 다중 테넌트 근태관리 시스템으로, 계층적 권한 관리와 실시간 동기화를 제공합니다. user-permission-diagram.md 설계 명세를 기반으로 구현되었습니다.

## 📐 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────┐
│             Client Applications                  │
├─────────────────────┬───────────────────────────┤
│   Web Dashboard     │     Mobile App            │
│   (Next.js 15)     │     (Flutter 3.x)         │
└──────────┬──────────┴──────────┬────────────────┘
           │                     │
           ▼                     ▼
┌──────────────────────────────────────────────────┐
│         Supabase Edge Functions (Deno)           │
├──────────────────────────────────────────────────┤
│  • auth-signup      • attendance-check           │
│  • attendance-report • permission-check          │
│  • shift-management  • notification-dispatch     │
└─────────────────────┬────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│       Permission & Business Logic Layer          │
├──────────────────────────────────────────────────┤
│  • Role Hierarchy (Master/Admin/Manager/Worker)  │
│  • Row Level Security (RLS)                      │
│  • Multi-tenant Isolation                        │
│  • Audit Logging                                 │
└─────────────────────┬────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│              Data Layer (Supabase)               │
├──────────────────────────────────────────────────┤
│  PostgreSQL 15 with 11 Core Tables               │
│  • organizations    • users       • employees    │
│  • attendance       • shifts      • locations    │
│  • permissions      • role_templates             │
│  • notifications    • audit_logs  • sync_queue   │
└──────────────────────────────────────────────────┘
```

## 🔧 기술 스택

### Frontend - Web Dashboard
- **Framework**: Next.js 15.5
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Real-time**: Supabase Realtime
- **UI Components**: Radix UI + Shadcn/ui

### Frontend - Mobile App
- **Framework**: Flutter 3.x
- **Language**: Dart 3.x
- **State Management**: Riverpod 2.x
- **Theme**: Neo Brutal Design System
- **Local Storage**: Hive
- **HTTP Client**: Dio

### Backend
- **Runtime**: Node.js 18+
- **API Framework**: Next.js API Routes
- **Database**: PostgreSQL 15 (Supabase)
- **Authentication**: Supabase Auth (JWT)
- **Real-time**: Supabase Realtime (WebSocket)
- **File Storage**: Supabase Storage
- **Edge Functions**: Supabase Edge Functions (Deno)

## 📦 프로젝트 구조

```
attendance/
├── web/                        # Next.js 웹 애플리케이션
│   ├── app/                   # App Router
│   │   ├── api/              # API Routes
│   │   ├── (auth)/           # 인증 관련 페이지
│   │   ├── (dashboard)/      # 대시보드 페이지
│   │   └── (admin)/          # 관리자 페이지
│   │
│   ├── components/            # React 컴포넌트
│   │   ├── ui/              # 기본 UI 컴포넌트
│   │   ├── features/        # 기능별 컴포넌트
│   │   └── layouts/         # 레이아웃 컴포넌트
│   │
│   ├── lib/                   # 비즈니스 로직
│   │   ├── supabase/        # Supabase 클라이언트
│   │   ├── services/        # 서비스 레이어
│   │   ├── hooks/           # Custom Hooks
│   │   └── utils/           # 유틸리티 함수
│   │
│   └── styles/               # 글로벌 스타일
│
├── mobile/                    # Flutter 모바일 앱
│   ├── lib/
│   │   ├── main.dart        # 앱 진입점
│   │   ├── app/             # 앱 설정
│   │   ├── features/        # 기능별 모듈
│   │   │   ├── auth/        # 인증
│   │   │   ├── attendance/  # 근태
│   │   │   └── profile/     # 프로필
│   │   │
│   │   ├── core/            # 핵심 기능
│   │   │   ├── api/         # API 클라이언트
│   │   │   ├── models/      # 데이터 모델
│   │   │   └── services/    # 서비스
│   │   │
│   │   └── shared/          # 공유 컴포넌트
│   │       ├── widgets/     # 재사용 위젯
│   │       └── theme/       # 테마 설정
│   │
│   └── assets/               # 리소스 파일
│
└── supabase/                  # Supabase 설정
    ├── migrations/           # DB 마이그레이션
    ├── functions/           # Edge Functions
    └── seed.sql             # 초기 데이터
```

## 🔄 데이터 플로우

### 출근 프로세스
```
1. 직원이 모바일 앱 실행
2. QR 코드 스캔
3. 위치 정보 검증
4. API 요청 (JWT 토큰 포함)
5. 비즈니스 로직 처리
   - QR 코드 유효성 검증
   - 위치 범위 확인
   - 중복 체크인 방지
6. 데이터베이스 기록
7. 실시간 업데이트 (WebSocket)
8. 관리자 대시보드 반영
```

### 승인 워크플로우
```
1. 근태 기록 생성 (pending 상태)
2. 관리자 알림 발송
3. 관리자 검토
4. 승인/거부 처리
5. 직원 알림
6. 기록 상태 업데이트
```

## 🛡️ 보안 아키텍처

### 인증 (Authentication)
- **JWT 토큰**: Supabase Auth 제공
- **리프레시 토큰**: 자동 갱신
- **세션 관리**: 서버 사이드 세션
- **Multi-factor Authentication**: TOTP 기반 2FA 지원

### 인가 (Authorization) - 4단계 계층 구조
- **Row Level Security (RLS)**: 데이터베이스 레벨 보안
- **역할 기반 접근 제어 (RBAC)**:
  - `master_admin`: 시스템 전체 관리, 조직 생성/삭제
  - `admin`: 조직 내 전체 관리, 직원 관리
  - `manager`: 팀 관리, 근태 승인
  - `worker`: 개인 근태 관리

### 권한 매트릭스
| 역할 | 조직 | 사용자 | 직원 | 근태 | 시프트 | 보고서 |
|------|------|--------|------|------|--------|--------|
| Master Admin | CRUD | CRUD | CRUD | CRUD | CRUD | Full |
| Admin | R | CRU | CRUD | CRUD | CRUD | Full |
| Manager | R | R | RU | CRU/Approve | R/Assign | View |
| Worker | R | R(Self) | R(Self) | CR(Self) | R | - |

### 데이터 보호
- **HTTPS**: 모든 통신 암호화
- **암호화**: bcrypt 기반 패스워드 해싱
- **감사 로그**: 모든 변경사항 audit_logs 테이블 기록
- **Multi-tenant Isolation**: organization_id 기반 완벽한 데이터 분리

## 📊 성능 최적화

### Frontend 최적화
- **코드 분할**: Dynamic imports
- **이미지 최적화**: Next.js Image
- **캐싱**: React Query 캐싱
- **번들 최적화**: Tree shaking

### Backend 최적화
- **데이터베이스 인덱싱**: 주요 쿼리 최적화
- **커넥션 풀링**: 데이터베이스 연결 관리
- **캐싱**: Redis 캐싱 (선택적)
- **비동기 처리**: 백그라운드 작업

### 실시간 성능
- **WebSocket 연결 관리**: 자동 재연결
- **메시지 배칭**: 대량 업데이트 최적화
- **선택적 구독**: 필요한 채널만 구독

## 🔌 통합 포인트

### 내부 서비스
- **Marketing Service**: 직원 데이터 연동
- **Scheduler Service**: 근무 일정 연동
- **Main Platform**: 사용자 인증 공유

### 외부 서비스
- **Push Notification**: FCM/APNS
- **SMS Gateway**: 알림 발송
- **Email Service**: 리포트 발송

## 📈 확장 계획

### Phase 1 (현재)
- ✅ QR 기반 출퇴근
- ✅ 실시간 대시보드
- ✅ 기본 승인 워크플로우

### Phase 2 (Q2 2025)
- 생체 인증 (지문/얼굴)
- GPS 자동 체크인/아웃
- 급여 시스템 연동

### Phase 3 (Q3 2025)
- AI 기반 근태 패턴 분석
- 예측 스케줄링
- 멀티 브랜치 지원

## 🚨 모니터링

### 메트릭
- **API 응답 시간**: < 200ms
- **에러율**: < 0.1%
- **동시 접속자**: 1000+
- **가동률**: 99.9%

### 도구
- **로깅**: Winston + Supabase Logs
- **에러 트래킹**: Sentry
- **APM**: New Relic (선택적)
- **상태 체크**: Health Check Endpoints

---
*이 문서는 Context Manager에 의해 자동으로 관리됩니다.*