# DOT Attendance

A comprehensive Flutter application for employee attendance management with clean architecture, modern UI, and advanced features.

## 🏗️ Architecture

This project follows Clean Architecture principles with clear separation of concerns:

- **Presentation Layer**: UI components, pages, providers (Riverpod state management)
- **Domain Layer**: Business logic, entities, use cases, repository interfaces
- **Data Layer**: Repository implementations, data sources (remote/local), models

## 📁 Project Structure

```
lib/
├── core/                   # Core functionality
│   ├── constants/          # App constants and configurations
│   ├── di/                 # Dependency injection setup
│   ├── errors/             # Error handling (exceptions & failures)
│   ├── network/            # HTTP client and interceptors
│   ├── services/           # Core services (location, camera, etc.)
│   ├── storage/            # Local and secure storage services
│   ├── theme/              # App theme and styling
│   └── utils/              # Utility functions
├── data/                   # Data layer
│   ├── datasources/        # Data sources (remote/local)
│   ├── models/             # Data models with JSON serialization
│   └── repositories/       # Repository implementations
├── domain/                 # Domain layer
│   ├── entities/           # Business entities
│   ├── repositories/       # Repository interfaces
│   └── usecases/          # Business use cases
├── presentation/          # Presentation layer
│   ├── pages/             # UI pages/screens
│   ├── providers/         # State management (Riverpod)
│   ├── router/            # Navigation configuration
│   └── widgets/           # Reusable UI components
└── shared/                # Shared utilities
    ├── enums/             # App enumerations
    ├── extensions/        # Dart extensions
    ├── mixins/            # Reusable mixins
    └── validators/        # Input validators
```

## 🚀 Features

### Core Features
- **Authentication**: Email/password login with biometric support
- **Attendance Management**: Check-in/out with multiple methods
- **Location Services**: GPS-based attendance verification
- **QR Code Scanning**: QR code-based attendance marking
- **Reports**: Comprehensive attendance reports and analytics
- **Profile Management**: User profile and settings

### Technical Features
- **Clean Architecture**: Scalable and maintainable code structure
- **State Management**: Riverpod for reactive state management
- **Dependency Injection**: GetIt with Injectable for DI
- **Networking**: Dio with interceptors for API communication
- **Local Storage**: Shared Preferences + Secure Storage
- **Navigation**: Go Router for type-safe navigation
- **Theming**: Material 3 with dark/light theme support
- **Internationalization**: Multi-language support ready
- **Error Handling**: Comprehensive error handling system
- **Code Generation**: JSON serialization, Freezed, etc.

## 🛠️ Tech Stack

### Core
- **Flutter**: 3.10+
- **Dart**: 3.0+

### State Management
- **Riverpod**: 2.4+ (with code generation)

### Navigation
- **Go Router**: 12.1+ for declarative routing

### Dependency Injection
- **GetIt**: 7.6+ with Injectable for DI

### Networking
- **Dio**: 5.3+ for HTTP client
- **Retrofit**: 4.0+ for API client generation

### Local Storage
- **Shared Preferences**: For app preferences
- **Flutter Secure Storage**: For sensitive data
- **Hive**: For structured local data

### UI/UX
- **Material 3**: Modern Material Design
- **Google Fonts**: Custom typography
- **Lottie**: Animations
- **Shimmer**: Loading placeholders
- **Cached Network Image**: Optimized image loading

### Device Features
- **Camera**: Image capture and QR scanning
- **Location**: GPS and geocoding services
- **Biometrics**: Fingerprint/Face ID authentication
- **Notifications**: Local and push notifications

### Code Generation
- **Freezed**: Immutable data classes
- **JSON Annotation**: API model serialization
- **Injectable**: Dependency injection
- **Retrofit Generator**: API client generation

## 🔧 Setup

### Prerequisites
- Flutter 3.10 or higher
- Dart 3.0 or higher
- Android SDK 21+ / iOS 12+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dot_attendance
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Generate code**
   ```bash
   flutter packages pub run build_runner build --delete-conflicting-outputs
   ```

4. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the app**
   ```bash
   flutter run
   ```

## 🔄 Code Generation

This project uses several code generators:

```bash
# Generate all
flutter packages pub run build_runner build --delete-conflicting-outputs

# Watch for changes
flutter packages pub run build_runner watch --delete-conflicting-outputs

# Clean generated files
flutter packages pub run build_runner clean
```

## 🧪 Testing

```bash
# Run all tests
flutter test

# Run with coverage
flutter test --coverage

# Run specific test
flutter test test/unit/auth_test.dart
```

## 📱 Build

### Android
```bash
flutter build apk --release
# or
flutter build appbundle --release
```

### iOS
```bash
flutter build ios --release
```

## 🎨 Design System

The app follows Material 3 design principles with:
- **Primary Color**: Green (#2E7D32)
- **Typography**: Roboto font family
- **Dark/Light themes**: Automatic system detection
- **Consistent spacing**: 8px grid system
- **Component library**: Reusable UI components

## 📋 Development Guidelines

### Code Style
- Follow Dart style guide
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### Architecture Rules
- **Domain layer**: No dependencies on external frameworks
- **Data layer**: Implements domain repository interfaces
- **Presentation layer**: Only UI and state management logic
- **Dependency Direction**: Outer layers depend on inner layers

### State Management
- Use Riverpod providers for state
- Keep providers focused and composable
- Handle loading and error states
- Use code generation where possible

## 🔐 Security

- **Secure Storage**: Sensitive data encrypted
- **Biometric Authentication**: Device-level security
- **Network Security**: Certificate pinning ready
- **Token Management**: Automatic refresh handling
- **Permission Handling**: Runtime permission requests

## 🚀 Performance

- **Lazy Loading**: Routes and heavy widgets
- **Image Optimization**: Cached and compressed images
- **Memory Management**: Proper disposal of resources
- **Build Optimization**: Code splitting and tree shaking
- **Database**: Efficient local data storage

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding guidelines
4. Add tests for new features
5. Submit a pull request

## 📞 Support

For questions or issues:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

Built with ❤️ using Flutter and Clean Architecture