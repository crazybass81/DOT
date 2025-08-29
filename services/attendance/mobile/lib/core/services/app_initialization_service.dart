import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../di/injection_container.dart';
import 'notification_service.dart';

/// Service responsible for proper app initialization order
class AppInitializationService {
  static bool _isInitialized = false;
  static int _initializationAttempts = 0;
  static const int _maxRetryAttempts = 3;
  
  /// Initialize all core services in proper order
  static Future<void> initializeApp() async {
    if (_isInitialized) return;
    
    _initializationAttempts++;
    
    try {
      debugPrint('Starting app initialization... (attempt $_initializationAttempts)');
      
      // Check if dependencies are already configured (hot reload scenario)
      if (isDependenciesConfigured) {
        debugPrint('Dependencies already configured, skipping DI setup');
      } else {
        // 1. Initialize dependency injection
        await configureDependencies();
      }
      
      // 2. Initialize notification service (safe to call multiple times)
      await NotificationService.initialize();
      
      // 3. Core services are initialized when needed through DI
      // AttendanceService will be initialized when first accessed
      
      _isInitialized = true;
      _initializationAttempts = 0; // Reset on success
      debugPrint('App initialization completed successfully');
      
    } catch (e) {
      debugPrint('App initialization failed (attempt $_initializationAttempts): $e');
      
      // If this is a duplicate registration error and we haven't exceeded max attempts
      if (e.toString().contains('already registered') && _initializationAttempts < _maxRetryAttempts) {
        debugPrint('Detected duplicate registration, resetting dependencies...');
        resetDependencies();
        _isInitialized = false;
        // Retry once after reset
        await Future.delayed(const Duration(milliseconds: 100));
        return await initializeApp();
      }
      
      // If we've exceeded max attempts or it's a different error, don't retry
      if (_initializationAttempts >= _maxRetryAttempts) {
        debugPrint('Maximum initialization attempts reached. Stopping retries.');
        _initializationAttempts = 0; // Reset for next app restart
      }
      
      rethrow;
    }
  }
  
  /// Check if app is initialized
  static bool get isInitialized => _isInitialized;
  
  /// Reset initialization state (for testing and hot reload)
  static void reset() {
    _isInitialized = false;
    _initializationAttempts = 0;
    resetDependencies();
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