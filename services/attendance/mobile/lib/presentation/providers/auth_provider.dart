import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../core/di/injection_container.dart';
import '../../domain/entities/user/user.dart';
import '../../domain/entities/user/user_role.dart';
import '../../domain/usecases/auth/login_usecase.dart';
import '../../domain/usecases/auth/logout_usecase.dart';
import '../../domain/usecases/auth/refresh_token_usecase.dart';
import '../../domain/usecases/auth/verify_biometric_usecase.dart';

part 'auth_provider.freezed.dart';

// Auth result model
class AuthResult {
  final bool success;
  final String? error;
  final Map<String, dynamic>? userData;
  
  const AuthResult({
    required this.success,
    this.error,
    this.userData,
  });
}

@freezed
class AuthState with _$AuthState {
  const factory AuthState({
    @Default(false) bool isLoading,
    @Default(false) bool isAuthenticated,
    User? user,
    String? error,
    @Default(false) bool isBiometricEnabled,
    @Default(false) bool isBiometricAvailable,
  }) = _AuthState;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final LoginUseCase _loginUseCase;
  final LogoutUseCase _logoutUseCase;
  final RefreshTokenUseCase _refreshTokenUseCase;
  final VerifyBiometricUseCase _verifyBiometricUseCase;

  AuthNotifier(
    this._loginUseCase,
    this._logoutUseCase,
    this._refreshTokenUseCase,
    this._verifyBiometricUseCase,
  ) : super(const AuthState());

  /// Check authentication status on app startup
  Future<void> checkAuthStatus() async {
    state = state.copyWith(isLoading: true);

    try {
      // For now, just check if we have stored credentials
      // TODO: Implement proper refresh token check
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: false,
        user: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: false,
        error: e.toString(),
      );
    }
  }

  /// Login as master admin
  Future<bool> loginAsAdmin({
    required String adminId,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // adminId가 이메일 형식이 아니면 @gmail.com을 추가
      String email = adminId;
      if (!adminId.contains('@')) {
        // archt723 -> archt723@gmail.com
        email = '$adminId@gmail.com';
      }

      print('🔐 Master Admin 로그인 시도: $email');

      // Supabase를 통한 실제 인증
      final result = await _loginUseCase.call(LoginParams(
        email: email,
        password: password,
      ));

      return result.fold(
        (failure) {
          print('❌ Master Admin 로그인 실패: ${failure.message}');
          state = state.copyWith(
            isLoading: false,
            error: failure.message,
          );
          return false;
        },
        (user) {
          print('✅ Master Admin 로그인 성공: ${user.email}');
          // 마스터 관리자 권한 확인
          if (user.role != UserRole.masterAdmin && user.role != UserRole.admin) {
            state = state.copyWith(
              isLoading: false,
              error: '관리자 권한이 필요합니다',
            );
            return false;
          }
          
          state = state.copyWith(
            isLoading: false,
            isAuthenticated: true,
            user: user,
            error: null,
          );
          return true;
        },
      );
    } catch (e) {
      print('❌ Master Admin 로그인 예외: $e');
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Login with email and password
  Future<bool> login({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final result = await _loginUseCase.call(LoginParams(
        email: email,
        password: password,
      ));

      return result.fold(
        (failure) {
          state = state.copyWith(
            isLoading: false,
            error: failure.message,
          );
          return false;
        },
        (user) {
          state = state.copyWith(
            isLoading: false,
            isAuthenticated: true,
            user: user,
            error: null,
          );
          return true;
        },
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Login with QR token
  Future<bool> loginWithQrToken(String token, String action) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // TODO: Validate token with backend
      // For now, we'll simulate a successful login
      
      // Parse token to get user info
      // In production, this would be validated with the backend
      final mockUser = User(
        id: 'user_${token.substring(0, 6)}',
        email: 'user@dot.com',
        firstName: 'QR',
        lastName: 'User',
        role: UserRole.user,
        createdAt: DateTime.now(),
        isActive: true,
      );

      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        user: mockUser,
        error: null,
      );

      // Navigate to dashboard after successful login
      // This will be handled by the router's redirect logic
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'QR token validation failed: ${e.toString()}',
      );
      return false;
    }
  }

  /// Login with biometric authentication
  Future<bool> loginWithBiometric({
    required String reason,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final result = await _verifyBiometricUseCase.call();

      return result.fold(
        (failure) {
          state = state.copyWith(
            isLoading: false,
            error: failure.message,
          );
          return false;
        },
        (isVerified) {
          if (isVerified && state.user != null) {
            state = state.copyWith(
              isLoading: false,
              isAuthenticated: true,
              error: null,
            );
            return true;
          } else {
            state = state.copyWith(
              isLoading: false,
              error: 'Biometric verification failed',
            );
            return false;
          }
        },
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Logout user
  Future<void> logout() async {
    state = state.copyWith(isLoading: true);

    try {
      await _logoutUseCase.call();
      
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
      );
    } catch (e) {
      // Even if logout fails on server, clear local state
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
      );
    }
  }

  /// Update user data
  void updateUser(User user) {
    state = state.copyWith(user: user);
  }

  /// Set biometric availability
  void setBiometricAvailability(bool isAvailable) {
    state = state.copyWith(isBiometricAvailable: isAvailable);
  }

  /// Set biometric enabled status
  void setBiometricEnabled(bool isEnabled) {
    state = state.copyWith(isBiometricEnabled: isEnabled);
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }

  /// Set loading state
  void setLoading(bool isLoading) {
    state = state.copyWith(isLoading: isLoading);
  }
  
  /// Login with email and password using Supabase
  Future<AuthResult> loginWithEmail({
    required String email,
    required String password,
  }) async {
    // Use the existing login method that already uses Supabase
    final success = await login(email: email, password: password);
    
    // Check the state after login
    if (success && state.user != null) {
      return AuthResult(
        success: true,
        userData: {
          'uid': state.user!.id,
          'email': state.user!.email,
          'firstName': state.user!.firstName,
          'lastName': state.user!.lastName,
          'role': state.user!.role.name,
          'createdAt': state.user!.createdAt?.toIso8601String() ?? DateTime.now().toIso8601String(),
          'isActive': state.user!.isActive,
        },
      );
    } else {
      return AuthResult(
        success: false,
        error: state.error ?? '로그인 실패',
      );
    }
  }
}

// Providers
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    getIt<LoginUseCase>(),
    getIt<LogoutUseCase>(),
    getIt<RefreshTokenUseCase>(),
    getIt<VerifyBiometricUseCase>(),
  );
});

// Helper providers
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authProvider).user;
});

final authErrorProvider = Provider<String?>((ref) {
  return ref.watch(authProvider).error;
});

final isAuthLoadingProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isLoading;
});

final isBiometricEnabledProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isBiometricEnabled;
});

final isBiometricAvailableProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isBiometricAvailable;
});

// Auth state provider that returns AsyncValue<User?> for compatibility with dashboard pages
final authStateProvider = Provider<AsyncValue<User?>>((ref) {
  final authState = ref.watch(authProvider);
  
  if (authState.isLoading) {
    return const AsyncValue.loading();
  }
  
  if (authState.error != null) {
    return AsyncValue.error(authState.error!, StackTrace.current);
  }
  
  // Return the user if authenticated, null otherwise
  return AsyncValue.data(authState.isAuthenticated ? authState.user : null);
});