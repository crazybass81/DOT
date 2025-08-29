import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../di/injection_container.dart';
import 'attendance_service.dart';
import 'notification_service.dart';

/// Service responsible for proper app initialization order
class AppInitializationService {
  static bool _isInitialized = false;
  
  /// Initialize all core services in proper order
  static Future<void> initializeApp() async {
    if (_isInitialized) return;
    
    try {
      debugPrint('Starting app initialization...');
      
      // 1. Initialize dependency injection
      await configureDependencies();
      
      // 2. Initialize notification service
      await NotificationService.initialize();
      
      // 3. Core services are initialized when needed through DI
      // AttendanceService will be initialized when first accessed
      
      _isInitialized = true;
      debugPrint('App initialization completed successfully');
      
    } catch (e) {
      debugPrint('App initialization failed: $e');
      rethrow;
    }
  }
  
  /// Check if app is initialized
  static bool get isInitialized => _isInitialized;
  
  /// Reset initialization state (for testing)
  static void reset() {
    _isInitialized = false;
  }
}

/// Provider for app initialization
final appInitializationProvider = FutureProvider<void>((ref) async {
  await AppInitializationService.initializeApp();
});

/// Provider to check if app is ready
final appReadyProvider = Provider<bool>((ref) {
  final initializationAsyncValue = ref.watch(appInitializationProvider);
  return initializationAsyncValue.maybeWhen(
    data: (_) => true,
    orElse: () => false,
  );
});