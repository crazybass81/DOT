# Critical Refactoring Implementations

## 1. Enhanced Error Handling System

### A. Result Type Implementation
```dart
// lib/core/utils/result.dart
import 'package:equatable/equatable.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'result.freezed.dart';

@freezed
sealed class Result<T, E> with _$Result<T, E> {
  const factory Result.success(T data) = Success<T, E>;
  const factory Result.failure(E error) = Failure<T, E>;
}

extension ResultExtensions<T, E> on Result<T, E> {
  bool get isSuccess => this is Success<T, E>;
  bool get isFailure => this is Failure<T, E>;
  
  T? get data => switch (this) {
    Success(data: final data) => data,
    Failure() => null,
  };
  
  E? get error => switch (this) {
    Success() => null,
    Failure(error: final error) => error,
  };
  
  R fold<R>(R Function(T) onSuccess, R Function(E) onFailure) {
    return switch (this) {
      Success(data: final data) => onSuccess(data),
      Failure(error: final error) => onFailure(error),
    };
  }
}
```

### B. Enhanced Exception Hierarchy
```dart
// lib/core/errors/app_error.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'app_error.freezed.dart';

@freezed
sealed class AppError with _$AppError {
  // Network errors
  const factory AppError.network({
    required String message,
    String? code,
    int? statusCode,
  }) = NetworkError;
  
  const factory AppError.timeout({
    required String message,
    Duration? duration,
  }) = TimeoutError;
  
  // Authentication errors
  const factory AppError.authentication({
    required String message,
    String? code,
  }) = AuthenticationError;
  
  const factory AppError.authorization({
    required String message,
    required String requiredRole,
  }) = AuthorizationError;
  
  // Validation errors
  const factory AppError.validation({
    required String message,
    Map<String, List<String>>? fieldErrors,
  }) = ValidationError;
  
  // Storage errors
  const factory AppError.storage({
    required String message,
    String? operation,
  }) = StorageError;
  
  // Location errors
  const factory AppError.location({
    required String message,
    String? permissionType,
  }) = LocationError;
  
  // Unknown errors
  const factory AppError.unknown({
    required String message,
    Object? originalError,
  }) = UnknownError;
}

extension AppErrorExtensions on AppError {
  bool get isRetryable => switch (this) {
    NetworkError() => true,
    TimeoutError() => true,
    StorageError() => true,
    _ => false,
  };
  
  String get displayMessage => switch (this) {
    NetworkError(message: final msg) => msg,
    TimeoutError(message: final msg) => msg,
    AuthenticationError(message: final msg) => msg,
    AuthorizationError(message: final msg) => msg,
    ValidationError(message: final msg) => msg,
    StorageError(message: final msg) => msg,
    LocationError(message: final msg) => msg,
    UnknownError(message: final msg) => msg,
  };
}
```

### C. Secure Storage Service Refactor
```dart
// lib/core/storage/secure_storage_service_enhanced.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../utils/result.dart';
import '../errors/app_error.dart';

class SecureStorageServiceEnhanced {
  final FlutterSecureStorage _storage;
  final String _encryptionKey;

  SecureStorageServiceEnhanced(this._storage) : _encryptionKey = _generateEncryptionKey();

  static String _generateEncryptionKey() {
    final bytes = List<int>.generate(32, (i) => DateTime.now().microsecondsSinceEpoch % 256);
    return base64Url.encode(bytes);
  }

  // Enhanced token storage with encryption
  Future<Result<void, AppError>> storeAccessToken(String token) async {
    try {
      final encryptedToken = _encryptToken(token);
      final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
      
      await _storage.write(
        key: AppConstants.accessTokenKey,
        value: json.encode({
          'token': encryptedToken,
          'timestamp': timestamp,
          'hash': _hashToken(token),
        }),
      );
      
      return const Result.success(null);
    } catch (e) {
      return Result.failure(
        AppError.storage(
          message: 'Failed to store access token',
          operation: 'storeAccessToken',
        ),
      );
    }
  }

  Future<Result<String, AppError>> getAccessToken() async {
    try {
      final storedData = await _storage.read(key: AppConstants.accessTokenKey);
      
      if (storedData == null) {
        return const Result.failure(
          AppError.storage(message: 'Access token not found'),
        );
      }

      final data = json.decode(storedData) as Map<String, dynamic>;
      final encryptedToken = data['token'] as String;
      final timestamp = int.parse(data['timestamp'] as String);
      
      // Check token age
      final tokenAge = DateTime.now().millisecondsSinceEpoch - timestamp;
      if (tokenAge > AppConstants.sessionTimeout.inMilliseconds) {
        await deleteAccessToken();
        return const Result.failure(
          AppError.authentication(message: 'Token expired'),
        );
      }

      final decryptedToken = _decryptToken(encryptedToken);
      
      // Verify token integrity
      final expectedHash = _hashToken(decryptedToken);
      final storedHash = data['hash'] as String;
      
      if (expectedHash != storedHash) {
        await deleteAccessToken();
        return const Result.failure(
          AppError.storage(message: 'Token integrity check failed'),
        );
      }

      return Result.success(decryptedToken);
    } catch (e) {
      return Result.failure(
        AppError.storage(
          message: 'Failed to retrieve access token',
          operation: 'getAccessToken',
        ),
      );
    }
  }

  Future<Result<void, AppError>> deleteAccessToken() async {
    try {
      await _storage.delete(key: AppConstants.accessTokenKey);
      return const Result.success(null);
    } catch (e) {
      return Result.failure(
        AppError.storage(
          message: 'Failed to delete access token',
          operation: 'deleteAccessToken',
        ),
      );
    }
  }

  String _encryptToken(String token) {
    // Simple XOR encryption (replace with proper encryption in production)
    final keyBytes = utf8.encode(_encryptionKey);
    final tokenBytes = utf8.encode(token);
    final encrypted = <int>[];
    
    for (int i = 0; i < tokenBytes.length; i++) {
      encrypted.add(tokenBytes[i] ^ keyBytes[i % keyBytes.length]);
    }
    
    return base64.encode(encrypted);
  }

  String _decryptToken(String encryptedToken) {
    final keyBytes = utf8.encode(_encryptionKey);
    final encryptedBytes = base64.decode(encryptedToken);
    final decrypted = <int>[];
    
    for (int i = 0; i < encryptedBytes.length; i++) {
      decrypted.add(encryptedBytes[i] ^ keyBytes[i % keyBytes.length]);
    }
    
    return utf8.decode(decrypted);
  }

  String _hashToken(String token) {
    final bytes = utf8.encode(token + _encryptionKey);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
}
```

## 2. Enhanced Authentication System

### A. Secure Auth Interceptor
```dart
// lib/core/network/interceptors/enhanced_auth_interceptor.dart
import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import '../../storage/secure_storage_service_enhanced.dart';
import '../../utils/result.dart';
import '../../errors/app_error.dart';

class EnhancedAuthInterceptor extends Interceptor {
  final SecureStorageServiceEnhanced _secureStorage;
  final String _deviceId;
  bool _isRefreshing = false;

  EnhancedAuthInterceptor(this._secureStorage, this._deviceId);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (_shouldSkipAuth(options.path)) {
      return handler.next(options);
    }

    final tokenResult = await _secureStorage.getAccessToken();
    tokenResult.fold(
      (token) {
        // Add authentication headers
        options.headers['Authorization'] = 'Bearer $token';
        options.headers['X-Device-ID'] = _deviceId;
        options.headers['X-Request-Time'] = DateTime.now().millisecondsSinceEpoch.toString();
        
        // Add request signature for critical operations
        if (_requiresSignature(options.path)) {
          final signature = _signRequest(options, token);
          options.headers['X-Request-Signature'] = signature;
        }
      },
      (error) {
        // Handle token retrieval error
        handler.reject(
          DioException(
            requestOptions: options,
            error: error,
            type: DioExceptionType.cancel,
          ),
        );
        return;
      },
    );

    handler.next(options);
  }

  @override
  void onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      
      try {
        final refreshResult = await _refreshToken();
        
        if (refreshResult.isSuccess) {
          // Retry original request with new token
          final retryResult = await _retryRequest(err.requestOptions);
          retryResult.fold(
            (response) => handler.resolve(response),
            (error) => handler.next(err),
          );
        } else {
          handler.next(err);
        }
      } finally {
        _isRefreshing = false;
      }
    } else {
      handler.next(err);
    }
  }

  bool _shouldSkipAuth(String path) {
    const unauthenticatedPaths = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/reset-password',
    ];
    return unauthenticatedPaths.any((p) => path.contains(p));
  }

  bool _requiresSignature(String path) {
    const criticalPaths = [
      '/attendance/check-in',
      '/attendance/check-out',
      '/user/profile',
      '/reports/',
    ];
    return criticalPaths.any((p) => path.contains(p));
  }

  String _signRequest(RequestOptions options, String token) {
    final payload = {
      'method': options.method,
      'path': options.path,
      'timestamp': options.headers['X-Request-Time'],
      'device_id': _deviceId,
    };
    
    if (options.data != null) {
      payload['data_hash'] = _hashData(options.data);
    }

    final message = json.encode(payload);
    final key = utf8.encode(token);
    final messageBytes = utf8.encode(message);
    
    final hmac = Hmac(sha256, key);
    final digest = hmac.convert(messageBytes);
    
    return digest.toString();
  }

  String _hashData(dynamic data) {
    final dataString = data is String ? data : json.encode(data);
    final bytes = utf8.encode(dataString);
    return sha256.convert(bytes).toString();
  }

  Future<Result<void, AppError>> _refreshToken() async {
    try {
      final refreshTokenResult = await _secureStorage.getRefreshToken();
      
      return refreshTokenResult.fold(
        (refreshToken) async {
          final dio = Dio();
          dio.options.baseUrl = AppConstants.baseUrl;
          
          final requestData = {
            'refresh_token': refreshToken,
            'device_id': _deviceId,
            'timestamp': DateTime.now().millisecondsSinceEpoch,
          };

          final response = await dio.post(
            '/auth/refresh',
            data: requestData,
            options: Options(
              headers: {
                'X-Device-ID': _deviceId,
                'Content-Type': 'application/json',
              },
            ),
          );

          if (response.statusCode == 200) {
            final data = response.data as Map<String, dynamic>;
            final newAccessToken = data['access_token'] as String?;
            final newRefreshToken = data['refresh_token'] as String?;

            if (newAccessToken != null) {
              await _secureStorage.storeAccessToken(newAccessToken);
            }
            
            if (newRefreshToken != null) {
              await _secureStorage.storeRefreshToken(newRefreshToken);
            }

            return const Result.success(null);
          } else {
            return const Result.failure(
              AppError.authentication(message: 'Token refresh failed'),
            );
          }
        },
        (error) async => Result.failure(error),
      );
    } catch (e) {
      return Result.failure(
        AppError.authentication(message: 'Token refresh error: ${e.toString()}'),
      );
    }
  }

  Future<Result<Response, AppError>> _retryRequest(RequestOptions options) async {
    try {
      final tokenResult = await _secureStorage.getAccessToken();
      
      return tokenResult.fold(
        (token) async {
          options.headers['Authorization'] = 'Bearer $token';
          
          final dio = Dio();
          dio.options.baseUrl = AppConstants.baseUrl;
          
          final response = await dio.request(
            options.path,
            data: options.data,
            queryParameters: options.queryParameters,
            options: Options(
              method: options.method,
              headers: options.headers,
            ),
          );
          
          return Result.success(response);
        },
        (error) async => Result.failure(error),
      );
    } catch (e) {
      return Result.failure(
        AppError.network(message: 'Request retry failed: ${e.toString()}'),
      );
    }
  }
}
```

## 3. Input Validation System

### A. Validation Rules
```dart
// lib/core/validation/validation_rules.dart
import '../errors/app_error.dart';
import '../utils/result.dart';

abstract class ValidationRule<T> {
  Result<T, AppError> validate(T value);
}

class EmailValidationRule implements ValidationRule<String> {
  @override
  Result<String, AppError> validate(String value) {
    if (value.isEmpty) {
      return const Result.failure(
        AppError.validation(message: 'Email is required'),
      );
    }
    
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value)) {
      return const Result.failure(
        AppError.validation(message: 'Invalid email format'),
      );
    }
    
    return Result.success(value.trim().toLowerCase());
  }
}

class PasswordValidationRule implements ValidationRule<String> {
  final int minLength;
  final bool requireUppercase;
  final bool requireLowercase;
  final bool requireNumbers;
  final bool requireSpecialChars;

  const PasswordValidationRule({
    this.minLength = 8,
    this.requireUppercase = true,
    this.requireLowercase = true,
    this.requireNumbers = true,
    this.requireSpecialChars = true,
  });

  @override
  Result<String, AppError> validate(String value) {
    final errors = <String>[];
    
    if (value.length < minLength) {
      errors.add('Password must be at least $minLength characters');
    }
    
    if (requireUppercase && !value.contains(RegExp(r'[A-Z]'))) {
      errors.add('Password must contain uppercase letters');
    }
    
    if (requireLowercase && !value.contains(RegExp(r'[a-z]'))) {
      errors.add('Password must contain lowercase letters');
    }
    
    if (requireNumbers && !value.contains(RegExp(r'[0-9]'))) {
      errors.add('Password must contain numbers');
    }
    
    if (requireSpecialChars && !value.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) {
      errors.add('Password must contain special characters');
    }
    
    if (errors.isNotEmpty) {
      return Result.failure(
        AppError.validation(
          message: 'Password validation failed',
          fieldErrors: {'password': errors},
        ),
      );
    }
    
    return Result.success(value);
  }
}

class Validator {
  static Result<Map<String, String>, AppError> validateLoginForm({
    required String email,
    required String password,
  }) {
    final emailRule = EmailValidationRule();
    final passwordRule = PasswordValidationRule(minLength: 6); // Relaxed for login
    
    final emailResult = emailRule.validate(email);
    final passwordResult = passwordRule.validate(password);
    
    final errors = <String, List<String>>{};
    
    emailResult.fold(
      (validEmail) => null,
      (error) {
        if (error is ValidationError && error.fieldErrors != null) {
          errors.addAll(error.fieldErrors!);
        } else {
          errors['email'] = [error.displayMessage];
        }
      },
    );
    
    passwordResult.fold(
      (validPassword) => null,
      (error) {
        if (error is ValidationError && error.fieldErrors != null) {
          errors.addAll(error.fieldErrors!);
        } else {
          errors['password'] = [error.displayMessage];
        }
      },
    );
    
    if (errors.isNotEmpty) {
      return Result.failure(
        AppError.validation(
          message: 'Form validation failed',
          fieldErrors: errors,
        ),
      );
    }
    
    return Result.success({
      'email': emailResult.data!,
      'password': passwordResult.data!,
    });
  }
}
```

## 4. Enhanced Use Case Implementation

### A. Login Use Case with Validation
```dart
// lib/domain/usecases/auth/enhanced_login_usecase.dart
import '../../../core/utils/result.dart';
import '../../../core/errors/app_error.dart';
import '../../../core/validation/validation_rules.dart';
import '../../entities/user/user.dart';
import '../../repositories/auth/auth_repository.dart';

class LoginParams {
  final String email;
  final String password;
  final bool rememberMe;

  const LoginParams({
    required this.email,
    required this.password,
    this.rememberMe = false,
  });
}

class EnhancedLoginUseCase {
  final IAuthRepository _repository;
  
  EnhancedLoginUseCase(this._repository);

  Future<Result<User, AppError>> call(LoginParams params) async {
    // Input validation
    final validationResult = Validator.validateLoginForm(
      email: params.email,
      password: params.password,
    );
    
    if (validationResult.isFailure) {
      return Result.failure(validationResult.error!);
    }
    
    final validatedData = validationResult.data!;
    
    // Sanitize inputs
    final sanitizedParams = LoginParams(
      email: validatedData['email']!,
      password: validatedData['password']!,
      rememberMe: params.rememberMe,
    );
    
    // Execute login
    try {
      final result = await _repository.login(sanitizedParams);
      
      return result.fold(
        (user) {
          // Log successful login
          _logLoginSuccess(user);
          return Result.success(user);
        },
        (error) {
          // Log failed login attempt
          _logLoginFailure(params.email, error);
          return Result.failure(error);
        },
      );
    } catch (e) {
      final error = AppError.unknown(
        message: 'Login failed: ${e.toString()}',
        originalError: e,
      );
      
      _logLoginFailure(params.email, error);
      return Result.failure(error);
    }
  }

  void _logLoginSuccess(User user) {
    // Implementation would use proper logging service
    print('Login successful for user: ${user.email}');
  }

  void _logLoginFailure(String email, AppError error) {
    // Implementation would use proper logging service
    print('Login failed for email: $email, error: ${error.displayMessage}');
  }
}
```

## 5. Enhanced Provider Implementation

### A. Auth Provider with Result Type
```dart
// lib/presentation/providers/enhanced_auth_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import '../../core/utils/result.dart';
import '../../core/errors/app_error.dart';
import '../../domain/entities/user/user.dart';
import '../../domain/usecases/auth/enhanced_login_usecase.dart';

part 'enhanced_auth_provider.freezed.dart';

@freezed
class EnhancedAuthState with _$EnhancedAuthState {
  const factory EnhancedAuthState({
    @Default(false) bool isLoading,
    @Default(false) bool isAuthenticated,
    User? user,
    AppError? error,
    @Default(false) bool isBiometricEnabled,
    @Default(false) bool isBiometricAvailable,
  }) = _EnhancedAuthState;
}

class EnhancedAuthNotifier extends StateNotifier<EnhancedAuthState> {
  final EnhancedLoginUseCase _loginUseCase;
  // ... other use cases

  EnhancedAuthNotifier(this._loginUseCase) : super(const EnhancedAuthState());

  Future<Result<void, AppError>> login({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    final result = await _loginUseCase.call(LoginParams(
      email: email,
      password: password,
      rememberMe: rememberMe,
    ));

    return result.fold(
      (user) {
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
          error: null,
        );
        return const Result.success(null);
      },
      (error) {
        state = state.copyWith(
          isLoading: false,
          error: error,
        );
        return Result.failure(error);
      },
    );
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

// Provider
final enhancedAuthProvider = StateNotifierProvider<EnhancedAuthNotifier, EnhancedAuthState>((ref) {
  return EnhancedAuthNotifier(
    ref.watch(enhancedLoginUseCaseProvider),
  );
});
```

## 6. Error Boundary Implementation

### A. App Error Boundary Widget
```dart
// lib/core/widgets/error_boundary.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../errors/app_error.dart';
import '../theme/neo_brutal_theme.dart';

class AppErrorBoundary extends ConsumerWidget {
  final Widget child;
  final Widget Function(AppError error)? errorBuilder;

  const AppErrorBoundary({
    super.key,
    required this.child,
    this.errorBuilder,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ErrorBoundaryWidget(
      onError: (error, stackTrace) {
        // Report error to crash reporting service
        ref.read(errorReportingProvider).reportError(error, stackTrace);
      },
      errorBuilder: (error) => errorBuilder?.call(error) ?? _defaultErrorWidget(error),
      child: child,
    );
  }

  Widget _defaultErrorWidget(dynamic error) {
    final appError = error is AppError 
        ? error 
        : AppError.unknown(message: 'An unexpected error occurred');

    return Scaffold(
      body: Center(
        child: Container(
          margin: const EdgeInsets.all(NeoBrutalTheme.space4),
          padding: const EdgeInsets.all(NeoBrutalTheme.space6),
          decoration: BoxDecoration(
            color: NeoBrutalTheme.bg,
            border: Border.all(
              color: NeoBrutalTheme.error,
              width: NeoBrutalTheme.borderThick,
            ),
            borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
            boxShadow: NeoBrutalTheme.shadowElev2,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: NeoBrutalTheme.error,
              ),
              const SizedBox(height: NeoBrutalTheme.space4),
              Text(
                'Oops! Something went wrong',
                style: NeoBrutalTheme.heading,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: NeoBrutalTheme.space3),
              Text(
                appError.displayMessage,
                style: NeoBrutalTheme.body,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: NeoBrutalTheme.space6),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    // Restart app or navigate to safe screen
                    Navigator.of(context).pushNamedAndRemoveUntil(
                      '/',
                      (route) => false,
                    );
                  },
                  child: const Text('Restart App'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

These refactoring implementations address the most critical issues identified in the code review:

1. **Enhanced Error Handling**: Result type pattern for better error management
2. **Secure Storage**: Improved token storage with encryption and integrity checks
3. **Input Validation**: Comprehensive validation system with proper error reporting
4. **Enhanced Authentication**: Secure interceptor with request signing and proper retry logic
5. **Better State Management**: Result-based providers with proper error handling
6. **Error Boundaries**: App-wide error catching and graceful degradation

The next step would be to implement comprehensive tests for these enhanced components and gradually migrate the existing codebase to use these improved patterns.