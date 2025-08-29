import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import '../../../../lib/core/di/injection_container.dart';
import '../../../../lib/core/storage/local_storage_service.dart';
import '../../../../lib/core/storage/secure_storage_service.dart';
import '../../../../lib/core/services/location_service.dart';
import '../../../../lib/core/services/attendance_service.dart';
import '../../../../lib/domain/usecases/auth/login_usecase.dart';

void main() {
  group('Dependency Injection Container Tests', () {
    tearDown(() {
      // Clean up GetIt instance after each test
      GetIt.instance.reset();
    });

    test('should configure all dependencies successfully', () async {
      // Act
      await configureDependencies();

      // Assert - Test core services
      expect(() => getIt<LocalStorageService>(), returnsNormally);
      expect(() => getIt<SecureStorageService>(), returnsNormally);
      expect(() => getIt<LocationService>(), returnsNormally);
      expect(() => getIt<AttendanceService>(), returnsNormally);
      
      // Assert - Test use cases
      expect(() => getIt<LoginUseCase>(), returnsNormally);
    });

    test('should inject services with correct types', () async {
      // Arrange
      await configureDependencies();

      // Act & Assert
      final localStorage = getIt<LocalStorageService>();
      expect(localStorage, isA<LocalStorageService>());

      final secureStorage = getIt<SecureStorageService>();
      expect(secureStorage, isA<SecureStorageService>());

      final locationService = getIt<LocationService>();
      expect(locationService, isA<LocationService>());

      final attendanceService = getIt<AttendanceService>();
      expect(attendanceService, isA<AttendanceService>());

      final loginUseCase = getIt<LoginUseCase>();
      expect(loginUseCase, isA<LoginUseCase>());
    });

    test('should return singleton instances', () async {
      // Arrange
      await configureDependencies();

      // Act
      final localStorage1 = getIt<LocalStorageService>();
      final localStorage2 = getIt<LocalStorageService>();

      final loginUseCase1 = getIt<LoginUseCase>();
      final loginUseCase2 = getIt<LoginUseCase>();

      // Assert
      expect(identical(localStorage1, localStorage2), true);
      expect(identical(loginUseCase1, loginUseCase2), true);
    });
  });
}