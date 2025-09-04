# DOT Attendance Service (근태관리 서비스)

## 📋 Overview

DOT 플랫폼의 엔터프라이즈 근태관리 서비스로, 다중 테넌트 아키텍처와 계층적 권한 관리를 제공합니다.
user-permission-diagram.md 설계 명세를 기반으로 구현된 완전한 근태관리 솔루션입니다.

## 🏗️ Architecture

```
attendance/
├── supabase/              # Supabase 설정 및 마이그레이션
│   ├── migrations/        # 데이터베이스 마이그레이션 (11 테이블)
│   │   └── 001_initial_schema.sql
│   └── functions/         # Edge Functions (Deno)
│       ├── auth-signup/   # 사용자 등록 및 권한 관리
│       ├── attendance-check/ # 출퇴근 처리
│       ├── attendance-report/ # 보고서 생성
│       └── _shared/       # 공유 유틸리티
│
├── src/                   # TypeScript 소스 코드
│   ├── types/            # 타입 정의
│   │   └── index.ts      # 전체 타입 시스템
│   └── lib/              # 비즈니스 로직
│       ├── auth/         # 인증 처리
│       ├── permissions/  # 권한 관리 시스템
│       └── database/     # Supabase 클라이언트
│
├── tests/                # 테스트 파일
├── config/              # 설정 파일
└── docs/                # 프로젝트 문서
    ├── diagrams/        # 시스템 다이어그램
    │   └── user-permission-diagram.md
    ├── ARCHITECTURE.md  # 아키텍처 문서
    ├── API.md          # API 명세서
    └── CHANGELOG.md    # 변경 이력
```

## 🚀 Features

### 🔑 4단계 권한 시스템 (Role Hierarchy)

#### Master Admin (최고 관리자)
- 시스템 전체 관리
- 조직 생성/삭제/관리
- 모든 조직의 데이터 접근
- 시스템 설정 및 구성

#### Admin (조직 관리자)
- 조직 내 전체 관리
- 직원 등록 및 관리
- 모든 근태 데이터 관리
- 시프트 및 위치 설정
- 보고서 생성 및 내보내기

#### Manager (팀 관리자)
- 팀원 근태 관리
- 근태 승인/거부
- 시프트 할당
- 팀 보고서 조회

#### Worker (일반 직원)
- 개인 출퇴근 체크
- 본인 근태 이력 조회
- 시프트 확인
- 알림 수신

## 🛠️ Technology Stack

### Web (관리자/대시보드)
- **Frontend**: Next.js 15.5, React 19, TypeScript
- **Styling**: Tailwind CSS
- **State**: React Hooks
- **Auth**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **Deployment**: Vercel / Netlify

### Mobile (직원용 앱)
- **Framework**: Flutter 3.x
- **Language**: Dart
- **State**: Riverpod
- **UI**: Neo Brutal Theme
- **Features**: 
  - QR Scanner (mobile_scanner)
  - Location (geolocator)
  - Biometric Auth (local_auth)
  - Push Notifications (FCM)

## 📦 Installation

### Prerequisites
- Node.js 18+
- Flutter SDK 3.10+
- Supabase account
- Docker (for local development)

### Web Setup
```bash
cd services/attendance/web
npm install
cp .env.template .env.local
# Configure your environment variables
npm run dev
```

### Mobile Setup
```bash
cd services/attendance/mobile
flutter pub get
flutter run
```

### Database Setup
```bash
# Run migrations in Supabase Dashboard
# SQL Editor > New Query
# Copy contents from: supabase/migrations/001_create_tables.sql
```

## 🔧 Development

### Web Commands
```bash
# Development
npm run dev              # Start dev server on port 3002

# Testing
npm run test            # Run all tests
npm run test:coverage   # Generate coverage report

# Build & Deploy
npm run build          # Production build
npm run deploy         # Deploy to Vercel/Netlify
```

### Mobile Commands
```bash
# Development
flutter run            # Run on connected device/emulator
flutter run -d web     # Run as web app

# Testing
flutter test          # Run all tests

# Build
flutter build apk     # Android APK
flutter build ios     # iOS build
flutter build web     # Web build
```

## 🌐 API Integration

Both web and mobile applications connect to the same backend:

- **Base URL**: Supabase Project URL
- **Authentication**: JWT tokens via Supabase Auth
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Real-time**: WebSocket connections via Supabase Realtime
- **Edge Functions**: Supabase Edge Functions (Deno)

## 📱 Platform-Specific Features

### Web-Only
- Complex admin dashboards
- Bulk data operations
- Report generation & export
- Multi-organization management

### Mobile-Only
- Biometric authentication
- Offline mode with sync
- Camera QR scanning
- Push notifications
- GPS tracking

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Row Level Security (RLS)
- Data encryption at rest and in transit
- GPS spoofing prevention
- Device fingerprinting

## 📊 Database Schema

PostgreSQL 15 with 11 core tables and Row Level Security:

```sql
-- Core Tables (11)
1. organizations      # 다중 테넌트 조직 관리
2. users             # 시스템 사용자 (role 포함)
3. employees         # 직원 프로필
4. attendance        # 근태 기록
5. shifts            # 근무 시프트 정의
6. locations         # 체크인/아웃 위치
7. permissions       # 역할별 권한 정의
8. role_templates    # 커스텀 역할 템플릿
9. notifications     # 알림 메시지
10. audit_logs       # 감사 로그
11. sync_queue       # 오프라인 동기화 큐

-- Security Features
- Row Level Security (RLS) on all tables
- JWT-based authentication
- Organization-based data isolation
- Real-time subscriptions with filters
```

## 🚦 CI/CD

- **Web**: GitHub Actions → Vercel / Netlify
- **Mobile**: GitHub Actions → App Store / Play Store
- **Database**: Supabase Migrations

## 📝 Environment Variables

### Web (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

### Mobile (config files)
- Firebase configuration (FCM)
- API endpoints
- Feature flags

## 🤝 Contributing

1. Create feature branch from `develop`
2. Follow coding standards
3. Write tests
4. Create PR with description

## 📄 License

Proprietary - DOT Platform

## 🔗 Related Services

- [Marketing Service](../marketing/README.md)
- [Scheduler Service](../scheduler/README.md)

## 📚 Documentation

- [System Architecture](./docs/architecture/)
- [API Documentation](./docs/api/)
- [Development Guides](./docs/guides/)
- [Feature Documentation](./docs/features/)
- [Migration Guide](./docs/AWS_TO_SUPABASE_MIGRATION.md)