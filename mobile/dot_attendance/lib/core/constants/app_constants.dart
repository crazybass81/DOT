class AppConstants {
  // API Configuration
  static const String baseUrl = String.fromEnvironment(
    'BASE_URL',
    defaultValue: 'https://api.dotattendance.com/v1',
  );
  
  static const String apiVersion = 'v1';
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
  
  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';
  static const String biometricEnabledKey = 'biometric_enabled';
  static const String themeKey = 'theme_key';
  static const String languageKey = 'language_key';
  static const String firstLaunchKey = 'first_launch';
  
  // Hive Box Names
  static const String authBoxName = 'auth_box';
  static const String userBoxName = 'user_box';
  static const String settingsBoxName = 'settings_box';
  static const String attendanceBoxName = 'attendance_box';
  
  // App Configuration
  static const String appName = 'DOT Attendance';
  static const String appVersion = '1.0.0';
  static const int maxLoginAttempts = 3;
  static const Duration sessionTimeout = Duration(hours: 8);
  
  // Attendance Configuration
  static const double attendanceRadius = 100.0; // meters
  static const Duration locationUpdateInterval = Duration(minutes: 5);
  static const Duration attendanceWindow = Duration(minutes: 30);
  
  // QR Code Configuration
  static const Duration qrCodeExpiry = Duration(minutes: 5);
  static const String qrCodePrefix = 'DOT_ATTENDANCE:';
  
  // Notification Configuration
  static const String attendanceNotificationChannel = 'attendance_channel';
  static const String generalNotificationChannel = 'general_channel';
  
  // Image Configuration
  static const double maxImageSize = 5 * 1024 * 1024; // 5MB
  static const int imageQuality = 85;
  static const double imageMaxWidth = 1920;
  static const double imageMaxHeight = 1080;
  
  // Validation Constants
  static const int minPasswordLength = 8;
  static const int maxPasswordLength = 50;
  static const int maxNameLength = 100;
  static const int maxDescriptionLength = 500;
  
  // Date Formats
  static const String dateFormat = 'yyyy-MM-dd';
  static const String timeFormat = 'HH:mm';
  static const String dateTimeFormat = 'yyyy-MM-dd HH:mm:ss';
  static const String displayDateFormat = 'MMM dd, yyyy';
  static const String displayTimeFormat = 'hh:mm a';
  static const String displayDateTimeFormat = 'MMM dd, yyyy - hh:mm a';
}

class ApiEndpoints {
  // Authentication
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String refreshToken = '/auth/refresh';
  static const String resetPassword = '/auth/reset-password';
  static const String changePassword = '/auth/change-password';
  static const String verifyBiometric = '/auth/verify-biometric';
  
  // User
  static const String userProfile = '/user/profile';
  static const String updateProfile = '/user/profile';
  static const String uploadAvatar = '/user/avatar';
  
  // Attendance
  static const String checkIn = '/attendance/check-in';
  static const String checkOut = '/attendance/check-out';
  static const String attendanceHistory = '/attendance/history';
  static const String attendanceStatus = '/attendance/status';
  static const String attendanceStats = '/attendance/stats';
  
  // Reports
  static const String monthlyReport = '/reports/monthly';
  static const String weeklyReport = '/reports/weekly';
  static const String customReport = '/reports/custom';
  static const String exportReport = '/reports/export';
  
  // Settings
  static const String workingHours = '/settings/working-hours';
  static const String holidays = '/settings/holidays';
  static const String locations = '/settings/locations';
  
  // Notifications
  static const String notifications = '/notifications';
  static const String markAsRead = '/notifications/read';
  static const String notificationSettings = '/notifications/settings';
}

class ErrorMessages {
  static const String networkError = 'Network connection failed. Please check your internet connection.';
  static const String serverError = 'Server error occurred. Please try again later.';
  static const String timeoutError = 'Request timeout. Please try again.';
  static const String unauthorizedError = 'Session expired. Please login again.';
  static const String validationError = 'Please check your input and try again.';
  static const String locationError = 'Unable to get your location. Please enable location services.';
  static const String cameraError = 'Unable to access camera. Please check permissions.';
  static const String biometricError = 'Biometric authentication failed. Please try again.';
  static const String qrCodeError = 'Invalid or expired QR code.';
  static const String attendanceError = 'Attendance operation failed. Please try again.';
  static const String storageError = 'Storage operation failed. Please try again.';
  static const String unknownError = 'An unexpected error occurred. Please try again.';
}