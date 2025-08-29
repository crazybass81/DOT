import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../core/di/injection_container.dart';
import '../../domain/entities/user/user.dart';
import '../../domain/entities/user/user_role.dart';
import '../../domain/usecases/auth/login_usecase.dart';
import '../../domain/usecases/auth/logout_usecase.dart';
import '../../domain/usecases/auth/refresh_token_usecase.dart';
import '../../domain/usecases/auth/verify_biometric_usecase.dart';
import '../../core/services/firebase_service.dart';

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
      // For demo purposes, we'll use hardcoded credentials
      // In production, this would be an API call
      if (adminId == 'admin' && password == 'admin1234') {
        final adminUser = User(
          id: 'admin_001',
          email: 'admin@dot.com',
          firstName: 'Master',
          lastName: 'Admin',
          role: UserRole.admin,
          createdAt: DateTime.now(),
          isActive: true,
        );
        
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: adminUser,
          error: null,
        );
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'Invalid admin credentials',
        );
        return false;
      }
    } catch (e) {
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
  
  /// Login with email and password using Firebase or hardcoded
  Future<AuthResult> loginWithEmail({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Check hardcoded admin first
      if (email == 'masteradmin' && password == 'masteradmin1234') {
        final adminUser = User(
          id: 'hardcoded_admin',
          email: 'masteradmin@dot.com',
          firstName: 'Master',
          lastName: 'Admin',
          role: UserRole.admin,
          createdAt: DateTime.now(),
          isActive: true,
        );
        
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: adminUser,
          error: null,
        );
        
        return const AuthResult(success: true);
      }
      
      // Use Firebase service for real users
      final firebaseService = FirebaseService.instance;
      final authResult = await firebaseService.signInWithEmailPassword(email, password);
      
      if (authResult != null) {
        // Create User object from auth result
        final user = User(
          id: authResult['uid'],
          email: authResult['email'],
          firstName: authResult['firstName'],
          lastName: authResult['lastName'],
          role: authResult['role'] == 'admin' ? UserRole.admin : UserRole.user,
          createdAt: DateTime.parse(authResult['createdAt']),
          isActive: authResult['isActive'],
        );
        
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
          error: null,
        );
        
        return AuthResult(
          success: true,
          userData: authResult,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'Invalid email or password',
        );
        
        return const AuthResult(
          success: false,
          error: 'Invalid email or password',
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      
      return AuthResult(
        success: false,
        error: e.toString(),
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