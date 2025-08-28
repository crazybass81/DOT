import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mockito/mockito.dart';

/// Test configuration and utilities for DOT Attendance app testing
class TestConfig {
  /// Initialize test environment with common mock setups
  static void setUp() {
    TestWidgetsFlutterBinding.ensureInitialized();
    
    // Mock system methods
    _mockSystemMethods();
    
    // Set up SharedPreferences mock
    _mockSharedPreferences();
    
    // Configure test-specific settings
    _configureTestSettings();
  }

  /// Mock system methods that are commonly used
  static void _mockSystemMethods() {
    // Mock system chrome methods
    const MethodChannel systemChromeChannel = MethodChannel('flutter/platform');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(systemChromeChannel, (MethodCall methodCall) async {
      if (methodCall.method == 'SystemChrome.setPreferredOrientations') {
        return null;
      }
      if (methodCall.method == 'SystemChrome.setSystemUIOverlayStyle') {
        return null;
      }
      return null;
    });

    // Mock path provider
    const MethodChannel pathProviderChannel = MethodChannel('plugins.flutter.io/path_provider');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(pathProviderChannel, (MethodCall methodCall) async {
      if (methodCall.method == 'getApplicationDocumentsDirectory') {
        return '/tmp/test_documents';
      }
      if (methodCall.method == 'getApplicationSupportDirectory') {
        return '/tmp/test_support';
      }
      if (methodCall.method == 'getTemporaryDirectory') {
        return '/tmp/test_temp';
      }
      return null;
    });

    // Mock package info
    const MethodChannel packageInfoChannel = MethodChannel('plugins.flutter.io/package_info');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(packageInfoChannel, (MethodCall methodCall) async {
      if (methodCall.method == 'getAll') {
        return {
          'appName': 'DOT Attendance Test',
          'packageName': 'com.dot.attendance.test',
          'version': '1.0.0',
          'buildNumber': '1',
        };
      }
      return null;
    });

    // Mock device info
    const MethodChannel deviceInfoChannel = MethodChannel('plugins.flutter.io/device_info');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(deviceInfoChannel, (MethodCall methodCall) async {
      if (methodCall.method == 'getAndroidDeviceInfo') {
        return {
          'version': {'sdkInt': 29},
          'manufacturer': 'Test',
          'model': 'Test Device',
        };
      }
      if (methodCall.method == 'getIosDeviceInfo') {
        return {
          'systemName': 'iOS',
          'systemVersion': '14.0',
          'model': 'iPhone',
          'name': 'Test iPhone',
        };
      }
      return null;
    });
  }

  /// Mock SharedPreferences for testing
  static void _mockSharedPreferences() {
    SharedPreferences.setMockInitialValues({
      'theme_mode': 'system',
      'language': 'ko',
      'first_launch': true,
      'biometric_enabled': false,
    });
  }

  /// Configure test-specific settings
  static void _configureTestSettings() {
    // Disable font loading for tests (speeds up testing)
    // This prevents actual font loading which can be slow in tests
    
    // Set default test viewport
    TestWidgetsFlutterBinding.ensureInitialized()
        .binding.window.physicalSizeTestValue = const Size(414, 896); // iPhone 11 Pro
    TestWidgetsFlutterBinding.ensureInitialized()
        .binding.window.devicePixelRatioTestValue = 2.0;
  }

  /// Clean up after tests
  static void tearDown() {
    // Clear any method channel handlers
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('flutter/platform'), null);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('plugins.flutter.io/path_provider'), null);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('plugins.flutter.io/package_info'), null);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('plugins.flutter.io/device_info'), null);
  }
}

/// Common test data used across multiple test files
class TestData {
  // User test data
  static const Map<String, dynamic> mockUserData = {
    'id': 'user-001',
    'name': 'John Doe',
    'email': 'john.doe@example.com',
    'role': 'USER',
    'department': 'IT',
    'position': 'Developer',
    'createdAt': '2024-01-01T00:00:00.000Z',
  };

  static const Map<String, dynamic> mockAdminData = {
    'id': 'admin-001',
    'name': 'Admin User',
    'email': 'admin@example.com',
    'role': 'ADMIN',
    'department': 'Management',
    'position': 'Admin',
    'createdAt': '2024-01-01T00:00:00.000Z',
  };

  // Attendance test data
  static final Map<String, dynamic> mockAttendanceData = {
    'id': 'att-001',
    'userId': 'user-001',
    'date': DateTime.now().toIso8601String(),
    'checkInTime': DateTime.now().subtract(const Duration(hours: 8)).toIso8601String(),
    'checkOutTime': null,
    'status': 'present',
    'checkInMethod': 'qr',
    'checkInLocation': 'Main Office',
    'checkInLatitude': 37.5665,
    'checkInLongitude': 126.9780,
  };

  // QR Code test data
  static const String mockQrCodeData = 'DOT_QR|checkin|1705282800000|office-main';
  static const String expiredQrCodeData = 'DOT_QR|checkin|1605282800000|office-main';
  static const String invalidQrCodeData = 'INVALID|data|here';

  // Location test data
  static const double officeLatitude = 37.5665; // Seoul office
  static const double officeLongitude = 126.9780;
  static const double officeRadius = 100.0; // 100 meters

  static const double homeLatitude = 37.4979; // Gangnam area
  static const double homeLongitude = 127.0276;

  // Network responses
  static const Map<String, dynamic> successResponse = {
    'status': 'success',
    'message': 'Operation completed successfully',
    'data': {},
  };

  static const Map<String, dynamic> errorResponse = {
    'status': 'error',
    'message': 'Operation failed',
    'code': 'OPERATION_FAILED',
  };

  // Theme test data
  static const List<String> supportedThemes = ['light', 'dark', 'system'];
  static const List<String> supportedLanguages = ['ko', 'en'];
}

/// Test utilities and helper functions
class TestUtils {
  /// Create a test widget wrapped with necessary providers
  static Widget createTestWidget(Widget child) {
    return MaterialApp(
      home: Scaffold(body: child),
      theme: ThemeData.light(),
      darkTheme: ThemeData.dark(),
    );
  }

  /// Simulate network delay for async operations
  static Future<void> simulateNetworkDelay([int milliseconds = 100]) async {
    await Future.delayed(Duration(milliseconds: milliseconds));
  }

  /// Generate test attendance data for a date range
  static List<Map<String, dynamic>> generateAttendanceData({
    required String userId,
    required DateTime startDate,
    required DateTime endDate,
    double presentRate = 0.9, // 90% attendance rate
  }) {
    final attendances = <Map<String, dynamic>>[];
    var currentDate = startDate;

    while (currentDate.isBefore(endDate) || currentDate.isAtSameMomentAs(endDate)) {
      // Skip weekends
      if (currentDate.weekday != DateTime.saturday && currentDate.weekday != DateTime.sunday) {
        final isPresent = Math.random() < presentRate;
        final checkInTime = currentDate.add(Duration(
          hours: 9,
          minutes: Math.random() * 60 ~/ 1,
        ));

        var status = 'absent';
        DateTime? checkOutTime;

        if (isPresent) {
          status = checkInTime.hour > 9 || checkInTime.minute > 30 ? 'late' : 'present';
          checkOutTime = checkInTime.add(Duration(
            hours: 8,
            minutes: Math.random() * 60 ~/ 1,
          ));
        }

        attendances.add({
          'id': 'att-${currentDate.millisecondsSinceEpoch}',
          'userId': userId,
          'date': currentDate.toIso8601String(),
          'checkInTime': isPresent ? checkInTime.toIso8601String() : null,
          'checkOutTime': checkOutTime?.toIso8601String(),
          'status': status,
          'checkInMethod': isPresent ? (Math.random() > 0.5 ? 'qr' : 'gps') : null,
        });
      }

      currentDate = currentDate.add(const Duration(days: 1));
    }

    return attendances;
  }

  /// Mock HTTP responses for testing
  static Map<String, dynamic> createMockApiResponse({
    required bool success,
    Map<String, dynamic>? data,
    String? message,
    String? error,
  }) {
    if (success) {
      return {
        'success': true,
        'data': data ?? {},
        'message': message ?? 'Success',
        'timestamp': DateTime.now().toIso8601String(),
      };
    } else {
      return {
        'success': false,
        'error': error ?? 'Unknown error',
        'message': message ?? 'Request failed',
        'timestamp': DateTime.now().toIso8601String(),
      };
    }
  }

  /// Validate test data structure
  static bool isValidAttendanceData(Map<String, dynamic> data) {
    final requiredFields = ['id', 'userId', 'date', 'status'];
    return requiredFields.every((field) => data.containsKey(field));
  }

  /// Generate mock GPS coordinates within a radius
  static Map<String, double> generateRandomCoordinates({
    required double centerLat,
    required double centerLon,
    required double radiusMeters,
  }) {
    final radiusInDegrees = radiusMeters / 111000.0; // Rough conversion
    final u = Math.random();
    final v = Math.random();
    
    final w = radiusInDegrees * sqrt(u);
    final t = 2 * Math.pi * v;
    
    final x = w * cos(t);
    final y = w * sin(t);
    
    return {
      'latitude': centerLat + x,
      'longitude': centerLon + y,
    };
  }

  /// Create test environment with mocked dependencies
  static void setupTestEnvironment() {
    TestConfig.setUp();
  }

  /// Clean up test environment
  static void tearDownTestEnvironment() {
    TestConfig.tearDown();
  }
}

/// Custom test matchers for DOT Attendance specific testing
class DOTMatchers {
  /// Matcher for valid attendance status
  static Matcher isValidAttendanceStatus() {
    return predicate<String>((status) {
      final validStatuses = ['present', 'absent', 'late', 'half_day', 'leave', 'holiday'];
      return validStatuses.contains(status);
    }, 'is a valid attendance status');
  }

  /// Matcher for valid user role
  static Matcher isValidUserRole() {
    return predicate<String>((role) {
      final validRoles = ['USER', 'ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN'];
      return validRoles.contains(role);
    }, 'is a valid user role');
  }

  /// Matcher for valid QR code format
  static Matcher isValidQrCode() {
    return predicate<String>((qrCode) {
      return qrCode.startsWith('DOT_QR|') && qrCode.split('|').length >= 3;
    }, 'is a valid DOT QR code');
  }

  /// Matcher for coordinates within Seoul area
  static Matcher isSeoulCoordinate() {
    return predicate<double>((coordinate) {
      // Seoul area bounds (approximate)
      return coordinate >= 37.0 && coordinate <= 38.0; // Latitude range
    }, 'is within Seoul coordinate range');
  }

  /// Matcher for valid working hours duration
  static Matcher isValidWorkingHours() {
    return predicate<Duration>((duration) {
      final hours = duration.inHours;
      return hours >= 0 && hours <= 24; // 0-24 hours is reasonable
    }, 'is a valid working hours duration');
  }
}

// Import math for random number generation
import 'dart:math' as Math;
import 'dart:math' show cos, sin, sqrt, pi;