# DOT Attendance Mobile App

## 📱 Overview

Flutter 기반 근태관리 모바일 애플리케이션으로 직원들이 손쉽게 출퇴근을 체크할 수 있는 앱입니다.

## ✨ Features

### 핵심 기능
- **QR 코드 스캔**: 카메라를 이용한 빠른 출퇴근 체크
- **GPS 위치 확인**: 지정된 근무지에서만 출퇴근 가능
- **생체 인증**: 지문/Face ID로 본인 확인
- **오프라인 모드**: 네트워크 없이도 체크 후 자동 동기화
- **실시간 알림**: 출퇴근, 일정 변경 푸시 알림

### 대시보드
- 이번 주 근무 시간 요약
- 실시간 근무 상태 표시
- 월간 근태 캘린더
- 근태 이력 조회

## 🛠 Tech Stack

### Framework
- **Flutter**: 3.10.0+
- **Dart**: 3.0.0+

### State Management
- **Riverpod**: 2.4.9

### Core Libraries
- **go_router**: 라우팅 및 네비게이션
- **dio**: HTTP 네트워킹
- **mobile_scanner**: QR 코드 스캔
- **geolocator**: GPS 위치 서비스
- **local_auth**: 생체 인증
- **flutter_secure_storage**: 안전한 데이터 저장

### UI/UX
- **Neo Brutal Theme**: 독특한 네오브루탈 디자인
- **flutter_animate**: 부드러운 애니메이션
- **fl_chart**: 데이터 시각화

## 📂 Project Structure

```
lib/
├── core/               # 핵심 기능 및 설정
│   ├── config/        # 앱 설정
│   ├── di/            # 의존성 주입
│   ├── services/      # 핵심 서비스
│   └── theme/         # 테마 및 스타일
│
├── domain/            # 비즈니스 로직
│   ├── entities/      # 도메인 모델
│   ├── repositories/  # 저장소 인터페이스
│   └── usecases/      # 유스케이스
│
├── data/              # 데이터 레이어
│   ├── datasources/   # API, 로컬 데이터
│   ├── models/        # 데이터 모델
│   └── repositories/  # 저장소 구현
│
└── presentation/      # UI 레이어
    ├── pages/         # 화면
    ├── widgets/       # 위젯
    └── providers/     # 상태 관리
```

## 🚀 Getting Started

### Prerequisites
- Flutter SDK 3.10.0 이상
- Dart SDK 3.0.0 이상
- Android Studio / VS Code
- iOS: Xcode 14+ (Mac only)
- Android: Android SDK 31+

### Installation

1. Flutter 환경 설정
```bash
flutter doctor
```

2. 의존성 설치
```bash
flutter pub get
```

3. 코드 생성
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

4. 앱 실행
```bash
# iOS
flutter run -d ios

# Android
flutter run -d android

# 웹 (개발용)
flutter run -d web
```

## 🔧 Configuration

### Environment Variables
`.env` 파일 생성:
```env
API_BASE_URL=https://api.dot-attendance.com
GOOGLE_MAPS_API_KEY=your_key_here
```

### Firebase Setup
1. Firebase 프로젝트 생성
2. `google-services.json` (Android) 추가
3. `GoogleService-Info.plist` (iOS) 추가

## 📦 Build & Deploy

### Android APK
```bash
flutter build apk --release
```

### Android App Bundle
```bash
flutter build appbundle --release
```

### iOS
```bash
flutter build ios --release
```

### Web
```bash
flutter build web --release
```

## 🧪 Testing

### Unit Tests
```bash
flutter test
```

### Widget Tests
```bash
flutter test test/widget/
```

### Integration Tests
```bash
flutter test integration_test/
```

## 🎨 Design System

### Neo Brutal Theme
- **Bold Borders**: 3px 검정 테두리
- **Vivid Colors**: 높은 채도의 원색 사용
- **Hard Shadows**: 오프셋 그림자 효과
- **Geometric Shapes**: 기하학적 디자인 요소

### Color Palette
```dart
static const Color hi = Color(0xFFFFE500);     // 메인 노란색
static const Color mid = Color(0xFF00D9FF);    // 보조 파란색  
static const Color success = Color(0xFF51FF00); // 성공 초록색
static const Color danger = Color(0xFFFF3838);  // 위험 빨간색
static const Color ink = Color(0xFF1A1A1A);    // 텍스트 검정
static const Color bg = Color(0xFFFFFCF2);     // 배경 크림색
```

## 🔐 Security

- 생체 인증을 통한 본인 확인
- 암호화된 로컬 저장소 사용
- GPS 스푸핑 방지 로직
- 디바이스 핑거프린팅

## 📱 Supported Platforms

- iOS 12.0+
- Android 6.0+ (API 23+)
- Web (개발/테스트용)

## 🤝 Contributing

1. Feature 브랜치 생성
2. 변경사항 커밋
3. Pull Request 생성
4. 코드 리뷰 진행

## 📄 License

Proprietary - DOT Platform

## 🔗 Related

- [Web Dashboard](../web/README.md)
- [Main Service](../../README.md)

---

Last Updated: 2025-08-28