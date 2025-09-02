# DOT Attendance Service (근태관리 서비스)

## 📋 Overview

DOT 플랫폼의 핵심 서비스로, 외식업 특화 근태관리 시스템입니다.
웹 대시보드와 모바일 앱을 통해 완벽한 근태관리 솔루션을 제공합니다.

## 🏗️ Architecture

```
attendance/
├── web/                 # Next.js 웹 애플리케이션
│   ├── app/            # 페이지 및 라우팅
│   ├── components/     # React 컴포넌트
│   ├── lib/           # 비즈니스 로직
│   └── scripts/       # 배포 및 설정 스크립트
│
└── mobile/             # Flutter 모바일 애플리케이션
    ├── lib/           # Dart 소스 코드
    ├── assets/        # 이미지, 폰트 등
    └── test/          # 테스트 코드
```

## 🚀 Features

### 웹 대시보드 (Web)
- **관리자 기능**
  - 실시간 근태 현황 모니터링
  - 직원 관리 및 권한 설정
  - QR 코드 생성 및 표시
  - 근태 승인 및 수정
  - 통계 및 리포트 생성

- **직원 기능**
  - 웹 기반 출퇴근 체크
  - 근태 이력 조회
  - 휴가/외출 신청

### 모바일 앱 (Mobile)
- **직원 전용 기능**
  - QR 코드 스캔 출퇴근
  - GPS 기반 위치 확인
  - 생체 인증 (지문/Face ID)
  - 오프라인 모드 지원
  - 푸시 알림
  - 실시간 근무 시간 확인

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
cp .env.example .env.local
# Configure your environment variables
npm run dev
```

### Mobile Setup
```bash
cd services/attendance/mobile
flutter pub get
flutter run
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
npm run deploy         # Deploy to AWS
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
- Data encryption at rest and in transit
- GPS spoofing prevention
- Device fingerprinting

## 📊 Database Schema

Using Supabase (PostgreSQL) with relational design:

```sql
-- Main tables
- attendance_records
- employees
- schedules
- organizations
- departments

-- Row Level Security (RLS) enabled for all tables
-- Real-time subscriptions available
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
- Firebase configuration
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