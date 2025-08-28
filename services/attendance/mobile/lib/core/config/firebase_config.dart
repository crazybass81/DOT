import 'package:flutter/foundation.dart';

/// Dummy Firebase configuration for development without Firebase dependencies
class FirebaseConfig {
  static bool _initialized = false;
  
  /// Mock Firebase app reference
  static Object get app => _MockFirebaseApp();
  
  /// Mock Firebase analytics
  static Object get analytics => _MockAnalytics();
  
  /// Mock Firebase crashlytics
  static Object get crashlytics => _MockCrashlytics();
  
  /// Mock Remote Config
  static Object get remoteConfig => _MockRemoteConfig();

  /// Initialize Firebase (dummy implementation)
  static Future<void> initialize() async {
    if (_initialized) return;
    
    // Simulate initialization delay
    await Future.delayed(const Duration(milliseconds: 100));
    
    if (kDebugMode) {
      print('Firebase (dummy) initialized successfully');
    }
    
    _initialized = true;
  }

  /// Log custom events (dummy implementation)
  static Future<void> logEvent({
    required String name,
    Map<String, Object>? parameters,
  }) async {
    if (kDebugMode) {
      print('Analytics event logged: $name ${parameters ?? ''}');
    }
  }

  /// Log user properties (dummy implementation)
  static Future<void> setUserProperty({
    required String name,
    required String? value,
  }) async {
    if (kDebugMode) {
      print('User property set: $name = $value');
    }
  }

  /// Set user ID (dummy implementation)
  static Future<void> setUserId(String? userId) async {
    if (kDebugMode) {
      print('User ID set: $userId');
    }
  }

  /// Record error (dummy implementation)
  static Future<void> recordError(
    dynamic exception,
    StackTrace? stackTrace, {
    String? reason,
    bool fatal = false,
    Iterable<Object> context = const [],
  }) async {
    if (kDebugMode) {
      print('Error recorded: $exception (fatal: $fatal)');
      if (reason != null) print('Reason: $reason');
      if (stackTrace != null) print('Stack trace: $stackTrace');
    }
  }

  /// Get Remote Config value (dummy implementation)
  static T getRemoteConfigValue<T>(String key, T defaultValue) {
    if (kDebugMode) {
      print('Remote config value requested: $key (returning default: $defaultValue)');
    }
    
    // Return some mock values for common keys
    switch (key) {
      case 'attendance_radius_meters':
        return (100.0 as T?) ?? defaultValue;
      case 'max_check_in_window_minutes':
        return (30 as T?) ?? defaultValue;
      case 'max_check_out_window_minutes':
        return (30 as T?) ?? defaultValue;
      case 'require_photo_checkin':
        return (true as T?) ?? defaultValue;
      case 'require_photo_checkout':
        return (false as T?) ?? defaultValue;
      case 'enable_biometric_auth':
        return (true as T?) ?? defaultValue;
      case 'enable_qr_checkin':
        return (true as T?) ?? defaultValue;
      case 'qr_code_expiry_minutes':
        return (5 as T?) ?? defaultValue;
      case 'max_offline_days':
        return (7 as T?) ?? defaultValue;
      case 'sync_interval_minutes':
        return (15 as T?) ?? defaultValue;
      case 'force_update_version':
        return ('1.0.0' as T?) ?? defaultValue;
      case 'maintenance_mode':
        return (false as T?) ?? defaultValue;
      case 'maintenance_message':
        return ('App is under maintenance. Please try again later.' as T?) ?? defaultValue;
      default:
        return defaultValue;
    }
  }

  /// Dispose (dummy implementation)
  static Future<void> dispose() async {
    if (kDebugMode) {
      print('Firebase (dummy) disposed');
    }
  }
}

/// Mock Firebase App class
class _MockFirebaseApp {
  @override
  String toString() => 'MockFirebaseApp';
}

/// Mock Analytics class
class _MockAnalytics {
  @override
  String toString() => 'MockAnalytics';
}

/// Mock Crashlytics class
class _MockCrashlytics {
  @override
  String toString() => 'MockCrashlytics';
}

/// Mock Remote Config class
class _MockRemoteConfig {
  @override
  String toString() => 'MockRemoteConfig';
}

/// Background message handler (dummy implementation)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(dynamic message) async {
  if (kDebugMode) {
    print('Background message (dummy): $message');
  }
}