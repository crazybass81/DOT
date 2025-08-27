# Comprehensive Testing Strategy for DOT ATTENDANCE

## Current Testing State
- **Total Files**: 81 Dart files
- **Test Files**: 13 (16% coverage)
- **Critical Gap**: Missing tests for core authentication, attendance, and business logic

## Testing Goals
- **Target Coverage**: 80% minimum for production
- **Unit Tests**: 60+ files
- **Integration Tests**: 15+ critical flows
- **Widget Tests**: 20+ UI components
- **End-to-End Tests**: 8+ complete user journeys

---

## 1. Unit Testing Implementation

### A. Enhanced Storage Service Tests
```dart
// test/unit/core/storage/secure_storage_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../../lib/core/storage/secure_storage_service_enhanced.dart';
import '../../../../lib/core/errors/app_error.dart';

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  group('SecureStorageServiceEnhanced', () {
    late SecureStorageServiceEnhanced storageService;
    late MockFlutterSecureStorage mockStorage;

    setUp(() {
      mockStorage = MockFlutterSecureStorage();
      storageService = SecureStorageServiceEnhanced(mockStorage);
    });

    group('storeAccessToken', () {
      test('should store encrypted token successfully', () async {
        // Arrange
        const token = 'test_access_token';
        when(() => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        )).thenAnswer((_) async {});

        // Act
        final result = await storageService.storeAccessToken(token);

        // Assert
        expect(result.isSuccess, isTrue);
        verify(() => mockStorage.write(
          key: 'access_token',
          value: any(named: 'value', that: isA<String>()),
        )).called(1);
      });

      test('should return storage error when write fails', () async {
        // Arrange
        const token = 'test_access_token';
        when(() => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        )).thenThrow(Exception('Storage write failed'));

        // Act
        final result = await storageService.storeAccessToken(token);

        // Assert
        expect(result.isFailure, isTrue);
        expect(result.error, isA<StorageError>());
        expect(result.error!.displayMessage, contains('Failed to store access token'));
      });
    });

    group('getAccessToken', () {
      test('should return decrypted token when valid', () async {
        // Arrange
        const token = 'test_access_token';
        final mockStoredValue = json.encode({
          'token': 'encrypted_token_data',
          'timestamp': DateTime.now().millisecondsSinceEpoch.toString(),
          'hash': 'token_hash',
        });

        when(() => mockStorage.read(key: 'access_token'))
            .thenAnswer((_) async => mockStoredValue);

        // Mock the encryption/decryption process
        // This would need to be adjusted based on actual implementation

        // Act
        final result = await storageService.getAccessToken();

        // Assert - This test needs actual encryption implementation
        verify(() => mockStorage.read(key: 'access_token')).called(1);
      });

      test('should return error when token not found', () async {
        // Arrange
        when(() => mockStorage.read(key: 'access_token'))
            .thenAnswer((_) async => null);

        // Act
        final result = await storageService.getAccessToken();

        // Assert
        expect(result.isFailure, isTrue);
        expect(result.error, isA<StorageError>());
        expect(result.error!.displayMessage, equals('Access token not found'));
      });

      test('should return error when token is expired', () async {
        // Arrange
        final expiredTimestamp = DateTime.now()
            .subtract(const Duration(hours: 9))
            .millisecondsSinceEpoch
            .toString();
        
        final mockStoredValue = json.encode({
          'token': 'encrypted_token_data',
          'timestamp': expiredTimestamp,
          'hash': 'token_hash',
        });

        when(() => mockStorage.read(key: 'access_token'))
            .thenAnswer((_) async => mockStoredValue);
        when(() => mockStorage.delete(key: 'access_token'))
            .thenAnswer((_) async {});

        // Act
        final result = await storageService.getAccessToken();

        // Assert
        expect(result.isFailure, isTrue);
        expect(result.error, isA<AuthenticationError>());
        expect(result.error!.displayMessage, equals('Token expired'));
        verify(() => mockStorage.delete(key: 'access_token')).called(1);
      });
    });
  });
}
```

### B. Enhanced Auth Provider Tests
```dart
// test/unit/presentation/providers/enhanced_auth_provider_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../lib/presentation/providers/enhanced_auth_provider.dart';
import '../../../../lib/domain/usecases/auth/enhanced_login_usecase.dart';
import '../../../../lib/domain/entities/user/user.dart';
import '../../../../lib/core/errors/app_error.dart';
import '../../../../lib/core/utils/result.dart';

class MockEnhancedLoginUseCase extends Mock implements EnhancedLoginUseCase {}

void main() {
  group('EnhancedAuthProvider', () {
    late MockEnhancedLoginUseCase mockLoginUseCase;
    late ProviderContainer container;

    setUp(() {
      mockLoginUseCase = MockEnhancedLoginUseCase();
      container = ProviderContainer(
        overrides: [
          enhancedLoginUseCaseProvider.overrideWith((ref) => mockLoginUseCase),
        ],
      );
    });

    tearDown(() {
      container.dispose();
    });

    group('login', () {
      test('should update state to authenticated when login succeeds', () async {
        // Arrange
        const user = User(
          id: '1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        );

        when(() => mockLoginUseCase.call(any()))
            .thenAnswer((_) async => const Result.success(user));

        final notifier = container.read(enhancedAuthProvider.notifier);
        
        // Act
        final result = await notifier.login(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert
        expect(result.isSuccess, isTrue);
        final state = container.read(enhancedAuthProvider);
        expect(state.isAuthenticated, isTrue);
        expect(state.user, equals(user));
        expect(state.isLoading, isFalse);
        expect(state.error, isNull);
      });

      test('should update state with error when login fails', () async {
        // Arrange
        const error = AppError.authentication(
          message: 'Invalid credentials',
        );

        when(() => mockLoginUseCase.call(any()))
            .thenAnswer((_) async => const Result.failure(error));

        final notifier = container.read(enhancedAuthProvider.notifier);
        
        // Act
        final result = await notifier.login(
          email: 'test@example.com',
          password: 'wrong_password',
        );

        // Assert
        expect(result.isFailure, isTrue);
        expect(result.error, equals(error));
        final state = container.read(enhancedAuthProvider);
        expect(state.isAuthenticated, isFalse);
        expect(state.user, isNull);
        expect(state.isLoading, isFalse);
        expect(state.error, equals(error));
      });

      test('should set loading state during login', () async {
        // Arrange
        const user = User(
          id: '1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        );

        when(() => mockLoginUseCase.call(any()))
            .thenAnswer((_) async {
          // Verify loading state is set
          final state = container.read(enhancedAuthProvider);
          expect(state.isLoading, isTrue);
          
          return const Result.success(user);
        });

        final notifier = container.read(enhancedAuthProvider.notifier);
        
        // Act
        await notifier.login(
          email: 'test@example.com',
          password: 'password123',
        );

        // Assert - loading should be false after completion
        final finalState = container.read(enhancedAuthProvider);
        expect(finalState.isLoading, isFalse);
      });
    });

    group('clearError', () {
      test('should clear error from state', () {
        // Arrange
        const error = AppError.authentication(message: 'Some error');
        final notifier = container.read(enhancedAuthProvider.notifier);
        notifier.state = notifier.state.copyWith(error: error);

        // Act
        notifier.clearError();

        // Assert
        final state = container.read(enhancedAuthProvider);
        expect(state.error, isNull);
      });
    });
  });
}
```

### C. Validation Rules Tests
```dart
// test/unit/core/validation/validation_rules_test.dart
import 'package:flutter_test/flutter_test.dart';
import '../../../../lib/core/validation/validation_rules.dart';
import '../../../../lib/core/errors/app_error.dart';

void main() {
  group('EmailValidationRule', () {
    late EmailValidationRule validator;

    setUp(() {
      validator = EmailValidationRule();
    });

    test('should validate correct email formats', () {
      final validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'user123@test-domain.org',
      ];

      for (final email in validEmails) {
        final result = validator.validate(email);
        expect(result.isSuccess, isTrue, reason: 'Failed for email: $email');
        expect(result.data, equals(email.toLowerCase()));
      }
    });

    test('should reject invalid email formats', () {
      final invalidEmails = [
        '',
        'invalid-email',
        '@domain.com',
        'user@',
        'user space@domain.com',
      ];

      for (final email in invalidEmails) {
        final result = validator.validate(email);
        expect(result.isFailure, isTrue, reason: 'Should fail for email: $email');
        expect(result.error, isA<ValidationError>());
      }
    });

    test('should trim and lowercase valid emails', () {
      const email = '  USER@EXAMPLE.COM  ';
      final result = validator.validate(email);
      
      expect(result.isSuccess, isTrue);
      expect(result.data, equals('user@example.com'));
    });
  });

  group('PasswordValidationRule', () {
    late PasswordValidationRule validator;

    setUp(() {
      validator = const PasswordValidationRule();
    });

    test('should validate strong passwords', () {
      const strongPassword = 'StrongPass123!';
      final result = validator.validate(strongPassword);
      
      expect(result.isSuccess, isTrue);
      expect(result.data, equals(strongPassword));
    });

    test('should reject weak passwords', () {
      final weakPasswords = [
        'short', // Too short
        'nouppercase123!', // No uppercase
        'NOLOWERCASE123!', // No lowercase
        'NoNumbers!', // No numbers
        'NoSpecialChars123', // No special characters
      ];

      for (final password in weakPasswords) {
        final result = validator.validate(password);
        expect(result.isFailure, isTrue, reason: 'Should fail for password: $password');
        final error = result.error as ValidationError;
        expect(error.fieldErrors?['password'], isNotEmpty);
      }
    });

    test('should allow customizable rules', () {
      final lenientValidator = PasswordValidationRule(
        minLength: 6,
        requireUppercase: false,
        requireSpecialChars: false,
      );

      const lenientPassword = 'simple123';
      final result = lenientValidator.validate(lenientPassword);
      
      expect(result.isSuccess, isTrue);
    });
  });

  group('Validator', () {
    test('should validate complete login form successfully', () {
      final result = Validator.validateLoginForm(
        email: 'user@example.com',
        password: 'Password123!',
      );

      expect(result.isSuccess, isTrue);
      expect(result.data!['email'], equals('user@example.com'));
      expect(result.data!['password'], equals('Password123!'));
    });

    test('should return validation errors for invalid form', () {
      final result = Validator.validateLoginForm(
        email: 'invalid-email',
        password: 'weak',
      );

      expect(result.isFailure, isTrue);
      final error = result.error as ValidationError;
      expect(error.fieldErrors!['email'], isNotEmpty);
      expect(error.fieldErrors!['password'], isNotEmpty);
    });
  });
}
```

## 2. Integration Testing Implementation

### A. Authentication Flow Integration Test
```dart
// test/integration/auth_flow_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

import '../../lib/main.dart';
import '../../lib/presentation/providers/enhanced_auth_provider.dart';
import '../../lib/domain/entities/user/user.dart';
import '../../lib/core/utils/result.dart';

class MockAuthRepository extends Mock implements IAuthRepository {}

void main() {
  group('Authentication Flow Integration', () {
    late MockAuthRepository mockAuthRepository;

    setUp(() {
      mockAuthRepository = MockAuthRepository();
    });

    testWidgets('complete login flow should work correctly', (tester) async {
      // Arrange
      const user = User(
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      );

      when(() => mockAuthRepository.login(any()))
          .thenAnswer((_) async => const Result.success(user));

      // Act
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authRepositoryProvider.overrideWith((ref) => mockAuthRepository),
          ],
          child: const DOTAttendanceApp(),
        ),
      );

      // Wait for initial load
      await tester.pumpAndSettle();

      // Find and fill login form
      final emailField = find.byKey(const Key('email_field'));
      final passwordField = find.byKey(const Key('password_field'));
      final loginButton = find.byKey(const Key('login_button'));

      expect(emailField, findsOneWidget);
      expect(passwordField, findsOneWidget);
      expect(loginButton, findsOneWidget);

      await tester.enterText(emailField, 'test@example.com');
      await tester.enterText(passwordField, 'password123');
      await tester.tap(loginButton);

      // Wait for login to complete
      await tester.pumpAndSettle();

      // Assert - should navigate to main screen
      expect(find.text('Dashboard'), findsOneWidget);
      verify(() => mockAuthRepository.login(any())).called(1);
    });

    testWidgets('should show error message on login failure', (tester) async {
      // Arrange
      const error = AppError.authentication(message: 'Invalid credentials');
      when(() => mockAuthRepository.login(any()))
          .thenAnswer((_) async => const Result.failure(error));

      // Act
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authRepositoryProvider.overrideWith((ref) => mockAuthRepository),
          ],
          child: const DOTAttendanceApp(),
        ),
      );

      await tester.pumpAndSettle();

      // Fill login form with invalid credentials
      await tester.enterText(find.byKey(const Key('email_field')), 'test@example.com');
      await tester.enterText(find.byKey(const Key('password_field')), 'wrong_password');
      await tester.tap(find.byKey(const Key('login_button')));

      await tester.pumpAndSettle();

      // Assert - should show error message
      expect(find.text('Invalid credentials'), findsOneWidget);
      expect(find.text('Dashboard'), findsNothing);
    });

    testWidgets('should validate form inputs before submission', (tester) async {
      // Act
      await tester.pumpWidget(
        ProviderScope(
          child: const DOTAttendanceApp(),
        ),
      );

      await tester.pumpAndSettle();

      // Try to submit with empty fields
      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pump();

      // Assert - should show validation errors
      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password must be at least 6 characters'), findsOneWidget);

      // Verify login was not called
      verifyNever(() => mockAuthRepository.login(any()));
    });
  });
}
```

### B. Attendance Flow Integration Test
```dart
// test/integration/attendance_flow_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';
import 'package:geolocator/geolocator.dart';

import '../../lib/main.dart';
import '../../lib/domain/entities/attendance/attendance.dart';
import '../../lib/core/services/location_service.dart';
import '../../lib/core/utils/result.dart';

class MockLocationService extends Mock implements LocationService {}
class MockAttendanceRepository extends Mock implements IAttendanceRepository {}

void main() {
  group('Attendance Flow Integration', () {
    late MockLocationService mockLocationService;
    late MockAttendanceRepository mockAttendanceRepository;

    setUp(() {
      mockLocationService = MockLocationService();
      mockAttendanceRepository = MockAttendanceRepository();
    });

    testWidgets('successful check-in flow', (tester) async {
      // Arrange
      final mockPosition = Position(
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: DateTime.now(),
        accuracy: 5.0,
        altitude: 0.0,
        altitudeAccuracy: 0.0,
        heading: 0.0,
        headingAccuracy: 0.0,
        speed: 0.0,
        speedAccuracy: 0.0,
      );

      final attendance = Attendance(
        id: '1',
        userId: 'user1',
        checkInTime: DateTime.now(),
        location: AttendanceLocation(
          latitude: 37.7749,
          longitude: -122.4194,
          address: 'Test Address',
        ),
      );

      when(() => mockLocationService.getCurrentLocation())
          .thenAnswer((_) async => mockPosition);
      when(() => mockLocationService.isWithinAttendanceRadius(any(), any()))
          .thenAnswer((_) async => true);
      when(() => mockAttendanceRepository.checkIn(any()))
          .thenAnswer((_) async => Result.success(attendance));

      // Act - Start from authenticated state
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            locationServiceProvider.overrideWith((ref) => mockLocationService),
            attendanceRepositoryProvider.overrideWith((ref) => mockAttendanceRepository),
            // Mock authenticated state
            enhancedAuthProvider.overrideWith((ref) => 
              EnhancedAuthNotifier(mockLoginUseCase)..state = 
                const EnhancedAuthState(
                  isAuthenticated: true,
                  user: User(
                    id: 'user1',
                    email: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                  ),
                )
            ),
          ],
          child: const DOTAttendanceApp(),
        ),
      );

      await tester.pumpAndSettle();

      // Find and tap check-in button
      final checkInButton = find.byKey(const Key('check_in_button'));
      expect(checkInButton, findsOneWidget);

      await tester.tap(checkInButton);
      await tester.pumpAndSettle();

      // Assert - should show success message and update UI
      expect(find.text('Checked in successfully'), findsOneWidget);
      expect(find.byKey(const Key('check_out_button')), findsOneWidget);
      
      verify(() => mockLocationService.getCurrentLocation()).called(1);
      verify(() => mockLocationService.isWithinAttendanceRadius(any(), any())).called(1);
      verify(() => mockAttendanceRepository.checkIn(any())).called(1);
    });

    testWidgets('should show error when outside work location', (tester) async {
      // Arrange
      final mockPosition = Position(
        latitude: 40.7128, // Different location
        longitude: -74.0060,
        timestamp: DateTime.now(),
        accuracy: 5.0,
        altitude: 0.0,
        altitudeAccuracy: 0.0,
        heading: 0.0,
        headingAccuracy: 0.0,
        speed: 0.0,
        speedAccuracy: 0.0,
      );

      when(() => mockLocationService.getCurrentLocation())
          .thenAnswer((_) async => mockPosition);
      when(() => mockLocationService.isWithinAttendanceRadius(any(), any()))
          .thenAnswer((_) async => false);

      // Act
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            locationServiceProvider.overrideWith((ref) => mockLocationService),
            // Mock authenticated state
          ],
          child: const DOTAttendanceApp(),
        ),
      );

      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('check_in_button')));
      await tester.pumpAndSettle();

      // Assert - should show location error
      expect(find.text('You are outside the work location'), findsOneWidget);
      
      verify(() => mockLocationService.getCurrentLocation()).called(1);
      verify(() => mockLocationService.isWithinAttendanceRadius(any(), any())).called(1);
      verifyNever(() => mockAttendanceRepository.checkIn(any()));
    });
  });
}
```

## 3. Widget Testing Implementation

### A. Login Form Widget Test
```dart
// test/widget/auth/login_form_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

import '../../../lib/presentation/pages/auth/login_page.dart';
import '../../../lib/presentation/providers/enhanced_auth_provider.dart';
import '../../../lib/core/theme/neo_brutal_theme.dart';

class MockAuthNotifier extends Mock implements EnhancedAuthNotifier {}

void main() {
  group('LoginForm Widget', () {
    late MockAuthNotifier mockAuthNotifier;

    setUp(() {
      mockAuthNotifier = MockAuthNotifier();
      when(() => mockAuthNotifier.state).thenReturn(
        const EnhancedAuthState(),
      );
    });

    testWidgets('should render all login form elements', (tester) async {
      // Act
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            enhancedAuthProvider.notifier.overrideWith((ref) => mockAuthNotifier),
          ],
          child: MaterialApp(
            theme: NeoBrutalTheme.lightTheme,
            home: const LoginPage(),
          ),
        ),
      );

      // Assert
      expect(find.byKey(const Key('email_field')), findsOneWidget);
      expect(find.byKey(const Key('password_field')), findsOneWidget);
      expect(find.byKey(const Key('login_button')), findsOneWidget);
      expect(find.byKey(const Key('biometric_button')), findsOneWidget);
      expect(find.text('Login'), findsOneWidget);
    });

    testWidgets('should show validation errors for empty fields', (tester) async {
      // Arrange
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            enhancedAuthProvider.notifier.overrideWith((ref) => mockAuthNotifier),
          ],
          child: MaterialApp(
            theme: NeoBrutalTheme.lightTheme,
            home: const LoginPage(),
          ),
        ),
      );

      // Act
      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pump();

      // Assert
      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('should call login when form is valid', (tester) async {
      // Arrange
      when(() => mockAuthNotifier.login(
        email: any(named: 'email'),
        password: any(named: 'password'),
      )).thenAnswer((_) async => const Result.success(null));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            enhancedAuthProvider.notifier.overrideWith((ref) => mockAuthNotifier),
          ],
          child: MaterialApp(
            theme: NeoBrutalTheme.lightTheme,
            home: const LoginPage(),
          ),
        ),
      );

      // Act
      await tester.enterText(find.byKey(const Key('email_field')), 'test@example.com');
      await tester.enterText(find.byKey(const Key('password_field')), 'password123');
      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pump();

      // Assert
      verify(() => mockAuthNotifier.login(
        email: 'test@example.com',
        password: 'password123',
      )).called(1);
    });

    testWidgets('should show loading state during login', (tester) async {
      // Arrange
      when(() => mockAuthNotifier.state).thenReturn(
        const EnhancedAuthState(isLoading: true),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            enhancedAuthProvider.notifier.overrideWith((ref) => mockAuthNotifier),
          ],
          child: MaterialApp(
            theme: NeoBrutalTheme.lightTheme,
            home: const LoginPage(),
          ),
        ),
      );

      // Assert
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Logging in...'), findsOneWidget);
    });

    testWidgets('should show error message when login fails', (tester) async {
      // Arrange
      const error = AppError.authentication(message: 'Invalid credentials');
      when(() => mockAuthNotifier.state).thenReturn(
        const EnhancedAuthState(error: error),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            enhancedAuthProvider.notifier.overrideWith((ref) => mockAuthNotifier),
          ],
          child: MaterialApp(
            theme: NeoBrutalTheme.lightTheme,
            home: const LoginPage(),
          ),
        ),
      );

      // Assert
      expect(find.text('Invalid credentials'), findsOneWidget);
      expect(find.byIcon(Icons.error), findsOneWidget);
    });
  });
}
```

## 4. End-to-End Testing Implementation

### A. Complete User Journey Test
```dart
// test/e2e/complete_user_journey_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../lib/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Complete User Journey E2E', () {
    testWidgets('login -> check-in -> view history -> logout', (tester) async {
      // Start app
      app.main();
      await tester.pumpAndSettle();

      // Login flow
      await tester.enterText(
        find.byKey(const Key('email_field')), 
        'test@example.com',
      );
      await tester.enterText(
        find.byKey(const Key('password_field')), 
        'password123',
      );
      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pumpAndSettle();

      // Verify dashboard is shown
      expect(find.text('Dashboard'), findsOneWidget);

      // Navigate to attendance
      await tester.tap(find.byIcon(Icons.qr_code_scanner));
      await tester.pumpAndSettle();

      // Check-in (assuming location permissions are granted)
      await tester.tap(find.byKey(const Key('check_in_button')));
      await tester.pumpAndSettle();

      // Verify check-in success
      expect(find.text('Checked in successfully'), findsOneWidget);

      // Navigate to history
      await tester.tap(find.byKey(const Key('history_tab')));
      await tester.pumpAndSettle();

      // Verify attendance history is shown
      expect(find.byKey(const Key('attendance_history_list')), findsOneWidget);

      // Navigate to profile
      await tester.tap(find.byIcon(Icons.person));
      await tester.pumpAndSettle();

      // Logout
      await tester.tap(find.byKey(const Key('logout_button')));
      await tester.pumpAndSettle();

      // Verify back to login screen
      expect(find.byKey(const Key('login_button')), findsOneWidget);
    });

    testWidgets('biometric login flow', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Try biometric login
      await tester.tap(find.byKey(const Key('biometric_button')));
      await tester.pumpAndSettle();

      // Note: Actual biometric testing would require device-specific setup
      // This test would verify the UI flow and mock the biometric result
    });
  });
}
```

## 5. Test Configuration and Setup

### A. Test Helper Utilities
```dart
// test/helpers/test_helpers.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

import '../../lib/core/theme/neo_brutal_theme.dart';
import '../../lib/domain/entities/user/user.dart';

class TestHelpers {
  static Widget createTestApp({
    required Widget child,
    List<Override>? providerOverrides,
  }) {
    return ProviderScope(
      overrides: providerOverrides ?? [],
      child: MaterialApp(
        theme: NeoBrutalTheme.lightTheme,
        home: child,
      ),
    );
  }

  static User createTestUser({
    String id = 'test_id',
    String email = 'test@example.com',
    String firstName = 'John',
    String lastName = 'Doe',
  }) {
    return User(
      id: id,
      email: email,
      firstName: firstName,
      lastName: lastName,
    );
  }

  static void setupMockServices() {
    registerFallbackValue(const LoginParams(
      email: 'test@example.com', 
      password: 'password',
    ));
  }
}
```

### B. Test Configuration
```yaml
# pubspec.yaml - Additional test dependencies
dev_dependencies:
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
  mockito: ^5.4.2
  mocktail: ^1.0.1
  bloc_test: ^9.1.5
  golden_toolkit: ^0.15.0
  patrol: ^2.0.0 # For advanced E2E testing
```

## Testing Implementation Timeline

### Week 1: Unit Tests Foundation
- [ ] Core utilities and error handling tests
- [ ] Storage service tests
- [ ] Validation rules tests
- [ ] Repository layer tests

### Week 2: Business Logic Tests
- [ ] Use case tests
- [ ] Provider/State management tests
- [ ] Service layer tests
- [ ] Authentication flow tests

### Week 3: UI and Integration Tests
- [ ] Widget tests for components
- [ ] Integration tests for critical flows
- [ ] Error boundary tests
- [ ] Theme and accessibility tests

### Week 4: E2E and Performance Tests
- [ ] Complete user journey tests
- [ ] Performance and load tests
- [ ] Security tests
- [ ] Cross-platform compatibility tests

## Test Quality Metrics

### Coverage Goals
- **Unit Tests**: 85% line coverage
- **Integration Tests**: 80% critical path coverage
- **Widget Tests**: 75% UI component coverage
- **E2E Tests**: 90% user journey coverage

### Quality Gates
- All tests must pass before merge
- New features require tests
- Minimum 80% overall coverage
- Performance benchmarks maintained
- Security tests for sensitive operations

This comprehensive testing strategy ensures the DOT ATTENDANCE application meets production quality standards with robust error handling, security validation, and user experience verification.