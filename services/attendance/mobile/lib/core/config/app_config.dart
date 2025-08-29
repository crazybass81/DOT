import 'package:flutter/foundation.dart';

/// 앱 전역 설정
class AppConfig {
  // API Gateway endpoint
  static String get apiGatewayUrl {
    if (kDebugMode) {
      return 'https://dev-api.dot-attendance.com';
    }
    return 'https://api.dot-attendance.com';
  }
  
  // AWS Region
  static const String awsRegion = 'ap-northeast-2';
  
  // DynamoDB Table Names
  static const String attendanceTable = 'DOT_ATTENDANCE_RECORDS';
  static const String employeesTable = 'DOT_EMPLOYEES';
  static const String auditTable = 'DOT_AUDIT_LOGS';
  static const String analyticsTable = 'DOT_ANALYTICS';
  
  // Firebase Project IDs
  static String get firebaseProjectId {
    if (kDebugMode) {
      return 'dot-attendance-dev';
    }
    return 'dot-attendance';
  }
  
  // Feature Flags
  static const bool enableOfflineMode = true;
  static const bool enableBiometricAuth = true;
  static const bool enableLocationTracking = true;
  static const bool enablePushNotifications = true;
  
  // Cache Settings
  static const Duration cacheExpiration = Duration(hours: 1);
  static const int maxCacheSize = 50 * 1024 * 1024; // 50MB
  
  // QR Code Settings
  static const Duration qrCodeExpiration = Duration(seconds: 30);
  static const int qrCodeRefreshInterval = 25; // seconds
  
  // Sync Settings
  static const Duration syncInterval = Duration(minutes: 5);
  static const int maxRetryAttempts = 3;
  static const Duration retryDelay = Duration(seconds: 30);
}