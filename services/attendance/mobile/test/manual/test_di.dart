// Simple test script to verify dependency injection setup
import 'package:flutter/material.dart';
import 'lib/core/di/injection_container.dart';
import 'lib/core/storage/local_storage_service.dart';
import 'lib/core/storage/secure_storage_service.dart';
import 'lib/core/services/location_service.dart';
import 'lib/domain/usecases/auth/login_usecase.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    print('Starting dependency injection test...');
    
    // Initialize dependencies
    await configureDependencies();
    print('✅ Dependencies configured successfully');
    
    // Test core services
    final localStorage = getIt<LocalStorageService>();
    print('✅ LocalStorageService injected: ${localStorage.runtimeType}');
    
    final secureStorage = getIt<SecureStorageService>();
    print('✅ SecureStorageService injected: ${secureStorage.runtimeType}');
    
    final locationService = getIt<LocationService>();
    print('✅ LocationService injected: ${locationService.runtimeType}');
    
    // Test use case
    final loginUseCase = getIt<LoginUseCase>();
    print('✅ LoginUseCase injected: ${loginUseCase.runtimeType}');
    
    print('🎉 All dependency injections working correctly!');
    
  } catch (e, stackTrace) {
    print('❌ Dependency injection failed: $e');
    print('Stack trace: $stackTrace');
  }
}